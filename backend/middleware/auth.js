const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }
    
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Bitte authentifizieren' });
  }
};