const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const clinicSchema = new mongoose.Schema({
  clinicId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  yearOfEstablishment: { type: Number, required: true },
  address: {
    type: String,
    required: true,
  },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  zipCode: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  website: { type: String },
  ownerName: { type: String, required: true },
  ownerMedicalId: { type: String },
  adminName: { type: String, required: true },
  adminContact: { type: String, required: true },
  adminEmail: { type: String, required: true },
  tradeLicense: { type: String },
  medicalCouncilCert: { type: String },
  taxId: { type: String },
  accreditation: { type: String },
  specialties: [{ type: String }],
  services: [{ type: String }],
  operatingHours: { type: String },
  staffCount: { type: Number },
  beds: { type: Number },
  pharmacyAvailable: { type: Boolean, default: false },
  laboratoryAvailable: { type: Boolean, default: false },
  paymentMethods: [{ type: String }],
  bankInfo: { type: String },
  adminUsername: { type: String, required: true },
  adminPassword: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  superAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  // Legacy fields for backward compatibility
  fullName: { type: String },
  passwordHash: { type: String },
  organization: { type: String },
  department: { type: String },
  permissions: {
    type: [String],
    default: ['all']
  },
  isClinic: {
    type: Boolean,
    default: true
  },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
}, {
  timestamps: true
});

// Virtual for checking if account is locked
clinicSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Methods
clinicSchema.methods.comparePassword = function(candidatePassword) {
  // Check both new adminPassword field and legacy passwordHash field
  const passwordToCompare = this.adminPassword || this.passwordHash;
  
  console.log(`🔍 Clinic Password Debug for ${this.adminEmail}:`);
  console.log(`  - Candidate Password: ${candidatePassword}`);
  console.log(`  - Stored Password: ${passwordToCompare ? passwordToCompare.substring(0, 20) + '...' : 'NONE'}`);
  console.log(`  - Password Field Used: ${this.adminPassword ? 'adminPassword' : 'passwordHash'}`);
  console.log(`  - Is Hashed: ${passwordToCompare && passwordToCompare.startsWith('$2') ? 'YES' : 'NO'}`);
  
  if (!passwordToCompare) {
    console.log(`  - Result: FAILED (No password stored)`);
    return Promise.resolve(false);
  }
  
  // If password looks like a bcrypt hash (starts with $2a, $2b, $2x, $2y), use bcrypt
  if (passwordToCompare.startsWith('$2')) {
    console.log(`  - Using bcrypt comparison`);
    return bcrypt.compare(candidatePassword, passwordToCompare).then(result => {
      console.log(`  - Bcrypt Result: ${result ? 'MATCH' : 'NO MATCH'}`);
      return result;
    });
  }
  
  // Otherwise compare directly (for legacy plain text passwords)
  console.log(`  - Using plain text comparison`);
  const result = candidatePassword === passwordToCompare;
  console.log(`  - Plain Text Result: ${result ? 'MATCH' : 'NO MATCH'}`);
  return Promise.resolve(result);
};

clinicSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockUntil: 1
      },
      $set: {
        loginAttempts: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

clinicSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    },
    $set: {
      lastLogin: new Date()
    }
  });
};

module.exports = mongoose.model('Clinic', clinicSchema);
