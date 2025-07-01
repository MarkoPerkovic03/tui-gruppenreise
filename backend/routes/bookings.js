// backend/routes/bookings.js - KOMPLETT KORRIGIERTE VERSION
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Models - mit Fehlerbehandlung laden
let BookingSession, Group, Proposal, TravelOffer;

try {
  Group = require('../models/Group');
  Proposal = require('../models/Proposal');
  TravelOffer = require('../models/TravelOffer');
  
  // BookingSession mit Force-Loading
  console.log('🔄 Loading BookingSession model...');
  
  // Erst prüfen ob schon registriert
  if (mongoose.models.BookingSession) {
    console.log('✅ BookingSession already registered');
    BookingSession = mongoose.models.BookingSession;
  } else {
    console.log('📦 Registering BookingSession model...');
    BookingSession = require('../models/BookingSession');
  }
  
  console.log('✅ BookingSession loaded:', typeof BookingSession);
  console.log('✅ findOne available:', typeof BookingSession.findOne);
  
} catch (error) {
  console.error('❌ Error loading models:', error);
}

// @route   POST /api/bookings/initialize/:groupId
// @desc    Initialize booking process for a decided group
// @access  Private (Admin only)
router.post('/initialize/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    console.log('🎯 Initialisiere Buchung für Gruppe:', groupId, 'User:', req.user.email);
    
    // ===== FORCE MODEL LOADING =====
    let BookingSessionModel;
    
    if (mongoose.models.BookingSession) {
      BookingSessionModel = mongoose.models.BookingSession;
      console.log('✅ Using existing BookingSession model');
    } else {
      console.log('🔄 Force loading BookingSession model...');
      try {
        // Clear cache and reload
        delete require.cache[require.resolve('../models/BookingSession')];
        require('../models/BookingSession');
        BookingSessionModel = mongoose.model('BookingSession');
        console.log('✅ BookingSession force loaded');
      } catch (modelError) {
        console.error('❌ Failed to load BookingSession:', modelError);
        return res.status(500).json({ 
          message: 'Server configuration error - BookingSession model not available' 
        });
      }
    }
    
    // Verify model has required methods
    if (typeof BookingSessionModel.findOne !== 'function') {
      console.error('❌ BookingSession.findOne is not a function');
      return res.status(500).json({ 
        message: 'Server configuration error - BookingSession model invalid' 
      });
    }
    
    console.log('✅ BookingSession model verified, proceeding...');
    
    // Check if user is admin of the group
    const group = await Group.findById(groupId).populate('members.user');
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    console.log('📊 Group found:', {
      name: group.name,
      status: group.status,
      winningProposal: group.winningProposal,
      membersCount: group.members?.length
    });
    
    const isAdmin = group.members.some(member => 
      member.user._id.toString() === req.user.id && member.role === 'admin'
    );
    
    console.log('👤 Admin check:', { isAdmin, userId: req.user.id });
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können die Buchung starten' });
    }
    
    // Check if group is in correct status
    if (group.status !== 'decided') {
      return res.status(400).json({ 
        message: `Gruppe muss im Status "decided" sein. Aktueller Status: ${group.status}` 
      });
    }
    
    if (!group.winningProposal) {
      return res.status(400).json({ 
        message: 'Kein Gewinner-Vorschlag gefunden. Beenden Sie zuerst die Abstimmung.' 
      });
    }
    
    // Check if booking session already exists
    console.log('🔍 Checking for existing booking session...');
    const existingBooking = await BookingSessionModel.findOne({ group: groupId });
    
    if (existingBooking) {
      console.log('⚠️ Booking session already exists:', existingBooking._id);
     
      if (group.status !== 'booking') {
        group.status = 'booking';
        await group.save();
        console.log('🔄 Group status updated to "booking" due to existing session');
      }

      return res.status(200).json({
        message: 'Buchungsprozess wurde bereits gestartet',
        bookingSession: existingBooking
      });
    }
    
    console.log('✅ No existing booking, proceeding with creation...');
    
    // Load winning proposal
    const proposal = await Proposal.findById(group.winningProposal)
      .populate('destination')
      .populate('originalTravelOffer');
    
    if (!proposal) {
      return res.status(404).json({ message: 'Gewinner-Vorschlag nicht gefunden' });
    }
    
    console.log('🏆 Winning proposal loaded:', {
      destination: proposal.destination?.name,
      pricePerPerson: proposal.pricePerPerson,
      hotelName: proposal.hotelName
    });
    
    // Create booking session manually (avoiding static method issues)
    console.log('🎯 Creating booking session manually...');
    
    const paymentDeadline = new Date();
    paymentDeadline.setDate(paymentDeadline.getDate() + 7);
    
    const payments = group.members.map(member => ({
      user: member.user._id,
      amount: proposal.pricePerPerson,
      status: 'pending'
    }));
    
    console.log('💰 Payment entries created:', payments.length);
    
    const bookingSessionData = {
      group: groupId,
      winningProposal: proposal._id,
      status: 'collecting_payments',
      finalDetails: {
        departureDate: proposal.departureDate,
        returnDate: proposal.returnDate,
        totalParticipants: group.members.length,
        pricePerPerson: proposal.pricePerPerson,
        totalPrice: proposal.pricePerPerson * group.members.length,
        destination: proposal.destination?.name || 'Unbekannt',
        hotelName: proposal.hotelName || ''
      },
      paymentDeadline,
      payments,
      settings: {
        allowLateCancellation: true,
        cancellationDeadline: new Date(proposal.departureDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        requirePaymentBeforeBooking: true,
        minParticipants: Math.ceil(group.members.length * 0.8)
      }
    };
    
    console.log('📋 Booking session data prepared:', {
      totalParticipants: bookingSessionData.finalDetails.totalParticipants,
      totalPrice: bookingSessionData.finalDetails.totalPrice,
      paymentDeadline: bookingSessionData.paymentDeadline
    });
    
    const bookingSession = new BookingSessionModel(bookingSessionData);
    await bookingSession.save();
    
    console.log('✅ Booking session created:', bookingSession._id);
    
    // Update group status
    group.status = 'booking';
    await group.save();
    
    console.log('✅ Group status updated to "booking"');
    
    // Load full booking session with populated data
    const populatedBooking = await BookingSessionModel.findById(bookingSession._id)
      .populate('group', 'name members')
      .populate('winningProposal', 'destination hotelName pricePerPerson')
      .populate('payments.user', 'name email profile.firstName profile.lastName');
    
    console.log('✅ Populated booking loaded');
    
    res.status(201).json({
      message: 'Buchungsprozess erfolgreich gestartet',
      bookingSession: populatedBooking
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Initialisieren der Buchung:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      mongooseModels: Object.keys(mongoose.models)
    });
    
    res.status(500).json({ 
      message: error.message || 'Fehler beim Starten des Buchungsprozesses',
      error: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        availableModels: Object.keys(mongoose.models)
      } : undefined
    });
  }
});

// @route   GET /api/bookings/group/:groupId
// @desc    Get booking session for a group
// @access  Private (Group members only)
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    console.log('📋 Lade Buchungssession für Gruppe:', groupId);
    
    // Force model loading
    const BookingSessionModel = mongoose.models.BookingSession || mongoose.model('BookingSession');
    
    // Check group membership
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const isMember = group.members.some(member => 
      member.user.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }
    
    // Find booking session
    const bookingSession = await BookingSessionModel.findOne({ group: groupId })
      .populate('group', 'name members maxParticipants')
      .populate({
        path: 'winningProposal',
        populate: {
          path: 'destination',
          select: 'name country city'
        }
      })
      .populate('payments.user', 'name email profile.firstName profile.lastName profile.profileImage')
      .populate('finalBooking.bookedBy', 'name email');
    
    if (!bookingSession) {
      return res.status(404).json({ message: 'Keine Buchungssession gefunden' });
    }
    
    console.log('✅ Buchungssession geladen:', bookingSession._id);
    
    // Get user payment status manually (in case virtual method doesn't work)
    const userPayment = bookingSession.payments.find(p => 
      p.user._id.toString() === req.user.id.toString()
    );
    
    res.json({
      bookingSession,
      userPaymentStatus: userPayment || null
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Buchungssession:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Buchungsdaten' });
  }
});
// @route   GET /api/bookings/session/:sessionId
// @desc    Get booking session by session ID
// @access  Private (Group members only)
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('📋 Lade Booking Session:', sessionId);
    
    // Force model loading
    const BookingSessionModel = mongoose.models.BookingSession || mongoose.model('BookingSession');
    
    // Lade die Booking Session
    const bookingSession = await BookingSessionModel.findById(sessionId)
      .populate('group', 'name members status')
      .populate({
        path: 'winningProposal',
        populate: {
          path: 'destination',
          select: 'name country city'
        }
      })
      .populate('payments.user', 'name email profile.firstName profile.lastName profile.profileImage')
      .populate('finalBooking.bookedBy', 'name email');
    
    if (!bookingSession) {
      return res.status(404).json({ 
        message: 'Buchungssession nicht gefunden' 
      });
    }
    
    // Prüfe ob User Mitglied der Gruppe ist
    const isMember = bookingSession.group.members.some(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!isMember) {
      return res.status(403).json({ 
        message: 'Nicht berechtigt, diese Buchung anzusehen' 
      });
    }
    
    console.log('✅ Buchungssession geladen:', bookingSession._id);
    
    // Finde User Payment Status
    const userPaymentStatus = bookingSession.payments.find(payment => 
      payment.user._id.toString() === req.user.id.toString()
    );
    
    res.json({
      bookingSession,
      userPaymentStatus: userPaymentStatus || null
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Booking Session:', error);
    res.status(500).json({ 
      message: 'Fehler beim Laden der Buchungsdaten',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// @route   POST /api/bookings/:sessionId/reserve
// @desc    Mark user's spot as reserved
// @access  Private (Group members)
router.post('/:sessionId/reserve', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes = '' } = req.body;

    const BookingSessionModel = mongoose.models.BookingSession || mongoose.model('BookingSession');
    const booking = await BookingSessionModel.findById(sessionId).populate('group');
    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const isMember = booking.group.members.some(m => m.user.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }

    try {
      booking.reserveSpot(req.user.id, notes);
      await booking.save();
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const populated = await BookingSessionModel.findById(sessionId)
      .populate('payments.user', 'name email profile.firstName profile.lastName');
    const userPayment = populated.payments.find(p => p.user._id.toString() === req.user.id.toString());

    res.json({ bookingSession: populated, userPaymentStatus: userPayment || null });
  } catch (error) {
    console.error('❌ Fehler beim Reservieren:', error);
    res.status(500).json({ message: 'Fehler beim Reservieren des Platzes' });
  }
});

// @route   POST /api/bookings/:sessionId/pay
// @desc    Mark a payment as paid
// @access  Private (Group members, admins can specify userId)
router.post('/:sessionId/pay', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { paymentMethod = 'bank_transfer', notes = '', userId } = req.body;

    const BookingSessionModel = mongoose.models.BookingSession || mongoose.model('BookingSession');
    const booking = await BookingSessionModel.findById(sessionId).populate('group');
    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const isAdmin = booking.group.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    const targetId = userId && isAdmin ? userId : req.user.id;
    const isMember = booking.group.members.some(m => m.user.toString() === targetId);
    if (!isMember) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }

    try {
      booking.markPaymentAsPaid(targetId, paymentMethod, notes);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    if (booking.isReadyToBook) {
      booking.status = 'ready_to_book';
    }

    await booking.save();
    await booking.group.save();

    const populated = await BookingSessionModel.findById(sessionId)
      .populate('group', 'name members maxParticipants')
      .populate('payments.user', 'name email profile.firstName profile.lastName')
      .populate('finalBooking.bookedBy', 'name email');
    const userPayment = populated.payments.find(p => p.user._id.toString() === req.user.id.toString());

    res.json({ bookingSession: populated, userPaymentStatus: userPayment || null });
  } catch (error) {
    console.error('❌ Fehler beim Markieren der Zahlung:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Zahlung' });
  }
});

// @route   POST /api/bookings/:sessionId/cancel-participation
// @desc    Cancel participation and refund payment
// @access  Private (Group members, admins can specify userId)
router.post('/:sessionId/cancel-participation', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body;

    const BookingSessionModel = mongoose.models.BookingSession || mongoose.model('BookingSession');
    const booking = await BookingSessionModel.findById(sessionId).populate('group');
    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const isAdmin = booking.group.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    const targetId = userId && isAdmin ? userId : req.user.id;
    const isMember = booking.group.members.some(m => m.user.toString() === targetId);
    if (!isMember) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }

    const payment = booking.payments.find(p => p.user.toString() === targetId);
    if (!payment) {
      return res.status(404).json({ message: 'Zahlungseintrag nicht gefunden' });
    }

    payment.status = 'refunded';
    payment.notes = 'Teilnahme storniert';

    await booking.save();

    const populated = await BookingSessionModel.findById(sessionId)
      .populate('payments.user', 'name email profile.firstName profile.lastName');

    res.json({ bookingSession: populated });
  } catch (error) {
    console.error('❌ Fehler beim Stornieren der Teilnahme:', error);
    res.status(500).json({ message: 'Fehler beim Stornieren der Teilnahme' });
  }
});

// @route   POST /api/bookings/:sessionId/finalize
// @desc    Finalize booking after all payments received
// @access  Private (Admin only)
router.post('/:sessionId/finalize', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { confirmationData = '', notes = '' } = req.body;

    const BookingSessionModel = mongoose.models.BookingSession || mongoose.model('BookingSession');
    const booking = await BookingSessionModel.findById(sessionId).populate('group');
    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const isAdmin = booking.group.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Admins können die Buchung abschließen' });
    }

    booking.status = 'booked';
    booking.finalBooking = {
      bookingReference: confirmationData,
      bookedAt: new Date(),
      bookedBy: req.user.id,
      bookingConfirmation: notes
    };

    await booking.save();
    booking.group.status = 'booked';
    await booking.group.save();

    const populated = await BookingSessionModel.findById(sessionId)
      .populate('group', 'name members')
      .populate('payments.user', 'name email profile.firstName profile.lastName')
      .populate('finalBooking.bookedBy', 'name email');

    res.json({ bookingSession: populated });
  } catch (error) {
    console.error('❌ Fehler beim Finalisieren der Buchung:', error);
    res.status(500).json({ message: 'Fehler beim Abschließen der Buchung' });
  }
});

// @route   POST /api/bookings/:sessionId/send-reminders
// @desc    Send payment reminders (mock implementation)
// @access  Private (Admin only)
router.post('/:sessionId/send-reminders', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const BookingSessionModel = mongoose.models.BookingSession || mongoose.model('BookingSession');
    const booking = await BookingSessionModel.findById(sessionId).populate('group');
    if (!booking) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }

    const isAdmin = booking.group.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Admins können Erinnerungen senden' });
    }

    console.log('📧 Payment reminders sent for booking', sessionId);
    res.json({ message: 'Erinnerungen versendet' });
  } catch (error) {
    console.error('❌ Fehler beim Senden der Erinnerungen:', error);
    res.status(500).json({ message: 'Fehler beim Senden der Erinnerungen' });
  }
});

// ===== TEST ROUTES =====

// Test route
router.get('/test', (req, res) => {
  console.log('✅ Bookings test route erreicht');
  console.log('📊 Available models:', Object.keys(mongoose.models));
  console.log('📊 BookingSession model:', !!mongoose.models.BookingSession);
  
  res.json({ 
    message: 'Bookings API funktioniert!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    availableModels: Object.keys(mongoose.models),
    bookingSessionAvailable: !!mongoose.models.BookingSession
  });
});

// Debug route für Model-Check
router.get('/debug-models', (req, res) => {
  console.log('🔍 Model debug check');
  
  const modelInfo = {
    availableModels: Object.keys(mongoose.models),
    bookingSessionExists: !!mongoose.models.BookingSession,
    bookingSessionMethods: mongoose.models.BookingSession ? 
      Object.getOwnPropertyNames(mongoose.models.BookingSession) : [],
    connectionState: mongoose.connection.readyState
  };
  
  console.log('📊 Model info:', modelInfo);
  res.json(modelInfo);
});

// Debug route für eine spezifische Gruppe
router.get('/debug/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('🔍 Debug Route für Gruppe:', groupId);
    
    const group = await Group.findById(groupId).populate('members.user');
    
    // Try to get BookingSession model
    let BookingSessionModel = null;
    let bookingSessionError = null;
    
    try {
      BookingSessionModel = mongoose.models.BookingSession || mongoose.model('BookingSession');
    } catch (error) {
      bookingSessionError = error.message;
    }
    
    let existingBooking = null;
    if (BookingSessionModel) {
      try {
        existingBooking = await BookingSessionModel.findOne({ group: groupId });
      } catch (error) {
        bookingSessionError = error.message;
      }
    }
    
    const debugInfo = {
      groupId,
      groupExists: !!group,
      groupStatus: group?.status,
      winningProposal: group?.winningProposal,
      membersCount: group?.members?.length,
      userIsAdmin: group?.members?.some(m => 
        m.user._id.toString() === req.user.id && m.role === 'admin'
      ),
      bookingSessionModelAvailable: !!BookingSessionModel,
      bookingSessionError,
      existingBooking: !!existingBooking,
      bookingStatus: existingBooking?.status,
      userId: req.user.id,
      userEmail: req.user.email,
      availableModels: Object.keys(mongoose.models),
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Debug Info:', debugInfo);
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Debug Error:', error);
    res.status(500).json({ 
      error: error.message, 
      stack: error.stack,
      availableModels: Object.keys(mongoose.models)
    });
  }
});

module.exports = router;