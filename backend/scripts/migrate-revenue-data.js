const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Invoice = require('../models/Invoice');
const Revenue = require('../models/Revenue');

async function migrateRevenueData() {
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
    
    // Find all approved invoices
    console.log('🔍 Finding all approved invoices...');
    const approvedInvoices = await Invoice.find({ 
      status: 'Approved',
      clinicId: { $exists: true },
      total: { $exists: true, $gt: 0 }
    }).sort({ createdAt: 1 });
    
    console.log(`📊 Found ${approvedInvoices.length} approved invoices to migrate`);
    
    if (approvedInvoices.length === 0) {
      console.log('ℹ️ No approved invoices found. Migration complete.');
      return;
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each invoice
    for (const invoice of approvedInvoices) {
      try {
        // Extract date information
        const invoiceDate = invoice.approvedAt || invoice.createdAt || new Date();
        const year = invoiceDate.getFullYear();
        const month = invoiceDate.getMonth() + 1;
        
        console.log(`📝 Processing invoice ${invoice.invoiceNo} - ₹${invoice.total} (${year}-${month})`);
        
        // Check if this invoice is already recorded in revenue
        const existingRevenue = await Revenue.findOne({
          clinicId: invoice.clinicId,
          year,
          month,
          'invoiceEntries.invoiceId': invoice._id
        });
        
        if (existingRevenue) {
          console.log(`⏭️ Invoice ${invoice.invoiceNo} already recorded in revenue, skipping`);
          skippedCount++;
          continue;
        }
        
        // Add revenue using the model's static method
        await Revenue.addRevenue(
          invoice.clinicId,
          invoice._id,
          invoice.total,
          'approved'
        );
        
        migratedCount++;
        console.log(`✅ Migrated invoice ${invoice.invoiceNo} - ₹${invoice.total}`);
        
      } catch (error) {
        console.error(`❌ Error processing invoice ${invoice.invoiceNo}:`, error.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} invoices`);
    console.log(`⏭️ Skipped (already exists): ${skippedCount} invoices`);
    console.log(`❌ Errors: ${errorCount} invoices`);
    console.log(`📊 Total processed: ${approvedInvoices.length} invoices`);
    
    // Show revenue summary by clinic
    console.log('\n💰 Revenue Summary by Clinic:');
    const revenueSummary = await Revenue.aggregate([
      {
        $group: {
          _id: '$clinicId',
          totalRevenue: { $sum: '$totalRevenue' },
          totalInvoices: { $sum: '$invoiceCount' },
          monthsActive: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'clinics',
          localField: '_id',
          foreignField: '_id',
          as: 'clinic'
        }
      },
      {
        $project: {
          clinicName: { $arrayElemAt: ['$clinic.name', 0] },
          totalRevenue: 1,
          totalInvoices: 1,
          monthsActive: 1
        }
      }
    ]);
    
    revenueSummary.forEach(summary => {
      console.log(`🏥 ${summary.clinicName || 'Unknown Clinic'}: ₹${summary.totalRevenue} (${summary.totalInvoices} invoices, ${summary.monthsActive} months)`);
    });
    
    console.log('\n🎉 Revenue data migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migrateRevenueData()
    .then(() => {
      console.log('🎉 Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateRevenueData;
