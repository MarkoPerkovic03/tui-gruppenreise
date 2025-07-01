const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { adminAuth } = require('../middleware/auth');

// GET /api/users - list all users
router.get('/', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('email role');
    const formatted = users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      isSystemAdmin: user.role === 'admin'
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Benutzer' });
  }
});

// PUT /api/users/:id - update admin status
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isSystemAdmin } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    user.role = isSystemAdmin ? 'admin' : 'user';
    await user.save();

    res.json({
      id: user._id.toString(),
      email: user.email,
      isSystemAdmin: user.role === 'admin'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Benutzers' });
  }
});

module.exports = router