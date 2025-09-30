const crypto = require('crypto');

class JitsiMeetService {
  constructor() {
    this.domain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    this.appId = process.env.JITSI_APP_ID || 'teleconsult';
    this.secretKey = process.env.JITSI_SECRET_KEY || crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a unique room name for the meeting
   * @param {string} appointmentId - The appointment ID
   * @param {string} patientName - Patient's name
   * @param {string} doctorName - Doctor's name
   * @returns {string} Unique room name
   */
  generateRoomName(appointmentId, patientName, doctorName) {
    const timestamp = Date.now();
    const patientInitials = this.getInitials(patientName);
    const doctorInitials = this.getInitials(doctorName);
    const appointmentShort = appointmentId.slice(-6);
    
    return `${this.appId}-${patientInitials}${doctorInitials}-${appointmentShort}-${timestamp}`;
  }

  /**
   * Get initials from a full name
   * @param {string} fullName - Full name
   * @returns {string} Initials
   */
  getInitials(fullName) {
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3); // Limit to 3 characters
  }

  /**
   * Generate a secure meeting password
   * @returns {string} Meeting password
   */
  generateMeetingPassword() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  /**
   * Create a new Jitsi Meet meeting
   * @param {Object} meetingData - Meeting configuration data
   * @returns {Object} Meeting details
   */
  async createMeeting(meetingData) {
    try {
      const {
        appointmentId,
        patientName,
        doctorName,
        scheduledDate,
        scheduledTime,
        duration = 30,
        requirePassword = false,
        enableRecording = false
      } = meetingData;

      // Generate unique room name
      const roomName = this.generateRoomName(appointmentId, patientName, doctorName);
      
      // Generate meeting ID (shorter, user-friendly version)
      const meetingId = this.generateMeetingId();
      
      // Generate passwords if required
      const moderatorPassword = this.generateMeetingPassword();
      const participantPassword = requirePassword ? this.generateMeetingPassword() : null;
      
      // Create meeting URL
      const meetingUrl = this.generateMeetingUrl(roomName, {
        password: participantPassword,
        displayName: `Dr. ${doctorName} - ${patientName}`,
        startWithAudioMuted: true,
        startWithVideoMuted: false
      });

      // Generate JWT token for enhanced security (if using Jitsi Meet with JWT)
      const jwtToken = this.generateJWTToken({
        roomName,
        moderatorPassword,
        participantPassword,
        duration,
        enableRecording
      });

      const meeting = {
        meetingId,
        meetingUrl,
        roomName,
        domain: this.domain,
        moderatorPassword,
        participantPassword,
        jwtToken,
        config: {
          enableRecording,
          requirePassword,
          duration,
          features: {
            screenSharing: true,
            chat: true,
            whiteboard: false,
            fileSharing: true,
            recording: enableRecording
          }
        },
        urls: {
          patient: this.generateParticipantUrl(roomName, patientName, 'participant', participantPassword),
          doctor: this.generateParticipantUrl(roomName, doctorName, 'moderator', moderatorPassword),
          direct: meetingUrl
        }
      };

      console.log(`✅ Jitsi Meet meeting created: ${meetingId} for room: ${roomName}`);
      return {
        success: true,
        meeting
      };

    } catch (error) {
      console.error('❌ Error creating Jitsi Meet meeting:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate a user-friendly meeting ID
   * @returns {string} Meeting ID
   */
  generateMeetingId() {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
      if (i === 2 || i === 5) result += '-';
    }
    return result;
  }

  /**
   * Generate meeting URL with parameters
   * @param {string} roomName - Room name
   * @param {Object} options - URL options
   * @returns {string} Complete meeting URL
   */
  generateMeetingUrl(roomName, options = {}) {
    const baseUrl = `https://${this.domain}/${roomName}`;
    const params = new URLSearchParams();

    if (options.password) {
      params.append('password', options.password);
    }
    if (options.displayName) {
      params.append('displayName', options.displayName);
    }
    if (options.startWithAudioMuted !== undefined) {
      params.append('startWithAudioMuted', options.startWithAudioMuted);
    }
    if (options.startWithVideoMuted !== undefined) {
      params.append('startWithVideoMuted', options.startWithVideoMuted);
    }

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }

  /**
   * Generate participant-specific URL
   * @param {string} roomName - Room name
   * @param {string} participantName - Participant's name
   * @param {string} role - Participant role (moderator/participant)
   * @param {string} password - Meeting password
   * @returns {string} Participant URL
   */
  generateParticipantUrl(roomName, participantName, role = 'participant', password = null) {
    return this.generateMeetingUrl(roomName, {
      displayName: participantName,
      password: password,
      startWithAudioMuted: role === 'participant',
      startWithVideoMuted: false
    });
  }

  /**
   * Generate JWT token for enhanced security (optional)
   * @param {Object} tokenData - Token data
   * @returns {string} JWT token
   */
  generateJWTToken(tokenData) {
    // This is a simplified JWT token generation
    // In production, use a proper JWT library like 'jsonwebtoken'
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      iss: this.appId,
      aud: 'jitsi',
      exp: Math.floor(Date.now() / 1000) + (tokenData.duration * 60) + 300, // Duration + 5 min buffer
      room: tokenData.roomName,
      context: {
        user: {
          moderator: tokenData.moderatorPassword ? true : false
        },
        features: {
          recording: tokenData.enableRecording,
          livestreaming: false
        }
      }
    };

    // Simple base64 encoding (use proper JWT library in production)
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Update meeting configuration
   * @param {string} roomName - Room name
   * @param {Object} updates - Configuration updates
   * @returns {Object} Update result
   */
  async updateMeeting(roomName, updates) {
    try {
      // In a real implementation, this would make API calls to Jitsi Meet
      // For now, we'll just return the updated configuration
      console.log(`📝 Updating meeting configuration for room: ${roomName}`, updates);
      
      return {
        success: true,
        message: 'Meeting configuration updated successfully',
        updates
      };
    } catch (error) {
      console.error('❌ Error updating meeting:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * End/Delete a meeting
   * @param {string} roomName - Room name
   * @returns {Object} Deletion result
   */
  async endMeeting(roomName) {
    try {
      // In a real implementation, this would make API calls to end the meeting
      console.log(`🔚 Ending meeting for room: ${roomName}`);
      
      return {
        success: true,
        message: 'Meeting ended successfully'
      };
    } catch (error) {
      console.error('❌ Error ending meeting:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get meeting statistics (if available)
   * @param {string} roomName - Room name
   * @returns {Object} Meeting statistics
   */
  async getMeetingStats(roomName) {
    try {
      // In a real implementation, this would fetch actual meeting statistics
      console.log(`📊 Fetching meeting statistics for room: ${roomName}`);
      
      return {
        success: true,
        stats: {
          participants: 0,
          duration: 0,
          status: 'scheduled'
        }
      };
    } catch (error) {
      console.error('❌ Error fetching meeting stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate meeting room name
   * @param {string} roomName - Room name to validate
   * @returns {boolean} Is valid
   */
  isValidRoomName(roomName) {
    // Room name should be alphanumeric with hyphens, no spaces
    const roomNameRegex = /^[a-zA-Z0-9-_]+$/;
    return roomNameRegex.test(roomName) && roomName.length >= 3 && roomName.length <= 100;
  }

  /**
   * Generate meeting invitation text
   * @param {Object} meetingData - Meeting data
   * @returns {string} Invitation text
   */
  generateInvitationText(meetingData) {
    const {
      patientName,
      doctorName,
      scheduledDate,
      scheduledTime,
      meetingId,
      meetingUrl,
      participantPassword
    } = meetingData;

    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let invitation = `
🏥 TELECONSULTATION INVITATION

Dear ${patientName},

You have a scheduled teleconsultation with Dr. ${doctorName}.

📅 Date: ${formattedDate}
🕐 Time: ${scheduledTime}
🆔 Meeting ID: ${meetingId}

🔗 Join Meeting: ${meetingUrl}

${participantPassword ? `🔐 Meeting Password: ${participantPassword}` : ''}

📋 Instructions:
1. Click the meeting link 5-10 minutes before your appointment
2. Allow camera and microphone access when prompted
3. Ensure you have a stable internet connection
4. Find a quiet, well-lit space for the consultation

❓ Need help? Contact our support team.

Thank you,
${process.env.CLINIC_NAME || 'Healthcare Team'}
    `.trim();

    return invitation;
  }

  /**
   * Generate doctor invitation text
   * @param {Object} meetingData - Meeting data
   * @returns {string} Doctor invitation text
   */
  generateDoctorInvitationText(meetingData) {
    const {
      patientName,
      doctorName,
      scheduledDate,
      scheduledTime,
      meetingId,
      urls,
      moderatorPassword
    } = meetingData;

    const formattedDate = new Date(scheduledDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let invitation = `
🏥 TELECONSULTATION - DOCTOR ACCESS

Dear Dr. ${doctorName},

Teleconsultation scheduled with ${patientName}.

📅 Date: ${formattedDate}
🕐 Time: ${scheduledTime}
🆔 Meeting ID: ${meetingId}

🔗 Moderator Access: ${urls.doctor}
🔐 Moderator Password: ${moderatorPassword}

👤 Patient Access Link: ${urls.patient}

As the moderator, you can:
- Start/end the meeting
- Mute/unmute participants
- Enable/disable features
- Record the session (if enabled)

Best regards,
Healthcare System
    `.trim();

    return invitation;
  }
}

module.exports = new JitsiMeetService();
