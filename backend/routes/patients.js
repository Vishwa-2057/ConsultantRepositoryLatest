const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const { canEditPatients } = require('../middleware/roleAuth');
// Try to load Cloudinary config, fallback to local upload if it fails
let patientCombinedUpload, deleteFromCloudinary, extractPublicId;
try {
  const cloudinaryConfig = require('../config/cloudinary');
  patientCombinedUpload = cloudinaryConfig.patientCombinedUpload;
  deleteFromCloudinary = cloudinaryConfig.deleteFromCloudinary;
  extractPublicId = cloudinaryConfig.extractPublicId;
  console.log('✅ Cloudinary configuration loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Cloudinary config, falling back to local upload:', error.message);
  // Fallback to local upload
  const upload = require('../middleware/patientUpload');
  patientCombinedUpload = upload;
}
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Validation middleware
const validatePatient = [
  body('fullName').trim().isLength({ min: 1, max: 100 }).withMessage('Full name is required and must be less than 100 characters'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['Male', 'Female', 'Other', 'Prefer not to say']).withMessage('Valid gender selection is required'),
  body('phone').trim().isLength({ min: 1 }).withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Valid email address is required'),
  body('uhid').trim().isLength({ min: 1, max: 50 }).withMessage('UHID is required and must be less than 50 characters'),
  body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Valid blood group is required'),
  body('occupation').trim().isLength({ min: 1, max: 100 }).withMessage('Occupation is required and must be less than 100 characters'),
  body('referringDoctor').optional().trim().isLength({ max: 100 }).withMessage('Referring doctor name cannot exceed 100 characters'),
  body('referredClinic').optional().trim().isLength({ max: 100 }).withMessage('Referred clinic name cannot exceed 100 characters'),
  body('address').custom((value) => {
    if (!value) {
      throw new Error('Address is required');
    }
    let address;
    try {
      address = typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
      throw new Error('Invalid address format');
    }
    if (!address.street || !address.street.trim()) {
      throw new Error('Street address is required');
    }
    if (!address.city || !address.city.trim()) {
      throw new Error('City is required');
    }
    if (!address.state || !address.state.trim()) {
      throw new Error('State is required');
    }
    if (!address.zipCode || !address.zipCode.trim()) {
      throw new Error('ZIP code is required');
    }
    return true;
  })
];

// GET /api/patients - Get all patients with pagination and filtering
router.get('/', auth, async (req, res) => {
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
    
    // Role-based filtering: doctors can only see patients assigned to them
    if (req.user.role === 'doctor') {
      query.assignedDoctors = req.user.id;
    }
    // Clinic-based filtering: clinic admins can only see their clinic's patients
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
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
      .select('-__v')
      .populate('assignedDoctors', 'fullName specialty');

    // Debug logging (can be removed in production)
    console.log(`Found ${patients.length} patients for user role: ${req.user.role}`);

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

// GET /api/patients/grouped-by-specialty - Get patients grouped by doctor specialties
router.get('/grouped-by-specialty', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build base match conditions
    const matchConditions = {};
    
    // Role-based filtering: doctors can only see patients assigned to them
    if (req.user.role === 'doctor') {
      matchConditions.assignedDoctors = new mongoose.Types.ObjectId(req.user.id);
    }
    // Clinic-based filtering: clinic admins can only see their clinic's patients
    else if (req.user.role === 'clinic') {
      matchConditions.clinicId = req.user.id;
    }
    // Nursing roles: can see patients in their clinic
    else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // For nursing roles, get the nurse's clinic and filter by clinicId
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      if (nurse && nurse.clinicId) {
        matchConditions.clinicId = nurse.clinicId;
      } else {
        return res.status(403).json({ error: 'Access denied. Nurse clinic information not found.' });
      }
    }
    
    if (search) {
      matchConditions.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      matchConditions.status = status;
    }

    // Build aggregation pipeline - simplified approach
    const pipeline = [
      { $match: matchConditions },
      {
        $addFields: {
          // Handle empty or missing assignedDoctors array
          hasAssignedDoctors: {
            $and: [
              { $ne: ['$assignedDoctors', null] },
              { $ne: ['$assignedDoctors', []] },
              { $gt: [{ $size: { $ifNull: ['$assignedDoctors', []] } }, 0] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'doctors',
          localField: 'assignedDoctors',
          foreignField: '_id',
          as: 'assignedDoctorsData'
        }
      },
      {
        $addFields: {
          // Determine specialty based on assigned doctors
          effectiveSpecialty: {
            $cond: {
              if: '$hasAssignedDoctors',
              then: {
                $cond: {
                  if: { $gt: [{ $size: '$assignedDoctorsData' }, 0] },
                  then: { $ifNull: [{ $arrayElemAt: ['$assignedDoctorsData.specialty', 0] }, 'Unassigned'] },
                  else: 'Unassigned'
                }
              },
              else: 'Unassigned'
            }
          }
        }
      },
      {
        $group: {
          _id: '$effectiveSpecialty',
          patients: {
            $push: {
              _id: '$_id',
              fullName: '$fullName',
              age: '$age',
              gender: '$gender',
              phone: '$phone',
              email: '$email',
              address: '$address',
              emergencyContact: '$emergencyContact',
              insurance: '$insurance',
              medicalHistory: '$medicalHistory',
              notes: '$notes',
              status: '$status',
              lastVisit: '$lastVisit',
              nextAppointment: '$nextAppointment',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt',
              assignedDoctors: '$assignedDoctorsData'
            }
          },
          patientCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          specialty: '$_id',
          patients: 1,
          patientCount: 1
        }
      },
      {
        $sort: { specialty: 1 }
      }
    ];

    // First, let's check what patients we have and their assignedDoctors
    const testPatients = await Patient.find(matchConditions).select('fullName assignedDoctors').lean();
    console.log('Patients found for specialty grouping:', testPatients.length);
    console.log('Patient assignedDoctors sample:', testPatients.slice(0, 3).map(p => ({ 
      name: p.fullName, 
      assignedDoctors: p.assignedDoctors,
      assignedDoctorsType: Array.isArray(p.assignedDoctors) ? 'array' : typeof p.assignedDoctors,
      assignedDoctorsLength: p.assignedDoctors ? p.assignedDoctors.length : 0
    })));

    // Check if doctors exist with these IDs
    const Doctor = require('../models/Doctor');
    const sampleDoctorIds = testPatients.slice(0, 2).flatMap(p => p.assignedDoctors);
    const doctorsFound = await Doctor.find({ _id: { $in: sampleDoctorIds } }).select('fullName specialty').lean();
    console.log('Direct doctor lookup:', doctorsFound.map(d => ({ id: d._id, name: d.fullName, specialty: d.specialty })));
    console.log('Doctor collection name:', Doctor.collection.name);

    // Let's test the lookup separately to see what's happening
    const lookupTest = await Patient.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: Doctor.collection.name, // Use actual collection name
          localField: 'assignedDoctors',
          foreignField: '_id',
          as: 'assignedDoctorsData'
        }
      },
      { $limit: 2 }
    ]);
    console.log('Lookup test results:', lookupTest.map(p => ({
      name: p.fullName,
      assignedDoctors: p.assignedDoctors,
      lookupResult: p.assignedDoctorsData.map(d => ({ id: d._id, name: d.fullName, specialty: d.specialty }))
    })));

    // Let's test each stage of the pipeline step by step
    console.log('=== PIPELINE DEBUGGING ===');
    
    // Stage 1: Match
    const stage1 = await Patient.aggregate([{ $match: matchConditions }]);
    console.log('Stage 1 (match):', stage1.length, 'patients');
    
    // Stage 2: Add hasAssignedDoctors field
    const stage2 = await Patient.aggregate([
      { $match: matchConditions },
      {
        $addFields: {
          hasAssignedDoctors: {
            $and: [
              { $ne: ['$assignedDoctors', null] },
              { $ne: ['$assignedDoctors', []] },
              { $gt: [{ $size: { $ifNull: ['$assignedDoctors', []] } }, 0] }
            ]
          }
        }
      }
    ]);
    console.log('Stage 2 (addFields):', stage2.length, 'patients with hasAssignedDoctors:', 
      stage2.map(p => ({ name: p.fullName, hasAssigned: p.hasAssignedDoctors })));
    
    // Stage 3: Lookup
    const stage3 = await Patient.aggregate([
      { $match: matchConditions },
      {
        $addFields: {
          hasAssignedDoctors: {
            $and: [
              { $ne: ['$assignedDoctors', null] },
              { $ne: ['$assignedDoctors', []] },
              { $gt: [{ $size: { $ifNull: ['$assignedDoctors', []] } }, 0] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'doctors',
          localField: 'assignedDoctors',
          foreignField: '_id',
          as: 'assignedDoctorsData'
        }
      }
    ]);
    console.log('Stage 3 (lookup):', stage3.length, 'patients with lookup data:', 
      stage3.map(p => ({ 
        name: p.fullName, 
        assignedCount: p.assignedDoctors?.length || 0,
        lookupCount: p.assignedDoctorsData?.length || 0,
        doctors: p.assignedDoctorsData?.map(d => d.fullName) || []
      })));

    // Execute the single pipeline
    console.log('Specialty grouping pipeline match conditions:', matchConditions);
    const rawResults = await Patient.aggregate(pipeline);
    console.log('Raw specialty results:', rawResults.length, 'groups found');
    console.log('Specialty groups:', rawResults.map(r => ({ specialty: r.specialty, count: r.patientCount })));

    // Sort results to put "Unassigned" at the end
    const groupedResults = rawResults.sort((a, b) => {
      if (a.specialty === 'Unassigned') return 1;
      if (b.specialty === 'Unassigned') return -1;
      return a.specialty.localeCompare(b.specialty);
    });

    // Calculate total counts
    const totalPatients = groupedResults.reduce((sum, group) => sum + group.patientCount, 0);
    const totalSpecialties = groupedResults.length;

    res.json({
      specialtyGroups: groupedResults,
      summary: {
        totalPatients,
        totalSpecialties,
        specialties: groupedResults.map(group => ({
          name: group.specialty || 'Unassigned',
          count: group.patientCount
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching patients grouped by specialty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id - Get patient by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // Role-based filtering: doctors can only see patients assigned to them
    if (req.user.role === 'doctor') {
      query.assignedDoctors = req.user.id;
    }
    // Clinic-based filtering: clinic admins can only see their clinic's patients
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const patient = await Patient.findOne(query)
      .select('-__v')
      .populate('assignedDoctors', 'fullName specialty');
    
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
router.post('/', auth, (req, res, next) => {
  console.log('=== PATIENT UPLOAD MIDDLEWARE START ===');
  patientCombinedUpload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'governmentDocument', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer/Cloudinary error:', err);
      return res.status(400).json({
        success: false,
        error: 'File upload error',
        details: err.message
      });
    }
    console.log('=== PATIENT UPLOAD MIDDLEWARE SUCCESS ===');
    next();
  });
}, async (req, res) => {
  try {
    console.log('=== PATIENT CREATION REQUEST ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Authorization header present:', !!req.headers.authorization);
    console.log('User from auth middleware:', req.user);
    console.log('Received request body keys:', Object.keys(req.body));
    console.log('Received files:', req.files);
    console.log('=== END REQUEST INFO ===');

    // Manual validation for required fields
    const validationErrors = [];
    
    if (!req.body.fullName || !req.body.fullName.trim()) {
      validationErrors.push('Full name is required');
    }
    if (!req.body.dateOfBirth) {
      validationErrors.push('Date of birth is required');
    }
    if (!req.body.gender) {
      validationErrors.push('Gender is required');
    }
    if (!req.body.phone || !req.body.phone.trim()) {
      validationErrors.push('Phone number is required');
    }
    if (!req.body.uhid || !req.body.uhid.trim()) {
      validationErrors.push('UHID is required');
    }
    if (!req.body.bloodGroup) {
      validationErrors.push('Blood group is required');
    }
    if (!req.body.occupation || !req.body.occupation.trim()) {
      validationErrors.push('Occupation is required');
    }
    if (!req.body.password || req.body.password.length < 6) {
      validationErrors.push('Password is required and must be at least 6 characters long');
    }

    // Check if required files are uploaded
    if (!req.files || !req.files.profileImage) {
      validationErrors.push('Profile image is required');
    }
    if (!req.files || !req.files.governmentDocument) {
      validationErrors.push('Government document is required');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Check if patient with same phone already exists
    const existingPatient = await Patient.findOne({ phone: req.body.phone });
    if (existingPatient) {
      return res.status(400).json({ error: 'Patient with this phone number already exists' });
    }

    // Check if patient with same UHID already exists
    const existingUHID = await Patient.findOne({ uhid: req.body.uhid.toUpperCase() });
    if (existingUHID) {
      return res.status(400).json({ error: 'Patient with this UHID already exists' });
    }


    // Parse JSON strings for nested objects
    const parsedData = { ...req.body };
    
    // Parse address if it's a JSON string
    if (typeof req.body.address === 'string') {
      try {
        parsedData.address = JSON.parse(req.body.address);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid address format' });
      }
    }
    
    // Parse emergencyContact if it's a JSON string
    if (typeof req.body.emergencyContact === 'string') {
      try {
        parsedData.emergencyContact = JSON.parse(req.body.emergencyContact);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid emergency contact format' });
      }
    }
    
    // Parse insurance if it's a JSON string
    if (typeof req.body.insurance === 'string') {
      try {
        parsedData.insurance = JSON.parse(req.body.insurance);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid insurance format' });
      }
    }
    
    // Parse medicalHistory if it's a JSON string
    if (typeof req.body.medicalHistory === 'string') {
      try {
        parsedData.medicalHistory = JSON.parse(req.body.medicalHistory);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid medical history format' });
      }
    }
    
    // Parse assignedDoctors if it's a JSON string
    if (typeof req.body.assignedDoctors === 'string') {
      try {
        parsedData.assignedDoctors = JSON.parse(req.body.assignedDoctors);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid assigned doctors format' });
      }
    }
    
    // Parse parentGuardian if it's a JSON string
    if (typeof req.body.parentGuardian === 'string') {
      try {
        parsedData.parentGuardian = JSON.parse(req.body.parentGuardian);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid parent/guardian format' });
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(req.body.password, saltRounds);

    // Create new patient with clinic reference and file paths
    const patientData = {
      ...parsedData,
      uhid: req.body.uhid ? req.body.uhid.toUpperCase() : undefined,
      passwordHash, // Use hashed password instead of plain password
      profileImage: req.files.profileImage ? 
        (req.files.profileImage[0].path || `/uploads/patients/${req.files.profileImage[0].filename}`) : undefined,
      governmentDocument: req.files.governmentDocument ? 
        (req.files.governmentDocument[0].path || `/uploads/patients/documents/${req.files.governmentDocument[0].filename}`) : undefined,
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    };

    // Remove plain password from data to avoid saving it
    delete patientData.password;

    console.log('Creating new patient:', patientData.fullName, 'with UHID:', patientData.uhid);
    const patient = new Patient(patientData);
    
    // Validate before saving
    const validationError = patient.validateSync();
    if (validationError) {
      console.log('Validation errors:', validationError.errors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: Object.keys(validationError.errors).map(key => ({
          field: key,
          message: validationError.errors[key].message
        }))
      });
    }
    
    await patient.save();
    console.log('Patient saved successfully with ID:', patient._id);

    res.status(201).json({
      message: 'Patient created successfully',
      patient: patient.toJSON()
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    
    // Clean up uploaded files from Cloudinary if patient creation failed
    if (req.files) {
      if (req.files.profileImage) {
        try {
          const publicId = extractPublicId(req.files.profileImage[0].path);
          if (publicId) {
            await deleteFromCloudinary(publicId);
          }
        } catch (unlinkError) {
          console.error('Error deleting uploaded profile image from Cloudinary:', unlinkError);
        }
      }
      if (req.files.governmentDocument) {
        try {
          const publicId = extractPublicId(req.files.governmentDocument[0].path);
          if (publicId) {
            await deleteFromCloudinary(publicId);
          }
        } catch (unlinkError) {
          console.error('Error deleting uploaded government document from Cloudinary:', unlinkError);
        }
      }
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

// PUT /api/patients/:id - Update patient (clinic admin only)
router.put('/:id', auth, canEditPatients, validatePatient, async (req, res) => {
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

// DELETE /api/patients/:id - Delete patient (clinic admin only)
router.delete('/:id', auth, canEditPatients, async (req, res) => {
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

// PATCH /api/patients/:id/status - Update patient status (clinic admin only)
router.patch('/:id/status', auth, canEditPatients, async (req, res) => {
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

// PATCH /api/patients/:id/assigned-doctors - Update patient assigned doctors (clinic admin only)
router.patch('/:id/assigned-doctors', auth, canEditPatients, async (req, res) => {
  try {
    const { assignedDoctors } = req.body;
    
    // Validate assignedDoctors array
    if (!Array.isArray(assignedDoctors)) {
      return res.status(400).json({ error: 'assignedDoctors must be an array' });
    }

    // Validate that all doctor IDs are valid ObjectIds
    const mongoose = require('mongoose');
    for (const doctorId of assignedDoctors) {
      if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return res.status(400).json({ error: `Invalid doctor ID: ${doctorId}` });
      }
    }

    // Check if patient exists
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Verify that all doctor IDs exist
    const Doctor = require('../models/Doctor');
    const doctorCount = await Doctor.countDocuments({ _id: { $in: assignedDoctors } });
    if (doctorCount !== assignedDoctors.length) {
      return res.status(400).json({ error: 'One or more doctor IDs are invalid' });
    }

    // Update assigned doctors
    patient.assignedDoctors = assignedDoctors;
    patient.updatedAt = new Date();
    await patient.save();

    // Populate the assigned doctors for the response
    await patient.populate('assignedDoctors', 'fullName specialty');

    res.json({
      message: 'Patient assigned doctors updated successfully',
      patient: patient.toJSON()
    });
  } catch (error) {
    console.error('Error updating patient assigned doctors:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/stats/summary - Get patient statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // Build base query for role-based filtering
    const baseQuery = {};
    if (req.user.role === 'doctor') {
      baseQuery.assignedDoctors = req.user.id;
    }
    
    const totalPatients = await Patient.countDocuments(baseQuery);
    const activePatients = await Patient.countDocuments({ ...baseQuery, status: 'Active' });
    const followUpPatients = await Patient.countDocuments({ ...baseQuery, status: 'Follow-up' });
    const completedPatients = await Patient.countDocuments({ ...baseQuery, status: 'Completed' });
    
    // Get patients by age groups with role-based filtering
    const matchStage = req.user.role === 'doctor' 
      ? { $match: { assignedDoctors: req.user.id } }
      : { $match: {} };
    
    const ageGroups = await Patient.aggregate([
      matchStage,
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
router.get('/search/quick', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const query = {
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    };

    // Role-based filtering: doctors can only see patients assigned to them
    if (req.user.role === 'doctor') {
      query.assignedDoctors = req.user.id;
    }

    const patients = await Patient.find(query)
    .select('fullName phone email status age')
    .limit(10);

    res.json(patients);
  } catch (error) {
    console.error('Error in quick search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
