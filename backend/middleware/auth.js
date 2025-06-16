// backend/middleware/auth.js - ERWEITERTE VERSION
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Importiere User Model

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Kein Token vorhanden, Zugriff verweigert' 
      });
    }
    
    // Token verifizieren
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    // ===== NEU: Benutzer aus Datenbank laden =====
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Token ungültig - Benutzer nicht gefunden' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account deaktiviert' 
      });
    }

    // ===== Kompatibilität mit deinem bestehenden System =====
    req.userId = decoded.id; // Behalten für Rückwärtskompatibilität
    
    // ===== ERWEITERT: Mehr Benutzer-Info =====
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isSystemAdmin: user.role === 'admin', // Kompatibilität
      profile: user.profile
    };

    next();
  } catch (error) {
    console.error('Auth Middleware Fehler:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token ungültig' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token abgelaufen' });
    }

    res.status(401).json({ message: 'Bitte authentifizieren' });
  }
};

// ===== NEU: Admin-Middleware =====
const adminAuth = async (req, res, next) => {
  try {
    // Erst normale Auth-Prüfung
    await auth(req, res, () => {
      // Dann Admin-Prüfung
      if (!req.user.isSystemAdmin && req.user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Zugriff verweigert - Admin-Rechte erforderlich' 
        });
      }
      next();
    });
  } catch (error) {
    console.error('Admin Auth Middleware Fehler:', error);
    res.status(500).json({ message: 'Server-Fehler bei Admin-Authentifizierung' });
  }
};

// ===== Exportiere beide Versionen =====
module.exports = auth; // Standard Export (kompatibel mit deinem Code)
module.exports.auth = auth; // Named Export
module.exports.adminAuth = adminAuth; // Admin-Version