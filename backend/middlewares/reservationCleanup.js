const Reservation = require('../models/reservation');
const { updateAvailability } = require('../controllers/reservationController');
const { getCurrentISTTime, formatISTDate } = require('../utils/timeUtil');

// This function will be called periodically to cleanup reservations
async function cleanupReservations() {
  try {
    console.log('Running reservation cleanup...');
    
    // Find expired pending reservations
    const expiryTime = getCurrentISTTime();
    expiryTime.setMinutes(expiryTime.getMinutes() - 15); // 15 minutes timeout
    
    console.log(`Checking for reservations older than ${formatISTDate(expiryTime)}`);
    
    const expiredReservations = await Reservation.find({
      status: 'pending',
      start_time: { $lt: expiryTime }
    });
    
    console.log(`Found ${expiredReservations.length} expired pending reservations`);
    
    // Cancel each expired reservation
    for (const reservation of expiredReservations) {
      reservation.status = 'cancelled';
      await reservation.save();
      
      // Update availability
      await updateAvailability(reservation.parking_lot_id, reservation.vehicle_type);
      
      console.log(`Cancelled expired reservation: ${reservation._id} (${formatISTDate(reservation.start_time)})`);
    }
    
  } catch (error) {
    console.error('Error in reservation cleanup:', error);
  }
}

// Export both the function and a middleware
module.exports = {
  cleanupReservations,
  setupCleanupInterval: (interval = 60000) => { // Run every minute by default
    setInterval(cleanupReservations, interval);
    console.log(`Reservation cleanup scheduled to run every ${interval/1000} seconds`);
  }
}; 