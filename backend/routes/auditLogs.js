const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const healthcareEncryption = require('../utils/encryption');

// Rate limiting for audit log endpoints
const auditLogLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many audit log requests from this IP'
});

// Middleware to extract client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
};

// POST /api/audit-logs - Batch audit log submission
router.post('/', auth, auditLogLimiter, async (req, res) => {
  try {
    const { logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format. Expected array of logs.'
      });
    }
    
    if (logs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No logs provided.'
      });
    }
    
    if (logs.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Too many logs in batch. Maximum 50 logs per request.'
      });
    }
    
    // Enhance logs with server-side information and encrypt sensitive data
    const enhancedLogs = logs.map(log => {
      const enhancedLog = {
        ...log,
        ipAddress: log.ipAddress || getClientIP(req),
        timestamp: new Date(log.timestamp || Date.now()),
        // Ensure user information is consistent with authenticated user
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        userName: req.user.fullName || req.user.name
      };
      
      // Encrypt sensitive data before storing
      return healthcareEncryption.encryptAuditData(enhancedLog);
    });
    
    // Validate each log entry
    const validLogs = [];
    const errors = [];
    
    for (let i = 0; i < enhancedLogs.length; i++) {
      const log = enhancedLogs[i];
      
      // Basic validation
      if (!log.eventType) {
        errors.push(`Log ${i}: eventType is required`);
        continue;
      }
      
      if (!log.riskLevel) {
        errors.push(`Log ${i}: riskLevel is required`);
        continue;
      }
      
      if (!log.sensitivityLevel) {
        errors.push(`Log ${i}: sensitivityLevel is required`);
        continue;
      }
      
      validLogs.push(log);
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors in log entries',
        errors
      });
    }
    
    // Insert logs into database
    const savedLogs = await AuditLog.insertMany(validLogs, { ordered: false });
    
    // Log the audit log creation (meta-logging)
    await AuditLog.create({
      eventType: 'BULK_OPERATION',
      timestamp: new Date(),
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      userName: req.user.fullName || req.user.name,
      riskLevel: 'LOW',
      sensitivityLevel: 'INTERNAL',
      sessionId: req.headers['x-session-id'] || 'unknown',
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      url: req.originalUrl,
      details: {
        operation: 'AUDIT_LOG_BATCH_CREATE',
        recordCount: savedLogs.length,
        bulkOperationId: `audit_batch_${Date.now()}`
      }
    });
    
    res.json({
      success: true,
      message: `Successfully saved ${savedLogs.length} audit logs`,
      count: savedLogs.length
    });
    
  } catch (error) {
    console.error('Error saving audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/audit-logs/immediate - Immediate high-priority audit log
router.post('/immediate', auth, auditLogLimiter, async (req, res) => {
  try {
    const logData = req.body;
    
    // Enhance with server-side information and encrypt sensitive data
    const enhancedLog = {
      ...logData,
      ipAddress: logData.ipAddress || getClientIP(req),
      timestamp: new Date(logData.timestamp || Date.now()),
      // Ensure user information is consistent with authenticated user
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      userName: req.user.fullName || req.user.name
    };
    
    // Encrypt sensitive data before storing
    const encryptedLog = healthcareEncryption.encryptAuditData(enhancedLog);
    
    // Validate required fields
    if (!enhancedLog.eventType) {
      return res.status(400).json({
        success: false,
        message: 'eventType is required'
      });
    }
    
    if (!enhancedLog.riskLevel) {
      return res.status(400).json({
        success: false,
        message: 'riskLevel is required'
      });
    }
    
    // Save encrypted log immediately
    const savedLog = await AuditLog.create(encryptedLog);
    
    // For critical events, you might want to trigger additional actions
    if (encryptedLog.riskLevel === 'CRITICAL') {
      // TODO: Implement real-time alerting (email, Slack, etc.)
      console.warn('CRITICAL AUDIT EVENT:', {
        eventType: encryptedLog.eventType,
        userId: encryptedLog.userId,
        timestamp: encryptedLog.timestamp,
        details: 'ENCRYPTED' // Don't log sensitive details
      });
    }
    
    res.json({
      success: true,
      message: 'Audit log saved immediately',
      logId: savedLog._id
    });
    
  } catch (error) {
    console.error('Error saving immediate audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save immediate audit log',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/audit-logs - Retrieve audit logs (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'clinic') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const {
      page = 1,
      limit = 50,
      eventType,
      userId,
      riskLevel,
      startDate,
      endDate,
      patientId
    } = req.query;
    
    // Build query
    const query = {};
    
    if (eventType) query.eventType = eventType;
    if (userId) query.userId = userId;
    if (riskLevel) query.riskLevel = riskLevel;
    if (patientId) query['details.patientId'] = patientId;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const encryptedLogs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Decrypt sensitive data before sending to client
    const logs = encryptedLogs.map(log => healthcareEncryption.decryptAuditData(log));
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/audit-logs/user/:userId - Get logs for specific user (admin only)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Check if user has admin privileges or is requesting their own logs
    if (req.user.role !== 'admin' && req.user.role !== 'clinic' && req.user.id !== req.params.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }
    
    const { limit = 100 } = req.query;
    const logs = await AuditLog.findByUser(req.params.userId, parseInt(limit));
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Error retrieving user audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/audit-logs/patient/:patientId - Get logs for specific patient (authorized users only)
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    // Check if user has appropriate privileges
    if (req.user.role !== 'admin' && req.user.role !== 'clinic' && req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient privileges.'
      });
    }
    
    const { limit = 100 } = req.query;
    const logs = await AuditLog.findByPatient(req.params.patientId, parseInt(limit));
    
    // Log this access
    await AuditLog.create({
      eventType: 'PATIENT_VIEW',
      timestamp: new Date(),
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      userName: req.user.fullName || req.user.name,
      riskLevel: 'MEDIUM',
      sensitivityLevel: 'CONFIDENTIAL',
      sessionId: req.headers['x-session-id'] || 'unknown',
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      url: req.originalUrl,
      details: {
        patientId: req.params.patientId,
        action: 'AUDIT_LOG_ACCESS',
        dataAccessed: ['audit_logs']
      }
    });
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Error retrieving patient audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/audit-logs/security - Get security-related events (admin only)
router.get('/security', auth, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'clinic') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const { limit = 100 } = req.query;
    const logs = await AuditLog.getSecurityEvents(parseInt(limit));
    
    res.json({
      success: true,
      logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Error retrieving security audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
