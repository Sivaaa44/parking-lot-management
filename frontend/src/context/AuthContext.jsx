import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { closeSocket } from '../utils/socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Only react to changes in token storage
      if (e.key === 'token') {
        // Check if this is a logout event in another tab
        if (!e.newValue) {
          // Check if this logout is for a different user
          const currentToken = localStorage.getItem('token');
          if (!currentToken) {
            setUser(null);
            closeSocket();
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          logout();
        } else {
          // Set default auth header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(decoded);
        }
      } catch (err) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const res = await axios.post('/api/auth/login', { email, password });
      const { token } = res.data;
      
      closeSocket();
      
      localStorage.setItem('token', token);
      // Broadcast login event
      window.localStorage.setItem('lastLogin', Date.now().toString());
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const decoded = jwtDecode(token);
      setUser(decoded);
      navigate('/');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      await axios.post('/api/auth/register', userData);
      navigate('/login');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    // Broadcast logout event
    window.localStorage.setItem('lastLogout', Date.now().toString());
    
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    closeSocket();
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);