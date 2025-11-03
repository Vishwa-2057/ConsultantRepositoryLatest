const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const AppointmentInvoice = require('../models/AppointmentInvoice');
const auth = require('../middleware/auth');

// Check if Razorpay keys are configured
const hasRazorpayKeys = process.env.RAZORPAY_KEY_ID && 
                        process.env.RAZORPAY_KEY_SECRET &&
                        process.env.RAZORPAY_KEY_ID.startsWith('rzp_');

// Initialize Razorpay only if keys are available
let razorpay = null;
if (hasRazorpayKeys) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized with keys');
} else {
  console.warn('⚠️  Razorpay keys not configured. Payment features will be limited.');
}

// POST /api/payments/create-order - Create Razorpay order for appointment
router.post('/create-order', auth, async (req, res) => {
  try {
    const { appointmentId, amount } = req.body;

    if (!appointmentId || !amount) {
      return res.status(400).json({ error: 'Appointment ID and amount are required' });
    }

    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({ 
        error: 'Payment gateway not configured',
        message: 'Razorpay keys are not set. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.'
      });
    }

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId)
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName specialty');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `apt_${appointmentId}_${Date.now()}`,
      notes: {
        appointmentId: appointmentId,
        patientName: appointment.patientId?.fullName || 'Unknown',
        doctorName: appointment.doctorId?.fullName || 'Unknown',
        appointmentDate: appointment.date,
        appointmentTime: appointment.time
      }
    };

    const order = await razorpay.orders.create(options);

    // Create payment record
    const payment = new Payment({
      appointmentId,
      patientId: appointment.patientId._id,
      doctorId: appointment.doctorId._id,
      clinicId: appointment.clinicId,
      amount,
      currency: 'INR',
      paymentMethod: 'razorpay',
      status: 'pending',
      razorpayOrderId: order.id,
      description: `Consultation fee for Dr. ${appointment.doctorId?.fullName || 'Unknown'}`
    });

    await payment.save();

    res.json({
      success: true,
      order,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        currency: payment.currency
      }
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order', 
      message: error.message 
    });
  }
});

// POST /api/payments/verify - Verify Razorpay payment
router.post('/verify', auth, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      appointmentId 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification details' });
    }

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(sign.toString())
      .digest('hex');

    const isAuthentic = expectedSign === razorpay_signature;

    if (!isAuthentic) {
      // Mark payment as failed
      await Payment.markFailed(razorpay_order_id, 'Invalid signature');
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Mark payment as completed
    const payment = await Payment.markCompleted(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Update appointment status to Confirmed
    const appointment = await Appointment.findByIdAndUpdate(
      payment.appointmentId,
      { status: 'Confirmed' },
      { new: true }
    ).populate('patientId', 'fullName email phone')
     .populate('doctorId', 'fullName specialty');

    // Update appointment invoice to paid status
    try {
      const appointmentInvoice = await AppointmentInvoice.findOne({ appointmentId: payment.appointmentId });
      if (appointmentInvoice) {
        appointmentInvoice.status = 'paid';
        appointmentInvoice.paymentMethod = 'online';
        appointmentInvoice.paymentDetails = {
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: new Date()
        };
        appointmentInvoice.approvedBy = req.user.id;
        appointmentInvoice.approvedAt = new Date();
        await appointmentInvoice.save();
        console.log('Appointment invoice marked as paid:', appointmentInvoice.invoiceNumber);
      }
    } catch (invoiceError) {
      console.error('Failed to update appointment invoice:', invoiceError);
      // Don't fail the payment verification if invoice update fails
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment,
      appointment
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment', 
      message: error.message 
    });
  }
});

// GET /api/payments/appointment/:appointmentId - Get payment for appointment
router.get('/appointment/:appointmentId', auth, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const payment = await Payment.getByAppointment(appointmentId);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment', 
      message: error.message 
    });
  }
});

// GET /api/payments/patient/:patientId - Get all payments for a patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    const payments = await Payment.find({ patientId })
      .populate('appointmentId')
      .populate('doctorId', 'fullName specialty')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments,
      count: payments.length
    });
  } catch (error) {
    console.error('Error fetching patient payments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payments', 
      message: error.message 
    });
  }
});

// POST /api/payments/create-invoice-order - Create Razorpay order for invoice
router.post('/create-invoice-order', auth, async (req, res) => {
  try {
    const { invoiceId, amount } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({ error: 'Invoice ID and amount are required' });
    }

    // Check if Razorpay is configured
    if (!razorpay) {
      return res.status(503).json({ 
        error: 'Payment gateway not configured',
        message: 'Razorpay keys are not set. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.'
      });
    }

    // Verify invoice exists
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.findById(invoiceId)
      .populate('patientId', 'fullName email phone');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `inv_${invoiceId}_${Date.now()}`,
      notes: {
        invoiceId: invoiceId,
        invoiceNo: invoice.invoiceNo,
        patientName: invoice.patientId?.fullName || invoice.patientName || 'Unknown',
        invoiceDate: invoice.date
      }
    };

    const order = await razorpay.orders.create(options);

    // Create payment record
    const payment = new Payment({
      invoiceId,
      patientId: invoice.patientId._id,
      clinicId: invoice.clinicId,
      amount,
      currency: 'INR',
      paymentMethod: 'razorpay',
      status: 'pending',
      razorpayOrderId: order.id,
      description: `Payment for Invoice #${invoice.invoiceNo}`
    });

    await payment.save();

    res.json({
      success: true,
      order,
      payment: {
        _id: payment._id,
        amount: payment.amount,
        currency: payment.currency
      }
    });
  } catch (error) {
    console.error('Error creating invoice payment order:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order', 
      message: error.message 
    });
  }
});

// POST /api/payments/verify-invoice - Verify Razorpay payment for invoice
router.post('/verify-invoice', auth, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      invoiceId 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification details' });
    }

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(sign.toString())
      .digest('hex');

    const isAuthentic = expectedSign === razorpay_signature;

    if (!isAuthentic) {
      // Mark payment as failed
      await Payment.markFailed(razorpay_order_id, 'Invalid signature');
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // Mark payment as completed
    const payment = await Payment.markCompleted(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Update invoice status to Approved
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.findByIdAndUpdate(
      payment.invoiceId,
      { 
        status: 'Approved',
        approvedAt: new Date(),
        approvedBy: req.user.id
      },
      { new: true }
    ).populate('patientId', 'fullName email phone');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment,
      invoice
    });
  } catch (error) {
    console.error('Error verifying invoice payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment', 
      message: error.message 
    });
  }
});

// GET /api/payments/invoice/:invoiceId - Get payment for invoice
router.get('/invoice/:invoiceId', auth, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const payment = await Payment.findOne({ invoiceId }).sort({ createdAt: -1 });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error fetching invoice payment:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment', 
      message: error.message 
    });
  }
});

module.exports = router;
