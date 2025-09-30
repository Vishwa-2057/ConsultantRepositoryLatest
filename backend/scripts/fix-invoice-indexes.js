const mongoose = require('mongoose');
require('dotenv').config();

async function fixInvoiceIndexes() {
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
    
    // Get the invoices collection
    const db = mongoose.connection.db;
    const collection = db.collection('invoices');
    
    // List all indexes
    console.log('📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)} (${index.name})`);
    });
    
    // Check if the problematic index exists
    const problematicIndex = indexes.find(index => 
      index.name === 'invoiceNumber_1' || 
      (index.key && index.key.invoiceNumber)
    );
    
    if (problematicIndex) {
      console.log('🔧 Dropping problematic invoiceNumber index...');
      try {
        await collection.dropIndex('invoiceNumber_1');
        console.log('✅ Successfully dropped invoiceNumber_1 index');
      } catch (error) {
        console.log('⚠️ Could not drop invoiceNumber_1 index:', error.message);
      }
    }
    
    // Check if the correct index exists
    const correctIndex = indexes.find(index => 
      index.name === 'invoiceNo_1' || 
      (index.key && index.key.invoiceNo)
    );
    
    if (!correctIndex) {
      console.log('🔧 Creating correct invoiceNo index...');
      await collection.createIndex({ invoiceNo: 1 }, { unique: true });
      console.log('✅ Successfully created invoiceNo_1 unique index');
    } else {
      console.log('✅ Correct invoiceNo index already exists');
    }
    
    // Remove any documents with null invoiceNo values
    console.log('🧹 Cleaning up documents with null invoiceNo...');
    const result = await collection.deleteMany({ 
      $or: [
        { invoiceNo: null },
        { invoiceNo: { $exists: false } }
      ]
    });
    console.log(`🗑️ Removed ${result.deletedCount} documents with null invoiceNo`);
    
    // List final indexes
    console.log('📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)} (${index.name})`);
    });
    
    console.log('✅ Invoice indexes fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing invoice indexes:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  fixInvoiceIndexes()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = fixInvoiceIndexes;
