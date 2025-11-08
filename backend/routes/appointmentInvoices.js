const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AppointmentInvoice = require('../models/AppointmentInvoice');
const Appointment = require('../models/Appointment');
const Revenue = require('../models/Revenue');
const auth = require('../middleware/auth');

// Get all appointment invoices with filters
router.get('/', auth, async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    patientId, 
    doctorId,
    clinicId,
    paymentMethod,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const query = {};
  
  try {
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'clinic') {
      query.clinicId = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'patient') {
      query.patientId = new mongoose.Types.ObjectId(req.user.id);
    }

    // Apply filters
    if (status) query.status = status;
    if (patientId) query.patientId = new mongoose.Types.ObjectId(patientId);
    if (doctorId) query.doctorId = new mongoose.Types.ObjectId(doctorId);
    if (clinicId) query.clinicId = new mongoose.Types.ObjectId(clinicId);
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const invoices = await AppointmentInvoice.find(query)
      .populate('appointmentId', 'appointmentType date time status')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await AppointmentInvoice.countDocuments(query);

    res.json({
      success: true,
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching appointment invoices:', error);
    console.error('Error stack:', error.stack);
    console.error('Query:', query);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch appointment invoices',
      error: error.message 
    });
  }
});

// Get single appointment invoice by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await AppointmentInvoice.findById(req.params.id)
      .populate('appointmentId')
      .populate('patientId', 'fullName phone email address')
      .populate('doctorId', 'fullName specialty phone')
      .populate('clinicId', 'name address phone')
      .populate('approvedBy', 'fullName');

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Appointment invoice not found' 
      });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'admin' ||
                     invoice.doctorId._id.toString() === req.user.id ||
                     invoice.patientId._id.toString() === req.user.id ||
                     (req.user.role === 'clinic' && invoice.clinicId?.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    console.error('Error fetching appointment invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch appointment invoice',
      error: error.message 
    });
  }
});

// Create appointment invoice (called automatically when appointment is created)
router.post('/', auth, async (req, res) => {
  try {
    const { 
      appointmentId, 
      patientId, 
      doctorId, 
      clinicId,
      amount, 
      paymentMethod = 'pending',
      appointmentDetails,
      notes 
    } = req.body;

    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Appointment not found' 
      });
    }

    // Create invoice
    const invoice = new AppointmentInvoice({
      appointmentId,
      patientId,
      doctorId,
      clinicId,
      amount,
      paymentMethod,
      appointmentDetails,
      notes
    });

    await invoice.save();

    const populatedInvoice = await AppointmentInvoice.findById(invoice._id)
      .populate('appointmentId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name');

    res.status(201).json({
      success: true,
      message: 'Appointment invoice created successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error creating appointment invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create appointment invoice',
      error: error.message 
    });
  }
});

// Approve appointment invoice
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const invoice = await AppointmentInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Appointment invoice not found' 
      });
    }

    // Check if user has permission to approve
    const canApprove = req.user.role === 'admin' ||
                      req.user.role === 'clinic' ||
                      invoice.doctorId.toString() === req.user.id;

    if (!canApprove) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to approve invoices' 
      });
    }

    invoice.status = 'approved';
    invoice.approvedBy = req.user.id;
    invoice.approvedAt = new Date();

    await invoice.save();

    // Add revenue when invoice is approved
    if (invoice.clinicId) {
      try {
        await Revenue.addRevenue(
          invoice.clinicId,
          invoice._id,
          invoice.amount,
          'approved'
        );
      } catch (revenueError) {
        console.error('Error adding revenue:', revenueError);
        // Don't fail the approval if revenue tracking fails
      }
    }

    // Update the appointment status from Processing to Scheduled
    const appointment = await Appointment.findById(invoice.appointmentId);
    if (appointment && appointment.status === 'Processing') {
      appointment.status = 'Scheduled';
      await appointment.save();
    }

    const populatedInvoice = await AppointmentInvoice.findById(invoice._id)
      .populate('appointmentId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name');

    res.json({
      success: true,
      message: 'Appointment invoice approved successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error approving appointment invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve appointment invoice',
      error: error.message 
    });
  }
});

// Mark invoice as paid (called after successful Razorpay payment)
router.patch('/:id/mark-paid', auth, async (req, res) => {
  try {
    const { paymentDetails } = req.body;

    const invoice = await AppointmentInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Appointment invoice not found' 
      });
    }

    const wasNotApproved = !invoice.approvedAt;

    invoice.status = 'paid';
    invoice.paymentMethod = 'online';
    invoice.paymentDetails = {
      ...paymentDetails,
      paidAt: new Date()
    };

    // Auto-approve when paid
    if (!invoice.approvedAt) {
      invoice.approvedBy = req.user.id;
      invoice.approvedAt = new Date();
    }

    await invoice.save();

    // Add revenue when invoice is auto-approved via payment
    if (wasNotApproved && invoice.clinicId) {
      try {
        await Revenue.addRevenue(
          invoice.clinicId,
          invoice._id,
          invoice.amount,
          'approved'
        );
      } catch (revenueError) {
        console.error('Error adding revenue:', revenueError);
        // Don't fail the payment if revenue tracking fails
      }
    }

    const populatedInvoice = await AppointmentInvoice.findById(invoice._id)
      .populate('appointmentId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name');

    res.json({
      success: true,
      message: 'Appointment invoice marked as paid',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark invoice as paid',
      error: error.message 
    });
  }
});

// Update appointment invoice (e.g., payment method)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { paymentMethod, notes, status } = req.body;
    const invoice = await AppointmentInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Appointment invoice not found' 
      });
    }

    // Check permissions
    const canUpdate = req.user.role === 'admin' ||
                     req.user.role === 'clinic' ||
                     invoice.doctorId.toString() === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update invoices' 
      });
    }

    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (notes) invoice.notes = notes;
    
    // If status is being changed to approved, update the appointment status
    if (status && status === 'approved' && invoice.status !== 'approved') {
      invoice.status = status;
      invoice.approvedBy = req.user.id;
      invoice.approvedAt = new Date();
      
      // Add revenue when invoice is approved
      if (invoice.clinicId) {
        try {
          await Revenue.addRevenue(
            invoice.clinicId,
            invoice._id,
            invoice.amount,
            'approved'
          );
        } catch (revenueError) {
          console.error('Error adding revenue:', revenueError);
          // Don't fail the update if revenue tracking fails
        }
      }
      
      // Update the appointment status from Processing to Scheduled
      const appointment = await Appointment.findById(invoice.appointmentId);
      if (appointment && appointment.status === 'Processing') {
        appointment.status = 'Scheduled';
        await appointment.save();
      }
    } else if (status) {
      invoice.status = status;
    }

    await invoice.save();

    const populatedInvoice = await AppointmentInvoice.findById(invoice._id)
      .populate('appointmentId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name');

    res.json({
      success: true,
      message: 'Appointment invoice updated successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error updating appointment invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update appointment invoice',
      error: error.message 
    });
  }
});

// Cancel appointment invoice
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const invoice = await AppointmentInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Appointment invoice not found' 
      });
    }

    // Check permissions
    const canCancel = req.user.role === 'admin' ||
                     req.user.role === 'clinic' ||
                     invoice.doctorId.toString() === req.user.id;

    if (!canCancel) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to cancel invoices' 
      });
    }

    invoice.status = 'cancelled';
    await invoice.save();

    res.json({
      success: true,
      message: 'Appointment invoice cancelled successfully',
      invoice
    });
  } catch (error) {
    console.error('Error cancelling appointment invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel appointment invoice',
      error: error.message 
    });
  }
});

// Get invoice statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const stats = await AppointmentInvoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const summary = {
      total: 0,
      unapproved: 0,
      approved: 0,
      paid: 0,
      cancelled: 0,
      totalRevenue: 0,
      pendingRevenue: 0
    };

    stats.forEach(stat => {
      summary.total += stat.count;
      summary[stat._id] = stat.count;
      
      if (stat._id === 'paid') {
        summary.totalRevenue += stat.totalAmount;
      } else if (stat._id === 'approved' || stat._id === 'unapproved') {
        summary.pendingRevenue += stat.totalAmount;
      }
    });

    res.json({
      success: true,
      stats: summary
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch invoice statistics',
      error: error.message 
    });
  }
});

module.exports = router;
