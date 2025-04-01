const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected routes (require authentication)
router.use(authMiddleware);

// Update user's current location
router.post('/location/:userId', userController.updateLocation);

// Find nearby users within a specified radius
router.post('/nearby/:userId', userController.findNearbyUsers);

// Find nearby users who are looking for ride partners (seeking)
router.post('/nearby-partners/:userId', userController.findNearbyPartners);

// Find nearby users who have already booked rides (booking)
router.post('/nearby-booked-rides/:userId', userController.findNearbyBookedRides);

module.exports = router; 