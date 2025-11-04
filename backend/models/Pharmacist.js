const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const pharmacistSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  uhid: {
    type: String,
    required: [true, 'UHID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'UHID cannot exceed 50 characters']
  },
  profileImage: {
    type: String,
    required: [true, 'Profile image is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required']
  },
  phone: {
    type: String,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    trim: true
  },
  specialization: {
    type: String,
    default: 'General Pharmacy',
    trim: true
  },
  experience: {
    type: Number,
    min: 0,
    default: 0
  },
  shift: {
    type: String,
    enum: ['Day', 'Night', 'Evening', 'Rotating'],
    default: 'Day'
  },
  role: {
    type: String,
    enum: ['pharmacist', 'head_pharmacist', 'pharmacy_manager'],
    default: 'pharmacist'
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

pharmacistSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('Pharmacist', pharmacistSchema);
