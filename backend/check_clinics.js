const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/healthcare-management');

async function checkClinics() {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('clinics');
    const clinics = await collection.find({}).toArray();
    
    console.log('Found', clinics.length, 'clinics:');
    
    clinics.forEach((clinic, i) => {
      console.log(`${i+1}. Name: ${clinic.name || 'N/A'}`);
      console.log(`   Email: ${clinic.email || 'N/A'}`);
      console.log(`   Admin Email: ${clinic.adminEmail || 'N/A'}`);
      console.log(`   Admin Username: ${clinic.adminUsername || 'N/A'}`);
      console.log(`   Admin Password: ${clinic.adminPassword || 'N/A'}`);
      console.log('   ---');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

setTimeout(checkClinics, 1000);
