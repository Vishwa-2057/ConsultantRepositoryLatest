const mongoose = require('mongoose');

const teleconsultationSchema = new mongoose.Schema({
  // Appointment Reference
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: [true, 'Appointment ID is required']
  },
  
  // Patient Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true
  },
  
  // Doctor Information
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor ID is required']
  },
  doctorName: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true
  },
  
  // Clinic Reference
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  
  // Meeting Details
  meetingId: {
    type: String,
    required: [true, 'Meeting ID is required'],
    unique: true,
    trim: true
  },
  meetingUrl: {
    type: String,
    required: [true, 'Meeting URL is required'],
    trim: true
  },
  doctorMeetingUrl: {
    type: String,
    trim: true
  },
  patientMeetingUrl: {
    type: String,
    trim: true
  },
  doctorDirectUrl: {
    type: String,
    trim: true
  },
  patientDirectUrl: {
    type: String,
    trim: true
  },
  meetingPassword: {
    type: String,
    trim: true
  },
  
  // Jitsi Meet Configuration
  jitsiConfig: {
    roomName: {
      type: String,
      required: true,
      trim: true
    },
    domain: {
      type: String,
      default: 'meet.jit.si',
      trim: true
    },
    moderatorPassword: {
      type: String,
      trim: true
    },
    participantPassword: {
      type: String,
      trim: true
    }
  },
  
  // Scheduling Information
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required']
  },
  duration: {
    type: Number,
    default: 30, // minutes
    min: [15, 'Duration must be at least 15 minutes'],
    max: [240, 'Duration cannot exceed 4 hours']
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  
  // Meeting Status
  status: {
    type: String,
    enum: ['Scheduled', 'Started', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  
  // Meeting Tracking
  actualStartTime: {
    type: Date
  },
  actualEndTime: {
    type: Date
  },
  actualDuration: {
    type: Number // in minutes
  },
  
  // Participants
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.userType'
    },
    userType: {
      type: String,
      enum: ['Patient', 'Doctor', 'Nurse']
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['moderator', 'participant'],
      default: 'participant'
    },
    joinedAt: {
      type: Date
    },
    leftAt: {
      type: Date
    },
    connectionDuration: {
      type: Number // in minutes
    }
  }],
  
  // Meeting Features
  features: {
    recording: {
      enabled: {
        type: Boolean,
        default: false
      },
      recordingUrl: {
        type: String,
        trim: true
      },
      recordingId: {
        type: String,
        trim: true
      }
    },
    screenSharing: {
      type: Boolean,
      default: true
    },
    chat: {
      type: Boolean,
      default: true
    },
    whiteboard: {
      type: Boolean,
      default: false
    },
    fileSharing: {
      type: Boolean,
      default: true
    }
  },
  
  // Technical Information
  technicalDetails: {
    browserInfo: {
      type: String,
      trim: true
    },
    deviceInfo: {
      type: String,
      trim: true
    },
    connectionQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    issues: [{
      type: {
        type: String,
        enum: ['audio', 'video', 'connection', 'other']
      },
      description: {
        type: String,
        trim: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      resolved: {
        type: Boolean,
        default: false
      }
    }]
  },
  
  // Consultation Notes
  consultationNotes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Consultation notes cannot exceed 2000 characters']
  },
  diagnosis: {
    type: String,
    trim: true,
    maxlength: [1000, 'Diagnosis cannot exceed 1000 characters']
  },
  prescription: {
    type: String,
    trim: true,
    maxlength: [1500, 'Prescription cannot exceed 1500 characters']
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  
  // Reminders and Notifications
  remindersSent: {
    patient: {
      type: Boolean,
      default: false
    },
    doctor: {
      type: Boolean,
      default: false
    }
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    push: {
      type: Boolean,
      default: true
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for meeting duration in human readable format
teleconsultationSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Virtual for scheduled date and time
teleconsultationSchema.virtual('scheduledDateTime').get(function() {
  if (!this.scheduledDate || !this.scheduledTime) {
    return null;
  }
  try {
    return new Date(`${this.scheduledDate.toISOString().split('T')[0]}T${this.scheduledTime}`);
  } catch (error) {
    console.error('Error creating scheduledDateTime virtual:', error);
    return null;
  }
});

// Virtual for is upcoming
teleconsultationSchema.virtual('isUpcoming').get(function() {
  const scheduledDateTime = this.scheduledDateTime;
  return scheduledDateTime && scheduledDateTime > new Date() && this.status === 'Scheduled';
});

// Virtual for is active
teleconsultationSchema.virtual('isActive').get(function() {
  return ['Started', 'In Progress'].includes(this.status);
});

// Virtual for meeting room URL with parameters
teleconsultationSchema.virtual('fullMeetingUrl').get(function() {
  const baseUrl = `https://${this.jitsiConfig.domain}/${this.jitsiConfig.roomName}`;
  const params = new URLSearchParams();
  
  if (this.jitsiConfig.participantPassword) {
    params.append('password', this.jitsiConfig.participantPassword);
  }
  
  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
});

// Pre-save middleware to update timestamps
teleconsultationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
teleconsultationSchema.index({ appointmentId: 1 });
teleconsultationSchema.index({ patientId: 1 });
teleconsultationSchema.index({ doctorId: 1 });
teleconsultationSchema.index({ clinicId: 1 });
teleconsultationSchema.index({ scheduledDate: 1 });
teleconsultationSchema.index({ status: 1 });
teleconsultationSchema.index({ meetingId: 1 }, { unique: true });
teleconsultationSchema.index({ createdAt: -1 });

// Compound indexes
teleconsultationSchema.index({ scheduledDate: 1, scheduledTime: 1 });
teleconsultationSchema.index({ doctorId: 1, scheduledDate: 1 });
teleconsultationSchema.index({ patientId: 1, scheduledDate: 1 });

// Static method to find upcoming teleconsultations
teleconsultationSchema.statics.findUpcoming = function() {
  return this.find({
    scheduledDate: { $gte: new Date() },
    status: { $in: ['Scheduled', 'Started'] }
  }).populate('patientId', 'fullName phone email')
    .populate('doctorId', 'fullName specialty phone email');
};

// Static method to find active meetings
teleconsultationSchema.statics.findActive = function() {
  return this.find({
    status: { $in: ['Started', 'In Progress'] }
  }).populate('patientId', 'fullName phone email')
    .populate('doctorId', 'fullName specialty phone email');
};

// Static method to find by date range
teleconsultationSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    scheduledDate: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('patientId', 'fullName phone email')
    .populate('doctorId', 'fullName specialty phone email');
};

// Instance method to start meeting
teleconsultationSchema.methods.startMeeting = function() {
  this.status = 'Started';
  this.actualStartTime = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to end meeting
teleconsultationSchema.methods.endMeeting = function() {
  this.status = 'Completed';
  this.actualEndTime = new Date();
  
  if (this.actualStartTime) {
    this.actualDuration = Math.round((this.actualEndTime - this.actualStartTime) / (1000 * 60));
  }
  
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to cancel meeting
teleconsultationSchema.methods.cancelMeeting = function() {
  this.status = 'Cancelled';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add participant
teleconsultationSchema.methods.addParticipant = function(userId, userType, name, role = 'participant') {
  const participant = {
    userId,
    userType,
    name,
    role,
    joinedAt: new Date()
  };
  
  this.participants.push(participant);
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to remove participant
teleconsultationSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    participant.leftAt = new Date();
    if (participant.joinedAt) {
      participant.connectionDuration = Math.round((participant.leftAt - participant.joinedAt) / (1000 * 60));
    }
  }
  
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Teleconsultation', teleconsultationSchema);
