const mongoose = require('mongoose');

console.log('🔄 BookingSession Model wird geladen...');

const bookingSessionSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  winningProposal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true
  },
  status: {
    type: String,
    enum: ['initialized', 'collecting_payments', 'ready_to_book', 'booking_in_progress', 'booked', 'cancelled'],
    default: 'initialized'
  },
  finalDetails: {
    departureDate: Date,
    returnDate: Date,
    totalParticipants: Number,
    pricePerPerson: Number,
    totalPrice: Number,
    destination: String,
    hotelName: String
  },
  paymentDeadline: {
    type: Date,
    default: function() {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      return deadline;
    }
  },
  payments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'reserved', 'paid', 'refunded'],
      default: 'pending'
    },
    paidAt: Date,
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'paypal', 'credit_card', 'cash'],
      default: 'bank_transfer'
    },
    notes: String
  }],
  finalBooking: {
    bookingReference: String,
    bookedAt: Date,
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookingConfirmation: String
  }
}, {
  timestamps: true
});

bookingSessionSchema.virtual('paidParticipants').get(function() {
  return this.payments.filter(p => p.status === 'paid' || p.status === 'reserved').length;
});

bookingSessionSchema.virtual('totalCollected').get(function() {
  return this.payments
    .filter(p => p.status === 'paid' || p.status === 'reserved')
    .reduce((sum, p) => sum + p.amount, 0);
});

bookingSessionSchema.virtual('paymentProgress').get(function() {
  if (this.payments.length === 0) return 0;
  const paidCount = this.payments.filter(p => p.status === 'paid' || p.status === 'reserved').length;
  return Math.round((paidCount / this.payments.length) * 100);
});

bookingSessionSchema.virtual('isReadyToBook').get(function() {
  return this.payments.length > 0 && 
         this.payments.every(p => p.status === 'paid' || p.status === 'reserved');
});

bookingSessionSchema.methods.getUserPaymentStatus = function(userId) {
  return this.payments.find(p => p.user.toString() === userId.toString()) || null;
};

bookingSessionSchema.methods.markPaymentAsPaid = function(userId, paymentMethod = 'bank_transfer', notes = '') {
  const payment = this.payments.find(p => p.user.toString() === userId.toString());
  
  if (!payment) {
    throw new Error('Zahlung für diesen Benutzer nicht gefunden');
  }
  
  payment.status = 'paid';
  payment.paidAt = new Date();
  payment.paymentMethod = paymentMethod;
  payment.notes = notes;
  
  if (this.isReadyToBook) {
    this.status = 'ready_to_book';
  }
  
  return this;
};

bookingSessionSchema.methods.reserveSpot = function(userId, notes = '') {
  const payment = this.payments.find(p => p.user.toString() === userId.toString());
  
  if (!payment) {
    throw new Error('Zahlung für diesen Benutzer nicht gefunden');
  }
  
  payment.status = 'reserved';
  payment.notes = notes;
  
  return this;
};

bookingSessionSchema.set('toJSON', { virtuals: true });
bookingSessionSchema.set('toObject', { virtuals: true });

console.log('✅ BookingSession Schema definiert');

try {
  const BookingSession = mongoose.model('BookingSession', bookingSessionSchema);
  console.log('✅ BookingSession Model registriert');
  module.exports = BookingSession;
} catch (error) {
  console.error('❌ Fehler beim Registrieren des BookingSession Models:', error);
  throw error;
}