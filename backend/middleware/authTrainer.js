// ============================================
// BACKEND: Trainer Authentication Middleware
// File: backend/middleware/authTrainer.js
// ============================================

const jwt = require('jsonwebtoken');
const Trainer = require('../models/Trainer');

// Middleware to authenticate trainer using JWT token
const authenticateTrainer = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Check if it's a trainer token
    if (decoded.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Trainer authorization required.'
      });
    }

    // Find trainer in database
    const trainer = await Trainer.findById(decoded.id).select('-password');

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found.'
      });
    }

    // Attach trainer info to request
    req.trainer = trainer;
    req.trainerId = trainer._id;

    next();

  } catch (error) {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
      error: error.message
    });
  }
};

module.exports = authenticateTrainer;