import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParkingMap from '../components/map/ParkingMap';
import ErrorBoundary from '../components/ErrorBoundary';
import ParkingLotCard from '../components/map/ParkingLotCard';

const MapPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedLot, setSelectedLot] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsFn, setDirectionsFn] = useState(null);
  const [allLots, setAllLots] = useState([]);
  const [showAllLots, setShowAllLots] = useState(false);
  
  const handleSelectLot = useCallback((lot) => {
    setSelectedLot(lot);
  }, []);
  
  const handleGetDirections = useCallback(() => {
    if (directionsFn && selectedLot) {
      directionsFn(selectedLot);
      setShowDirections(true);
    }
  }, [directionsFn, selectedLot]);
  
  const handleReserve = useCallback(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (selectedLot) {
      navigate(`/reserve/${selectedLot._id}`);
    }
  }, [user, navigate, selectedLot]);
  
  const handleSetDirectionsFn = useCallback((fn) => {
    setDirectionsFn(() => fn);
  }, []);
  
  const handleLotsUpdate = useCallback((lots) => {
    setAllLots(lots);
  }, []);
  
  const toggleAllLots = useCallback(() => {
    setShowAllLots(prev => !prev);
  }, []);

  // Main UI content for lot details
  const LotDetailsContent = useCallback(() => (
    <div className="p-4">
      <div className="card p-4 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedLot.name}
          </h3>
          <p className="text-gray-600 mt-1">{selectedLot.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <span className="text-sm text-gray-600 block mb-1">Cars</span>
            <span className="text-xl font-semibold text-green-600">
              {selectedLot.available_spots.car}/{selectedLot.total_spots.car}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <span className="text-sm text-gray-600 block mb-1">Bikes</span>
            <span className="text-xl font-semibold text-green-600">
              {selectedLot.available_spots.bike}/{selectedLot.total_spots.bike}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Parking Rates</h4>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Cars</span>
              <span className="font-medium text-green-600">
                ₹{selectedLot.rates.car.first_hour}/hr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bikes</span>
              <span className="font-medium text-green-600">
                ₹{selectedLot.rates.bike.first_hour}/hr
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGetDirections}
            className="btn btn-secondary flex-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Directions
          </button>
          <button
            onClick={handleReserve}
            className="btn btn-primary flex-1"
            disabled={!selectedLot || (selectedLot.available_spots.car === 0 && selectedLot.available_spots.bike === 0)}
          >
            Reserve
          </button>
        </div>
      </div>
    </div>
  ), [selectedLot, handleGetDirections, handleReserve]);

  // All Lots list content
  const AllLotsContent = useCallback(() => (
    <div className="p-4 space-y-4 overflow-y-auto">
      {allLots.length === 0 ? (
        <p className="text-center text-gray-500">No parking lots available</p>
      ) : (
        allLots.map(lot => (
          <ParkingLotCard
            key={lot._id}
            lot={lot}
            isSelected={selectedLot && selectedLot._id === lot._id}
            onClick={() => handleSelectLot(lot)}
          />
        ))
      )}
    </div>
  ), [allLots, selectedLot, handleSelectLot]);
  
  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Left side - Map */}
      <div className="flex-1 relative h-full">
        <ErrorBoundary>
          <ParkingMap 
            onSelectLot={handleSelectLot} 
            selectedLot={selectedLot} 
            onSetDirectionsFunction={handleSetDirectionsFn}
            onLotsUpdate={handleLotsUpdate}
          />
        </ErrorBoundary>
      </div>

      {/* Right side - Details Panel */}
      <div className="w-[400px] bg-white border-l border-gray-100 flex flex-col h-full">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {showAllLots 
              ? 'All Parking Lots' 
              : (selectedLot ? 'Parking Details' : 'Available Parking')}
          </h2>
          
          <button
            onClick={toggleAllLots}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
          >
            {showAllLots ? 'Show Details' : 'Show All Lots'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showAllLots ? (
            <AllLotsContent />
          ) : selectedLot ? (
            <LotDetailsContent />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-500">Select a parking lot from the map to view details</p>
              {allLots.length > 0 && (
                <button
                  onClick={toggleAllLots}
                  className="mt-4 text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50"
                >
                  Browse All Parking Lots ({allLots.length})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;