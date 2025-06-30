// backend/routes/bookings.js
const express = require('express');
const router = express.Router();
const BookingSession = require('../models/BookingSession');
const Group = require('../models/Group');
const Proposal = require('../models/Proposal');
const TravelOffer = require('../models/TravelOffer');
const auth = require('../middleware/auth');

// @route   POST /api/bookings/initialize/:groupId
// @desc    Initialize booking process for a decided group
// @access  Private (Admin only)
router.post('/initialize/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    console.log('🎯 Initialisiere Buchung für Gruppe:', groupId, 'User:', req.user.email);
    
    // Check if user is admin of the group
    const group = await Group.findById(groupId).populate('members.user');
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const isAdmin = group.members.some(member => 
      member.user._id.toString() === req.user.id && member.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können die Buchung starten' });
    }
    
    // Check if group is in correct status
    if (group.status !== 'decided') {
      return res.status(400).json({ 
        message: `Gruppe muss im Status "decided" sein. Aktueller Status: ${group.status}` 
      });
    }
    
    // Check if booking session already exists
    const existingBooking = await BookingSession.findOne({ group: groupId });
    if (existingBooking) {
      return res.status(400).json({ 
        message: 'Buchungsprozess wurde bereits gestartet',
        bookingSession: existingBooking
      });
    }
    
    // Initialize booking session
    const bookingSession = await BookingSession.initializeFromGroup(groupId);
    
    // Load full booking session with populated data
    const populatedBooking = await BookingSession.findById(bookingSession._id)
      .populate('group', 'name members')
      .populate('winningProposal', 'destination hotelName pricePerPerson')
      .populate('payments.user', 'name email profile.firstName profile.lastName');
    
    console.log('✅ Buchung initialisiert:', bookingSession._id);
    
    res.status(201).json({
      message: 'Buchungsprozess erfolgreich gestartet',
      bookingSession: populatedBooking
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Initialisieren der Buchung:', error);
    res.status(500).json({ 
      message: error.message || 'Fehler beim Starten des Buchungsprozesses' 
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
    const bookingSession = await BookingSession.findOne({ group: groupId })
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
    
    res.json({
      bookingSession,
      userPaymentStatus: bookingSession.getUserPaymentStatus(req.user.id)
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Buchungssession:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Buchungsdaten' });
  }
});

// @route   POST /api/bookings/:bookingId/reserve
// @desc    Reserve spot in booking (payment intent)
// @access  Private
router.post('/:bookingId/reserve', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { notes } = req.body;
    
    console.log('🔒 Reserviere Platz in Buchung:', bookingId, 'User:', req.user.email);
    
    const bookingSession = await BookingSession.findById(bookingId);
    if (!bookingSession) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }
    
    // Check if user is in the booking
    const userPayment = bookingSession.payments.find(p => 
      p.user.toString() === req.user.id
    );
    
    if (!userPayment) {
      return res.status(403).json({ message: 'Sie sind nicht Teil dieser Buchung' });
    }
    
    if (userPayment.status === 'paid') {
      return res.status(400).json({ message: 'Sie haben bereits bezahlt' });
    }
    
    if (userPayment.status === 'reserved') {
      return res.status(400).json({ message: 'Platz bereits reserviert' });
    }
    
    // Reserve spot
    bookingSession.reserveSpot(req.user.id, notes || '');
    await bookingSession.save();
    
    console.log('✅ Platz reserviert für:', req.user.email);
    
    res.json({
      message: 'Platz erfolgreich reserviert',
      paymentStatus: bookingSession.getUserPaymentStatus(req.user.id),
      bookingProgress: {
        paidParticipants: bookingSession.paidParticipants,
        totalParticipants: bookingSession.payments.length,
        paymentProgress: bookingSession.paymentProgress,
        isReadyToBook: bookingSession.isReadyToBook
      }
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Reservieren des Platzes:', error);
    res.status(500).json({ message: error.message || 'Fehler beim Reservieren' });
  }
});

// @route   POST /api/bookings/:bookingId/pay
// @desc    Mark payment as completed
// @access  Private (User or Admin)
router.post('/:bookingId/pay', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId, paymentMethod = 'bank_transfer', notes = '' } = req.body;
    
    const targetUserId = userId || req.user.id; // Admin can mark others as paid
    
    console.log('💳 Markiere Zahlung als bezahlt:', { bookingId, targetUserId, paymentMethod });
    
    const bookingSession = await BookingSession.findById(bookingId);
    if (!bookingSession) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }
    
    // Check permissions
    const userPayment = bookingSession.payments.find(p => 
      p.user.toString() === targetUserId
    );
    
    if (!userPayment) {
      return res.status(403).json({ message: 'Benutzer nicht Teil dieser Buchung' });
    }
    
    // Check if user can mark this payment (self or admin)
    const isOwnPayment = targetUserId === req.user.id;
    const isAdmin = await checkGroupAdmin(bookingSession.group, req.user.id);
    
    if (!isOwnPayment && !isAdmin) {
      return res.status(403).json({ 
        message: 'Sie können nur Ihre eigene Zahlung oder als Admin andere Zahlungen markieren' 
      });
    }
    
    // Mark as paid
    bookingSession.markPaymentAsPaid(targetUserId, paymentMethod, notes);
    await bookingSession.save();
    
    // Populate for response
    const updatedBooking = await BookingSession.findById(bookingId)
      .populate('payments.user', 'name email profile.firstName profile.lastName');
    
    console.log('✅ Zahlung markiert als bezahlt. Status:', updatedBooking.status);
    
    res.json({
      message: 'Zahlung erfolgreich verzeichnet',
      paymentStatus: updatedBooking.getUserPaymentStatus(targetUserId),
      bookingProgress: {
        paidParticipants: updatedBooking.paidParticipants,
        totalParticipants: updatedBooking.payments.length,
        paymentProgress: updatedBooking.paymentProgress,
        isReadyToBook: updatedBooking.isReadyToBook,
        status: updatedBooking.status
      }
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Markieren der Zahlung:', error);
    res.status(500).json({ message: error.message || 'Fehler beim Verarbeiten der Zahlung' });
  }
});

// @route   POST /api/bookings/:bookingId/cancel-participation
// @desc    Cancel user participation in booking
// @access  Private
router.post('/:bookingId/cancel-participation', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body;
    
    const targetUserId = userId || req.user.id;
    
    console.log('❌ Storniere Teilnahme:', { bookingId, targetUserId });
    
    const bookingSession = await BookingSession.findById(bookingId);
    if (!bookingSession) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }
    
    // Check permissions
    const isOwnCancellation = targetUserId === req.user.id;
    const isAdmin = await checkGroupAdmin(bookingSession.group, req.user.id);
    
    if (!isOwnCancellation && !isAdmin) {
      return res.status(403).json({ message: 'Unzureichende Berechtigung' });
    }
    
    // Cancel participation
    bookingSession.cancelParticipation(targetUserId);
    await bookingSession.save();
    
    console.log('✅ Teilnahme storniert. Neuer Status:', bookingSession.status);
    
    res.json({
      message: 'Teilnahme erfolgreich storniert',
      bookingStatus: bookingSession.status,
      remainingParticipants: bookingSession.payments.length
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Stornieren der Teilnahme:', error);
    res.status(500).json({ message: error.message || 'Fehler beim Stornieren' });
  }
});

// @route   POST /api/bookings/:bookingId/finalize
// @desc    Finalize booking (complete the booking process)
// @access  Private (Admin only)
router.post('/:bookingId/finalize', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { confirmationData, notes } = req.body;
    
    console.log('🎯 Finalisiere Buchung:', bookingId, 'Admin:', req.user.email);
    
    const bookingSession = await BookingSession.findById(bookingId);
    if (!bookingSession) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }
    
    // Check admin permission
    const isAdmin = await checkGroupAdmin(bookingSession.group, req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können die Buchung finalisieren' });
    }
    
    if (!bookingSession.isReadyToBook) {
      return res.status(400).json({ 
        message: 'Nicht alle Zahlungen sind abgeschlossen',
        missingPayments: bookingSession.payments.filter(p => p.status === 'pending').length
      });
    }
    
    // Get travel offer snapshot for booking record
    const proposal = await Proposal.findById(bookingSession.winningProposal)
      .populate('originalTravelOffer');
    
    const travelOfferSnapshot = proposal?.originalTravelOffer || {};
    
    // Finalize booking
    await bookingSession.finalizeBooking(req.user.id, {
      confirmationData: confirmationData || notes || '',
      travelOfferSnapshot
    });
    
    const finalBooking = await BookingSession.findById(bookingId)
      .populate('payments.user', 'name email')
      .populate('finalBooking.bookedBy', 'name email');
    
    console.log('✅ Buchung finalisiert:', finalBooking.finalBooking.bookingReference);
    
    res.json({
      message: 'Buchung erfolgreich abgeschlossen!',
      bookingSession: finalBooking,
      bookingReference: finalBooking.finalBooking.bookingReference
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Finalisieren der Buchung:', error);
    res.status(500).json({ message: error.message || 'Fehler beim Abschließen der Buchung' });
  }
});

// @route   POST /api/bookings/:bookingId/send-reminders
// @desc    Send payment reminders to pending users
// @access  Private (Admin only)
router.post('/:bookingId/send-reminders', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    console.log('📧 Sende Zahlungserinnerungen für Buchung:', bookingId);
    
    const bookingSession = await BookingSession.findById(bookingId);
    if (!bookingSession) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }
    
    // Check admin permission
    const isAdmin = await checkGroupAdmin(bookingSession.group, req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können Erinnerungen senden' });
    }
    
    const reminderUsers = await bookingSession.sendPaymentReminders();
    
    res.json({
      message: `Erinnerungen an ${reminderUsers.length} Benutzer gesendet`,
      remindersSent: reminderUsers.length
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Senden der Erinnerungen:', error);
    res.status(500).json({ message: 'Fehler beim Senden der Erinnerungen' });
  }
});

// @route   GET /api/bookings/:bookingId/progress
// @desc    Get booking progress summary
// @access  Private (Group members only)
router.get('/:bookingId/progress', auth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const bookingSession = await BookingSession.findById(bookingId)
      .populate('payments.user', 'name email profile.firstName profile.lastName');
    
    if (!bookingSession) {
      return res.status(404).json({ message: 'Buchungssession nicht gefunden' });
    }
    
    // Check group membership
    const group = await Group.findById(bookingSession.group);
    const isMember = group.members.some(member => 
      member.user.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }
    
    const progress = {
      status: bookingSession.status,
      totalParticipants: bookingSession.payments.length,
      paidParticipants: bookingSession.paidParticipants,
      pendingParticipants: bookingSession.payments.filter(p => p.status === 'pending').length,
      totalCollected: bookingSession.totalCollected,
      totalRequired: bookingSession.finalDetails.totalPrice,
      paymentProgress: bookingSession.paymentProgress,
      isReadyToBook: bookingSession.isReadyToBook,
      paymentDeadline: bookingSession.paymentDeadline,
      daysUntilDeadline: Math.ceil((bookingSession.paymentDeadline - new Date()) / (1000 * 60 * 60 * 24)),
      payments: bookingSession.payments.map(payment => ({
        user: {
          id: payment.user._id,
          name: payment.user.name,
          displayName: payment.user.profile?.firstName && payment.user.profile?.lastName 
            ? `${payment.user.profile.firstName} ${payment.user.profile.lastName}`
            : payment.user.name
        },
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        paymentMethod: payment.paymentMethod
      }))
    };
    
    res.json(progress);
    
  } catch (error) {
    console.error('❌ Fehler beim Laden des Buchungsfortschritts:', error);
    res.status(500).json({ message: 'Fehler beim Laden des Fortschritts' });
  }
});

// ===== HELPER FUNCTIONS =====

async function checkGroupAdmin(groupId, userId) {
  try {
    const group = await Group.findById(groupId);
    if (!group) return false;
    
    const userMember = group.members.find(member => 
      member.user.toString() === userId.toString()
    );
    
    return userMember && userMember.role === 'admin';
  } catch (error) {
    console.error('Error checking group admin:', error);
    return false;
  }
}

module.exports = router;