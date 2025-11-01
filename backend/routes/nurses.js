const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Nurse = require('../models/Nurse');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const { nurseUpload, deleteFromCloudinary, extractPublicId } = require('../config/cloudinary');
const ActivityLogger = require('../utils/activityLogger');
const fs = require('fs');
const router = express.Router();

// GET /api/nurses - Get all nurses (with optional activeOnly filter)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 100, search, activeOnly } = req.query;
    
    // Filter nurses by clinic for clinic admins
    const query = {};
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    // Filter for active nurses only if requested (for forms/dropdowns)
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { uhid: searchRegex },
        { phone: searchRegex }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Nurse.countDocuments(query);
    
    const nurses = await Nurse.find(query)
      .select('fullName uhid profileImage email department shift phone licenseNumber experience role isActive createdAt')
      .sort({ isActive: -1, fullName: 1 }) // Show active nurses first
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: nurses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching nurses:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// GET /api/nurses/search - Search nurses by name or department
router.get('/search', auth, async (req, res) => {
  try {
    const { q, activeOnly } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Filter nurses by clinic for clinic admins
    const query = {
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } }
      ]
    };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    // Filter for active nurses only if requested (for forms/dropdowns)
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    const nurses = await Nurse.find(query)
    .select('fullName email department shift phone licenseNumber experience role isActive createdAt')
    .sort({ isActive: -1, fullName: 1 }) // Show active nurses first
    .limit(20);
    
    res.json({
      success: true,
      data: nurses
    });
  } catch (error) {
    console.error('Error searching nurses:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Validation middleware for creating nurses
const validateNurse = [
  body('fullName').trim().isLength({ min: 1, max: 100 }).withMessage('Full name is required and must be less than 100 characters'),
  body('uhid').trim().isLength({ min: 1, max: 50 }).withMessage('UHID is required and must be less than 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('department').optional().trim().isLength({ max: 100 }).withMessage('Department cannot exceed 100 characters'),
  body('shift').optional().isIn(['Day', 'Night', 'Evening', 'Rotating']).withMessage('Shift must be Day, Night, Evening, or Rotating'),
  body('phone').optional().trim().isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10-15 characters'),
  body('licenseNumber').optional().trim().isLength({ max: 50 }).withMessage('License number cannot exceed 50 characters'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a positive number'),
  body('role').optional().isIn(['nurse', 'head_nurse', 'supervisor']).withMessage('Role must be nurse, head_nurse, or supervisor')
];

// POST /api/nurses/upload-image - Upload nurse profile image
router.post('/upload-image', auth, nurseUpload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: req.file.path // Cloudinary URL
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// POST /api/nurses/create-with-image - Create new nurse with pre-uploaded image URL
router.post('/create-with-image', auth, async (req, res) => {
  try {
    // Manual validation for required fields
    const validationErrors = [];
    
    if (!req.body.fullName || !req.body.fullName.trim()) {
      validationErrors.push('Full name is required');
    }
    if (!req.body.uhid || !req.body.uhid.trim()) {
      validationErrors.push('UHID is required');
    }
    if (!req.body.email || !req.body.email.trim()) {
      validationErrors.push('Email is required');
    }
    if (!req.body.password || req.body.password.length < 6) {
      validationErrors.push('Password must be at least 6 characters long');
    }
    if (!req.body.profileImage) {
      validationErrors.push('Profile image URL is required');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: validationErrors
      });
    }

    const { fullName, uhid, email, password, department, shift, phone, licenseNumber, experience, role, profileImage } = req.body;

    // Check if nurse with email already exists
    const existingNurse = await Nurse.findOne({ email });
    if (existingNurse) {
      return res.status(400).json({
        success: false,
        message: 'Nurse with this email already exists'
      });
    }

    // Check if nurse with same UHID already exists
    const existingUHID = await Nurse.findOne({ uhid: uhid.toUpperCase() });
    if (existingUHID) {
      return res.status(400).json({
        success: false,
        message: 'Nurse with this UHID already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new nurse
    const nurse = new Nurse({
      fullName,
      uhid: uhid.toUpperCase(),
      profileImage, // Use the provided image URL
      email,
      passwordHash,
      department: department || 'General Nursing',
      shift: shift || 'Day',
      phone,
      licenseNumber,
      experience: experience || 0,
      role: role || 'nurse',
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    });

    await nurse.save();

    // Log nurse creation activity
    try {
      console.log('🔍 Starting nurse creation activity logging...');
      console.log('   User ID:', req.user.id);
      console.log('   User Role:', req.user.role);
      
      let currentUser = null;
      let clinicName = 'Unknown Clinic';
      
      // Try to find user based on role
      if (req.user.role === 'clinic') {
        currentUser = await Clinic.findById(req.user.id);
        clinicName = currentUser?.name || currentUser?.fullName || 'Unknown Clinic';
      } else if (req.user.role === 'doctor') {
        currentUser = await Doctor.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
      } else if (req.user.role === 'nurse' || req.user.role === 'head_nurse') {
        currentUser = await Nurse.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
      }

      if (currentUser) {
        const userForLog = {
          id: currentUser._id,
          fullName: currentUser.fullName || currentUser.name,
          email: currentUser.email || currentUser.adminEmail,
          role: req.user.role,
          clinicId: req.user.role === 'clinic' ? req.user.id : (currentUser.clinicId || req.user.id)
        };
        console.log('📝 Creating nurse_created activity log with clinicId:', userForLog.clinicId);
        await ActivityLogger.logStaffActivity(
          'nurse_created',
          nurse,
          userForLog,
          req,
          clinicName
        );
      } else {
        console.log('❌ Current user not found for nurse creation logging');
      }
    } catch (logError) {
      console.error('❌ Failed to log nurse creation:', logError);
      console.error('   Error message:', logError.message);
      console.error('   Error stack:', logError.stack);
    }

    // Return nurse without password hash
    const nurseResponse = {
      _id: nurse._id,
      fullName: nurse.fullName,
      uhid: nurse.uhid,
      profileImage: nurse.profileImage,
      email: nurse.email,
      department: nurse.department,
      shift: nurse.shift,
      phone: nurse.phone,
      licenseNumber: nurse.licenseNumber,
      experience: nurse.experience,
      role: nurse.role,
      isActive: nurse.isActive,
      createdAt: nurse.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Nurse created successfully',
      data: nurseResponse
    });
  } catch (error) {
    console.error('Error creating nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create nurse',
      error: error.message
    });
  }
});

// POST /api/nurses - Create new nurse (legacy endpoint with file upload)
router.post('/', auth, nurseUpload.single('profileImage'), async (req, res) => {
  try {
    // Manual validation for required fields
    const validationErrors = [];
    
    if (!req.body.fullName || !req.body.fullName.trim()) {
      validationErrors.push('Full name is required');
    }
    if (!req.body.uhid || !req.body.uhid.trim()) {
      validationErrors.push('UHID is required');
    }
    if (!req.body.email || !req.body.email.trim()) {
      validationErrors.push('Email is required');
    }
    if (!req.body.password || req.body.password.length < 6) {
      validationErrors.push('Password must be at least 6 characters long');
    }
    if (!req.file) {
      validationErrors.push('Profile image is required');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: validationErrors
      });
    }

    const { fullName, uhid, email, password, department, shift, phone, licenseNumber, experience, role } = req.body;

    // Check if nurse with email already exists
    const existingNurse = await Nurse.findOne({ email });
    if (existingNurse) {
      return res.status(400).json({
        success: false,
        message: 'Nurse with this email already exists'
      });
    }

    // Check if nurse with same UHID already exists
    const existingUHID = await Nurse.findOne({ uhid: uhid.toUpperCase() });
    if (existingUHID) {
      return res.status(400).json({
        success: false,
        message: 'Nurse with this UHID already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new nurse
    const nurse = new Nurse({
      fullName,
      uhid: uhid.toUpperCase(),
      profileImage: req.file.path, // Cloudinary URL
      email,
      passwordHash,
      department: department || 'General Nursing',
      shift: shift || 'Day',
      phone,
      licenseNumber,
      experience: experience || 0,
      role: role || 'nurse',
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    });

    await nurse.save();

    // Return nurse without password hash
    const nurseResponse = {
      _id: nurse._id,
      fullName: nurse.fullName,
      uhid: nurse.uhid,
      profileImage: nurse.profileImage,
      email: nurse.email,
      department: nurse.department,
      shift: nurse.shift,
      phone: nurse.phone,
      licenseNumber: nurse.licenseNumber,
      experience: nurse.experience,
      role: nurse.role,
      isActive: nurse.isActive,
      createdAt: nurse.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Nurse created successfully',
      data: nurseResponse
    });
  } catch (error) {
    console.error('Error creating nurse:', error);
    
    // Clean up uploaded file if nurse creation failed
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create nurse',
      error: error.message
    });
  }
});

// GET /api/nurses/:id - Get single nurse
router.get('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const nurse = await Nurse.findOne(query)
      .select('fullName email department shift phone licenseNumber experience role isActive createdAt');

    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }

    res.json({
      success: true,
      data: nurse
    });
  } catch (error) {
    console.error('Error fetching nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nurse',
      error: error.message
    });
  }
});

// PUT /api/nurses/:id - Update nurse
router.put('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['fullName', 'department', 'shift', 'phone', 'licenseNumber', 'experience', 'role', 'isActive'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    updates.updatedAt = new Date();

    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const nurse = await Nurse.findOneAndUpdate(
      query,
      updates,
      { new: true, runValidators: true }
    ).select('fullName email department shift phone licenseNumber experience role isActive createdAt updatedAt');

    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }

    res.json({
      success: true,
      message: 'Nurse updated successfully',
      data: nurse
    });
  } catch (error) {
    console.error('Error updating nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update nurse',
      error: error.message
    });
  }
});

// PATCH /api/nurses/:id/activate - Activate nurse
router.patch('/:id/activate', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const nurse = await Nurse.findOneAndUpdate(
      query,
      { isActive: true, updatedAt: new Date() },
      { new: true }
    ).select('fullName uhid profileImage email department shift phone licenseNumber experience role isActive');

    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }

    // Log nurse activation activity
    try {
      console.log('🔍 Starting nurse activation activity logging...');
      console.log('   User ID:', req.user.id);
      console.log('   User Role:', req.user.role);
      
      let currentUser = null;
      let clinicName = 'Unknown Clinic';
      
      // Try to find user based on role
      if (req.user.role === 'clinic') {
        currentUser = await Clinic.findById(req.user.id);
        clinicName = currentUser?.name || currentUser?.fullName || 'Unknown Clinic';
        console.log('   Found clinic user:', currentUser?.name);
      } else if (req.user.role === 'doctor') {
        currentUser = await Doctor.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
        console.log('   Found doctor user:', currentUser?.fullName);
      } else if (req.user.role === 'nurse' || req.user.role === 'head_nurse') {
        currentUser = await Nurse.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
        console.log('   Found nurse user:', currentUser?.fullName);
      }

      if (currentUser) {
        const userForLog = {
          id: currentUser._id,
          fullName: currentUser.fullName || currentUser.name,
          email: currentUser.email || currentUser.adminEmail,
          role: req.user.role,
          clinicId: req.user.role === 'clinic' ? req.user.id : (currentUser.clinicId || req.user.id)
        };
        console.log('   Calling ActivityLogger.logStaffActivity...');
        console.log('   ClinicId:', userForLog.clinicId);
        const result = await ActivityLogger.logStaffActivity(
          'nurse_activated',
          nurse,
          userForLog,
          req,
          clinicName
        );
        console.log('   ✅ Activity log result:', result ? 'Success' : 'Failed');
      } else {
        console.log('   ❌ Current user not found!');
      }
    } catch (logError) {
      console.error('❌ Failed to log nurse activation:', logError);
      console.error('   Error message:', logError.message);
      console.error('   Error stack:', logError.stack);
    }

    res.json({
      success: true,
      message: 'Nurse activated successfully',
      data: nurse
    });
  } catch (error) {
    console.error('Error activating nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate nurse',
      error: error.message
    });
  }
});

// PATCH /api/nurses/:id/deactivate - Deactivate nurse
router.patch('/:id/deactivate', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const nurse = await Nurse.findOneAndUpdate(
      query,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).select('fullName uhid profileImage email department shift phone licenseNumber experience role isActive');

    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }

    // Log nurse deactivation activity
    try {
      console.log('🔍 Starting nurse deactivation activity logging...');
      console.log('   User ID:', req.user.id);
      console.log('   User Role:', req.user.role);
      
      let currentUser = null;
      let clinicName = 'Unknown Clinic';
      
      // Try to find user based on role
      if (req.user.role === 'clinic') {
        currentUser = await Clinic.findById(req.user.id);
        clinicName = currentUser?.name || currentUser?.fullName || 'Unknown Clinic';
        console.log('   Found clinic user:', currentUser?.name);
      } else if (req.user.role === 'doctor') {
        currentUser = await Doctor.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
        console.log('   Found doctor user:', currentUser?.fullName);
      } else if (req.user.role === 'nurse' || req.user.role === 'head_nurse') {
        currentUser = await Nurse.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
        console.log('   Found nurse user:', currentUser?.fullName);
      }

      if (currentUser) {
        const userForLog = {
          id: currentUser._id,
          fullName: currentUser.fullName || currentUser.name,
          email: currentUser.email || currentUser.adminEmail,
          role: req.user.role,
          clinicId: req.user.role === 'clinic' ? req.user.id : (currentUser.clinicId || req.user.id)
        };
        console.log('   Calling ActivityLogger.logStaffActivity...');
        console.log('   ClinicId:', userForLog.clinicId);
        const result = await ActivityLogger.logStaffActivity(
          'nurse_deactivated',
          nurse,
          userForLog,
          req,
          clinicName
        );
        console.log('   ✅ Activity log result:', result ? 'Success' : 'Failed');
      } else {
        console.log('   ❌ Current user not found!');
      }
    } catch (logError) {
      console.error('❌ Failed to log nurse deactivation:', logError);
      console.error('   Error message:', logError.message);
      console.error('   Error stack:', logError.stack);
    }

    res.json({
      success: true,
      message: 'Nurse deactivated successfully',
      data: nurse
    });
  } catch (error) {
    console.error('Error deactivating nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate nurse',
      error: error.message
    });
  }
});

// DELETE /api/nurses/:id - Soft delete nurse (kept for backward compatibility)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const nurse = await Nurse.findOneAndUpdate(
      query,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).select('fullName email department shift phone licenseNumber experience role isActive');

    if (!nurse) {
      return res.status(404).json({
        success: false,
        message: 'Nurse not found'
      });
    }

    res.json({
      success: true,
      message: 'Nurse deactivated successfully',
      data: nurse
    });
  } catch (error) {
    console.error('Error deactivating nurse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate nurse',
      error: error.message
    });
  }
});

module.exports = router;
