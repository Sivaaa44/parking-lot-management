import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  console.error('API Error:', error);
  return Promise.reject(error);
});

// Parking lot related API calls
export const getParkingLots = async (lat, lng, radius = 10) => {
  try {
    const response = await api.get(`/parking-lots/nearby`, {
      params: { lat, lng, radius }
    });
    return response;
  } catch (error) {
    console.error('Error fetching parking lots:', error);
    throw error;
  }
};

export const getParkingLotById = async (id) => {
  try {
    const response = await api.get(`/parking-lots/${id}`);
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
    
    const response = await api.get(`/parking-lots/check-availability`, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Reservation related API calls
export const createReservation = async (data) => {
  try {
    const response = await api.post('/reservations', data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error;
    }
    throw error;
  }
};

export const getUserReservations = async () => {
  try {
    const response = await api.get('/reservations');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const startReservation = async (id) => {
  try {
    const response = await api.put(`/reservations/${id}/start`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error;
    }
    throw error;
  }
};

export const endReservation = async (id) => {
  try {
    const response = await api.put(`/reservations/${id}/end`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error;
    }
    throw error;
  }
};

export const cancelReservation = async (id) => {
  try {
    const response = await api.delete(`/reservations/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};