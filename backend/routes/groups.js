const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth'); // Middleware für Authentication

// Alle Gruppen des Users abrufen
router.get('/', auth, async (req, res) => {
  try {
    console.log('🔍 Lade Gruppen für User:', req.user.id);
    
    const groups = await Group.find({ 'members.user': req.user.id })
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
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
    
    // KORRIGIERT: Moderne Mongoose populate Syntax
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
    
    // Validiere ObjectId Format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ Ungültige Gruppen-ID:', req.params.id);
      return res.status(400).json({ message: 'Ungültige Gruppen-ID Format' });
    }
    
    const group = await Group.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
    if (!group) {
      console.log('❌ Gruppe nicht gefunden:', req.params.id);
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe ob User Mitglied ist
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
    
    // Prüfe ob User Admin der Gruppe ist
    const userMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können Änderungen vornehmen' });
    }
    
    // Aktualisiere erlaubte Felder
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

// Mitglied zur Gruppe hinzufügen
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userEmail } = req.body;
    console.log('👥 Füge Mitglied hinzu:', userEmail, 'zu Gruppe:', req.params.id);
    
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe ob aktueller User Admin ist
    const currentUserMember = group.members.find(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (!currentUserMember || currentUserMember.role !== 'admin') {
      return res.status(403).json({ message: 'Nur Gruppen-Admins können Mitglieder hinzufügen' });
    }
    
    // Finde User by Email
    const User = require('../models/user');
    const newUser = await User.findOne({ email: userEmail });
    if (!newUser) {
      return res.status(404).json({ message: 'Benutzer mit dieser E-Mail nicht gefunden' });
    }
    
    // Prüfe ob bereits Mitglied
    const isAlreadyMember = group.members.some(member => 
      member.user.toString() === newUser._id.toString()
    );
    
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'Benutzer ist bereits Mitglied der Gruppe' });
    }
    
    // Prüfe maximale Teilnehmerzahl
    if (group.members.length >= group.maxParticipants) {
      return res.status(400).json({ message: 'Maximale Teilnehmerzahl erreicht' });
    }
    
    // Füge Mitglied hinzu
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

// Gruppe verlassen
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    console.log('🚪 User verlässt Gruppe:', req.params.id);
    
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    // Prüfe ob User Mitglied ist
    const memberIndex = group.members.findIndex(member => 
      member.user.toString() === req.user.id.toString()
    );
    
    if (memberIndex === -1) {
      return res.status(400).json({ message: 'Sie sind kein Mitglied dieser Gruppe' });
    }
    
    // Prüfe ob User der Creator ist
    if (group.creator.toString() === req.user.id.toString()) {
      return res.status(400).json({ 
        message: 'Als Ersteller können Sie die Gruppe nicht verlassen. Übertragen Sie zuerst die Admin-Rechte.' 
      });
    }
    
    // Entferne Mitglied
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