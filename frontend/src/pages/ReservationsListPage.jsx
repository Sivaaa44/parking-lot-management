import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserReservations, startReservation, endReservation, cancelReservation } from '../utils/api';

const ReservationsListPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchReservations();
  }, []);
  
  const fetchReservations = async () => {
    try {
      setLoading(true);
      const data = await getUserReservations();
      setReservations(data);
    } catch (err) {
      setError('Failed to load your reservations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartReservation = async (id) => {
    try {
      await startReservation(id);
      fetchReservations();
    } catch (err) {
      setError('Failed to start reservation');
      console.error(err);
    }
  };
  
  const handleEndReservation = async (id) => {
    try {
      await endReservation(id);
      fetchReservations();
    } catch (err) {
      setError('Failed to end reservation');
      console.error(err);
    }
  };
  
  const handleCancelReservation = async (id) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      try {
        await cancelReservation(id);
        fetchReservations();
      } catch (err) {
        setError('Failed to cancel reservation');
        console.error(err);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-64">
        <p className="text-lg">Loading your reservations...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">My Reservations</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {reservations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">You don't have any reservations yet.</p>
            <Link 
              to="/map" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Find Parking
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {reservations.map((reservation) => (
              <div 
                key={reservation._id}
                className="border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold text-lg">
                      {reservation.parking_lot_id.name}
                    </h3>
                    <p className="text-gray-600">
                      {reservation.parking_lot_id.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      reservation.status === 'active' ? 'bg-green-100 text-green-700' :
                      reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      reservation.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {reservation.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Type</p>
                    <p>{reservation.vehicle_type.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Number</p>
                    <p>{reservation.vehicle_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Start Time</p>
                    <p>{reservation.start_time_formatted}</p>
                  </div>
                  {reservation.end_time && (
                    <div>
                      <p className="text-sm text-gray-500">End Time</p>
                      <p>{reservation.end_time_formatted}</p>
                    </div>
                  )}
                </div>
                
                {reservation.fee && (
                  <div className="mt-3 border-t pt-3">
                    <p className="font-bold">
                      Total Fee: ₹{reservation.fee}
                    </p>
                  </div>
                )}
                
                <div className="mt-4 flex justify-end space-x-2">
                  {reservation.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStartReservation(reservation._id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => handleCancelReservation(reservation._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  
                  {reservation.status === 'active' && (
                    <button
                      onClick={() => handleEndReservation(reservation._id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                    >
                      End
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservationsListPage;