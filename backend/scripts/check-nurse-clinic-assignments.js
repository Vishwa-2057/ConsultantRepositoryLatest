const mongoose = require('mongoose');
require('dotenv').config();

async function checkNurseClinicAssignments() {
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
    const clinicsCollection = db.collection('clinics');
    
    // Check all nurses
    console.log('📋 Checking nurse clinic assignments...');
    const nurses = await nursesCollection.find({}).toArray();
    console.log(`Found ${nurses.length} nurses in database`);
    
    let nursesWithoutClinic = 0;
    let nursesWithClinic = 0;
    
    for (const nurse of nurses) {
      if (!nurse.clinicId) {
        nursesWithoutClinic++;
        console.log(`❌ Nurse ${nurse.fullName} (${nurse.email}) has no clinicId`);
      } else {
        nursesWithClinic++;
        console.log(`✅ Nurse ${nurse.fullName} (${nurse.email}) assigned to clinic: ${nurse.clinicId}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Nurses with clinic assignment: ${nursesWithClinic}`);
    console.log(`  - Nurses without clinic assignment: ${nursesWithoutClinic}`);
    
    // Check available clinics
    const clinics = await clinicsCollection.find({}).toArray();
    console.log(`\n🏥 Available clinics (${clinics.length}):`);
    clinics.forEach(clinic => {
      console.log(`  - ${clinic.name} (ID: ${clinic._id})`);
    });
    
    // If there are nurses without clinic and clinics available, suggest assignment
    if (nursesWithoutClinic > 0 && clinics.length > 0) {
      console.log(`\n💡 Suggestion: Assign nurses without clinic to available clinics`);
      console.log(`   You can run the fix-nurse-clinic-assignments.js script to auto-assign them`);
    }
    
  } catch (error) {
    console.error('❌ Error checking nurse clinic assignments:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  checkNurseClinicAssignments()
    .then(() => {
      console.log('🎉 Check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Check failed:', error);
      process.exit(1);
    });
}

module.exports = checkNurseClinicAssignments;
