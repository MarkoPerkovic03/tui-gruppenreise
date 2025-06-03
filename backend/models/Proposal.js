const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  destination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    required: true
  },
  proposedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hotelName: {
    type: String,
    default: ''
  },
  hotelUrl: {
    type: String,
    default: ''
  },
  pricePerPerson: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number
  },
  departureDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  includesFlight: {
    type: Boolean,
    default: true
  },
  includesTransfer: {
    type: Boolean,
    default: true
  },
  mealPlan: {
    type: String,
    enum: ['none', 'breakfast', 'half_board', 'full_board', 'all_inclusive'],
    default: 'breakfast'
  },
  votes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vote'
  }],
  voteCount: {
    type: Number,
    default: 0
  },
  weightedScore: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
proposalSchema.index({ group: 1 });
proposalSchema.index({ destination: 1 });
proposalSchema.index({ proposedBy: 1 });

module.exports = mongoose.model('Proposal', proposalSchema);
