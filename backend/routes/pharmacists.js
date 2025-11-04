const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Pharmacist = require('../models/Pharmacist');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const { pharmacistUpload, deleteFromCloudinary, extractPublicId } = require('../config/cloudinary');
const ActivityLogger = require('../utils/activityLogger');
const fs = require('fs');
const router = express.Router();

// GET /api/pharmacists - Get all pharmacists (with optional activeOnly filter)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 100, search, activeOnly } = req.query;
    
    // Filter pharmacists by clinic for clinic admins
    const query = {};
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    // Filter for active pharmacists only if requested (for forms/dropdowns)
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { specialization: searchRegex },
        { uhid: searchRegex },
        { phone: searchRegex }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Pharmacist.countDocuments(query);
    
    const pharmacists = await Pharmacist.find(query)
      .select('fullName uhid profileImage email specialization shift phone licenseNumber experience role isActive createdAt')
      .sort({ isActive: -1, fullName: 1 }) // Show active pharmacists first
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: pharmacists,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        pageSize: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching pharmacists:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// GET /api/pharmacists/search - Search pharmacists by name or specialization
router.get('/search', auth, async (req, res) => {
  try {
    const { q, activeOnly } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Filter pharmacists by clinic for clinic admins
    const query = {
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { specialization: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { uhid: { $regex: q, $options: 'i' } }
      ]
    };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    // Filter for active pharmacists only if requested (for forms/dropdowns)
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    
    const pharmacists = await Pharmacist.find(query)
    .select('fullName uhid profileImage email specialization shift phone licenseNumber experience role isActive createdAt')
    .sort({ isActive: -1, fullName: 1 }) // Show active pharmacists first
    .limit(20);
    
    res.json({
      success: true,
      data: pharmacists
    });
  } catch (error) {
    console.error('Error searching pharmacists:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Validation middleware for creating pharmacists
const validatePharmacist = [
  body('fullName').trim().isLength({ min: 1, max: 100 }).withMessage('Full name is required and must be less than 100 characters'),
  body('uhid').trim().isLength({ min: 1, max: 50 }).withMessage('UHID is required and must be less than 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('licenseNumber').trim().isLength({ min: 1, max: 50 }).withMessage('License number is required and cannot exceed 50 characters'),
  body('specialization').optional().trim().isLength({ max: 100 }).withMessage('Specialization cannot exceed 100 characters'),
  body('shift').optional().isIn(['Day', 'Night', 'Evening', 'Rotating']).withMessage('Shift must be Day, Night, Evening, or Rotating'),
  body('phone').optional().trim().isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10-15 characters'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a positive number'),
  body('role').optional().isIn(['pharmacist', 'head_pharmacist', 'pharmacy_manager']).withMessage('Role must be pharmacist, head_pharmacist, or pharmacy_manager')
];

// POST /api/pharmacists/upload-image - Upload pharmacist profile image
router.post('/upload-image', auth, pharmacistUpload.single('profileImage'), async (req, res) => {
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

// POST /api/pharmacists/create-with-image - Create new pharmacist with pre-uploaded image URL
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
    if (!req.body.licenseNumber || !req.body.licenseNumber.trim()) {
      validationErrors.push('License number is required');
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

    const { fullName, uhid, email, password, specialization, shift, phone, licenseNumber, experience, role, profileImage } = req.body;

    // Check if pharmacist with email already exists
    const existingPharmacist = await Pharmacist.findOne({ email });
    if (existingPharmacist) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacist with this email already exists'
      });
    }

    // Check if pharmacist with same UHID already exists
    const existingUHID = await Pharmacist.findOne({ uhid: uhid.toUpperCase() });
    if (existingUHID) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacist with this UHID already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new pharmacist
    const pharmacist = new Pharmacist({
      fullName,
      uhid: uhid.toUpperCase(),
      profileImage, // Use the provided image URL
      email,
      passwordHash,
      specialization: specialization || 'General Pharmacy',
      shift: shift || 'Day',
      phone,
      licenseNumber,
      experience: experience || 0,
      role: role || 'pharmacist',
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    });

    await pharmacist.save();

    // Log pharmacist creation activity
    try {
      console.log('🔍 Starting pharmacist creation activity logging...');
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
      } else if (req.user.role === 'pharmacist' || req.user.role === 'head_pharmacist') {
        currentUser = await Pharmacist.findById(req.user.id);
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
        console.log('📝 Creating pharmacist_created activity log with clinicId:', userForLog.clinicId);
        await ActivityLogger.logStaffActivity(
          'pharmacist_created',
          pharmacist,
          userForLog,
          req,
          clinicName
        );
      } else {
        console.log('❌ Current user not found for pharmacist creation logging');
      }
    } catch (logError) {
      console.error('❌ Failed to log pharmacist creation:', logError);
      console.error('   Error message:', logError.message);
      console.error('   Error stack:', logError.stack);
    }

    // Return pharmacist without password hash
    const pharmacistResponse = {
      _id: pharmacist._id,
      fullName: pharmacist.fullName,
      uhid: pharmacist.uhid,
      profileImage: pharmacist.profileImage,
      email: pharmacist.email,
      specialization: pharmacist.specialization,
      shift: pharmacist.shift,
      phone: pharmacist.phone,
      licenseNumber: pharmacist.licenseNumber,
      experience: pharmacist.experience,
      role: pharmacist.role,
      isActive: pharmacist.isActive,
      createdAt: pharmacist.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Pharmacist created successfully',
      data: pharmacistResponse
    });
  } catch (error) {
    console.error('Error creating pharmacist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pharmacist',
      error: error.message
    });
  }
});

// POST /api/pharmacists - Create new pharmacist (legacy endpoint with file upload)
router.post('/', auth, pharmacistUpload.single('profileImage'), async (req, res) => {
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
    if (!req.body.licenseNumber || !req.body.licenseNumber.trim()) {
      validationErrors.push('License number is required');
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

    const { fullName, uhid, email, password, specialization, shift, phone, licenseNumber, experience, role } = req.body;

    // Check if pharmacist with email already exists
    const existingPharmacist = await Pharmacist.findOne({ email });
    if (existingPharmacist) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacist with this email already exists'
      });
    }

    // Check if pharmacist with same UHID already exists
    const existingUHID = await Pharmacist.findOne({ uhid: uhid.toUpperCase() });
    if (existingUHID) {
      return res.status(400).json({
        success: false,
        message: 'Pharmacist with this UHID already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new pharmacist
    const pharmacist = new Pharmacist({
      fullName,
      uhid: uhid.toUpperCase(),
      profileImage: req.file.path, // Cloudinary URL
      email,
      passwordHash,
      specialization: specialization || 'General Pharmacy',
      shift: shift || 'Day',
      phone,
      licenseNumber,
      experience: experience || 0,
      role: role || 'pharmacist',
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    });

    await pharmacist.save();

    // Return pharmacist without password hash
    const pharmacistResponse = {
      _id: pharmacist._id,
      fullName: pharmacist.fullName,
      uhid: pharmacist.uhid,
      profileImage: pharmacist.profileImage,
      email: pharmacist.email,
      specialization: pharmacist.specialization,
      shift: pharmacist.shift,
      phone: pharmacist.phone,
      licenseNumber: pharmacist.licenseNumber,
      experience: pharmacist.experience,
      role: pharmacist.role,
      isActive: pharmacist.isActive,
      createdAt: pharmacist.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Pharmacist created successfully',
      data: pharmacistResponse
    });
  } catch (error) {
    console.error('Error creating pharmacist:', error);
    
    // Clean up uploaded file if pharmacist creation failed
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create pharmacist',
      error: error.message
    });
  }
});

// GET /api/pharmacists/:id - Get single pharmacist
router.get('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const pharmacist = await Pharmacist.findOne(query)
      .select('fullName uhid profileImage email specialization shift phone licenseNumber experience role isActive createdAt');

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacist not found'
      });
    }

    res.json({
      success: true,
      data: pharmacist
    });
  } catch (error) {
    console.error('Error fetching pharmacist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pharmacist',
      error: error.message
    });
  }
});

// PUT /api/pharmacists/:id - Update pharmacist
router.put('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['fullName', 'specialization', 'shift', 'phone', 'licenseNumber', 'experience', 'role', 'isActive'];
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

    const pharmacist = await Pharmacist.findOneAndUpdate(
      query,
      updates,
      { new: true, runValidators: true }
    ).select('fullName uhid profileImage email specialization shift phone licenseNumber experience role isActive createdAt updatedAt');

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacist not found'
      });
    }

    res.json({
      success: true,
      message: 'Pharmacist updated successfully',
      data: pharmacist
    });
  } catch (error) {
    console.error('Error updating pharmacist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pharmacist',
      error: error.message
    });
  }
});

// PATCH /api/pharmacists/:id/activate - Activate pharmacist
router.patch('/:id/activate', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const pharmacist = await Pharmacist.findOneAndUpdate(
      query,
      { isActive: true, updatedAt: new Date() },
      { new: true }
    ).select('fullName uhid profileImage email specialization shift phone licenseNumber experience role isActive');

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacist not found'
      });
    }

    // Log pharmacist activation activity
    try {
      console.log('🔍 Starting pharmacist activation activity logging...');
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
      } else if (req.user.role === 'pharmacist' || req.user.role === 'head_pharmacist') {
        currentUser = await Pharmacist.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
        console.log('   Found pharmacist user:', currentUser?.fullName);
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
          'pharmacist_activated',
          pharmacist,
          userForLog,
          req,
          clinicName
        );
        console.log('   ✅ Activity log result:', result ? 'Success' : 'Failed');
      } else {
        console.log('   ❌ Current user not found!');
      }
    } catch (logError) {
      console.error('❌ Failed to log pharmacist activation:', logError);
      console.error('   Error message:', logError.message);
      console.error('   Error stack:', logError.stack);
    }

    res.json({
      success: true,
      message: 'Pharmacist activated successfully',
      data: pharmacist
    });
  } catch (error) {
    console.error('Error activating pharmacist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate pharmacist',
      error: error.message
    });
  }
});

// PATCH /api/pharmacists/:id/deactivate - Deactivate pharmacist
router.patch('/:id/deactivate', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const pharmacist = await Pharmacist.findOneAndUpdate(
      query,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).select('fullName uhid profileImage email specialization shift phone licenseNumber experience role isActive');

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacist not found'
      });
    }

    // Log pharmacist deactivation activity
    try {
      console.log('🔍 Starting pharmacist deactivation activity logging...');
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
      } else if (req.user.role === 'pharmacist' || req.user.role === 'head_pharmacist') {
        currentUser = await Pharmacist.findById(req.user.id);
        if (currentUser?.clinicId) {
          const clinic = await Clinic.findById(currentUser.clinicId);
          clinicName = clinic?.name || clinic?.fullName || 'Unknown Clinic';
        }
        console.log('   Found pharmacist user:', currentUser?.fullName);
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
          'pharmacist_deactivated',
          pharmacist,
          userForLog,
          req,
          clinicName
        );
        console.log('   ✅ Activity log result:', result ? 'Success' : 'Failed');
      } else {
        console.log('   ❌ Current user not found!');
      }
    } catch (logError) {
      console.error('❌ Failed to log pharmacist deactivation:', logError);
      console.error('   Error message:', logError.message);
      console.error('   Error stack:', logError.stack);
    }

    res.json({
      success: true,
      message: 'Pharmacist deactivated successfully',
      data: pharmacist
    });
  } catch (error) {
    console.error('Error deactivating pharmacist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate pharmacist',
      error: error.message
    });
  }
});

// DELETE /api/pharmacists/:id - Soft delete pharmacist (kept for backward compatibility)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const pharmacist = await Pharmacist.findOneAndUpdate(
      query,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).select('fullName uhid profileImage email specialization shift phone licenseNumber experience role isActive');

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacist not found'
      });
    }

    res.json({
      success: true,
      message: 'Pharmacist deactivated successfully',
      data: pharmacist
    });
  } catch (error) {
    console.error('Error deactivating pharmacist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate pharmacist',
      error: error.message
    });
  }
});

module.exports = router;
