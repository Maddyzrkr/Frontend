const Ride = require('../models/Ride');
const User = require('../models/User');
const Invite = require('../models/Invite');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// Book a new ride
exports.bookRide = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { provider, pickup, destination, fare } = req.body;
    const userId = req.user.id; // From auth middleware

    // Create a new ride
    const newRide = new Ride({
      user: userId,
      provider,
      pickup: {
        coordinates: [pickup.longitude, pickup.latitude],
        address: pickup.address
      },
      destination: {
        coordinates: [destination.longitude, destination.latitude],
        address: destination.address
      },
      fare,
      status: 'booked'
    });

    // Save the ride
    const savedRide = await newRide.save();

    // Update user's ride status and current ride
    await User.findByIdAndUpdate(userId, {
      rideStatus: 'booking',
      currentRide: {
        provider,
        destination: destination.address,
        fare,
        departureTime: new Date()
      }
    });

    res.status(201).json({
      message: 'Ride booked successfully',
      rideId: savedRide._id,
      success: true
    });
  } catch (error) {
    console.error('Error booking ride:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get available ride providers
exports.getProviders = async (req, res) => {
  try {
    const { pickup, destination } = req.body;

    if (!pickup || !destination) {
      return res.status(400).json({ message: 'Pickup and destination coordinates are required' });
    }

    // In a real app, you would call external APIs for ride providers
    // For demo purposes, we'll return mock data
    const providers = [
      { 
        name: 'Uber', 
        eta: '5 mins', 
        fare: '₹350', 
        distance: '12 miles' 
      },
      { 
        name: 'Ola', 
        eta: '4 mins', 
        fare: '₹330', 
        distance: '12 miles' 
      },
      { 
        name: 'Rapido', 
        eta: '7 mins', 
        fare: '₹280', 
        distance: '12 miles' 
      }
    ];

    res.status(200).json({
      message: 'Providers retrieved successfully',
      providers
    });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send a ride invitation to another user
exports.sendInvite = async (req, res) => {
  try {
    const { rideId, userId } = req.body;
    const inviterId = req.user.id; // From auth middleware

    // Check if ride exists and belongs to the inviter
    const ride = await Ride.findOne({ _id: rideId, user: inviterId });
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found or not authorized' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if invite already exists
    const existingInvite = await Invite.findOne({
      ride: rideId,
      invitee: userId,
      inviter: inviterId
    });

    if (existingInvite) {
      return res.status(400).json({ message: 'Invite already sent to this user' });
    }

    // Create a new invite
    const newInvite = new Invite({
      ride: rideId,
      inviter: inviterId,
      invitee: userId,
      status: 'pending'
    });

    // Save the invite
    const savedInvite = await newInvite.save();

    res.status(201).json({
      message: 'Ride invitation sent successfully',
      inviteId: savedInvite._id,
      success: true
    });
  } catch (error) {
    console.error('Error sending invite:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Accept a ride invitation
exports.acceptInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user.id; // From auth middleware

    // Find the invite
    const invite = await Invite.findOne({
      _id: inviteId,
      invitee: userId,
      status: 'pending'
    });

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found or already processed' });
    }

    // Find the ride
    const ride = await Ride.findById(invite.ride);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Update the invite status
    invite.status = 'accepted';
    await invite.save();

    // Update the ride to include the partner
    ride.partners.push(userId);
    ride.isSplit = true;
    await ride.save();

    // Update the user's ride status and current ride
    await User.findByIdAndUpdate(userId, {
      rideStatus: 'booking',
      currentRide: {
        provider: ride.provider,
        destination: ride.destination.address,
        fare: ride.fare,
        departureTime: ride.createdAt
      }
    });

    res.status(200).json({
      message: 'Ride invitation accepted successfully',
      success: true
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject a ride invitation
exports.rejectInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user.id; // From auth middleware

    // Find the invite
    const invite = await Invite.findOne({
      _id: inviteId,
      invitee: userId,
      status: 'pending'
    });

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found or already processed' });
    }

    // Update the invite status
    invite.status = 'rejected';
    await invite.save();

    res.status(200).json({
      message: 'Ride invitation rejected successfully',
      success: true
    });
  } catch (error) {
    console.error('Error rejecting invite:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Validate proximity between users
exports.validateProximity = async (req, res) => {
  try {
    const { partnerId, location } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!partnerId || !location || !location.latitude || !location.longitude) {
      return res.status(400).json({ message: 'Partner ID and location are required' });
    }

    // Get the partner's location
    const partner = await User.findById(partnerId);
    if (!partner || !partner.location || !partner.location.coordinates) {
      return res.status(404).json({ message: 'Partner not found or location not available' });
    }

    // Calculate distance between users
    const partnerCoords = partner.location.coordinates;
    const distance = calculateDistance(
      location.latitude, location.longitude,
      partnerCoords[1], partnerCoords[0]
    );

    // Check if users are within 100 meters of each other
    const isNearby = distance <= 0.1; // 0.1 km = 100 meters

    res.status(200).json({
      message: isNearby ? 'Users are nearby' : 'Users are not nearby',
      isNearby,
      distance: `${distance.toFixed(3)} km`
    });
  } catch (error) {
    console.error('Error validating proximity:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's active rides
exports.getActiveRides = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    // Find rides where the user is either the owner or a partner
    const rides = await Ride.find({
      $or: [
        { user: userId },
        { partners: userId }
      ],
      status: { $in: ['booked', 'active'] }
    }).populate('user', 'name username profileImage')
      .populate('partners', 'name username profileImage');

    res.status(200).json({
      message: 'Active rides retrieved successfully',
      rides
    });
  } catch (error) {
    console.error('Error getting active rides:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
} 