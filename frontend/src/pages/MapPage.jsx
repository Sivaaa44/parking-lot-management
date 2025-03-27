import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParkingMap from '../components/map/ParkingMap';

const MapPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedLot, setSelectedLot] = useState(null);
  
  const handleSelectLot = (lot) => {
    setSelectedLot(lot);
  };
  
  const handleReserve = () => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login');
      return;
    }
    
    if (selectedLot) {
      navigate(`/reserve/${selectedLot._id}`);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h1 className="text-2xl font-bold mb-2">Find Parking</h1>
        <p className="text-gray-600">
          Browse available parking lots on the map and select one to view details.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <ParkingMap onSelectLot={handleSelectLot} />
        
        {selectedLot && (
          <div className="mt-6 p-4 border-t border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">{selectedLot.name}</h2>
                <p className="text-gray-600">{selectedLot.address}</p>
                <div className="mt-2">
                  <p><span className="font-medium">Cars:</span> {selectedLot.available_spots.car}/{selectedLot.total_spots.car} available</p>
                  <p><span className="font-medium">Bikes:</span> {selectedLot.available_spots.bike}/{selectedLot.total_spots.bike} available</p>
                </div>
              </div>
              
              <button
                onClick={handleReserve}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                disabled={!selectedLot || (selectedLot.available_spots.car === 0 && selectedLot.available_spots.bike === 0)}
              >
                Reserve Parking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
