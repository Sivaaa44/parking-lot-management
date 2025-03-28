import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MapPage from './pages/MapPage';
import ReservationPage from './pages/ReservationPage';
import ReservationsListPage from './pages/ReservationsListPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { initSocket, closeSocket } from './utils/socket';

// Create a separate component to handle socket initialization
const SocketManager = () => {
  const { user } = useAuth();
  
  useEffect(() => {
    // Initialize or reset socket when user changes
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        console.log(`Initializing socket for user: ${user.email || user.id}`);
        initSocket(token);
      }
    } else {
      closeSocket();
    }
    
    return () => {
      closeSocket();
    };
  }, [user]);
  
  return null;
};

const App = () => {  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <SocketManager />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/reserve/:id" element={
            <ProtectedRoute>
              <ReservationPage />
            </ProtectedRoute>
          } />
          <Route path="/reservations" element={
            <ProtectedRoute>
              <ReservationsListPage />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
};

// The main App component with proper provider wrapping
const AppWithProviders = () => {
  return (
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  );
};

export default AppWithProviders;
