const jwt = require('jsonwebtoken');

// Middleware to check if user has clinic admin role
const requireClinicAdmin = (req, res, next) => {
  try {
    // Check if user is authenticated (should be called after auth middleware)
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }

    // Check if user has clinic role
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Only clinic administrators can perform this action' 
      });
    }

    next();
  } catch (error) {
    console.error('Role authorization error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: 'Role verification failed' 
    });
  }
};

// Middleware to check if user can edit patients (clinic admin only)
const canEditPatients = (req, res, next) => {
  return requireClinicAdmin(req, res, next);
};

// Middleware to check if user can manage doctors (clinic admin only)
const canManageDoctors = (req, res, next) => {
  return requireClinicAdmin(req, res, next);
};

// Middleware to check if user can access system settings (clinic admin only)
const canManageSystem = (req, res, next) => {
  return requireClinicAdmin(req, res, next);
};

// General role checker middleware factory
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Authentication required' 
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Role verification failed' 
      });
    }
  };
};

module.exports = {
  requireClinicAdmin,
  canEditPatients,
  canManageDoctors,
  canManageSystem,
  requireRole
};
