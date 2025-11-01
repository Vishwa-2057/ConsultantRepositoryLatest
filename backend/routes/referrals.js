const express = require('express');
const { body, validationResult } = require('express-validator');
const Referral = require('../models/Referral');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const Nurse = require('../models/Nurse');
const emailService = require('../services/emailService');
const auth = require('../middleware/auth');
const ActivityLogger = require('../utils/activityLogger');
const router = express.Router();

// Test email endpoint
router.post('/test-email', auth, async (req, res) => {
  try {
    console.log('📧 Testing email service...');
    const testReferral = {
      _id: 'test-id',
      referralType: 'inbound',
      patientName: 'Test Patient',
      specialistName: 'Test Doctor',
      specialty: 'Cardiology',
      urgency: 'Medium',
      reason: 'Test referral for email functionality',
      createdAt: new Date(),
      specialistContact: {
        email: 'vishwa27032004@gmail.com' // Test email
      }
    };
    
    const emailResult = await emailService.sendReferralNotification(testReferral);
    res.json({
      success: emailResult.success,
      message: emailResult.success ? 'Test email sent successfully' : 'Failed to send test email',
      details: emailResult
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validation middleware
const validateReferral = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('patientName').trim().isLength({ min: 1 }).withMessage('Patient name is required'),
  body('specialistName').trim().isLength({ min: 1 }).withMessage('Specialist name is required'),
  body('specialty').trim().isLength({ min: 1 }).withMessage('Specialty is required'),
  body('urgency').isIn(['Low', 'Medium', 'High']).withMessage('Valid urgency level is required'),
  body('referralType').isIn(['inbound', 'outbound']).withMessage('Valid referral type is required'),
  body('externalClinic').optional().trim(),
  body('preferredDate').optional().isISO8601().withMessage('Valid preferred date is required')
];

// GET /api/referrals - Get all referrals with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      urgency = '',
      specialty = '',
      patientId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let referrals;
    let total;

    if (req.user.role === 'doctor') {
      // For doctors: show all referrals where they are involved (as referring or receiving doctor)
      const mongoose = require('mongoose');
      console.log('Fetching referrals for doctor ID:', req.user.id);
      
      // Build match conditions for filtering
      const matchConditions = {};
      
      if (status && status !== 'all') {
        if (status === 'not-completed') {
          matchConditions.status = { $ne: 'Completed' };
        } else {
          matchConditions.status = status;
        }
      }
      
      if (urgency && urgency !== 'all') {
        matchConditions.urgency = urgency;
      }
      
      if (specialty && specialty !== 'all') {
        matchConditions.specialty = specialty;
      }
      
      if (patientId) {
        matchConditions.patientId = new mongoose.Types.ObjectId(patientId);
      }

      // Build sort object
      const sortStage = {};
      sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Aggregation pipeline - show all referrals where doctor is involved
      const pipeline = [
        { $match: matchConditions },
        {
          $match: {
            $or: [
              // Show referrals where this doctor is the receiving specialist
              {
                specialistId: new mongoose.Types.ObjectId(req.user.id)
              },
              // Show referrals where this doctor is the referring doctor
              {
                referredBy: new mongoose.Types.ObjectId(req.user.id)
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $lookup: {
            from: 'doctors',
            localField: 'referredBy',
            foreignField: '_id',
            as: 'referredByDoctor'
          }
        },
        {
          $addFields: {
            patientId: { $arrayElemAt: ['$patient', 0] },
            referredBy: { $arrayElemAt: ['$referredByDoctor', 0] }
          }
        },
        {
          $project: {
            'patient': 0,
            'referredByDoctor': 0,
            '__v': 0,
            'patientId.assignedDoctors': 0,
            'patientId.medicalHistory': 0,
            'patientId.passwordHash': 0,
            'referredBy.passwordHash': 0
          }
        },
        { $sort: sortStage },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) }
      ];

      referrals = await Referral.aggregate(pipeline);
      console.log('Found', referrals.length, 'referrals for doctor');

      // Get total count for pagination
      const countPipeline = [
        { $match: matchConditions },
        {
          $match: {
            $or: [
              // Show referrals where this doctor is the receiving specialist
              {
                specialistId: new mongoose.Types.ObjectId(req.user.id)
              },
              // Show referrals where this doctor is the referring doctor
              {
                referredBy: new mongoose.Types.ObjectId(req.user.id)
              }
            ]
          }
        },
        { $count: 'total' }
      ];

      const countResult = await Referral.aggregate(countPipeline);
      total = countResult.length > 0 ? countResult[0].total : 0;

    } else {
      // For super admins and clinic admins: use regular query
      const query = {};
      
      // Clinic-based filtering: clinic admins can only see their clinic's referrals
      if (req.user.role === 'clinic') {
        query.clinicId = req.user.id;
      }
      
      if (status && status !== 'all') {
        if (status === 'not-completed') {
          query.status = { $ne: 'Completed' };
        } else {
          query.status = status;
        }
      }
      
      if (urgency && urgency !== 'all') {
        query.urgency = urgency;
      }
      
      if (specialty && specialty !== 'all') {
        query.specialty = specialty;
      }
      
      if (patientId) {
        query.patientId = patientId;
      }

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      referrals = await Referral.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('referredBy', 'fullName specialty phone email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-__v');

      // Get total count for pagination
      total = await Referral.countDocuments(query);
    }

    res.json({
      referrals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReferrals: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/referrals/:id - Get referral by ID
router.get('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const referral = await Referral.findOne(query)
      .populate('patientId', 'fullName phone email address')
      .populate('referredBy', 'fullName specialty phone email')
      .select('-__v');
    
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }
    
    res.json(referral);
  } catch (error) {
    console.error('Error fetching referral:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid referral ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/referrals - Create new referral
router.post('/', auth, validateReferral, async (req, res) => {
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

    // Create new referral with optional referredBy field and clinic reference
    // Determine clinic ID based on user role
    let clinicId;
    if (req.user.role === 'clinic') {
      clinicId = req.user.id;
    } else if (req.user.role === 'doctor' || req.user.role === 'nurse') {
      clinicId = req.user.clinicId || req.body.clinicId;
    } else {
      clinicId = req.body.clinicId;
    }
    
    const referralData = {
      ...req.body,
      clinicId: clinicId
    };

    // Optionally populate referredBy and referringProvider if user is a doctor
    if (req.user && req.user.id && req.user.role === 'doctor') {
      const Doctor = require('../models/Doctor');
      const loggedInDoctor = await Doctor.findById(req.user.id);
      if (loggedInDoctor) {
        referralData.referredBy = req.user.id;
        referralData.referringProvider = {
          name: loggedInDoctor.fullName,
          phone: loggedInDoctor.phone || '',
          email: loggedInDoctor.email || ''
        };
      }
    }
    
    console.log('Creating referral with data:', {
      specialistId: referralData.specialistId,
      referredBy: referralData.referredBy,
      referralType: referralData.referralType,
      clinicId: referralData.clinicId
    });
    
    const referral = new Referral(referralData);
    await referral.save();
    
    console.log('Referral created with ID:', referral._id, 'specialistId:', referral.specialistId, 'referredBy:', referral.referredBy);

    const populatedReferral = await Referral.findById(referral._id)
      .populate('patientId', 'fullName phone email')
      .populate('referredBy', 'fullName specialty phone email')
      .populate('specialistId', 'fullName specialty phone email');

    // Send email notification to appropriate doctor
    try {
      console.log(`📧 Attempting to send email notification for referral ${referral._id}`);
      console.log(`📧 Referral type: ${populatedReferral.referralType}`);
      console.log(`📧 Specialist ID: ${populatedReferral.specialistId}`);
      console.log(`📧 Specialist name: ${populatedReferral.specialistName}`);
      console.log(`📧 Specialist contact email: ${populatedReferral.specialistContact?.email}`);
      
      const emailResult = await emailService.sendReferralNotification(populatedReferral);
      if (emailResult.success) {
        console.log(`✅ Email notification sent for referral ${referral._id} to ${emailResult.recipient} (${emailResult.type})`);
      } else {
        console.warn(`⚠️ Failed to send email notification for referral ${referral._id}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error(`❌ Error sending email notification for referral ${referral._id}:`, emailError);
      console.error(`❌ Email error stack:`, emailError.stack);
      // Don't fail the referral creation if email fails
    }

    // Log referral creation activity
    try {
      let currentUser = null;
      let clinicName = 'Unknown Clinic';
      
      if (req.user.role === 'clinic') {
        currentUser = await Clinic.findById(req.user.id);
        clinicName = currentUser?.name || currentUser?.fullName || 'Unknown Clinic';
      } else if (req.user.role === 'doctor') {
        currentUser = await Doctor.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
        currentUser = await Nurse.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
      }

      if (currentUser) {
        await ActivityLogger.logReferralActivity(
          'referral_created',
          referral,
          patient,
          {
            id: currentUser._id,
            fullName: currentUser.fullName || currentUser.name,
            email: currentUser.email || currentUser.adminEmail,
            role: req.user.role,
            clinicId: req.user.role === 'clinic' ? req.user.id : (currentUser.clinicId || req.user.id)
          },
          req,
          clinicName
        );
      }
    } catch (logError) {
      console.error('Failed to log referral creation:', logError);
    }

    res.status(201).json({
      message: 'Referral created successfully',
      referral: populatedReferral
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/referrals/:id - Update referral
router.put('/:id', auth, validateReferral, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    // Check if referral exists
    const referral = await Referral.findOne(query);
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Update referral
    const updatedReferral = await Referral.findOneAndUpdate(
      query,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('patientId', 'fullName phone email')
    .populate('referredBy', 'fullName specialty phone email')
    .select('-__v');

    res.json({
      message: 'Referral updated successfully',
      referral: updatedReferral
    });
  } catch (error) {
    console.error('Error updating referral:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid referral ID' });
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

// DELETE /api/referrals/:id - Delete referral
router.delete('/:id', async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    await Referral.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Referral deleted successfully' });
  } catch (error) {
    console.error('Error deleting referral:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid referral ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/referrals/:id/status - Update referral status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Pending', 'Approved', 'In Progress', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    // Find referral first to check authorization
    let referral;
    
    if (req.user.role === 'doctor') {
      // For doctors: use aggregation to check if they have access to this referral via assigned patients
      const mongoose = require('mongoose');
      
      const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': new mongoose.Types.ObjectId(req.user.id)
          }
        }
      ];

      const results = await Referral.aggregate(pipeline);
      if (results.length === 0) {
        return res.status(403).json({ error: 'Access denied: You can only update referrals for patients assigned to you' });
      }
      
      referral = await Referral.findById(req.params.id);
    } else {
      // Super admins can update any referral
      referral = await Referral.findById(req.params.id);
    }

    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    referral.status = status;
    referral.updatedAt = new Date();
    await referral.save();

    const updatedReferral = await Referral.findById(req.params.id)
      .populate('patientId', 'fullName phone email')
      .populate('referredBy', 'fullName specialty phone email');

    // Log referral completion activity if status is Completed
    if (status === 'Completed') {
      try {
        let currentUser = null;
        let clinicName = 'Unknown Clinic';
        
        if (req.user.role === 'clinic') {
          currentUser = await Clinic.findById(req.user.id);
          clinicName = currentUser?.name || currentUser?.fullName || 'Unknown Clinic';
        } else if (req.user.role === 'doctor') {
          currentUser = await Doctor.findById(req.user.id);
          if (currentUser?.clinicId) {
            const clinic = await Clinic.findById(currentUser.clinicId);
            clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
          }
        } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
          currentUser = await Nurse.findById(req.user.id);
          if (currentUser?.clinicId) {
            const clinic = await Clinic.findById(currentUser.clinicId);
            clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
          }
        }

        if (currentUser) {
          await ActivityLogger.logReferralActivity(
            'referral_completed',
            updatedReferral,
            updatedReferral.patientId,
            {
              id: currentUser._id,
              fullName: currentUser.fullName || currentUser.name,
              email: currentUser.email || currentUser.adminEmail,
              role: req.user.role,
              clinicId: req.user.role === 'clinic' ? req.user.id : (currentUser.clinicId || req.user.id)
            },
            req,
            clinicName
          );
        }
      } catch (logError) {
        console.error('Failed to log referral completion:', logError);
      }
    }

    res.json({
      message: 'Referral status updated successfully',
      referral: updatedReferral
    });
  } catch (error) {
    console.error('Error updating referral status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid referral ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/referrals/stats/summary - Get referral statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // Build base query for role-based filtering
    const baseQuery = {};
    // Remove referredBy filtering since it's now optional
    
    const totalReferrals = await Referral.countDocuments(baseQuery);
    
    // Get referrals by status with role filtering
    const statusStats = await Referral.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get referrals by urgency with role filtering
    const urgencyStats = await Referral.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$urgency',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get referrals by specialty with role filtering
    const specialtyStats = await Referral.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$specialty',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalReferrals,
      statusStats,
      urgencyStats,
      specialtyStats
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/referrals/:id/generate-link - Generate shareable referral link
router.post('/:id/generate-link', async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    // Generate unique referral code
    const referralCode = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const shareableLink = `${req.protocol}://${req.get('host')}/shared-referral/${referralCode}`;
    
    // Update referral with shareable link info
    referral.shareableLink = {
      code: referralCode,
      url: shareableLink,
      generatedAt: new Date(),
      isActive: true,
      accessCount: 0
    };
    
    await referral.save();

    res.json({
      message: 'Referral link generated successfully',
      referralCode,
      shareableLink,
      generatedAt: referral.shareableLink.generatedAt
    });
  } catch (error) {
    console.error('Error generating referral link:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid referral ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/referrals/shared/:code - Get referral by shareable code
router.get('/shared/:code', async (req, res) => {
  try {
    const referral = await Referral.findOne({ 
      'shareableLink.code': req.params.code,
      'shareableLink.isActive': true 
    })
    .populate('patientId', 'fullName phone email')
    .select('-__v');
    
    if (!referral) {
      return res.status(404).json({ error: 'Referral link not found or expired' });
    }

    // Increment access count
    referral.shareableLink.accessCount += 1;
    referral.shareableLink.lastAccessedAt = new Date();
    await referral.save();
    
    res.json({
      referral: {
        id: referral._id,
        patientName: referral.patientName,
        specialistName: referral.specialistName,
        specialty: referral.specialty,
        reason: referral.reason,
        urgency: referral.urgency,
        status: referral.status,
        createdAt: referral.createdAt,
        preferredDate: referral.preferredDate
      },
      accessCount: referral.shareableLink.accessCount
    });
  } catch (error) {
    console.error('Error fetching shared referral:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/referrals/:id/deactivate-link - Deactivate shareable link
router.patch('/:id/deactivate-link', async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    if (!referral.shareableLink) {
      return res.status(400).json({ error: 'No shareable link found for this referral' });
    }

    referral.shareableLink.isActive = false;
    referral.shareableLink.deactivatedAt = new Date();
    await referral.save();

    res.json({
      message: 'Referral link deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating referral link:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid referral ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
