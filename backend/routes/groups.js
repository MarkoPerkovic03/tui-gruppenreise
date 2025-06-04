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
      ...req.body,
      creator: req.userId,
      members: [{ user: req.userId, role: 'admin' }]
    });
    await group.save();
    res.status(201).json(group);
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
    
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;