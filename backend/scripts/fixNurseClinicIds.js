const mongoose = require('mongoose');
const Nurse = require('../models/Nurse');
const Clinic = require('../models/Clinic');

// Database migration script to fix missing clinicId fields for nurses
async function fixNurseClinicIds() {
  try {
    console.log('Starting nurse clinicId migration...');
    
    // Connect to database (adjust connection string as needed)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/consultant-system');
    console.log('Connected to database');
    
    // Find nurses without clinicId
    const nursesWithoutClinic = await Nurse.find({
      $or: [
        { clinicId: { $exists: false } },
        { clinicId: null },
        { clinicId: undefined }
      ]
    });
    
    console.log(`Found ${nursesWithoutClinic.length} nurses without clinicId`);
    
    if (nursesWithoutClinic.length === 0) {
      console.log('All nurses already have clinicId assigned');
      return;
    }
    
    // Get the first clinic (or you can modify this logic based on your needs)
    const firstClinic = await Clinic.findOne({ isActive: true });
    
    if (!firstClinic) {
      console.error('No active clinic found. Please create a clinic first.');
      return;
    }
    
    console.log(`Assigning nurses to clinic: ${firstClinic.name} (ID: ${firstClinic._id})`);
    
    // Update all nurses without clinicId
    const updateResult = await Nurse.updateMany(
      {
        $or: [
          { clinicId: { $exists: false } },
          { clinicId: null },
          { clinicId: undefined }
        ]
      },
      {
        $set: { clinicId: firstClinic._id }
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} nurse records`);
    
    // Verify the fix
    const remainingNursesWithoutClinic = await Nurse.countDocuments({
      $or: [
        { clinicId: { $exists: false } },
        { clinicId: null },
        { clinicId: undefined }
      ]
    });
    
    console.log(`Remaining nurses without clinicId: ${remainingNursesWithoutClinic}`);
    
    if (remainingNursesWithoutClinic === 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️ Some nurses still missing clinicId. Manual intervention may be required.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Alternative function to assign nurses to specific clinics
async function assignNursesToSpecificClinic(nurseIds, clinicId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/consultant-system');
    
    const result = await Nurse.updateMany(
      { _id: { $in: nurseIds } },
      { $set: { clinicId: clinicId } }
    );
    
    console.log(`Assigned ${result.modifiedCount} nurses to clinic ${clinicId}`);
    
  } catch (error) {
    console.error('Error assigning nurses to clinic:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Function to check current nurse-clinic assignments
async function checkNurseClinicAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/consultant-system');
    
    console.log('=== Nurse-Clinic Assignment Report ===');
    
    const totalNurses = await Nurse.countDocuments();
    console.log(`Total nurses: ${totalNurses}`);
    
    const nursesWithClinic = await Nurse.countDocuments({
      clinicId: { $exists: true, $ne: null }
    });
    console.log(`Nurses with clinicId: ${nursesWithClinic}`);
    
    const nursesWithoutClinic = await Nurse.countDocuments({
      $or: [
        { clinicId: { $exists: false } },
        { clinicId: null }
      ]
    });
    console.log(`Nurses without clinicId: ${nursesWithoutClinic}`);
    
    // Show nurses without clinicId
    if (nursesWithoutClinic > 0) {
      console.log('\n=== Nurses Missing clinicId ===');
      const problematicNurses = await Nurse.find({
        $or: [
          { clinicId: { $exists: false } },
          { clinicId: null }
        ]
      }).select('fullName email role');
      
      problematicNurses.forEach(nurse => {
        console.log(`- ${nurse.fullName} (${nurse.email}) - Role: ${nurse.role}`);
      });
    }
    
    // Show clinic distribution
    console.log('\n=== Nurses by Clinic ===');
    const nursesByClinic = await Nurse.aggregate([
      {
        $match: {
          clinicId: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'clinics',
          localField: 'clinicId',
          foreignField: '_id',
          as: 'clinic'
        }
      },
      {
        $unwind: '$clinic'
      },
      {
        $group: {
          _id: '$clinicId',
          clinicName: { $first: '$clinic.name' },
          nurseCount: { $sum: 1 },
          nurses: { $push: { name: '$fullName', role: '$role' } }
        }
      }
    ]);
    
    nursesByClinic.forEach(clinic => {
      console.log(`\n${clinic.clinicName}: ${clinic.nurseCount} nurses`);
      clinic.nurses.forEach(nurse => {
        console.log(`  - ${nurse.name} (${nurse.role})`);
      });
    });
    
  } catch (error) {
    console.error('Error checking assignments:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Export functions for use
module.exports = {
  fixNurseClinicIds,
  assignNursesToSpecificClinic,
  checkNurseClinicAssignments
};

// Run the script if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'fix':
      fixNurseClinicIds();
      break;
    case 'check':
      checkNurseClinicAssignments();
      break;
    default:
      console.log('Usage:');
      console.log('  node fixNurseClinicIds.js check  - Check current assignments');
      console.log('  node fixNurseClinicIds.js fix    - Fix missing clinicIds');
      break;
  }
}
