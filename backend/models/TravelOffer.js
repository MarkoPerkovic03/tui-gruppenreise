const mongoose = require('mongoose');

const travelOfferSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Hotel', 'Apartment', 'Resort', 'Hostel', 'Ferienwohnung', 'Pension', 'Villa'],
    required: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  pricePerPerson: {
    type: Number,
    required: true,
    min: 0
  },
  pricePerNight: {
    type: Number,
    min: 0
  },
  minPersons: {
    type: Number,
    default: 1,
    min: 1
  },
  maxPersons: {
    type: Number,
    default: 10,
    min: 1
  },
  stars: {
    type: Number,
    min: 1,
    max: 5
  },
  amenities: [{
    type: String,
    enum: [
      'WLAN', 'Pool', 'Klimaanlage', 'Spa', 'Fitness', 'Restaurant', 
      'Bar', 'Parkplatz', 'Haustiere', 'Strand', 'Balkon', 'Küche',
      'Waschmaschine', 'TV', 'Safe', 'Minibar', 'Roomservice',
      'All-Inclusive', 'Halbpension', 'Vollpension', 'Nur Frühstück'
    ]
  }],
  location: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    address: {
      type: String,
      default: ''
    }
  },
  available: {
    type: Boolean,
    default: true
  },
  availabilityPeriods: [{
    from: {
      type: Date,
      required: true
    },
    to: {
      type: Date,
      required: true
    }
  }],
  tags: [{
    type: String,
    enum: ['beach', 'city', 'mountains', 'culture', 'adventure', 'relaxation', 'party', 'family', 'romantic', 'luxury', 'budget']
  }],
  cancellationPolicy: {
    type: String,
    enum: ['free', 'moderate', 'strict'],
    default: 'moderate'
  },
  checkInTime: {
    type: String,
    default: '15:00'
  },
  checkOutTime: {
    type: String,
    default: '11:00'
  },
  // WICHTIG: Geändert von ObjectId zu Number!
  createdBy: {
    type: Number,  // ← Das löst den Cast-Fehler
    required: true
  },
  lastModifiedBy: {
    type: Number  // ← Auch hier geändert für Konsistenz
  },
  bookingCount: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indizes für bessere Performance
travelOfferSchema.index({ destination: 'text', title: 'text', description: 'text' });
travelOfferSchema.index({ country: 1, destination: 1 });
travelOfferSchema.index({ category: 1 });
travelOfferSchema.index({ pricePerPerson: 1 });
travelOfferSchema.index({ available: 1 });
travelOfferSchema.index({ tags: 1 });
travelOfferSchema.index({ 'rating.average': -1 });
travelOfferSchema.index({ createdAt: -1 });

// Virtual für die Hauptbild-URL
travelOfferSchema.virtual('mainImage').get(function() {
  const mainImg = this.images.find(img => img.isMain);
  return mainImg ? mainImg.url : (this.images[0] ? this.images[0].url : null);
});

// Virtual für Preis-Display
travelOfferSchema.virtual('formattedPrice').get(function() {
  return `€${this.pricePerPerson.toFixed(2)}`;
});

// Pre-save Middleware
travelOfferSchema.pre('save', function(next) {
  // Stelle sicher, dass nur ein Bild als Hauptbild markiert ist
  const mainImages = this.images.filter(img => img.isMain);
  if (mainImages.length > 1) {
    this.images.forEach((img, index) => {
      img.isMain = index === 0;
    });
  } else if (mainImages.length === 0 && this.images.length > 0) {
    this.images[0].isMain = true;
  }
  next();
});

// Statische Methoden
travelOfferSchema.statics.findByDestination = function(destination) {
  return this.find({ 
    destination: new RegExp(destination, 'i'),
    available: true 
  });
};

travelOfferSchema.statics.findInPriceRange = function(minPrice, maxPrice) {
  return this.find({
    pricePerPerson: { $gte: minPrice, $lte: maxPrice },
    available: true
  });
};

module.exports = mongoose.model('TravelOffer', travelOfferSchema);