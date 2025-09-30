const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');
const { doctorUpload, deleteFromCloudinary, extractPublicId } = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// GET /api/doctors - Get all doctors (both active and inactive)
router.get('/', auth, async (req, res) => {
  try {
    // Filter doctors by clinic for clinic admins
    const query = {};
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const doctors = await Doctor.find(query)
      .select('fullName email specialty phone role profileImage uhid qualification currentAddress permanentAddress about isActive createdAt')
      .sort({ isActive: -1, fullName: 1 }); // Show active doctors first
    
    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// GET /api/doctors/clinic/:clinicId - Get doctors by clinic ID
router.get('/clinic/:clinicId', auth, async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    const doctors = await Doctor.find({ 
      clinicId: clinicId,
      isActive: true // Only get active doctors
    })
      .select('fullName email specialty phone role profileImage uhid qualification isActive')
      .sort({ fullName: 1 });
    
    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching doctors by clinic:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// GET /api/doctors/search - Search doctors by name or specialty
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Filter doctors by clinic for clinic admins
    const query = {
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { specialty: { $regex: q, $options: 'i' } }
      ]
    };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const doctors = await Doctor.find(query)
    .select('fullName email specialty phone role profileImage uhid qualification currentAddress permanentAddress about isActive createdAt')
    .sort({ isActive: -1, fullName: 1 }) // Show active doctors first
    .limit(20);
    
    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error searching doctors:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Validation middleware for creating doctors
const validateDoctor = [
  body('fullName').trim().isLength({ min: 1, max: 100 }).withMessage('Full name is required and must be less than 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('specialty').optional().trim().isLength({ max: 100 }).withMessage('Specialty cannot exceed 100 characters'),
  body('phone').optional().trim().isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10-15 characters'),
  body('role').optional().isIn(['doctor', 'admin']).withMessage('Role must be either doctor or admin'),
  body('uhid').trim().isLength({ min: 1, max: 50 }).withMessage('UHID is required and must be less than 50 characters'),
  body('qualification').trim().isLength({ min: 1, max: 200 }).withMessage('Qualification is required and must be less than 200 characters'),
  body('currentAddress').custom((value) => {
    if (!value) {
      throw new Error('Current address is required');
    }
    let address;
    try {
      address = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      throw new Error('Invalid current address format');
    }
    if (!address.street || !address.street.trim()) {
      throw new Error('Current address street is required');
    }
    if (!address.city || !address.city.trim()) {
      throw new Error('Current address city is required');
    }
    if (!address.state || !address.state.trim()) {
      throw new Error('Current address state is required');
    }
    if (!address.zipCode || !address.zipCode.trim()) {
      throw new Error('Current address zip code is required');
    }
    return true;
  }),
  body('permanentAddress').custom((value) => {
    if (!value) {
      throw new Error('Permanent address is required');
    }
    let address;
    try {
      address = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      throw new Error('Invalid permanent address format');
    }
    if (!address.street || !address.street.trim()) {
      throw new Error('Permanent address street is required');
    }
    if (!address.city || !address.city.trim()) {
      throw new Error('Permanent address city is required');
    }
    if (!address.state || !address.state.trim()) {
      throw new Error('Permanent address state is required');
    }
    if (!address.zipCode || !address.zipCode.trim()) {
      throw new Error('Permanent address zip code is required');
    }
    return true;
  }),
  body('about').optional().trim().isLength({ max: 1000 }).withMessage('About section cannot exceed 1000 characters')
];

// POST /api/doctors - Create new doctor
router.post('/', auth, doctorUpload.single('profileImage'), validateDoctor, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if profile image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile image is required'
      });
    }

    const { 
      fullName, 
      email, 
      password, 
      specialty, 
      phone, 
      role, 
      uhid, 
      qualification, 
      currentAddress, 
      permanentAddress, 
      about 
    } = req.body;

    // Check if doctor with email already exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this email already exists'
      });
    }

    // Check if doctor with UHID already exists
    const existingUHID = await Doctor.findOne({ uhid: uhid.toUpperCase() });
    if (existingUHID) {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this UHID already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new doctor
    const doctor = new Doctor({
      fullName,
      email,
      passwordHash,
      specialty: specialty || 'General Practitioner',
      phone,
      profileImage: req.file.path, // Cloudinary URL
      uhid: uhid.toUpperCase(),
      qualification,
      currentAddress: JSON.parse(currentAddress),
      permanentAddress: JSON.parse(permanentAddress),
      about,
      role: role || 'doctor',
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    });

    await doctor.save();

    // Return doctor without password hash
    const doctorResponse = {
      _id: doctor._id,
      fullName: doctor.fullName,
      email: doctor.email,
      specialty: doctor.specialty,
      phone: doctor.phone,
      profileImage: doctor.profileImage,
      uhid: doctor.uhid,
      qualification: doctor.qualification,
      currentAddress: doctor.currentAddress,
      permanentAddress: doctor.permanentAddress,
      about: doctor.about,
      role: doctor.role,
      isActive: doctor.isActive,
      createdAt: doctor.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      data: doctorResponse
    });
  } catch (error) {
    console.error('Error creating doctor:', error);
    
    // Clean up uploaded file if doctor creation failed
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create doctor',
      error: error.message
    });
  }
});

// GET /api/doctors/:id - Get single doctor
router.get('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const doctor = await Doctor.findOne(query)
      .select('fullName email specialty phone role profileImage uhid qualification currentAddress permanentAddress about isActive createdAt');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor',
      error: error.message
    });
  }
});

// PUT /api/doctors/:id - Update doctor
router.put('/:id', auth, async (req, res) => {
  try {
    const allowedUpdates = ['fullName', 'specialty', 'phone', 'role', 'isActive', 'uhid', 'qualification', 'currentAddress', 'permanentAddress', 'about'];
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

    const doctor = await Doctor.findOneAndUpdate(
      query,
      updates,
      { new: true, runValidators: true }
    ).select('fullName email specialty phone role profileImage uhid qualification currentAddress permanentAddress about isActive createdAt updatedAt');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      data: doctor
    });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update doctor',
      error: error.message
    });
  }
});

// PATCH /api/doctors/:id/activate - Activate doctor
router.patch('/:id/activate', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const doctor = await Doctor.findOneAndUpdate(
      query,
      { isActive: true, updatedAt: new Date() },
      { new: true }
    ).select('fullName email specialty phone role profileImage uhid qualification currentAddress permanentAddress about isActive');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor activated successfully',
      data: doctor
    });
  } catch (error) {
    console.error('Error activating doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate doctor',
      error: error.message
    });
  }
});

// PATCH /api/doctors/:id/deactivate - Deactivate doctor
router.patch('/:id/deactivate', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const doctor = await Doctor.findOneAndUpdate(
      query,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).select('fullName email specialty phone role profileImage uhid qualification currentAddress permanentAddress about isActive');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor deactivated successfully',
      data: doctor
    });
  } catch (error) {
    console.error('Error deactivating doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate doctor',
      error: error.message
    });
  }
});

// DELETE /api/doctors/:id - Soft delete doctor (kept for backward compatibility)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const doctor = await Doctor.findOneAndUpdate(
      query,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).select('fullName email specialty phone role profileImage uhid qualification currentAddress permanentAddress about isActive');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor deactivated successfully',
      data: doctor
    });
  } catch (error) {
    console.error('Error deactivating doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate doctor',
      error: error.message
    });
  }
});

module.exports = router;
