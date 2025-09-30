const mongoose = require('mongoose');
require('dotenv').config();

// Import models and utilities
const Clinic = require('../models/Clinic');
const ActivityLog = require('../models/ActivityLog');
const ActivityLogger = require('../utils/activityLogger');

async function testClinicLogoutLogging() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI;
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find a test clinic (or create one for testing)
    let testClinic = await Clinic.findOne({ isActive: true });
    
    if (!testClinic) {
      console.log('❌ No active clinic found for testing');
      return;
    }
    
    console.log(`🏥 Testing with clinic: ${testClinic.name} (${testClinic.adminEmail})`);
    
    // Mock request object
    const mockReq = {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
    
    // Test clinic logout logging
    console.log('\n🧪 Testing clinic logout logging...');
    
    const logResult = await ActivityLogger.logLogout({
      _id: testClinic._id,
      fullName: testClinic.fullName || testClinic.adminName || testClinic.name,
      email: testClinic.adminEmail || testClinic.email,
      role: 'clinic',
      clinicId: testClinic._id,
      clinicName: testClinic.name
    }, mockReq, null, 45); // 45 minutes session duration
    
    if (logResult) {
      console.log('✅ Clinic logout logged successfully!');
      console.log('📋 Log details:', {
        id: logResult._id,
        activityType: logResult.activityType,
        userName: logResult.userName,
        userEmail: logResult.userEmail,
        clinicName: logResult.clinicName,
        duration: logResult.duration
      });
    } else {
      console.log('❌ Failed to log clinic logout');
    }
    
    // Verify the log was saved
    console.log('\n🔍 Verifying log in database...');
    const recentLogs = await ActivityLog.find({
      clinicId: testClinic._id,
      activityType: 'logout',
      userRole: 'clinic'
    }).sort({ timestamp: -1 }).limit(1);
    
    if (recentLogs.length > 0) {
      const log = recentLogs[0];
      console.log('✅ Found clinic logout log in database:');
      console.log(`   - User: ${log.userName} (${log.userEmail})`);
      console.log(`   - Clinic: ${log.clinicName}`);
      console.log(`   - Time: ${log.timestamp}`);
      console.log(`   - Duration: ${log.duration} minutes`);
      console.log(`   - IP: ${log.ipAddress}`);
      console.log(`   - Device: ${log.deviceInfo?.browser} on ${log.deviceInfo?.os}`);
    } else {
      console.log('❌ No clinic logout logs found in database');
    }
    
    // Test the structure that the logout route would use
    console.log('\n🧪 Testing logout route data structure...');
    
    const logoutData = {
      _id: testClinic._id,
      fullName: testClinic.fullName || testClinic.adminName || testClinic.name,
      email: testClinic.adminEmail || testClinic.email,
      role: 'clinic',
      clinicId: testClinic.clinicId || testClinic._id,
      clinicName: testClinic.clinicName || testClinic.name || 'Unknown Clinic'
    };
    
    console.log('📋 Logout data structure:', logoutData);
    
    // Verify all required fields are present
    const requiredFields = ['_id', 'fullName', 'email', 'role', 'clinicId', 'clinicName'];
    const missingFields = requiredFields.filter(field => !logoutData[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields are present for clinic logout logging');
    } else {
      console.log('❌ Missing required fields:', missingFields);
    }
    
    console.log('\n🎉 Clinic logout logging test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testClinicLogoutLogging()
    .then(() => {
      console.log('🎉 Clinic logout logging test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Clinic logout logging test failed:', error);
      process.exit(1);
    });
}

module.exports = testClinicLogoutLogging;
