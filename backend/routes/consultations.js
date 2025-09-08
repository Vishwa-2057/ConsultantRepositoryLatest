const express = require('express');
const { body, validationResult } = require('express-validator');
const Consultation = require('../models/Consultation');
const Patient = require('../models/Patient');
const router = express.Router();

// Validation middleware
const validateConsultation = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('patientName').trim().isLength({ min: 1 }).withMessage('Patient name is required'),
  body('consultationType').isIn(['General', 'Specialist', 'Follow-up', 'Emergency', 'Telemedicine']).withMessage('Valid consultation type is required'),
  body('mode').isIn(['In-person', 'Video', 'Phone', 'Chat']).withMessage('Valid consultation mode is required'),
  body('date').isISO8601().withMessage('Valid consultation date is required'),
  body('time').trim().isLength({ min: 1 }).withMessage('Consultation time is required'),
  body('duration').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes')
];

// GET /api/consultations - Get all consultations with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      date = '',
      patientId = '',
      consultationType = '',
      mode = '',
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (consultationType && consultationType !== 'all') {
      query.consultationType = consultationType;
    }
    
    if (mode && mode !== 'all') {
      query.mode = mode;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const consultations = await Consultation.find(query)
      .populate('patientId', 'fullName phone email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const total = await Consultation.countDocuments(query);

    res.json({
      consultations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalConsultations: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/consultations/:id - Get consultation by ID
router.get('/:id', async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('patientId', 'fullName phone email address')
      .select('-__v');
    
    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }
    
    res.json(consultation);
  } catch (error) {
    console.error('Error fetching consultation:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid consultation ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/consultations - Create new consultation
router.post('/', validateConsultation, async (req, res) => {
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
    const patient = await Patient.findById(req.body.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Create new consultation
    const consultation = new Consultation(req.body);
    await consultation.save();

    const populatedConsultation = await Consultation.findById(consultation._id)
      .populate('patientId', 'fullName phone email');

    res.status(201).json({
      message: 'Consultation created successfully',
      consultation: populatedConsultation
    });
  } catch (error) {
    console.error('Error creating consultation:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/consultations/:id - Update consultation
router.put('/:id', validateConsultation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if consultation exists
    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Update consultation
    const updatedConsultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('patientId', 'fullName phone email')
    .select('-__v');

    res.json({
      message: 'Consultation updated successfully',
      consultation: updatedConsultation
    });
  } catch (error) {
    console.error('Error updating consultation:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid consultation ID' });
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

// DELETE /api/consultations/:id - Delete consultation
router.delete('/:id', async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id);
    
    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    await Consultation.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Consultation deleted successfully' });
  } catch (error) {
    console.error('Error deleting consultation:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid consultation ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/consultations/:id/status - Update consultation status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'No Show'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    consultation.status = status;
    consultation.updatedAt = new Date();
    await consultation.save();

    const updatedConsultation = await Consultation.findById(req.params.id)
      .populate('patientId', 'fullName phone email');

    res.json({
      message: 'Consultation status updated successfully',
      consultation: updatedConsultation
    });
  } catch (error) {
    console.error('Error updating consultation status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid consultation ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/consultations/stats/summary - Get consultation statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalConsultations = await Consultation.countDocuments();
    
    // Get consultations by type
    const typeStats = await Consultation.aggregate([
      {
        $group: {
          _id: '$consultationType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get consultations by mode
    const modeStats = await Consultation.aggregate([
      {
        $group: {
          _id: '$mode',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get consultations by status
    const statusStats = await Consultation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalConsultations,
      typeStats,
      modeStats,
      statusStats
    });
  } catch (error) {
    console.error('Error fetching consultation stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
