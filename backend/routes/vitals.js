const express = require('express');
const { body, validationResult } = require('express-validator');
const Vitals = require('../models/Vitals');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const router = express.Router();

// Helper function to get user details based on role
const getUserDetails = async (userId, role) => {
  let user = null;
  switch (role) {
    case 'doctor':
      user = await Doctor.findById(userId).select('fullName');
      break;
    case 'nurse':
    case 'head_nurse':
    case 'supervisor':
      user = await Nurse.findById(userId).select('fullName');
      break;
    case 'clinic':
      user = await Clinic.findById(userId).select('fullName adminName name');
      break;
  }
  
  if (user) {
    return user.fullName || user.adminName || user.name || 'Unknown User';
  }
  return 'Unknown User';
};

// GET /api/vitals/patient/:patientId - Get all vitals for a patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Role-based filtering for doctors
    if (req.user.role === 'doctor') {
      const patientAssignedToDr = await Patient.findOne({
        _id: patientId,
        assignedDoctors: req.user.id
      });
      
      if (!patientAssignedToDr) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Patient not assigned to you.'
        });
      }
    }

    // Build query with clinic filtering if needed
    const query = { patientId };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const vitals = await Vitals.find(query)
      .sort({ visitDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('patientId', 'fullName uhid');

    const total = await Vitals.countDocuments(query);

    res.json({
      success: true,
      data: vitals,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching patient vitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient vitals',
      error: error.message
    });
  }
});

// GET /api/vitals/:id - Get single vitals record
router.get('/:id', auth, async (req, res) => {
  try {
    const vitals = await Vitals.findById(req.params.id)
      .populate('patientId', 'fullName uhid email phone');

    if (!vitals) {
      return res.status(404).json({
        success: false,
        message: 'Vitals record not found'
      });
    }

    // Role-based access control
    if (req.user.role === 'doctor') {
      const patient = await Patient.findOne({
        _id: vitals.patientId._id,
        assignedDoctors: req.user.id
      });
      
      if (!patient) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: vitals
    });
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vitals record',
      error: error.message
    });
  }
});

// Validation middleware for creating vitals
const validateVitals = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('uhid').optional().trim().isLength({ min: 1 }).withMessage('UHID must not be empty if provided'),
  body('visitDate').optional().isISO8601().withMessage('Valid visit date is required'),
  body('vitalSigns.height.value').optional().isFloat({ min: 0, max: 300 }).withMessage('Height must be between 0-300 cm'),
  body('vitalSigns.weight.value').optional().isFloat({ min: 0, max: 500 }).withMessage('Weight must be between 0-500 kg'),
  body('vitalSigns.bloodPressure.systolic').optional().isInt({ min: 50, max: 300 }).withMessage('Systolic BP must be between 50-300 mmHg'),
  body('vitalSigns.bloodPressure.diastolic').optional().isInt({ min: 30, max: 200 }).withMessage('Diastolic BP must be between 30-200 mmHg'),
  body('vitalSigns.heartRate.value').optional().isInt({ min: 30, max: 200 }).withMessage('Heart rate must be between 30-200 bpm'),
  body('vitalSigns.respiratoryRate.value').optional().isInt({ min: 8, max: 60 }).withMessage('Respiratory rate must be between 8-60 breaths/min'),
  body('vitalSigns.temperature.value').optional().isFloat({ min: 30, max: 45 }).withMessage('Temperature must be between 30-45°C'),
  body('vitalSigns.oxygenSaturation.value').optional().isInt({ min: 70, max: 100 }).withMessage('Oxygen saturation must be between 70-100%')
];

// POST /api/vitals - Create new vitals record
router.post('/', auth, validateVitals, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { patientId, uhid, visitDate, vitalSigns, clinicalNotes, isPreConsultation, status } = req.body;

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Role-based access control for doctors
    if (req.user.role === 'doctor') {
      const patientAssignedToDr = await Patient.findOne({
        _id: patientId,
        assignedDoctors: req.user.id
      });
      
      if (!patientAssignedToDr) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Patient not assigned to you.'
        });
      }
    }

    // Get user details for recording
    const recordedByName = await getUserDetails(req.user.id, req.user.role);

    // Get clinicId based on user role
    let clinicId;
    if (req.user.role === 'clinic') {
      clinicId = req.user.id;
    } else {
      // For doctors and nurses, get clinicId from patient record
      clinicId = patient.clinicId;
    }

    // Create vitals record
    const vitals = new Vitals({
      patientId,
      uhid: uhid || patient.uhid,
      recordedBy: req.user.id,
      recordedByName,
      recordedByRole: req.user.role,
      clinicId,
      visitDate: visitDate || new Date(),
      vitalSigns: vitalSigns || {},
      clinicalNotes: clinicalNotes || {},
      isPreConsultation: isPreConsultation !== undefined ? isPreConsultation : true,
      status: status || 'Draft'
    });

    await vitals.save();

    // Populate patient info for response
    await vitals.populate('patientId', 'fullName uhid');

    res.status(201).json({
      success: true,
      message: 'Vitals record created successfully',
      data: vitals
    });
  } catch (error) {
    console.error('Error creating vitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vitals record',
      error: error.message
    });
  }
});

// PUT /api/vitals/:id - Update vitals record
router.put('/:id', auth, validateVitals, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const vitals = await Vitals.findById(req.params.id);
    if (!vitals) {
      return res.status(404).json({
        success: false,
        message: 'Vitals record not found'
      });
    }

    // Role-based access control
    if (req.user.role === 'doctor') {
      const patient = await Patient.findOne({
        _id: vitals.patientId,
        assignedDoctors: req.user.id
      });
      
      if (!patient) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const { visitDate, vitalSigns, clinicalNotes, isPreConsultation, status } = req.body;

    // Update fields
    if (visitDate) vitals.visitDate = visitDate;
    if (vitalSigns) vitals.vitalSigns = { ...vitals.vitalSigns, ...vitalSigns };
    if (clinicalNotes) vitals.clinicalNotes = { ...vitals.clinicalNotes, ...clinicalNotes };
    if (isPreConsultation !== undefined) vitals.isPreConsultation = isPreConsultation;
    if (status) vitals.status = status;

    await vitals.save();
    await vitals.populate('patientId', 'fullName uhid');

    res.json({
      success: true,
      message: 'Vitals record updated successfully',
      data: vitals
    });
  } catch (error) {
    console.error('Error updating vitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vitals record',
      error: error.message
    });
  }
});

// DELETE /api/vitals/:id - Delete vitals record
router.delete('/:id', auth, async (req, res) => {
  try {
    const vitals = await Vitals.findById(req.params.id);
    if (!vitals) {
      return res.status(404).json({
        success: false,
        message: 'Vitals record not found'
      });
    }

    // Role-based access control
    if (req.user.role === 'doctor') {
      const patient = await Patient.findOne({
        _id: vitals.patientId,
        assignedDoctors: req.user.id
      });
      
      if (!patient) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await Vitals.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Vitals record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vitals record',
      error: error.message
    });
  }
});

// GET /api/vitals/patient/:patientId/latest - Get latest vitals for a patient
router.get('/patient/:patientId/latest', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Verify patient exists and access
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Role-based filtering for doctors and clinic admins
    if (req.user.role === 'doctor') {
      const patientAssignedToDr = await Patient.findOne({
        _id: patientId,
        assignedDoctors: req.user.id
      });
      
      if (!patientAssignedToDr) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Patient not assigned to you.'
        });
      }
    } else if (req.user.role === 'clinic') {
      const patientInClinic = await Patient.findOne({
        _id: patientId,
        clinicId: req.user.id
      });
      
      if (!patientInClinic) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Patient not in your clinic.'
        });
      }
    }

    // Build query with clinic filtering if needed
    const query = { patientId };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const limit = req.query.limit || 10;
    const page = req.query.page || 1;

    const vitals = await Vitals.find(query)
      .sort({ visitDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('patientId', 'fullName uhid');

    const total = await Vitals.countDocuments(query);

    res.json({
      success: true,
      data: vitals,
      pagination: {
        total,
        limit,
        page
      }
    });
  } catch (error) {
    console.error('Error fetching latest vitals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest vitals',
      error: error.message
    });
  }
});

module.exports = router;
