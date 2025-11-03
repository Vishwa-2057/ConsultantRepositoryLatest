const express = require('express');
const router = express.Router();
const LabReport = require('../models/LabReport');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const { labReportUpload, deleteFromCloudinary, extractPublicId } = require('../config/cloudinary');

// Cloudinary storage is configured in config/cloudinary.js

// Helper function to get clinic ID
const getClinicId = async (user) => {
  if (user.role === 'clinic') {
    return user.id;
  } else if (user.role === 'doctor') {
    const doctor = await Doctor.findById(user.id).select('clinicId');
    return doctor?.clinicId;
  } else if (user.role === 'nurse' || user.role === 'head_nurse' || user.role === 'supervisor') {
    const nurse = await Nurse.findById(user.id).select('clinicId');
    return nurse?.clinicId;
  }
  return null;
};

// Helper function to get uploader model name
const getUploaderModel = (role) => {
  if (role === 'clinic') return 'Clinic';
  if (role === 'doctor') return 'Doctor';
  if (role === 'nurse' || role === 'head_nurse' || role === 'supervisor') return 'Nurse';
  return null;
};

// POST /api/lab-reports - Upload a new lab report
router.post('/', auth, labReportUpload.single('file'), async (req, res) => {
  try {
    const { patientId, testName, testDate, labName, notes } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!patientId || !testName || !testDate) {
      // Delete uploaded file from Cloudinary if validation fails
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename).catch(console.error);
      }
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename).catch(console.error);
      }
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    // Verify patient exists and belongs to the clinic
    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      if (req.file && req.file.filename) {
        await deleteFromCloudinary(req.file.filename).catch(console.error);
      }
      return res.status(404).json({ error: 'Patient not found or does not belong to your clinic' });
    }

    // Create lab report with Cloudinary data
    const labReport = new LabReport({
      patientId,
      clinicId,
      testName,
      testDate: new Date(testDate),
      labName,
      notes,
      fileName: req.file.originalname,
      filePath: req.file.path, // Cloudinary URL
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      cloudinaryPublicId: req.file.filename, // Store Cloudinary public ID for deletion
      uploadedBy: req.user.id,
      uploadedByModel: getUploaderModel(req.user.role)
    });

    await labReport.save();

    res.status(201).json({
      message: 'Lab report uploaded successfully',
      report: labReport
    });
  } catch (error) {
    console.error('Error uploading lab report:', error);
    // Clean up uploaded file from Cloudinary on error
    if (req.file && req.file.filename) {
      await deleteFromCloudinary(req.file.filename).catch(console.error);
    }
    res.status(500).json({ error: 'Failed to upload lab report', message: error.message });
  }
});

// GET /api/lab-reports/patient/:patientId - Get all reports for a patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    // Verify patient belongs to the clinic
    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found or does not belong to your clinic' });
    }

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const reports = await LabReport.getPatientReports(patientId, options);

    res.json({
      reports,
      count: reports.length
    });
  } catch (error) {
    console.error('Error fetching lab reports:', error);
    res.status(500).json({ error: 'Failed to fetch lab reports', message: error.message });
  }
});

// GET /api/lab-reports - Get all reports for the clinic
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit)
    };
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const reports = await LabReport.getClinicReports(clinicId, options);
    const totalCount = await LabReport.countDocuments({ clinicId });

    res.json({
      reports,
      pagination: {
        currentPage: options.page,
        totalPages: Math.ceil(totalCount / options.limit),
        totalReports: totalCount,
        limit: options.limit
      }
    });
  } catch (error) {
    console.error('Error fetching lab reports:', error);
    res.status(500).json({ error: 'Failed to fetch lab reports', message: error.message });
  }
});

// GET /api/lab-reports/:id - Get a specific report
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    const report = await LabReport.findOne({ _id: id, clinicId })
      .populate('patientId', 'fullName phone email')
      .populate('uploadedBy', 'fullName email');

    if (!report) {
      return res.status(404).json({ error: 'Lab report not found' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Error fetching lab report:', error);
    res.status(500).json({ error: 'Failed to fetch lab report', message: error.message });
  }
});

// GET /api/lab-reports/:id/download - Download a report file
router.get('/:id/download', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    const report = await LabReport.findOne({ _id: id, clinicId });

    if (!report) {
      return res.status(404).json({ error: 'Lab report not found' });
    }

    // Redirect to Cloudinary URL for download
    // Cloudinary URLs are publicly accessible and can be downloaded directly
    res.redirect(report.filePath);
  } catch (error) {
    console.error('Error downloading lab report:', error);
    res.status(500).json({ error: 'Failed to download lab report', message: error.message });
  }
});

// DELETE /api/lab-reports/:id - Delete a lab report
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    const report = await LabReport.findOne({ _id: id, clinicId });

    if (!report) {
      return res.status(404).json({ error: 'Lab report not found' });
    }

    // Delete file from Cloudinary
    if (report.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(report.cloudinaryPublicId);
      } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    await LabReport.deleteOne({ _id: id });

    res.json({ message: 'Lab report deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab report:', error);
    res.status(500).json({ error: 'Failed to delete lab report', message: error.message });
  }
});

// PUT /api/lab-reports/:id - Update a lab report (metadata only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { testName, testDate, labName, notes } = req.body;

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    const report = await LabReport.findOne({ _id: id, clinicId });

    if (!report) {
      return res.status(404).json({ error: 'Lab report not found' });
    }

    // Update fields
    if (testName) report.testName = testName;
    if (testDate) report.testDate = new Date(testDate);
    if (labName !== undefined) report.labName = labName;
    if (notes !== undefined) report.notes = notes;

    await report.save();

    res.json({
      message: 'Lab report updated successfully',
      report
    });
  } catch (error) {
    console.error('Error updating lab report:', error);
    res.status(500).json({ error: 'Failed to update lab report', message: error.message });
  }
});

module.exports = router;
