const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected routes (require authentication)
router.use(authMiddleware);

// Book a new ride
router.post('/book', rideController.bookRide);

// Get available ride providers
router.post('/providers', rideController.getProviders);

// Send a ride invitation to another user
router.post('/invite', rideController.sendInvite);

// Accept a ride invitation
router.post('/accept-invite/:inviteId', rideController.acceptInvite);

// Reject a ride invitation
router.post('/reject-invite/:inviteId', rideController.rejectInvite);

// Validate proximity between users
router.post('/validate-proximity', rideController.validateProximity);

// Get user's active rides
router.get('/active', rideController.getActiveRides);

module.exports = router; 