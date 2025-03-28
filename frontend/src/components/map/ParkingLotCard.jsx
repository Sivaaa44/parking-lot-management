import React from 'react';
import { Link } from 'react-router-dom';

const ParkingLotCard = ({ lot, isSelected, onClick }) => {
  const cardClass = isSelected 
    ? 'border-2 border-blue-500 bg-blue-50' 
    : 'border border-gray-200 bg-white';
    
  return (
    <div 
      className={`${cardClass} rounded-lg p-4 shadow-sm cursor-pointer transition-all hover:shadow-md`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-800">{lot.name}</h3>
          <p className="text-gray-600 text-sm">{lot.address}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-green-600 font-medium">
            Cars: {lot.available_spots.car}/{lot.total_spots.car}
          </span>
          <span className="text-green-600 font-medium">
            Bikes: {lot.available_spots.bike}/{lot.total_spots.bike}
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-3">
        <div>
          <span className="text-sm text-gray-500">Rates from:</span>
          <div className="flex space-x-2">
            <p className="text-green-600 font-medium">
              ₹{lot.rates.car.first_hour}/hr (car)
            </p>
            <p className="text-green-600 font-medium">
              ₹{lot.rates.bike.first_hour}/hr (bike)
            </p>
          </div>
        </div>
        
        <Link 
          to={`/reserve/${lot._id}`} 
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          Reserve
        </Link>
      </div>
    </div>
  );
};

export default ParkingLotCard;