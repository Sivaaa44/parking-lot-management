const express = require('express');
const reservationController = require('../controllers/reservationController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.use(authMiddleware);

router.post('/', reservationController.createReservation);
router.put('/:id/start', reservationController.startReservation);
router.put('/:id/end', reservationController.endReservation);
router.get('/', reservationController.getReservations);
router.delete('/:id', reservationController.cancelReservation);

module.exports = router;