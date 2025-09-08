const express = require('express');
const { body, validationResult } = require('express-validator');
const OTP = require('../models/OTP');
const Doctor = require('../models/Doctor');
const emailService = require('../services/emailService');
const router = express.Router();

// Validation middleware
const validateEmail = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('purpose').optional().isIn(['login', 'registration', 'password_reset', 'email_verification']).withMessage('Invalid purpose')
];

const validateOTP = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits'),
  body('purpose').optional().isIn(['login', 'registration', 'password_reset', 'email_verification']).withMessage('Invalid purpose')
];

// POST /api/otp/send - Send OTP to email
router.post('/send', validateEmail, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, purpose = 'login' } = req.body;

    // Check if doctor exists for login purpose
    if (purpose === 'login') {
      const doctor = await Doctor.findOne({ email });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address'
        });
      }
    }

    // Check for recent OTP requests (rate limiting)
    const recentOTP = await OTP.findOne({
      email,
      purpose,
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 60000) } // 1 minute ago
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP. Try again in a minute.'
      });
    }

    // Create OTP
    const otp = await OTP.createOTP(
      email,
      purpose,
      null, // userId - will be set after verification
      req.ip,
      req.get('User-Agent')
    );

    // Send email using doctor's email configuration
    const emailResult = await emailService.sendOTPEmail(otp.userId, email, otp.code, purpose);

    if (!emailResult.success) {
      // If email fails, delete the OTP
      await OTP.findByIdAndDelete(otp._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully to your email address',
      data: {
        email: otp.email,
        purpose: otp.purpose,
        expiresAt: otp.expiresAt,
        timeRemaining: otp.timeRemaining
      }
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
});

// POST /api/otp/verify - Verify OTP
router.post('/verify', validateOTP, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, code, purpose = 'login' } = req.body;

    // Verify OTP
    const verificationResult = await OTP.verifyOTP(email, code, purpose);

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message
      });
    }

    const { otp } = verificationResult;

    // For login purpose, get doctor information
    if (purpose === 'login') {
      const doctor = await Doctor.findOne({ email });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor account not found'
        });
      }

      // Mark OTP as used
      await otp.markAsUsed();

      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          doctor: {
            id: doctor._id,
            email: doctor.email,
            fullName: doctor.fullName,
            role: doctor.role
          },
          otp: {
            id: otp._id,
            purpose: otp.purpose,
            verifiedAt: otp.verifiedAt
          }
        }
      });
    } else {
      // For other purposes, just return verification success
      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          email: otp.email,
          purpose: otp.purpose,
          verifiedAt: otp.verifiedAt
        }
      });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
});

// POST /api/otp/resend - Resend OTP
router.post('/resend', validateEmail, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, purpose = 'login' } = req.body;

    // Check if doctor exists for login purpose
    if (purpose === 'login') {
      const doctor = await Doctor.findOne({ email });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address'
        });
      }
    }

    // Check for recent resend attempts
    const recentResend = await OTP.findOne({
      email,
      purpose,
      createdAt: { $gte: new Date(Date.now() - 30000) } // 30 seconds ago
    });

    if (recentResend) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP. Try again in 30 seconds.'
      });
    }

    // Create new OTP
    const otp = await OTP.createOTP(
      email,
      purpose,
      null,
      req.ip,
      req.get('User-Agent')
    );

    // Send email using doctor's email configuration
    const emailResult = await emailService.sendOTPEmail(otp.userId, email, otp.code, purpose);

    if (!emailResult.success) {
      await OTP.findByIdAndDelete(otp._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        email: otp.email,
        purpose: otp.purpose,
        expiresAt: otp.expiresAt,
        timeRemaining: otp.timeRemaining
      }
    });
  } catch (error) {
    console.error('Error resending OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
});

// GET /api/otp/status/:email - Check OTP status
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { purpose = 'login' } = req.query;

    const otp = await OTP.findOne({
      email,
      purpose,
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (!otp) {
      return res.json({
        success: true,
        data: {
          hasActiveOTP: false,
          message: 'No active OTP found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasActiveOTP: true,
        expiresAt: otp.expiresAt,
        timeRemaining: otp.timeRemaining,
        attempts: otp.attempts,
        isValid: otp.isValid
      }
    });
  } catch (error) {
    console.error('Error checking OTP status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check OTP status',
      error: error.message
    });
  }
});

// DELETE /api/otp/cancel/:email - Cancel active OTP
router.delete('/cancel/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { purpose = 'login' } = req.query;

    const result = await OTP.updateMany(
      { email, purpose, status: 'pending' },
      { status: 'expired' }
    );

    res.json({
      success: true,
      message: 'Active OTP cancelled successfully',
      data: {
        cancelledCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error cancelling OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel OTP',
      error: error.message
    });
  }
});

// GET /api/otp/stats - Get OTP statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const stats = await OTP.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          used: { $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] } }
        }
      }
    ]);

    const purposeStats = await OTP.aggregate([
      {
        $group: {
          _id: '$purpose',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          pending: 0,
          verified: 0,
          expired: 0,
          used: 0
        },
        byPurpose: purposeStats
      }
    });
  } catch (error) {
    console.error('Error fetching OTP stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch OTP statistics',
      error: error.message
    });
  }
});

module.exports = router;
