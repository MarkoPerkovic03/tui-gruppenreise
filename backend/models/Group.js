// backend/models/Group.js - ERWEITERT mit Invite Token Support
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
    enum: ['All-Inclusive', 'Strand', 'Stadt', 'Berge', 'Kultur', 'Abenteuer', 'Entspannung', 'Wellness', 'Party', 'Familie', 'Romantik', 'Luxus', 'Günstig']
  }],
  status: {
    type: String,
    enum: ['planning', 'voting', 'decided', 'booking', 'booked', 'completed', 'cancelled'],
    default: 'planning'
  },
  votingDeadline: {
    type: Date,
    default: null
  },
  
  // ===== NEUE FELDER FÜR INVITE SYSTEM =====
  inviteToken: {
    type: String,
    unique: true,
    sparse: true, // Erlaubt null/undefined Werte, unique nur für existierende Werte
    index: true
  },
  inviteTokenExpires: {
    type: Date,
    default: null
  },
  inviteSettings: {
    allowJoining: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    maxUsesPerToken: {
      type: Number,
      default: null // null = unlimited
    },
    currentUses: {
      type: Number,
      default: 0
    }
  },
  
  // ===== BESTEHENDE FELDER =====
  winningProposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    default: null
  }
}, {
  timestamps: true
});

// ===== VIRTUALS =====
groupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

groupSchema.virtual('hasActiveInvite').get(function() {
  return this.inviteToken && 
         this.inviteTokenExpires && 
         this.inviteTokenExpires > new Date();
});

groupSchema.virtual('inviteUrl').get(function() {
  if (!this.inviteToken) return null;
  // In production sollte hier die echte Domain stehen
  return `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${this.inviteToken}`;
});

// ===== INDEXES =====
groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });
groupSchema.index({ status: 1 });
groupSchema.index({ inviteToken: 1 }); // Für schnelle Token-Suche
groupSchema.index({ inviteTokenExpires: 1 }); // Für Cleanup abgelaufener Tokens

// ===== METHODS =====

// Instance method: Generate new invite token
groupSchema.methods.generateInviteToken = function(expiresInDays = 7) {
  const crypto = require('crypto');
  
  this.inviteToken = crypto.randomBytes(32).toString('hex');
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  this.inviteTokenExpires = expiresAt;
  
  // Reset usage counter
  this.inviteSettings.currentUses = 0;
  
  return this.inviteToken;
};

// Instance method: Revoke invite token
groupSchema.methods.revokeInviteToken = function() {
  this.inviteToken = undefined;
  this.inviteTokenExpires = undefined;
  this.inviteSettings.currentUses = 0;
};

// Instance method: Check if user can join via invite
groupSchema.methods.canUserJoinViaInvite = function(userId) {
  // Prüfe ob Einladung aktiv ist
  if (!this.hasActiveInvite) {
    return { canJoin: false, reason: 'Kein aktiver Einladungslink' };
  }
  
  // Prüfe ob Joining erlaubt ist
  if (!this.inviteSettings.allowJoining) {
    return { canJoin: false, reason: 'Beitreten ist deaktiviert' };
  }
  
  // Prüfe ob User bereits Mitglied ist
  const isAlreadyMember = this.members.some(member => 
    member.user.toString() === userId.toString()
  );
  
  if (isAlreadyMember) {
    return { canJoin: false, reason: 'Bereits Mitglied' };
  }
  
  // Prüfe Teilnehmerlimit
  if (this.members.length >= this.maxParticipants) {
    return { canJoin: false, reason: 'Gruppe ist voll' };
  }
  
  // Prüfe Usage-Limit
  if (this.inviteSettings.maxUsesPerToken && 
      this.inviteSettings.currentUses >= this.inviteSettings.maxUsesPerToken) {
    return { canJoin: false, reason: 'Einladungslink-Limit erreicht' };
  }
  
  return { canJoin: true };
};

// Instance method: Add user via invite
groupSchema.methods.addUserViaInvite = function(userId) {
  const canJoinResult = this.canUserJoinViaInvite(userId);
  
  if (!canJoinResult.canJoin) {
    throw new Error(canJoinResult.reason);
  }
  
  // Füge User hinzu
  this.members.push({
    user: userId,
    role: 'member',
    joinedAt: new Date()
  });
  
  // Erhöhe Usage Counter
  this.inviteSettings.currentUses += 1;
  
  return this;
};

// ===== STATIC METHODS =====

// Static method: Find group by valid invite token
groupSchema.statics.findByValidInviteToken = function(token) {
  return this.findOne({
    inviteToken: token,
    inviteTokenExpires: { $gt: new Date() }
  });
};

// Static method: Cleanup expired invite tokens
groupSchema.statics.cleanupExpiredInvites = async function() {
  const result = await this.updateMany(
    { inviteTokenExpires: { $lt: new Date() } },
    { 
      $unset: { 
        inviteToken: 1, 
        inviteTokenExpires: 1 
      },
      $set: {
        'inviteSettings.currentUses': 0
      }
    }
  );
  
  console.log(`🧹 Cleanup: ${result.modifiedCount} abgelaufene Einladungslinks entfernt`);
  return result;
};

// ===== MIDDLEWARE =====

// Pre-save middleware: Validate invite token expiry
groupSchema.pre('save', function(next) {
  // Wenn Token gesetzt ist, aber kein Ablaufdatum
  if (this.inviteToken && !this.inviteTokenExpires) {
    // Setze Standard-Ablaufzeit (7 Tage)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    this.inviteTokenExpires = expiresAt;
  }
  
  // Wenn Token abgelaufen ist, entferne ihn
  if (this.inviteTokenExpires && this.inviteTokenExpires <= new Date()) {
    this.inviteToken = undefined;
    this.inviteTokenExpires = undefined;
    this.inviteSettings.currentUses = 0;
  }
  
  next();
});

// ===== VIRTUALS IN JSON INCLUDE =====
groupSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Entferne sensitive Daten aus JSON Output
    delete ret.inviteToken; // Token sollte nur bei expliziter Anfrage gezeigt werden
    return ret;
  }
});

groupSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Group', groupSchema);