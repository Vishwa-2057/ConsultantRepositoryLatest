const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { body, validationResult } = require('express-validator');
const MedicalImage = require('../models/MedicalImage');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'medical-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
    ]
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF files are allowed.'), false);
    }
  }
});

// Validation middleware
const validateMedicalImage = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('imageType').isIn([
    'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Blood Test', 'Lab Report',
    'Prescription', 'Medical Report', 'Surgical Photo', 'Wound Photo', 'Skin Condition', 'Other'
  ]).withMessage('Valid image type is required'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('bodyPart').optional().isIn([
    'Head', 'Neck', 'Chest', 'Abdomen', 'Pelvis', 'Spine',
    'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg',
    'Left Hand', 'Right Hand', 'Left Foot', 'Right Foot',
    'Heart', 'Lungs', 'Liver', 'Kidney', 'Brain',
    'Full Body', 'Other', ''
  ]).withMessage('Invalid body part'),
  body('associatedDiagnosis').optional().isLength({ max: 500 }).withMessage('Associated diagnosis cannot exceed 500 characters'),
  body('imageTakenDate').optional().isISO8601().withMessage('Invalid date format')
];

// GET /api/medical-images - Get all medical images with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      patientId = '',
      imageType = '',
      bodyPart = '',
      status = 'Active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { status };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      // Doctors can see images from their clinic or that they uploaded
      query.$or = [
        { uploadedBy: req.user.id },
        { clinicId: req.user.clinicId }
      ];
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (imageType && imageType !== 'all') {
      query.imageType = imageType;
    }
    
    if (bodyPart && bodyPart !== 'all') {
      query.bodyPart = bodyPart;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [images, totalCount] = await Promise.all([
      MedicalImage.find(query)
        .populate('patientId', 'fullName uhid')
        .populate('uploadedBy', 'fullName specialty')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      MedicalImage.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      images,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching medical images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/medical-images/patient/:patientId - Get images for specific patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { imageType = '', bodyPart = '' } = req.query;

    const options = {};
    if (imageType && imageType !== 'all') {
      options.imageType = imageType;
    }
    if (bodyPart && bodyPart !== 'all') {
      options.bodyPart = bodyPart;
    }

    const images = await MedicalImage.findByPatient(patientId, options);

    res.json(images);
  } catch (error) {
    console.error('Error fetching patient medical images:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medical-images - Upload new medical image
router.post('/', auth, upload.single('image'), validateMedicalImage, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If validation fails and file was uploaded, delete it from Cloudinary
      if (req.file && req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Additional logging for debugging
    console.log('File upload successful. File details:');
    console.log('- Path:', req.file.path);
    console.log('- Filename:', req.file.filename);
    console.log('- Original name:', req.file.originalname);
    console.log('- Size:', req.file.size);
    console.log('- Mimetype:', req.file.mimetype);

    // Verify patient exists
    const patient = await Patient.findById(req.body.patientId);
    if (!patient) {
      // Delete uploaded file if patient doesn't exist
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Determine clinic ID based on user role
    let clinicId;
    if (req.user.role === 'clinic') {
      clinicId = req.user.id;
    } else if (req.user.clinicId) {
      clinicId = req.user.clinicId;
    } else {
      // If no clinic ID available, use a default or skip validation
      console.warn('No clinic ID found for user:', req.user.id);
      clinicId = null;
    }

    // Log file object to debug structure
    console.log('Uploaded file object:', req.file);
    console.log('Request body:', req.body);

    // Validate required fields from file upload (based on actual Cloudinary response structure)
    const imageUrl = req.file.path || req.file.secure_url || req.file.url;
    const fileSize = req.file.size || req.file.bytes;
    const fileName = req.file.originalname || req.file.original_filename || req.file.filename;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL not found in upload response' });
    }
    if (!fileSize) {
      return res.status(400).json({ error: 'File size not found in upload response' });
    }
    if (!fileName) {
      return res.status(400).json({ error: 'File name not found in upload response' });
    }

    // Create medical image record with validated fields
    const medicalImage = new MedicalImage({
      patientId: req.body.patientId,
      uploadedBy: req.user.id,
      clinicId: clinicId,
      imageUrl: imageUrl,
      fileName: fileName,
      fileSize: fileSize,
      mimeType: req.file.mimetype,
      imageType: req.body.imageType,
      bodyPart: req.body.bodyPart || '',
      title: req.body.title,
      description: req.body.description || '',
      associatedDiagnosis: req.body.associatedDiagnosis || '',
      imageTakenDate: req.body.imageTakenDate ? new Date(req.body.imageTakenDate) : new Date(),
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
      cloudinaryPublicId: req.file.filename, // Using filename as public ID since public_id isn't available
      cloudinaryUrl: imageUrl
    });

    await medicalImage.save();

    // Populate the response
    await medicalImage.populate('patientId', 'fullName uhid');
    await medicalImage.populate('uploadedBy', 'fullName specialty');

    res.status(201).json({
      message: 'Medical image uploaded successfully',
      image: medicalImage
    });
  } catch (error) {
    console.error('Error uploading medical image:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Clean up uploaded file if database save fails
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/medical-images/:id - Get specific medical image
router.get('/:id', auth, async (req, res) => {
  try {
    const image = await MedicalImage.findById(req.params.id)
      .populate('patientId', 'fullName uhid')
      .populate('uploadedBy', 'fullName specialty')
      .select('-__v');

    if (!image) {
      return res.status(404).json({ error: 'Medical image not found' });
    }

    res.json(image);
  } catch (error) {
    console.error('Error fetching medical image:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/medical-images/:id - Update medical image metadata
router.put('/:id', auth, validateMedicalImage, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const image = await MedicalImage.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Medical image not found' });
    }

    // Update fields
    const updateFields = [
      'imageType', 'bodyPart', 'title', 'description', 
      'associatedDiagnosis', 'imageTakenDate'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        image[field] = req.body[field];
      }
    });

    if (req.body.tags) {
      image.tags = req.body.tags.split(',').map(tag => tag.trim());
    }

    await image.save();

    // Populate the response
    await image.populate('patientId', 'fullName uhid');
    await image.populate('uploadedBy', 'fullName specialty');

    res.json({
      message: 'Medical image updated successfully',
      image
    });
  } catch (error) {
    console.error('Error updating medical image:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/medical-images/:id - Delete medical image
router.delete('/:id', auth, async (req, res) => {
  try {
    const image = await MedicalImage.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Medical image not found' });
    }

    // Archive instead of hard delete
    await image.archive();

    res.json({ message: 'Medical image archived successfully' });
  } catch (error) {
    console.error('Error archiving medical image:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/medical-images/stats/summary - Get medical images statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const query = { status: 'Active' };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.$or = [
        { uploadedBy: req.user.id },
        { clinicId: req.user.clinicId }
      ];
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const [
      totalImages,
      imagesByType,
      recentImages
    ] = await Promise.all([
      MedicalImage.countDocuments(query),
      MedicalImage.aggregate([
        { $match: query },
        { $group: { _id: '$imageType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      MedicalImage.find(query)
        .populate('patientId', 'fullName uhid')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title imageType createdAt patientId')
    ]);

    res.json({
      totalImages,
      imagesByType,
      recentImages
    });
  } catch (error) {
    console.error('Error fetching medical images stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
