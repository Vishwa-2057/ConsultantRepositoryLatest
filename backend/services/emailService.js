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
      
      if (!centralizedConfig) {
        throw new Error('Centralized email configuration not found. Please set up EMAIL_USER and EMAIL_PASS environment variables.');
      }

      // Check if we already have a cached transporter
      if (this.transporters.has('centralized')) {
        return this.transporters.get('centralized');
      }

      // Create transporter from centralized configuration
      const transporter = nodemailer.createTransport(centralizedConfig);

      // Verify transporter configuration
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
                <div class="logo">🏥 ${doctorName}</div>
                <h2>Verification Code</h2>
            </div>
            
            <p>Hello,</p>
            
            <p>You have requested to ${purposeText[purpose] || 'access your account'}. Please use the following verification code to complete the process:</p>
            
            <div class="otp-code">
                <div class="otp-number">${otpCode}</div>
                <p><strong>This code will expire in 10 minutes</strong></p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong>
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
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
