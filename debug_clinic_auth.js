const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import the Clinic model
const Clinic = require('./backend/models/Clinic');

async function debugClinicAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/consultant-system');
    console.log('Connected to MongoDB');

    // Find all clinics and check their password fields
    const clinics = await Clinic.find({}).select('adminEmail adminPassword passwordHash adminName name');
    
    console.log('\n=== CLINIC AUTHENTICATION DEBUG ===\n');
    
    for (const clinic of clinics) {
      console.log(`Clinic: ${clinic.name || clinic.adminName}`);
      console.log(`Admin Email: ${clinic.adminEmail}`);
      console.log(`Admin Password Field: ${clinic.adminPassword ? 'EXISTS' : 'MISSING'}`);
      console.log(`Password Hash Field: ${clinic.passwordHash ? 'EXISTS' : 'MISSING'}`);
      
      if (clinic.adminPassword) {
        console.log(`Admin Password Length: ${clinic.adminPassword.length}`);
        console.log(`Admin Password Starts With: ${clinic.adminPassword.substring(0, 10)}...`);
        console.log(`Is Bcrypt Hash: ${clinic.adminPassword.startsWith('$2') ? 'YES' : 'NO'}`);
      }
      
      if (clinic.passwordHash) {
        console.log(`Password Hash Length: ${clinic.passwordHash.length}`);
        console.log(`Password Hash Starts With: ${clinic.passwordHash.substring(0, 10)}...`);
        console.log(`Is Bcrypt Hash: ${clinic.passwordHash.startsWith('$2') ? 'YES' : 'NO'}`);
      }
      
      console.log('---');
    }

    // Test password comparison with a sample
    if (clinics.length > 0) {
      const testClinic = clinics[0];
      console.log(`\nTesting password comparison for: ${testClinic.adminEmail}`);
      
      // You can replace 'your_actual_password' with the password you're trying to use
      const testPassword = 'admin123'; // Replace with your actual password
      
      try {
        const isMatch = await testClinic.comparePassword(testPassword);
        console.log(`Password '${testPassword}' matches: ${isMatch}`);
      } catch (error) {
        console.log(`Error comparing password: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the debug function
debugClinicAuth();
