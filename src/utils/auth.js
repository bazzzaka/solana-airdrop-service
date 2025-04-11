const jwt = require('jsonwebtoken');
const config = require('../config');

// Middleware to authenticate API requests
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Generate token (for admin use)
function generateToken(userId, isAdmin = false) {
  return jwt.sign(
    { id: userId, admin: isAdmin },
    config.jwtSecret,
    { expiresIn: '1h' }
  );
}

module.exports = {
  authenticate,
  generateToken
};
