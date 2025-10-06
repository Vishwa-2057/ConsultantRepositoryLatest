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
    // Use a completely random room name to avoid Jitsi authentication issues
    // Add 'dr' prefix to indicate doctor-controlled room
    const randomId = crypto.randomBytes(12).toString('hex');
    return `dr${randomId}`;
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
      
      // Generate passwords - always generate both to ensure they're different
      const moderatorPassword = this.generateMeetingPassword();
      const participantPassword = this.generateMeetingPassword(); // Always generate, even if not required
      
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
          direct: meetingUrl,
          // Add URLs without moderator requirement - completely open rooms
          doctorDirect: this.generateDoctorMeetingUrl(roomName, `Dr. ${doctorName}`),
          patientDirect: this.generatePatientMeetingUrl(roomName, patientName)
        }
      };

      console.log(`✅ Jitsi Meet meeting created: ${meetingId} for room: ${roomName}`);
      console.log(`🔐 Moderator password: ${moderatorPassword}`);
      console.log(`🔐 Participant password: ${participantPassword}`);
      console.log(`🔗 Doctor URL: ${meeting.urls.doctor}`);
      console.log(`🔗 Patient URL: ${meeting.urls.patient}`);
      console.log(`🔗 Doctor Direct URL (no auth): ${meeting.urls.doctorDirect}`);
      console.log(`🔗 Patient Direct URL (no auth): ${meeting.urls.patientDirect}`);
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
   * Generate doctor meeting URL with full permissions
   * @param {string} roomName - Room name
   * @param {string} doctorName - Doctor's display name
   * @returns {string} Doctor meeting URL
   */
  generateDoctorMeetingUrl(roomName, doctorName) {
    const baseUrl = `https://${this.domain}/${roomName}`;
    
    const params = new URLSearchParams();
    params.append('displayName', doctorName);
    params.append('startWithAudioMuted', 'false');
    params.append('startWithVideoMuted', 'false');
    
    // Add a special parameter to indicate this is the doctor joining
    params.append('userInfo', JSON.stringify({
      displayName: doctorName,
      email: `doctor@${this.domain}`,
      role: 'moderator'
    }));

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate patient meeting URL with restricted permissions
   * @param {string} roomName - Room name
   * @param {string} patientName - Patient's display name
   * @returns {string} Patient meeting URL
   */
  generatePatientMeetingUrl(roomName, patientName) {
    const baseUrl = `https://${this.domain}/${roomName}`;
    
    const params = new URLSearchParams();
    params.append('displayName', patientName);
    params.append('startWithAudioMuted', 'true');
    params.append('startWithVideoMuted', 'false');
    
    // Add patient-specific parameters
    params.append('userInfo', JSON.stringify({
      displayName: patientName,
      email: `patient@${this.domain}`,
      role: 'participant'
    }));

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate open meeting URL (no authentication required) - Legacy method
   * @param {string} roomName - Room name
   * @param {string} displayName - Display name
   * @param {boolean} audioMuted - Start with audio muted
   * @param {boolean} videoMuted - Start with video muted
   * @returns {string} Open meeting URL
   */
  generateOpenMeetingUrl(roomName, displayName, audioMuted = false, videoMuted = false) {
    // Use the provided room name (which is now random) to ensure both participants join the same room
    const baseUrl = `https://${this.domain}/${roomName}`;
    
    const params = new URLSearchParams();
    params.append('displayName', displayName);
    params.append('startWithAudioMuted', audioMuted.toString());
    params.append('startWithVideoMuted', videoMuted.toString());

    return `${baseUrl}?${params.toString()}`;
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
    if (options.userInfo) {
      params.append('userInfo', options.userInfo);
    }
    if (options.jwt) {
      params.append('jwt', options.jwt);
    }
    if (options.config) {
      params.append('config', options.config);
    }
    if (options.skipPrejoin) {
      params.append('config.prejoinPageEnabled', 'false');
      params.append('config.requireDisplayName', 'false');
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
    const options = {
      displayName: participantName,
      startWithAudioMuted: role === 'participant',
      startWithVideoMuted: false
    };

    // For moderators (doctors), add moderator parameters to bypass waiting room
    if (role === 'moderator') {
      options.userInfo = JSON.stringify({
        displayName: participantName,
        email: `doctor@${this.domain}`,
        moderator: true
      });
      // Add JWT token or moderator password
      if (password) {
        options.jwt = this.generateModeratorJWT(roomName, participantName);
      }
    } else {
      // For participants (patients), use participant password
      if (password) {
        options.password = password;
      }
    }

    return this.generateMeetingUrl(roomName, options);
  }

  /**
   * Generate role-based JWT token
   * @param {string} roomName - Room name
   * @param {string} userName - User's name
   * @param {string} role - User role (moderator/participant)
   * @returns {string} JWT token with role-based permissions
   */
  generateRoleBasedJWT(roomName, userName, role = 'participant') {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const isModerator = role === 'moderator';
    const payload = {
      iss: this.appId,
      aud: 'jitsi',
      exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60), // 4 hours
      room: roomName,
      context: {
        user: {
          name: userName,
          email: isModerator ? `doctor@${this.domain}` : `patient@${this.domain}`,
          moderator: isModerator,
          avatar: '',
          id: crypto.randomUUID()
        },
        features: {
          recording: isModerator, // Only moderators can record
          livestreaming: false,
          'outbound-call': false,
          transcription: isModerator,
          'screen-sharing': isModerator // Only moderators can share screen
        }
      },
      moderator: isModerator,
      // Add specific permissions for participants
      ...(role === 'participant' && {
        permissions: {
          kick: false,
          moderator: false,
          recording: false,
          'screen-sharing': false,
          'invite-others': false
        }
      })
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
   * Generate moderator JWT token
   * @param {string} roomName - Room name
   * @param {string} moderatorName - Moderator's name
   * @returns {string} JWT token for moderator
   */
  generateModeratorJWT(roomName, moderatorName) {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = {
      iss: this.appId,
      aud: 'jitsi',
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours
      room: roomName,
      context: {
        user: {
          name: moderatorName,
          email: `doctor@${this.domain}`,
          moderator: true,
          avatar: '',
          id: crypto.randomUUID()
        },
        features: {
          recording: true,
          livestreaming: false,
          'outbound-call': false,
          transcription: false
        }
      },
      moderator: true
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
