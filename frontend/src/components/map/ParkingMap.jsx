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
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    mapIds: [process.env.REACT_APP_GOOGLE_MAPS_ID]
  });

  // Get user's location
  useEffect(() => {
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
        const lots = await getParkingLots(userLocation.lat, userLocation.lng);
        setParkingLots(lots);
      } catch (err) {
        setError('Failed to load parking lots. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchParkingLots();
  }, [userLocation]);

  // Setup socket for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = initSocket(token);

    // Subscribe to availability updates for all lots
    const unsubscribe = subscribeToAvailabilityUpdates((update) => {
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
      unsubscribe();
      // Leave all rooms
      parkingLots.forEach(lot => {
        leaveLotRoom(lot._id);
      });
    };
  }, [parkingLots]);

  useEffect(() => {
    if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key is missing. Please check your environment configuration.');
    }
  }, []);

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

  if (!isLoaded) {
    return <div className="flex justify-center items-center h-64">Loading Maps...</div>;
  }

  if (loading && !parkingLots.length) {
    return <div className="flex justify-center items-center h-64">Loading parking lots...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
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
            mapId: process.env.REACT_APP_GOOGLE_MAPS_ID
          }}
        >
          {/* User location marker */}
          <Marker
            position={userLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
          
          {/* Parking lot markers */}
          {parkingLots.map((lot) => {
            const isAvailable = lot.available_spots.car > 0 || lot.available_spots.bike > 0;
            return (
              <Marker
                key={lot._id}
                position={{
                  lat: lot.location.coordinates[1],
                  lng: lot.location.coordinates[0]
                }}
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
          })}
        </GoogleMap>
      </div>
      
      <div className="overflow-y-auto max-h-[70vh]">
        <h2 className="text-xl font-bold mb-4">Available Parking Lots</h2>
        
        {parkingLots.length === 0 ? (
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
