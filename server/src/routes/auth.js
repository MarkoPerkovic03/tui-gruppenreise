const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Temporäre Benutzerdatenbank (In der Produktion würde man eine richtige Datenbank verwenden)
const users = [
  {
    id: 1,
    email: 'demo@tui.com',
    // Passwort: "demo123"
    password: '$2a$10$XFE/UQjM6PpqXkQBj.OIy.HK.L7qW9kPkWq.suVgQVCKbGvN9ZKe2'
  }
];

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Benutzer finden
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
    }

    // Passwort überprüfen
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Ungültige E-Mail oder Passwort' });
    }

    // JWT Token generieren
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      'your-secret-key', // In der Produktion sollte dies eine sichere Umgebungsvariable sein
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Login-Fehler:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
});

module.exports = router; 