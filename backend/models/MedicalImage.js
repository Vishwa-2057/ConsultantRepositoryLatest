const mongoose = require('mongoose');

const medicalImageSchema = new mongoose.Schema({
  // Patient Reference
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  
  // Doctor who uploaded the image
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Uploader ID is required']
  },
  
  // Clinic Reference
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: false // Made optional to handle cases where clinic ID is not available
  },
  
  // Image Details
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true
  },
  
  // Image metadata
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
  },
  
  // Image Classification
  imageType: {
    type: String,
    required: [true, 'Image type is required'],
    enum: [
      'X-Ray',
      'CT Scan',
      'MRI',
      'Ultrasound',
      'Blood Test',
      'Lab Report',
      'Prescription',
      'Medical Report',
      'Surgical Photo',
      'Wound Photo',
      'Skin Condition',
      'Other'
    ]
  },
  
  // Body part or area (for medical images)
  bodyPart: {
    type: String,
    trim: true,
    enum: [
      'Head', 'Neck', 'Chest', 'Abdomen', 'Pelvis', 'Spine',
      'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg',
      'Left Hand', 'Right Hand', 'Left Foot', 'Right Foot',
      'Heart', 'Lungs', 'Liver', 'Kidney', 'Brain',
      'Full Body', 'Other', ''
    ]
  },
  
  // Description and notes
  title: {
    type: String,
    required: [true, 'Image title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Medical context
  associatedDiagnosis: {
    type: String,
    trim: true,
    maxlength: [500, 'Associated diagnosis cannot exceed 500 characters']
  },
  
  // Date when the image was taken (different from upload date)
  imageTakenDate: {
    type: Date,
    default: Date.now
  },
  
  // Status and visibility
  status: {
    type: String,
    enum: ['Active', 'Archived', 'Deleted'],
    default: 'Active'
  },
  
  isPrivate: {
    type: Boolean,
    default: false
  },
  
  // Tags for better organization
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  // Cloudinary specific fields
  cloudinaryPublicId: {
    type: String,
    trim: true
  },
  
  cloudinaryUrl: {
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

// Indexes for better query performance
medicalImageSchema.index({ patientId: 1 });
medicalImageSchema.index({ uploadedBy: 1 });
medicalImageSchema.index({ clinicId: 1 });
medicalImageSchema.index({ imageType: 1 });
medicalImageSchema.index({ status: 1 });
medicalImageSchema.index({ createdAt: -1 });

// Compound indexes
medicalImageSchema.index({ patientId: 1, imageType: 1 });
medicalImageSchema.index({ patientId: 1, status: 1 });
medicalImageSchema.index({ patientId: 1, createdAt: -1 });

// Virtual for image age
medicalImageSchema.virtual('imageAge').get(function() {
  return Math.floor((Date.now() - this.imageTakenDate) / (1000 * 60 * 60 * 24));
});

// Static method to find images by patient
medicalImageSchema.statics.findByPatient = function(patientId, options = {}) {
  const query = { patientId, status: 'Active' };
  
  if (options.imageType) {
    query.imageType = options.imageType;
  }
  
  if (options.bodyPart) {
    query.bodyPart = options.bodyPart;
  }
  
  return this.find(query)
    .populate('uploadedBy', 'fullName specialty')
    .sort({ createdAt: -1 });
};

// Static method to find images by type
medicalImageSchema.statics.findByType = function(imageType, options = {}) {
  const query = { imageType, status: 'Active' };
  
  if (options.patientId) {
    query.patientId = options.patientId;
  }
  
  return this.find(query)
    .populate('patientId', 'fullName uhid')
    .populate('uploadedBy', 'fullName specialty')
    .sort({ createdAt: -1 });
};

// Instance method to archive image
medicalImageSchema.methods.archive = function() {
  this.status = 'Archived';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to restore image
medicalImageSchema.methods.restore = function() {
  this.status = 'Active';
  this.updatedAt = new Date();
  return this.save();
};

// Pre-save middleware to update updatedAt
medicalImageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('MedicalImage', medicalImageSchema);
