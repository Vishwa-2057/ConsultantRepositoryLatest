const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllUserClinicAssociations() {
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
    
    // Get collections
    const db = mongoose.connection.db;
    const doctorsCollection = db.collection('doctors');
    const nursesCollection = db.collection('nurses');
    const clinicsCollection = db.collection('clinics');
    
    console.log('🔍 Checking all user clinic associations...\n');
    
    // Check doctors
    console.log('👨‍⚕️ DOCTORS:');
    const doctors = await doctorsCollection.find({}).toArray();
    console.log(`Found ${doctors.length} doctors`);
    
    let doctorsWithoutClinic = 0;
    for (const doctor of doctors) {
      if (!doctor.clinicId) {
        doctorsWithoutClinic++;
        console.log(`❌ Dr. ${doctor.fullName} (${doctor.email}) - NO CLINIC`);
      } else {
        console.log(`✅ Dr. ${doctor.fullName} (${doctor.email}) - Clinic: ${doctor.clinicId}`);
      }
    }
    
    // Check nurses
    console.log('\n👩‍⚕️ NURSES:');
    const nurses = await nursesCollection.find({}).toArray();
    console.log(`Found ${nurses.length} nurses`);
    
    let nursesWithoutClinic = 0;
    for (const nurse of nurses) {
      if (!nurse.clinicId) {
        nursesWithoutClinic++;
        console.log(`❌ ${nurse.fullName} (${nurse.email}) - NO CLINIC`);
      } else {
        console.log(`✅ ${nurse.fullName} (${nurse.email}) - Clinic: ${nurse.clinicId}`);
      }
    }
    
    // Check clinics
    console.log('\n🏥 CLINICS:');
    const clinics = await clinicsCollection.find({}).toArray();
    console.log(`Found ${clinics.length} clinics`);
    
    for (const clinic of clinics) {
      console.log(`🏥 ${clinic.name} (ID: ${clinic._id}) - Admin: ${clinic.adminName || 'N/A'}`);
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`👨‍⚕️ Doctors: ${doctors.length - doctorsWithoutClinic}/${doctors.length} have clinic associations`);
    console.log(`👩‍⚕️ Nurses: ${nurses.length - nursesWithoutClinic}/${nurses.length} have clinic associations`);
    console.log(`🏥 Total Clinics: ${clinics.length}`);
    
    if (doctorsWithoutClinic > 0 || nursesWithoutClinic > 0) {
      console.log('\n⚠️  ISSUES FOUND:');
      if (doctorsWithoutClinic > 0) {
        console.log(`   - ${doctorsWithoutClinic} doctors without clinic associations`);
      }
      if (nursesWithoutClinic > 0) {
        console.log(`   - ${nursesWithoutClinic} nurses without clinic associations`);
      }
      console.log('\n💡 Run fix-all-user-clinic-associations.js to fix these issues');
    } else {
      console.log('\n✅ All users have proper clinic associations!');
    }
    
  } catch (error) {
    console.error('❌ Error checking user clinic associations:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n📝 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  checkAllUserClinicAssociations()
    .then(() => {
      console.log('🎉 Check completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Check failed:', error);
      process.exit(1);
    });
}

module.exports = checkAllUserClinicAssociations;
