const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medication name is required'],
    trim: true
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required'],
    trim: true
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    trim: true
  },
  duration: {
    type: String,
    required: [true, 'Duration is required'],
    trim: true
  },
  instructions: {
    type: String,
    trim: true,
    default: ''
  }
});

const prescriptionSchema = new mongoose.Schema({
  // Patient Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  
  // Doctor Information
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor ID is required']
  },
  
  // Clinic Reference
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  
  // Prescription Details
  prescriptionNumber: {
    type: String,
    unique: true
  },
  
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Medical Information
  diagnosis: {
    type: String,
    required: [true, 'Diagnosis is required'],
    trim: true
  },
  
  medications: [medicationSchema],
  
  // Additional Information
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Status
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled'],
    default: 'Active'
  },
  
  // Follow-up
  followUpDate: {
    type: Date
  },
  
  followUpInstructions: {
    type: String,
    trim: true
  },
  
  // System Fields
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

// Generate prescription number before saving
prescriptionSchema.pre('save', async function(next) {
  if (this.isNew && !this.prescriptionNumber) {
    try {
      const count = await this.constructor.countDocuments();
      this.prescriptionNumber = `RX${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating prescription number:', error);
      // Fallback to timestamp-based number if count fails
      this.prescriptionNumber = `RX${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

// Indexes for better query performance
prescriptionSchema.index({ patientId: 1 });
prescriptionSchema.index({ doctorId: 1 });
prescriptionSchema.index({ prescriptionNumber: 1 });
prescriptionSchema.index({ date: -1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ createdAt: -1 });

// Virtual for prescription age
prescriptionSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.date) / (1000 * 60 * 60 * 24));
});

// Static method to find active prescriptions
prescriptionSchema.statics.findActive = function() {
  return this.find({ status: 'Active' });
};

// Instance method to update status
prescriptionSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add medication
prescriptionSchema.methods.addMedication = function(medication) {
  this.medications.push(medication);
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Prescription', prescriptionSchema);
