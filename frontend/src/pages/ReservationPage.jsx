import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getParkingLotById } from '../utils/api';
import ReservationForm from '../components/reservation/ReservationForm';

const ReservationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [parkingLot, setParkingLot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login');
      return;
    }
    
    const fetchParkingLot = async () => {
      try {
        setLoading(true);
        const lot = await getParkingLotById(id);
        setParkingLot(lot);
      } catch (err) {
        setError('Failed to load parking lot details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchParkingLot();
  }, [id, user, navigate]);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={() => navigate('/map')}
          className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
        >
          Back to Map
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Make a Reservation</h1>
          <button
            onClick={() => navigate('/map')}
            className="text-blue-500 hover:text-blue-700"
          >
            Back to Map
          </button>
        </div>
        
        {parkingLot && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold">{parkingLot.name}</h2>
            <p className="text-gray-600">{parkingLot.address}</p>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Cars:</span> {parkingLot.available_spots.car}/{parkingLot.total_spots.car} available</p>
                <p className="text-sm text-gray-500">
                  Rates: ₹{parkingLot.rates.car.first_hour}/first hour, 
                  ₹{parkingLot.rates.car.additional_hour}/additional hour
                </p>
              </div>
              <div>
                <p><span className="font-medium">Bikes:</span> {parkingLot.available_spots.bike}/{parkingLot.total_spots.bike} available</p>
                <p className="text-sm text-gray-500">
                  Rates: ₹{parkingLot.rates.bike.first_hour}/first hour, 
                  ₹{parkingLot.rates.bike.additional_hour}/additional hour
                </p>
              </div>
            </div>
          </div>
        )}
        
        <ReservationForm lotId={id} />
      </div>
    </div>
  );
};

export default ReservationPage;
