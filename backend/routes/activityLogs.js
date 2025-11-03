const express = require('express');
const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const ActivityLogger = require('../utils/activityLogger');
const Doctor = require('../models/Doctor');
const Nurse = require('../models/Nurse');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const { requireClinicAdmin } = require('../middleware/roleAuth');
const router = express.Router();

// Helper function to determine clinic ID from current user
const getClinicIdFromUser = async (currentUser) => {
  let clinicId = null;

  // Determine clinic ID based on user role and data
  if (currentUser.role === 'clinic') {
    // For clinic admins, their ID is the clinic ID
    clinicId = currentUser.id;
  } else {
    // For doctors/nurses, we need to fetch their clinic association
    let userDoc = null;
    
    if (currentUser.role === 'doctor') {
      userDoc = await Doctor.findById(currentUser.id).select('clinicId');
    } else if (currentUser.role === 'nurse' || currentUser.role === 'head_nurse' || currentUser.role === 'supervisor') {
      userDoc = await Nurse.findById(currentUser.id).select('clinicId');
    }
    
    if (userDoc && userDoc.clinicId) {
      clinicId = userDoc.clinicId;
    }
  }

  return clinicId;
};

// POST /api/activity-logs - Create a new activity log
router.post('/', auth, async (req, res) => {
  try {
    const {
      activityType,
      userName,
      userEmail,
      userRole,
      timestamp,
      description,
      details,
      ipAddress,
      deviceInfo
    } = req.body;

    // Get current user's clinic ID and clinic name
    const currentUser = req.user;
    const clinicId = await getClinicIdFromUser(currentUser);

    // If no clinic ID found, skip creating the log (optional for logout)
    if (!clinicId) {
      console.log('No clinic ID found for user, skipping activity log creation');
      return res.status(200).json({
        message: 'Activity log skipped - no clinic association',
        skipped: true
      });
    }

    // Get clinic name
    let clinicName = 'Unknown Clinic';
    try {
      const clinic = await Clinic.findById(clinicId).select('name');
      if (clinic) {
        clinicName = clinic.name;
      }
    } catch (err) {
      console.log('Could not fetch clinic name:', err.message);
    }

    // Parse user agent if deviceInfo not provided
    let parsedDeviceInfo = deviceInfo;
    if (!parsedDeviceInfo) {
      const userAgent = req.headers['user-agent'] || '';
      if (userAgent) {
        parsedDeviceInfo = ActivityLogger.parseUserAgent(userAgent);
      } else {
        parsedDeviceInfo = {
          browser: 'Unknown',
          os: 'Unknown',
          device: 'Unknown'
        };
      }
    }

    // Create activity log
    const activityLog = new ActivityLog({
      userId: currentUser.id,
      clinicId: clinicId,
      clinicName: clinicName,
      activityType: activityType || 'logout',
      userName: userName || currentUser.name || currentUser.fullName || 'Unknown User',
      userEmail: userEmail || currentUser.email || 'unknown@email.com',
      userRole: userRole || currentUser.role,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      notes: description || `${userName || currentUser.name} performed ${activityType}`,
      ipAddress: ipAddress || req.ip,
      userAgent: req.headers['user-agent'] || '',
      deviceInfo: parsedDeviceInfo
    });

    await activityLog.save();

    res.status(201).json({
      message: 'Activity log created successfully',
      log: activityLog
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to create activity log'
    });
  }
});

// GET /api/activity-logs - Get activity logs for clinic admin
router.get('/', auth, requireClinicAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      activityType,
      userId,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Get current user's clinic ID
    const currentUser = req.user;
    const clinicId = await getClinicIdFromUser(currentUser);

    if (!clinicId) {
      return res.status(400).json({ 
        error: 'Clinic ID not found',
        message: 'Unable to determine clinic association. Please contact support.'
      });
    }

    // Build query options
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Max 100 records per page
      sortBy,
      sortOrder
    };

    if (activityType) options.activityType = activityType;
    if (userId) options.userId = userId;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    // Get logs for the clinic
    console.log('🔍 Fetching activity logs for clinic:', clinicId);
    console.log('   Options:', options);
    const logs = await ActivityLog.getClinicLogs(clinicId, options);
    console.log('   Found logs:', logs.length);

    // Get total count for pagination
    const countQuery = { clinicId };
    if (activityType) countQuery.activityType = activityType;
    if (userId) countQuery.userId = userId;
    if (startDate || endDate) {
      countQuery.timestamp = {};
      if (startDate) countQuery.timestamp.$gte = new Date(startDate);
      if (endDate) countQuery.timestamp.$lte = new Date(endDate);
    }

    const totalLogs = await ActivityLog.countDocuments(countQuery);
    const totalPages = Math.ceil(totalLogs / options.limit);

    res.json({
      logs,
      pagination: {
        currentPage: options.page,
        totalPages,
        totalLogs,
        limit: options.limit,
        hasNextPage: options.page < totalPages,
        hasPrevPage: options.page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch activity logs'
    });
  }
});

// GET /api/activity-logs/stats - Get activity statistics for clinic
router.get('/stats', auth, requireClinicAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get current user's clinic ID
    const currentUser = req.user;
    const clinicId = await getClinicIdFromUser(currentUser);

    if (!clinicId) {
      return res.status(400).json({ 
        error: 'Clinic ID not found',
        message: 'Unable to determine clinic association. Please contact support.'
      });
    }

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const stats = await ActivityLog.getActivityStats(clinicId, options);

    res.json({
      clinicId,
      stats
    });
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch activity statistics'
    });
  }
});

// GET /api/activity-logs/users - Get list of users for filtering
router.get('/users', auth, requireClinicAdmin, async (req, res) => {
  try {
    // Get current user's clinic ID
    const currentUser = req.user;
    const clinicId = await getClinicIdFromUser(currentUser);

    if (!clinicId) {
      return res.status(400).json({ 
        error: 'Clinic ID not found',
        message: 'Unable to determine clinic association. Please contact support.'
      });
    }

    // Get unique users who have activity logs in this clinic
    const users = await ActivityLog.aggregate([
      { $match: { clinicId: new mongoose.Types.ObjectId(clinicId) } },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          userRole: { $first: '$userRole' },
          lastActivity: { $max: '$timestamp' },
          activityCount: { $sum: 1 }
        }
      },
      {
        $project: {
          userId: '$_id',
          userName: 1,
          userEmail: 1,
          userRole: 1,
          lastActivity: 1,
          activityCount: 1,
          _id: 0
        }
      },
      { $sort: { lastActivity: -1 } }
    ]);

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users for activity logs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch users'
    });
  }
});

// GET /api/activity-logs/export - Export activity logs as CSV
router.get('/export', auth, requireClinicAdmin, async (req, res) => {
  try {
    const {
      activityType,
      userId,
      startDate,
      endDate,
      format = 'csv'
    } = req.query;

    // Get current user's clinic ID
    const currentUser = req.user;
    const clinicId = await getClinicIdFromUser(currentUser);

    if (!clinicId) {
      return res.status(400).json({ 
        error: 'Clinic ID not found',
        message: 'Unable to determine clinic association. Please contact support.'
      });
    }

    // Build query
    const query = { clinicId };
    if (activityType) query.activityType = activityType;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get all matching logs (limit to 10000 for performance)
    const logs = await ActivityLog.find(query)
      .populate('userId', 'fullName email role')
      .populate('clinicId', 'name')
      .sort({ timestamp: -1 })
      .limit(10000)
      .exec();

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Timestamp',
        'User Name',
        'User Email',
        'User Role',
        'Activity Type',
        'IP Address',
        'Browser',
        'OS',
        'Duration (minutes)',
        'Notes'
      ];

      const csvRows = logs.map(log => [
        log.timestamp.toISOString(),
        log.userName,
        log.userEmail,
        log.userRole,
        log.activityType,
        log.ipAddress || '',
        log.deviceInfo?.browser || '',
        log.deviceInfo?.os || '',
        log.duration || '',
        log.notes || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="activity-logs-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({ logs });
    }
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to export activity logs'
    });
  }
});

// DELETE /api/activity-logs/cleanup - Clean up old activity logs (older than specified days)
router.delete('/cleanup', auth, requireClinicAdmin, async (req, res) => {
  try {
    const { days = 90 } = req.query; // Default: keep logs for 90 days
    
    // Get current user's clinic ID
    const currentUser = req.user;
    const clinicId = await getClinicIdFromUser(currentUser);

    if (!clinicId) {
      return res.status(400).json({ 
        error: 'Clinic ID not found',
        message: 'Unable to determine clinic association. Please contact support.'
      });
    }

    const cutoffDate = new Date(Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000));

    const result = await ActivityLog.deleteMany({
      clinicId,
      timestamp: { $lt: cutoffDate }
    });

    res.json({
      message: `Cleaned up activity logs older than ${days} days`,
      deletedCount: result.deletedCount,
      cutoffDate
    });
  } catch (error) {
    console.error('Error cleaning up activity logs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to clean up activity logs'
    });
  }
});

module.exports = router;
