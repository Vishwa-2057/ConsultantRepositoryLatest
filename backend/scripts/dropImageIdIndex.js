const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function dropImageIdIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('medicalimages');

    // Get all indexes
    console.log('\nCurrent indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}:`, JSON.stringify(index.key));
    });

    // Try to drop the imageId_1 index
    try {
      console.log('\nAttempting to drop imageId_1 index...');
      await collection.dropIndex('imageId_1');
      console.log('✓ Successfully dropped imageId_1 index');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('Index imageId_1 does not exist (already dropped or never existed)');
      } else {
        throw error;
      }
    }

    // Verify indexes after drop
    console.log('\nIndexes after drop:');
    const indexesAfter = await collection.indexes();
    indexesAfter.forEach(index => {
      console.log(`- ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

dropImageIdIndex();
