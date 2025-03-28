import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  Marker, 
  InfoWindow,
  DirectionsRenderer
} from '@react-google-maps/api';
import { getParkingLots, getParkingLotsByDestination } from '../../utils/api';
import { initSocket, joinLotRoom, leaveLotRoom, subscribeToAvailabilityUpdates } from '../../utils/socket';

// Define libraries as a constant outside the component to avoid recreation on each render
const libraries = ['places'];

const containerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 13.0827,
  lng: 80.2707
};

const ParkingMap = ({ onSelectLot, selectedLot, onSetDirectionsFunction, onLotsUpdate }) => {
  const [parkingLots, setParkingLots] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [map, setMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [searchRadius, setSearchRadius] = useState(5);
  const [error, setError] = useState(null);

  // New state variables for directions
  const [directions, setDirections] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);

  // Load Google Maps API with all required libraries
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries // Use the static array defined outside the component
  });

  // Fetch parking lots based on location
  const fetchParkingLots = async (location) => {
    try {
      setLoading(true);
      const response = await getParkingLots(location.lat, location.lng);
      const lotsData = Array.isArray(response.data) ? response.data : [];
      setParkingLots(lotsData);
      
      // Pass the lots data to parent component
      if (onLotsUpdate && typeof onLotsUpdate === 'function') {
        onLotsUpdate(lotsData);
      }
    } catch (err) {
      setError('Failed to load parking lots. Please try again.');
      console.error('Error fetching parking lots:', err);
      setParkingLots([]);
      if (onLotsUpdate) onLotsUpdate([]);
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
  }, [getUserLocation, userLocation]);

  // Update handleMarkerClick to be a useCallback function for better performance
  const handleMarkerClick = useCallback((lot) => {
    if (!lot || !lot.location || !lot.location.coordinates) return;
    
    const position = {
      lat: lot.location.coordinates[1],
      lng: lot.location.coordinates[0]
    };
    
    setActiveMarker(lot._id);
    onSelectLot(lot);
    
    if (map) {
      map.panTo(position);
      map.setZoom(16); // Zoom in slightly when selecting a lot
    }
  }, [map, onSelectLot]);

  // Effect to center map when selectedLot changes from external components (like clicking a card)
  useEffect(() => {
    if (selectedLot && map && selectedLot.location && selectedLot.location.coordinates) {
      const position = {
        lat: selectedLot.location.coordinates[1],
        lng: selectedLot.location.coordinates[0]
      };
      
      map.panTo(position);
      map.setZoom(16);
      setActiveMarker(selectedLot._id);
    }
  }, [selectedLot, map]);

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
        const lotsData = response.data.lots;
        setParkingLots(lotsData);
        
        // Pass the lots data to parent component
        if (onLotsUpdate && typeof onLotsUpdate === 'function') {
          onLotsUpdate(lotsData);
        }
        
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
        if (onLotsUpdate) onLotsUpdate([]);
      }
    } catch (err) {
      console.error('Destination search error:', err);
      setError(err.response?.data?.message || 'Failed to search parking lots');
      setParkingLots([]);
      if (onLotsUpdate) onLotsUpdate([]);
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

  // Function to get directions
  const getDirections = useCallback((lot) => {
    if (!isLoaded) {
      setError("Maps API not loaded yet");
      return;
    }
    
    if (!lot || !lot.location || !lot.location.coordinates) {
      setError("Invalid parking lot data for directions");
      return;
    }

    if (!userLocation) {
      setError("User location is required for directions");
      return;
    }
    
    setDirectionsLoading(true);
    setShowDirections(true);
    setError(null);
    setRouteInfo(null);
    
    const destinationPosition = {
      lat: lot.location.coordinates[1],
      lng: lot.location.coordinates[0]
    };
    
    // Clear previous directions
    setDirections(null);
    
    // Check if google is defined before using it
    if (!window.google || !window.google.maps) {
      setError("Google Maps API not loaded properly");
      setDirectionsLoading(false);
      setShowDirections(false);
      return;
    }
    
    try {
      // Request new directions
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: userLocation,
          destination: destinationPosition,
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          setDirectionsLoading(false);
          
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            
            // Extract route information
            if (result.routes && result.routes.length > 0) {
              const route = result.routes[0];
              if (route.legs && route.legs.length > 0) {
                const leg = route.legs[0];
                setRouteInfo({
                  distance: leg.distance.text,
                  duration: leg.duration.text
                });
              }
            }
          } else {
            let errorMessage = "Couldn't get directions";
            
            switch(status) {
              case window.google.maps.DirectionsStatus.NOT_FOUND:
                errorMessage = "One of the locations couldn't be geocoded";
                break;
              case window.google.maps.DirectionsStatus.ZERO_RESULTS:
                errorMessage = "No route could be found between these locations";
                break;
              case window.google.maps.DirectionsStatus.REQUEST_DENIED:
                errorMessage = "This website is not authorized to use the Directions service";
                break;
              default:
                errorMessage = `Couldn't get directions: ${status}`;
            }
            
            setError(errorMessage);
            setShowDirections(false);
          }
        }
      );
    } catch (err) {
      console.error("Error getting directions:", err);
      setError("Failed to calculate directions: " + err.message);
      setDirectionsLoading(false);
      setShowDirections(false);
    }
  }, [userLocation, isLoaded]);

  // Pass the getDirections function to parent component
  useEffect(() => {
    if (onSetDirectionsFunction && typeof onSetDirectionsFunction === 'function') {
      onSetDirectionsFunction(getDirections);
    }
  }, [getDirections, onSetDirectionsFunction]);

  // Clear directions when user clicks the close button
  const clearDirections = useCallback(() => {
    setDirections(null);
    setShowDirections(false);
    setRouteInfo(null);
  }, []);

  // InfoWindow content component
  const infoWindowContent = useCallback((lot) => (
    <div className="info-window p-3 min-w-[200px]">
      <h3 className="font-semibold text-gray-900">{lot.name}</h3>
      <p className="text-sm text-gray-600 mt-1">{lot.address}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-md p-2 text-center">
          <span className="text-sm text-gray-600 block">Cars</span>
          <span className="font-medium text-green-600">
            {lot.available_spots.car}/{lot.total_spots.car}
          </span>
        </div>
        <div className="bg-gray-50 rounded-md p-2 text-center">
          <span className="text-sm text-gray-600 block">Bikes</span>
          <span className="font-medium text-green-600">
            {lot.available_spots.bike}/{lot.total_spots.bike}
          </span>
        </div>
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          getDirections(lot);
        }}
        className="mt-3 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Get Directions
      </button>
    </div>
  ), [getDirections]);

  // Render map markers
  const renderMarkers = useCallback(() => {
    if (!isLoaded || !window.google) return [];
    
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
      if (!lot || !lot.location || !lot.location.coordinates) return;
      
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
              {infoWindowContent(lot)}
            </InfoWindow>
          )}
        </Marker>
      );
    });

    return markers;
  }, [isLoaded, userLocation, parkingLots, activeMarker, handleMarkerClick, infoWindowContent]);

  // Fix the Google Map options to remove the styles when using mapId
  const mapOptions = useMemo(() => ({
    streetViewControl: false,
    mapTypeControl: false,
    mapId: import.meta.env.VITE_GOOGLE_MAPS_ID,
    zoomControl: true,
    zoomControlOptions: {
      position: isLoaded && window.google ? window.google.maps.ControlPosition.RIGHT_TOP : undefined
    }
  }), [isLoaded]);

  // Loading and error states
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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

  // Main render
  return (
    <div className="h-full relative">
      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4">
        <form onSubmit={handleDestinationSearch} className="flex items-center bg-white rounded-full shadow-lg overflow-hidden border border-gray-200">
          <input 
            type="text" 
            placeholder="Search for a destination..."
            value={destinationSearch}
            onChange={(e) => setDestinationSearch(e.target.value)}
            className="flex-1 px-5 py-3 focus:outline-none text-gray-700"
          />
          <select 
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="border-l border-gray-200 bg-white text-gray-700 py-3 px-2 focus:outline-none"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={15}>15 km</option>
          </select>
          <button 
            type="submit" 
            className="bg-blue-600 text-white h-full px-6 py-3 hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>
      </div>

      {/* Location Button */}
      <button
        onClick={getUserLocation}
        className="map-control-button absolute bottom-8 right-8 z-10"
        title="Get my location"
      >
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Google Map */}
      {isLoaded && window.google && (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={userLocation || defaultCenter}
          zoom={14}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          options={mapOptions}
        >
          {!showDirections && renderMarkers()}
          
          {directions && showDirections && (
            <>
              <DirectionsRenderer 
                directions={directions}
                options={{
                  suppressMarkers: false,
                  polylineOptions: {
                    strokeColor: '#2563eb',
                    strokeWeight: 5
                  }
                }}
              />
            </>
          )}
        </GoogleMap>
      )}
      
      {/* Route information */}
      {showDirections && routeInfo && (
        <div className="absolute bottom-24 left-4 z-10 bg-white p-3 rounded-lg shadow-lg">
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-medium">Distance: </span>
              {routeInfo.distance}
            </p>
            <p>
              <span className="font-medium">Est. Time: </span>
              {routeInfo.duration}
            </p>
          </div>
        </div>
      )}
      
      {/* Close directions button */}
      {showDirections && (
        <div className="absolute top-20 left-4 z-10">
          <button
            onClick={clearDirections}
            className="map-control-button flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close Directions
          </button>
        </div>
      )}
      
      {/* Display directions loading state */}
      {directionsLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Getting directions...</p>
          </div>
        </div>
      )}
      
      {/* Error message overlay */}
      {error && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 bg-red-50 p-3 rounded-lg shadow-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ParkingMap;