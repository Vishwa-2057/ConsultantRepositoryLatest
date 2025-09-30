const mongoose = require('mongoose');
require('dotenv').config();

async function checkNurseRoles() {
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
    
    // Get the nurses collection
    const db = mongoose.connection.db;
    const nursesCollection = db.collection('nurses');
    
    // Check all nurses and their roles
    console.log('📋 Checking nurse roles...');
    const nurses = await nursesCollection.find({}).toArray();
    console.log(`Found ${nurses.length} nurses in database`);
    
    for (const nurse of nurses) {
      console.log(`👩‍⚕️ ${nurse.fullName} (${nurse.email})`);
      console.log(`   - Role: ${nurse.role || 'NOT SET'}`);
      console.log(`   - ClinicId: ${nurse.clinicId || 'NOT SET'}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking nurse roles:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  checkNurseRoles()
    .then(() => {
      console.log('🎉 Check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Check failed:', error);
      process.exit(1);
    });
}

module.exports = checkNurseRoles;
