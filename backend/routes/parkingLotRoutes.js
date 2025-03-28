const express = require('express');
const parkingLotController = require('../controllers/parkingLotController');
const router = express.Router();

router.post('/check-availability', parkingLotController.checkAvailability);
router.get('/check-availability', parkingLotController.checkAvailability);
router.get('/nearby', parkingLotController.getNearby);
router.get('/by-destination', parkingLotController.getParkingLotsByDestination); 
router.get('/:id', parkingLotController.getById);

module.exports = router;