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
    enum: ['General Consultation', 'Follow-up Visit', 'Annual Checkup', 'Specialist Consultation', 'Emergency Visit', 'Lab Work', 'Imaging', 'Vaccination', 'Physical Therapy', 'Mental Health', 'Teleconsultation']
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
  
  // Location and Provider
  location: {
    type: String,
    default: 'Main Office',
    trim: true
  },
  provider: {
    type: String,
    trim: true
  },
  
  // Status and Priority
  status: {
    type: String,
    enum: ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
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
  
  // Teleconsultation Details
  isVirtual: {
    type: Boolean,
    default: false
  },
  meetingLink: {
    type: String,
    trim: true
  },
  meetingId: {
    type: String,
    trim: true
  },
  teleconsultationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teleconsultation'
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
  if (!this.date || !this.time) {
    return null;
  }
  try {
    return new Date(`${this.date.toISOString().split('T')[0]}T${this.time}`);
  } catch (error) {
    console.error('Error creating appointmentDateTime virtual:', error);
    return null;
  }
});

// Virtual for is upcoming
appointmentSchema.virtual('isUpcoming').get(function() {
  const appointmentDateTime = this.appointmentDateTime;
  return appointmentDateTime && appointmentDateTime > new Date() && this.status === 'Scheduled';
});

// Virtual for is overdue
appointmentSchema.virtual('isOverdue').get(function() {
  const appointmentDateTime = this.appointmentDateTime;
  return appointmentDateTime && appointmentDateTime < new Date() && this.status === 'Scheduled';
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
appointmentSchema.index({ doctorId: 1 });
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

// Static method to check for appointment conflicts
appointmentSchema.statics.checkForConflicts = async function(doctorId, date, time, duration = 30, excludeAppointmentId = null) {
  try {
    // Parse the appointment time
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentStart = new Date(date);
    appointmentStart.setHours(hours, minutes, 0, 0);
    
    // Calculate end time
    const appointmentEnd = new Date(appointmentStart.getTime() + (duration * 60 * 1000));
    
    // Build query to find potential conflicts
    const query = {
      doctorId: doctorId,
      date: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      },
      status: { $in: ['Scheduled', 'Confirmed'] }
    };
    
    // Exclude current appointment if updating
    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }
    
    // Find existing appointments on the same date
    const existingAppointments = await this.find(query);
    
    // Check for time overlaps
    const conflicts = [];
    for (const existing of existingAppointments) {
      const [existingHours, existingMinutes] = existing.time.split(':').map(Number);
      const existingStart = new Date(existing.date);
      existingStart.setHours(existingHours, existingMinutes, 0, 0);
      
      const existingEnd = new Date(existingStart.getTime() + (existing.duration * 60 * 1000));
      
      // Check for overlap: appointments overlap if one starts before the other ends
      const hasOverlap = (appointmentStart < existingEnd) && (appointmentEnd > existingStart);
      
      if (hasOverlap) {
        conflicts.push({
          appointmentId: existing._id,
          patientName: existing.patientName,
          time: existing.time,
          duration: existing.duration,
          appointmentType: existing.appointmentType,
          status: existing.status
        });
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error('Error checking for appointment conflicts:', error);
    throw error;
  }
};

// Static method to get doctor's availability for a specific date
appointmentSchema.statics.getDoctorAvailability = async function(doctorId, date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const appointments = await this.find({
      doctorId: doctorId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['Scheduled', 'Confirmed'] }
    }).sort({ time: 1 });
    
    // Convert to time slots with duration
    const bookedSlots = appointments.map(apt => {
      const [hours, minutes] = apt.time.split(':').map(Number);
      const startTime = new Date(apt.date);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime.getTime() + (apt.duration * 60 * 1000));
      
      return {
        appointmentId: apt._id,
        patientName: apt.patientName,
        startTime: startTime,
        endTime: endTime,
        time: apt.time,
        duration: apt.duration,
        appointmentType: apt.appointmentType,
        status: apt.status
      };
    });
    
    return bookedSlots;
  } catch (error) {
    console.error('Error getting doctor availability:', error);
    throw error;
  }
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
