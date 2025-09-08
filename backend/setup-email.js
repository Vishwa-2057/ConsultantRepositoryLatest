const mongoose = require('mongoose');
const Doctor = require('./models/Doctor');
const EmailConfig = require('./models/EmailConfig');
require('dotenv').config();

async function setupEmailConfig() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare');
    console.log('✅ Connected to MongoDB');

    // Get all doctors
    const doctors = await Doctor.find({});
    console.log(`📋 Found ${doctors.length} doctors in the database`);

    if (doctors.length === 0) {
      console.log('❌ No doctors found. Please register a doctor first.');
      return;
    }

    // Check if any doctor has email configuration
    const doctorsWithEmailConfig = await EmailConfig.find({});
    console.log(`📧 Found ${doctorsWithEmailConfig.length} email configurations`);

    // If no email configurations exist, create default ones
    if (doctorsWithEmailConfig.length === 0) {
      console.log('🔧 No email configurations found. Creating default configurations...');
      
      for (const doctor of doctors) {
        try {
          await EmailConfig.createDefaultConfig(
            doctor._id,
            doctor.email,
            'your-app-password', // Placeholder - user should update this
            `Dr. ${doctor.fullName}`
          );
          console.log(`✅ Created default email config for ${doctor.fullName}`);
        } catch (error) {
          console.log(`❌ Failed to create email config for ${doctor.fullName}:`, error.message);
        }
      }
    }

    // Display current email configurations
    console.log('\n📧 Current Email Configurations:');
    const allConfigs = await EmailConfig.find({}).populate('doctorId', 'fullName email');
    
    for (const config of allConfigs) {
      console.log(`\n👨‍⚕️ Doctor: ${config.doctorId.fullName}`);
      console.log(`   Email: ${config.email}`);
      console.log(`   Service: ${config.service}`);
      console.log(`   Display Name: ${config.displayName}`);
      console.log(`   Active: ${config.isActive}`);
      console.log(`   Default: ${config.isDefault}`);
      console.log(`   Password: ${config.password === 'your-app-password' ? '⚠️  NEEDS UPDATE' : '✅ Configured'}`);
    }

    console.log('\n🔧 To update email configurations:');
    console.log('1. Use the API endpoint: PUT /api/email-config/:id');
    console.log('2. Or use the frontend email configuration interface');
    console.log('3. Make sure to set a valid email password/API key');

    console.log('\n📝 Example API call to update email config:');
    console.log('PUT /api/email-config/:configId');
    console.log(JSON.stringify({
      email: 'your-email@gmail.com',
      password: 'your-app-password',
      service: 'gmail',
      displayName: 'Dr. Your Name',
      isActive: true
    }, null, 2));

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the setup
setupEmailConfig();
