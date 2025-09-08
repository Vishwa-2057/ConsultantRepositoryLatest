const mongoose = require('mongoose');

const emailConfigSchema = new mongoose.Schema({
  // User/Doctor who owns this email configuration
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor ID is required'],
    unique: true
  },
  
  // Email service provider
  service: {
    type: String,
    required: [true, 'Email service is required'],
    enum: ['gmail', 'outlook', 'yahoo', 'sendgrid', 'ses', 'smtp'],
    default: 'gmail'
  },
  
  // SMTP configuration
  smtp: {
    host: {
      type: String,
      required: function() {
        return this.service === 'smtp';
      }
    },
    port: {
      type: Number,
      default: 587
    },
    secure: {
      type: Boolean,
      default: false
    }
  },
  
  // Email credentials
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // App password or API key
  password: {
    type: String,
    required: [true, 'Email password/API key is required']
  },
  
  // Display name for emails
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    default: function() {
      return `Dr. ${this.doctorId?.fullName || 'User'}`;
    }
  },
  
  // Email configuration status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Is this the default configuration for the doctor
  isDefault: {
    type: Boolean,
    default: true
  },
  
  // Last used timestamp
  lastUsed: {
    type: Date,
    default: Date.now
  },
  
  // Configuration metadata
  metadata: {
    // SendGrid API key (if using SendGrid)
    apiKey: String,
    // AWS SES region (if using SES)
    region: String,
    // Custom SMTP settings
    customSettings: mongoose.Schema.Types.Mixed
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

// Virtual for checking if configuration is valid
emailConfigSchema.virtual('isValid').get(function() {
  return this.isActive && this.email && this.password;
});

// Pre-save middleware to update updatedAt
emailConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
emailConfigSchema.index({ doctorId: 1 });
emailConfigSchema.index({ email: 1 });
emailConfigSchema.index({ isActive: 1 });
emailConfigSchema.index({ isDefault: 1 });
emailConfigSchema.index({ lastUsed: -1 });

// Static method to get active configuration for a doctor
emailConfigSchema.statics.getActiveConfig = async function(doctorId) {
  const config = await this.findOne({
    doctorId,
    isActive: true
  }).populate('doctorId', 'fullName email');
  
  if (!config) {
    throw new Error('No active email configuration found for this doctor');
  }
  
  return config;
};

// Static method to get default configuration for a doctor
emailConfigSchema.statics.getDefaultConfig = async function(doctorId) {
  const config = await this.findOne({
    doctorId,
    isDefault: true,
    isActive: true
  }).populate('doctorId', 'fullName email');
  
  if (!config) {
    // If no default config, get any active config
    return this.getActiveConfig(doctorId);
  }
  
  return config;
};

// Static method to create default configuration for a new doctor
emailConfigSchema.statics.createDefaultConfig = async function(doctorId, email, password, displayName = null) {
  // Check if doctor already has a configuration
  const existing = await this.findOne({ doctorId });
  if (existing) {
    throw new Error('Doctor already has an email configuration');
  }
  
  const config = new this({
    doctorId,
    email,
    password,
    displayName: displayName || `Dr. ${doctorId.fullName || 'User'}`,
    service: 'gmail',
    isActive: true,
    isDefault: true
  });
  
  await config.save();
  return config;
};

// Instance method to update last used timestamp
emailConfigSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

// Instance method to get nodemailer configuration
emailConfigSchema.methods.getNodemailerConfig = function() {
  const baseConfig = {
    from: {
      name: this.displayName,
      address: this.email
    }
  };
  
  switch (this.service) {
    case 'gmail':
      return {
        ...baseConfig,
        service: 'gmail',
        auth: {
          user: this.email,
          pass: this.password
        }
      };
      
    case 'outlook':
    case 'yahoo':
      return {
        ...baseConfig,
        service: this.service,
        auth: {
          user: this.email,
          pass: this.password
        }
      };
      
    case 'sendgrid':
      return {
        ...baseConfig,
        service: 'sendgrid',
        auth: {
          user: 'apikey',
          pass: this.password
        }
      };
      
    case 'ses':
      return {
        ...baseConfig,
        service: 'ses',
        auth: {
          user: this.email,
          pass: this.password
        },
        region: this.metadata.region || 'us-east-1'
      };
      
    case 'smtp':
      return {
        ...baseConfig,
        host: this.smtp.host,
        port: this.smtp.port,
        secure: this.smtp.secure,
        auth: {
          user: this.email,
          pass: this.password
        }
      };
      
    default:
      throw new Error(`Unsupported email service: ${this.service}`);
  }
};

// Instance method to test email configuration
emailConfigSchema.methods.testConfiguration = async function() {
  const nodemailer = require('nodemailer');
  const config = this.getNodemailerConfig();
  
  try {
    const transporter = nodemailer.createTransport(config);
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = mongoose.model('EmailConfig', emailConfigSchema);
