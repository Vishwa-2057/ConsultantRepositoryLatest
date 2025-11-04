const jwt = require('jsonwebtoken');
const tokenManager = require('../utils/tokenManager');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Pharmacist = require('../models/Pharmacist');
const Clinic = require('../models/Clinic');

module.exports = async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Access token required' 
      });
    }
    
    const token = tokenManager.extractTokenFromHeader(authHeader);
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token format' 
      });
    }

    // Verify token using token manager
    const payload = tokenManager.verifyAccessToken(token);
    
    // Get full user data from database
    let user = await Doctor.findById(payload.id);
    if (!user) {
      user = await Nurse.findById(payload.id);
    }
    if (!user) {
      user = await Pharmacist.findById(payload.id);
    }
    if (!user) {
      user = await Clinic.findById(payload.id);
      // Check if clinic is still active
      if (user && !user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account has been deactivated'
        });
      }
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Attach user to request
    req.user = {
      _id: user._id,
      id: user._id,
      email: user.email || user.adminEmail,
      role: user.role || payload.role,
      fullName: user.fullName || user.adminName,
      clinicId: user.clinicId || (user.role === 'clinic' ? user._id : null)
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    
    if (err.message === 'Token expired') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (err.message === 'Token is blacklisted') {
      return res.status(401).json({ 
        success: false,
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    } else {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  }
};


