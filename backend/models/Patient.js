const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const patientSchema = new mongoose.Schema({
  // Basic Information
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  age: {
    type: Number,
    min: [0, 'Age cannot be negative'],
    max: [150, 'Age cannot exceed 150']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female', 'Other']
  },
  
  // Contact Information
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required']
  },
  
  // Patient Identification
  uhid: {
    type: String,
    required: [true, 'UHID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  profileImage: {
    type: String,
    required: [true, 'Profile image is required'],
    trim: true
  },
  
  // Medical Information
  bloodGroup: {
    type: String,
    required: [true, 'Blood group is required'],
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    trim: true
  },
  occupation: {
    type: String,
    required: [true, 'Occupation is required'],
    trim: true,
    maxlength: [100, 'Occupation cannot exceed 100 characters']
  },
  
  // Referral Information
  referringDoctor: {
    type: String,
    trim: true,
    maxlength: [100, 'Referring doctor name cannot exceed 100 characters']
  },
  referredClinic: {
    type: String,
    trim: true,
    maxlength: [100, 'Referred clinic name cannot exceed 100 characters']
  },
  
  // Personal Details
  maritalStatus: {
    type: String,
    enum: ['Single', 'Married'],
    trim: true
  },
  handDominance: {
    type: String,
    enum: ['Right', 'Left', 'Ambidextrous'],
    trim: true
  },
  nationality: {
    type: String,
    trim: true,
    maxlength: [50, 'Nationality cannot exceed 50 characters']
  },
  
  // Aadhaar Information
  aadhaarNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Aadhaar number should be 12 digits if provided
        return !v || /^\d{12}$/.test(v);
      },
      message: 'Aadhaar number must be 12 digits'
    }
  },

  // Parent/Guardian Information (for patients under 18)
  isUnder18: {
    type: Boolean,
    default: false
  },
  parentGuardian: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Parent/Guardian name cannot exceed 100 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid parent/guardian email']
    },
    mobileNumber: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          // Mobile number should be 10 digits if provided
          return !v || /^\d{10}$/.test(v);
        },
        message: 'Mobile number must be 10 digits'
      }
    }
  },

  governmentDocument: {
    type: String,
    required: [true, 'Government document is required'],
    trim: true
  },
  
  // Address Information
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true
    },
    country: {
      type: String,
      default: 'United States',
      trim: true
    }
  },
  
  // Emergency Contact
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  
  // Insurance Information
  insurance: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    groupNumber: {
      type: String,
      trim: true
    }
  },
  
  // Medical History
  medicalHistory: {
    conditions: [{
      type: String,
      trim: true
    }],
    allergies: [{
      type: String,
      trim: true
    }],
    medications: [{
      type: String,
      trim: true
    }],
    surgeries: [{
      type: String,
      trim: true
    }]
  },
  
  // Assigned Doctor
  assignedDoctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }],
  
  // Clinic Reference
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  
  // Additional Information
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Vitals Information
  vitals: {
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    },
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative']
    },
    bmi: {
      type: Number,
      min: [0, 'BMI cannot be negative']
    },
    bloodPressure: {
      systolic: {
        type: Number,
        min: [0, 'Systolic pressure cannot be negative']
      },
      diastolic: {
        type: Number,
        min: [0, 'Diastolic pressure cannot be negative']
      }
    },
    heartRate: {
      type: Number,
      min: [0, 'Heart rate cannot be negative']
    },
    temperature: {
      type: Number,
      min: [0, 'Temperature cannot be negative']
    },
    respiratoryRate: {
      type: Number,
      min: [0, 'Respiratory rate cannot be negative']
    },
    oxygenSaturation: {
      type: Number,
      min: [0, 'Oxygen saturation cannot be negative'],
      max: [100, 'Oxygen saturation cannot exceed 100']
    },
    bloodSugar: {
      type: Number,
      min: [0, 'Blood sugar cannot be negative']
    },
    lastUpdated: {
      type: Date
    }
  },
  
  // System Fields
  lastVisit: {
    type: Date,
    default: Date.now
  },
  nextAppointment: {
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

// Virtual for full address
patientSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}`;
});

// Virtual for age calculation
patientSchema.virtual('calculatedAge').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Pre-save middleware to calculate age
patientSchema.pre('save', function(next) {
  if (this.dateOfBirth) {
    this.age = this.calculatedAge;
  }
  next();
});

// Indexes for better query performance
patientSchema.index({ fullName: 'text' });
patientSchema.index({ phone: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ uhid: 1 });
patientSchema.index({ createdAt: -1 });

// Instance method to update vitals
patientSchema.methods.updateVitals = function(vitalsData) {
  this.vitals = { ...this.vitals, ...vitalsData, lastUpdated: new Date() };
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add medical condition
patientSchema.methods.addMedicalCondition = function(condition) {
  if (!this.medicalHistory.conditions.includes(condition)) {
    this.medicalHistory.conditions.push(condition);
    this.updatedAt = new Date();
  }
  return this.save();
};

// Instance method to add allergy
patientSchema.methods.addAllergy = function(allergy) {
  if (!this.medicalHistory.allergies.includes(allergy)) {
    this.medicalHistory.allergies.push(allergy);
    this.updatedAt = new Date();
  }
  return this.save();
};

// Instance method to compare password
patientSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('Patient', patientSchema);
