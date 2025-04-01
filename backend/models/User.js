const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  languages: {
    type: [String],
    default: []
  },
  profileImage: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  // Location data in GeoJSON format
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  // Current ride status
  rideStatus: {
    type: String,
    enum: ['idle', 'seeking', 'booking'],
    default: 'idle'
  },
  // Current ride details (if any)
  currentRide: {
    provider: String,
    destination: String,
    destinationLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [longitude, latitude]
    },
    fare: String,
    departureTime: Date
  },
  // User preferences
  preferences: {
    maxDistance: {
      type: Number,
      default: 2 // in kilometers
    },
    preferredGender: {
      type: String,
      enum: ['Male', 'Female', 'Any'],
      default: 'Any'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a 2dsphere index on the location field for geospatial queries
userSchema.index({ location: '2dsphere' });

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema); 