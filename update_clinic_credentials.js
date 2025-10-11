const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the Clinic model
const Clinic = require('./backend/models/Clinic');

async function updateClinicCredentials() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/consultant-system');
    console.log('Connected to MongoDB');

    // Find the clinic (you can modify this query to match your specific clinic)
    const clinic = await Clinic.findOne({ adminEmail: 'a1@gmail.com' });
    
    if (!clinic) {
      console.log('❌ Clinic not found with email: a1@gmail.com');
      return;
    }

    console.log(`📋 Current Clinic Details:`);
    console.log(`  - Name: ${clinic.name}`);
    console.log(`  - Admin Email: ${clinic.adminEmail}`);
    console.log(`  - Admin Password: ${clinic.adminPassword}`);

    // Update the credentials
    const newEmail = 'psycbaka@gmail.com';
    const newPassword = 'the1234';

    // Hash the new password for security
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await Clinic.findByIdAndUpdate(clinic._id, {
      adminEmail: newEmail,
      adminPassword: hashedPassword  // Store as hashed for security
    });

    console.log(`✅ Clinic credentials updated successfully!`);
    console.log(`  - New Admin Email: ${newEmail}`);
    console.log(`  - New Password: ${newPassword} (stored as hash)`);
    console.log(`  - You can now login with these credentials`);

  } catch (error) {
    console.error('❌ Error updating clinic credentials:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the update function
updateClinicCredentials();
