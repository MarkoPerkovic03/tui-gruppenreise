const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  proposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  rank: {
    type: Number,
    default: 1,
    min: 1,
    max: 3
  }
}, {
  timestamps: true
});

// Compound unique index - ein User kann pro Proposal nur einmal abstimmen
voteSchema.index({ proposal: 1, user: 1 }, { unique: true });
voteSchema.index({ user: 1 });
voteSchema.index({ group: 1 });

module.exports = mongoose.model('Vote', voteSchema);