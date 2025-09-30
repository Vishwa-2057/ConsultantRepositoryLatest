const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  invoiceCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Track individual invoice contributions for audit purposes
  invoiceEntries: [{
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    action: {
      type: String,
      enum: ['add', 'subtract'],
      required: true
    },
    reason: {
      type: String,
      enum: ['approved', 'rejected', 'cancelled', 'adjustment'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure one record per clinic per month
revenueSchema.index({ clinicId: 1, year: 1, month: 1 }, { unique: true });

// Index for efficient querying
revenueSchema.index({ clinicId: 1, year: 1 });
revenueSchema.index({ lastUpdated: -1 });

// Static method to add revenue
revenueSchema.statics.addRevenue = async function(clinicId, invoiceId, amount, reason = 'approved') {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    const result = await this.findOneAndUpdate(
      { clinicId, year, month },
      {
        $inc: { 
          totalRevenue: amount,
          invoiceCount: 1
        },
        $push: {
          invoiceEntries: {
            invoiceId,
            amount,
            action: 'add',
            reason,
            timestamp: now
          }
        },
        $set: { lastUpdated: now }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`✅ Added revenue: ₹${amount} for clinic ${clinicId} (${year}-${month})`);
    return result;
  } catch (error) {
    console.error('❌ Error adding revenue:', error);
    throw error;
  }
};

// Static method to subtract revenue
revenueSchema.statics.subtractRevenue = async function(clinicId, invoiceId, amount, reason = 'rejected') {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    const result = await this.findOneAndUpdate(
      { clinicId, year, month },
      {
        $inc: { 
          totalRevenue: -amount,
          invoiceCount: -1
        },
        $push: {
          invoiceEntries: {
            invoiceId,
            amount,
            action: 'subtract',
            reason,
            timestamp: now
          }
        },
        $set: { lastUpdated: now }
      },
      { 
        new: true
      }
    );

    console.log(`✅ Subtracted revenue: ₹${amount} for clinic ${clinicId} (${year}-${month})`);
    return result;
  } catch (error) {
    console.error('❌ Error subtracting revenue:', error);
    throw error;
  }
};

// Static method to get current month revenue
revenueSchema.statics.getCurrentMonthRevenue = async function(clinicId) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const revenue = await this.findOne({ clinicId, year, month });
  return {
    totalRevenue: revenue?.totalRevenue || 0,
    invoiceCount: revenue?.invoiceCount || 0,
    month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
  };
};

// Static method to get previous month revenue for comparison
revenueSchema.statics.getPreviousMonthRevenue = async function(clinicId) {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prevMonth.getFullYear();
  const month = prevMonth.getMonth() + 1;

  const revenue = await this.findOne({ clinicId, year, month });
  return revenue?.totalRevenue || 0;
};

// Static method to get yearly revenue breakdown
revenueSchema.statics.getYearlyRevenue = async function(clinicId, year = null) {
  const targetYear = year || new Date().getFullYear();
  
  const revenues = await this.find({ 
    clinicId, 
    year: targetYear 
  }).sort({ month: 1 });

  // Create array with all 12 months
  const monthlyData = Array.from({ length: 12 }, (_, index) => {
    const monthRevenue = revenues.find(r => r.month === index + 1);
    return {
      month: index + 1,
      totalRevenue: monthRevenue?.totalRevenue || 0,
      invoiceCount: monthRevenue?.invoiceCount || 0
    };
  });

  return monthlyData;
};

// Virtual for month name
revenueSchema.virtual('monthName').get(function() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[this.month - 1];
});

module.exports = mongoose.model('Revenue', revenueSchema);
