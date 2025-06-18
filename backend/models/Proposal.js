// backend/models/Proposal.js - ERWEITERTE VERSION
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
  // REFERENZ ZUM ORIGINAL TRAVELOFFER (NEU!)
  originalTravelOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TravelOffer',
    default: null
  },
  // Diese Felder werden automatisch aus TravelOffer übernommen:
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
  // Benutzerdefinierte Reisedaten:
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
  // Standard-Inklusivleistungen:
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
  // Abstimmung:
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

// Virtuelle Felder
proposalSchema.virtual('duration').get(function() {
  if (this.departureDate && this.returnDate) {
    return Math.ceil((this.returnDate - this.departureDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

proposalSchema.virtual('pricePerDay').get(function() {
  if (this.duration > 0) {
    return this.pricePerPerson / this.duration;
  }
  return this.pricePerPerson;
});

// Berechne Gesamtpreis vor dem Speichern
proposalSchema.pre('save', async function(next) {
  if (this.isModified('pricePerPerson')) {
    try {
      const group = await mongoose.model('Group').findById(this.group);
      if (group) {
        this.totalPrice = this.pricePerPerson * group.maxParticipants;
      }
    } catch (error) {
      console.error('Fehler beim Berechnen des Gesamtpreises:', error);
    }
  }
  next();
});

// Statische Methoden
proposalSchema.statics.findByGroup = function(groupId) {
  return this.find({ group: groupId })
    .populate('destination', 'name country city')
    .populate('proposedBy', 'name email')
    .populate('originalTravelOffer', 'title category stars amenities')
    .sort({ createdAt: -1 });
};

proposalSchema.statics.findWithVotes = function(groupId) {
  return this.find({ group: groupId })
    .populate('destination', 'name country city')
    .populate('proposedBy', 'name email')
    .populate('originalTravelOffer', 'title category stars amenities')
    .populate({
      path: 'votes',
      populate: {
        path: 'user',
        select: 'name email'
      }
    })
    .sort({ weightedScore: -1, voteCount: -1 });
};

// Instanz-Methoden
proposalSchema.methods.calculateScore = async function() {
  const Vote = mongoose.model('Vote');
  const votes = await Vote.find({ proposal: this._id });
  
  this.voteCount = votes.length;
  
  if (votes.length > 0) {
    const totalScore = votes.reduce((sum, vote) => {
      return sum + (4 - vote.rank); // 1=3 Punkte, 2=2 Punkte, 3=1 Punkt
    }, 0);
    this.weightedScore = totalScore / votes.length;
  } else {
    this.weightedScore = 0;
  }
  
  return this.save();
};

proposalSchema.methods.getVoteDistribution = async function() {
  const Vote = mongoose.model('Vote');
  const votes = await Vote.find({ proposal: this._id });
  
  const distribution = { 1: 0, 2: 0, 3: 0 };
  votes.forEach(vote => {
    distribution[vote.rank] = (distribution[vote.rank] || 0) + 1;
  });
  
  return distribution;
};

// Indexes
proposalSchema.index({ group: 1 });
proposalSchema.index({ destination: 1 });
proposalSchema.index({ proposedBy: 1 });
proposalSchema.index({ originalTravelOffer: 1 }); // NEU: Index für TravelOffer Referenz
proposalSchema.index({ weightedScore: -1 }); // Für Rankings
proposalSchema.index({ voteCount: -1 }); // Für Beliebtheit

// Virtuals in JSON include
proposalSchema.set('toJSON', { virtuals: true });
proposalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Proposal', proposalSchema);