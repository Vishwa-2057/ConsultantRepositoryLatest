const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'cash', 'card', 'upi', 'other'],
    default: 'razorpay'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  // Razorpay specific fields
  razorpayOrderId: {
    type: String,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    index: true
  },
  razorpaySignature: {
    type: String
  },
  // Transaction details
  transactionId: {
    type: String,
    index: true
  },
  transactionDate: {
    type: Date
  },
  // Additional info
  description: {
    type: String
  },
  notes: {
    type: String
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
paymentSchema.index({ appointmentId: 1, status: 1 });
paymentSchema.index({ patientId: 1, createdAt: -1 });
paymentSchema.index({ clinicId: 1, status: 1, createdAt: -1 });

// Static method to get payment by appointment
paymentSchema.statics.getByAppointment = async function(appointmentId) {
  return this.findOne({ appointmentId }).sort({ createdAt: -1 });
};

// Static method to mark payment as completed
paymentSchema.statics.markCompleted = async function(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  return this.findOneAndUpdate(
    { razorpayOrderId },
    {
      status: 'completed',
      razorpayPaymentId,
      razorpaySignature,
      transactionDate: new Date()
    },
    { new: true }
  );
};

// Static method to mark payment as failed
paymentSchema.statics.markFailed = async function(razorpayOrderId, reason) {
  return this.findOneAndUpdate(
    { razorpayOrderId },
    {
      status: 'failed',
      notes: reason
    },
    { new: true }
  );
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
