const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Event Information
  eventType: {
    type: String,
    required: true,
    enum: [
      // Data Access Events
      'PATIENT_VIEW', 'PATIENT_SEARCH', 'PATIENT_LIST_ACCESS', 'MEDICAL_RECORD_VIEW',
      'PRESCRIPTION_VIEW', 'APPOINTMENT_VIEW', 'TELECONSULTATION_VIEW', 'REFERRAL_VIEW', 'BILLING_VIEW',
      
      // Data Modification Events
      'PATIENT_CREATE', 'PATIENT_UPDATE', 'PATIENT_DELETE',
      'PRESCRIPTION_CREATE', 'PRESCRIPTION_UPDATE', 'PRESCRIPTION_DELETE',
      'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_DELETE',
      'TELECONSULTATION_CREATE', 'TELECONSULTATION_UPDATE',
      'REFERRAL_CREATE', 'REFERRAL_UPDATE',
      'BILLING_CREATE', 'BILLING_UPDATE',
      
      // Authentication Events
      'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE',
      
      // System Events
      'EXPORT_DATA', 'PRINT_RECORD', 'DOWNLOAD_DOCUMENT', 'BULK_OPERATION',
      
      // Security Events
      'UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY'
    ]
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // User Information
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ['doctor', 'nurse', 'clinic', 'admin']
  },
  userName: {
    type: String,
    required: true
  },
  
  // Risk and Sensitivity
  riskLevel: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    index: true
  },
  sensitivityLevel: {
    type: String,
    required: true,
    enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
    index: true
  },
  
  // Session and Technical Information
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  
  // Event Details
  details: {
    // Patient Information
    patientId: String,
    patientName: String,
    
    // Medical Record Information
    recordType: String,
    recordId: String,
    prescriptionId: String,
    appointmentId: String,
    
    // Operation Details
    action: String,
    dataAccessed: [String],
    searchQuery: String,
    resultCount: Number,
    
    // File Operations
    fileName: String,
    fileType: String,
    exportFormat: String,
    
    // Bulk Operations
    operation: String,
    recordCount: Number,
    bulkOperationId: String,
    
    // Browser and System Info
    browserInfo: {
      name: String,
      version: String,
      platform: String,
      language: String
    },
    screenResolution: String,
    timezone: String,
    
    // Additional context
    componentName: String,
    formType: String,
    accessType: String,
    referrer: String
  }
}, {
  timestamps: true,
  // Enable text search on important fields
  indexes: [
    { eventType: 1, timestamp: -1 },
    { userId: 1, timestamp: -1 },
    { riskLevel: 1, timestamp: -1 },
    { 'details.patientId': 1, timestamp: -1 },
    { sessionId: 1, timestamp: -1 }
  ]
});

// Add text index for search functionality
auditLogSchema.index({
  eventType: 'text',
  userEmail: 'text',
  userName: 'text',
  'details.patientName': 'text',
  'details.searchQuery': 'text'
});

// Add TTL index for automatic log retention (optional - 7 years for healthcare)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 }); // 7 years

// Pre-save middleware to ensure data integrity
auditLogSchema.pre('save', function(next) {
  // Ensure timestamp is set
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  
  // Sanitize sensitive data in details
  if (this.details && this.details.searchQuery && this.details.searchQuery.length > 100) {
    this.details.searchQuery = this.details.searchQuery.substring(0, 100) + '...';
  }
  
  next();
});

// Static methods for common queries
auditLogSchema.statics.findByUser = function(userId, limit = 100) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByPatient = function(patientId, limit = 100) {
  return this.find({ 'details.patientId': patientId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByRiskLevel = function(riskLevel, limit = 100) {
  return this.find({ riskLevel })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.findByDateRange = function(startDate, endDate, limit = 1000) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

auditLogSchema.statics.getSecurityEvents = function(limit = 100) {
  return this.find({
    eventType: {
      $in: ['UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY', 'LOGIN_FAILURE']
    }
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
