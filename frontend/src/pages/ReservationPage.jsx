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
      <div className="flex justify-center items-center h-[calc(100vh-64px)] bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading parking lot information...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)] bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
          <button
            onClick={() => navigate('/map')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)] py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-600 text-white">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">Make a Reservation</h1>
              <button
                onClick={() => navigate('/map')}
                className="text-white flex items-center gap-1 hover:text-blue-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Map
              </button>
            </div>
          </div>
          
          {parkingLot && (
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{parkingLot.name}</h2>
                  <p className="text-gray-600">{parkingLot.address}</p>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Cars Available</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {parkingLot.available_spots.car}/{parkingLot.total_spots.car}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        ₹{parkingLot.rates.car.first_hour}/first hour, 
                        ₹{parkingLot.rates.car.additional_hour}/additional hour
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-500">Bikes Available</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {parkingLot.available_spots.bike}/{parkingLot.total_spots.bike}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        ₹{parkingLot.rates.bike.first_hour}/first hour, 
                        ₹{parkingLot.rates.bike.additional_hour}/additional hour
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="px-6 py-6">
            <ReservationForm lotId={id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;