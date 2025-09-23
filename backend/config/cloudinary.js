const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage configuration for different types of uploads
const createCloudinaryStorage = (folder, allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tiff']) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      allowed_formats: allowedFormats,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' }, // Limit max size
        { quality: 'auto' }, // Auto quality optimization
        { fetch_format: 'auto' } // Auto format optimization
      ],
    },
  });
};

// Different storage configurations for different use cases
const doctorImageStorage = createCloudinaryStorage('healthcare/doctors');
const nurseImageStorage = createCloudinaryStorage('healthcare/nurses');
const patientImageStorage = createCloudinaryStorage('healthcare/patients');
const patientDocumentStorage = createCloudinaryStorage('healthcare/patient-documents', ['jpg', 'jpeg', 'png', 'pdf']);

// Multer configurations
const doctorUpload = multer({
  storage: doctorImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

const nurseUpload = multer({
  storage: nurseImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

const patientUpload = multer({
  storage: patientImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

const patientDocumentUpload = multer({
  storage: patientDocumentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed!'), false);
    }
  },
});

// Helper function to delete images from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public ID from Cloudinary URL
const extractPublicId = (cloudinaryUrl) => {
  if (!cloudinaryUrl) return null;
  
  // Extract public ID from Cloudinary URL
  // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/healthcare/doctors/abc123.jpg
  const matches = cloudinaryUrl.match(/\/v\d+\/(.+)\./);
  return matches ? matches[1] : null;
};

// Combined patient upload for both profile image and documents
const patientCombinedUpload = multer({
  storage: new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
      // Different folders based on field name
      if (file.fieldname === 'profileImage') {
        return {
          folder: 'healthcare/patients',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tiff'],
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ],
        };
      } else if (file.fieldname === 'governmentDocument') {
        return {
          folder: 'healthcare/patient-documents',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tiff', 'pdf'],
          resource_type: 'auto', // Handles both images and PDFs
        };
      }
      // Default fallback
      return {
        folder: 'healthcare/misc',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tiff', 'pdf'],
        resource_type: 'auto',
      };
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter - fieldname:', file.fieldname, 'mimetype:', file.mimetype);
    
    if (file.fieldname === 'profileImage') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Profile image must be an image file!'), false);
      }
    } else if (file.fieldname === 'governmentDocument') {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/webp', 'image/avif', 'image/bmp', 'image/tiff',
        'application/pdf'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Government document must be an image or PDF file!'), false);
      }
    } else {
      // Allow other fields to pass through
      cb(null, true);
    }
  },
});

module.exports = {
  cloudinary,
  doctorUpload,
  nurseUpload,
  patientUpload,
  patientDocumentUpload,
  patientCombinedUpload,
  deleteFromCloudinary,
  extractPublicId,
};
