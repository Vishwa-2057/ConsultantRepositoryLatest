const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

async function fixIndex() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get the collection
    const collection = mongoose.connection.db.collection('doctoravailabilities');
    
    // List all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    // Drop the old index if it exists
    try {
      await collection.dropIndex('doctorId_1_date_1');
      console.log('✅ Dropped old index: doctorId_1_date_1');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  Index doctorId_1_date_1 does not exist (already removed)');
      } else {
        console.log('⚠️  Error dropping index:', error.message);
      }
    }
    
    // Create the correct index
    await collection.createIndex(
      { doctorId: 1, clinicId: 1, dayOfWeek: 1 },
      { background: true }
    );
    console.log('✅ Created new index: doctorId_1_clinicId_1_dayOfWeek_1');
    
    // List indexes again to verify
    const newIndexes = await collection.indexes();
    console.log('Updated indexes:', newIndexes);
    
    console.log('\n✅ Index migration completed successfully!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixIndex();
