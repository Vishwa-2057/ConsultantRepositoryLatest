const mongoose = require('mongoose');

const doctorAvailabilitySchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  },
  startTime: {
    type: String,
    required: true,
    // Format: "HH:MM" (24-hour format)
  },
  endTime: {
    type: String,
    required: true,
    // Format: "HH:MM" (24-hour format)
  },
  slotDuration: {
    type: Number,
    default: 30,
    // Duration in minutes for each appointment slot
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique availability per doctor per day
doctorAvailabilitySchema.index({ doctorId: 1, clinicId: 1, dayOfWeek: 1 });

module.exports = mongoose.model('DoctorAvailability', doctorAvailabilitySchema);
