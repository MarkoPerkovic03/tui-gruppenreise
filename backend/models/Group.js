const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  maxParticipants: {
    type: Number,
    required: true,
    default: 10,
    min: 2,
    max: 50
  },
  travelDateFrom: {
    type: Date,
    required: true
  },
  travelDateTo: {
    type: Date,
    required: true
  },
  budgetMin: {
    type: Number,
    default: 0
  },
  budgetMax: {
    type: Number,
    default: 10000
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  preferences: [{
    type: String,
    enum: ['all_inclusive', 'beach', 'city', 'adventure', 'culture', 'wellness', 'family', 'party']
  }],
  status: {
    type: String,
    enum: ['planning', 'voting', 'decided', 'booked', 'completed', 'cancelled'],
    default: 'planning'
  },
  votingDeadline: {
    type: Date,
    default: null
  },
  inviteToken: {
    type: String,
    unique: true,
    sparse: true
  },
  winningProposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    default: null
  }
}, {
  timestamps: true
});

// Virtuals
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Indexes
groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ status: 1 });
groupSchema.index({ inviteToken: 1 });

module.exports = mongoose.model('Group', groupSchema);