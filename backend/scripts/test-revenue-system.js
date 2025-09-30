const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Revenue = require('../models/Revenue');

async function testRevenueSystem() {
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
    
    // Test clinic ID (you can replace with actual clinic ID)
    const testClinicId = new mongoose.Types.ObjectId();
    const testInvoiceId = new mongoose.Types.ObjectId();
    
    console.log('🧪 Testing Revenue System...');
    console.log(`📋 Test Clinic ID: ${testClinicId}`);
    
    // Test 1: Add revenue
    console.log('\n1️⃣ Testing addRevenue...');
    await Revenue.addRevenue(testClinicId, testInvoiceId, 1500, 'approved');
    
    // Test 2: Get current month revenue
    console.log('\n2️⃣ Testing getCurrentMonthRevenue...');
    const currentMonth = await Revenue.getCurrentMonthRevenue(testClinicId);
    console.log('Current month revenue:', currentMonth);
    
    // Test 3: Add more revenue
    console.log('\n3️⃣ Adding more revenue...');
    const testInvoiceId2 = new mongoose.Types.ObjectId();
    await Revenue.addRevenue(testClinicId, testInvoiceId2, 2500, 'approved');
    
    // Test 4: Check updated revenue
    console.log('\n4️⃣ Checking updated revenue...');
    const updatedRevenue = await Revenue.getCurrentMonthRevenue(testClinicId);
    console.log('Updated revenue:', updatedRevenue);
    
    // Test 5: Test subtraction (rejection)
    console.log('\n5️⃣ Testing subtractRevenue...');
    await Revenue.subtractRevenue(testClinicId, testInvoiceId, 1500, 'rejected');
    
    // Test 6: Check final revenue
    console.log('\n6️⃣ Checking final revenue after subtraction...');
    const finalRevenue = await Revenue.getCurrentMonthRevenue(testClinicId);
    console.log('Final revenue:', finalRevenue);
    
    // Test 7: Get yearly revenue
    console.log('\n7️⃣ Testing getYearlyRevenue...');
    const yearlyRevenue = await Revenue.getYearlyRevenue(testClinicId);
    console.log('Yearly revenue breakdown:', yearlyRevenue.slice(0, 3)); // Show first 3 months
    
    // Test 8: Get previous month revenue
    console.log('\n8️⃣ Testing getPreviousMonthRevenue...');
    const previousMonth = await Revenue.getPreviousMonthRevenue(testClinicId);
    console.log('Previous month revenue:', previousMonth);
    
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await Revenue.deleteMany({ clinicId: testClinicId });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 All revenue system tests passed successfully!');
    
    // Show existing revenue data
    console.log('\n📊 Existing revenue records:');
    const existingRevenue = await Revenue.find({}).limit(5);
    if (existingRevenue.length > 0) {
      existingRevenue.forEach(record => {
        console.log(`🏥 Clinic ${record.clinicId}: ₹${record.totalRevenue} (${record.invoiceCount} invoices) - ${record.year}-${record.month}`);
      });
    } else {
      console.log('ℹ️ No existing revenue records found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testRevenueSystem()
    .then(() => {
      console.log('🎉 Revenue system test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Revenue system test failed:', error);
      process.exit(1);
    });
}

module.exports = testRevenueSystem;
