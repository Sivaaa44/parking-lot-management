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
      <h3 className="font-bold text-lg">{lot.name}</h3>
      <p className="text-gray-600 text-sm mb-2">{lot.address}</p>
      
      <div className="grid grid-cols-2 gap-2 my-3">
        <div className="bg-gray-100 p-2 rounded">
          <p className="text-sm text-gray-500">Cars</p>
          <p className="font-medium">
            {lot.available_spots.car} / {lot.total_spots.car} available
          </p>
        </div>
        <div className="bg-gray-100 p-2 rounded">
          <p className="text-sm text-gray-500">Bikes</p>
          <p className="font-medium">
            {lot.available_spots.bike} / {lot.total_spots.bike} available
          </p>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-3">
        <div>
          <span className="text-sm font-medium">Rates from:</span>
          <p className="text-green-600 font-medium">
            ₹{lot.rates.car.first_hour}/hr (car)
          </p>
          <p className="text-green-600 font-medium">
            ₹{lot.rates.bike.first_hour}/hr (bike)
          </p>
        </div>
        
        <Link 
          to={`/reserve/${lot._id}`} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
        >
          Reserve
        </Link>
      </div>
    </div>
  );
};

export default ParkingLotCard;