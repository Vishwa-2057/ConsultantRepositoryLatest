const mongoose = require('mongoose');
const ActivityLogger = require('./utils/activityLogger');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Test logging
async function testDoctorLogging() {
  try {
    console.log('\n🧪 Testing doctor activity logging...\n');
    
    // Test doctor_created log
    const testLog = await ActivityLogger.logStaffActivity(
      'doctor_created',
      {
        _id: new mongoose.Types.ObjectId(),
        fullName: 'Test Doctor'
      },
      {
        id: new mongoose.Types.ObjectId(),
        fullName: 'Admin User',
        email: 'admin@test.com',
        role: 'clinic',
        clinicId: new mongoose.Types.ObjectId()
      },
      null, // req object (can be null for testing)
      'Test Clinic'
    );
    
    console.log('✅ Activity log created:', testLog);
    console.log('\n📋 Log details:');
    console.log('   Activity Type:', testLog.activityType);
    console.log('   User Name:', testLog.userName);
    console.log('   Target Entity:', testLog.targetEntity);
    console.log('   Clinic Name:', testLog.clinicName);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing logging:', error);
    process.exit(1);
  }
}

// Run test
setTimeout(testDoctorLogging, 1000);
