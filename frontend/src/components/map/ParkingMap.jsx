import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { getParkingLots } from '../../utils/api';
import { initSocket, joinLotRoom, leaveLotRoom, subscribeToAvailabilityUpdates } from '../../utils/socket';
import ParkingLotCard from './ParkingLotCard';

const containerStyle = {
  width: '100%',
  height: '70vh'
};

// Default center (Mumbai)
const defaultCenter = {
  lat: 19.0760,
  lng: 72.8777
};

const ParkingMap = ({ onSelectLot }) => {
  const [parkingLots, setParkingLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    mapIds: [import.meta.env.VITE_GOOGLE_MAPS_ID]
  });


  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key is missing. Please check your environment configuration.');
    }
  }, []);
  
  // Setup socket for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = initSocket(token);
    let unsubscribe;

    if (parkingLots.length > 0) {
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
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      // Leave all rooms
      parkingLots.forEach(lot => {
        leaveLotRoom(lot._id);
      });
    };
  }, [parkingLots.length]); // Only re-run when parkingLots array length changes

  // Move geolocation to a user action
  const getUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Fetch parking lots based on user location
  useEffect(() => {
    const fetchParkingLots = async () => {
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

  const onMapLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-2">
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
          {/* Add location button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={getUserLocation}
              className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100"
              title="Get my location"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          
          {/* User location marker */}
          <Marker
            position={userLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
          
          {/* Parking lot markers with safety check */}
          {renderParkingLotMarkers()}
        </GoogleMap>
      </div>
      
      <div className="overflow-y-auto max-h-[70vh]">
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