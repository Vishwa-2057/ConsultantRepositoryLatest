const mongoose = require('mongoose');

const appointmentInvoiceSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
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
  appointmentDetails: {
    appointmentType: String,
    appointmentDate: Date,
    appointmentTime: String,
    duration: Number
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Generate invoice number before validation
appointmentInvoiceSchema.pre('validate', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const count = await mongoose.model('AppointmentInvoice').countDocuments();
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      this.invoiceNumber = `APPT-INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
    }
  }
  next();
});

module.exports = mongoose.model('AppointmentInvoice', appointmentInvoiceSchema);
