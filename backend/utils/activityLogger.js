const ActivityLog = require('../models/ActivityLog');
const mongoose = require('mongoose');

/**
 * Utility class for logging user activities
 */
class ActivityLogger {
  /**
   * Log user activity (login, logout, etc.)
   * @param {Object} options - Activity logging options
   * @param {string} options.userId - User ID
   * @param {string} options.userName - User's full name
   * @param {string} options.userEmail - User's email
   * @param {string} options.userRole - User's role
   * @param {string} options.clinicId - Clinic ID
   * @param {string} options.clinicName - Clinic name
   * @param {string} options.activityType - Type of activity (login, logout, etc.)
   * @param {Object} options.req - Express request object (for IP, user agent, etc.)
   * @param {string} options.sessionId - Session ID (optional)
   * @param {number} options.duration - Session duration in minutes (for logout)
   * @param {string} options.notes - Additional notes (optional)
   */
  static async logActivity(options) {
    try {
      const {
        userId,
        userName,
        userEmail,
        userRole,
        clinicId,
        clinicName,
        activityType,
        req,
        sessionId,
        duration,
        notes
      } = options;

      // Validate required fields
      if (!userId || !userName || !userEmail || !userRole || !clinicId || !clinicName || !activityType) {
        console.error('ActivityLogger: Missing required fields for logging activity');
        return null;
      }

      // Extract device/browser information from request
      let deviceInfo = {};
      let ipAddress = '';
      let userAgent = '';

      if (req) {
        // Get IP address
        ipAddress = req.ip || 
                   req.connection?.remoteAddress || 
                   req.socket?.remoteAddress || 
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.headers['x-real-ip'] || 
                   'Unknown';

        // Get user agent
        userAgent = req.headers['user-agent'] || '';

        // Parse user agent for device info (simple parsing without external library)
        if (userAgent) {
          deviceInfo = this.parseUserAgent(userAgent);
        }
      }

      // Create activity log entry
      const activityData = {
        userId: new mongoose.Types.ObjectId(userId),
        userName,
        userEmail,
        userRole,
        clinicId: new mongoose.Types.ObjectId(clinicId),
        clinicName,
        activityType,
        timestamp: new Date(),
        sessionId,
        ipAddress,
        userAgent,
        deviceInfo,
        duration,
        notes
      };

      // Add appointment-specific fields if they exist in options
      if (options.appointmentId) activityData.appointmentId = new mongoose.Types.ObjectId(options.appointmentId);
      if (options.patientId) activityData.patientId = new mongoose.Types.ObjectId(options.patientId);
      if (options.patientName) activityData.patientName = options.patientName;
      if (options.doctorId) activityData.doctorId = new mongoose.Types.ObjectId(options.doctorId);
      if (options.doctorName) activityData.doctorName = options.doctorName;
      if (options.appointmentType) activityData.appointmentType = options.appointmentType;
      if (options.appointmentDate) activityData.appointmentDate = options.appointmentDate;
      if (options.appointmentTime) activityData.appointmentTime = options.appointmentTime;
      if (options.oldStatus) activityData.oldStatus = options.oldStatus;
      if (options.newStatus) activityData.newStatus = options.newStatus;
      
      // Add new activity-specific fields
      if (options.prescriptionId) activityData.prescriptionId = new mongoose.Types.ObjectId(options.prescriptionId);
      if (options.nurseId) activityData.nurseId = new mongoose.Types.ObjectId(options.nurseId);
      if (options.nurseName) activityData.nurseName = options.nurseName;
      if (options.teleconsultationId) activityData.teleconsultationId = new mongoose.Types.ObjectId(options.teleconsultationId);
      if (options.invoiceId) activityData.invoiceId = new mongoose.Types.ObjectId(options.invoiceId);
      if (options.invoiceAmount) activityData.invoiceAmount = options.invoiceAmount;
      if (options.referralId) activityData.referralId = new mongoose.Types.ObjectId(options.referralId);
      if (options.referralType) activityData.referralType = options.referralType;
      if (options.targetEntity) activityData.targetEntity = options.targetEntity;
      if (options.targetEntityId) activityData.targetEntityId = new mongoose.Types.ObjectId(options.targetEntityId);

      // Don't include the req object or any other complex objects

      // Save to database
      console.log('Attempting to save activity log:', { activityType, userName, clinicName });
      const log = new ActivityLog(activityData);
      await log.save();
      
      console.log(`✓ Activity logged successfully: ${activityType} for user ${userName} (${userEmail}) at ${clinicName}`);
      
      return log;
    } catch (error) {
      console.error('✗ Error logging activity:', error);
      console.error('Activity data that failed:', activityData);
      // Don't throw error to avoid breaking the main flow
      return null;
    }
  }

  /**
   * Log user login
   * @param {Object} user - User object
   * @param {Object} req - Express request object
   * @param {string} sessionId - Session ID
   */
  static async logLogin(user, req, sessionId = null) {
    return this.logActivity({
      userId: user._id || user.id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: user.clinicId || user._id, // For clinic admins, clinicId might be their own ID
      clinicName: user.clinicName || user.name || 'Unknown Clinic',
      activityType: 'login',
      req,
      sessionId,
      notes: 'User logged in successfully'
    });
  }

  /**
   * Log user logout
   * @param {Object} user - User object
   * @param {Object} req - Express request object
   * @param {string} sessionId - Session ID
   * @param {number} sessionDuration - Session duration in minutes
   */
  static async logLogout(user, req, sessionId = null, sessionDuration = null) {
    return this.logActivity({
      userId: user._id || user.id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: user.clinicId || user._id,
      clinicName: user.clinicName || user.name || 'Unknown Clinic',
      activityType: 'logout',
      req,
      sessionId,
      duration: sessionDuration,
      notes: sessionDuration ? `Session duration: ${sessionDuration} minutes` : 'User logged out'
    });
  }

  /**
   * Log session expiry
   * @param {Object} user - User object
   * @param {string} sessionId - Session ID
   * @param {number} sessionDuration - Session duration in minutes
   */
  static async logSessionExpiry(user, sessionId = null, sessionDuration = null) {
    return this.logActivity({
      userId: user._id || user.id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: user.clinicId || user._id,
      clinicName: user.clinicName || user.name || 'Unknown Clinic',
      activityType: 'session_expired',
      req: null, // No request object for session expiry
      sessionId,
      duration: sessionDuration,
      notes: 'Session expired automatically'
    });
  }

  /**
   * Log forced logout (admin action)
   * @param {Object} user - User object being logged out
   * @param {Object} adminUser - Admin user performing the action
   * @param {Object} req - Express request object
   * @param {string} reason - Reason for forced logout
   */
  static async logForcedLogout(user, adminUser, req, reason = 'Forced logout by admin') {
    return this.logActivity({
      userId: user._id || user.id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: user.clinicId || user._id,
      clinicName: user.clinicName || user.name || 'Unknown Clinic',
      activityType: 'forced_logout',
      req,
      notes: `${reason}. Action performed by: ${adminUser.fullName || adminUser.name} (${adminUser.email})`
    });
  }

  /**
   * Get recent activities for a clinic
   * @param {string} clinicId - Clinic ID
   * @param {number} limit - Number of recent activities to fetch
   */
  static async getRecentActivities(clinicId, limit = 10) {
    try {
      const activities = await ActivityLog.getClinicLogs(clinicId, {
        page: 1,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      return activities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  /**
   * Get activity statistics for a clinic
   * @param {string} clinicId - Clinic ID
   * @param {Object} options - Options for date range
   */
  static async getActivityStats(clinicId, options = {}) {
    try {
      const stats = await ActivityLog.getActivityStats(clinicId, options);
      return stats;
    } catch (error) {
      console.error('Error fetching activity statistics:', error);
      return { summary: [], dailyActivity: [] };
    }
  }

  /**
   * Log appointment creation
   * @param {Object} appointment - Appointment object
   * @param {Object} patient - Patient object
   * @param {Object} doctor - Doctor object
   * @param {Object} user - Current user creating the appointment
   * @param {Object} req - Express request object
   * @param {string} clinicName - Clinic name for logging
   */
  static async logAppointmentCreated(appointment, patient, doctor, user, req, clinicName = 'Unknown Clinic') {
    try {
      console.log('ActivityLogger.logAppointmentCreated called with:', {
        patientName: patient.fullName,
        doctorName: doctor.fullName,
        appointmentType: appointment.appointmentType,
        clinicName: clinicName
      });

      const logData = {
        userId: user.id,
        userName: user.fullName || user.name || 'System User',
        userEmail: user.email || 'system@clinic.com',
        userRole: user.role,
        clinicId: appointment.clinicId,
        clinicName: clinicName,
        activityType: 'appointment_created',
        req,
        appointmentId: appointment._id,
        patientId: patient._id,
        patientName: patient.fullName,
        doctorId: doctor._id,
        doctorName: doctor.fullName,
        appointmentType: appointment.appointmentType,
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        notes: `Appointment created for ${patient.fullName} with Dr. ${doctor.fullName} on ${appointment.date} at ${appointment.time}`
      };

      console.log('Calling logActivity with data:', logData);
      return this.logActivity(logData);
    } catch (error) {
      console.error('Error logging appointment creation:', error);
      return null;
    }
  }

  /**
   * Log appointment status change
   * @param {Object} appointment - Appointment object
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {Object} user - Current user making the change
   * @param {Object} req - Express request object
   */
  static async logAppointmentStatusChanged(appointment, oldStatus, newStatus, user, req) {
    try {
      return this.logActivity({
        userId: user.id,
        userName: user.fullName || user.name || 'System User',
        userEmail: user.email || 'system@clinic.com',
        userRole: user.role,
        clinicId: appointment.clinicId,
        clinicName: 'Clinic', // Will be populated from clinic data
        activityType: 'appointment_status_changed',
        req,
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        doctorId: appointment.doctorId,
        doctorName: appointment.provider,
        appointmentType: appointment.appointmentType,
        appointmentDate: appointment.date,
        appointmentTime: appointment.time,
        oldStatus,
        newStatus,
        notes: `Appointment status changed from "${oldStatus}" to "${newStatus}" for ${appointment.patientName} on ${appointment.date} at ${appointment.time}`
      });
    } catch (error) {
      console.error('Error logging appointment status change:', error);
      return null;
    }
  }

  /**
   * Log password reset activity
   * @param {Object} user - User object
   * @param {Object} req - Express request object
   */
  static async logPasswordReset(user, req) {
    try {
      return await this.logActivity({
        userId: user._id,
        userName: user.fullName,
        userEmail: user.email,
        userRole: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinicName,
        activityType: 'password_reset',
        req,
        notes: 'Password reset successfully using OTP verification'
      });
    } catch (error) {
      console.error('ActivityLogger: Failed to log password reset activity:', error);
      return null;
    }
  }

  /**
   * Parse user agent string to extract device information
   * @param {string} userAgent - User agent string
   * @returns {Object} Device information
   */
  static parseUserAgent(userAgent = '') {
    const ua = userAgent.toLowerCase();
    
    // Browser detection
    let browser = 'Unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('edg')) {
      browser = 'Edge';
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = 'Opera';
    } else if (ua.includes('msie') || ua.includes('trident')) {
      browser = 'Internet Explorer';
    }

    // OS detection
    let os = 'Unknown';
    if (ua.includes('windows nt 10.0')) {
      os = 'Windows 10/11';
    } else if (ua.includes('windows nt 6.3')) {
      os = 'Windows 8.1';
    } else if (ua.includes('windows nt 6.2')) {
      os = 'Windows 8';
    } else if (ua.includes('windows nt 6.1')) {
      os = 'Windows 7';
    } else if (ua.includes('windows')) {
      os = 'Windows';
    } else if (ua.includes('mac os x')) {
      os = 'macOS';
    } else if (ua.includes('linux')) {
      os = 'Linux';
    } else if (ua.includes('android')) {
      os = 'Android';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
    }

    // Device type detection
    let device = 'Desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet';
    }

    return {
      browser,
      os,
      device
    };
  }

  /**
   * Helper method to log prescription activities
   */
  static async logPrescriptionActivity(activityType, prescription, patient, doctor, user, req, clinicName) {
    return this.logActivity({
      userId: user.id || user._id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: prescription.clinicId || user.clinicId,
      clinicName,
      activityType,
      req,
      prescriptionId: prescription._id,
      patientId: patient._id,
      patientName: patient.fullName,
      doctorId: doctor._id,
      doctorName: doctor.fullName,
      notes: `Prescription ${activityType.replace('prescription_', '')} for ${patient.fullName}`
    });
  }

  /**
   * Helper method to log doctor/nurse management activities
   */
  static async logStaffActivity(activityType, targetEntity, user, req, clinicName) {
    return this.logActivity({
      userId: user.id || user._id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: user.clinicId || user._id,
      clinicName,
      activityType,
      req,
      targetEntity: targetEntity.fullName,
      targetEntityId: targetEntity._id,
      notes: `${activityType.replace('_', ' ')} - ${targetEntity.fullName}`
    });
  }

  /**
   * Helper method to log teleconsultation activities
   */
  static async logTeleconsultationActivity(activityType, teleconsultation, patient, doctor, user, req, clinicName) {
    return this.logActivity({
      userId: user.id || user._id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: teleconsultation.clinicId || user.clinicId,
      clinicName,
      activityType,
      req,
      teleconsultationId: teleconsultation._id,
      patientId: patient._id,
      patientName: patient.fullName || patient.name,
      doctorId: doctor._id,
      doctorName: doctor.fullName,
      notes: `Teleconsultation ${activityType.replace('teleconsultation_', '')} for ${patient.fullName || patient.name}`
    });
  }

  /**
   * Helper method to log invoice activities
   */
  static async logInvoiceActivity(activityType, invoice, patient, user, req, clinicName) {
    return this.logActivity({
      userId: user.id || user._id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: invoice.clinicId || user.clinicId,
      clinicName,
      activityType,
      req,
      invoiceId: invoice._id,
      invoiceAmount: invoice.totalAmount,
      patientId: patient._id,
      patientName: patient.fullName,
      notes: `Invoice ${activityType.replace('invoice_', '')} - Amount: ${invoice.totalAmount} for ${patient.fullName}`
    });
  }

  /**
   * Helper method to log referral activities
   */
  static async logReferralActivity(activityType, referral, patient, user, req, clinicName) {
    return this.logActivity({
      userId: user.id || user._id,
      userName: user.fullName || user.name,
      userEmail: user.email,
      userRole: user.role,
      clinicId: referral.clinicId || user.clinicId,
      clinicName,
      activityType,
      req,
      referralId: referral._id,
      referralType: referral.referralType,
      patientId: patient._id,
      patientName: patient.fullName || patient.name,
      notes: `${referral.referralType} referral ${activityType.replace('referral_', '')} for ${patient.fullName || patient.name}`
    });
  }
}

module.exports = ActivityLogger;
