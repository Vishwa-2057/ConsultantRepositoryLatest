const mongoose = require('mongoose');
require('dotenv').config();

async function recreateIndexes() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoURI);
    
    console.log('✅ Connected to MongoDB');
    
    const DoctorAvailability = require('../models/DoctorAvailability');
    
    // Drop collection to start fresh
    try {
      await DoctorAvailability.collection.drop();
      console.log('✅ Dropped old collection');
    } catch (error) {
      console.log('ℹ️  Collection does not exist yet');
    }
    
    // Create indexes
    await DoctorAvailability.createIndexes();
    console.log('✅ Created indexes successfully');
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

recreateIndexes();
