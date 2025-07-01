// backend/models/BookingSession.js - ERWEITERTE VERSION mit Zahlungsabwicklung
const mongoose = require('mongoose');

console.log('🔄 Enhanced BookingSession Model wird geladen...');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'reserved', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'paypal', 'credit_card', 'cash', 'stripe', 'sepa'],
    default: 'bank_transfer'
  },
  // Zahlungsdetails
  paymentDetails: {
    transactionId: String,
    paymentProvider: String, // 'stripe', 'paypal', etc.
    providerTransactionId: String,
    paymentIntent: String, // Für Stripe
    bankDetails: {
      iban: String,
      bic: String,
      accountHolder: String,
      reference: String
    }
  },
  // Zeitstempel
  paidAt: Date,
  reservedAt: Date,
  failedAt: Date,
  refundedAt: Date,
  
  // Zusätzliche Informationen
  notes: String,
  adminNotes: String, // Nur für Admins sichtbar
  
  // Automatische Erinnerungen
  remindersSent: [{
    sentAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['payment_due', 'payment_overdue', 'final_warning'] },
    channel: { type: String, enum: ['email', 'sms', 'push'] }
  }],
  
  // Teilzahlungen (für größere Beträge)
  installments: [{
    amount: Number,
    dueDate: Date,
    paidAt: Date,
    status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' }
  }]
}, {
  timestamps: true
});

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
    enum: [
      'initialized', 
      'collecting_payments', 
      'payment_reminders_sent',
      'ready_to_book', 
      'booking_in_progress', 
      'booked', 
      'cancelled',
      'partially_refunded',
      'fully_refunded'
    ],
    default: 'initialized'
  },
  
  // Finale Reisedetails
  finalDetails: {
    departureDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    totalParticipants: { type: Number, required: true },
    pricePerPerson: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    destination: { type: String, required: true },
    hotelName: String,
    bookingReference: String,
    specialRequests: [String]
  },
  
  // Zahlungsregelung
  paymentSettings: {
    paymentDeadline: {
      type: Date,
      default: function() {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 14); // 2 Wochen Standard
        return deadline;
      }
    },
    earlyBirdDeadline: {
      type: Date,
      default: function() {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7); // 1 Woche für Frühbucher
        return deadline;
      }
    },
    earlyBirdDiscount: {
      type: Number,
      default: 0, // Prozent Rabatt
      min: 0,
      max: 50
    },
    lateFee: {
      type: Number,
      default: 25, // Euro Strafe bei verspäteter Zahlung
      min: 0
    },
    allowPartialPayments: {
      type: Boolean,
      default: false
    },
    minimumDeposit: {
      type: Number,
      default: 100 // Mindestanzahlung in Euro
    }
  },
  
  // Zahlungen
  payments: [paymentSchema],
  
  // Gesamtstatistiken
  paymentStats: {
    totalCollected: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    totalRefunded: { type: Number, default: 0 },
    collectionRate: { type: Number, default: 0 }, // Prozent
    avgPaymentTime: { type: Number, default: 0 }, // Tage bis zur Zahlung
    lastReminderSent: Date
  },
  
  // Finale Buchung
  finalBooking: {
    bookingReference: String,
    bookedAt: Date,
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bookingConfirmation: String,
    bookingProvider: String, // Hotel, Reiseveranstalter, etc.
    cancellationPolicy: String,
    modifications: [{
      modifiedAt: { type: Date, default: Date.now },
      modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      changes: String,
      reason: String
    }]
  },
  
  // Automatisierung
  automation: {
    autoRemindersEnabled: { type: Boolean, default: true },
    autoReminderDays: [{ type: Number, default: [7, 3, 1] }], // Tage vor Deadline
    autoBookingEnabled: { type: Boolean, default: false },
    autoRefundEnabled: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// ===== VIRTUALS =====

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
         this.payments.every(p => p.status === 'paid' || p.status === 'reserved') &&
         this.totalCollected >= this.finalDetails.totalPrice;
});

bookingSessionSchema.virtual('isPaymentOverdue').get(function() {
  return this.paymentSettings.paymentDeadline && 
         new Date() > this.paymentSettings.paymentDeadline &&
         !this.isReadyToBook;
});

bookingSessionSchema.virtual('daysUntilPaymentDeadline').get(function() {
  if (!this.paymentSettings.paymentDeadline) return null;
  const diffTime = this.paymentSettings.paymentDeadline - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ===== INSTANCE METHODS =====

// Zahlungsmanagement
bookingSessionSchema.methods.getUserPaymentStatus = function(userId) {
  return this.payments.find(p => p.user.toString() === userId.toString()) || null;
};

bookingSessionSchema.methods.markPaymentAsPaid = function(userId, paymentData = {}) {
  const payment = this.payments.find(p => p.user.toString() === userId.toString());
  
  if (!payment) {
    throw new Error('Zahlung für diesen Benutzer nicht gefunden');
  }
  
  payment.status = 'paid';
  payment.paidAt = new Date();
  payment.paymentMethod = paymentData.paymentMethod || payment.paymentMethod;
  payment.notes = paymentData.notes || payment.notes;
  
  // Zahlungsdetails hinzufügen
  if (paymentData.transactionId) {
    payment.paymentDetails.transactionId = paymentData.transactionId;
  }
  if (paymentData.paymentProvider) {
    payment.paymentDetails.paymentProvider = paymentData.paymentProvider;
  }
  
  this.updatePaymentStats();
  
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
  payment.reservedAt = new Date();
  payment.notes = notes;
  
  this.updatePaymentStats();
  
  return this;
};

bookingSessionSchema.methods.refundPayment = function(userId, reason = '', partialAmount = null) {
  const payment = this.payments.find(p => p.user.toString() === userId.toString());
  
  if (!payment) {
    throw new Error('Zahlung für diesen Benutzer nicht gefunden');
  }
  
  if (payment.status !== 'paid') {
    throw new Error('Nur bezahlte Beträge können erstattet werden');
  }
  
  const refundAmount = partialAmount || payment.amount;
  
  payment.status = 'refunded';
  payment.refundedAt = new Date();
  payment.adminNotes = `Erstattet: €${refundAmount}. Grund: ${reason}`;
  
  // Bei Teilerstattung neuen Eintrag erstellen
  if (partialAmount && partialAmount < payment.amount) {
    const remainingAmount = payment.amount - partialAmount;
    payment.amount = remainingAmount;
    payment.status = 'paid';
    
    // Neuen Erstattungseintrag erstellen
    this.payments.push({
      user: userId,
      amount: -refundAmount, // Negative Menge für Erstattung
      status: 'refunded',
      paymentMethod: payment.paymentMethod,
      refundedAt: new Date(),
      notes: `Teilerstattung: ${reason}`
    });
  }
  
  this.updatePaymentStats();
  
  return this;
};

// Erinnerungen
bookingSessionSchema.methods.sendPaymentReminder = function(userId, reminderType = 'payment_due') {
  const payment = this.payments.find(p => p.user.toString() === userId.toString());
  
  if (!payment) {
    throw new Error('Zahlung für diesen Benutzer nicht gefunden');
  }
  
  payment.remindersSent.push({
    sentAt: new Date(),
    type: reminderType,
    channel: 'email'
  });
  
  this.paymentStats.lastReminderSent = new Date();
  
  return this;
};

bookingSessionSchema.methods.canSendReminder = function(userId) {
  const payment = this.payments.find(p => p.user.toString() === userId.toString());
  
  if (!payment || payment.status === 'paid') return false;
  
  const lastReminder = payment.remindersSent.slice(-1)[0];
  if (!lastReminder) return true;
  
  // Mindestens 2 Tage zwischen Erinnerungen
  const daysSinceLastReminder = (new Date() - lastReminder.sentAt) / (1000 * 60 * 60 * 24);
  return daysSinceLastReminder >= 2;
};

// Statistiken
bookingSessionSchema.methods.updatePaymentStats = function() {
  const paid = this.payments.filter(p => p.status === 'paid');
  const pending = this.payments.filter(p => p.status === 'pending');
  const refunded = this.payments.filter(p => p.status === 'refunded');
  
  this.paymentStats.totalCollected = paid.reduce((sum, p) => sum + p.amount, 0);
  this.paymentStats.totalPending = pending.reduce((sum, p) => sum + p.amount, 0);
  this.paymentStats.totalRefunded = Math.abs(refunded.reduce((sum, p) => sum + p.amount, 0));
  this.paymentStats.collectionRate = this.payments.length > 0 ? 
    Math.round((paid.length / this.payments.length) * 100) : 0;
  
  // Durchschnittliche Zahlungszeit berechnen
  const paidWithTime = paid.filter(p => p.paidAt);
  if (paidWithTime.length > 0) {
    const avgTime = paidWithTime.reduce((sum, p) => {
      const daysToPay = (p.paidAt - p.createdAt) / (1000 * 60 * 60 * 24);
      return sum + daysToPay;
    }, 0) / paidWithTime.length;
    this.paymentStats.avgPaymentTime = Math.round(avgTime * 10) / 10;
  }
  
  return this;
};

// ===== STATIC METHODS =====

bookingSessionSchema.statics.findOverduePayments = function() {
  return this.find({
    'paymentSettings.paymentDeadline': { $lt: new Date() },
    status: { $in: ['collecting_payments', 'payment_reminders_sent'] }
  });
};

bookingSessionSchema.statics.findReadyToBook = function() {
  return this.find({
    status: 'ready_to_book'
  });
};

// ===== MIDDLEWARE =====

bookingSessionSchema.pre('save', function(next) {
  // Automatische Statusaktualisierung
  if (this.isModified('payments')) {
    this.updatePaymentStats();
    
    if (this.isReadyToBook && this.status === 'collecting_payments') {
      this.status = 'ready_to_book';
    }
  }
  
  next();
});

// Virtuals in JSON include
bookingSessionSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Entferne sensitive Admin-Daten
    if (ret.payments) {
      ret.payments = ret.payments.map(payment => {
        const p = { ...payment };
        delete p.adminNotes;
        delete p.paymentDetails; // Je nach Frontend-Bedarf
        return p;
      });
    }
    return ret;
  }
});

bookingSessionSchema.set('toObject', { virtuals: true });

console.log('✅ Enhanced BookingSession Schema definiert');

try {
  const BookingSession = mongoose.model('BookingSession', bookingSessionSchema);
  console.log('✅ Enhanced BookingSession Model registriert');
  module.exports = BookingSession;
} catch (error) {
  console.error('❌ Fehler beim Registrieren des Enhanced BookingSession Models:', error);
  throw error;
}