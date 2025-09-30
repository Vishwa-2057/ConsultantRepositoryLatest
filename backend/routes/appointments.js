const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const ActivityLogger = require('../utils/activityLogger');

// Validation middleware
const validateAppointment = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
  body('appointmentType').isIn(['General Consultation', 'Follow-up Visit', 'Annual Checkup', 'Specialist Consultation', 'Emergency Visit', 'Lab Work', 'Imaging', 'Vaccination', 'Physical Therapy', 'Mental Health']).withMessage('Valid appointment type is required'),
  body('date').isISO8601().withMessage('Valid appointment date is required'),
  body('time').trim().isLength({ min: 1 }).withMessage('Appointment time is required'),
  body('duration').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Valid priority level is required')
];

// GET /api/appointments - Get all appointments with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      date = '',
      patientId = '',
      provider = '',
      appointmentType = '',
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    let query = {};
    
    // Clinic-based filtering: clinic admins can only see their clinic's appointments
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (appointmentType && appointmentType !== 'all') {
      query.appointmentType = appointmentType;
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

    let appointments;
    let total;

    // Role-based filtering: doctors only see appointments for patients assigned to them
    if (req.user.role === 'doctor') {
      // Use aggregation to filter appointments based on patient's assignedDoctors array
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': new mongoose.Types.ObjectId(req.user.id)
          }
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientId',
            pipeline: [
              { $project: { fullName: 1, phone: 1, email: 1 } }
            ]
          }
        },
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorId',
            pipeline: [
              { $project: { fullName: 1, specialty: 1, phone: 1 } }
            ]
          }
        },
        {
          $unwind: { path: '$patientId', preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: '$doctorId', preserveNullAndEmptyArrays: true }
        },
        {
          $project: { patient: 0, __v: 0 }
        },
        { $sort: sort },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) }
      ];

      appointments = await Appointment.aggregate(pipeline);

      // Get total count for pagination
      const countPipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': new mongoose.Types.ObjectId(req.user.id)
          }
        },
        { $count: 'total' }
      ];

      const countResult = await Appointment.aggregate(countPipeline);
      total = countResult.length > 0 ? countResult[0].total : 0;
    } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // Nursing staff see appointments for their clinic
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      
      if (!nurse) {
        console.error(`Nurse not found in database. User ID: ${req.user.id}, Role: ${req.user.role}`);
        return res.status(403).json({ error: 'Access denied. Nurse record not found in database.' });
      }
      
      if (!nurse.clinicId) {
        console.error(`Nurse found but missing clinicId. Nurse: ${nurse.fullName} (${nurse.email}), ID: ${nurse._id}`);
        return res.status(403).json({ 
          error: 'Access denied. Nurse clinic information not found. Please contact administrator to assign you to a clinic.',
          nurseInfo: {
            name: nurse.fullName,
            email: nurse.email,
            role: nurse.role
          }
        });
      }
      
      // Add clinic filtering to existing query
      query.clinicId = nurse.clinicId;
      
      appointments = await Appointment.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-__v');

      total = await Appointment.countDocuments(query);
    } else {
      // Super admin sees all appointments
      appointments = await Appointment.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-__v');

      total = await Appointment.countDocuments(query);
    }

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
      .populate('doctorId', 'fullName specialty phone')
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
router.post('/', auth, validateAppointment, async (req, res) => {
  try {
    console.log('Creating appointment with data:', req.body);
    console.log('User object:', req.user);
    
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

    // Find the doctor by ID to get their name
    const doctor = await Doctor.findById(req.body.doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check for scheduling conflicts
    const appointmentDate = new Date(req.body.date);
    const appointmentTime = req.body.time;
    
    const conflictingAppointment = await Appointment.findOne({
      date: appointmentDate,
      time: appointmentTime,
      doctorId: req.body.doctorId,
      status: { $in: ['Scheduled', 'Confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ 
        error: 'Time slot is already booked for this doctor' 
      });
    }

    // Create new appointment with patient ID and name, doctor as provider, and clinic reference
    const appointmentData = {
      ...req.body,
      patientId: patient._id,
      patientName: patient.fullName,
      provider: `Dr. ${doctor.fullName}`,
      clinicId: req.user && req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    };
    
    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Update patient's last visit and next appointment
    await Patient.findByIdAndUpdate(patient._id, {
      lastVisit: new Date(),
      nextAppointment: appointmentDate
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty phone');

    // Log appointment creation activity
    try {
      // Get current user details for logging
      let currentUser = null;
      if (req.user.role === 'clinic') {
        currentUser = await Clinic.findById(req.user.id);
      } else if (req.user.role === 'doctor') {
        currentUser = await Doctor.findById(req.user.id);
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
        currentUser = await Nurse.findById(req.user.id);
      }

      // Get clinic name for logging
      let clinicName = 'Unknown Clinic';
      if (appointment.clinicId) {
        const clinic = await Clinic.findById(appointment.clinicId);
        if (clinic) {
          clinicName = clinic.name || clinic.fullName || 'Unknown Clinic';
        }
      }

      console.log('Logging appointment creation:', {
        patientName: patient.fullName,
        doctorName: doctor.fullName,
        appointmentType: appointment.appointmentType,
        clinicName: clinicName
      });

      if (currentUser) {
        await ActivityLogger.logAppointmentCreated(
          appointment,
          patient,
          doctor,
          {
            id: req.user.id,
            fullName: currentUser.fullName || currentUser.name,
            email: currentUser.email,
            role: req.user.role
          },
          req,
          clinicName
        );
      }
    } catch (logError) {
      console.error('Failed to log appointment creation:', logError);
      // Don't fail the appointment creation if logging fails
    }

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
router.put('/:id', auth, validateAppointment, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    // Check if appointment exists
    const appointment = await Appointment.findOne(query);
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
    const updatedAppointment = await Appointment.findOneAndUpdate(
      query,
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
router.delete('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const appointment = await Appointment.findOne(query);
    
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
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    console.log('Status update request:', { appointmentId: req.params.id, status, userRole: req.user.role, userId: req.user.id });
    
    if (!status || !['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No Show'].includes(status)) {
      console.log('Invalid status provided:', status);
      return res.status(400).json({ error: 'Valid status is required' });
    }

    let appointment;
    
    // Role-based access control for appointment updates
    if (req.user.role === 'doctor') {
      // Doctors can only update appointments for patients assigned to them
      const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': new mongoose.Types.ObjectId(req.user.id)
          }
        }
      ];
      
      const result = await Appointment.aggregate(pipeline);
      if (result.length === 0) {
        return res.status(403).json({ error: 'Access denied. You can only update appointments for your assigned patients.' });
      }
      appointment = await Appointment.findById(req.params.id);
    } else if (req.user.role === 'clinic') {
      // Clinic admins can only update appointments in their clinic
      appointment = await Appointment.findOne({ 
        _id: req.params.id, 
        clinicId: req.user.id 
      });
      if (!appointment) {
        return res.status(403).json({ error: 'Access denied. You can only update appointments in your clinic.' });
      }
    } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // Nursing staff can only update appointments in their clinic
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      
      if (!nurse || !nurse.clinicId) {
        return res.status(403).json({ error: 'Access denied. Nurse clinic information not found.' });
      }
      
      appointment = await Appointment.findOne({ 
        _id: req.params.id, 
        clinicId: nurse.clinicId 
      });
      if (!appointment) {
        return res.status(403).json({ error: 'Access denied. You can only update appointments in your clinic.' });
      }
    } else {
      // Super admin can update any appointment
      appointment = await Appointment.findById(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }
    }

    // Store old status for logging
    const oldStatus = appointment.status;

    // Update status directly
    appointment.status = status;
    appointment.updatedAt = new Date();
    await appointment.save();

    console.log('Status updated successfully:', { appointmentId: req.params.id, newStatus: status });

    // Log appointment status change activity
    try {
      // Get current user details for logging
      let currentUser = null;
      if (req.user.role === 'clinic') {
        currentUser = await Clinic.findById(req.user.id);
      } else if (req.user.role === 'doctor') {
        currentUser = await Doctor.findById(req.user.id);
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
        currentUser = await Nurse.findById(req.user.id);
      }

      if (currentUser) {
        await ActivityLogger.logAppointmentStatusChanged(
          appointment,
          oldStatus,
          status,
          {
            id: req.user.id,
            fullName: currentUser.fullName || currentUser.name,
            email: currentUser.email,
            role: req.user.role
          },
          req
        );
      }
    } catch (logError) {
      console.error('Failed to log appointment status change:', logError);
      // Don't fail the status update if logging fails
    }

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
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const query = {
      date: { $gte: startOfDay, $lt: endOfDay }
    };

    let appointments;

    // Role-based filtering: doctors only see appointments for patients assigned to them
    if (req.user.role === 'doctor') {
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': new mongoose.Types.ObjectId(req.user.id)
          }
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientId',
            pipeline: [
              { $project: { fullName: 1, phone: 1, email: 1 } }
            ]
          }
        },
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorId',
            pipeline: [
              { $project: { fullName: 1, specialty: 1, phone: 1 } }
            ]
          }
        },
        {
          $unwind: { path: '$patientId', preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: '$doctorId', preserveNullAndEmptyArrays: true }
        },
        {
          $project: { patient: 0, __v: 0 }
        },
        { $sort: { time: 1 } }
      ];

      appointments = await Appointment.aggregate(pipeline);
    } else if (req.user.role === 'clinic') {
      // Clinic admins see only their clinic's appointments
      query.clinicId = req.user.id;
      
      appointments = await Appointment.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone')
        .sort({ time: 1 })
        .select('-__v');
    } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // Nursing staff see appointments for their clinic
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      
      if (!nurse || !nurse.clinicId) {
        return res.status(403).json({ error: 'Access denied. Nurse clinic information not found.' });
      }
      
      query.clinicId = nurse.clinicId;
      
      appointments = await Appointment.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone')
        .sort({ time: 1 })
        .select('-__v');
    } else {
      // Super admin sees all appointments
      appointments = await Appointment.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone')
        .sort({ time: 1 })
        .select('-__v');
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/upcoming - Get upcoming appointments
router.get('/upcoming', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const query = {
      date: { $gte: new Date() },
      status: { $in: ['Scheduled', 'Confirmed'] }
    };

    let appointments;

    // Role-based filtering: doctors only see appointments for patients assigned to them
    if (req.user.role === 'doctor') {
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': new mongoose.Types.ObjectId(req.user.id)
          }
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patientId',
            pipeline: [
              { $project: { fullName: 1, phone: 1, email: 1 } }
            ]
          }
        },
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctorId',
            foreignField: '_id',
            as: 'doctorId',
            pipeline: [
              { $project: { fullName: 1, specialty: 1, phone: 1 } }
            ]
          }
        },
        {
          $unwind: { path: '$patientId', preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: '$doctorId', preserveNullAndEmptyArrays: true }
        },
        {
          $project: { patient: 0, __v: 0 }
        },
        { $sort: { date: 1, time: 1 } },
        { $limit: parseInt(limit) }
      ];

      appointments = await Appointment.aggregate(pipeline);
    } else if (req.user.role === 'clinic') {
      // Clinic admins see only their clinic's appointments
      query.clinicId = req.user.id;
      
      appointments = await Appointment.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone')
        .sort({ date: 1, time: 1 })
        .limit(parseInt(limit))
        .select('-__v');
    } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // Nursing staff see appointments for their clinic
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      
      if (!nurse || !nurse.clinicId) {
        return res.status(403).json({ error: 'Access denied. Nurse clinic information not found.' });
      }
      
      query.clinicId = nurse.clinicId;
      
      appointments = await Appointment.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone')
        .sort({ date: 1, time: 1 })
        .limit(parseInt(limit))
        .select('-__v');
    } else {
      // Super admin sees all appointments
      appointments = await Appointment.find(query)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone')
        .sort({ date: 1, time: 1 })
        .limit(parseInt(limit))
        .select('-__v');
    }
    
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/appointments/stats/summary - Get appointment statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    let totalAppointments, todayAppointments, upcomingAppointments, statusStats, typeStats;

    if (req.user.role === 'doctor') {
      // For doctors, use aggregation to filter by patient's assignedDoctors array
      const doctorObjectId = new mongoose.Types.ObjectId(req.user.id);
      
      // Total appointments for assigned patients
      const totalPipeline = [
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': doctorObjectId
          }
        },
        { $count: 'total' }
      ];
      
      const totalResult = await Appointment.aggregate(totalPipeline);
      totalAppointments = totalResult.length > 0 ? totalResult[0].total : 0;

      // Today's appointments for assigned patients
      const todayPipeline = [
        {
          $match: {
            date: { $gte: startOfDay, $lt: endOfDay }
          }
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': doctorObjectId
          }
        },
        { $count: 'total' }
      ];
      
      const todayResult = await Appointment.aggregate(todayPipeline);
      todayAppointments = todayResult.length > 0 ? todayResult[0].total : 0;

      // Upcoming appointments for assigned patients
      const upcomingPipeline = [
        {
          $match: {
            date: { $gte: new Date() },
            status: { $in: ['Scheduled', 'Confirmed'] }
          }
        },
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': doctorObjectId
          }
        },
        { $count: 'total' }
      ];
      
      const upcomingResult = await Appointment.aggregate(upcomingPipeline);
      upcomingAppointments = upcomingResult.length > 0 ? upcomingResult[0].total : 0;

      // Status stats for assigned patients
      statusStats = await Appointment.aggregate([
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': doctorObjectId
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      console.log('Doctor statusStats aggregation result:', statusStats);

      // Type stats for assigned patients
      typeStats = await Appointment.aggregate([
        {
          $lookup: {
            from: 'patients',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $match: {
            'patient.assignedDoctors': doctorObjectId
          }
        },
        {
          $group: {
            _id: '$appointmentType',
            count: { $sum: 1 }
          }
        }
      ]);
    } else if (req.user.role === 'clinic') {
      // Clinic admins see only their clinic's appointments
      const clinicQuery = { clinicId: req.user.id };
      
      totalAppointments = await Appointment.countDocuments(clinicQuery);
      todayAppointments = await Appointment.countDocuments({
        ...clinicQuery,
        date: { $gte: startOfDay, $lt: endOfDay }
      });
      upcomingAppointments = await Appointment.countDocuments({
        ...clinicQuery,
        date: { $gte: new Date() },
        status: { $in: ['Scheduled', 'Confirmed'] }
      });
      
      statusStats = await Appointment.aggregate([
        { $match: clinicQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      console.log('Clinic statusStats aggregation result:', statusStats);

      typeStats = await Appointment.aggregate([
        { $match: clinicQuery },
        {
          $group: {
            _id: '$appointmentType',
            count: { $sum: 1 }
          }
        }
      ]);
    } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // Nursing staff see appointments for their clinic
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      
      if (!nurse || !nurse.clinicId) {
        return res.status(403).json({ error: 'Access denied. Nurse clinic information not found.' });
      }
      
      const clinicQuery = { clinicId: nurse.clinicId };
      
      totalAppointments = await Appointment.countDocuments(clinicQuery);
      todayAppointments = await Appointment.countDocuments({
        ...clinicQuery,
        date: { $gte: startOfDay, $lt: endOfDay }
      });
      upcomingAppointments = await Appointment.countDocuments({
        ...clinicQuery,
        date: { $gte: new Date() },
        status: { $in: ['Scheduled', 'Confirmed'] }
      });
      
      statusStats = await Appointment.aggregate([
        { $match: clinicQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      typeStats = await Appointment.aggregate([
        { $match: clinicQuery },
        {
          $group: {
            _id: '$appointmentType',
            count: { $sum: 1 }
          }
        }
      ]);
    } else {
      // Super admin sees all appointments
      totalAppointments = await Appointment.countDocuments({});
      todayAppointments = await Appointment.countDocuments({
        date: { $gte: startOfDay, $lt: endOfDay }
      });
      upcomingAppointments = await Appointment.countDocuments({
        date: { $gte: new Date() },
        status: { $in: ['Scheduled', 'Confirmed'] }
      });
      
      statusStats = await Appointment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      typeStats = await Appointment.aggregate([
        {
          $group: {
            _id: '$appointmentType',
            count: { $sum: 1 }
          }
        }
      ]);
    }

    console.log('Appointment stats response:', {
      totalAppointments,
      todayAppointments,
      upcomingAppointments,
      statusStats,
      typeStats,
      userRole: req.user.role,
      userId: req.user.id
    });

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
