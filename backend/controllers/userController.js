const User = require('../models/User');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// Update user's current location
exports.updateLocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Update user's location in GeoJSON format
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude] // GeoJSON format is [longitude, latitude]
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Location updated successfully',
      user: {
        _id: updatedUser._id,
        location: updatedUser.location
      }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Find nearby users within a specified radius
exports.findNearbyUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude, maxDistance = 2, destination } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Convert maxDistance from kilometers to meters
    const radiusInMeters = maxDistance * 1000;

    // Find nearby users using geospatial query
    const nearbyUsers = await User.find({
      _id: { $ne: userId }, // Exclude the requesting user
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude] // GeoJSON format is [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).select('-password');

    // Format the response
    const formattedUsers = nearbyUsers.map(user => {
      // Calculate distance in kilometers
      const userCoords = user.location.coordinates;
      const distance = calculateDistance(
        latitude, longitude,
        userCoords[1], userCoords[0]
      );

      return {
        _id: user._id,
        name: user.name,
        username: user.username,
        gender: user.gender || 'Not specified',
        languages: user.languages || [],
        rating: user.rating || 4.5,
        profileImage: user.profileImage,
        distance: `${distance.toFixed(1)} km`,
        rideStatus: user.rideStatus || 'idle',
        currentRide: user.currentRide
      };
    });

    res.status(200).json({
      message: 'Nearby users retrieved successfully',
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error finding nearby users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Find nearby users who are looking for ride partners (seeking)
exports.findNearbyPartners = async (req, res) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude, maxDistance = 2, destination } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Convert maxDistance from kilometers to meters
    const radiusInMeters = maxDistance * 1000;

    // Find nearby users who are seeking ride partners
    const nearbyPartners = await User.find({
      _id: { $ne: userId }, // Exclude the requesting user
      rideStatus: 'seeking',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).select('-password');

    // Format the response
    const formattedUsers = nearbyPartners.map(user => {
      // Calculate distance in kilometers
      const userCoords = user.location.coordinates;
      const distance = calculateDistance(
        latitude, longitude,
        userCoords[1], userCoords[0]
      );

      return {
        _id: user._id,
        name: user.name,
        username: user.username,
        gender: user.gender || 'Not specified',
        languages: user.languages || [],
        rating: user.rating || 4.5,
        profileImage: user.profileImage,
        distance: `${distance.toFixed(1)} km`,
        rideStatus: 'seeking'
      };
    });

    res.status(200).json({
      message: 'Nearby ride partners retrieved successfully',
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error finding nearby partners:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Find nearby users who have already booked rides (booking)
exports.findNearbyBookedRides = async (req, res) => {
  try {
    const { userId } = req.params;
    const { latitude, longitude, maxDistance = 2, destination } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Convert maxDistance from kilometers to meters
    const radiusInMeters = maxDistance * 1000;

    // Find nearby users with booked rides
    const nearbyBookedRides = await User.find({
      _id: { $ne: userId }, // Exclude the requesting user
      rideStatus: 'booking',
      currentRide: { $exists: true },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).select('-password');

    // If destination is provided, filter by similar destinations
    let filteredUsers = nearbyBookedRides;
    if (destination) {
      filteredUsers = nearbyBookedRides.filter(user => {
        if (!user.currentRide || !user.currentRide.destination) return false;
        
        // Simple string matching - in a real app, you might use more sophisticated matching
        return user.currentRide.destination.toLowerCase().includes(destination.toLowerCase()) ||
               destination.toLowerCase().includes(user.currentRide.destination.toLowerCase());
      });
    }

    // Format the response
    const formattedUsers = filteredUsers.map(user => {
      // Calculate distance in kilometers
      const userCoords = user.location.coordinates;
      const distance = calculateDistance(
        latitude, longitude,
        userCoords[1], userCoords[0]
      );

      return {
        _id: user._id,
        name: user.name,
        username: user.username,
        gender: user.gender || 'Not specified',
        languages: user.languages || [],
        rating: user.rating || 4.5,
        profileImage: user.profileImage,
        distance: `${distance.toFixed(1)} km`,
        rideStatus: 'booking',
        currentRide: user.currentRide
      };
    });

    res.status(200).json({
      message: 'Nearby booked rides retrieved successfully',
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error finding nearby booked rides:', error);
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