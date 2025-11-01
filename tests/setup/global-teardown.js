/**
 * Global test teardown
 * Runs after all tests to clean up the test environment
 */

const mongoose = require('mongoose');

module.exports = async () => {
  console.log('\n🧹 Starting global test teardown...\n');
  
  // Close database connection
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✅ Closed database connection');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
  }
  
  console.log('✅ Global teardown completed\n');
};
