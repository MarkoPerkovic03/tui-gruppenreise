const jwt = require('jsonwebtoken');

// Middleware um zu prüfen, ob der User ein Systemadmin ist
const adminAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Zugriff verweigert. Kein Token gefunden.' });
    }
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    
    // Prüfe ob der User Systemadmin ist
    if (!decoded.isSystemAdmin) {
      return res.status(403).json({ 
        message: 'Zugriff verweigert. Nur Systemadmins können diese Aktion ausführen.' 
      });
    }
    
    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Ungültiges Token' });
  }
};

module.exports = adminAuth;