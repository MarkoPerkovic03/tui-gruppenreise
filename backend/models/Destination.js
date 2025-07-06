const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  images: [{
    type: String
  }],
  avgPricePerPerson: {
    type: Number,
    default: 0
  },
  popularityScore: {
    type: Number,
    default: 0
  },
  tags: [{
  type: String,
  enum: ['All-Inclusive', 'Strand', 'Stadt', 'Berge', 'Kultur', 'Abenteuer', 'Entspannung', 'Wellness', 'Party', 'Familie', 'Romantik', 'Luxus', 'Günstig']
  }],
  coordinates: {
    lat: Number,
    lng: Number
  }
}, {
  timestamps: true
});

// Indexes für Suche
destinationSchema.index({ name: 'text', country: 'text', city: 'text' });
destinationSchema.index({ popularityScore: -1 });
destinationSchema.index({ tags: 1 });

module.exports = mongoose.model('Destination', destinationSchema);
console.log('Destination Model loaded with tags including romantic.');