import React from 'react';
import { Link } from 'react-router-dom';

const ParkingLotCard = ({ lot, isSelected, onClick, getDirections }) => {
  if (!lot) return null;

  const isAvailable = lot.available_spots.car > 0 || lot.available_spots.bike > 0;
  
  return (
    <div 
      className={`rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white border border-gray-200'
      } ${!isAvailable ? 'border-red-100' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{lot.name}</h3>
          <p className="text-gray-600 text-sm mt-1">{lot.address}</p>
        </div>
        
        {!isAvailable && (
          <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
            Full
          </span>
        )}
      </div>
      
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className={`rounded-md p-2 text-center ${lot.available_spots.car > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <span className="text-sm text-gray-600 block">Cars</span>
          <span className={`font-medium ${lot.available_spots.car > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {lot.available_spots.car}/{lot.total_spots.car}
          </span>
        </div>
        <div className={`rounded-md p-2 text-center ${lot.available_spots.bike > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <span className="text-sm text-gray-600 block">Bikes</span>
          <span className={`font-medium ${lot.available_spots.bike > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {lot.available_spots.bike}/{lot.total_spots.bike}
          </span>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-500">From </span>
          <span className="font-medium text-green-600">₹{lot.rates.car.first_hour}/hr</span>
        </div>
        
        <div className="flex gap-2">
          {getDirections && (
            <button
              className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                getDirections(lot);
              }}
              title="Get directions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>
          )}
          
          <Link 
            to={`/reserve/${lot._id}`}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Reserve
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ParkingLotCard;