const nodemailer = require('nodemailer');
const EmailConfig = require('../models/EmailConfig');

class EmailService {
  constructor() {
    this.transporters = new Map(); // Cache for different doctor configurations
  }

  async getTransporter(doctorId = null) {
    try {
      // Use centralized email service - always use the same Gmail account
      const centralizedConfig = this.getCentralizedConfig();
      
      console.log(`📧 EmailService: Checking centralized config:`, {
        hasConfig: !!centralizedConfig,
        emailUser: process.env.EMAIL_USER ? 'Set' : 'Not set',
        emailPass: process.env.EMAIL_PASS ? 'Set' : 'Not set',
        emailService: process.env.EMAIL_SERVICE || 'gmail'
      });
      
      if (!centralizedConfig) {
        throw new Error('Centralized email configuration not found. Please set up EMAIL_USER and EMAIL_PASS environment variables.');
      }

      // Check if we already have a cached transporter
      if (this.transporters.has('centralized')) {
        return this.transporters.get('centralized');
      }

      // Create transporter from centralized configuration
      console.log(`📧 EmailService: Creating new transporter with config:`, {
        service: centralizedConfig.service,
        user: centralizedConfig.auth.user
      });
      const transporter = nodemailer.createTransport(centralizedConfig);

      // Verify transporter configuration
      console.log(`📧 EmailService: Verifying transporter...`);
      await transporter.verify();
      
      // Cache the transporter
      this.transporters.set('centralized', transporter);
      
      console.log(`✅ Centralized email service ready`);
      return transporter;
    } catch (error) {
      console.error(`❌ Failed to initialize centralized email service:`, error);
      throw error;
    }
  }

  getCentralizedConfig() {
    // Use environment variables for centralized email service
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const config = {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Add additional Gmail-specific settings
        secure: true,
        port: 465,
        tls: {
          rejectUnauthorized: false
        }
      };
      console.log(`📧 EmailService: Created config for ${config.auth.user} using ${config.service}`);
      return config;
    }
    console.log(`📧 EmailService: Missing EMAIL_USER or EMAIL_PASS environment variables`);
    return null;
  }

  getFallbackConfig() {
    // Fallback to environment variables if available
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      return {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      };
    }
    return null;
  }

  async clearTransporterCache(doctorId) {
    if (this.transporters.has(doctorId.toString())) {
      this.transporters.delete(doctorId.toString());
    }
  }

  async sendOTPEmail(doctorId, email, otpCode, purpose = 'login') {
    try {
      // Get the centralized transporter
      const transporter = await this.getTransporter();
      
      // Get doctor's name from database
      let doctorName = 'Doctor';
      try {
        const Doctor = require('../models/Doctor');
        const doctor = await Doctor.findById(doctorId);
        if (doctor) {
          doctorName = doctor.fullName;
        }
      } catch (dbError) {
        console.warn('Could not fetch doctor name from database:', dbError.message);
      }

      const subject = this.getEmailSubject(purpose);
      const htmlContent = this.generateOTPEmailHTML(otpCode, purpose, `Dr. ${doctorName}`);
      const textContent = this.generateOTPEmailText(otpCode, purpose, `Dr. ${doctorName}`);

      const mailOptions = {
        from: {
          name: 'Healthcare Management System',
          address: process.env.EMAIL_USER || 'noreply@healthcare.com'
        },
        to: email,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${email} (${doctorName}):`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  getEmailSubject(purpose) {
    const subjects = {
      login: 'Your Login Verification Code',
      registration: 'Complete Your Registration',
      password_reset: 'Reset Your Password',
      email_verification: 'Verify Your Email Address'
    };
    return subjects[purpose] || 'Your Verification Code';
  }

  generateOTPEmailHTML(otpCode, purpose, doctorName = 'Healthcare Management System') {
    const purposeText = {
      login: 'login to your account',
      registration: 'complete your registration',
      password_reset: 'reset your password',
      email_verification: 'verify your email address'
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 10px;
            }
            .otp-code {
                background-color: #f8f9fa;
                border: 2px dashed #2c5aa0;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }
            .otp-number {
                font-size: 32px;
                font-weight: bold;
                color: #2c5aa0;
                letter-spacing: 5px;
                margin: 10px 0;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #856404;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .button {
                display: inline-block;
                background-color: #2c5aa0;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">${doctorName}</div>
                <h2>Verification Code</h2>
            </div>
            
            <p>Hello,</p>
            
            <p>You have requested to ${purposeText[purpose] || 'access your account'}. Please use the following verification code to complete the process:</p>
            
            <div class="otp-code">
                <div class="otp-number">${otpCode}</div>
                <p><strong>This code will expire in 10 minutes</strong></p>
            </div>
            
            <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                    <li>Never share this code with anyone</li>
                    <li>Our team will never ask for your verification code</li>
                    <li>If you didn't request this code, please ignore this email</li>
                </ul>
            </div>
            
            <p>If you're having trouble with the code, you can request a new one from the login page.</p>
            
            <div class="footer">
                <p>This is an automated message from ${doctorName}. Please do not reply to this email.</p>
                <p>© ${new Date().getFullYear()} Healthcare Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateOTPEmailText(otpCode, purpose, doctorName = 'Healthcare Management System') {
    const purposeText = {
      login: 'login to your account',
      registration: 'complete your registration',
      password_reset: 'reset your password',
      email_verification: 'verify your email address'
    };

    return `
${doctorName} - Verification Code

Hello,

You have requested to ${purposeText[purpose] || 'access your account'}. Please use the following verification code to complete the process:

VERIFICATION CODE: ${otpCode}

This code will expire in 10 minutes.

SECURITY NOTICE:
- Never share this code with anyone
- Our team will never ask for your verification code
- If you didn't request this code, please ignore this email

If you're having trouble with the code, you can request a new one from the login page.

This is an automated message from ${doctorName}. Please do not reply to this email.

© ${new Date().getFullYear()} Healthcare Management System. All rights reserved.
    `;
  }

  async sendWelcomeEmail(doctorId, email, doctorName) {
    try {
      // Get the transporter for this specific doctor
      const transporter = await this.getTransporter(doctorId);
      
      // Get email configuration for display name
      const emailConfig = await EmailConfig.getActiveConfig(doctorId);

      const mailOptions = {
        from: {
          name: emailConfig.displayName,
          address: emailConfig.email
        },
        to: email,
        subject: 'Welcome to Healthcare Management System',
        html: `
          <h2>Welcome to Healthcare Management System!</h2>
          <p>Hello ${doctorName},</p>
          <p>Your account has been successfully created. You can now access the system using your credentials.</p>
          <p>Thank you for choosing our healthcare management solution.</p>
          <p>Best regards,<br>${emailConfig.displayName}</p>
        `,
        text: `Welcome to Healthcare Management System! Hello ${doctorName}, your account has been successfully created. Best regards, ${emailConfig.displayName}`
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent successfully from ${emailConfig.displayName}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Method to create default email configuration for a new doctor
  async createDefaultEmailConfig(doctorId, email, password, displayName = null) {
    try {
      const config = await EmailConfig.createDefaultConfig(doctorId, email, password, displayName);
      console.log(`✅ Default email configuration created for doctor: ${config.displayName}`);
      return { success: true, config };
    } catch (error) {
      console.error('❌ Failed to create default email configuration:', error);
      return { success: false, error: error.message };
    }
  }

  // Method to test email configuration
  async testEmailConfig(doctorId) {
    try {
      const emailConfig = await EmailConfig.getActiveConfig(doctorId);
      const result = await emailConfig.testConfiguration();
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Method to send referral notification emails
  async sendReferralNotification(referral) {
    try {
      console.log(`📧 EmailService: Starting referral notification process`);
      console.log(`📧 EmailService: Referral data:`, {
        id: referral._id,
        type: referral.referralType,
        specialistId: referral.specialistId,
        specialistName: referral.specialistName,
        specialistContactEmail: referral.specialistContact?.email
      });
      
      const transporter = await this.getTransporter();
      console.log(`📧 EmailService: Transporter obtained successfully`);
      
      let recipientEmail, emailType, recipientName;
      
      // Determine recipient based on referral type
      if (referral.referralType === 'outbound') {
        // For outbound referrals, send to external doctor
        // First try to get email from specialistId (if it's a doctor in our system)
        if (referral.specialistId) {
          try {
            const Doctor = require('../models/Doctor');
            const externalDoctor = await Doctor.findById(referral.specialistId);
            if (externalDoctor && externalDoctor.email) {
              recipientEmail = externalDoctor.email;
              recipientName = externalDoctor.fullName;
            }
          } catch (dbError) {
            console.warn('Could not fetch external doctor from database:', dbError.message);
          }
        }
        
        // Fallback to specialistContact email if no doctor found
        if (!recipientEmail) {
          recipientEmail = referral.specialistContact?.email;
          recipientName = referral.specialistName;
        }
        
        emailType = 'outbound';
      } else if (referral.referralType === 'inbound') {
        // For inbound referrals, send to receiving doctor
        // First try to get email from specialistId (if it's a doctor in our system)
        if (referral.specialistId) {
          try {
            const Doctor = require('../models/Doctor');
            const receivingDoctor = await Doctor.findById(referral.specialistId);
            if (receivingDoctor && receivingDoctor.email) {
              recipientEmail = receivingDoctor.email;
              recipientName = receivingDoctor.fullName;
            }
          } catch (dbError) {
            console.warn('Could not fetch receiving doctor from database:', dbError.message);
          }
        }
        
        // Fallback to specialistContact email if no doctor found
        if (!recipientEmail) {
          recipientEmail = referral.specialistContact?.email;
          recipientName = referral.specialistName;
        }
        
        emailType = 'inbound';
      }

      console.log(`📧 EmailService: Final recipient details:`, {
        email: recipientEmail,
        name: recipientName,
        type: emailType
      });

      if (!recipientEmail) {
        console.warn(`📧 EmailService: No email address found for ${emailType} referral recipient`);
        return { success: false, error: 'Recipient email address not found' };
      }

      const subject = this.getReferralEmailSubject(referral, emailType);
      const htmlContent = this.generateReferralEmailHTML(referral, emailType, recipientName);
      const textContent = this.generateReferralEmailText(referral, emailType, recipientName);

      const mailOptions = {
        from: {
          name: 'Healthcare Management System',
          address: process.env.EMAIL_USER || 'noreply@healthcare.com'
        },
        to: recipientEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ ${emailType.toUpperCase()} referral notification sent successfully to ${recipientEmail} (${recipientName}):`, result.messageId);
      console.log(`📧 Email subject: ${subject}`);
      return { success: true, messageId: result.messageId, recipient: recipientEmail, type: emailType };
    } catch (error) {
      console.error('❌ Failed to send referral notification:', error);
      return { success: false, error: error.message };
    }
  }

  getReferralEmailSubject(referral, emailType) {
    const urgencyText = referral.urgency === 'Urgent' || referral.urgency === 'High' ? '[URGENT] ' : '';
    if (emailType === 'outbound') {
      return `${urgencyText}New External Referral - ${referral.patientName} (${referral.specialty})`;
    } else {
      return `${urgencyText}New Internal Referral - ${referral.patientName} (${referral.specialty})`;
    }
  }

  generateReferralEmailHTML(referral, emailType, recipientName) {
    const isOutbound = emailType === 'outbound';
    const urgencyColor = referral.urgency === 'Urgent' || referral.urgency === 'High' ? '#dc3545' : '#28a745';
    const urgencyBadge = referral.urgency === 'Urgent' || referral.urgency === 'High' ? 'URGENT' : referral.urgency;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Patient Referral Notification</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 700px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e9ecef;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 10px;
            }
            .urgency-badge {
                display: inline-block;
                background-color: ${urgencyColor};
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 20px;
            }
            .patient-info {
                background-color: #f8f9fa;
                border-left: 4px solid #2c5aa0;
                padding: 20px;
                margin: 20px 0;
                border-radius: 5px;
            }
            .info-row {
                display: flex;
                margin-bottom: 10px;
            }
            .info-label {
                font-weight: bold;
                min-width: 150px;
                color: #495057;
            }
            .info-value {
                flex: 1;
            }
            .referral-details {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 5px;
                padding: 20px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .action-required {
                background-color: #d1ecf1;
                border: 1px solid #bee5eb;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
                color: #0c5460;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Healthcare Management System</div>
                <h2>${isOutbound ? 'New External Patient Referral' : 'New Internal Patient Referral'}</h2>
                <div class="urgency-badge">${urgencyBadge}</div>
            </div>
            
            <p>Dear ${recipientName || 'Doctor'},</p>
            
            <p>${isOutbound ? 
                'You have received a new patient referral for your review and care.' : 
                'A patient has been referred to you for specialized care.'
            }</p>
            
            <div class="patient-info">
                <h3>Patient Information</h3>
                <div class="info-row">
                    <div class="info-label">Patient Name:</div>
                    <div class="info-value">${referral.patientName}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Specialty Required:</div>
                    <div class="info-value">${referral.specialty}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Urgency Level:</div>
                    <div class="info-value" style="color: ${urgencyColor}; font-weight: bold;">${referral.urgency}</div>
                </div>
                ${referral.preferredDate ? `
                <div class="info-row">
                    <div class="info-label">Preferred Date:</div>
                    <div class="info-value">${new Date(referral.preferredDate).toLocaleDateString()}</div>
                </div>
                ` : ''}
                ${referral.preferredTime ? `
                <div class="info-row">
                    <div class="info-label">Preferred Time:</div>
                    <div class="info-value">${referral.preferredTime}</div>
                </div>
                ` : ''}
            </div>

            <div class="referral-details">
                <h3>Referral Details</h3>
                <div class="info-row">
                    <div class="info-label">Reason for Referral:</div>
                    <div class="info-value">${referral.reason}</div>
                </div>
                ${referral.clinicalHistory ? `
                <div class="info-row">
                    <div class="info-label">Clinical History:</div>
                    <div class="info-value">${referral.clinicalHistory}</div>
                </div>
                ` : ''}
                ${referral.currentMedications && referral.currentMedications.length > 0 ? `
                <div class="info-row">
                    <div class="info-label">Current Medications:</div>
                    <div class="info-value">${referral.currentMedications.join(', ')}</div>
                </div>
                ` : ''}
                ${referral.testResults ? `
                <div class="info-row">
                    <div class="info-label">Test Results:</div>
                    <div class="info-value">${referral.testResults}</div>
                </div>
                ` : ''}
                ${referral.specialInstructions ? `
                <div class="info-row">
                    <div class="info-label">Special Instructions:</div>
                    <div class="info-value">${referral.specialInstructions}</div>
                </div>
                ` : ''}
            </div>

            <div class="patient-info">
                <h3>Referring Provider</h3>
                <div class="info-row">
                    <div class="info-label">Provider Name:</div>
                    <div class="info-value">${referral.referringProvider?.name || 'Dr. Johnson'}</div>
                </div>
                ${referral.referringProvider?.phone ? `
                <div class="info-row">
                    <div class="info-label">Phone:</div>
                    <div class="info-value">${referral.referringProvider.phone}</div>
                </div>
                ` : ''}
                ${referral.referringProvider?.email ? `
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">${referral.referringProvider.email}</div>
                </div>
                ` : ''}
            </div>

            ${referral.insuranceInfo?.provider ? `
            <div class="patient-info">
                <h3>Insurance Information</h3>
                <div class="info-row">
                    <div class="info-label">Insurance Provider:</div>
                    <div class="info-value">${referral.insuranceInfo.provider}</div>
                </div>
                ${referral.insuranceInfo.policyNumber ? `
                <div class="info-row">
                    <div class="info-label">Policy Number:</div>
                    <div class="info-value">${referral.insuranceInfo.policyNumber}</div>
                </div>
                ` : ''}
                ${referral.insuranceInfo.authorizationRequired ? `
                <div class="info-row">
                    <div class="info-label">Authorization:</div>
                    <div class="info-value">Required ${referral.insuranceInfo.authorizationNumber ? `(#${referral.insuranceInfo.authorizationNumber})` : ''}</div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <div class="action-required">
                <strong>Next Steps:</strong>
                <ul>
                    <li>Please review the patient information and referral details</li>
                    <li>Contact the patient to schedule an appointment</li>
                    <li>Coordinate with the referring provider if needed</li>
                    <li>Update the referral status in the system</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>This referral was created on ${new Date(referral.createdAt).toLocaleDateString()} at ${new Date(referral.createdAt).toLocaleTimeString()}</p>
                <p>This is an automated message from Healthcare Management System. Please do not reply to this email.</p>
                <p>© ${new Date().getFullYear()} Healthcare Management System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateReferralEmailText(referral, emailType, recipientName) {
    const isOutbound = emailType === 'outbound';
    const urgencyText = referral.urgency === 'Urgent' || referral.urgency === 'High' ? '[URGENT] ' : '';

    return `
${urgencyText}Healthcare Management System - ${isOutbound ? 'New External Patient Referral' : 'New Internal Patient Referral'}

Dear ${recipientName || 'Doctor'},

${isOutbound ? 
  'You have received a new patient referral for your review and care.' : 
  'A patient has been referred to you for specialized care.'
}

PATIENT INFORMATION:
- Patient Name: ${referral.patientName}
- Specialty Required: ${referral.specialty}
- Urgency Level: ${referral.urgency}
${referral.preferredDate ? `- Preferred Date: ${new Date(referral.preferredDate).toLocaleDateString()}` : ''}
${referral.preferredTime ? `- Preferred Time: ${referral.preferredTime}` : ''}

REFERRAL DETAILS:
- Reason for Referral: ${referral.reason}
${referral.clinicalHistory ? `- Clinical History: ${referral.clinicalHistory}` : ''}
${referral.currentMedications && referral.currentMedications.length > 0 ? `- Current Medications: ${referral.currentMedications.join(', ')}` : ''}
${referral.testResults ? `- Test Results: ${referral.testResults}` : ''}
${referral.specialInstructions ? `- Special Instructions: ${referral.specialInstructions}` : ''}

REFERRING PROVIDER:
- Provider Name: ${referral.referringProvider?.name || 'Dr. Johnson'}
${referral.referringProvider?.phone ? `- Phone: ${referral.referringProvider.phone}` : ''}
${referral.referringProvider?.email ? `- Email: ${referral.referringProvider.email}` : ''}

${referral.insuranceInfo?.provider ? `
INSURANCE INFORMATION:
- Insurance Provider: ${referral.insuranceInfo.provider}
${referral.insuranceInfo.policyNumber ? `- Policy Number: ${referral.insuranceInfo.policyNumber}` : ''}
${referral.insuranceInfo.authorizationRequired ? `- Authorization: Required ${referral.insuranceInfo.authorizationNumber ? `(#${referral.insuranceInfo.authorizationNumber})` : ''}` : ''}
` : ''}

NEXT STEPS:
- Please review the patient information and referral details
- Contact the patient to schedule an appointment
- Coordinate with the referring provider if needed
- Update the referral status in the system

This referral was created on ${new Date(referral.createdAt).toLocaleDateString()} at ${new Date(referral.createdAt).toLocaleTimeString()}

This is an automated message from Healthcare Management System. Please do not reply to this email.

© ${new Date().getFullYear()} Healthcare Management System. All rights reserved.
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
