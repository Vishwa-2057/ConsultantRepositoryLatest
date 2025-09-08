const mongoose = require('mongoose');
const EmailConfig = require('./models/EmailConfig');
require('dotenv').config();

async function updatePassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare');
    console.log('✅ Connected to MongoDB');

    // Get the email configuration
    const config = await EmailConfig.findOne({});
    
    if (!config) {
      console.log('❌ No email configuration found');
      return;
    }

    console.log('📧 Current configuration:');
    console.log(`   Email: ${config.email}`);
    console.log(`   Service: ${config.service}`);
    console.log(`   Current Password: ${config.password}`);

    // Get the new password from command line argument
    const newPassword = process.argv[2];
    
    if (!newPassword) {
      console.log('\n❌ Please provide the Gmail App Password as an argument:');
      console.log('   node update-password.js YOUR_APP_PASSWORD');
      console.log('\n🔑 To get your Gmail App Password:');
      console.log('   1. Go to Google Account Settings → Security → 2-Step Verification');
      console.log('   2. Generate App Password for "Mail"');
      console.log('   3. Copy the 16-character password');
      return;
    }

    // Update the password
    config.password = newPassword;
    await config.save();

    console.log('\n✅ Password updated successfully!');
    console.log(`   New Password: ${config.password}`);

    console.log('\n🧪 You can now test the configuration:');
    console.log('   node test-gmail-smtp.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

updatePassword();
