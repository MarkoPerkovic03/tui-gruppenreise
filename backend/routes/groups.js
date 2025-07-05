const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth');
const Proposal = require('../models/Proposal');
const TravelOffer = require('../models/TravelOffer');
const Destination = require('../models/Destination');

// Alle Gruppen des Users abrufen
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔍 Lade Gruppen für User:', req.user.id);
    
    const query = { 'members.user': req.user.id };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const groups = await Group.find(query)
      .populate('creator', 'name email')
      .populate('members.user', 'name email')
      .populate({
        path: 'winningProposal',
        select: 'destination hotelName pricePerPerson departureDate returnDate',
        populate: { path: 'destination', select: 'name country' }
      });
    
    console.log('✅ Gefundene Gruppen:', groups.length);
    res.json(groups);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Gruppen:', error);
    res.status(500).json({ message: error.message });
  }
});

// Gruppe erstellen
router.post('/', auth, async (req, res) => {
  try {
    console.log('🆕 Erstelle neue Gruppe für User:', req.user.id);
    
    const group = new Group({
      name: req.body.name,
      description: req.body.description,
      maxParticipants: req.body.maxParticipants,
      travelDateFrom: req.body.travelDateFrom,
      travelDateTo: req.body.travelDateTo,
      budgetMin: req.body.budgetMin,
      budgetMax: req.body.budgetMax,
      preferences: req.body.preferences,
      creator: req.user.id,
      members: [{ user: req.user.id, role: 'admin' }],
      status: 'planning'
    });
    
    const savedGroup = await group.save();
    
    const populatedGroup = await Group.findById(savedGroup._id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
    console.log('✅ Gruppe erstellt:', populatedGroup._id);
    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Gruppe:', error);
    res.status(500).json({ message: error.message });
  }
});

// Einzelne Gruppe abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    console.log('🔍 Lade Gruppe:', req.params.id, 'für User:', req.user.id);
    
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ Ungültige Gruppen-ID:', req.params.id);
      return res.status(400).json({ message: 'Ungültige Gruppen-ID Format' });
    }
    
    const group = await Group.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email')
      .populate({
        path: 'winningProposal',
        select: 'destination hotelName pricePerPerson departureDate returnDate',
        populate: { path: 'destination', select: 'name country' }
      });
    
    if (!group) {
      console.log('❌ Gruppe nicht gefunden:', req.params.id);
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const isMember = group.members.some(member => 
      member.user._id.toString() === req.user.id.toString()
    );
    
    if (!isMember) {
      console.log('❌ User ist kein Mitglied der Gruppe:', req.user.id);
      return res.status(403).json({ message: 'Zugriff verweigert - Sie sind kein Mitglied dieser Gruppe' });
    }
    
    console.log('✅ Gruppe geladen:', group._id);
    res.json(group);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Gruppe:', error);
    res.status(500).json({ message: error.message });
  }
});

// Gruppe aktualisieren (nur für Admins der Gruppe)
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('📝 Aktualisiere Gruppe:', req.params.id);
    
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können Änderungen vornehmen' });
    }
    
    const allowedUpdates = ['name', 'description', 'maxParticipants', 'travelDateFrom', 'travelDateTo', 'budgetMin', 'budgetMax', 'preferences'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        group[field] = req.body[field];
      }
    });
    
    await group.save();
    
    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
    console.log('✅ Gruppe aktualisiert:', updatedGroup._id);
    res.json(updatedGroup);
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Gruppe:', error);
    res.status(500).json({ message: error.message });
  }
});

// NEU: Gruppe löschen (nur für Admins)
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ Lösche Gruppe:', req.params.id, 'User:', req.user.id);
    
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe ob User Admin der Gruppe ist
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können die Gruppe löschen' });
    }
    
    // Lösche alle abhängigen Daten
    const Proposal = require('../models/Proposal');
    const Vote = require('../models/Vote');
    
    // Finde alle Proposals der Gruppe
    const proposals = await Proposal.find({ group: req.params.id });
    
    // Lösche alle Votes zu diesen Proposals
    for (const proposal of proposals) {
      await Vote.deleteMany({ proposal: proposal._id });
    }
    
    // Lösche alle Proposals
    await Proposal.deleteMany({ group: req.params.id });
    
    // Lösche die Gruppe
    await Group.findByIdAndDelete(req.params.id);
    
    console.log('✅ Gruppe und abhängige Daten gelöscht:', req.params.id);
    res.json({ message: 'Gruppe wurde erfolgreich gelöscht' });
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Gruppe:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mitglied zur Gruppe hinzufügen
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userEmail } = req.body;
    console.log('👥 Füge Mitglied hinzu:', userEmail, 'zu Gruppe:', req.params.id);
    
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const currentUserMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!currentUserMember || currentUserMember.role !== 'admin') {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können Mitglieder hinzufügen' });
    }
    
    const User = require('../models/user');
    const newUser = await User.findOne({ email: userEmail });
    if (!newUser) {
      return res.status(404).json({ message: 'Benutzer mit dieser E-Mail nicht gefunden' });
    }
    
    const isAlreadyMember = group.members.some(member => 
      member.user.toString() === newUser._id.toString()
    );
    
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'Benutzer ist bereits Mitglied der Gruppe' });
    }
    
    if (group.members.length >= group.maxParticipants) {
      return res.status(400).json({ message: 'Maximale Teilnehmerzahl erreicht' });
    }
    
    group.members.push({
      user: newUser._id,
      role: 'member',
      joinedAt: new Date()
    });
    
    await group.save();
    
    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
    console.log('✅ Mitglied hinzugefügt:', newUser.email);
    res.json(updatedGroup);
  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen des Mitglieds:', error);
    res.status(500).json({ message: error.message });
  }
});

// NEU: Admin-Rolle ändern (Beförderung/Degradierung)
router.put('/:id/members/:userId/role', auth, async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    const { role } = req.body;

    console.log(`🔄 Ändere Rolle für User ${userId} in Gruppe ${groupId} zu: ${role}`);

    // Validierung
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Ungültige Rolle. Erlaubt: admin, member' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }

    // Prüfe ob aktueller User Admin ist
    const currentUserMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );

    if (!currentUserMember || currentUserMember.role !== 'admin') {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können Rollen ändern' });
    }

    // Finde das zu ändernde Mitglied
    const targetMember = group.members.find(member => 
      member.user.toString() === userId.toString()
    );

    if (!targetMember) {
      return res.status(404).json({ message: 'Mitglied nicht in der Gruppe gefunden' });
    }

    // Verhindere, dass der Gruppenersteller seine Admin-Rechte verliert
    if (userId.toString() === group.creator.toString() && role === 'member') {
      return res.status(400).json({ 
        message: 'Der Gruppenersteller kann seine Admin-Rechte nicht verlieren' 
      });
    }

    // Prüfe, dass mindestens ein Admin übrig bleibt
    if (role === 'member') {
      const remainingAdmins = group.members.filter(member => 
        member.role === 'admin' && member.user.toString() !== userId.toString()
      );

      if (remainingAdmins.length === 0) {
        return res.status(400).json({ 
          message: 'Die Gruppe muss mindestens einen Admin haben' 
        });
      }
    }

    // Ändere die Rolle
    targetMember.role = role;
    await group.save();

    // Lade aktualisierte Gruppe
    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email profile.firstName profile.lastName');

    console.log(`✅ Rolle geändert: User ${userId} ist jetzt ${role}`);

    res.json({
      message: `Rolle erfolgreich zu ${role} geändert`,
      group: updatedGroup,
      changedMember: {
        userId: userId,
        newRole: role,
        name: targetMember.user?.name
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Ändern der Rolle:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reiseangebot als Vorschlag einreichen
router.post('/:id/proposals', auth, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { travelOfferId, departureDate, returnDate, description } = req.body;

    console.log('🆕 Reisevorschlag für Gruppe', groupId, 'aus TravelOffer', travelOfferId);

    if (!travelOfferId || !departureDate || !returnDate) {
      return res.status(400).json({
        message: 'travelOfferId, departureDate und returnDate sind erforderlich'
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }

    const isMember = group.members.some(m => m.user.toString() === req.user.id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Nur Gruppenmitglieder können Vorschläge erstellen' });
    }

    if (group.status !== 'planning') {
      return res.status(400).json({ message: 'Für diese Gruppe können keine Vorschläge mehr eingereicht werden' });
    }

    const travelOffer = await TravelOffer.findById(travelOfferId);
    if (!travelOffer) {
      return res.status(404).json({ message: 'Reiseangebot nicht gefunden' });
    }

    let destination = await Destination.findOne({
      name: travelOffer.destination,
      country: travelOffer.country
    });

    if (!destination) {
      destination = await Destination.create({
        name: travelOffer.destination,
        country: travelOffer.country,
        city: travelOffer.city || '',
        description: travelOffer.description || '',
        images: travelOffer.images?.map(img => img.url || img) || [],
        avgPricePerPerson: travelOffer.pricePerPerson,
        tags: travelOffer.tags || []
      });
    }

    let mealPlan = 'breakfast';
    if (travelOffer.amenities) {
      if (travelOffer.amenities.includes('All-Inclusive')) {
        mealPlan = 'all_inclusive';
      } else if (travelOffer.amenities.includes('Vollpension')) {
        mealPlan = 'full_board';
      } else if (travelOffer.amenities.includes('Halbpension')) {
        mealPlan = 'half_board';
      } else if (travelOffer.amenities.includes('Nur Frühstück')) {
        mealPlan = 'breakfast';
      }
    }

    const proposal = new Proposal({
      group: groupId,
      destination: destination._id,
      proposedBy: req.user.id,
      originalTravelOffer: travelOfferId,
      hotelName: travelOffer.title,
      hotelUrl: travelOffer.hotelUrl || '',
      pricePerPerson: travelOffer.pricePerPerson,
      totalPrice: travelOffer.pricePerPerson * group.maxParticipants,
      mealPlan,
      departureDate: new Date(departureDate),
      returnDate: new Date(returnDate),
      description: description || `${travelOffer.title} - ${travelOffer.destination}`,
      includesFlight: true,
      includesTransfer: true,
      voteDistribution: { 1: 0, 2: 0, 3: 0 },
      voteCount: 0,
      weightedScore: 0
    });

    const saved = await proposal.save();

    const populated = await Proposal.findById(saved._id)
      .populate('destination', 'name country city')
      .populate('proposedBy', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    console.error('❌ Fehler beim Einreichen des Reisevorschlags:', error);
    res.status(500).json({ message: 'Server-Fehler beim Einreichen des Vorschlags' });
  }
});

// NEU: Mitglied aus Gruppe entfernen (nur für Admins)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;
    console.log('👥 Entferne Mitglied:', userId, 'aus Gruppe:', groupId, 'von Admin:', req.user.id);
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe ob aktueller User Admin ist
    const currentUserMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!currentUserMember || currentUserMember.role !== 'admin') {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können Mitglieder entfernen' });
    }
    
    // Finde das zu entfernende Mitglied
    const memberToRemoveIndex = group.members.findIndex(member => 
      member.user.toString() === userId.toString()
    );
    
    if (memberToRemoveIndex === -1) {
      return res.status(404).json({ message: 'Mitglied nicht in der Gruppe gefunden' });
    }
    
    const memberToRemove = group.members[memberToRemoveIndex];
    
    // Verhindere, dass sich Admin selbst entfernt
    if (userId.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: 'Sie können sich nicht selbst aus der Gruppe entfernen' });
    }
    
    // Verhindere, dass der Gruppenerstellet entfernt wird
    if (userId.toString() === group.creator.toString()) {
      return res.status(400).json({ message: 'Der Gruppenersteller kann nicht entfernt werden' });
    }
    
    // Entferne das Mitglied
    group.members.splice(memberToRemoveIndex, 1);
    await group.save();
    
    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
    console.log('✅ Mitglied entfernt:', userId);
    res.json({
      message: 'Mitglied wurde aus der Gruppe entfernt',
      group: updatedGroup
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Entfernen des Mitglieds:', error);
    res.status(500).json({ message: error.message });
  }
});

// Gruppe verlassen
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    console.log('🚪 User verlässt Gruppe:', req.params.id);
    
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'Sie sind kein Mitglied dieser Gruppe' });
    }
    
    if (group.creator.toString() === req.user.id.toString()) {
      return res.status(400).json({ 
        message: 'Als Ersteller können Sie die Gruppe nicht verlassen. Übertragen Sie zuerst die Admin-Rechte oder löschen Sie die Gruppe.' 
      });
    }
    
    group.members.splice(memberIndex, 1);
    await group.save();
    
    console.log('✅ User hat Gruppe verlassen');
    res.json({ message: 'Sie haben die Gruppe verlassen' });
  } catch (error) {
    console.error('❌ Fehler beim Verlassen der Gruppe:', error);
    res.status(500).json({ message: error.message });
  }
});

// Test-Route
router.get('/test/ping', (req, res) => {
  console.log('🏓 Groups test route aufgerufen');
  res.json({ 
    message: 'Groups Route funktioniert!', 
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;