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
      reserve_now = false
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
    
    // Calculate current occupancy
    const activeReservations = await Reservation.countDocuments({
      parking_lot_id,
      vehicle_type,
      status: 'active'
    });
    
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
    
    const totalCapacity = parkingLot.total_spots[vehicle_type];
    const totalOccupied = activeReservations + pendingCount;
    const availableSpots = totalCapacity - totalOccupied;
    
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
    
    // Only check for max_end_time constraint if we're down to last available spot
    // AND this is an immediate reservation
    let max_end_time = null;
    let limitedTimeWarning = null;
    
    if (reserve_now && availableSpots === 1) {
      // Find the next upcoming reservation for this spot type
      const nextReservation = await Reservation.findOne({
        parking_lot_id,
        vehicle_type,
        status: 'pending',
        start_time: { $gt: startDateObj }
      }).sort({ start_time: 1 });  // Get the earliest upcoming reservation
      
      if (nextReservation) {
        max_end_time = nextReservation.start_time;
        limitedTimeWarning = `Note: Your parking is only available until ${formatISTDate(max_end_time)} due to an upcoming reservation.`;
      }
    }
    
    // Create reservation
    const reservation = await Reservation.create({
      user_id: req.user._id,
      parking_lot_id,
      vehicle_type,
      vehicle_number,
      start_time: startDateObj,
      max_end_time,  // Will be null unless we're at capacity with upcoming reservation
      status: initialStatus
    });
    
    // If it's an immediate reservation, update availability immediately
    if (reserve_now) {
      await updateAvailability(parking_lot_id, vehicle_type);
    }
    
    const response = {
      ...reservation.toObject(),
      start_time_formatted: formatISTDate(reservation.start_time)
    };
    
    if (max_end_time) {
      response.max_end_time_formatted = formatISTDate(max_end_time);
      response.warning = limitedTimeWarning;
    }
    
    res.status(201).json(response);
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
    
    // Get current time in IST
    const currentTime = getCurrentISTTime();
    
    // Check if trying to start before the scheduled start time (with 15 min grace period)
    const startTime = new Date(reservation.start_time);
    const fifteenMinutesBeforeStart = new Date(startTime);
    fifteenMinutesBeforeStart.setMinutes(startTime.getMinutes() - 15);
    
    if (currentTime < fifteenMinutesBeforeStart) {
      return res.status(400).json({ 
        message: `Cannot start reservation before the scheduled time (15-minute grace period allowed)`,
        scheduled_time: formatISTDate(reservation.start_time),
        earliest_start: formatISTDate(fifteenMinutesBeforeStart),
        current_time: formatISTDate(currentTime)
      });
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
    
    // Apply late fee if the user exceeded max_end_time
    let lateFeePenalty = 0;
    let isLate = false;
    
    if (reservation.max_end_time && end_time > new Date(reservation.max_end_time)) {
      // Calculate overtime in hours
      const overtimeMs = end_time - new Date(reservation.max_end_time);
      const overtimeHours = overtimeMs / (1000 * 60 * 60);
      
      // Apply a 50% surcharge for overtime
      lateFeePenalty = vehicleRates.additional_hour * overtimeHours * 1.5;
      isLate = true;
    }
    
    // Round to 2 decimal places
    reservation.fee = Math.round((fee + lateFeePenalty) * 100) / 100;
    reservation.status = 'completed';
    
    await reservation.save();
    
    // Update availability
    await updateAvailability(reservation.parking_lot_id, reservation.vehicle_type);
    
    const response = {
      ...reservation.toObject(),
      start_time_formatted: formatISTDate(reservation.start_time),
      end_time_formatted: formatISTDate(reservation.end_time),
      duration_hours: Math.round(durationHours * 100) / 100
    };
    
    if (isLate) {
      response.warning = "You were parked beyond the maximum allowed time due to another reservation.";
      response.late_fee = Math.round(lateFeePenalty * 100) / 100;
      
      if (reservation.max_end_time) {
        response.max_end_time_formatted = formatISTDate(reservation.max_end_time);
      }
    }
    
    res.json(response);
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
