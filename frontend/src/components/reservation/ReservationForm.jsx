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
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Reserve Parking</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {reservationWarning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
          <p className="font-medium">Time Restriction:</p>
          <p>{reservationWarning.message}</p>
          <p className="text-sm mt-1">You will be redirected to your reservations in a moment...</p>
        </div>
      )}
      
      {parkingLot && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-lg">{parkingLot.name}</h3>
          <p className="text-gray-600">{parkingLot.address}</p>
          
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-sm text-gray-500">Car Rates:</p>
              <p className="font-medium">₹{parkingLot.rates.car.first_hour}/first hour</p>
              <p className="font-medium">₹{parkingLot.rates.car.additional_hour}/additional hour</p>
              <p className="font-medium">₹{parkingLot.rates.car.daily_cap}/day max</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bike Rates:</p>
              <p className="font-medium">₹{parkingLot.rates.bike.first_hour}/first hour</p>
              <p className="font-medium">₹{parkingLot.rates.bike.additional_hour}/additional hour</p>
              <p className="font-medium">₹{parkingLot.rates.bike.daily_cap}/day max</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="vehicle_type">
            Vehicle Type
          </label>
          <select
            id="vehicle_type"
            name="vehicle_type"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.vehicle_type}
            onChange={handleChange}
            required
          >
            <option value="car">Car</option>
            <option value="bike">Bike</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="vehicle_number">
            Vehicle Number
          </label>
          <input
            id="vehicle_number"
            name="vehicle_number"
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={formData.vehicle_number}
            onChange={handleChange}
            placeholder="e.g., MH01AB1234"
            required
          />
        </div>
        
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <input
              id="reserve_now"
              name="reserve_now"
              type="checkbox"
              className="h-4 w-4 text-blue-600"
              checked={formData.reserve_now}
              onChange={handleChange}
            />
            <label className="ml-2 text-gray-700" htmlFor="reserve_now">
              Reserve for now
            </label>
          </div>
          
          {!formData.reserve_now && (
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="start_time">
                Start Time
              </label>
              <input
                id="start_time"
                name="start_time"
                type="datetime-local"
                className="w-full p-2 border border-gray-300 rounded"
                value={formData.start_time}
                onChange={handleChange}
                required={!formData.reserve_now}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter time in IST (Indian Standard Time)
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={handleCheckAvailability}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
            disabled={isCheckingAvailability}
          >
            {isCheckingAvailability ? 'Checking...' : 'Check Availability'}
          </button>
          
          {availabilityData && (
            <div className={`p-3 rounded ${availabilityData.available ? 'bg-green-100' : 'bg-red-100'}`}>
              {availabilityData.available ? (
                <p>✅ Spots available: {availabilityData.available_spots} out of {availabilityData.total_capacity}</p>
              ) : (
                <>
                  <p>❌ {availabilityData.message}</p>
                  {availabilityData.next_available_formatted && (
                    <p>Next available time: {availabilityData.next_available_formatted}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded mt-4"
          disabled={loading || !availabilityData?.available}
        >
          {loading ? 'Reserving...' : 'Reserve'}
        </button>
      </form>
    </div>
  );
};

export default ReservationForm;