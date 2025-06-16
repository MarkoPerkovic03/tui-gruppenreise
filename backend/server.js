require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const app = express();

// Verbindung zur Datenbank herstellen
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite Dev Server
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routen
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile')); // ← DIESE ZEILE HINZUFÜGEN!
app.use('/api/groups', require('./routes/groups'));
app.use('/api/destinations', require('./routes/destinations'));
app.use('/api/travel-offers', require('./routes/travelOffers'));

// Fehlerbehandlung
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Etwas ist schiefgelaufen!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404-Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route nicht gefunden' });
});

// Server starten
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
  console.log(`📊 API Dokumentation verfügbar unter http://localhost:${PORT}/api`);
  console.log(`👤 Profile API verfügbar unter http://localhost:${PORT}/api/profile`);
});