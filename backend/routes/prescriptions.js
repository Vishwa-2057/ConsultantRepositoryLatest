const express = require('express');
const { body, validationResult } = require('express-validator');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const ActivityLogger = require('../utils/activityLogger');
const router = express.Router();

// Validation middleware
const validatePrescription = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('diagnosis').trim().isLength({ min: 1, max: 500 }).withMessage('Diagnosis is required and must be less than 500 characters'),
  body('medications').isArray({ min: 1 }).withMessage('At least one medication is required'),
  body('medications.*.name').trim().isLength({ min: 1 }).withMessage('Medication name is required'),
  body('medications.*.dosage').trim().isLength({ min: 1 }).withMessage('Medication dosage is required'),
  body('medications.*.frequency').trim().isLength({ min: 1 }).withMessage('Medication frequency is required'),
  body('medications.*.duration').trim().isLength({ min: 1 }).withMessage('Medication duration is required'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
  body('followUpInstructions').optional().isLength({ max: 500 }).withMessage('Follow-up instructions cannot exceed 500 characters')
];

// GET /api/prescriptions - Get all prescriptions with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      patientId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      // Find patients assigned to this doctor
      const assignedPatients = await Patient.find({ assignedDoctors: req.user.id }).select('_id');
      const assignedPatientIds = assignedPatients.map(patient => patient._id);
      
      // Show prescriptions where doctor is the prescribing doctor OR prescriptions for patients assigned to the doctor
      query.$or = [
        { doctorId: req.user.id },
        { patientId: { $in: assignedPatientIds } }
      ];
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const prescriptions = await Prescription.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('patientId', 'fullName age gender phone email')
      .populate('doctorId', 'fullName specialty')
      .select('-__v');

    // Apply search filter after population if needed
    let filteredPrescriptions = prescriptions;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filteredPrescriptions = prescriptions.filter(prescription => 
        searchRegex.test(prescription.prescriptionNumber) ||
        searchRegex.test(prescription.diagnosis) ||
        (prescription.patientId && searchRegex.test(prescription.patientId.fullName)) ||
        (prescription.doctorId && searchRegex.test(prescription.doctorId.fullName)) ||
        prescription.medications.some(med => searchRegex.test(med.name))
      );
    }

    // Get total count for pagination
    const total = await Prescription.countDocuments(query);

    res.json({
      prescriptions: filteredPrescriptions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPrescriptions: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prescriptions/:id - Get prescription by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // For doctors, we don't need additional filtering here since we're already looking at a specific prescription
    if (req.user.role === 'doctor') {
      const prescription = await Prescription.findById(req.params.id).select('patientId');
      if (prescription) {
        // Check if this patient is assigned to the doctor
        const isAssigned = await Patient.exists({ 
          _id: prescription.patientId, 
          assignedDoctors: req.user.id 
        });
        
        if (!isAssigned) {
          // If not assigned, only show prescriptions where this doctor is the prescribing doctor
          query.doctorId = req.user.id;
        }
        // If assigned, show the prescription regardless of who prescribed it
      } else {
        // If prescription not found, restrict to doctor's own prescriptions
        query.doctorId = req.user.id;
      }
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const prescription = await Prescription.findOne(query)
      .populate('patientId', 'fullName age gender phone email address medicalHistory')
      .populate('doctorId', 'fullName specialty phone email')
      .select('-__v');
    
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    
    res.json(prescription);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid prescription ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/prescriptions - Create new prescription
router.post('/', auth, validatePrescription, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Verify patient exists and doctor has access
    const patient = await Patient.findById(req.body.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Role-based access control and validation
    if (req.user.role === 'doctor') {
      // Check if doctor is assigned to this patient
      if (!patient.assignedDoctors.includes(req.user.id)) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this patient.' });
      }
    } else if (req.user.role === 'clinic') {
      // Clinic admins must provide a doctorId
      if (!req.body.doctorId) {
        return res.status(400).json({ error: 'Doctor ID is required for clinic administrators.' });
      }
    }

    // Create new prescription
    const prescriptionData = {
      ...req.body,
      // For clinic admins, use the selected doctorId; for doctors, use their own ID
      doctorId: req.user.role === 'clinic' ? req.body.doctorId : req.user.id,
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    };

    const prescription = new Prescription(prescriptionData);
    await prescription.save();

    // Populate the saved prescription
    await prescription.populate('patientId', 'fullName age gender phone email');
    await prescription.populate('doctorId', 'fullName specialty');

    // Log prescription creation activity
    try {
      // Get current user details for logging
      let currentUser = null;
      if (req.user.role === 'clinic') {
        currentUser = await Clinic.findById(req.user.id);
      } else if (req.user.role === 'doctor') {
        currentUser = await Doctor.findById(req.user.id);
      }

      // Get clinic name for logging
      let clinicName = 'Unknown Clinic';
      if (prescription.clinicId) {
        const clinic = await Clinic.findById(prescription.clinicId);
        if (clinic) {
          clinicName = clinic.name || clinic.fullName || 'Unknown Clinic';
        }
      }

      const doctor = await Doctor.findById(prescription.doctorId);

      if (currentUser && doctor) {
        await ActivityLogger.logPrescriptionActivity(
          'prescription_created',
          prescription,
          patient,
          doctor,
          {
            id: req.user.id,
            fullName: currentUser.fullName || currentUser.name,
            email: currentUser.email,
            role: req.user.role
          },
          req,
          clinicName
        );
      }
    } catch (logError) {
      console.error('Failed to log prescription creation:', logError);
      // Don't fail the prescription creation if logging fails
    }

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription: prescription.toJSON()
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/prescriptions/:id - Update prescription
router.put('/:id', auth, validatePrescription, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const query = { _id: req.params.id };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    // Check if prescription exists
    const prescription = await Prescription.findOne(query);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Update prescription
    const updatedPrescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('patientId', 'fullName age gender phone email')
    .populate('doctorId', 'fullName specialty')
    .select('-__v');

    res.json({
      message: 'Prescription updated successfully',
      prescription: updatedPrescription
    });
  } catch (error) {
    console.error('Error updating prescription:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid prescription ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/prescriptions/:id/status - Update prescription status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Active', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const query = { _id: req.params.id };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // For nursing roles, get the nurse's clinic and filter by clinicId
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      console.log('Nurse lookup result:', nurse);
      console.log('Nurse clinicId:', nurse?.clinicId);
      
      if (nurse && nurse.clinicId) {
        query.clinicId = nurse.clinicId;
      } else {
        console.error('Nurse clinic info missing:', { nurseId: req.user.id, nurse: nurse });
        return res.status(403).json({ 
          error: 'Access denied. Nurse clinic information not found.',
          debug: { nurseFound: !!nurse, hasClinicId: !!(nurse?.clinicId) }
        });
      }
    }

    const prescription = await Prescription.findOne(query);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    prescription.status = status;
    prescription.updatedAt = new Date();
    await prescription.save();

    res.json({
      message: 'Prescription status updated successfully',
      prescription: prescription.toJSON()
    });
  } catch (error) {
    console.error('Error updating prescription status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid prescription ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/prescriptions/:id - Delete prescription
router.delete('/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const prescription = await Prescription.findOne(query);
    
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    await Prescription.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid prescription ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prescriptions/stats/summary - Get prescription statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // Build base query for role-based filtering
    const baseQuery = {};
    if (req.user.role === 'doctor') {
      baseQuery.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      baseQuery.clinicId = req.user.id;
    }
    
    const totalPrescriptions = await Prescription.countDocuments(baseQuery);
    const activePrescriptions = await Prescription.countDocuments({ ...baseQuery, status: 'Active' });
    const completedPrescriptions = await Prescription.countDocuments({ ...baseQuery, status: 'Completed' });
    const cancelledPrescriptions = await Prescription.countDocuments({ ...baseQuery, status: 'Cancelled' });
    
    // Get recent prescriptions
    const recentPrescriptions = await Prescription.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patientId', 'fullName')
      .populate('doctorId', 'fullName')
      .select('prescriptionNumber diagnosis status createdAt');

    res.json({
      totalPrescriptions,
      activePrescriptions,
      completedPrescriptions,
      cancelledPrescriptions,
      recentPrescriptions
    });
  } catch (error) {
    console.error('Error fetching prescription stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prescriptions/patient/:patientId - Get prescriptions for a specific patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const query = { patientId };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      // Check if this patient is assigned to the doctor
      const isAssigned = await Patient.exists({ 
        _id: patientId, 
        assignedDoctors: req.user.id 
      });
      
      if (!isAssigned) {
        // If not assigned, only show prescriptions where this doctor is the prescribing doctor
        query.doctorId = req.user.id;
      }
      // If assigned, show all prescriptions for this patient regardless of who prescribed them
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .populate('doctorId', 'fullName specialty')
      .select('-__v');

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
