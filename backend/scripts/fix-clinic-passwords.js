const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Clinic = require('../models/Clinic');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/healthcare-management');

async function fixClinicPasswords() {
  try {
    console.log('🔍 Checking clinic passwords...');
    
    // Find all clinics
    const clinics = await Clinic.find({});
    console.log(`Found ${clinics.length} clinics to check`);
    
    let fixedCount = 0;
    
    for (const clinic of clinics) {
      const password = clinic.adminPassword || clinic.passwordHash;
      
      if (!password) {
        console.log(`⚠️  Clinic ${clinic.adminEmail} has no password - skipping`);
        continue;
      }
      
      // Check if password is already hashed (bcrypt hashes start with $2)
      if (password.startsWith('$2')) {
        console.log(`✅ Clinic ${clinic.adminEmail} already has hashed password`);
        continue;
      }
      
      // Password is plain text, need to hash it
      console.log(`🔧 Fixing plain text password for clinic: ${clinic.adminEmail}`);
      
      try {
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Update the clinic with hashed password
        await Clinic.findByIdAndUpdate(clinic._id, { 
          adminPassword: hashedPassword 
        });
        
        console.log(`✅ Successfully hashed password for clinic: ${clinic.adminEmail}`);
        fixedCount++;
        
      } catch (hashError) {
        console.error(`❌ Failed to hash password for clinic ${clinic.adminEmail}:`, hashError.message);
      }
    }
    
    console.log(`\n🎉 Password fix completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total clinics checked: ${clinics.length}`);
    console.log(`   - Passwords fixed: ${fixedCount}`);
    
    if (fixedCount > 0) {
      console.log(`\n✨ All clinic admin passwords are now properly hashed!`);
      console.log(`🔐 Clinic admins can now use forgot password feature without issues.`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing clinic passwords:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the fix
setTimeout(fixClinicPasswords, 1000);
