const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth'); // Middleware für Authentication

// Alle Gruppen des Users abrufen
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.userId })
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Gruppe erstellen
router.post('/', auth, async (req, res) => {
  try {
    const group = new Group({
      name: req.body.name,
      description: req.body.description,
      maxParticipants: req.body.maxParticipants,
      travelDateFrom: req.body.travelDateFrom,
      travelDateTo: req.body.travelDateTo,
      budgetMin: req.body.budgetMin,
      budgetMax: req.body.budgetMax,
      preferences: req.body.preferences,
      creator: req.userId,
      members: [{ user: req.userId, role: 'admin' }],
      status: 'planning'
    });
    
    const savedGroup = await group.save();
    const populatedGroup = await savedGroup
      .populate('creator', 'name email')
      .populate('members.user', 'name email')
      .execPopulate();
    
    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Einzelne Gruppe abrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('members.user', 'name email');
    
    if (!group) {
      return res.status(404).json({ message: 'Gruppe nicht gefunden' });
    }
    
    const isMember = group.members.some(member => 
      member.user._id.toString() === req.userId
    );
    
    if (!isMember) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }
    
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;