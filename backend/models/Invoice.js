const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // Patient Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient ID is required']
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true
  },
  
  // Invoice Details
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  terms: {
    type: String,
    default: 'Net 30',
    trim: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft'
  },
  
  // Items and Services
  items: [{
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than 0']
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate must be greater than or equal to 0']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be greater than or equal to 0']
    }
  }],
  
  // Financial Calculations
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal must be greater than or equal to 0']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate must be greater than or equal to 0'],
    max: [100, 'Tax rate cannot exceed 100']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount must be greater than or equal to 0']
  },
  discountRate: {
    type: Number,
    default: 0,
    min: [0, 'Discount rate must be greater than or equal to 0'],
    max: [100, 'Discount rate cannot exceed 100']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount must be greater than or equal to 0']
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total must be greater than or equal to 0']
  },
  
  // Payment Information
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Check', 'Credit Card', 'Debit Card', 'Insurance', 'Other'],
    default: 'Other'
  },
  paymentDate: {
    type: Date
  },
  paymentReference: {
    type: String,
    trim: true
  },
  partialPayments: [{
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Payment amount must be greater than 0']
    },
    date: {
      type: Date,
      default: Date.now
    },
    method: {
      type: String,
      trim: true
    },
    reference: {
      type: String,
      trim: true
    }
  }],
  
  // Insurance Information
  insurance: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    groupNumber: {
      type: String,
      trim: true
    },
    coverage: {
      type: Number,
      min: [0, 'Coverage must be greater than or equal to 0']
    }
  },
  
  // Notes and Additional Information
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Internal notes cannot exceed 500 characters']
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining balance
invoiceSchema.virtual('remainingBalance').get(function() {
  if (this.status === 'Paid') return 0;
  
  const totalPaid = this.partialPayments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, this.total - totalPaid);
});

// Virtual for is overdue
invoiceSchema.virtual('isOverdue').get(function() {
  if (this.status === 'Paid' || this.status === 'Cancelled') return false;
  return new Date() > this.dueDate;
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const now = new Date();
  const due = this.dueDate;
  const diffTime = Math.abs(now - due);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for payment status
invoiceSchema.virtual('paymentStatus').get(function() {
  if (this.status === 'Paid') return 'Paid';
  if (this.status === 'Cancelled') return 'Cancelled';
  
  const remaining = this.remainingBalance;
  if (remaining === 0) return 'Paid';
  if (remaining === this.total) return 'Unpaid';
  return 'Partially Paid';
});

// Pre-save middleware to calculate amounts
invoiceSchema.pre('save', function(next) {
  // Calculate item amounts
  this.items.forEach(item => {
    item.amount = item.quantity * item.rate;
  });
  
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate tax amount
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  
  // Calculate discount amount
  this.discountAmount = (this.subtotal * this.discountRate) / 100;
  
  // Calculate total
  this.total = this.subtotal + this.taxAmount - this.discountAmount;
  
  // Update status based on payment
  if (this.paymentDate && this.remainingBalance === 0) {
    this.status = 'Paid';
  } else if (this.isOverdue && this.status !== 'Paid' && this.status !== 'Cancelled') {
    this.status = 'Overdue';
  }
  
  next();
});

// Indexes for better query performance
invoiceSchema.index({ patientId: 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

// Compound index for patient and status
invoiceSchema.index({ patientId: 1, status: 1 });

// Static method to find overdue invoices
invoiceSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['Paid', 'Cancelled'] }
  }).populate('patientId', 'fullName phone email');
};

// Static method to find invoices by status
invoiceSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('patientId', 'fullName phone email');
};

// Static method to find invoices by date range
invoiceSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    invoiceDate: {
      $gte: startDate,
      $lte: endDate
    }
  }).populate('patientId', 'fullName phone email');
};

// Instance method to mark as sent
invoiceSchema.methods.markAsSent = function() {
  this.status = 'Sent';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to mark as paid
invoiceSchema.methods.markAsPaid = function(paymentMethod = 'Other', reference = '') {
  this.status = 'Paid';
  this.paymentMethod = paymentMethod;
  this.paymentDate = new Date();
  this.paymentReference = reference;
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to add partial payment
invoiceSchema.methods.addPartialPayment = function(payment) {
  this.partialPayments.push(payment);
  
  // Check if fully paid
  if (this.remainingBalance === 0) {
    this.status = 'Paid';
    this.paymentDate = new Date();
  }
  
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to cancel invoice
invoiceSchema.methods.cancel = function() {
  this.status = 'Cancelled';
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to recalculate totals
invoiceSchema.methods.recalculateTotals = function() {
  // Recalculate item amounts
  this.items.forEach(item => {
    item.amount = item.quantity * item.rate;
  });
  
  // Recalculate all totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  this.discountAmount = (this.subtotal * this.discountRate) / 100;
  this.total = this.subtotal + this.taxAmount - this.discountAmount;
  
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Invoice', invoiceSchema);
