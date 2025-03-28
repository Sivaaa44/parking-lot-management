import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserReservations, startReservation, endReservation, cancelReservation } from '../utils/api';

const ReservationsListPage = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  
  useEffect(() => {
    fetchReservations();
  }, []);
  
  const fetchReservations = async () => {
    try {
      setLoading(true);
      const data = await getUserReservations();
      setReservations(data);
    } catch (err) {
      setError('Failed to load reservations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartReservation = async (id) => {
    try {
      setLoading(true);
      setActionMessage(null);
      await startReservation(id);
      await fetchReservations();
      setActionMessage({ type: 'success', text: 'Reservation started successfully' });
    } catch (err) {
      // Handle the error from the backend about trying to start too early
      if (err.response?.status === 400 && err.response?.data?.earliest_start) {
        setActionMessage({ 
          type: 'error', 
          text: err.response.data.message, 
          details: `Scheduled time: ${err.response.data.scheduled_time}, Earliest start: ${err.response.data.earliest_start}`
        });
      } else {
        setActionMessage({ 
          type: 'error', 
          text: err.response?.data?.message || 'Failed to start reservation' 
        });
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEndReservation = async (id) => {
    try {
      setLoading(true);
      setActionMessage(null);
      const response = await endReservation(id);
      await fetchReservations();
      
      // Handle late fee warnings
      if (response.warning) {
        setActionMessage({ 
          type: 'warning', 
          text: 'Reservation ended with additional charges', 
          details: `${response.warning} Late fee: ₹${response.late_fee}`
        });
      } else {
        setActionMessage({ type: 'success', text: 'Reservation ended successfully' });
      }
    } catch (err) {
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to end reservation' 
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelReservation = async (id) => {
    try {
      setLoading(true);
      setActionMessage(null);
      await cancelReservation(id);
      await fetchReservations();
      setActionMessage({ type: 'success', text: 'Reservation cancelled successfully' });
    } catch (err) {
      setActionMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to cancel reservation' 
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  if (loading && reservations.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">My Reservations</h1>
        
        {actionMessage && (
          <div className={`mb-4 p-3 rounded ${
            actionMessage.type === 'success' ? 'bg-green-100 text-green-800' : 
            actionMessage.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            <p className="font-medium">{actionMessage.text}</p>
            {actionMessage.details && <p className="text-sm mt-1">{actionMessage.details}</p>}
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {reservations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>You don't have any reservations yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reservations.map(reservation => (
              <div 
                key={reservation._id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">
                      {reservation.parking_lot_id.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {reservation.parking_lot_id.address}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-gray-500">Status:</p>
                        <div className="mt-1">{getStatusBadge(reservation.status)}</div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Vehicle:</p>
                        <p className="font-medium">
                          {reservation.vehicle_type.toUpperCase()} - {reservation.vehicle_number}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm text-gray-500">Start Time:</p>
                      <p>{reservation.start_time_formatted}</p>
                      
                      {reservation.end_time_formatted && (
                        <>
                          <p className="text-sm text-gray-500 mt-2">End Time:</p>
                          <p>{reservation.end_time_formatted}</p>
                        </>
                      )}
                      
                      {reservation.max_end_time && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <p className="font-medium text-yellow-800">Time Restriction:</p>
                          <p className="text-yellow-700">
                            This spot must be vacated by {new Date(reservation.max_end_time).toLocaleString()} 
                            due to another reservation
                          </p>
                        </div>
                      )}
                      
                      {reservation.fee && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-500">Total Fee:</p>
                          <p className="font-medium text-lg">₹{reservation.fee}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {reservation.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStartReservation(reservation._id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full"
                          disabled={loading}
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleCancelReservation(reservation._id)}
                          className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded w-full"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {reservation.status === 'active' && (
                      <button
                        onClick={() => handleEndReservation(reservation._id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
                        disabled={loading}
                      >
                        End
                      </button>
                    )}
                  </div>
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