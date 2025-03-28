import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParkingLotById, checkAvailability, createReservation } from '../../utils/api';

const ReservationForm = ({ lotId }) => {
  const [parkingLot, setParkingLot] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_type: 'car',
    vehicle_number: '',
    start_time: '',
    reserve_now: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [reservationWarning, setReservationWarning] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchParkingLot = async () => {
      try {
        setLoading(true);
        const lot = await getParkingLotById(lotId);
        setParkingLot(lot);
      } catch (err) {
        setError('Failed to load parking lot details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchParkingLot();
  }, [lotId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Reset availability check when form changes
    setAvailabilityData(null);
  };

  const handleCheckAvailability = async (e) => {
    e.preventDefault();
    
    try {
      setIsCheckingAvailability(true);
      setError(null);
      
      const data = await checkAvailability(
        lotId, 
        formData.vehicle_type, 
        !formData.reserve_now ? formData.start_time : undefined
      );
      
      setAvailabilityData(data);
    } catch (err) {
      setError('Failed to check availability');
      console.error(err);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!availabilityData || !availabilityData.available) {
      setError('Please check availability first or select a different time');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const reservationData = {
        parking_lot_id: lotId,
        vehicle_type: formData.vehicle_type,
        vehicle_number: formData.vehicle_number,
        start_time: !formData.reserve_now ? formData.start_time : undefined,
        reserve_now: formData.reserve_now
      };
      
      const response = await createReservation(reservationData);
      
      // Check if there's a warning about time limitations
      if (response.warning) {
        setReservationWarning({
          message: response.warning,
          max_end_time: response.max_end_time_formatted
        });
        setSuccess('Reservation created, but with time restrictions.');
        
        // Navigate after a short delay to show the warning
        setTimeout(() => {
          navigate('/reservations');
        }, 3000);
      } else {
        navigate('/reservations');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create reservation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !parkingLot) {
    return <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
    </div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Vehicle Information</h2>
      
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      {reservationWarning && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Time Restriction:</p>
              <p className="text-sm">{reservationWarning.message}</p>
              <p className="text-xs mt-1">You will be redirected to your reservations in a moment...</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="vehicle_type">
              Vehicle Type
            </label>
            <select
              id="vehicle_type"
              name="vehicle_type"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.vehicle_type}
              onChange={handleChange}
              required
            >
              <option value="car">Car</option>
              <option value="bike">Bike</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="vehicle_number">
              Vehicle Number
            </label>
            <input
              id="vehicle_number"
              name="vehicle_number"
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={formData.vehicle_number}
              onChange={handleChange}
              placeholder="e.g., MH01AB1234"
              required
            />
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center mb-4">
            <input
              id="reserve_now"
              name="reserve_now"
              type="checkbox"
              className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              checked={formData.reserve_now}
              onChange={handleChange}
            />
            <label className="ml-2 block text-sm font-medium text-gray-700" htmlFor="reserve_now">
              Reserve for now
            </label>
          </div>
          
          {!formData.reserve_now && (
            <div className="p-4 bg-white rounded-md border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="start_time">
                Start Time
              </label>
              <input
                id="start_time"
                name="start_time"
                type="datetime-local"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.start_time}
                onChange={handleChange}
                required={!formData.reserve_now}
              />
              <p className="text-xs text-gray-500 mt-2 italic">
                Enter time in IST (Indian Standard Time)
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-8 space-y-4">
          {availabilityData && (
            <div className={`p-4 rounded-lg ${availabilityData.available ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start">
                <div className={`flex-shrink-0 p-1 rounded-full ${availabilityData.available ? 'bg-green-100' : 'bg-red-100'}`}>
                  {availabilityData.available ? (
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  {availabilityData.available ? (
                    <p className="text-sm font-medium text-green-800">
                      Spots available: {availabilityData.available_spots} out of {availabilityData.total_capacity}
                    </p>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-red-800">{availabilityData.message}</p>
                      {availabilityData.next_available_formatted && (
                        <p className="text-sm text-red-700 mt-1">
                          Next available time: {availabilityData.next_available_formatted}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <button
            type="button"
            onClick={handleCheckAvailability}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-md transition-colors border border-gray-300 flex items-center justify-center"
            disabled={isCheckingAvailability}
          >
            {isCheckingAvailability ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent mr-2"></div>
                Checking...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check Availability
              </>
            )}
          </button>
          
          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-md text-white font-medium flex items-center justify-center ${
              availabilityData?.available 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-blue-300 cursor-not-allowed'
            } transition-colors`}
            disabled={loading || !availabilityData?.available}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Reserving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Complete Reservation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReservationForm;