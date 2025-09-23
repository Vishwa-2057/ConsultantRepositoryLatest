const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '../uploads/patients');
const documentsDir = path.join(__dirname, '../uploads/patients/documents');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Store profile images in patients folder, documents in documents subfolder
    if (file.fieldname === 'profileImage') {
      cb(null, uploadsDir);
    } else if (file.fieldname === 'governmentDocument') {
      cb(null, documentsDir);
    } else {
      cb(new Error('Invalid field name'));
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    
    if (file.fieldname === 'profileImage') {
      cb(null, 'patient-profile-' + uniqueSuffix + extension);
    } else if (file.fieldname === 'governmentDocument') {
      cb(null, 'patient-document-' + uniqueSuffix + extension);
    }
  }
});

// File filter for profile images (only images)
const imageFilter = (req, file, cb) => {
  if (file.fieldname === 'profileImage') {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed for profile image!'));
    }
  } else if (file.fieldname === 'governmentDocument') {
    // Allow images and PDFs for government documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed for government documents!'));
    }
  } else {
    cb(new Error('Invalid field name'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: imageFilter
});

module.exports = upload;
