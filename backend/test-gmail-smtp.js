const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const EmailConfig = require('./models/EmailConfig');
require('dotenv').config();

async function testGmailSMTP() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare');
    console.log('✅ Connected to MongoDB');

    // Get the email configuration
    const config = await EmailConfig.findOne({});
    
    if (!config) {
      console.log('❌ No email configuration found');
      return;
    }

    console.log('📧 Testing Gmail SMTP configuration:');
    console.log(`   Email: ${config.email}`);
    console.log(`   Service: ${config.service}`);
    console.log(`   Password: ${config.password === 'your-gmail-app-password' ? '⚠️  PLACEHOLDER - NEEDS REAL PASSWORD' : '✅ Configured'}`);

    // Create transporter
    const transporterConfig = config.getNodemailerConfig();
    console.log('\n🔧 Nodemailer configuration:');
    console.log(JSON.stringify(transporterConfig, null, 2));

    const transporter = nodemailer.createTransport(transporterConfig);

    // Test the connection
    console.log('\n🧪 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send a test email
    console.log('\n📤 Sending test email...');
    const testEmail = {
      from: {
        name: config.displayName,
        address: config.email
      },
      to: config.email, // Send to yourself for testing
      subject: 'Gmail SMTP Test - Healthcare System',
      html: `
        <h2>Gmail SMTP Test Successful!</h2>
        <p>This is a test email sent from the Healthcare Management System using Gmail SMTP.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Service: ${config.service}</li>
          <li>Email: ${config.email}</li>
          <li>Display Name: ${config.displayName}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>If you receive this email, your Gmail SMTP configuration is working correctly!</p>
      `,
      text: `
        Gmail SMTP Test Successful!
        
        This is a test email sent from the Healthcare Management System using Gmail SMTP.
        
        Configuration Details:
        - Service: ${config.service}
        - Email: ${config.email}
        - Display Name: ${config.displayName}
        - Timestamp: ${new Date().toISOString()}
        
        If you receive this email, your Gmail SMTP configuration is working correctly!
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Response: ${result.response}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n🔑 Gmail Authentication Error:');
      console.log('   - Make sure you have enabled 2-Factor Authentication');
      console.log('   - Generate an App Password (not your regular password)');
      console.log('   - Use the 16-character App Password in the configuration');
    } else if (error.message.includes('Connection timeout')) {
      console.log('\n🌐 Connection Error:');
      console.log('   - Check your internet connection');
      console.log('   - Make sure Gmail SMTP is accessible');
    }
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testGmailSMTP();
