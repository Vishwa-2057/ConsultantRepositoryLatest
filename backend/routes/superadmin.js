const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');

const router = express.Router();

// Register Super Admin
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, phone, organization, department } = req.body;

    // Check if clinic admin already exists
    const existingClinic = await Clinic.findOne({ email });
    if (existingClinic) {
      return res.status(400).json({ 
        success: false, 
        message: 'Clinic admin with this email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create clinic admin
    const clinic = new Clinic({
      fullName,
      email,
      passwordHash,
      phone,
      organization: organization || 'Smaart Healthcare',
      department: department || 'Administration'
    });

    await clinic.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: clinic._id, 
        email: clinic.email,
        role: 'clinic',
        isClinic: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Clinic admin registered successfully',
      token,
      user: {
        id: clinic._id,
        fullName: clinic.fullName,
        email: clinic.email,
        phone: clinic.phone,
        organization: clinic.organization,
        department: clinic.department,
        permissions: clinic.permissions,
        role: 'clinic',
        isClinic: true
      }
    });
  } catch (error) {
    console.error('Super admin registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// Login Super Admin
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find clinic admin
    const clinic = await Clinic.findOne({ email });
    if (!clinic) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check if account is locked
    if (clinic.isLocked) {
      return res.status(423).json({ 
        success: false, 
        message: 'Account is temporarily locked due to too many failed login attempts' 
      });
    }

    // Check if account is active
    if (!clinic.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    // Verify password
    const isMatch = await clinic.comparePassword(password);
    if (!isMatch) {
      await clinic.incLoginAttempts();
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Reset login attempts and update last login
    await clinic.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: clinic._id, 
        email: clinic.email,
        role: 'clinic',
        isClinic: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: clinic._id,
        fullName: clinic.fullName,
        email: clinic.email,
        phone: clinic.phone,
        organization: clinic.organization,
        department: clinic.department,
        permissions: clinic.permissions,
        role: 'clinic',
        isClinic: true,
        lastLogin: clinic.lastLogin
      }
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Get Super Admin Profile
router.get('/profile', auth, async (req, res) => {
  try {
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super admin privileges required.' 
      });
    }

    const clinic = await Clinic.findById(req.user.id).select('-passwordHash');
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Super admin not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: clinic._id,
        fullName: clinic.fullName,
        email: clinic.email,
        phone: clinic.phone,
        organization: clinic.organization,
        department: clinic.department,
        permissions: clinic.permissions,
        role: 'clinic',
        isClinic: true,
        lastLogin: clinic.lastLogin,
        createdAt: clinic.createdAt
      }
    });
  } catch (error) {
    console.error('Get super admin profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Update Super Admin Profile
router.put('/profile', auth, async (req, res) => {
  try {
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super admin privileges required.' 
      });
    }

    const { fullName, phone, organization, department } = req.body;
    
    const clinic = await Clinic.findByIdAndUpdate(
      req.user.id,
      {
        fullName,
        phone,
        organization,
        department,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Super admin not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: clinic._id,
        fullName: clinic.fullName,
        email: clinic.email,
        phone: clinic.phone,
        organization: clinic.organization,
        department: clinic.department,
        permissions: clinic.permissions,
        role: 'clinic',
        isClinic: true
      }
    });
  } catch (error) {
    console.error('Update super admin profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Change Password
router.put('/change-password', auth, async (req, res) => {
  try {
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super admin privileges required.' 
      });
    }

    const { currentPassword, newPassword } = req.body;

    const clinic = await Clinic.findById(req.user.id);
    if (!clinic) {
      return res.status(404).json({ 
        success: false, 
        message: 'Super admin not found' 
      });
    }

    // Verify current password
    const isMatch = await clinic.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await Clinic.findByIdAndUpdate(req.user.id, {
      passwordHash,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get All Super Admins (for system management)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Super admin privileges required.' 
      });
    }

    const clinics = await Clinic.find({})
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      clinics: clinics.map(admin => ({
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        organization: admin.organization,
        department: admin.department,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }))
    });
  } catch (error) {
    console.error('Get all super admins error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
