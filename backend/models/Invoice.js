const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: [true, 'Clinic ID is required']
  },
  lineItems: [{
    description: { type: String, required: true },
    qty: { type: Number, required: true },
    unitPrice: { type: Number, required: true }
  }],
  total: {
    type: Number,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  invoiceNo: {
    type: Number,
    required: true
  },
  address: {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true }
  },
  phone: { type: String },
  email: { type: String },
  remarks: { type: String },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Approved', 'Rejected', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Sent'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to calculate total from line items
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal from line items
  const subtotal = this.lineItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  
  // Calculate total with discount, tax, and shipping
  this.total = subtotal - this.discount + this.tax + this.shipping;
  
  next();
});

// Indexes for better query performance
invoiceSchema.index({ patientId: 1 });
invoiceSchema.index({ invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ date: 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
