const express = require('express');
const { body, validationResult } = require('express-validator');
const ComplianceAlert = require('../models/ComplianceAlert');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateComplianceAlert = [
  body('type').isIn(['Medication', 'Appointment', 'Lab Results', 'Billing', 'Compliance', 'Follow-up', 'Treatment']).withMessage('Valid alert type is required'),
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('patientName').trim().isLength({ min: 1, max: 100 }).withMessage('Patient name is required and must be less than 100 characters'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message is required and must be less than 1000 characters'),
  body('priority').isIn(['Low', 'Medium', 'High', 'Critical']).withMessage('Valid priority is required'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  body('category').optional().trim().isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters')
];

// GET /api/compliance-alerts - Get all compliance alerts with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      type = '',
      priority = '',
      status = 'Active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    // Role-based filtering: doctors only see alerts for their assigned patients
    if (req.user.role === 'doctor') {
      // Use aggregation to filter by patient's assignedDoctors array
      const patientIds = await Patient.find(
        { assignedDoctors: req.user.id },
        { _id: 1 }
      ).distinct('_id');
      query.patientId = { $in: patientIds };
    } else if (req.user.role === 'clinic') {
      // Clinic admins only see alerts for their clinic
      query.clinicId = req.user.id;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const alerts = await ComplianceAlert.find(query)
      .populate('patientId', 'fullName phone email')
      .populate('createdBy', 'fullName')
      .populate('assignedTo', 'fullName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ComplianceAlert.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: alerts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAlerts: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching compliance alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance alerts',
      error: error.message
    });
  }
});

// GET /api/compliance-alerts/stats - Get compliance alerts statistics
router.get('/stats', auth, async (req, res) => {
  try {
    // Role-based filtering for stats
    let matchStage = {};
    if (req.user.role === 'doctor') {
      const patientIds = await Patient.find(
        { assignedDoctors: req.user.id },
        { _id: 1 }
      ).distinct('_id');
      matchStage = { patientId: { $in: patientIds } };
    } else if (req.user.role === 'clinic') {
      matchStage = { clinicId: req.user.id };
    }
    
    const stats = await ComplianceAlert.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
          acknowledged: { $sum: { $cond: [{ $eq: ['$status', 'Acknowledged'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          dismissed: { $sum: { $cond: [{ $eq: ['$status', 'Dismissed'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', 'Medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$priority', 'Low'] }, 1, 0] } }
        }
      }
    ]);

    const typeStats = await ComplianceAlert.aggregate([
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const overview = stats[0] || {
      total: 0,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      dismissed: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    // Calculate compliance rate: (resolved + dismissed) / total * 100
    // If no alerts exist, default to 100% compliance
    let complianceRate = 100;
    if (overview.total > 0) {
      const compliantAlerts = overview.resolved + overview.dismissed;
      complianceRate = Math.round((compliantAlerts / overview.total) * 100 * 10) / 10; // Round to 1 decimal place
    }

    res.json({
      success: true,
      data: {
        overview: {
          ...overview,
          complianceRate
        },
        byType: typeStats
      }
    });
  } catch (error) {
    console.error('Error fetching compliance alerts stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance alerts statistics',
      error: error.message
    });
  }
});

// GET /api/compliance-alerts/:id - Get single compliance alert
router.get('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // Role-based filtering: doctors can only access alerts for their assigned patients
    if (req.user.role === 'doctor') {
      const patientIds = await Patient.find(
        { assignedDoctors: req.user.id },
        { _id: 1 }
      ).distinct('_id');
      query.patientId = { $in: patientIds };
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const alert = await ComplianceAlert.findOne(query)
      .populate('patientId', 'fullName phone email')
      .populate('createdBy', 'fullName')
      .populate('assignedTo', 'fullName')
      .populate('resolvedBy', 'fullName');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Compliance alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error fetching compliance alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance alert',
      error: error.message
    });
  }
});

// POST /api/compliance-alerts - Create new compliance alert
router.post('/', auth, validateComplianceAlert, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    // Verify patient exists
    const patient = await Patient.findById(req.body.patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Create alert with clinic reference
    const alertData = {
      ...req.body,
      patientName: patient.fullName, // Ensure patient name matches
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    };

    const alert = new ComplianceAlert(alertData);
    await alert.save();

    // Populate the created alert
    await alert.populate([
      { path: 'patientId', select: 'fullName phone email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Compliance alert created successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error creating compliance alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create compliance alert',
      error: error.message
    });
  }
});

// PUT /api/compliance-alerts/:id - Update compliance alert
router.put('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['title', 'message', 'priority', 'status', 'category', 'dueDate', 'assignedTo'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    let query = { _id: req.params.id };
    
    // Role-based filtering: doctors can only update alerts for their assigned patients
    if (req.user.role === 'doctor') {
      const patientIds = await Patient.find(
        { assignedDoctors: req.user.id },
        { _id: 1 }
      ).distinct('_id');
      query.patientId = { $in: patientIds };
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const alert = await ComplianceAlert.findOneAndUpdate(
      query,
      updates,
      { new: true, runValidators: true }
    ).populate('patientId', 'fullName phone email')
     .populate('createdBy', 'fullName')
     .populate('assignedTo', 'fullName');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Compliance alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Compliance alert updated successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error updating compliance alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update compliance alert',
      error: error.message
    });
  }
});

// PATCH /api/compliance-alerts/:id/status - Update alert status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    
    if (!['Active', 'Acknowledged', 'Resolved', 'Dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const updateData = { status };
    
    if (status === 'Resolved') {
      updateData.resolvedAt = new Date();
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
    }

    let query = { _id: req.params.id };
    
    // Role-based filtering: doctors can only update alerts for their assigned patients
    if (req.user.role === 'doctor') {
      const patientIds = await Patient.find(
        { assignedDoctors: req.user.id },
        { _id: 1 }
      ).distinct('_id');
      query.patientId = { $in: patientIds };
    }

    const alert = await ComplianceAlert.findOneAndUpdate(
      query,
      updateData,
      { new: true, runValidators: true }
    ).populate('patientId', 'fullName phone email')
     .populate('createdBy', 'fullName')
     .populate('resolvedBy', 'fullName');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Compliance alert not found'
      });
    }

    res.json({
      success: true,
      message: `Compliance alert ${status.toLowerCase()} successfully`,
      data: alert
    });
  } catch (error) {
    console.error('Error updating compliance alert status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update compliance alert status',
      error: error.message
    });
  }
});

// DELETE /api/compliance-alerts/:id - Delete compliance alert
router.delete('/:id', auth, async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // Role-based filtering: doctors can only delete alerts for their assigned patients
    if (req.user.role === 'doctor') {
      const patientIds = await Patient.find(
        { assignedDoctors: req.user.id },
        { _id: 1 }
      ).distinct('_id');
      query.patientId = { $in: patientIds };
    }
    
    const alert = await ComplianceAlert.findOneAndDelete(query);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Compliance alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Compliance alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting compliance alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete compliance alert',
      error: error.message
    });
  }
});

// GET /api/compliance-alerts/patient/:patientId - Get alerts for specific patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    let query = { 
      patientId: req.params.patientId,
      status: { $ne: 'Dismissed' }
    };
    
    // Role-based filtering: doctors can only access alerts for their assigned patients
    if (req.user.role === 'doctor') {
      const patientIds = await Patient.find(
        { assignedDoctors: req.user.id },
        { _id: 1 }
      ).distinct('_id');
      
      // Check if the requested patient is assigned to this doctor
      if (!patientIds.map(id => id.toString()).includes(req.params.patientId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Patient not assigned to you.'
        });
      }
    }
    
    const alerts = await ComplianceAlert.find(query)
    .populate('patientId', 'fullName phone email')
    .populate('createdBy', 'fullName')
    .populate('assignedTo', 'fullName')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching patient compliance alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient compliance alerts',
      error: error.message
    });
  }
});

module.exports = router;
