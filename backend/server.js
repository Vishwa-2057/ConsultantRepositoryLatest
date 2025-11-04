const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const consultationRoutes = require('./routes/consultations');
const referralRoutes = require('./routes/referrals');
const invoiceRoutes = require('./routes/invoices');
const postRoutes = require('./routes/posts');
const authRoutes = require('./routes/auth');
const complianceAlertRoutes = require('./routes/complianceAlerts');
const otpRoutes = require('./routes/otp');
const emailConfigRoutes = require('./routes/emailConfig');
const doctorRoutes = require('./routes/doctors');
const nurseRoutes = require('./routes/nurses');
const pharmacistRoutes = require('./routes/pharmacists');
const inventoryRoutes = require('./routes/inventory');
const superAdminRoutes = require('./routes/superadmin');
const prescriptionRoutes = require('./routes/prescriptions');
const vitalsRoutes = require('./routes/vitals');
const medicalImageRoutes = require('./routes/medicalImages');
const clinicRoutes = require('./routes/clinics');
const activityLogRoutes = require('./routes/activityLogs');
const auditLogRoutes = require('./routes/auditLogs');
const revenueRoutes = require('./routes/revenue');
const teleconsultationRoutes = require('./routes/teleconsultations');
const doctorAvailabilityRoutes = require('./routes/doctorAvailability');
const scheduleExceptionRoutes = require('./routes/scheduleExceptions');
const labReportRoutes = require('./routes/labReports');
const doctorFeesRoutes = require('./routes/doctorFees');
const paymentRoutes = require('./routes/payments');
const carouselRoutes = require('./routes/carousel');
const appointmentInvoiceRoutes = require('./routes/appointmentInvoices');

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:5173',
  'https://spontaneous-cheesecake-d2f6e1.netlify.app'
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost and local network origins for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
      return callback(null, true);
    }
    
    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting - more lenient for healthcare applications with multiple concurrent API calls
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased to 500 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Legacy: Ensure uploads directory exists (keeping for backward compatibility)
// Note: New uploads now use Cloudinary, but keeping local directory for existing files
const uploadsDir = path.join(__dirname, 'uploads');
const doctorsUploadsDir = path.join(uploadsDir, 'doctors');
const nursesUploadsDir = path.join(uploadsDir, 'nurses');
const patientsUploadsDir = path.join(uploadsDir, 'patients');
const patientsDocumentsDir = path.join(patientsUploadsDir, 'documents');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(doctorsUploadsDir)) {
  fs.mkdirSync(doctorsUploadsDir, { recursive: true });
}
if (!fs.existsSync(nursesUploadsDir)) {
  fs.mkdirSync(nursesUploadsDir, { recursive: true });
}
if (!fs.existsSync(patientsUploadsDir)) {
  fs.mkdirSync(patientsUploadsDir, { recursive: true });
}
if (!fs.existsSync(patientsDocumentsDir)) {
  fs.mkdirSync(patientsDocumentsDir, { recursive: true });
}

// Serve static files for uploaded images with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, path) => {
    res.header('Cache-Control', 'public, max-age=31536000');
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Healthcare Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to check uploads directory
app.get('/test-uploads', (req, res) => {
  const uploadsPath = path.join(__dirname, 'uploads', 'doctors');
  try {
    const files = fs.readdirSync(uploadsPath);
    res.json({
      success: true,
      uploadsPath,
      files: files.length > 0 ? files : 'No files found',
      message: 'Uploads directory accessible'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      uploadsPath
    });
  }
});

// Test endpoint to check Cloudinary configuration
app.get('/test-cloudinary', (req, res) => {
  try {
    const { cloudinary } = require('./config/cloudinary');
    res.json({
      success: true,
      message: 'Cloudinary configuration loaded successfully',
      config: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
        api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to load Cloudinary configuration'
    });
  }
});

// Secure email configuration validation endpoint
app.get('/test-email-config', async (req, res) => {
  try {
    const { EmailService } = require('./services/emailService');
    const emailService = new EmailService();
    
    // Validate configuration without exposing sensitive data
    const config = emailService.getCentralizedConfig();
    
    if (!config) {
      return res.status(500).json({
        success: false,
        message: 'Email configuration is invalid or missing',
        config: {
          email_user: process.env.EMAIL_USER ? 'Set' : 'Not set',
          email_pass: process.env.EMAIL_PASS ? 'Set' : 'Not set',
          email_service: process.env.EMAIL_SERVICE || 'gmail',
          status: 'Invalid'
        }
      });
    }

    // Test the actual connection
    try {
      const transporter = await emailService.getTransporter();
      await transporter.verify();
      
      res.json({
        success: true,
        message: 'Email configuration is valid and connection successful',
        config: {
          email_user: emailService.maskEmail(process.env.EMAIL_USER),
          email_service: process.env.EMAIL_SERVICE || 'gmail',
          status: 'Connected',
          timestamp: new Date().toISOString()
        }
      });
    } catch (connectionError) {
      res.status(500).json({
        success: false,
        message: 'Email configuration exists but connection failed',
        config: {
          email_user: emailService.maskEmail(process.env.EMAIL_USER),
          email_service: process.env.EMAIL_SERVICE || 'gmail',
          status: 'Connection Failed',
          error: connectionError.message
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to validate email configuration'
    });
  }
});

// API routes
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/compliance-alerts', complianceAlertRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/email-config', emailConfigRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/nurses', nurseRoutes);
app.use('/api/pharmacists', pharmacistRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/medical-images', medicalImageRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/teleconsultations', teleconsultationRoutes);
app.use('/api/doctor-availability', doctorAvailabilityRoutes);
app.use('/api/schedule-exceptions', scheduleExceptionRoutes);
app.use('/api/lab-reports', labReportRoutes);
app.use('/api/doctor-fees', doctorFeesRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/appointment-invoices', appointmentInvoiceRoutes);

app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});   

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI;
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Validate email configuration on startup
const validateEmailConfig = async () => {
  try {
    const { EmailService } = require('./services/emailService');
    const emailService = new EmailService();
    
    console.log('📧 Validating email configuration...');
    
    const config = emailService.getCentralizedConfig();
    if (!config) {
      console.warn('⚠️  Email configuration is missing or invalid');
      console.warn('⚠️  OTP-based authentication will not work');
      return false;
    }

    // Test connection
    const transporter = await emailService.getTransporter();
    await transporter.verify();
    
    console.log('✅ Email service configured and connected successfully');
    console.log(`📧 Email service: ${process.env.EMAIL_SERVICE || 'gmail'}`);
    console.log(`📧 Email user: ${emailService.maskEmail(process.env.EMAIL_USER)}`);
    return true;
  } catch (error) {
    console.error('❌ Email service validation failed:', error.message);
    console.warn('⚠️  OTP-based authentication may not work properly');
    return false;
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Validate email configuration (non-blocking)
    await validateEmailConfig();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8080'}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔧 Health check: http://localhost:${PORT}/health`);
      console.log(`📧 Email config test: http://localhost:${PORT}/test-email-config`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});
