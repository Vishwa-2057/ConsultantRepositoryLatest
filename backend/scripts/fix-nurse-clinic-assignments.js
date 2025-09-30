const mongoose = require('mongoose');
require('dotenv').config();

async function fixNurseClinicAssignments() {
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
    
    // Find nurses without clinicId
    const nursesWithoutClinic = await nursesCollection.find({ 
      $or: [
        { clinicId: { $exists: false } },
        { clinicId: null }
      ]
    }).toArray();
    
    console.log(`📋 Found ${nursesWithoutClinic.length} nurses without clinic assignment`);
    
    if (nursesWithoutClinic.length === 0) {
      console.log('✅ All nurses already have clinic assignments!');
      return;
    }
    
    // Get available clinics
    const clinics = await clinicsCollection.find({}).toArray();
    
    if (clinics.length === 0) {
      console.log('❌ No clinics available to assign nurses to');
      return;
    }
    
    console.log(`🏥 Available clinics: ${clinics.length}`);
    
    // Use the first available clinic for assignment (you can modify this logic)
    const defaultClinic = clinics[0];
    console.log(`🎯 Assigning nurses to: ${defaultClinic.name} (ID: ${defaultClinic._id})`);
    
    let assignedCount = 0;
    
    for (const nurse of nursesWithoutClinic) {
      try {
        await nursesCollection.updateOne(
          { _id: nurse._id },
          { $set: { clinicId: new mongoose.Types.ObjectId(defaultClinic._id) } }
        );
        
        console.log(`✅ Assigned ${nurse.fullName} (${nurse.email}) to ${defaultClinic.name}`);
        assignedCount++;
      } catch (error) {
        console.error(`❌ Failed to assign ${nurse.fullName}:`, error.message);
      }
    }
    
    console.log(`\n📊 Assignment Summary:`);
    console.log(`  - Successfully assigned: ${assignedCount} nurses`);
    console.log(`  - Failed assignments: ${nursesWithoutClinic.length - assignedCount} nurses`);
    console.log(`  - All assigned to: ${defaultClinic.name}`);
    
  } catch (error) {
    console.error('❌ Error fixing nurse clinic assignments:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  fixNurseClinicAssignments()
    .then(() => {
      console.log('🎉 Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

module.exports = fixNurseClinicAssignments;
