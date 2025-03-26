const ParkingLot = require('../models/parkingLot');
const Reservation = require('../models/reservation');
const { getCurrentISTTime, convertToIST, formatISTDate } = require('../utils/timeUtil');

// Get nearby parking lots based on user location
exports.getNearby = async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query; // radius in km

    console.log(`Incoming Request: lat=${lat}, lng=${lng}, radius=${radius}`);

    if (!lat || !lng) {
      console.log('Missing latitude or longitude in request');
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Convert radius from km to meters (MongoDB uses meters)
    const radiusInMeters = parseFloat(radius) * 1000;

    console.log(`Querying MongoDB for parking lots within ${radiusInMeters} meters`);

    // Find parking lots within radius using MongoDB's $geoNear
    const nearbyLots = await ParkingLot.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)] // Note: longitude first
          },
          $maxDistance: radiusInMeters
        }
      }
    });

    if (nearbyLots.length === 0) {
      console.log('No parking lots found within the given radius');
      return res.json({ message: 'No nearby parking lots found' });
    }

    // Current time in IST for availability checks
    const currentTime = getCurrentISTTime();

    // Get current availability for each lot
    const lotsWithAvailability = await Promise.all(
      nearbyLots.map(async (lot) => {
        // Get active car reservations
        const carActiveCount = await Reservation.countDocuments({
          parking_lot_id: lot._id,
          vehicle_type: 'car',
          status: 'active'
        });

        // Get pending car reservations
        const carPendingCount = await Reservation.countDocuments({
          parking_lot_id: lot._id,
          vehicle_type: 'car',
          status: 'pending',
          start_time: { $lte: currentTime }
        });

        // Get active bike reservations
        const bikeActiveCount = await Reservation.countDocuments({
          parking_lot_id: lot._id,
          vehicle_type: 'bike',
          status: 'active'
        });

        // Get pending bike reservations
        const bikePendingCount = await Reservation.countDocuments({
          parking_lot_id: lot._id,
          vehicle_type: 'bike',
          status: 'pending',
          start_time: { $lte: currentTime }
        });

        return {
          ...lot.toObject(),
          distance: getDistanceInKm(
            lot.location.coordinates[1], 
            lot.location.coordinates[0], 
            parseFloat(lat), 
            parseFloat(lng)
          ),
          available_spots: {
            car: lot.total_spots.car - (carActiveCount + carPendingCount),
            bike: lot.total_spots.bike - (bikeActiveCount + bikePendingCount)
          },
          reserved_spots: {
            car: { active: carActiveCount, pending: carPendingCount },
            bike: { active: bikeActiveCount, pending: bikePendingCount }
          }
        };
      })
    );

    console.log('Returning lots with availability:', lotsWithAvailability);
    res.json(lotsWithAvailability);
  } catch (error) {
    console.error('Get nearby error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function (Ensure it's defined in utils or in this file)
function getDistanceInKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get parking lot by ID with current availability
exports.getById = async (req, res) => {
  try {
    const parkingLot = await ParkingLot.findById(req.params.id);
    
    if (!parkingLot) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }
    
    // Current time in IST for availability checks
    const currentTime = getCurrentISTTime();
    
    // Get active reservations
    const carActiveCount = await Reservation.countDocuments({
      parking_lot_id: parkingLot._id,
      vehicle_type: 'car',
      status: 'active'
    });
    
    // Get pending reservations
    const carPendingCount = await Reservation.countDocuments({
      parking_lot_id: parkingLot._id,
      vehicle_type: 'car',
      status: 'pending',
      start_time: { $lte: currentTime }
    });
    
    // Get active bike reservations
    const bikeActiveCount = await Reservation.countDocuments({
      parking_lot_id: parkingLot._id,
      vehicle_type: 'bike',
      status: 'active'
    });
    
    // Get pending bike reservations
    const bikePendingCount = await Reservation.countDocuments({
      parking_lot_id: parkingLot._id,
      vehicle_type: 'bike',
      status: 'pending',
      start_time: { $lte: currentTime }
    });
    
    const lotWithAvailability = {
      ...parkingLot.toObject(),
      available_spots: {
        car: parkingLot.total_spots.car - (carActiveCount + carPendingCount),
        bike: parkingLot.total_spots.bike - (bikeActiveCount + bikePendingCount)
      },
      reserved_spots: {
        car: { active: carActiveCount, pending: carPendingCount },
        bike: { active: bikeActiveCount, pending: bikePendingCount }
      },
      current_time: formatISTDate(currentTime)
    };
    
    res.json(lotWithAvailability);
  } catch (error) {
    console.error('Get parking lot by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check availability for a specific time
exports.checkAvailability = async (req, res) => {
  try {
    // Support both GET (query params) and POST (body)
    const params = req.method === 'GET' ? req.query : req.body;
    const { lot_id, vehicle_type, start_time } = params;
    
    // Use provided time or current time in IST
    const checkTime = start_time ? convertToIST(start_time) : getCurrentISTTime();
    
    console.log(`Checking availability with params:`, params);
    console.log(`Check time:`, formatISTDate(checkTime));
    
    if (!lot_id || !vehicle_type) {
      return res.status(400).json({ 
        message: 'Parking lot ID and vehicle type are required' 
      });
    }
    
    // Check if parking lot exists
    const parkingLot = await ParkingLot.findById(lot_id);
    if (!parkingLot) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }
    
    // Get total capacity
    const totalCapacity = parkingLot.total_spots[vehicle_type];
    if (totalCapacity === undefined) {
      return res.status(400).json({ message: 'Invalid vehicle type' });
    }
    
    // Count active reservations at this time
    const activeReservations = await Reservation.countDocuments({
      parking_lot_id: lot_id,
      vehicle_type,
      status: 'active',
      start_time: { $lte: checkTime },
      $or: [
        { end_time: null },
        { end_time: { $gt: checkTime } }
      ]
    });
    
    // Count pending reservations at this time
    const pendingReservations = await Reservation.countDocuments({
      parking_lot_id: lot_id,
      vehicle_type,
      status: 'pending',
      start_time: { $lte: checkTime }
    });
    
    const totalOccupied = activeReservations + pendingReservations;
    const availableSpots = totalCapacity - totalOccupied;
    
    if (availableSpots <= 0) {
      // If no spots available, find the next likely available time
      const nextAvailable = await findNextAvailableTime(lot_id, vehicle_type, checkTime);
      
      return res.json({
        available: false,
        message: 'No spots available at the requested time',
        next_available: nextAvailable,
        next_available_formatted: formatISTDate(nextAvailable),
        total_capacity: totalCapacity,
        occupied_spots: {
          active: activeReservations,
          pending: pendingReservations,
          total: totalOccupied
        },
        requested_time: formatISTDate(checkTime)
      });
    }
    
    return res.json({
      available: true,
      available_spots: availableSpots,
      total_capacity: totalCapacity,
      occupied_spots: {
        active: activeReservations,
        pending: pendingReservations,
        total: totalOccupied
      },
      requested_time: formatISTDate(checkTime)
    });
  } catch (error) {
    console.error('Check availability error:', error);
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
      const activeReservations = await Reservation.countDocuments({
        parking_lot_id: parkingLotId,
        vehicle_type: vehicleType,
        status: 'active',
        start_time: { $lte: checkTime },
        $or: [
          { end_time: null },
          { end_time: { $gt: checkTime } }
        ]
      });
      
      // Count pending reservations at this time
      const pendingReservations = await Reservation.countDocuments({
        parking_lot_id: parkingLotId,
        vehicle_type: vehicleType,
        status: 'pending',
        start_time: { $lte: checkTime }
      });
      
      const totalOccupied = activeReservations + pendingReservations;
      
      if (totalOccupied < totalCapacity) {
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
