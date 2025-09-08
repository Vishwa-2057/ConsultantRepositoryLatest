const nodemailer = require('nodemailer');
require('dotenv').config();

async function setupCentralizedEmail() {
  console.log('🔧 Setting up Centralized Email Service for OTP');
  console.log('================================================\n');

  // Check environment variables
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const emailService = process.env.EMAIL_SERVICE || 'gmail';

  if (!emailUser || !emailPass) {
    console.log('❌ Email configuration not found in environment variables');
    console.log('\n📝 Please create a .env file in the backend directory with:');
    console.log('   EMAIL_SERVICE=gmail');
    console.log('   EMAIL_USER=your-email@gmail.com');
    console.log('   EMAIL_PASS=your-gmail-app-password');
    console.log('\n🔑 To get your Gmail App Password:');
    console.log('   1. Go to Google Account Settings → Security → 2-Step Verification');
    console.log('   2. Generate App Password for "Mail"');
    console.log('   3. Copy the 16-character password (without spaces)');
    return;
  }

  console.log('📧 Email Configuration:');
  console.log(`   Service: ${emailService}`);
  console.log(`   Email: ${emailUser}`);
  console.log(`   Password: ${emailPass === 'your-gmail-app-password' ? '⚠️  PLACEHOLDER - NEEDS REAL PASSWORD' : '✅ Configured'}`);

  if (emailPass === 'your-gmail-app-password') {
    console.log('\n❌ Please update the EMAIL_PASS in your .env file with your actual Gmail App Password');
    return;
  }

  // Test the email configuration
  try {
    console.log('\n🧪 Testing email configuration...');
    
    const transporter = nodemailer.createTransport({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    // Verify the connection
    await transporter.verify();
    console.log('✅ Email configuration is valid!');

    // Send a test email
    console.log('\n📤 Sending test email...');
    const testEmail = {
      from: {
        name: 'Healthcare Management System',
        address: emailUser
      },
      to: emailUser, // Send to yourself for testing
      subject: 'Centralized Email Service Test - Healthcare System',
      html: `
        <h2>Centralized Email Service Test Successful!</h2>
        <p>This is a test email sent from the Healthcare Management System using centralized email service.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Service: ${emailService}</li>
          <li>Email: ${emailUser}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>✅ Your centralized email service is working correctly!</p>
        <p>All OTP emails will be sent from this account to any doctor's registered email.</p>
      `,
      text: `
        Centralized Email Service Test Successful!
        
        This is a test email sent from the Healthcare Management System using centralized email service.
        
        Configuration Details:
        - Service: ${emailService}
        - Email: ${emailUser}
        - Timestamp: ${new Date().toISOString()}
        
        ✅ Your centralized email service is working correctly!
        All OTP emails will be sent from this account to any doctor's registered email.
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Response: ${result.response}`);

    console.log('\n🎉 Setup Complete!');
    console.log('Now any doctor can register and receive OTP emails automatically!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n🔑 Gmail Authentication Error:');
      console.log('   - Make sure you have enabled 2-Factor Authentication');
      console.log('   - Generate an App Password (not your regular password)');
      console.log('   - Use the 16-character App Password in the .env file');
    } else if (error.message.includes('Connection timeout')) {
      console.log('\n🌐 Connection Error:');
      console.log('   - Check your internet connection');
      console.log('   - Make sure Gmail SMTP is accessible');
    }
  }
}

setupCentralizedEmail();
