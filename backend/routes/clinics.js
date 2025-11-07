const express = require('express');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/clinics/all - Get all clinics
router.get('/all', auth, async (req, res) => {
  try {
    const clinics = await Clinic.find({ isActive: true })
      .select('_id name adminName email phone city state address specialties services')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: clinics
    });
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// GET /api/clinics/profile - Get current clinic profile
router.get('/profile', auth, async (req, res) => {
  try {
    if (req.user.role !== 'clinic') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only clinics can access this endpoint.'
      });
    }

    const clinic = await Clinic.findById(req.user.id)
      .select('-adminPassword -passwordHash');
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }

    res.json({
      success: true,
      data: clinic
    });
  } catch (error) {
    console.error('Error fetching clinic profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// PUT /api/clinics/profile - Update current clinic profile
router.put('/profile', auth, async (req, res) => {
  try {
    if (req.user.role !== 'clinic') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only clinics can access this endpoint.'
      });
    }

    const allowedUpdates = ['name', 'email', 'adminEmail', 'phone', 'adminName', 'address', 'city', 'state', 'zipCode', 'country', 'specialties', 'services', 'website', 'operatingHours', 'staffCount'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    updates.updatedAt = new Date();

    const clinic = await Clinic.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-adminPassword -passwordHash');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }

    res.json({
      success: true,
      message: 'Clinic profile updated successfully',
      data: clinic
    });
  } catch (error) {
    console.error('Error updating clinic profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/clinics/:id - Get clinic by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id)
      .select('_id name adminName email phone city state address specialties services website operatingHours');
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: 'Clinic not found'
      });
    }

    res.json({
      success: true,
      data: clinic
    });
  } catch (error) {
    console.error('Error fetching clinic:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

module.exports = router;
