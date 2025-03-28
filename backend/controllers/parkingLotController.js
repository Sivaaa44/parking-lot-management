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

// Get parking lots by destination address
exports.getParkingLotsByDestination = async (req, res) => {
  try {
    const { address, radius = 5 } = req.query; // radius in km
    
    if (!address) {
      return res.status(400).json({ message: 'Destination address is required' });
    }
    
    console.log(`Looking for parking lots near address: ${address}`);
    
    // Use Google Geocoding API to convert address to coordinates
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    // Fetch coordinates from Google API
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding error:', data.status, data.error_message);
      return res.status(400).json({ 
        message: 'Could not geocode the provided address',
        details: data.error_message || 'No results found'
      });
    }
    
    // Extract coordinates from the first result
    const location = data.results[0].geometry.location;
    const { lat, lng } = location;
    
    console.log(`Geocoded address to coordinates: lat=${lat}, lng=${lng}`);
    
    // Convert radius from km to meters (MongoDB uses meters)
    const radiusInMeters = parseFloat(radius) * 1000;
    
    // Find parking lots within radius using MongoDB's $geoNear
    const nearbyLots = await ParkingLot.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat] // Note: longitude first
          },
          $maxDistance: radiusInMeters
        }
      }
    });
    
    if (nearbyLots.length === 0) {
      console.log('No parking lots found near the provided address');
      return res.json({ 
        message: 'No parking lots found near the destination',
        formattedAddress: data.results[0].formatted_address,
        coordinates: { lat, lng }
      });
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
          available_spots: {
            car: lot.total_spots.car - (carActiveCount + carPendingCount),
            bike: lot.total_spots.bike - (bikeActiveCount + bikePendingCount)
          },
          reserved_spots: {
            car: { active: carActiveCount, pending: carPendingCount },
            bike: { active: bikeActiveCount, pending: bikePendingCount }
          },
          distance_km: Math.round((lot.location.coordinates[2] || 0) / 100) / 10, // Convert meters to km with 1 decimal
        };
      })
    );
    
    console.log(`Found ${lotsWithAvailability.length} parking lots near the destination`);
    
    // Return the results along with the geocoded address information
    res.json({
      lots: lotsWithAvailability,
      destination: {
        query: address,
        formatted_address: data.results[0].formatted_address,
        coordinates: { lat, lng }
      }
    });
  } catch (error) {
    console.error('Get parking lots by destination error:', error);
    
    if (error.message && error.message.includes('API key')) {
      return res.status(500).json({ 
        message: 'Google Geocoding API key error',
        details: error.message
      });
    }
    
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
