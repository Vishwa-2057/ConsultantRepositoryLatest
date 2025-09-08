const mongoose = require('mongoose');
const EmailConfig = require('./models/EmailConfig');
require('dotenv').config();

async function updateGmailSMTP() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare');
    console.log('✅ Connected to MongoDB');

    // Find the existing email configuration
    const config = await EmailConfig.findOne({});
    
    if (!config) {
      console.log('❌ No email configuration found');
      return;
    }

    console.log('📧 Current configuration:');
    console.log(`   Email: ${config.email}`);
    console.log(`   Service: ${config.service}`);
    console.log(`   Password: ${config.password}`);

    // Update to use Gmail SMTP
    config.service = 'gmail';
    config.smtp = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false
    };
    
    // Update the password (you'll need to replace this with your actual app password)
    config.password = 'your-gmail-app-password'; // Replace with your actual Gmail App Password
    
    await config.save();
    
    console.log('\n✅ Updated to Gmail SMTP configuration:');
    console.log(`   Service: ${config.service}`);
    console.log(`   SMTP Host: ${config.smtp.host}`);
    console.log(`   SMTP Port: ${config.smtp.port}`);
    console.log(`   Secure: ${config.smtp.secure}`);
    console.log(`   Password: ${config.password === 'your-gmail-app-password' ? '⚠️  NEEDS UPDATE' : '✅ Configured'}`);

    console.log('\n🔧 Next steps:');
    console.log('1. Get your Gmail App Password:');
    console.log('   - Go to Google Account Settings → Security → 2-Step Verification');
    console.log('   - Generate App Password for "Mail"');
    console.log('   - Copy the 16-character password');
    console.log('2. Update the password in the database:');
    console.log(`   PUT /api/email-config/${config._id}`);
    console.log('   { "password": "your-actual-app-password" }');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

updateGmailSMTP();
