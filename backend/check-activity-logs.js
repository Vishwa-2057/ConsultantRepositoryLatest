const mongoose = require('mongoose');
const ActivityLog = require('./models/ActivityLog');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Check activity logs
async function checkActivityLogs() {
  try {
    console.log('\n🔍 Checking activity logs in database...\n');
    
    // Get all doctor_created logs
    const doctorCreatedLogs = await ActivityLog.find({ 
      activityType: 'doctor_created' 
    }).sort({ timestamp: -1 }).limit(5);
    
    console.log(`Found ${doctorCreatedLogs.length} doctor_created logs:\n`);
    
    doctorCreatedLogs.forEach((log, index) => {
      console.log(`Log ${index + 1}:`);
      console.log('  Activity Type:', log.activityType);
      console.log('  User Name:', log.userName);
      console.log('  User Email:', log.userEmail);
      console.log('  User Role:', log.userRole);
      console.log('  Clinic ID:', log.clinicId);
      console.log('  Clinic Name:', log.clinicName);
      console.log('  Target Entity:', log.targetEntity);
      console.log('  Timestamp:', log.timestamp);
      console.log('  ---');
    });
    
    // Get all unique clinic IDs in activity logs
    const allLogs = await ActivityLog.find({});
    const uniqueClinicIds = [...new Set(allLogs.map(log => log.clinicId.toString()))];
    
    console.log(`\n📊 Total activity logs: ${allLogs.length}`);
    console.log(`📊 Unique clinic IDs in logs: ${uniqueClinicIds.length}`);
    console.log('Clinic IDs:', uniqueClinicIds);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking logs:', error);
    process.exit(1);
  }
}

// Run check
setTimeout(checkActivityLogs, 1000);
