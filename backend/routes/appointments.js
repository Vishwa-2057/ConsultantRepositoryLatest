const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const router = express.Router();

// Validation middleware
const validateAppointment = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('appointmentType').isIn(['General Consultation', 'Follow-up Visit', 'Annual Checkup', 'Specialist Consultation', 'Emergency Visit', 'Lab Work', 'Imaging', 'Vaccination', 'Physical Therapy', 'Mental Health']).withMessage('Valid appointment type is required'),
  body('date').isISO8601().withMessage('Valid appointment date is required'),
  body('time').trim().isLength({ min: 1 }).withMessage('Appointment time is required'),
  body('duration').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Valid priority level is required')
];

// GET /api/appointments - Get all appointments with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      date = '',
      patientId = '',
      provider = '',
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (provider) {
      query.provider = { $regex: provider, $options: 'i' };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const appointments = await Appointment.find(query)
      .populate('patientId', 'fullName phone email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalAppointments: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/:id - Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'fullName phone email address')
      .select('-__v');
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/appointments - Create new appointment
router.post('/', validateAppointment, async (req, res) => {
  try {
    console.log('Creating appointment with data:', req.body);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Find the patient by ID
    const patient = await Patient.findById(req.body.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check for scheduling conflicts
    const appointmentDate = new Date(req.body.date);
    const appointmentTime = req.body.time;
    
    const conflictingAppointment = await Appointment.findOne({
      date: appointmentDate,
      time: appointmentTime,
      provider: req.body.provider || 'Dr. Johnson',
      status: { $in: ['Scheduled', 'Confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ 
        error: 'Time slot is already booked for this provider' 
      });
    }

    // Create new appointment with patient ID and name
    const appointmentData = {
      ...req.body,
      patientId: patient._id,
      patientName: patient.fullName
    };
    
    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Update patient's last visit and next appointment
    await Patient.findByIdAndUpdate(patient._id, {
      lastVisit: new Date(),
      nextAppointment: appointmentDate
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'fullName phone email');

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment: populatedAppointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', validateAppointment, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if appointment exists
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check for scheduling conflicts if date/time is being changed
    if (req.body.date || req.body.time || req.body.provider) {
      const appointmentDate = req.body.date || appointment.date;
      const appointmentTime = req.body.time || appointment.time;
      const provider = req.body.provider || appointment.provider;
      
      const conflictingAppointment = await Appointment.findOne({
        date: appointmentDate,
        time: appointmentTime,
        provider: provider,
        status: { $in: ['Scheduled', 'Confirmed'] },
        _id: { $ne: req.params.id }
      });

      if (conflictingAppointment) {
        return res.status(400).json({ 
          error: 'Time slot is already booked for this provider' 
        });
      }
    }

    // Update appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('patientId', 'fullName phone email')
    .select('-__v');

    res.json({
      message: 'Appointment updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid appointment ID' });
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

// DELETE /api/appointments/:id - Delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await Appointment.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/appointments/:id/status - Update appointment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Update status using instance method
    await appointment[status.toLowerCase().replace(' ', '')]();

    const updatedAppointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'fullName phone email');

    res.json({
      message: 'Appointment status updated successfully',
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/today - Get today's appointments
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const appointments = await Appointment.find({
      date: { $gte: startOfDay, $lt: endOfDay }
    })
    .populate('patientId', 'fullName phone email')
    .sort({ time: 1 })
    .select('-__v');

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/upcoming - Get upcoming appointments
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const appointments = await Appointment.find({
      date: { $gte: new Date() },
      status: { $in: ['Scheduled', 'Confirmed'] }
    })
    .populate('patientId', 'fullName phone email')
    .sort({ date: 1, time: 1 })
    .limit(parseInt(limit))
    .select('-__v');

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/stats/summary - Get appointment statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const totalAppointments = await Appointment.countDocuments();
    const todayAppointments = await Appointment.countDocuments({
      date: { $gte: startOfDay, $lt: endOfDay }
    });
    const upcomingAppointments = await Appointment.countDocuments({
      date: { $gte: new Date() },
      status: { $in: ['Scheduled', 'Confirmed'] }
    });
    
    // Get appointments by status
    const statusStats = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get appointments by type
    const typeStats = await Appointment.aggregate([
      {
        $group: {
          _id: '$appointmentType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalAppointments,
      todayAppointments,
      upcomingAppointments,
      statusStats,
      typeStats
    });
  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
