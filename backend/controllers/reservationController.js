const Reservation = require('../models/reservation');
const ParkingLot = require('../models/parkingLot');
const { broadcast } = require('../utils/socketUtil');
const { getCurrentISTTime, convertToIST, formatISTDate } = require('../utils/timeUtil');

// Create a new reservation
exports.createReservation = async (req, res) => {
  try {
    const { 
      parking_lot_id, 
      vehicle_type, 
      vehicle_number, 
      start_time,
      reserve_now = false // Parameter to indicate immediate reservation
    } = req.body;
    
    // Use provided time or current time in IST
    const startDateObj = start_time ? convertToIST(start_time) : getCurrentISTTime();
    
    // Check if parking lot exists
    const parkingLot = await ParkingLot.findById(parking_lot_id);
    if (!parkingLot) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }
    
    // Check if user already has an active or pending reservation
    const existingReservation = await Reservation.findOne({
      user_id: req.user._id,
      status: { $in: ['pending', 'active'] }
    });
    
    if (existingReservation) {
      return res.status(400).json({ 
        message: 'You already have an active reservation',
        reservation: existingReservation
      });
    }
    
    // For immediate reservations, we check current availability
    // For future reservations, we'd ideally check projected availability at that time
    const activeReservations = await Reservation.countDocuments({
      parking_lot_id,
      vehicle_type,
      status: 'active'
    });
    
    // If it's a future reservation, also check other pending reservations that might overlap
    let pendingCount = 0;
    if (!reserve_now) {
      // Count pending reservations that would be active at the requested start time
      pendingCount = await Reservation.countDocuments({
        parking_lot_id,
        vehicle_type,
        status: 'pending',
        start_time: { $lte: startDateObj }
      });
    }
    
    const totalOccupied = activeReservations + pendingCount;
    const availableSpots = parkingLot.total_spots[vehicle_type] - totalOccupied;
    
    if (availableSpots <= 0) {
      // If no spots available, find the next likely available time
      const nextAvailable = await findNextAvailableTime(parking_lot_id, vehicle_type, startDateObj);
      
      return res.status(400).json({ 
        message: 'No spots available for this vehicle type at the requested time',
        next_available: nextAvailable,
        next_available_formatted: formatISTDate(nextAvailable)
      });
    }
    
    // Set initial status based on reserve_now flag
    const initialStatus = reserve_now ? 'active' : 'pending';
    
    // Create reservation
    const reservation = await Reservation.create({
      user_id: req.user._id,
      parking_lot_id,
      vehicle_type,
      vehicle_number,
      start_time: startDateObj,
      status: initialStatus
    });
    
    // If it's an immediate reservation, update availability immediately
    if (reserve_now) {
      await updateAvailability(parking_lot_id, vehicle_type);
    }
    
    res.status(201).json({
      ...reservation.toObject(),
      start_time_formatted: formatISTDate(reservation.start_time)
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to find next available time slot
async function findNextAvailableTime(parkingLotId, vehicleType, startTime) {
  try {
    const parkingLot = await ParkingLot.findById(parkingLotId);
    if (!parkingLot) throw new Error('Parking lot not found');
    
    // Get total capacity for this vehicle type
    const totalCapacity = parkingLot.total_spots[vehicleType];
    
    // Start searching from the requested time in 30-minute increments
    let checkTime = new Date(startTime);
    let foundSlot = false;
    let maxIterations = 48; // Limit search to 24 hours (48 half-hour increments)
    
    while (!foundSlot && maxIterations > 0) {
      // Add 30 minutes to the check time
      checkTime.setTime(checkTime.getTime() + 30 * 60 * 1000);
      
      // Count active reservations at this time
      const reservationsAtTime = await Reservation.countDocuments({
        parking_lot_id: parkingLotId,
        vehicle_type: vehicleType,
        status: { $in: ['active', 'pending'] },
        start_time: { $lte: checkTime },
        $or: [
          { end_time: null },
          { end_time: { $gt: checkTime } }
        ]
      });
      
      if (reservationsAtTime < totalCapacity) {
        foundSlot = true;
      }
      
      maxIterations--;
    }
    
    return foundSlot ? checkTime : null;
  } catch (error) {
    console.error('Error finding next available time:', error);
    // Return a default time 1 hour later as fallback
    const defaultTime = new Date(startTime);
    defaultTime.setHours(defaultTime.getHours() + 1);
    return defaultTime;
  }
}

// Start a reservation (mark as active)
exports.startReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    // Check if user owns this reservation
    if (reservation.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check if reservation is in pending state
    if (reservation.status !== 'pending') {
      return res.status(400).json({ message: `Reservation is already ${reservation.status}` });
    }
    
    // Update reservation status to active
    reservation.status = 'active';
    await reservation.save();
    
    // Get updated availability
    await updateAvailability(reservation.parking_lot_id, reservation.vehicle_type);
    
    res.json({
      ...reservation.toObject(),
      start_time_formatted: formatISTDate(reservation.start_time)
    });
  } catch (error) {
    console.error('Start reservation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// End a reservation (mark as completed and calculate fee)
exports.endReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    // Check if user owns this reservation
    if (reservation.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check if reservation is in active state
    if (reservation.status !== 'active') {
      return res.status(400).json({ message: `Reservation must be active to end, current status: ${reservation.status}` });
    }
    
    // Get parking lot for fee calculation
    const parkingLot = await ParkingLot.findById(reservation.parking_lot_id);
    if (!parkingLot) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }
    
    // Set end time to current IST time
    const end_time = getCurrentISTTime();
    reservation.end_time = end_time;
    
    // Calculate duration in hours
    const start = new Date(reservation.start_time);
    const durationMs = end_time - start;
    const durationHours = durationMs / (1000 * 60 * 60);
    
    // Calculate fee based on rates
    const vehicleRates = parkingLot.rates[reservation.vehicle_type];
    
    let fee = vehicleRates.first_hour;
    if (durationHours > 1) {
      fee += vehicleRates.additional_hour * (durationHours - 1);
    }
    
    // Cap at daily rate if applicable
    if (fee > vehicleRates.daily_cap) {
      fee = vehicleRates.daily_cap;
    }
    
    // Round to 2 decimal places
    reservation.fee = Math.round(fee * 100) / 100;
    reservation.status = 'completed';
    
    await reservation.save();
    
    // Update availability
    await updateAvailability(reservation.parking_lot_id, reservation.vehicle_type);
    
    res.json({
      ...reservation.toObject(),
      start_time_formatted: formatISTDate(reservation.start_time),
      end_time_formatted: formatISTDate(reservation.end_time),
      duration_hours: Math.round(durationHours * 100) / 100
    });
  } catch (error) {
    console.error('End reservation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's reservations
exports.getReservations = async (req, res) => {
  try {
    // Get all user reservations
    const reservations = await Reservation.find({ user_id: req.user._id })
      .sort({ start_time: -1 })
      .populate('parking_lot_id', 'name address');
    
    // Add formatted dates for easier client display
    const formattedReservations = reservations.map(res => ({
      ...res.toObject(),
      start_time_formatted: formatISTDate(res.start_time),
      end_time_formatted: res.end_time ? formatISTDate(res.end_time) : null
    }));
    
    res.json(formattedReservations);
  } catch (error) {
    console.error('Get reservations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel a reservation
exports.cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    
    // Check if user owns this reservation
    if (reservation.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Can only cancel pending reservations
    if (reservation.status !== 'pending') {
      return res.status(400).json({ 
        message: `Only pending reservations can be cancelled, current status: ${reservation.status}` 
      });
    }
    
    reservation.status = 'cancelled';
    await reservation.save();
    
    // Update availability after cancellation
    await updateAvailability(reservation.parking_lot_id, reservation.vehicle_type);
    
    res.json({ 
      message: 'Reservation cancelled',
      reservation: {
        ...reservation.toObject(),
        start_time_formatted: formatISTDate(reservation.start_time)
      } 
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to update availability and broadcast to clients
async function updateAvailability(parkingLotId, vehicleType) {
  try {
    const parkingLot = await ParkingLot.findById(parkingLotId);
    
    if (!parkingLot) {
      console.error('Parking lot not found for availability update');
      return;
    }
    
    // Current time in IST for checking availability
    const currentTime = getCurrentISTTime();
    
    // Count active reservations
    const activeCount = await Reservation.countDocuments({
      parking_lot_id: parkingLotId,
      vehicle_type: vehicleType,
      status: 'active'
    });
    
    // Count pending reservations
    const pendingCount = await Reservation.countDocuments({
      parking_lot_id: parkingLotId,
      vehicle_type: vehicleType,
      status: 'pending',
      start_time: { $lte: currentTime }
    });
    
    const totalOccupied = activeCount + pendingCount;
    const availableSpots = parkingLot.total_spots[vehicleType] - totalOccupied;
    
    // Broadcast update to clients
    broadcast(parkingLotId, {
      lot_id: parkingLotId,
      vehicle_type: vehicleType,
      available_spots: availableSpots,
      occupied_spots: {
        active: activeCount,
        pending: pendingCount
      },
      updated_at: formatISTDate(currentTime)
    });
    
    return availableSpots;
  } catch (error) {
    console.error('Update availability error:', error);
    throw error;
  }
}

module.exports.updateAvailability = updateAvailability;
