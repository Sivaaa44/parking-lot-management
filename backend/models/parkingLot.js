const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema({
  name: String,
  address: String,
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude] - Note: GeoJSON uses longitude first, then latitude!
      index: '2dsphere'
    }
  },
  total_spots: { car: Number, bike: Number },
  rates: {
    car: { first_hour: Number, additional_hour: Number, daily_cap: Number },
    bike: { first_hour: Number, additional_hour: Number, daily_cap: Number },
  }
});

// Create the 2dsphere index for geospatial queries
parkingLotSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ParkingLot', parkingLotSchema);