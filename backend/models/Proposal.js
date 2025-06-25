// backend/models/Proposal.js - ERWEITERTE VERSION mit Tie-Breaking
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
  },
  // ===== NEU: Erweiterte Tie-Breaking Felder =====
  voteDistribution: {
    1: { type: Number, default: 0 }, // "Super" votes
    2: { type: Number, default: 0 }, // "OK" votes  
    3: { type: Number, default: 0 }  // "No" votes
  },
  tieBreakingRank: {
    type: Number,
    default: null
  },
  headToHeadWins: {
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

// ===== ENHANCED TIE-BREAKING METHODS =====

// Calculate comprehensive scoring with tie-breaking data
proposalSchema.methods.calculateEnhancedScore = async function() {
  const Vote = mongoose.model('Vote');
  const votes = await Vote.find({ proposal: this._id });
  
  this.voteCount = votes.length;
  
  // Calculate vote distribution
  const distribution = { 1: 0, 2: 0, 3: 0 };
  votes.forEach(vote => {
    distribution[vote.rank] = (distribution[vote.rank] || 0) + 1;
  });
  this.voteDistribution = distribution;
  
  // Calculate weighted score
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

// Legacy method for compatibility
proposalSchema.methods.calculateScore = async function() {
  return this.calculateEnhancedScore();
};

// Compare this proposal head-to-head with another
proposalSchema.methods.compareHeadToHead = async function(otherProposal) {
  const Vote = mongoose.model('Vote');
  const votesA = await Vote.find({ proposal: this._id }).populate('user', '_id');
  const votesB = await Vote.find({ proposal: otherProposal._id }).populate('user', '_id');
  
  if (!votesA.length || !votesB.length) return 0;
  
  let thisWins = 0;
  let otherWins = 0;
  
  // Find users who voted for both proposals
  const aVoters = new Set(votesA.map(v => v.user._id.toString()));
  const bVoters = new Set(votesB.map(v => v.user._id.toString()));
  const commonVoters = [...aVoters].filter(userId => bVoters.has(userId));
  
  commonVoters.forEach(userId => {
    const thisVote = votesA.find(v => v.user._id.toString() === userId);
    const otherVote = votesB.find(v => v.user._id.toString() === userId);
    
    // Lower rank = better (1 = Super, 3 = No)
    if (thisVote.rank < otherVote.rank) thisWins++;
    else if (otherVote.rank < thisVote.rank) otherWins++;
    // Ties are ignored
  });
  
  return thisWins - otherWins; // Positive if this wins, negative if other wins
};

// Get comprehensive tie-breaking info
proposalSchema.methods.getTieBreakingInfo = function() {
  return {
    weightedScore: this.weightedScore || 0,
    voteCount: this.voteCount || 0,
    superVotes: this.voteDistribution ? this.voteDistribution[1] : 0,
    okVotes: this.voteDistribution ? this.voteDistribution[2] : 0,
    noVotes: this.voteDistribution ? this.voteDistribution[3] : 0,
    pricePerPerson: this.pricePerPerson || 0,
    createdAt: this.createdAt
  };
};

// ===== STATIC METHODS =====

// Enhanced sorting with comprehensive tie-breaking
proposalSchema.statics.findByGroupWithTieBreaking = async function(groupId) {
  const proposals = await this.find({ group: groupId })
    .populate('destination', 'name country city')
    .populate('proposedBy', 'name email')
    .populate('originalTravelOffer', 'title category stars amenities');
  
  // Calculate enhanced scores for all proposals
  for (const proposal of proposals) {
    await proposal.calculateEnhancedScore();
  }
  
  // Sort with comprehensive tie-breaking logic
  const sortedProposals = proposals.sort((a, b) => {
    // Primary: Weighted score
    if (Math.abs(b.weightedScore - a.weightedScore) > 0.001) {
      return (b.weightedScore || 0) - (a.weightedScore || 0);
    }
    
    // Secondary: Vote count
    if (b.voteCount !== a.voteCount) {
      return (b.voteCount || 0) - (a.voteCount || 0);
    }
    
    // Tertiary: Number of "Super" ratings
    const aSuperVotes = a.voteDistribution ? a.voteDistribution[1] : 0;
    const bSuperVotes = b.voteDistribution ? b.voteDistribution[1] : 0;
    if (bSuperVotes !== aSuperVotes) {
      return bSuperVotes - aSuperVotes;
    }
    
    // Quaternary: Fewer "No" ratings
    const aNoVotes = a.voteDistribution ? a.voteDistribution[3] : 0;
    const bNoVotes = b.voteDistribution ? b.voteDistribution[3] : 0;
    if (aNoVotes !== bNoVotes) {
      return aNoVotes - bNoVotes;
    }
    
    // Quinary: Price-performance (lower price is better)
    if (a.pricePerPerson !== b.pricePerPerson) {
      return (a.pricePerPerson || Infinity) - (b.pricePerPerson || Infinity);
    }
    
    // Final: Creation time (earlier submission wins)
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  
  return {
    proposals: sortedProposals,
    tieInfo: this.detectTies(sortedProposals)
  };
};

// Detect ties and determine breaking method
proposalSchema.statics.detectTies = function(sortedProposals) {
  if (sortedProposals.length < 2) {
    return { hasTie: false, tiedProposals: [], tieBreakingMethod: null };
  }
  
  const topScore = sortedProposals[0].weightedScore || 0;
  const tiedProposals = sortedProposals.filter(p => 
    Math.abs((p.weightedScore || 0) - topScore) < 0.001
  ).slice(0, 3); // Max 3 tied proposals to analyze
  
  const hasTie = tiedProposals.length > 1;
  let tieBreakingMethod = null;
  
  if (hasTie && tiedProposals.length >= 2) {
    const first = tiedProposals[0];
    const second = tiedProposals[1];
    
    if (first.voteCount !== second.voteCount) {
      tieBreakingMethod = 'vote_count';
    } else if (first.voteDistribution && second.voteDistribution) {
      if (first.voteDistribution[1] !== second.voteDistribution[1]) {
        tieBreakingMethod = 'super_votes';
      } else if (first.voteDistribution[3] !== second.voteDistribution[3]) {
        tieBreakingMethod = 'fewer_no_votes';
      }
    }
    
    if (!tieBreakingMethod && first.pricePerPerson !== second.pricePerPerson) {
      tieBreakingMethod = 'price_performance';
    }
    
    if (!tieBreakingMethod) {
      tieBreakingMethod = 'creation_time';
    }
  }
  
  return {
    hasTie,
    tiedProposals,
    tieBreakingMethod,
    topScore: topScore
  };
};

// Legacy methods for compatibility
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

// Instanz-Methoden für Vote Distribution (Legacy Support)
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
proposalSchema.index({ originalTravelOffer: 1 });
proposalSchema.index({ weightedScore: -1 });
proposalSchema.index({ voteCount: -1 });
proposalSchema.index({ 'voteDistribution.1': -1 }); // Index for "Super" votes
proposalSchema.index({ 'voteDistribution.3': 1 });  // Index for "No" votes

// Virtuals in JSON include
proposalSchema.set('toJSON', { virtuals: true });
proposalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Proposal', proposalSchema);