// src/components/layout/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-xl font-bold">
            ParkEasy
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/reservations" className="hover:text-gray-300">
                  My Reservations
                </Link>
                <span className="text-gray-400">|</span>
                <span className="text-gray-300">{user.name}</span>
                <button 
                  onClick={logout} 
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-gray-300">
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;