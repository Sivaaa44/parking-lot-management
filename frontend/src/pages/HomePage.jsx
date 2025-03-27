import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const handleFindParking = () => {
    navigate('/map');
  };
  
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Find and Reserve Parking Spots with Ease
            </h1>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
              Find available parking spots near you, reserve in advance, and avoid the hassle of finding parking.
            </p>
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleFindParking}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md text-lg font-medium shadow-md"
              >
                Find Parking
              </button>
              
              {!user && (
                <Link
                  to="/login"
                  className="ml-4 bg-white text-blue-500 border border-blue-500 px-6 py-3 rounded-md text-lg font-medium shadow-md"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Find Nearby Parking</h3>
              <p className="mt-2 text-base text-gray-500">
                Easily locate available parking spots near your destination using our interactive map.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Reserve in Advance</h3>
              <p className="mt-2 text-base text-gray-500">
                Book parking slots ahead of time to guarantee availability when you arrive.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Real-time Updates</h3>
              <p className="mt-2 text-base text-gray-500">
                Get real-time availability updates and notifications about your reservations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
