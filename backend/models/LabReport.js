const mongoose = require('mongoose');

const labReportSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },
  testName: {
    type: String,
    required: true,
    trim: true
  },
  testDate: {
    type: Date,
    required: true
  },
  labName: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  cloudinaryPublicId: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number
  },
  fileType: {
    type: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'uploadedByModel',
    required: true
  },
  uploadedByModel: {
    type: String,
    required: true,
    enum: ['Clinic', 'Doctor', 'Nurse']
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying
labReportSchema.index({ patientId: 1, testDate: -1 });
labReportSchema.index({ clinicId: 1, uploadedAt: -1 });

// Static method to get reports for a patient
labReportSchema.statics.getPatientReports = async function(patientId, options = {}) {
  const query = { patientId };
  
  if (options.startDate || options.endDate) {
    query.testDate = {};
    if (options.startDate) query.testDate.$gte = new Date(options.startDate);
    if (options.endDate) query.testDate.$lte = new Date(options.endDate);
  }

  return this.find(query)
    .populate('uploadedBy', 'fullName email')
    .sort({ testDate: -1, uploadedAt: -1 })
    .limit(options.limit || 100);
};

// Static method to get reports for a clinic
labReportSchema.statics.getClinicReports = async function(clinicId, options = {}) {
  const query = { clinicId };
  
  if (options.startDate || options.endDate) {
    query.uploadedAt = {};
    if (options.startDate) query.uploadedAt.$gte = new Date(options.startDate);
    if (options.endDate) query.uploadedAt.$lte = new Date(options.endDate);
  }

  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  return this.find(query)
    .populate('patientId', 'fullName phone email uhid')
    .populate('uploadedBy', 'fullName email')
    .sort({ uploadedAt: -1 })
    .skip(skip)
    .limit(limit);
};

const LabReport = mongoose.model('LabReport', labReportSchema);

module.exports = LabReport;
