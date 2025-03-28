import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { getParkingLots, getParkingLotsByDestination } from '../../utils/api';
import { initSocket, joinLotRoom, leaveLotRoom, subscribeToAvailabilityUpdates } from '../../utils/socket';
import ParkingLotCard from './ParkingLotCard';

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 250px)' // Adjusted to leave space for navbar and search
};

const defaultCenter = {
  lat: 13.0827,
  lng: 80.2707
};

const ParkingMap = ({ onSelectLot }) => {
  const [parkingLots, setParkingLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [searchRadius, setSearchRadius] = useState(5);
  const [error, setError] = useState(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    mapIds: [import.meta.env.VITE_GOOGLE_MAPS_ID]
  });

  // Initial location and geolocation setup
  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key is missing. Please check your environment configuration.');
    }
    
    // Initial geolocation on component mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const initialLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(initialLocation);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to default location if geolocation fails
          setUserLocation(defaultCenter);
        }
      );
    } else {
      // Fallback to default location if geolocation not supported
      setUserLocation(defaultCenter);
    }
  }, []);

  // Socket setup for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !parkingLots.length) return;

    const socket = initSocket(token);
    let unsubscribe;

    // Subscribe to availability updates for all lots
    unsubscribe = subscribeToAvailabilityUpdates((update) => {
      setParkingLots((currentLots) => 
        currentLots.map((lot) => 
          lot._id === update.lot_id 
            ? { 
                ...lot, 
                available_spots: {
                  ...lot.available_spots,
                  [update.vehicle_type]: update.available_spots
                }
              } 
            : lot
        )
      );
    });

    // Join room for each parking lot
    parkingLots.forEach(lot => {
      joinLotRoom(lot._id);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      // Leave all rooms
      parkingLots.forEach(lot => {
        leaveLotRoom(lot._id);
      });
    };
  }, [parkingLots.length]);

  // Fetch parking lots based on user location
  useEffect(() => {
    const fetchParkingLots = async () => {
      if (!userLocation) return;

      try {
        setLoading(true);
        const response = await getParkingLots(userLocation.lat, userLocation.lng);
        setParkingLots(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError('Failed to load parking lots. Please try again.');
        console.error('Error fetching parking lots:', err);
        setParkingLots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParkingLots();
  }, [userLocation]);

  // Destination search handler
  const handleDestinationSearch = async (e) => {
    e.preventDefault();
    
    if (!destinationSearch.trim()) {
      setError('Please enter a destination');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Call new API endpoint for destination-based search
      const response = await getParkingLotsByDestination(destinationSearch, searchRadius);
      
      if (response.data.lots && response.data.lots.length > 0) {
        setParkingLots(response.data.lots);
        
        // Center map on the destination
        if (response.data.destination.coordinates) {
          const { lat, lng } = response.data.destination.coordinates;
          setUserLocation({ lat, lng });
        }
      } else {
        setError('No parking lots found near the destination');
        setParkingLots([]);
      }
    } catch (err) {
      console.error('Destination search error:', err);
      setError(err.response?.data?.message || 'Failed to search parking lots');
      setParkingLots([]);
    } finally {
      setLoading(false);
    }
  };

  // Get user location
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLocation);
          
          // Center map on new location
          if (map) {
            map.panTo(newLocation);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to retrieve your location');
        }
      );
    }
  }, [map]);

  // Map load and unload handlers
  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Marker click handlers
  const handleMarkerClick = (lot) => {
    setActiveMarker(lot._id);
    setSelectedLot(lot);
    if (onSelectLot) {
      onSelectLot(lot);
    }
  };

  const handleCardClick = (lot) => {
    setSelectedLot(lot);
    setActiveMarker(lot._id);
    if (onSelectLot) {
      onSelectLot(lot);
    }
    
    // Center map on selected lot
    if (map) {
      map.panTo({ 
        lat: lot.location.coordinates[1], 
        lng: lot.location.coordinates[0] 
      });
    }
  };

  // Render parking lot markers
  const renderParkingLotMarkers = () => {
    if (!Array.isArray(parkingLots)) {
      console.error('parkingLots is not an array:', parkingLots);
      return null;
    }

    return parkingLots.map((lot) => {
      const isAvailable = lot.available_spots.car > 0 || lot.available_spots.bike > 0;
      const position = lot.location.coordinates 
        ? {
            lat: lot.location.coordinates[1],
            lng: lot.location.coordinates[0]
          }
        : {
            lat: lot.location.lat,
            lng: lot.location.lng
          };

      return (
        <Marker
          key={lot._id}
          position={position}
          onClick={() => handleMarkerClick(lot)}
          icon={{
            url: isAvailable 
              ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
              : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(30, 30)
          }}
        >
          {activeMarker === lot._id && (
            <InfoWindow onCloseClick={() => setActiveMarker(null)}>
              <div className="min-w-[150px]">
                <h3 className="font-bold">{lot.name}</h3>
                <p className="text-sm">{lot.address}</p>
                <div className="mt-2 text-sm">
                  <p>Cars: {lot.available_spots.car}/{lot.total_spots.car}</p>
                  <p>Bikes: {lot.available_spots.bike}/{lot.total_spots.bike}</p>
                </div>
              </div>
            </InfoWindow>
          )}
        </Marker>
      );
    });
  };

  // Loading and error states
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading Maps...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">Error loading Google Maps. Please check your API key and try again.</p>
        <button 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading && !parkingLots.length) {
    return <div className="flex justify-center items-center h-64">Loading parking lots...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div className="relative h-[calc(100vh-200px)]">
      {/* Destination Search Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <form onSubmit={handleDestinationSearch} className="flex max-w-2xl mx-auto">
          <input 
            type="text" 
            placeholder="Enter destination" 
            value={destinationSearch}
            onChange={(e) => setDestinationSearch(e.target.value)}
            className="flex-grow p-2 rounded-l-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select 
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="p-2 border-y border-gray-300 bg-white"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={15}>15 km</option>
          </select>
          <button 
            type="submit" 
            className="bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Google Map */}
      {isLoaded && userLocation && (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={userLocation}
          zoom={14}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            mapId: import.meta.env.VITE_GOOGLE_MAPS_ID
          }}
        >
          {/* Location Button */}
          <div className="absolute top-16 right-4">
            <button
              onClick={getUserLocation}
              className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
              title="Get my location"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 616 0z" />
              </svg>
            </button>
          </div>
          
          {/* Parking lot markers */}
          {renderParkingLotMarkers()}
        </GoogleMap>
      )}
      
      {/* Parking Lots List */}
      <div className="hidden md:block md:absolute md:right-0 md:top-16 md:w-1/3 md:h-[calc(100vh-250px)] md:overflow-y-auto md:p-4">
        <h2 className="text-xl font-bold mb-4">Available Parking Lots</h2>
        
        {!Array.isArray(parkingLots) || parkingLots.length === 0 ? (
          <p>No parking lots found in this area.</p>
        ) : (
          <div className="space-y-4">
            {parkingLots.map((lot) => (
              <ParkingLotCard 
                key={lot._id} 
                lot={lot} 
                isSelected={selectedLot && selectedLot._id === lot._id}
                onClick={() => handleCardClick(lot)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingMap;