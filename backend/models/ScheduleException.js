const mongoose = require('mongoose');

const scheduleExceptionSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['unavailable', 'custom_hours'],
    required: true,
    default: 'unavailable'
  },
  // For custom_hours type
  startTime: {
    type: String,
    // Format: "HH:MM" (24-hour format)
  },
  endTime: {
    type: String,
    // Format: "HH:MM" (24-hour format)
  },
  reason: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
scheduleExceptionSchema.index({ doctorId: 1, clinicId: 1, date: 1 });

module.exports = mongoose.model('ScheduleException', scheduleExceptionSchema);
