const express = require('express');
const { body, validationResult } = require('express-validator');
const Patient = require('../models/Patient');
const router = express.Router();

// Validation middleware
const validatePatient = [
  body('fullName').trim().isLength({ min: 1, max: 100 }).withMessage('Full name is required and must be less than 100 characters'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['Male', 'Female', 'Other', 'Prefer not to say']).withMessage('Valid gender selection is required'),
  body('phone').trim().isLength({ min: 1 }).withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Valid email address is required'),
  body('address.street').trim().isLength({ min: 1 }).withMessage('Street address is required'),
  body('address.city').trim().isLength({ min: 1 }).withMessage('City is required'),
  body('address.state').trim().isLength({ min: 1 }).withMessage('State is required'),
  body('address.zipCode').trim().isLength({ min: 1 }).withMessage('ZIP code is required')
];

// GET /api/patients - Get all patients with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const patients = await Patient.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const total = await Patient.countDocuments(query);

    res.json({
      patients,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPatients: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id - Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('-__v');
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients - Create new patient
router.post('/', validatePatient, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if patient with same phone already exists
    const existingPatient = await Patient.findOne({ phone: req.body.phone });
    if (existingPatient) {
      return res.status(400).json({ error: 'Patient with this phone number already exists' });
    }

    // Create new patient
    const patient = new Patient(req.body);
    await patient.save();

    res.status(201).json({
      message: 'Patient created successfully',
      patient: patient.toJSON()
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/patients/:id - Update patient
router.put('/:id', validatePatient, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if patient exists
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check if phone number is being changed and if it conflicts with another patient
    if (req.body.phone && req.body.phone !== patient.phone) {
      const existingPatient = await Patient.findOne({ 
        phone: req.body.phone,
        _id: { $ne: req.params.id }
      });
      if (existingPatient) {
        return res.status(400).json({ error: 'Patient with this phone number already exists' });
      }
    }

    // Update patient
    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-__v');

    res.json({
      message: 'Patient updated successfully',
      patient: updatedPatient
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid patient ID' });
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

// DELETE /api/patients/:id - Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await Patient.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/patients/:id/status - Update patient status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Active', 'Inactive', 'Follow-up', 'Completed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    patient.status = status;
    patient.updatedAt = new Date();
    await patient.save();

    res.json({
      message: 'Patient status updated successfully',
      patient: patient.toJSON()
    });
  } catch (error) {
    console.error('Error updating patient status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/stats/summary - Get patient statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const activePatients = await Patient.countDocuments({ status: 'Active' });
    const followUpPatients = await Patient.countDocuments({ status: 'Follow-up' });
    const completedPatients = await Patient.countDocuments({ status: 'Completed' });
    
    // Get patients by age groups
    const ageGroups = await Patient.aggregate([
      {
        $group: {
          _id: {
            $cond: {
              if: { $lt: ['$age', 18] },
              then: 'Under 18',
              else: {
                $cond: {
                  if: { $lt: ['$age', 65] },
                  then: '18-64',
                  else: '65+'
                }
              }
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalPatients,
      activePatients,
      followUpPatients,
      completedPatients,
      ageGroups
    });
  } catch (error) {
    console.error('Error fetching patient stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/search/quick - Quick search patients
router.get('/search/quick', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const patients = await Patient.find({
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('fullName phone email status age')
    .limit(10);

    res.json(patients);
  } catch (error) {
    console.error('Error in quick search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
