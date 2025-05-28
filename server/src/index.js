const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Auth-Routen
app.use('/api/auth', authRoutes);

// Middleware für geschützte Routen
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Nicht authentifiziert' });
  }

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Ungültiger Token' });
    }
    req.user = user;
    next();
  });
};

// Geschützte Routen hier...
app.get('/api/groups', authenticateToken, (req, res) => {
  // Implementierung der Gruppen-Route
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
}); 