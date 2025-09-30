const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ActivityLog = require('../models/ActivityLog');

async function verifyClinicLogoutLogs() {
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
    
    // Check recent activity logs
    console.log('🔍 Checking recent activity logs...\n');
    
    // Get all activity types
    const activityTypes = await ActivityLog.distinct('activityType');
    console.log('📊 Available activity types:', activityTypes);
    
    // Check login/logout activities by role
    const roles = ['clinic', 'doctor', 'nurse', 'head_nurse', 'supervisor'];
    
    for (const role of roles) {
      console.log(`\n👤 ${role.toUpperCase()} Activities:`);
      
      // Login activities
      const loginCount = await ActivityLog.countDocuments({
        userRole: role,
        activityType: 'login'
      });
      
      // Logout activities  
      const logoutCount = await ActivityLog.countDocuments({
        userRole: role,
        activityType: 'logout'
      });
      
      console.log(`   Login logs: ${loginCount}`);
      console.log(`   Logout logs: ${logoutCount}`);
      
      // Show recent logout logs for this role
      if (logoutCount > 0) {
        const recentLogouts = await ActivityLog.find({
          userRole: role,
          activityType: 'logout'
        }).sort({ timestamp: -1 }).limit(3);
        
        console.log(`   Recent logout logs:`);
        recentLogouts.forEach((log, index) => {
          console.log(`     ${index + 1}. ${log.userName} (${log.userEmail}) - ${log.timestamp.toLocaleString()}`);
          if (log.duration) {
            console.log(`        Session duration: ${log.duration} minutes`);
          }
        });
      }
    }
    
    // Check for any clinic logout logs specifically
    console.log('\n🏥 Detailed Clinic Logout Analysis:');
    
    const clinicLogouts = await ActivityLog.find({
      userRole: 'clinic',
      activityType: 'logout'
    }).sort({ timestamp: -1 }).limit(5);
    
    if (clinicLogouts.length > 0) {
      console.log(`✅ Found ${clinicLogouts.length} clinic logout logs:`);
      clinicLogouts.forEach((log, index) => {
        console.log(`\n   ${index + 1}. Clinic Logout Details:`);
        console.log(`      User: ${log.userName}`);
        console.log(`      Email: ${log.userEmail}`);
        console.log(`      Clinic: ${log.clinicName}`);
        console.log(`      Time: ${log.timestamp.toLocaleString()}`);
        console.log(`      IP: ${log.ipAddress}`);
        console.log(`      Duration: ${log.duration || 'N/A'} minutes`);
        console.log(`      Device: ${log.deviceInfo?.browser || 'Unknown'} on ${log.deviceInfo?.os || 'Unknown'}`);
        console.log(`      Notes: ${log.notes || 'N/A'}`);
      });
    } else {
      console.log('⚠️ No clinic logout logs found');
      console.log('   This could mean:');
      console.log('   1. No clinic users have logged out recently');
      console.log('   2. There might be an issue with clinic logout logging');
      console.log('   3. The clinic logout logging was just fixed and needs testing');
    }
    
    // Summary
    console.log('\n📈 Activity Logging Summary:');
    const totalLogs = await ActivityLog.countDocuments();
    const loginLogs = await ActivityLog.countDocuments({ activityType: 'login' });
    const logoutLogs = await ActivityLog.countDocuments({ activityType: 'logout' });
    
    console.log(`   Total activity logs: ${totalLogs}`);
    console.log(`   Total login logs: ${loginLogs}`);
    console.log(`   Total logout logs: ${logoutLogs}`);
    console.log(`   Login/Logout ratio: ${loginLogs}:${logoutLogs}`);
    
    if (logoutLogs < loginLogs) {
      console.log('   ⚠️ More logins than logouts detected - this is normal for active sessions');
    }
    
    console.log('\n🎉 Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the verification
if (require.main === module) {
  verifyClinicLogoutLogs()
    .then(() => {
      console.log('🎉 Clinic logout logs verification completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

module.exports = verifyClinicLogoutLogs;
