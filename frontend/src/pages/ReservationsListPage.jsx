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
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      active: 'bg-green-100 text-green-800 border border-green-200',
      completed: 'bg-blue-100 text-blue-800 border border-blue-200',
      cancelled: 'bg-gray-100 text-gray-800 border border-gray-200'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  if (loading && reservations.length === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-64px)] bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading reservations...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-600 text-white">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold">My Reservations</h1>
              <Link
                to="/map"
                className="text-white flex items-center gap-1 hover:text-blue-100 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Find New Parking
              </Link>
            </div>
          </div>
          
          <div className="p-6">
           
            {actionMessage && (
              <div className={`mb-6 rounded-md p-4 ${
                actionMessage.type === 'success' ? 'bg-green-50 border-l-4 border-green-500 text-green-700' : 
                actionMessage.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700' :
                'bg-red-50 border-l-4 border-red-500 text-red-700'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {actionMessage.type === 'success' && (
                      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {actionMessage.type === 'warning' && (
                      <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    {actionMessage.type === 'error' && (
                      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{actionMessage.text}</p>
                    {actionMessage.details && <p className="text-sm mt-1">{actionMessage.details}</p>}
                  </div>
                </div>
              </div>
            )}
            
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
            
            {reservations.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
                <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No reservations yet</h3>
                <p className="text-gray-500 mb-6">You haven't made any parking reservations</p>
                <Link
                  to="/map"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Find Parking
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {reservations.map(reservation => (
                  <div 
                    key={reservation._id} 
                    className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-md">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">
                                {reservation.parking_lot_id.name}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                {reservation.parking_lot_id.address}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex flex-wrap gap-4">
                            <div className="min-w-[120px]">
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                              {getStatusBadge(reservation.status)}
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Vehicle</p>
                              <p className="font-medium text-gray-800">
                                {reservation.vehicle_type.toUpperCase()} - {reservation.vehicle_number}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Start Time</p>
                              <p className="text-gray-800">{reservation.start_time_formatted}</p>
                            </div>
                            
                            {reservation.end_time_formatted && (
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">End Time</p>
                                <p className="text-gray-800">{reservation.end_time_formatted}</p>
                              </div>
                            )}
                          </div>
                          
                          {reservation.max_end_time && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-yellow-800">Time Restriction</p>
                                  <p className="text-sm text-yellow-700">
                                    This spot must be vacated by {new Date(reservation.max_end_time).toLocaleString()} 
                                    due to another reservation
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {reservation.fee && (
                            <div className="mt-4">
                              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Fee</p>
                              <p className="font-semibold text-lg text-green-600">₹{reservation.fee}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex md:flex-col gap-3 md:min-w-[120px] justify-end">
                          {reservation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStartReservation(reservation._id)}
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-colors shadow-sm flex items-center justify-center gap-1"
                                disabled={loading}
                              >
                                {loading ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></div>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                Start
                              </button>
                              <button
                                onClick={() => handleCancelReservation(reservation._id)}
                                className="px-4 py-2 bg-white border border-red-400 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                                disabled={loading}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
                            </>
                          )}
                          
                          {reservation.status === 'active' && (
                            <button
                              onClick={() => handleEndReservation(reservation._id)}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 transition-colors shadow-sm flex items-center justify-center gap-1"
                              disabled={loading}
                            >
                              {loading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1"></div>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              End
                            </button>
                          )}

                          {reservation.status === 'completed' && (
                            <div className="text-xs text-gray-500 italic mt-2 text-center">
                              Reservation completed
                            </div>
                          )}

                          {reservation.status === 'cancelled' && (
                            <div className="text-xs text-gray-500 italic mt-2 text-center">
                              Reservation cancelled
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationsListPage;