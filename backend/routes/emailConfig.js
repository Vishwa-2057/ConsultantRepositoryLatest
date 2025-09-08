const express = require('express');
const { body, validationResult } = require('express-validator');
const EmailConfig = require('../models/EmailConfig');
const Doctor = require('../models/Doctor');
const emailService = require('../services/emailService');
const router = express.Router();

// Validation middleware
const validateEmailConfig = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Email password/API key is required'),
  body('service').optional().isIn(['gmail', 'outlook', 'yahoo', 'sendgrid', 'ses', 'smtp']).withMessage('Invalid email service'),
  body('displayName').optional().isString().withMessage('Display name must be a string'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

// GET /api/email-config - Get all email configurations for a doctor
router.get('/', async (req, res) => {
  try {
    const { doctorId } = req.query;
    
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }

    const configs = await EmailConfig.find({ doctorId })
      .populate('doctorId', 'fullName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error fetching email configurations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email configurations',
      error: error.message
    });
  }
});

// GET /api/email-config/active/:doctorId - Get active email configuration
router.get('/active/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const config = await EmailConfig.getActiveConfig(doctorId);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching active email configuration:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/email-config - Create new email configuration
router.post('/', validateEmailConfig, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { doctorId, email, password, service = 'gmail', displayName, isActive = true, isDefault = false, smtp, metadata } = req.body;

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // If this is set as default, unset other default configs
    if (isDefault) {
      await EmailConfig.updateMany(
        { doctorId, isDefault: true },
        { isDefault: false }
      );
    }

    // Create email configuration
    const config = new EmailConfig({
      doctorId,
      email,
      password,
      service,
      displayName: displayName || `Dr. ${doctor.fullName}`,
      isActive,
      isDefault,
      smtp,
      metadata
    });

    await config.save();
    await config.populate('doctorId', 'fullName email');

    res.status(201).json({
      success: true,
      message: 'Email configuration created successfully',
      data: config
    });
  } catch (error) {
    console.error('Error creating email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create email configuration',
      error: error.message
    });
  }
});

// PUT /api/email-config/:id - Update email configuration
router.put('/:id', validateEmailConfig, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { email, password, service, displayName, isActive, isDefault, smtp, metadata } = req.body;

    const config = await EmailConfig.findById(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Email configuration not found'
      });
    }

    // If this is set as default, unset other default configs
    if (isDefault) {
      await EmailConfig.updateMany(
        { doctorId: config.doctorId, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    // Update configuration
    const updateData = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (service) updateData.service = service;
    if (displayName) updateData.displayName = displayName;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (smtp) updateData.smtp = smtp;
    if (metadata) updateData.metadata = metadata;

    const updatedConfig = await EmailConfig.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('doctorId', 'fullName email');

    // Clear transporter cache for this doctor
    await emailService.clearTransporterCache(config.doctorId);

    res.json({
      success: true,
      message: 'Email configuration updated successfully',
      data: updatedConfig
    });
  } catch (error) {
    console.error('Error updating email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email configuration',
      error: error.message
    });
  }
});

// DELETE /api/email-config/:id - Delete email configuration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await EmailConfig.findById(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Email configuration not found'
      });
    }

    await EmailConfig.findByIdAndDelete(id);
    
    // Clear transporter cache for this doctor
    await emailService.clearTransporterCache(config.doctorId);

    res.json({
      success: true,
      message: 'Email configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete email configuration',
      error: error.message
    });
  }
});

// POST /api/email-config/:id/test - Test email configuration
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await EmailConfig.findById(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Email configuration not found'
      });
    }

    const result = await config.testConfiguration();
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email configuration',
      error: error.message
    });
  }
});

// POST /api/email-config/:id/set-default - Set as default configuration
router.post('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await EmailConfig.findById(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Email configuration not found'
      });
    }

    // Unset other default configs for this doctor
    await EmailConfig.updateMany(
      { doctorId: config.doctorId, isDefault: true, _id: { $ne: id } },
      { isDefault: false }
    );

    // Set this config as default
    config.isDefault = true;
    await config.save();

    res.json({
      success: true,
      message: 'Email configuration set as default successfully',
      data: config
    });
  } catch (error) {
    console.error('Error setting default email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default email configuration',
      error: error.message
    });
  }
});

// POST /api/email-config/create-default - Create default configuration for new doctor
router.post('/create-default', [
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Email password/API key is required'),
  body('displayName').optional().isString().withMessage('Display name must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { doctorId, email, password, displayName } = req.body;

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const result = await emailService.createDefaultEmailConfig(doctorId, email, password, displayName);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: 'Default email configuration created successfully',
      data: result.config
    });
  } catch (error) {
    console.error('Error creating default email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create default email configuration',
      error: error.message
    });
  }
});

module.exports = router;
