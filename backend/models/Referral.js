const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
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
  
  // Specialist Information
  specialistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false // Optional for backward compatibility
  },
  specialistName: {
    type: String,
    required: [true, 'Specialist name is required'],
    trim: true
  },
  specialty: {
    type: String,
    required: [true, 'Specialty is required'],
    trim: true
  },
  specialistContact: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    fax: {
      type: String,
      trim: true
    }
  },
  specialistAddress: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true
    }
  },
  
  // Referral Type
  referralType: {
    type: String,
    required: [true, 'Referral type is required'],
    enum: ['inbound', 'outbound'],
    default: 'outbound'
  },
  
  // External Clinic (for outbound referrals)
  externalClinic: {
    type: String,
    trim: true
  },
  
  // Referral Details
  reason: {
    type: String,
    required: [true, 'Referral reason is required'],
    trim: true,
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
  },
  clinicalHistory: {
    type: String,
    trim: true,
    maxlength: [2000, 'Clinical history cannot exceed 2000 characters']
  },
  currentMedications: [{
    type: String,
    trim: true
  }],
  testResults: {
    type: String,
    trim: true,
    maxlength: [1000, 'Test results cannot exceed 1000 characters']
  },
  
  // Urgency and Scheduling
  urgency: {
    type: String,
    required: [true, 'Urgency level is required'],
    enum: ['Low', 'Medium', 'High', 'Urgent']
  },
  preferredDate: {
    type: Date
  },
  preferredTime: {
    type: String,
    trim: true
  },
  
  // Status and Tracking
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  statusNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Status notes cannot exceed 500 characters']
  },
  
  // Insurance and Authorization
  insuranceInfo: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    authorizationRequired: {
      type: Boolean,
      default: false
    },
    authorizationNumber: {
      type: String,
      trim: true
    },
    authorizationExpiry: {
      type: Date
    }
  },
  
  // Referral Provider Information
  referringProvider: {
    name: {
      type: String,
      required: [true, 'Referring provider name is required'],
      trim: true
    },
    npi: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    }
  },

  // Referred By (Doctor who created the referral) - Optional
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  
  // Clinic Reference
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  
  // Additional Information
  specialInstructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Special instructions cannot exceed 500 characters']
  },
  attachments: [{
    fileName: {
      type: String,
      trim: true
    },
    fileType: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Shareable Link Information
  shareableLink: {
    code: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    url: {
      type: String,
      trim: true
    },
    generatedAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: false
    },
    accessCount: {
      type: Number,
      default: 0
    },
    lastAccessedAt: {
      type: Date
    },
    deactivatedAt: {
      type: Date
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

// Virtual for full specialist address
referralSchema.virtual('specialistFullAddress').get(function() {
  const addr = this.specialistAddress;
  if (!addr.street) return '';
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
});

// Virtual for is urgent
referralSchema.virtual('isUrgent').get(function() {
  return this.urgency === 'High' || this.urgency === 'Urgent';
});

// Virtual for days since creation
referralSchema.virtual('daysSinceCreation').get(function() {
  const now = new Date();
  const created = this.createdAt;
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for is overdue (if urgent and pending for more than 3 days)
referralSchema.virtual('isOverdue').get(function() {
  if (this.urgency === 'High' || this.urgency === 'Urgent') {
    return this.daysSinceCreation > 3 && this.status === 'Pending';
  }
  return false;
});

// Indexes for better query performance
referralSchema.index({ patientId: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ urgency: 1 });
referralSchema.index({ specialty: 1 });
referralSchema.index({ specialistName: 1 });
referralSchema.index({ createdAt: -1 });
referralSchema.index({ preferredDate: 1 });

// Compound index for status and urgency
referralSchema.index({ status: 1, urgency: 1 });

// Static method to find urgent referrals
referralSchema.statics.findUrgent = function() {
  return this.find({
    urgency: { $in: ['High', 'Urgent'] },
    status: { $in: ['Pending', 'Approved'] }
  }).populate('patientId', 'fullName phone email');
};

// Static method to find referrals by status
referralSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('patientId', 'fullName phone email');
};

// Static method to find referrals by specialty
referralSchema.statics.findBySpecialty = function(specialty) {
  return this.find({ specialty }).populate('patientId', 'fullName phone email');
};

// Static method to find overdue referrals
referralSchema.statics.findOverdue = function() {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  return this.find({
    urgency: { $in: ['High', 'Urgent'] },
    status: 'Pending',
    createdAt: { $lt: threeDaysAgo }
  }).populate('patientId', 'fullName phone email');
};

// Instance method to approve referral
referralSchema.methods.approve = function(notes = '') {
  this.status = 'Approved';
  this.statusNotes = notes;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to start referral
referralSchema.methods.start = function(notes = '') {
  this.status = 'In Progress';
  this.statusNotes = notes;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to complete referral
referralSchema.methods.complete = function(notes = '') {
  this.status = 'Completed';
  this.statusNotes = notes;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to cancel referral
referralSchema.methods.cancel = function(notes = '') {
  this.status = 'Cancelled';
  this.statusNotes = notes;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to update urgency
referralSchema.methods.updateUrgency = function(newUrgency) {
  if (!['Low', 'Medium', 'High', 'Urgent'].includes(newUrgency)) {
    throw new Error('Invalid urgency level');
  }
  this.urgency = newUrgency;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add attachment
referralSchema.methods.addAttachment = function(attachment) {
  this.attachments.push(attachment);
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Referral', referralSchema);
