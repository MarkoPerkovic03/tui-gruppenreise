// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const adminAuth = require('../middleware/adminAuth');

// GET /api/admin/users - Alle Benutzer für Admin Dashboard
router.get('/users', adminAuth, async (req, res) => {
  try {
    console.log('👑 Admin lädt alle Benutzer:', req.user?.email);
    
    const users = await User.find({ isActive: true })
      .select('email name role profile.firstName profile.lastName createdAt lastLogin')
      .sort({ createdAt: -1 });
    
    // Formatiere für Admin Dashboard
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      role: user.role,
      isSystemAdmin: user.role === 'admin',
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }));
    
    console.log(`✅ ${formattedUsers.length} Benutzer für Admin geladen`);
    res.json(formattedUsers);
  } catch (error) {
    console.error('❌ Admin Users laden Fehler:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Benutzer' });
  }
});

// PUT /api/admin/users/:userId - Benutzerrolle ändern
router.put('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isSystemAdmin } = req.body;
    
    console.log('👑 Admin ändert Benutzerrolle:', { userId, isSystemAdmin, admin: req.user?.email });
    
    // Verhindere, dass Admin sich selbst die Rechte entzieht
    if (userId === req.user.id) {
      return res.status(400).json({ 
        message: 'Sie können Ihre eigenen Admin-Rechte nicht ändern' 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    
    // Rolle aktualisieren
    user.role = isSystemAdmin ? 'admin' : 'user';
    await user.save();
    
    console.log(`✅ Benutzerrolle geändert: ${user.email} -> ${user.role}`);
    
    res.json({
      message: `Benutzer ${user.email} ist jetzt ${user.role === 'admin' ? 'Administrator' : 'Benutzer'}`,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isSystemAdmin: user.role === 'admin'
      }
    });
  } catch (error) {
    console.error('❌ Admin User Update Fehler:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Benutzers' });
  }
});

module.exports = router;