const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Patient Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  patientName: {
    type: String,
    trim: true
  },
  
  // Appointment Details
  appointmentType: {
    type: String,
    required: [true, 'Appointment type is required'],
    enum: ['General Consultation', 'Follow-up Visit', 'Annual Checkup', 'Specialist Consultation', 'Emergency Visit', 'Lab Work', 'Imaging', 'Vaccination', 'Physical Therapy', 'Mental Health']
  },
  date: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  time: {
    type: String,
    required: [true, 'Appointment time is required']
  },
  duration: {
    type: Number,
    default: 30, // minutes
    min: [15, 'Duration must be at least 15 minutes'],
    max: [240, 'Duration cannot exceed 4 hours']
  },
  
  // Location and Provider
  location: {
    type: String,
    default: 'Main Office',
    trim: true
  },
  provider: {
    type: String,
    default: 'Dr. Johnson',
    trim: true
  },
  
  // Status and Priority
  status: {
    type: String,
    enum: ['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Notes and Instructions
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Instructions cannot exceed 500 characters']
  },
  
  // Reminders and Follow-up
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderDate: {
    type: Date
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
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

// Virtual for appointment date and time
appointmentSchema.virtual('appointmentDateTime').get(function() {
  return new Date(`${this.date.toISOString().split('T')[0]}T${this.time}`);
});

// Virtual for is upcoming
appointmentSchema.virtual('isUpcoming').get(function() {
  return this.appointmentDateTime > new Date() && this.status === 'Scheduled';
});

// Virtual for is overdue
appointmentSchema.virtual('isOverdue').get(function() {
  return this.appointmentDateTime < new Date() && this.status === 'Scheduled';
});

// Pre-save middleware to set reminder date
appointmentSchema.pre('save', function(next) {
  if (this.date && !this.reminderDate) {
    // Set reminder 24 hours before appointment
    this.reminderDate = new Date(this.date.getTime() - (24 * 60 * 60 * 1000));
  }
  next();
});

// Indexes for better query performance
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ provider: 1 });
appointmentSchema.index({ createdAt: -1 });

// Compound index for date and time queries
appointmentSchema.index({ date: 1, time: 1 });

// Static method to find appointments by date range
appointmentSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('patientId', 'fullName phone email');
};

// Static method to find upcoming appointments
appointmentSchema.statics.findUpcoming = function() {
  return this.find({
    date: { $gte: new Date() },
    status: { $in: ['Scheduled', 'Confirmed'] }
  }).populate('patientId', 'fullName phone email');
};

// Static method to find appointments by status
appointmentSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('patientId', 'fullName phone email');
};

// Instance method to confirm appointment
appointmentSchema.methods.confirm = function() {
  this.status = 'Confirmed';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to complete appointment
appointmentSchema.methods.complete = function() {
  this.status = 'Completed';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to cancel appointment
appointmentSchema.methods.cancel = function() {
  this.status = 'Cancelled';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as no show
appointmentSchema.methods.markNoShow = function() {
  this.status = 'No Show';
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Appointment', appointmentSchema);
