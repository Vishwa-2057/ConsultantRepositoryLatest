const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'User ID is required']
  },
  userName: {
    type: String,
    required: [true, 'User name is required'],
    trim: true
  },
  userEmail: {
    type: String,
    required: [true, 'User email is required'],
    trim: true,
    lowercase: true
  },
  userRole: {
    type: String,
    required: [true, 'User role is required'],
    enum: ['clinic', 'doctor', 'nurse', 'head_nurse', 'supervisor']
  },
  
  // Clinic Information
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  clinicName: {
    type: String,
    required: [true, 'Clinic name is required'],
  },
  
  // Activity Information
  activityType: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'session_expired', 'forced_logout',
      'appointment_created', 'appointment_status_changed',
      'prescription_created', 'prescription_updated',
      'doctor_created', 'doctor_activated', 'doctor_deactivated',
      'nurse_created', 'nurse_activated', 'nurse_deactivated',
      'teleconsultation_created', 'teleconsultation_completed',
      'invoice_created', 'invoice_updated',
      'referral_created', 'referral_completed'
    ],
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Session Information
  sessionId: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  
  // Device/Browser Information
  deviceInfo: {
    browser: {
      type: String,
      trim: true
    },
    os: {
      type: String,
      trim: true
    },
    device: {
      type: String,
      trim: true
    }
  },
  
  // Additional Metadata
  duration: {
    type: Number, // Session duration in minutes (for logout events)
    min: 0
  },
  notes: {
    type: String,
    default: ''
  },
  
  // Appointment-specific fields (for appointment activities)
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  patientName: {
    type: String
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  doctorName: {
    type: String
  },
  appointmentType: {
    type: String
  },
  appointmentDate: {
    type: Date
  },
  appointmentTime: {
    type: String
  },
  oldStatus: {
    type: String
  },
  newStatus: {
    type: String
  },
  
  // Additional fields for new activity types
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse'
  },
  nurseName: {
    type: String
  },
  teleconsultationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teleconsultation'
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  invoiceAmount: {
    type: Number
  },
  referralId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Referral'
  },
  referralType: {
    type: String,
    enum: ['inbound', 'outbound']
  },
  targetEntity: {
    type: String // Name of doctor/nurse being created/activated/deactivated
  },
  targetEntityId: {
    type: mongoose.Schema.Types.ObjectId // ID of doctor/nurse being created/activated/deactivated
  }
}, {
  timestamps: true,
  collection: 'activitylogs'
});

// Virtual for formatted timestamp
activityLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString();
});

// Virtual for time ago
activityLogSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return this.timestamp.toLocaleDateString();
});

// Indexes for better query performance
activityLogSchema.index({ clinicId: 1, timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ activityType: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

// Compound indexes
activityLogSchema.index({ clinicId: 1, activityType: 1, timestamp: -1 });
activityLogSchema.index({ clinicId: 1, userId: 1, timestamp: -1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function(activityData) {
  try {
    const log = new this(activityData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

// Static method to get clinic activity logs
activityLogSchema.statics.getClinicLogs = function(clinicId, options = {}) {
  const {
    page = 1,
    limit = 50,
    activityType,
    userId,
    startDate,
    endDate,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = options;
  
  const query = { clinicId };
  
  // Add filters
  if (activityType) query.activityType = activityType;
  if (userId) query.userId = userId;
  
  // Date range filter
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  return this.find(query)
    .populate('userId', 'fullName email role')
    .populate('clinicId', 'name')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get user activity logs
activityLogSchema.statics.getUserLogs = function(userId, options = {}) {
  const {
    page = 1,
    limit = 50,
    activityType,
    startDate,
    endDate
  } = options;
  
  const query = { userId };
  
  if (activityType) query.activityType = activityType;
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate('clinicId', 'name')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get activity statistics
activityLogSchema.statics.getActivityStats = async function(clinicId, options = {}) {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate = new Date()
  } = options;
  
  const matchStage = {
    clinicId: new mongoose.Types.ObjectId(clinicId),
    timestamp: { $gte: startDate, $lte: endDate }
  };
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        activityType: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        _id: 0
      }
    }
  ]);
  
  // Get daily activity for the last 7 days
  const dailyActivity = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          activityType: '$activityType'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': -1 } },
    { $limit: 14 } // Last 7 days * 2 activity types
  ]);
  
  return {
    summary: stats,
    dailyActivity
  };
};

// Instance method to calculate session duration
activityLogSchema.methods.calculateSessionDuration = async function() {
  if (this.activityType !== 'logout') return null;
  
  // Find the corresponding login event
  const loginEvent = await this.constructor.findOne({
    userId: this.userId,
    activityType: 'login',
    timestamp: { $lt: this.timestamp }
  }).sort({ timestamp: -1 });
  
  if (loginEvent) {
    const durationMs = this.timestamp - loginEvent.timestamp;
    const durationMinutes = Math.floor(durationMs / 60000);
    return durationMinutes;
  }
  
  return null;
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
