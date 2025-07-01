// backend/routes/payments.js - NEUE ZAHLUNGSROUTEN
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Models
const BookingSession = require('../models/BookingSession');
const Group = require('../models/Group');
const User = require('../models/user');

// @route   POST /api/payments/process
// @desc    Process a payment (mock implementation)
// @access  Private
router.post('/process', auth, async (req, res) => {
  try {
    const { 
      bookingSessionId, 
      paymentMethod, 
      amount,
      paymentDetails = {},
      notes = ''
    } = req.body;

    console.log('💳 Verarbeite Zahlung:', {
      bookingSessionId,
      paymentMethod,
      amount,
      userId: req.user.id
    });

    // Lade Booking Session
    const booking = await BookingSession.findById(bookingSessionId)
      .populate('group')
      .populate('payments.user', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    // Prüfe Berechtigung
    const isMember = booking.group.members.some(m => 
      m.user.toString() === req.user.id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Nicht berechtigt' });
    }

    // Finde Zahlung
    const userPayment = booking.payments.find(p => 
      p.user._id.toString() === req.user.id.toString()
    );

    if (!userPayment) {
      return res.status(404).json({ message: 'Zahlung nicht gefunden' });
    }

    if (userPayment.status === 'paid') {
      return res.status(400).json({ message: 'Bereits bezahlt' });
    }

    // Mock Payment Processing basierend auf Zahlungsart
    let paymentResult = { success: false, transactionId: null, error: null };

    switch (paymentMethod) {
      case 'stripe':
        paymentResult = await mockStripePayment(amount, paymentDetails);
        break;
      case 'paypal':
        paymentResult = await mockPayPalPayment(amount, paymentDetails);
        break;
      case 'bank_transfer':
        paymentResult = await mockBankTransfer(amount, paymentDetails);
        break;
      case 'sepa':
        paymentResult = await mockSepaPayment(amount, paymentDetails);
        break;
      default:
        return res.status(400).json({ message: 'Ungültige Zahlungsart' });
    }

    if (!paymentResult.success) {
      // Zahlung fehlgeschlagen
      userPayment.status = 'failed';
      userPayment.failedAt = new Date();
      userPayment.notes = `Fehler: ${paymentResult.error}`;
      
      await booking.save();
      
      return res.status(400).json({
        success: false,
        message: 'Zahlung fehlgeschlagen',
        error: paymentResult.error
      });
    }

    // Zahlung erfolgreich
    booking.markPaymentAsPaid(req.user.id, {
      paymentMethod,
      transactionId: paymentResult.transactionId,
      paymentProvider: paymentMethod,
      notes
    });

    await booking.save();

    console.log('✅ Zahlung erfolgreich verarbeitet:', paymentResult.transactionId);

    // Lade aktualisierte Daten
    const updatedBooking = await BookingSession.findById(bookingSessionId)
      .populate('group', 'name members')
      .populate('payments.user', 'name email profile.firstName profile.lastName');

    res.json({
      success: true,
      message: 'Zahlung erfolgreich verarbeitet',
      transactionId: paymentResult.transactionId,
      bookingSession: updatedBooking,
      userPaymentStatus: updatedBooking.getUserPaymentStatus(req.user.id)
    });

  } catch (error) {
    console.error('❌ Fehler bei Zahlungsverarbeitung:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler bei der Zahlungsverarbeitung',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server Error'
    });
  }
});

// @route   POST /api/payments/refund
// @desc    Process a refund
// @access  Private (Admin or user for own payment)
router.post('/refund', auth, async (req, res) => {
  try {
    const { 
      bookingSessionId, 
      userId, 
      reason = '',
      partialAmount = null 
    } = req.body;

    console.log('💸 Verarbeite Erstattung:', {
      bookingSessionId,
      userId: userId || req.user.id,
      reason,
      partialAmount
    });

    const booking = await BookingSession.findById(bookingSessionId)
      .populate('group');

    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const targetUserId = userId || req.user.id;
    const isAdmin = booking.group.members.some(m => 
      m.user.toString() === req.user.id.toString() && m.role === 'admin'
    );

    // Prüfe Berechtigung
    if (!isAdmin && targetUserId !== req.user.id) {
      return res.status(403).json({ 
        message: 'Nur Admins können Erstattungen für andere Benutzer verarbeiten' 
      });
    }

    // Verarbeite Erstattung
    booking.refundPayment(targetUserId, reason, partialAmount);
    await booking.save();

    console.log('✅ Erstattung erfolgreich verarbeitet');

    const updatedBooking = await BookingSession.findById(bookingSessionId)
      .populate('payments.user', 'name email');

    res.json({
      success: true,
      message: 'Erstattung erfolgreich verarbeitet',
      bookingSession: updatedBooking
    });

  } catch (error) {
    console.error('❌ Fehler bei Erstattung:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Fehler bei der Erstattung'
    });
  }
});

// @route   POST /api/payments/send-reminder
// @desc    Send payment reminder
// @access  Private (Admin only)
router.post('/send-reminder', auth, async (req, res) => {
  try {
    const { bookingSessionId, userId, reminderType = 'payment_due' } = req.body;

    const booking = await BookingSession.findById(bookingSessionId)
      .populate('group')
      .populate('payments.user', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    // Prüfe Admin-Berechtigung
    const isAdmin = booking.group.members.some(m => 
      m.user.toString() === req.user.id.toString() && m.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Admins können Erinnerungen senden' });
    }

    const targetUserId = userId;
    const userPayment = booking.payments.find(p => 
      p.user._id.toString() === targetUserId.toString()
    );

    if (!userPayment) {
      return res.status(404).json({ message: 'Zahlung nicht gefunden' });
    }

    if (!booking.canSendReminder(targetUserId)) {
      return res.status(400).json({ 
        message: 'Erinnerung kann noch nicht gesendet werden (zu früh nach letzter Erinnerung)' 
      });
    }

    // Sende Erinnerung
    booking.sendPaymentReminder(targetUserId, reminderType);
    await booking.save();

    // Hier würdest du in einer echten App die E-Mail/SMS senden
    console.log('📧 Zahlungserinnerung gesendet an:', userPayment.user.email);

    res.json({
      success: true,
      message: 'Zahlungserinnerung erfolgreich gesendet',
      sentTo: userPayment.user.email
    });

  } catch (error) {
    console.error('❌ Fehler beim Senden der Erinnerung:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Senden der Erinnerung'
    });
  }
});

// @route   POST /api/payments/send-bulk-reminders
// @desc    Send reminders to all pending payments
// @access  Private (Admin only)
router.post('/send-bulk-reminders', auth, async (req, res) => {
  try {
    const { bookingSessionId, reminderType = 'payment_due' } = req.body;

    const booking = await BookingSession.findById(bookingSessionId)
      .populate('group')
      .populate('payments.user', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const isAdmin = booking.group.members.some(m => 
      m.user.toString() === req.user.id.toString() && m.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Admins können Massen-Erinnerungen senden' });
    }

    const pendingPayments = booking.payments.filter(p => 
      p.status === 'pending' && booking.canSendReminder(p.user._id)
    );

    let sentCount = 0;
    const sentTo = [];

    for (const payment of pendingPayments) {
      try {
        booking.sendPaymentReminder(payment.user._id, reminderType);
        sentCount++;
        sentTo.push(payment.user.email);
        console.log('📧 Erinnerung gesendet an:', payment.user.email);
      } catch (err) {
        console.error('❌ Fehler beim Senden an:', payment.user.email, err.message);
      }
    }

    await booking.save();

    res.json({
      success: true,
      message: `${sentCount} Zahlungserinnerungen gesendet`,
      sentCount,
      totalPending: pendingPayments.length,
      sentTo
    });

  } catch (error) {
    console.error('❌ Fehler bei Massen-Erinnerungen:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Senden der Massen-Erinnerungen'
    });
  }
});

// @route   GET /api/payments/stats/:bookingSessionId
// @desc    Get payment statistics for a booking session
// @access  Private (Group members)
router.get('/stats/:bookingSessionId', auth, async (req, res) => {
  try {
    const { bookingSessionId } = req.params;

    const booking = await BookingSession.findById(bookingSessionId)
      .populate('group')
      .populate('payments.user', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const isMember = booking.group.members.some(m => 
      m.user.toString() === req.user.id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Nicht berechtigt' });
    }

    // Berechne detaillierte Statistiken
    const stats = {
      overview: {
        totalParticipants: booking.payments.length,
        paidParticipants: booking.paidParticipants,
        paymentProgress: booking.paymentProgress,
        totalAmount: booking.finalDetails.totalPrice,
        collectedAmount: booking.totalCollected,
        pendingAmount: booking.paymentStats.totalPending,
        refundedAmount: booking.paymentStats.totalRefunded
      },
      timing: {
        paymentDeadline: booking.paymentSettings.paymentDeadline,
        daysUntilDeadline: booking.daysUntilPaymentDeadline,
        isOverdue: booking.isPaymentOverdue,
        avgPaymentTime: booking.paymentStats.avgPaymentTime,
        lastReminderSent: booking.paymentStats.lastReminderSent
      },
      breakdown: {
        paid: booking.payments.filter(p => p.status === 'paid').length,
        pending: booking.payments.filter(p => p.status === 'pending').length,
        reserved: booking.payments.filter(p => p.status === 'reserved').length,
        failed: booking.payments.filter(p => p.status === 'failed').length,
        refunded: booking.payments.filter(p => p.status === 'refunded').length
      },
      paymentMethods: booking.payments.reduce((acc, payment) => {
        if (payment.status === 'paid') {
          acc[payment.paymentMethod] = (acc[payment.paymentMethod] || 0) + 1;
        }
        return acc;
      }, {}),
      readyToBook: booking.isReadyToBook
    };

    res.json({
      success: true,
      stats,
      bookingSessionId
    });

  } catch (error) {
    console.error('❌ Fehler beim Laden der Zahlungsstatistiken:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
});

// @route   GET /api/payments/overdue
// @desc    Get all overdue payments (Admin only)
// @access  Private (Admin only)
router.get('/overdue', adminAuth, async (req, res) => {
  try {
    const overdueBookings = await BookingSession.findOverduePayments()
      .populate('group', 'name')
      .populate('payments.user', 'name email');

    const overduePayments = [];

    overdueBookings.forEach(booking => {
      booking.payments.forEach(payment => {
        if (payment.status === 'pending') {
          overduePayments.push({
            bookingSessionId: booking._id,
            groupName: booking.group.name,
            user: payment.user,
            amount: payment.amount,
            daysOverdue: Math.ceil((new Date() - booking.paymentSettings.paymentDeadline) / (1000 * 60 * 60 * 24)),
            paymentDeadline: booking.paymentSettings.paymentDeadline,
            remindersSent: payment.remindersSent.length
          });
        }
      });
    });

    res.json({
      success: true,
      overduePayments,
      totalOverdue: overduePayments.length,
      totalAmount: overduePayments.reduce((sum, p) => sum + p.amount, 0)
    });

  } catch (error) {
    console.error('❌ Fehler beim Laden überfälliger Zahlungen:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Laden überfälliger Zahlungen'
    });
  }
});

// @route   POST /api/payments/update-settings
// @desc    Update payment settings for a booking session
// @access  Private (Admin only)
router.post('/update-settings', auth, async (req, res) => {
  try {
    const { 
      bookingSessionId,
      paymentDeadline,
      earlyBirdDeadline,
      earlyBirdDiscount,
      lateFee,
      allowPartialPayments,
      minimumDeposit
    } = req.body;

    const booking = await BookingSession.findById(bookingSessionId)
      .populate('group');

    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const isAdmin = booking.group.members.some(m => 
      m.user.toString() === req.user.id.toString() && m.role === 'admin'
    );

    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Admins können Zahlungseinstellungen ändern' });
    }

    // Update settings
    if (paymentDeadline) booking.paymentSettings.paymentDeadline = new Date(paymentDeadline);
    if (earlyBirdDeadline) booking.paymentSettings.earlyBirdDeadline = new Date(earlyBirdDeadline);
    if (earlyBirdDiscount !== undefined) booking.paymentSettings.earlyBirdDiscount = earlyBirdDiscount;
    if (lateFee !== undefined) booking.paymentSettings.lateFee = lateFee;
    if (allowPartialPayments !== undefined) booking.paymentSettings.allowPartialPayments = allowPartialPayments;
    if (minimumDeposit !== undefined) booking.paymentSettings.minimumDeposit = minimumDeposit;

    await booking.save();

    res.json({
      success: true,
      message: 'Zahlungseinstellungen erfolgreich aktualisiert',
      paymentSettings: booking.paymentSettings
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Zahlungseinstellungen:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler beim Aktualisieren der Einstellungen'
    });
  }
});

// ===== MOCK PAYMENT FUNCTIONS =====

async function mockStripePayment(amount, paymentDetails) {
  // Simuliere Stripe Payment
  console.log('💳 Mock Stripe Payment:', amount, 'EUR');
  
  // Simuliere Verarbeitungszeit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 95% Erfolgsrate für Demo
  const success = Math.random() > 0.05;
  
  if (success) {
    return {
      success: true,
      transactionId: `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentIntentId: `pi_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return {
      success: false,
      error: 'Karte wurde abgelehnt'
    };
  }
}

async function mockPayPalPayment(amount, paymentDetails) {
  // Simuliere PayPal Payment
  console.log('🅿️ Mock PayPal Payment:', amount, 'EUR');
  
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const success = Math.random() > 0.03; // 97% Erfolgsrate
  
  if (success) {
    return {
      success: true,
      transactionId: `paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return {
      success: false,
      error: 'PayPal-Zahlung fehlgeschlagen'
    };
  }
}

async function mockBankTransfer(amount, paymentDetails) {
  // Simuliere Banküberweisung (immer erfolgreich, da manuell bestätigt)
  console.log('🏦 Mock Bank Transfer:', amount, 'EUR');
  
  return {
    success: true,
    transactionId: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    reference: paymentDetails.reference || `REF-${Date.now()}`
  };
}

async function mockSepaPayment(amount, paymentDetails) {
  // Simuliere SEPA-Lastschrift
  console.log('🇪🇺 Mock SEPA Payment:', amount, 'EUR');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const success = Math.random() > 0.02; // 98% Erfolgsrate
  
  if (success) {
    return {
      success: true,
      transactionId: `sepa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  } else {
    return {
      success: false,
      error: 'SEPA-Lastschrift fehlgeschlagen - unzureichende Deckung'
    };
  }
}

module.exports = router;