const mongoose = require('mongoose');

const complianceAlertSchema = new mongoose.Schema({
  // Basic Information
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: ['Medication', 'Appointment', 'Lab Results', 'Billing', 'Compliance', 'Follow-up', 'Treatment'],
    trim: true
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
    trim: true,
    maxlength: [100, 'Patient name cannot exceed 100 characters']
  },
  
  // Alert Details
  title: {
    type: String,
    required: [true, 'Alert title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  
  // Priority and Status
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Active', 'Acknowledged', 'Resolved', 'Dismissed'],
    default: 'Active'
  },
  
  // Additional Information
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Due Date and Reminders
  dueDate: {
    type: Date
  },
  reminderDate: {
    type: Date
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly']
  },
  
  // Resolution Information
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  resolvedAt: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Resolution notes cannot exceed 500 characters']
  },
  
  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
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

// Virtual for days until due
complianceAlertSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for is overdue
complianceAlertSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'Resolved') return false;
  return new Date() > new Date(this.dueDate);
});

// Virtual for urgency level
complianceAlertSchema.virtual('urgencyLevel').get(function() {
  if (this.priority === 'Critical') return 'critical';
  if (this.isOverdue) return 'overdue';
  if (this.priority === 'High') return 'high';
  if (this.daysUntilDue <= 1) return 'urgent';
  if (this.priority === 'Medium') return 'medium';
  return 'low';
});

// Pre-save middleware to update updatedAt
complianceAlertSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
complianceAlertSchema.index({ patientId: 1 });
complianceAlertSchema.index({ type: 1 });
complianceAlertSchema.index({ priority: 1 });
complianceAlertSchema.index({ status: 1 });
complianceAlertSchema.index({ createdAt: -1 });
complianceAlertSchema.index({ dueDate: 1 });
complianceAlertSchema.index({ createdBy: 1 });
complianceAlertSchema.index({ assignedTo: 1 });

// Compound indexes
complianceAlertSchema.index({ status: 1, priority: -1, createdAt: -1 });
complianceAlertSchema.index({ patientId: 1, status: 1 });

// Static method to find active alerts
complianceAlertSchema.statics.findActive = function() {
  return this.find({ status: 'Active' }).populate('patientId', 'fullName phone email');
};

// Static method to find alerts by priority
complianceAlertSchema.statics.findByPriority = function(priority) {
  return this.find({ priority, status: 'Active' }).populate('patientId', 'fullName phone email');
};

// Static method to find overdue alerts
complianceAlertSchema.statics.findOverdue = function() {
  return this.find({ 
    status: 'Active', 
    dueDate: { $lt: new Date() } 
  }).populate('patientId', 'fullName phone email');
};

// Static method to find alerts by patient
complianceAlertSchema.statics.findByPatient = function(patientId) {
  return this.find({ patientId, status: 'Active' }).populate('patientId', 'fullName phone email');
};

// Instance method to acknowledge alert
complianceAlertSchema.methods.acknowledge = function(acknowledgedBy) {
  this.status = 'Acknowledged';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to resolve alert
complianceAlertSchema.methods.resolve = function(resolvedBy, resolutionNotes = '') {
  this.status = 'Resolved';
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  this.resolutionNotes = resolutionNotes;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to dismiss alert
complianceAlertSchema.methods.dismiss = function() {
  this.status = 'Dismissed';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to update priority
complianceAlertSchema.methods.updatePriority = function(newPriority) {
  this.priority = newPriority;
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('ComplianceAlert', complianceAlertSchema);
