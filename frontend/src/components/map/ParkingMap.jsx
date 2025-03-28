import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { getParkingLots, getParkingLotsByDestination } from '../../utils/api';
import { initSocket, joinLotRoom, leaveLotRoom, subscribeToAvailabilityUpdates } from '../../utils/socket';
import ParkingLotCard from './ParkingLotCard';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 13.0827,
  lng: 80.2707
};

const ParkingMap = ({ onSelectLot, selectedLot }) => {
  const [parkingLots, setParkingLots] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [searchRadius, setSearchRadius] = useState(5);
  const [error, setError] = useState(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    mapIds: [import.meta.env.VITE_GOOGLE_MAPS_ID]
  });

  // Fetch parking lots based on location
  const fetchParkingLots = async (location) => {
    try {
      setLoading(true);
      const response = await getParkingLots(location.lat, location.lng);
      setParkingLots(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Failed to load parking lots. Please try again.');
      console.error('Error fetching parking lots:', err);
      setParkingLots([]);
    } finally {
      setLoading(false);
    }
  };

  // Get user location and update map
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLocation);
          
          if (map) {
            map.panTo(newLocation);
            map.setZoom(14);
          }
          
          // Fetch parking lots for new location
          fetchParkingLots(newLocation);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to retrieve your location');
        }
      );
    }
  }, [map]);

  // Initial location setup
  useEffect(() => {
    if (!userLocation) {
      getUserLocation();
    }
  }, [getUserLocation]);

  // Handle marker click
  const handleMarkerClick = (lot) => {
    setActiveMarker(lot._id);
    onSelectLot(lot);
    setInfoWindowPosition({
      lat: lot.location.coordinates[1],
      lng: lot.location.coordinates[0]
    });
  };

  // Handle destination search
  const handleDestinationSearch = async (e) => {
    e.preventDefault();
    
    if (!destinationSearch.trim()) {
      setError('Please enter a destination');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await getParkingLotsByDestination(destinationSearch, searchRadius);
      
      if (response.data.lots && response.data.lots.length > 0) {
        setParkingLots(response.data.lots);
        
        if (response.data.destination.coordinates) {
          const { lat, lng } = response.data.destination.coordinates;
          const newLocation = { lat, lng };
          setUserLocation(newLocation);
          
          if (map) {
            map.panTo(newLocation);
            map.setZoom(14);
          }
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

  // Reset search
  const handleResetSearch = () => {
    setDestinationSearch('');
    setError(null);
    getUserLocation();
  };

  // Render map markers
  const renderMarkers = () => {
    const markers = [];

    // Add user location marker (Google's default blue dot)
    if (userLocation) {
      markers.push(
        <Marker
          key="user-location"
          position={userLocation}
          icon={{
            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new window.google.maps.Size(40, 40)
          }}
        />
      );
    }

    // Add parking lot markers
    parkingLots.forEach((lot) => {
      const isAvailable = lot.available_spots.car > 0 || lot.available_spots.bike > 0;
      const position = {
        lat: lot.location.coordinates[1],
        lng: lot.location.coordinates[0]
      };

      markers.push(
        <Marker
          key={lot._id}
          position={position}
          onClick={() => handleMarkerClick(lot)}
          icon={{
            url: isAvailable 
              ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
              : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(35, 35)
          }}
        >
          {activeMarker === lot._id && (
            <InfoWindow
              position={position}
              onCloseClick={() => setActiveMarker(null)}
            >
              <div className="min-w-[200px] p-2">
                <h3 className="font-bold text-gray-900">{lot.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{lot.address}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Cars:</span>
                    <span className="font-medium text-green-600 ml-1">
                      {lot.available_spots.car}/{lot.total_spots.car}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Bikes:</span>
                    <span className="font-medium text-green-600 ml-1">
                      {lot.available_spots.bike}/{lot.total_spots.bike}
                    </span>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </Marker>
      );
    });

    return markers;
  };

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
    <div className="h-full relative">
      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4">
        <form onSubmit={handleDestinationSearch} className="flex shadow-lg rounded-lg overflow-hidden bg-white">
          <input 
            type="text" 
            placeholder="Search for a destination..."
            value={destinationSearch}
            onChange={(e) => setDestinationSearch(e.target.value)}
            className="flex-1 px-4 py-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select 
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="w-24 px-2 py-3 border-0 border-l border-gray-200 bg-white focus:outline-none"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={15}>15 km</option>
          </select>
          <button 
            type="submit" 
            className="px-6 py-3 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
          {destinationSearch && (
            <button 
              type="button"
              onClick={handleResetSearch}
              className="px-4 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Location Button - Now at bottom right */}
      <button
        onClick={getUserLocation}
        className="absolute bottom-8 right-8 z-10 bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        title="Get my location"
      >
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Google Map */}
      {isLoaded && (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={userLocation || defaultCenter}
          zoom={14}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            mapId: import.meta.env.VITE_GOOGLE_MAPS_ID,
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.RIGHT_TOP
            }
          }}
        >
          {renderMarkers()}
        </GoogleMap>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-50 p-4 rounded-lg shadow-lg">
          <p className="text-red-600">{error}</p>
        </div>
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
                onClick={() => handleMarkerClick(lot)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingMap;