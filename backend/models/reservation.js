const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parking_lot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingLot' },
  vehicle_type: { type: String, enum: ['car', 'bike'] },
  vehicle_number: { type: String, default: null },
  start_time: Date,
  end_time: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
  fee: { type: Number, default: null },
  payment_status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
});

module.exports = mongoose.model('Reservation', reservationSchema);