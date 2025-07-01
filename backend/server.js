// backend/server.js - ERWEITERT mit Booking Routes (nur die Ergänzung)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const app = express();

// Verbindung zur Datenbank herstellen
connectDB();

// ===== MODELS EXPLIZIT LADEN =====
console.log('📦 Loading models...');
require('./models/user');
require('./models/Group');
require('./models/Destination');
require('./models/TravelOffer');
require('./models/Proposal');
require('./models/Vote');
require('./models/Notification');
require('./models/BookingSession'); // ← WICHTIG!
console.log('✅ All models loaded');
// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite Dev Server
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routen
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/auth')); // ← Für /users Endpunkt (verwendet auth.js)
app.use('/api/profile', require('./routes/profile'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/destinations', require('./routes/destinations'));
app.use('/api/travel-offers', require('./routes/travelOffers'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/payments', require('./routes/payments'));

// ===== NEU: BOOKING ROUTES =====
try {
  console.log('🔍 Loading booking routes...');
  const bookingRoutes = require('./routes/bookings');
  app.use('/api/bookings', bookingRoutes);
  console.log('✅ Booking routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load booking routes:', error);
  console.log('💡 Make sure ./routes/bookings.js exists');
}

// Invite Routes
try {
  console.log('🔍 Loading invite routes...');
  const inviteRoutes = require('./routes/invites');
  app.use('/api/invites', inviteRoutes);
  console.log('✅ Invite routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load invite routes:', error);
}

// Admin Routes (falls vorhanden)
if (require('fs').existsSync('./routes/admin.js')) {
  app.use('/api/admin', require('./routes/admin'));
}

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
  console.log(`👥 Users API verfügbar unter http://localhost:${PORT}/api/users`);
  console.log(`🏠 Groups API verfügbar unter http://localhost:${PORT}/api/groups`);
  console.log(`✈️ Proposals API verfügbar unter http://localhost:${PORT}/api/proposals`);
  console.log(`🔗 Invites API verfügbar unter http://localhost:${PORT}/api/invites`);
  console.log(`💳 Bookings API verfügbar unter http://localhost:${PORT}/api/bookings`); // ← NEU
});