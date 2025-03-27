import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

// Configure axios
axios.defaults.baseURL = API_URL;

// Add token to requests if available
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Parking lot related API calls
export const getParkingLots = async (lat, lng, radius = 5) => {
  try {
    const response = await axios.get(`/parking-lots/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getParkingLotById = async (id) => {
  try {
    const response = await axios.get(`/parking-lots/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const checkAvailability = async (lotId, vehicleType, startTime) => {
  try {
    const params = {
      lot_id: lotId,
      vehicle_type: vehicleType
    };
    
    if (startTime) {
      params.start_time = startTime;
    }
    
    const response = await axios.get(`/parking-lots/check-availability`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Reservation related API calls
export const createReservation = async (data) => {
  try {
    const response = await axios.post('/reservations', data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserReservations = async () => {
  try {
    const response = await axios.get('/reservations');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const startReservation = async (id) => {
  try {
    const response = await axios.put(`/reservations/${id}/start`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const endReservation = async (id) => {
  try {
    const response = await axios.put(`/reservations/${id}/end`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const cancelReservation = async (id) => {
  try {
    const response = await axios.delete(`/reservations/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
