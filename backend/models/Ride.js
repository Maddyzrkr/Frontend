const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RideSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: String,
    required: true
  },
  pickup: {
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  destination: {
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  fare: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['booked', 'active', 'completed', 'cancelled'],
    default: 'booked'
  },
  partners: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  isSplit: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('Ride', RideSchema); 