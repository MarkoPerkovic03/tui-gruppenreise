// backend/models/user.js - KORRIGIERTE VERSION
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // ← Das erstellt bereits einen Index
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.provider === 'local';
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local'
  },
  providerId: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  
  // ===== NEUE PROFIL-FELDER HINZUGEFÜGT =====
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    profileImage: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20
    },
    dateOfBirth: {
      type: Date
    },
    bio: {
      type: String,
      maxlength: 500
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: 100
      },
      city: {
        type: String,
        trim: true,
        maxlength: 50
      },
      postalCode: {
        type: String,
        trim: true,
        maxlength: 10
      },
      country: {
        type: String,
        trim: true,
        maxlength: 50,
        default: 'Deutschland'
      }
    },
    travelPreferences: {
      favoriteDestinations: [{
        type: String,
        trim: true
      }],
      travelStyle: [{
        type: String,
        enum: ['Kultur', 'Entspannung', 'Abenteuer', 'Strand', 'Städtereise', 'Naturreise', 'Genussreise', 'Aktivreise', 'Sportreise']
      }],
      budgetRange: {
        min: {
          type: Number,
          min: 0,
          default: 0
        },
        max: {
          type: Number,
          min: 0,
          default: 5000
        }
      },
      preferredDuration: {
        min: {
          type: Number,
          min: 1,
          default: 1
        },
        max: {
          type: Number,
          min: 1,
          default: 30
        }
      },
      accommodationType: [{
        type: String,
        enum: ['Hotel', 'Resort', 'Apartment', 'Pension', 'Hostel', 'Camping']
      }],
      activities: [{
        type: String,
        trim: true
      }],
      transportation: [{
        type: String,
        enum: ['Flug', 'Bus', 'Bahn', 'Auto', 'Schiff']
      }]
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
        maxlength: 100
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 20
      },
      relationship: {
        type: String,
        trim: true,
        maxlength: 50
      }
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      newOffers: {
        type: Boolean,
        default: true
      },
      groupUpdates: {
        type: Boolean,
        default: true
      },
      reminders: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // ===== NEUE FELDER =====
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// Indizes für bessere Performance (KORRIGIERT - kein doppelter Email-Index)
// userSchema.index({ email: 1 }); // ← ENTFERNT (unique: true erstellt bereits einen Index)
userSchema.index({ 'profile.firstName': 1, 'profile.lastName': 1 });
userSchema.index({ createdAt: -1 });

// Password hashing (behalten)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Password verification (behalten)
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// ===== NEUE METHODEN HINZUGEFÜGT =====

// Virtuelle Felder
userSchema.virtual('profile.fullName').get(function() {
  return `${this.profile?.firstName || ''} ${this.profile?.lastName || ''}`.trim();
});

userSchema.virtual('profile.profileCompletion').get(function() {
  if (!this.profile) return 0;
  
  const fields = [
    this.profile.firstName,
    this.profile.lastName,
    this.profile.profileImage,
    this.profile.phone,
    this.profile.bio,
    this.profile.address?.city,
    this.profile.travelPreferences?.favoriteDestinations?.length > 0,
    this.profile.emergencyContact?.name
  ];

  const completedFields = fields.filter(field => 
    field && field !== '' && field !== null && field !== undefined
  ).length;

  return Math.round((completedFields / fields.length) * 100);
});

// Neue Methoden
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    email: this.email,
    name: this.name,
    avatar: this.avatar,
    profile: {
      firstName: this.profile?.firstName,
      lastName: this.profile?.lastName,
      profileImage: this.profile?.profileImage,
      bio: this.profile?.bio,
      travelPreferences: {
        favoriteDestinations: this.profile?.travelPreferences?.favoriteDestinations || [],
        travelStyle: this.profile?.travelPreferences?.travelStyle || [],
        activities: this.profile?.travelPreferences?.activities || []
      }
    },
    memberSince: this.createdAt
  };
};

// Kompatibilität für dein bestehendes System
userSchema.virtual('isSystemAdmin').get(function() {
  return this.role === 'admin';
});

// Statische Methoden
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.getActiveUsers = function() {
  return this.find({ isActive: true }).select('-password');
};

userSchema.statics.getUserStats = async function(userId) {
  try {
    const user = await this.findById(userId);
    if (!user) return null;

    // Für jetzt einfache Statistiken - du kannst später echte Gruppenlogik hinzufügen
    const stats = {
      totalGroups: 0,
      activeGroups: 0,
      completedTrips: 0,
      totalVotes: 0,
      memberSince: user.createdAt,
      lastActive: user.lastLogin,
      profileCompletion: user.profile?.profileCompletion || 0
    };

    // Falls du Groups implementiert hast, kannst du das hier erweitern:
    try {
      const Group = mongoose.model('Group');
      const userGroups = await Group.find({
        $or: [
          { members: userId },
          { 'members.user': userId },
          { createdBy: userId }
        ]
      });

      const now = new Date();
      const activeGroups = userGroups.filter(group => 
        group.travelPeriod && new Date(group.travelPeriod.start) > now
      );
      const completedTrips = userGroups.filter(group => 
        group.travelPeriod && new Date(group.travelPeriod.end) < now
      );

      stats.totalGroups = userGroups.length;
      stats.activeGroups = activeGroups.length;
      stats.completedTrips = completedTrips.length;
    } catch (groupError) {
      // Group Model nicht gefunden oder andere Fehler - verwende Standardwerte
      console.log('Group Model nicht gefunden, verwende Standard-Statistiken');
    }

    return stats;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);