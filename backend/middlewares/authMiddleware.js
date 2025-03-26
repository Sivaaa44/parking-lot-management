const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Use the same JWT_SECRET as in authController
const JWT_SECRET = process.env.JWT_SECRET || 'suzuka';

module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password_hash');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};