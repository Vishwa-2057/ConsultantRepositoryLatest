const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Clinic = require('../models/Clinic');
const OTP = require('../models/OTP');
const emailService = require('../services/emailService');
const ActivityLogger = require('../utils/activityLogger');
const tokenManager = require('../utils/tokenManager');
const auth = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('fullName').trim().isLength({ min: 1 }).withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('specialty').optional().isString(),
  body('phone').optional().isString(),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
];

const otpLoginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const requestOTPValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
];

const resetPasswordValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { fullName, email, password, specialty, phone } = req.body;

    const existing = await Doctor.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const doctor = await Doctor.create({ fullName, email, passwordHash, specialty, phone });

    // No need to create individual email configurations
    // The system will use centralized email service for all OTP emails
    console.log(`✅ Doctor ${fullName} registered successfully - OTP emails will be sent from centralized service`);

    const token = jwt.sign({ id: doctor._id, role: doctor.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: doctor._id,
        fullName: doctor.fullName,
        email: doctor.email,
        specialty: doctor.specialty,
        role: doctor.role,
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Step 1: Verify password and send OTP for 2-step verification
router.post('/login-step1', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;
    
    console.log(`🔐 Login Step 1 Debug:`);
    console.log(`  - Email: ${email}`);
    console.log(`  - Password: ${password}`);
    
    let user = null;
    let userType = null;
    
    // Try to find user in Doctor collection first
    user = await Doctor.findOne({ email });
    if (user) {
      userType = 'doctor';
      console.log(`  - Found user in Doctor collection`);
    }
    
    // If not found in Doctor, try Nurse collection
    if (!user) {
      user = await Nurse.findOne({ email });
      if (user) {
        userType = 'nurse';
        console.log(`  - Found user in Nurse collection`);
      }
    }
    
    // If not found in Doctor or Nurse, try Clinic collection
    if (!user) {
      console.log(`  - Searching in Clinic collection for email: ${email}`);
      user = await Clinic.findOne({ 
        $or: [
          { adminEmail: email },
          { adminUsername: email }
        ]
      });
      if (user) {
        userType = 'clinic';
        console.log(`  - Found user in Clinic collection: ${user.adminEmail}`);
        console.log(`  - Clinic Name: ${user.name}`);
        console.log(`  - Clinic Active: ${user.isActive}`);
        
        // Check if clinic is active
        if (!user.isActive) {
          console.log(`  - Clinic is inactive, rejecting login`);
          return res.status(403).json({ error: 'Your clinic account has been deactivated. Please contact support for assistance.' });
        }
      } else {
        console.log(`  - No clinic found with email: ${email}`);
      }
    }
    
    if (!user) {
      console.log(`  - No user found in any collection for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`  - User found, type: ${userType}, calling comparePassword...`);
    const ok = await user.comparePassword(password);
    console.log(`  - Password comparison result: ${ok}`);
    if (!ok) {
      console.log(`  - Password comparison failed, rejecting login`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Password is correct, now create and send OTP for step 2
    const otp = await OTP.createOTP(
      email,
      'login',
      user._id,
      req.ip,
      req.get('User-Agent')
    );

    // Send email using user's email configuration
    const emailResult = await emailService.sendOTPEmail(user._id, email, otp.code, 'login');

    if (!emailResult.success) {
      // If email fails, delete the OTP
      await OTP.findByIdAndDelete(otp._id);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification code. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Password verified. Verification code sent to your email.',
      requiresOTP: true,
      data: {
        email: otp.email,
        expiresAt: otp.expiresAt,
        timeRemaining: otp.timeRemaining
      }
    });
  } catch (err) {
    console.error('Login step 1 error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Step 2: Verify OTP and complete login for 2-step verification
router.post('/login-step2', otpLoginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, otp } = req.body;

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(email, otp, 'login');

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.message
      });
    }

    const { otp: otpRecord } = verificationResult;

    // Get user information from all collections
    let user = await Doctor.findById(otpRecord.userId);
    let userType = 'doctor';
    
    if (!user) {
      user = await Nurse.findById(otpRecord.userId);
      userType = 'nurse';
    }
    
    if (!user) {
      user = await Clinic.findById(otpRecord.userId);
      userType = 'clinic';
      
      // Check if clinic is active
      if (user && !user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Your clinic account has been deactivated. Please contact support for assistance.'
        });
      }
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found'
      });
    }

    // Mark OTP as used
    await otpRecord.markAsUsed();

    // Generate secure token pair using token manager
    const userRole = user.role || userType;
    const userForToken = {
      _id: user._id,
      email: user.email || user.adminEmail,
      role: userRole,
      fullName: user.fullName || user.adminName,
      clinicId: userType === 'clinic' ? user._id : user.clinicId
    };
    
    const tokenData = tokenManager.generateTokenPair(userForToken);
    
    // Log the login activity
    try {
      await ActivityLogger.logLogin({
        _id: user._id,
        fullName: user.fullName || user.adminName,
        email: user.email || user.adminEmail,
        role: userRole,
        clinicId: userType === 'clinic' ? user._id : user.clinicId,
        clinicName: userType === 'clinic' ? (user.name || user.fullName) : (user.clinicName || 'Unknown Clinic')
      }, req, tokenData.accessToken);
    } catch (logError) {
      console.error('Failed to log 2-step login activity:', logError);
      // Don't fail the login if logging fails
    }
    
    // Prepare user response based on user type
    let userResponse;
    if (userType === 'clinic') {
      userResponse = {
        id: user._id,
        fullName: user.fullName,
        name: user.adminName,
        email: user.adminEmail,
        specialty: user.organization,
        role: userRole,
      };
    } else {
      userResponse = {
        id: user._id,
        fullName: user.fullName,
        name: user.name,
        email: user.email,
        specialty: user.specialty || user.department,
        role: userRole,
      };
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      token: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn,
      user: userResponse
    });
  } catch (err) {
    console.error('Login step 2 error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Clinic admin login (clinics only)
router.post('/clinic-login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;
    
    // Only check Clinic collection
    const user = await Clinic.findOne({ 
      $or: [
        { adminEmail: email },
        { adminUsername: email }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please use the regular login if you are a doctor or nurse.' });
    }

    // Check if clinic is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Your clinic account has been deactivated. Please contact support for assistance.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role || 'clinic' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Log the clinic admin login activity
    try {
      await ActivityLogger.logLogin({
        _id: user._id,
        fullName: user.fullName || user.adminName,
        email: user.adminEmail,
        role: user.role || 'clinic',
        clinicId: user._id, // For clinic admins, they are their own clinic
        clinicName: user.name || user.fullName
      }, req, token);
    } catch (logError) {
      console.error('Failed to log clinic login activity:', logError);
      // Don't fail the login if logging fails
    }
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        name: user.adminName,
        email: user.adminEmail,
        specialty: user.organization,
        role: user.role || 'clinic',
      }
    });
  } catch (err) {
    console.error('Clinic login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/request-otp - Request OTP for all user types (doctors, nurses, and clinic admins)
router.post('/request-otp', requestOTPValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email } = req.body;

    let user = null;
    let userType = null;

    // Check if user exists in Doctor collection first
    user = await Doctor.findOne({ email });
    if (user) {
      userType = 'doctor';
    }
    
    // If not found in Doctor, try Nurse collection
    if (!user) {
      user = await Nurse.findOne({ email });
      if (user) {
        userType = 'nurse';
      }
    }
    
    // If not found in Doctor or Nurse, try Clinic collection
    if (!user) {
      user = await Clinic.findOne({ 
        $or: [
          { adminEmail: email },
          { adminUsername: email }
        ]
      });
      if (user) {
        userType = 'clinic';
        
        // Check if clinic is active
        if (!user.isActive) {
          return res.status(403).json({ 
            success: false,
            error: 'Your clinic account has been deactivated. Please contact support for assistance.' 
          });
        }
      }
    }
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'No account found with this email address' 
      });
    }

    // Check for recent OTP requests (rate limiting)
    const recentOTP = await OTP.findOne({
      email,
      purpose: 'login',
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 60000) } // 1 minute ago
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        error: 'Please wait before requesting another OTP. Try again in a minute.'
      });
    }

    // Create OTP
    const otp = await OTP.createOTP(
      email,
      'login',
      user._id,
      req.ip,
      req.get('User-Agent')
    );

    // Send email using user's email configuration
    const emailResult = await emailService.sendOTPEmail(user._id, email, otp.code, 'login');

    if (!emailResult.success) {
      // If email fails, delete the OTP
      await OTP.findByIdAndDelete(otp._id);
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email address',
      data: {
        email: otp.email,
        expiresAt: otp.expiresAt,
        timeRemaining: otp.timeRemaining
      }
    });
  } catch (err) {
    console.error('Request OTP error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// POST /api/auth/clinic-request-otp - Request OTP for clinic admins
router.post('/clinic-request-otp', requestOTPValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email } = req.body;

    // Check if user exists (clinic only)
    const user = await Clinic.findOne({ 
      $or: [
        { adminEmail: email },
        { adminUsername: email }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'No clinic account found with this email address' 
      });
    }

    // Check if clinic is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Your clinic account has been deactivated. Please contact support for assistance.' 
      });
    }

    // Check for recent OTP requests (rate limiting)
    const recentOTP = await OTP.findOne({
      email,
      purpose: 'login',
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 60000) } // 1 minute ago
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        error: 'Please wait before requesting another OTP. Try again in a minute.'
      });
    }

    // Create OTP
    const otp = await OTP.createOTP(
      email,
      'login',
      user._id,
      req.ip,
      req.get('User-Agent')
    );

    // Send email using user's email configuration
    const emailResult = await emailService.sendOTPEmail(user._id, email, otp.code, 'login');

    if (!emailResult.success) {
      // If email fails, delete the OTP
      await OTP.findByIdAndDelete(otp._id);
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email address',
      data: {
        email: otp.email,
        expiresAt: otp.expiresAt,
        timeRemaining: otp.timeRemaining
      }
    });
  } catch (err) {
    console.error('Clinic Request OTP error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// POST /api/auth/login-otp - Login with OTP for all user types (doctors, nurses, and clinic admins)
router.post('/login-otp', otpLoginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, otp } = req.body;

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(email, otp, 'login');

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.message
      });
    }

    const { otp: otpRecord } = verificationResult;

    // Get user information from all collections
    let user = await Doctor.findById(otpRecord.userId);
    let userType = 'doctor';
    
    if (!user) {
      user = await Nurse.findById(otpRecord.userId);
      userType = 'nurse';
    }
    
    if (!user) {
      user = await Clinic.findById(otpRecord.userId);
      userType = 'clinic';
      
      // Check if clinic is active
      if (user && !user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Your clinic account has been deactivated. Please contact support for assistance.'
        });
      }
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found'
      });
    }

    // Mark OTP as used
    await otpRecord.markAsUsed();

    // Generate JWT token
    const userRole = user.role || userType;
    const token = jwt.sign(
      { id: user._id, role: userRole }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Log the OTP login activity
    try {
      await ActivityLogger.logLogin({
        _id: user._id,
        fullName: user.fullName || user.adminName,
        email: user.email || user.adminEmail,
        role: userRole,
        clinicId: userType === 'clinic' ? user._id : user.clinicId,
        clinicName: userType === 'clinic' ? (user.name || user.fullName) : (user.clinicName || 'Unknown Clinic')
      }, req, token);
    } catch (logError) {
      console.error('Failed to log OTP login activity:', logError);
      // Don't fail the login if logging fails
    }
    
    // Prepare user response based on user type
    let userResponse;
    if (userType === 'clinic') {
      userResponse = {
        id: user._id,
        fullName: user.fullName,
        name: user.adminName,
        email: user.adminEmail,
        specialty: user.organization,
        role: userRole,
      };
    } else {
      userResponse = {
        id: user._id,
        fullName: user.fullName,
        name: user.name,
        email: user.email,
        specialty: user.specialty || user.department,
        role: userRole,
      };
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (err) {
    console.error('OTP login error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// POST /api/auth/clinic-login-otp - Login with OTP for clinic admins
router.post('/clinic-login-otp', otpLoginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, otp } = req.body;

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(email, otp, 'login');

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.message
      });
    }

    const { otp: otpRecord } = verificationResult;

    // Get clinic information only
    const user = await Clinic.findById(otpRecord.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Clinic account not found'
      });
    }

    // Check if clinic is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Your clinic account has been deactivated. Please contact support for assistance.'
      });
    }

    // Mark OTP as used
    await otpRecord.markAsUsed();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role || 'clinic' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Log the clinic OTP login activity
    try {
      await ActivityLogger.logLogin({
        _id: user._id,
        fullName: user.fullName || user.adminName,
        email: user.adminEmail,
        role: user.role || 'clinic',
        clinicId: user._id, // For clinic admins, they are their own clinic
        clinicName: user.name || user.fullName
      }, req, token);
    } catch (logError) {
      console.error('Failed to log clinic OTP login activity:', logError);
      // Don't fail the login if logging fails
    }
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        name: user.adminName,
        email: user.adminEmail,
        specialty: user.organization,
        role: user.role || 'clinic',
      }
    });
  } catch (err) {
    console.error('Clinic OTP login error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // Try to find user in Doctor collection first
    let user = await Doctor.findById(payload.id).select('-passwordHash');
    
    // If not found in Doctor, try Nurse collection
    if (!user) {
      user = await Nurse.findById(payload.id).select('-passwordHash');
    }
    
    // If not found in Nurse, try Clinic collection
    if (!user) {
      user = await Clinic.findById(payload.id).select('-passwordHash');
    }
    
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /logout - Log user logout and clear session
router.post('/logout', auth, async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Get user details for logging
    let userDetails = null;
    let userType = currentUser.role;
    
    if (userType === 'clinic') {
      userDetails = await Clinic.findById(currentUser.id);
    } else if (userType === 'doctor') {
      userDetails = await Doctor.findById(currentUser.id).populate('clinicId');
    } else if (userType === 'nurse' || userType === 'head_nurse' || userType === 'supervisor') {
      userDetails = await Nurse.findById(currentUser.id).populate('clinicId');
    }

    if (userDetails) {
      // Calculate session duration (if we have login time from token)
      let sessionDuration = null;
      try {
        const token = req.headers.authorization?.slice(7); // Remove 'Bearer '
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded.iat) {
            const loginTime = decoded.iat * 1000; // Convert to milliseconds
            const logoutTime = Date.now();
            sessionDuration = Math.floor((logoutTime - loginTime) / (1000 * 60)); // Duration in minutes
          }
        }
      } catch (error) {
        console.log('Could not calculate session duration:', error.message);
      }

      // Log the logout activity
      try {
        await ActivityLogger.logLogout({
          _id: userDetails._id,
          fullName: userDetails.fullName || userDetails.adminName || userDetails.name,
          email: userDetails.adminEmail || userDetails.email,
          role: userType,
          clinicId: userDetails.clinicId || userDetails._id,
          clinicName: userDetails.clinicName || userDetails.name || 'Unknown Clinic'
        }, req, null, sessionDuration);
      } catch (logError) {
        console.error('Failed to log logout activity:', logError);
        // Don't fail the logout if logging fails
      }
    }

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, we should allow logout to proceed
    res.json({
      message: 'Logged out successfully'
    });
  }
});

// Clinic Forgot Password - Send reset OTP
router.post('/clinic-forgot-password', forgotPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email } = req.body;

    // Check if clinic admin exists
    const clinic = await Clinic.findOne({ adminEmail: email });

    if (!clinic) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        message: 'If an account with this email exists, a password reset code has been sent.',
        success: true 
      });
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP
    await OTP.findOneAndUpdate(
      { email, purpose: 'password_reset' },
      { 
        email, 
        code: otpCode, 
        expiresAt,
        purpose: 'password_reset',
        status: 'pending'
      },
      { upsert: true }
    );

    // Send email
    try {
      await emailService.sendPasswordResetOTP(email, clinic.adminName || clinic.name, otpCode);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
    }

    res.json({ 
      message: 'Password reset code sent to your email address.',
      success: true 
    });

  } catch (error) {
    console.error('Clinic forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clinic Reset Password with OTP
router.post('/clinic-reset-password', resetPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, otp, newPassword } = req.body;

    // Verify OTP
    const otpRecord = await OTP.findOne({ 
      email, 
      code: otp, 
      purpose: 'password_reset',
      status: 'pending',
      expiresAt: { $gt: new Date() } 
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Find clinic
    const clinic = await Clinic.findOne({ adminEmail: email });

    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await Clinic.findByIdAndUpdate(clinic._id, { adminPassword: hashedPassword });
    console.log(`✅ Password updated for clinic admin: ${clinic.adminEmail}`);

    // Mark OTP as used
    otpRecord.status = 'used';
    await otpRecord.save();

    // Log password reset activity
    try {
      await ActivityLogger.logPasswordReset({
        _id: clinic._id,
        fullName: clinic.adminName || clinic.name,
        email: clinic.adminEmail,
        role: 'clinic',
        clinicId: clinic._id,
        clinicName: clinic.name
      }, req);
    } catch (logError) {
      console.error('Failed to log clinic password reset activity:', logError);
    }

    res.json({ 
      message: 'Password reset successfully. You can now login with your new password.',
      success: true 
    });

  } catch (error) {
    console.error('Clinic reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unified Forgot Password - Send reset OTP for all user types
router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email } = req.body;

    let user = null;
    let userType = null;
    let userName = null;

    // Check if user exists in Doctor collection first
    user = await Doctor.findOne({ email });
    if (user) {
      userType = 'doctor';
      userName = user.fullName;
    }
    
    // If not found in Doctor, try Nurse collection
    if (!user) {
      user = await Nurse.findOne({ email });
      if (user) {
        userType = 'nurse';
        userName = user.fullName;
      }
    }
    
    // If not found in Doctor or Nurse, try Clinic collection
    if (!user) {
      user = await Clinic.findOne({ 
        $or: [
          { adminEmail: email },
          { adminUsername: email }
        ]
      });
      if (user) {
        userType = 'clinic';
        userName = user.adminName || user.name;
        
        // Check if clinic is active
        if (!user.isActive) {
          return res.status(403).json({ 
            error: 'Your clinic account has been deactivated. Please contact support for assistance.',
            success: false 
          });
        }
      }
    }

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        message: 'If an account with this email exists, a password reset code has been sent.',
        success: true 
      });
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP
    await OTP.findOneAndUpdate(
      { email, purpose: 'password_reset' },
      { 
        email, 
        code: otpCode, 
        expiresAt,
        purpose: 'password_reset',
        status: 'pending'
      },
      { upsert: true }
    );

    // Send email
    try {
      await emailService.sendPasswordResetOTP(email, userName, otpCode);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
    }

    res.json({ 
      message: 'Password reset code sent to your email address.',
      success: true 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unified Reset Password with OTP for all user types
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, otp, newPassword } = req.body;

    // Verify OTP
    const otpRecord = await OTP.findOne({ 
      email, 
      code: otp, 
      purpose: 'password_reset',
      status: 'pending',
      expiresAt: { $gt: new Date() } 
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Find user in all collections
    let user = null;
    let userType = null;
    
    user = await Doctor.findOne({ email });
    if (user) {
      userType = 'doctor';
    }
    
    if (!user) {
      user = await Nurse.findOne({ email });
      if (user) {
        userType = 'nurse';
      }
    }
    
    if (!user) {
      user = await Clinic.findOne({ 
        $or: [
          { adminEmail: email },
          { adminUsername: email }
        ]
      });
      if (user) {
        userType = 'clinic';
        
        // Check if clinic is active
        if (!user.isActive) {
          return res.status(403).json({ 
            error: 'Your clinic account has been deactivated. Please contact support for assistance.',
            success: false 
          });
        }
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password based on user type
    if (userType === 'doctor') {
      await Doctor.findByIdAndUpdate(user._id, { passwordHash: hashedPassword });
      console.log(`✅ Password updated for doctor: ${user.email}`);
    } else if (userType === 'nurse') {
      await Nurse.findByIdAndUpdate(user._id, { passwordHash: hashedPassword });
      console.log(`✅ Password updated for nurse: ${user.email}`);
    } else if (userType === 'clinic') {
      await Clinic.findByIdAndUpdate(user._id, { adminPassword: hashedPassword });
      console.log(`✅ Password updated for clinic admin: ${user.adminEmail}`);
    }

    // Mark OTP as used
    otpRecord.status = 'used';
    await otpRecord.save();

    // Log password reset activity
    try {
      await ActivityLogger.logPasswordReset({
        _id: user._id,
        fullName: user.fullName || user.adminName,
        email: user.email || user.adminEmail,
        role: userType,
        clinicId: userType === 'clinic' ? user._id : user.clinicId,
        clinicName: userType === 'clinic' ? (user.name || user.fullName) : 'Unknown Clinic'
      }, req);
    } catch (logError) {
      console.error('Failed to log password reset activity:', logError);
    }

    res.json({ 
      message: 'Password reset successfully. You can now login with your new password.',
      success: true 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Refresh the token
    const tokenData = await tokenManager.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      token: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresIn: tokenData.expiresIn
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Token refresh failed'
    });
  }
});

// GET /auth/me - Get current user info
router.get('/me', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Remove sensitive data
    const { password, ...userWithoutPassword } = user.toObject ? user.toObject() : user;

    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information'
    });
  }
});

// POST /auth/logout - Logout user
router.post('/logout', auth, async (req, res) => {
  try {
    const token = tokenManager.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      // Blacklist the current token
      tokenManager.blacklistToken(token);
    }

    // Get refresh token from body or header
    const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
    
    if (refreshToken) {
      // Remove refresh token
      tokenManager.removeRefreshToken(req.user.id, refreshToken);
      tokenManager.blacklistToken(refreshToken);
    }

    // Log activity
    await ActivityLogger.log(req.user.id, 'LOGOUT', 'User logged out', {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// POST /auth/logout-all - Logout from all devices
router.post('/logout-all', auth, async (req, res) => {
  try {
    // Remove all refresh tokens for user
    tokenManager.removeAllRefreshTokens(req.user.id);

    // Log activity
    await ActivityLogger.log(req.user.id, 'LOGOUT_ALL', 'User logged out from all devices', {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout from all devices failed'
    });
  }
});

// GET /auth/session-info - Get session information
router.get('/session-info', auth, async (req, res) => {
  try {
    const token = tokenManager.extractTokenFromHeader(req.headers.authorization);
    const tokenInfo = tokenManager.getTokenInfo(token);

    res.json({
      success: true,
      sessionInfo: {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        tokenInfo: {
          issuedAt: tokenInfo.payload.iat,
          expiresAt: tokenInfo.payload.exp,
          isExpired: tokenInfo.isExpired
        }
      }
    });

  } catch (error) {
    console.error('Session info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session information'
    });
  }
});

// GET /auth/stats - Get token system statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'clinic') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const stats = tokenManager.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Token stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get token statistics'
    });
  }
});

module.exports = router;


