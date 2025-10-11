const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
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
  
  // Consultation Details
  consultationType: {
    type: String,
    required: [true, 'Consultation type is required'],
    enum: ['General', 'Specialist', 'Follow-up', 'Emergency', 'Telemedicine']
  },
  mode: {
    type: String,
    required: [true, 'Consultation mode is required'],
    enum: ['In-person', 'Video', 'Phone', 'Chat']
  },
  date: {
    type: Date,
    required: [true, 'Consultation date is required']
  },
  time: {
    type: String,
    required: [true, 'Consultation time is required']
  },
  duration: {
    type: Number,
    default: 30, // minutes
    min: [15, 'Duration must be at least 15 minutes'],
    max: [240, 'Duration cannot exceed 4 hours']
  },
  
  // Provider Information
  provider: {
    type: String,
    default: 'Dr. Johnson',
    trim: true
  },
  providerNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Provider notes cannot exceed 1000 characters']
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  
  // Patient Information
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  symptoms: {
    type: String,
    trim: true,
    maxlength: [1000, 'Symptoms cannot exceed 1000 characters']
  },
  patientNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Patient notes cannot exceed 1000 characters']
  },
  
  // Status and Priority
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  
  // Follow-up Information
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  followUpNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Follow-up notes cannot exceed 500 characters']
  },
  
  // Prescriptions and Recommendations
  prescriptions: [{
    medication: {
      type: String,
      trim: true,
      required: true
    },
    dosage: {
      type: String,
      trim: true,
      required: true
    },
    frequency: {
      type: String,
      trim: true,
      required: true
    },
    duration: {
      type: String,
      trim: true
    },
    instructions: {
      type: String,
      trim: true
    }
  }],
  
  recommendations: [{
    type: String,
    trim: true
  }],
  
  // Lab Tests and Imaging
  labTests: [{
    testName: {
      type: String,
      trim: true,
      required: true
    },
    reason: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['Routine', 'Urgent', 'Emergency'],
      default: 'Routine'
    }
  }],
  
  imaging: [{
    type: {
      type: String,
      trim: true,
      required: true
    },
    bodyPart: {
      type: String,
      trim: true
    },
    reason: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['Routine', 'Urgent', 'Emergency'],
      default: 'Routine'
    }
  }],
  
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

// Virtual for consultation date and time
consultationSchema.virtual('consultationDateTime').get(function() {
  return new Date(`${this.date.toISOString().split('T')[0]}T${this.time}`);
});

// Virtual for is upcoming
consultationSchema.virtual('isUpcoming').get(function() {
  return this.consultationDateTime > new Date() && this.status === 'Scheduled';
});

// Virtual for is overdue
consultationSchema.virtual('isOverdue').get(function() {
  return this.consultationDateTime < new Date() && this.status === 'Scheduled';
});

// Virtual for total prescriptions
consultationSchema.virtual('totalPrescriptions').get(function() {
  return this.prescriptions.length;
});

// Virtual for total lab tests
consultationSchema.virtual('totalLabTests').get(function() {
  return this.labTests.length;
});

// Indexes for better query performance
consultationSchema.index({ patientId: 1 });
consultationSchema.index({ date: 1 });
consultationSchema.index({ status: 1 });
consultationSchema.index({ consultationType: 1 });
consultationSchema.index({ mode: 1 });
consultationSchema.index({ provider: 1 });
consultationSchema.index({ createdAt: -1 });

// Compound index for date and time queries
consultationSchema.index({ date: 1, time: 1 });

// Static method to find consultations by date range
consultationSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('patientId', 'fullName phone email');
};

// Static method to find upcoming consultations
consultationSchema.statics.findUpcoming = function() {
  return this.find({
    date: { $gte: new Date() },
    status: { $in: ['Scheduled'] }
  }).populate('patientId', 'fullName phone email');
};

// Static method to find consultations by status
consultationSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('patientId', 'fullName phone email');
};

// Static method to find consultations by type
consultationSchema.statics.findByType = function(type) {
  return this.find({ consultationType: type }).populate('patientId', 'fullName phone email');
};

// Instance method to start consultation
consultationSchema.methods.start = function() {
  this.status = 'In Progress';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to complete consultation
consultationSchema.methods.complete = function() {
  this.status = 'Completed';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to cancel consultation
consultationSchema.methods.cancel = function() {
  this.status = 'Cancelled';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as no show
consultationSchema.methods.markNoShow = function() {
  this.status = 'No Show';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add prescription
consultationSchema.methods.addPrescription = function(prescription) {
  this.prescriptions.push(prescription);
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add lab test
consultationSchema.methods.addLabTest = function(labTest) {
  this.labTests.push(labTest);
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add recommendation
consultationSchema.methods.addRecommendation = function(recommendation) {
  this.recommendations.push(recommendation);
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Consultation', consultationSchema);
