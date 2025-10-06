const express = require('express');
const { body, validationResult } = require('express-validator');
const Teleconsultation = require('../models/Teleconsultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const jitsiService = require('../services/jitsiService');
const auth = require('../middleware/auth');
const router = express.Router();

// Validation middleware for teleconsultation creation
const validateTeleconsultation = [
  body('appointmentId').isMongoId().withMessage('Valid appointment ID is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('scheduledTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format (HH:MM) is required'),
  body('duration').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15 and 240 minutes'),
  body('requirePassword').optional().isBoolean(),
  body('enableRecording').optional().isBoolean()
];

// GET /api/teleconsultations - Get all teleconsultations with filtering
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      patientId = '',
      doctorId = '',
      date = '',
      sortBy = 'scheduledDate',
      sortOrder = 'desc'
    } = req.query;

    console.log('Teleconsultation query params:', req.query);
    console.log('Status parameter:', status, 'Type:', typeof status, 'Is Array:', Array.isArray(status));

    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    }

    // Apply filters
    if (status && status !== 'all') {
      // Support both single status and array of statuses
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else if (status.includes(',')) {
        // Handle comma-separated status values
        const statusArray = status.split(',').map(s => s.trim());
        query.status = { $in: statusArray };
      } else {
        query.status = status;
      }
    }
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (doctorId) {
      query.doctorId = doctorId;
    }
    
    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.scheduledDate = {
        $gte: searchDate,
        $lt: nextDay
      };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    let selectFields = '';
    
    // Only exclude passwords for non-doctors
    if (req.user.role !== 'doctor') {
      selectFields = '-jitsiConfig.moderatorPassword -jitsiConfig.participantPassword';
    } else {
      // Doctors can see both passwords to determine which one to use
      selectFields = '';
    }
    
    const teleconsultations = await Teleconsultation.find(query)
      .populate('patientId', 'fullName phone email profileImage')
      .populate('doctorId', 'fullName specialty phone email')
      .populate('appointmentId', 'appointmentType reason')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select(selectFields);

    // Get total count for pagination
    const total = await Teleconsultation.countDocuments(query);

    // Debug: Log password information for doctors
    if (req.user.role === 'doctor' && teleconsultations.length > 0) {
      console.log('🔍 Debug - Teleconsultation passwords for doctor:');
      teleconsultations.forEach((tc, index) => {
        console.log(`  Teleconsultation ${index + 1}:`);
        console.log(`    Room: ${tc.jitsiConfig?.roomName}`);
        console.log(`    Moderator Password: ${tc.jitsiConfig?.moderatorPassword}`);
        console.log(`    Participant Password: ${tc.jitsiConfig?.participantPassword}`);
        console.log(`    Doctor Meeting URL: ${tc.doctorMeetingUrl}`);
      });
    }

    res.json({
      teleconsultations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTeleconsultations: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching teleconsultations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teleconsultations/:id - Get teleconsultation by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // Role-based access control
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    }

    const teleconsultation = await Teleconsultation.findOne(query)
      .populate('patientId', 'fullName phone email profileImage address')
      .populate('doctorId', 'fullName specialty phone email')
      .populate('appointmentId', 'appointmentType reason notes');

    if (!teleconsultation) {
      return res.status(404).json({ error: 'Teleconsultation not found' });
    }

    // Remove sensitive information based on user role
    const response = teleconsultation.toObject();
    if (req.user.role !== 'doctor' && req.user.id !== teleconsultation.doctorId.toString()) {
      delete response.jitsiConfig.moderatorPassword;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching teleconsultation:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid teleconsultation ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teleconsultations - Create new teleconsultation
router.post('/', auth, validateTeleconsultation, async (req, res) => {
  try {
    console.log('Creating teleconsultation with data:', req.body);
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

    const {
      appointmentId,
      scheduledDate,
      scheduledTime,
      duration = 30,
      requirePassword = false,
      enableRecording = false,
      features = {}
    } = req.body;

    // Validate date format
    if (!scheduledDate) {
      console.log('Missing scheduledDate in request body');
      return res.status(400).json({ error: 'Scheduled date is required' });
    }

    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      console.log('Invalid scheduledDate format:', scheduledDate);
      return res.status(400).json({ error: 'Invalid date format for scheduledDate' });
    }

    // Verify appointment exists and get details
    console.log('Looking for appointment with ID:', appointmentId);
    const appointment = await Appointment.findById(appointmentId)
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty phone email');

    if (!appointment) {
      console.log('Appointment not found for ID:', appointmentId);
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    console.log('Found appointment:', {
      id: appointment._id,
      patientName: appointment.patientId?.fullName,
      doctorName: appointment.doctorId?.fullName,
      clinicId: appointment.clinicId
    });

    // Check if teleconsultation already exists for this appointment
    const existingTeleconsultation = await Teleconsultation.findOne({ appointmentId });
    if (existingTeleconsultation) {
      return res.status(400).json({ error: 'Teleconsultation already exists for this appointment' });
    }

    // Create Jitsi Meet meeting
    console.log('Creating Jitsi meeting with data:', {
      appointmentId,
      patientName: appointment.patientId.fullName,
      doctorName: appointment.doctorId.fullName,
      scheduledDate,
      scheduledTime,
      duration,
      requirePassword,
      enableRecording
    });
    
    const meetingResult = await jitsiService.createMeeting({
      appointmentId,
      patientName: appointment.patientId.fullName,
      doctorName: appointment.doctorId.fullName,
      scheduledDate,
      scheduledTime,
      duration,
      requirePassword,
      enableRecording
    });

    console.log('Jitsi meeting result:', meetingResult);

    if (!meetingResult.success) {
      console.log('Failed to create Jitsi meeting:', meetingResult.error);
      return res.status(500).json({ error: 'Failed to create meeting: ' + meetingResult.error });
    }

    const { meeting } = meetingResult;

    // Create teleconsultation record
    const teleconsultationData = {
      appointmentId,
      patientId: appointment.patientId._id,
      patientName: appointment.patientId.fullName,
      doctorId: appointment.doctorId._id,
      doctorName: appointment.doctorId.fullName,
      clinicId: appointment.clinicId,
      meetingId: meeting.meetingId,
      meetingUrl: meeting.meetingUrl,
      doctorMeetingUrl: meeting.urls.doctorDirect || meeting.urls.doctor,
      patientMeetingUrl: meeting.urls.patientDirect || meeting.urls.patient,
      doctorDirectUrl: meeting.urls.doctorDirect,
      patientDirectUrl: meeting.urls.patientDirect,
      meetingPassword: meeting.participantPassword,
      jitsiConfig: {
        roomName: meeting.roomName,
        domain: meeting.domain,
        moderatorPassword: meeting.moderatorPassword,
        participantPassword: meeting.participantPassword
      },
      scheduledDate: parsedDate,
      scheduledTime,
      duration,
      features: {
        recording: {
          enabled: enableRecording
        },
        screenSharing: features.screenSharing !== false,
        chat: features.chat !== false,
        whiteboard: features.whiteboard || false,
        fileSharing: features.fileSharing !== false
      }
    };

    console.log('Creating teleconsultation with data:', teleconsultationData);
    
    const teleconsultation = new Teleconsultation(teleconsultationData);
    console.log('Saving teleconsultation to database...');
    await teleconsultation.save();
    console.log('Teleconsultation saved successfully with ID:', teleconsultation._id);

    // Populate the response
    const populatedTeleconsultation = await Teleconsultation.findById(teleconsultation._id)
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty phone email')
      .populate('appointmentId', 'appointmentType reason');

    // Generate invitation texts
    const patientInvitation = jitsiService.generateInvitationText({
      patientName: appointment.patientId.fullName,
      doctorName: appointment.doctorId.fullName,
      scheduledDate,
      scheduledTime,
      meetingId: meeting.meetingId,
      meetingUrl: meeting.urls.patient,
      participantPassword: meeting.participantPassword
    });

    const doctorInvitation = jitsiService.generateDoctorInvitationText({
      patientName: appointment.patientId.fullName,
      doctorName: appointment.doctorId.fullName,
      scheduledDate,
      scheduledTime,
      meetingId: meeting.meetingId,
      urls: meeting.urls,
      moderatorPassword: meeting.moderatorPassword
    });

    res.status(201).json({
      message: 'Teleconsultation created successfully',
      teleconsultation: populatedTeleconsultation,
      meetingUrls: meeting.urls,
      invitations: {
        patient: patientInvitation,
        doctor: doctorInvitation
      }
    });

  } catch (error) {
    console.error('Error creating teleconsultation:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.log('Validation error details:', Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      })));
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      console.log('Duplicate key error:', error.keyPattern);
      return res.status(400).json({
        error: 'Duplicate entry',
        details: 'A teleconsultation with this meeting ID already exists'
      });
    }
    
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// PATCH /api/teleconsultations/:id/start - Start teleconsultation
router.patch('/:id/start', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // Role-based access control - only doctors can start meetings
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const teleconsultation = await Teleconsultation.findOne(query);
    if (!teleconsultation) {
      return res.status(404).json({ error: 'Teleconsultation not found' });
    }

    // Allow starting teleconsultations that are Scheduled, or return current state if already active
    if (!['Scheduled', 'Started', 'In Progress'].includes(teleconsultation.status)) {
      return res.status(400).json({ error: 'Teleconsultation cannot be started in current status' });
    }

    // If already started or in progress, return current state without error
    if (['Started', 'In Progress'].includes(teleconsultation.status)) {
      const currentTeleconsultation = await Teleconsultation.findById(teleconsultation._id)
        .populate('patientId', 'fullName phone email')
        .populate('doctorId', 'fullName specialty phone email');

      return res.json({
        message: 'Teleconsultation is already active',
        teleconsultation: currentTeleconsultation
      });
    }

    // Start the meeting
    await teleconsultation.startMeeting();

    // Add doctor as participant
    await teleconsultation.addParticipant(
      teleconsultation.doctorId,
      'Doctor',
      teleconsultation.doctorName,
      'moderator'
    );

    const updatedTeleconsultation = await Teleconsultation.findById(teleconsultation._id)
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty phone email');

    res.json({
      message: 'Teleconsultation started successfully',
      teleconsultation: updatedTeleconsultation
    });

  } catch (error) {
    console.error('Error starting teleconsultation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/teleconsultations/:id/end - End teleconsultation
router.patch('/:id/end', auth, async (req, res) => {
  try {
    const { consultationNotes, diagnosis, prescription, followUpRequired, followUpDate } = req.body;
    
    const query = { _id: req.params.id };
    
    // Role-based access control
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const teleconsultation = await Teleconsultation.findOne(query);
    if (!teleconsultation) {
      return res.status(404).json({ error: 'Teleconsultation not found' });
    }

    if (!['Started', 'In Progress'].includes(teleconsultation.status)) {
      return res.status(400).json({ error: 'Teleconsultation is not active' });
    }

    // Update consultation details
    if (consultationNotes) teleconsultation.consultationNotes = consultationNotes;
    if (diagnosis) teleconsultation.diagnosis = diagnosis;
    if (prescription) teleconsultation.prescription = prescription;
    if (followUpRequired !== undefined) teleconsultation.followUpRequired = followUpRequired;
    if (followUpDate) teleconsultation.followUpDate = new Date(followUpDate);

    // End the meeting
    await teleconsultation.endMeeting();

    // End the Jitsi meeting
    await jitsiService.endMeeting(teleconsultation.jitsiConfig.roomName);

    const updatedTeleconsultation = await Teleconsultation.findById(teleconsultation._id)
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty phone email');

    res.json({
      message: 'Teleconsultation ended successfully',
      teleconsultation: updatedTeleconsultation
    });

  } catch (error) {
    console.error('Error ending teleconsultation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/teleconsultations/:id/cancel - Cancel teleconsultation
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const query = { _id: req.params.id };
    
    // Role-based access control
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const teleconsultation = await Teleconsultation.findOne(query);
    if (!teleconsultation) {
      return res.status(404).json({ error: 'Teleconsultation not found' });
    }

    if (teleconsultation.status === 'Completed') {
      return res.status(400).json({ error: 'Cannot cancel completed teleconsultation' });
    }

    // Cancel the meeting
    await teleconsultation.cancelMeeting();
    
    if (reason) {
      teleconsultation.consultationNotes = `Cancelled: ${reason}`;
      await teleconsultation.save();
    }

    // End the Jitsi meeting if it was active
    if (['Started', 'In Progress'].includes(teleconsultation.status)) {
      await jitsiService.endMeeting(teleconsultation.jitsiConfig.roomName);
    }

    const updatedTeleconsultation = await Teleconsultation.findById(teleconsultation._id)
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty phone email');

    res.json({
      message: 'Teleconsultation cancelled successfully',
      teleconsultation: updatedTeleconsultation
    });

  } catch (error) {
    console.error('Error cancelling teleconsultation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teleconsultations/:id/join - Join teleconsultation (for tracking)
router.post('/:id/join', auth, async (req, res) => {
  try {
    const { userType = 'Patient' } = req.body;
    
    const teleconsultation = await Teleconsultation.findById(req.params.id);
    if (!teleconsultation) {
      return res.status(404).json({ error: 'Teleconsultation not found' });
    }

    // Determine user name based on role
    let userName = 'Unknown User';
    if (req.user.role === 'doctor') {
      userName = teleconsultation.doctorName;
    } else if (req.user.role === 'patient') {
      userName = teleconsultation.patientName;
    }

    // Add participant
    await teleconsultation.addParticipant(
      req.user.id,
      userType,
      userName,
      req.user.role === 'doctor' ? 'moderator' : 'participant'
    );

    // Update status to In Progress if it was just Started
    if (teleconsultation.status === 'Started') {
      teleconsultation.status = 'In Progress';
      await teleconsultation.save();
    }

    res.json({
      message: 'Joined teleconsultation successfully',
      meetingUrl: teleconsultation.meetingUrl
    });

  } catch (error) {
    console.error('Error joining teleconsultation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teleconsultations/stats/summary - Get teleconsultation statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // Build base query for role-based filtering
    const baseQuery = {};
    if (req.user.role === 'clinic') {
      baseQuery.clinicId = req.user.id;
    } else if (req.user.role === 'doctor') {
      baseQuery.doctorId = req.user.id;
    }

    const totalTeleconsultations = await Teleconsultation.countDocuments(baseQuery);
    
    // Get teleconsultations by status
    const statusStats = await Teleconsultation.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get upcoming teleconsultations (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingCount = await Teleconsultation.countDocuments({
      ...baseQuery,
      scheduledDate: {
        $gte: new Date(),
        $lte: nextWeek
      },
      status: 'Scheduled'
    });

    // Get today's teleconsultations
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await Teleconsultation.countDocuments({
      ...baseQuery,
      scheduledDate: {
        $gte: today,
        $lt: tomorrow
      }
    });

    res.json({
      totalTeleconsultations,
      statusStats,
      upcomingCount,
      todayCount
    });

  } catch (error) {
    console.error('Error fetching teleconsultation stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teleconsultations/meeting/:meetingId - Get teleconsultation by meeting ID
router.get('/meeting/:meetingId', auth, async (req, res) => {
  try {
    const teleconsultation = await Teleconsultation.findOne({ meetingId: req.params.meetingId })
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty phone email')
      .populate('appointmentId', 'appointmentType reason');

    if (!teleconsultation) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
                     teleconsultation.doctorId._id.toString() === req.user.id ||
                     teleconsultation.patientId._id.toString() === req.user.id ||
                     (req.user.role === 'clinic' && teleconsultation.clinicId.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove sensitive information based on user role
    const response = teleconsultation.toObject();
    if (req.user.id !== teleconsultation.doctorId._id.toString()) {
      delete response.jitsiConfig.moderatorPassword;
    }

    res.json(response);

  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
