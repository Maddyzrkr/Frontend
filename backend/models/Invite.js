const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InviteSchema = new Schema({
  ride: {
    type: Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  inviter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
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

module.exports = mongoose.model('Invite', InviteSchema); 