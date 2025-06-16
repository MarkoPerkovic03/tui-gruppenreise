// backend/routes/auth.js - REPARIERTE VERSION
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { auth } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, isSystemAdmin } = req.body;

    // Validierung
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'E-Mail und Passwort sind erforderlich' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Passwort muss mindestens 6 Zeichen haben' 
      });
    }

    // Prüfen ob E-Mail bereits existiert
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Diese E-Mail-Adresse ist bereits registriert' 
      });
    }

    // Neuen Benutzer erstellen
    const user = new User({
      email,
      password,
      name: firstName || email.split('@')[0],
      role: isSystemAdmin ? 'admin' : 'user',
      profile: {
        firstName: firstName || '',
        lastName: lastName || '',
        profileImage: `https://source.unsplash.com/random?avatar,${Date.now()}`,
        travelPreferences: {
          budgetRange: { min: 0, max: 5000 },
          preferredDuration: { min: 1, max: 30 },
          favoriteDestinations: [],
          travelStyle: [],
          accommodationType: [],
          activities: [],
          transportation: []
        },
        notifications: {
          email: true,
          sms: false,
          newOffers: true,
          groupUpdates: true,
          reminders: true
        }
      }
    });

    await user.save();

    // JWT Token generieren
    const token = jwt.sign(
      { 
        id: user._id.toString(), // ← WICHTIG: Als String für MongoDB ObjectId
        email: user.email,
        isSystemAdmin: user.role === 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`✅ Neuer Benutzer registriert: ${user.email}`);

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isSystemAdmin: user.role === 'admin',
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Registrierung Fehler:', error);
    res.status(500).json({ 
      message: 'Server-Fehler bei der Registrierung' 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔍 Login-Versuch für:', email);

    // Validierung
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'E-Mail und Passwort sind erforderlich' 
      });
    }

    // Benutzer finden
    const user = await User.findByEmail(email);
    if (!user) {
      console.log('❌ Benutzer nicht gefunden:', email);
      return res.status(401).json({ 
        message: 'Ungültige Anmeldedaten' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account ist deaktiviert' 
      });
    }

    // Passwort prüfen
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Falsches Passwort für:', email);
      return res.status(401).json({ 
        message: 'Ungültige Anmeldedaten' 
      });
    }

    // Last Login aktualisieren
    await user.updateLastLogin();

    // JWT Token generieren
    const token = jwt.sign(
      { 
        id: user._id.toString(), // ← WICHTIG: Als String für MongoDB ObjectId
        email: user.email,
        isSystemAdmin: user.role === 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log(`✅ Benutzer angemeldet: ${user.email}`);

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isSystemAdmin: user.role === 'admin',
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Login Fehler:', error);
    res.status(500).json({ 
      message: 'Server-Fehler bei der Anmeldung' 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get Me Fehler:', error);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// TEST-ROUTE für Debugging
router.get('/test', (req, res) => {
  console.log('✅ Test-Route erreicht');
  res.json({ 
    message: 'Auth-Route funktioniert!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;