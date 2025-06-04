const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Registrierung
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check ob User existiert
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'E-Mail bereits registriert' });
    }
    
    // Neuen User erstellen
    const user = new User({ email, password, name });
    await user.save();
    
    // JWT Token erstellen
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    
    res.status(201).json({ token, user: { id: user._id, email, name } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // User finden
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }
    
    // Passwort prüfen
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
    }
    
    // JWT Token erstellen
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    
    res.json({ token, user: { id: user._id, email, name: user.name } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;