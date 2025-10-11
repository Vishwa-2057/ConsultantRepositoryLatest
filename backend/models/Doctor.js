const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const doctorSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
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
  specialty: {
    type: String,
    default: 'General Practitioner',
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    required: [true, 'Profile image is required'],
    trim: true
  },
  uhid: {
    type: String,
    required: [true, 'UHID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  qualification: {
    type: String,
    required: [true, 'Qualification is required'],
    trim: true
  },
  currentAddress: {
    street: { type: String, required: [true, 'Current address street is required'], trim: true },
    city: { type: String, required: [true, 'Current address city is required'], trim: true },
    state: { type: String, required: [true, 'Current address state is required'], trim: true },
    zipCode: { type: String, required: [true, 'Current address zip code is required'], trim: true },
    country: { type: String, default: 'India', trim: true }
  },
  permanentAddress: {
    street: { type: String, required: [true, 'Permanent address street is required'], trim: true },
    city: { type: String, required: [true, 'Permanent address city is required'], trim: true },
    state: { type: String, required: [true, 'Permanent address state is required'], trim: true },
    zipCode: { type: String, required: [true, 'Permanent address zip code is required'], trim: true },
    country: { type: String, default: 'India', trim: true }
  },
  about: {
    type: String,
    required: [true, 'About section is required'],
    trim: true,
    maxlength: [1000, 'About section cannot exceed 1000 characters']
  },
  languages: [{
    type: String,
    trim: true
  }],
  role: {
    type: String,
    enum: ['doctor', 'admin'],
    default: 'doctor'
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

doctorSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('Doctor', doctorSchema);


