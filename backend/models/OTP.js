const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  // Email for which OTP is generated
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // OTP Code
  code: {
    type: String,
    required: [true, 'OTP code is required'],
    length: [6, 'OTP code must be 6 digits']
  },
  
  // Purpose of OTP (login, registration, password reset, etc.)
  purpose: {
    type: String,
    required: [true, 'OTP purpose is required'],
    enum: ['login', 'registration', 'password_reset', 'email_verification'],
    default: 'login'
  },
  
  // User ID if available
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    default: null
  },
  
  // Status of OTP
  status: {
    type: String,
    enum: ['pending', 'verified', 'expired', 'used'],
    default: 'pending'
  },
  
  // Number of attempts made
  attempts: {
    type: Number,
    default: 0,
    max: [5, 'Maximum 5 attempts allowed']
  },
  
  // Expiration time
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
  },
  
  // Verification time
  verifiedAt: {
    type: Date,
    default: null
  },
  
  // IP address for security
  ipAddress: {
    type: String,
    trim: true
  },
  
  // User agent for security
  userAgent: {
    type: String,
    trim: true
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

// Virtual for checking if OTP is expired
otpSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for checking if OTP is valid (not expired, not used, not verified)
otpSchema.virtual('isValid').get(function() {
  return this.status === 'pending' && !this.isExpired && this.attempts < 5;
});

// Virtual for time remaining in minutes
otpSchema.virtual('timeRemaining').get(function() {
  if (this.isExpired) return 0;
  const remaining = this.expiresAt - new Date();
  return Math.ceil(remaining / (1000 * 60)); // minutes
});

// Pre-save middleware to update updatedAt
otpSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
otpSchema.index({ email: 1, purpose: 1 });
otpSchema.index({ code: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
otpSchema.index({ status: 1 });
otpSchema.index({ createdAt: -1 });

// Compound indexes
otpSchema.index({ email: 1, status: 1, purpose: 1 });
otpSchema.index({ code: 1, email: 1, status: 1 });

// Static method to generate OTP
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit number
};

// Static method to create OTP for email
otpSchema.statics.createOTP = async function(email, purpose = 'login', userId = null, ipAddress = null, userAgent = null) {
  // Invalidate any existing OTPs for this email and purpose
  await this.updateMany(
    { email, purpose, status: 'pending' },
    { status: 'expired' }
  );
  
  // Generate new OTP
  const code = this.generateOTP();
  
  // Create new OTP record
  const otp = new this({
    email,
    code,
    purpose,
    userId,
    ipAddress,
    userAgent,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  });
  
  await otp.save();
  return otp;
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(email, code, purpose = 'login') {
  const otp = await this.findOne({
    email,
    code,
    purpose,
    status: 'pending'
  });
  
  if (!otp) {
    return { success: false, message: 'Invalid OTP code' };
  }
  
  if (otp.isExpired) {
    otp.status = 'expired';
    await otp.save();
    return { success: false, message: 'OTP has expired' };
  }
  
  if (otp.attempts >= 5) {
    otp.status = 'expired';
    await otp.save();
    return { success: false, message: 'Too many attempts. OTP has been invalidated' };
  }
  
  // Increment attempts
  otp.attempts += 1;
  
  if (otp.code !== code) {
    await otp.save();
    return { success: false, message: 'Invalid OTP code' };
  }
  
  // Mark as verified
  otp.status = 'verified';
  otp.verifiedAt = new Date();
  await otp.save();
  
  return { success: true, message: 'OTP verified successfully', otp };
};

// Static method to clean up expired OTPs
otpSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    { 
      $or: [
        { expiresAt: { $lt: new Date() } },
        { status: 'expired' }
      ]
    },
    { status: 'expired' }
  );
  
  return result;
};

// Instance method to mark as used
otpSchema.methods.markAsUsed = function() {
  this.status = 'used';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to extend expiration
otpSchema.methods.extendExpiration = function(minutes = 10) {
  this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('OTP', otpSchema);
