/**
 * Global test setup
 * Runs before all tests to prepare the test environment
 */

const mongoose = require('mongoose');

module.exports = async () => {
  console.log('\n🚀 Starting global test setup...\n');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  
  // Connect to test database if needed
  const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/healthcare-test';
  
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_TEST_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ Connected to test database');
    }
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error.message);
  }
  
  console.log('✅ Global setup completed\n');
};
