const mongoose = require('mongoose');

const teleconsultationInvoiceSchema = new mongoose.Schema({
  teleconsultationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teleconsultation',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic'
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['unapproved', 'approved', 'paid', 'cancelled'],
    default: 'unapproved'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'pending'],
    default: 'pending'
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paidAt: Date
  },
  teleconsultationDetails: {
    scheduledDate: Date,
    scheduledTime: String,
    duration: Number,
    meetingId: String
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic'
  },
  approvedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Generate invoice number before validation
teleconsultationInvoiceSchema.pre('validate', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const count = await mongoose.model('TeleconsultationInvoice').countDocuments();
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      this.invoiceNumber = `TELE-INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
    }
  }
  next();
});

module.exports = mongoose.model('TeleconsultationInvoice', teleconsultationInvoiceSchema);
