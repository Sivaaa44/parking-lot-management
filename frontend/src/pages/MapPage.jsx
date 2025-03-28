import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParkingMap from '../components/map/ParkingMap';
import ErrorBoundary from '../components/ErrorBoundary';

const MapPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedLot, setSelectedLot] = useState(null);
  
  const handleSelectLot = (lot) => {
    setSelectedLot(lot);
  };
  
  const handleReserve = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (selectedLot) {
      navigate(`/reserve/${selectedLot._id}`);
    }
  };
  
  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Left side - Map */}
      <div className="flex-1 relative h-full">
        <ErrorBoundary>
          <ParkingMap onSelectLot={handleSelectLot} selectedLot={selectedLot} />
        </ErrorBoundary>
      </div>

      {/* Right side - Details Panel */}
      <div className="w-[400px] bg-white border-l border-gray-100 flex flex-col h-full">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedLot ? 'Parking Details' : 'Available Parking'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selectedLot ? (
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

                <button
                  onClick={handleReserve}
                  className="btn btn-primary w-full"
                  disabled={!selectedLot || (selectedLot.available_spots.car === 0 && selectedLot.available_spots.bike === 0)}
                >
                  Reserve Parking
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a parking lot from the map to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;