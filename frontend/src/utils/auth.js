
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const login = async (email, password) => {
  try {
    const response = await axios.post('/auth/login', { email, password });
    const { token } = response.data;
    
    // Save token to localStorage
    localStorage.setItem('token', token);
    
    // Set token in axios headers
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Return decoded user data
    return jwtDecode(token);
  } catch (error) {
    throw error;
  }
};

export const register = async (userData) => {
  try {
    const response = await axios.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const logout = () => {
  // Remove token from localStorage
  localStorage.removeItem('token');
  
  // Remove token from axios headers
  delete axios.defaults.headers.common['Authorization'];
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired
    if (decoded.exp < currentTime) {
      localStorage.removeItem('token');
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    return jwtDecode(token);
  } catch (error) {
    return null;
  }
};
