const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// In-Memory Benutzerspeicher
const users = [
  {
    id: 1,
    email: 'admin@tui.com',
    password: 'admin123',
    isSystemAdmin: true
  },
  {
    id: 2,
    email: 'demo@tui.com',
    password: 'demo123',
    isSystemAdmin: false
  }
];

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Ungültige Anmeldedaten' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, isSystemAdmin: user.isSystemAdmin },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  const { password: _pw, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

// Registrierung
router.post('/register', (req, res) => {
  const { email, password, isSystemAdmin } = req.body;

  if (users.some(u => u.email === email)) {
    return res.status(400).json({ message: 'Diese E-Mail-Adresse ist bereits registriert' });
  }

  const newUser = {
    id: users.length + 1,
    email,
    password,
    isSystemAdmin: isSystemAdmin || false
  };

  users.push(newUser);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, isSystemAdmin: newUser.isSystemAdmin },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ token, user: userWithoutPassword });
});

module.exports = router