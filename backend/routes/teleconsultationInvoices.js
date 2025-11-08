const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TeleconsultationInvoice = require('../models/TeleconsultationInvoice');
const Teleconsultation = require('../models/Teleconsultation');
const Revenue = require('../models/Revenue');
const auth = require('../middleware/auth');

// Get all teleconsultation invoices with filters
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

    const invoices = await TeleconsultationInvoice.find(query)
      .populate('teleconsultationId', 'scheduledDate scheduledTime status meetingId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await TeleconsultationInvoice.countDocuments(query);

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
    console.error('Error fetching teleconsultation invoices:', error);
    console.error('Error stack:', error.stack);
    console.error('Query:', query);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch teleconsultation invoices',
      error: error.message 
    });
  }
});

// Get single teleconsultation invoice by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await TeleconsultationInvoice.findById(req.params.id)
      .populate('teleconsultationId', 'scheduledDate scheduledTime status meetingId')
      .populate('patientId', 'fullName phone email address')
      .populate('doctorId', 'fullName specialty phone')
      .populate('clinicId', 'name address phone');

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teleconsultation invoice not found' 
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
    console.error('Error fetching teleconsultation invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch teleconsultation invoice',
      error: error.message 
    });
  }
});

// Create teleconsultation invoice (called automatically when teleconsultation is created)
router.post('/', auth, async (req, res) => {
  try {
    const { 
      teleconsultationId, 
      patientId, 
      doctorId, 
      clinicId,
      amount, 
      paymentMethod = 'pending',
      teleconsultationDetails,
      notes 
    } = req.body;

    // Verify teleconsultation exists
    const teleconsultation = await Teleconsultation.findById(teleconsultationId);
    if (!teleconsultation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teleconsultation not found' 
      });
    }

    // Create invoice
    const invoice = new TeleconsultationInvoice({
      teleconsultationId,
      patientId,
      doctorId,
      clinicId,
      amount,
      paymentMethod,
      teleconsultationDetails,
      notes
    });

    await invoice.save();

    const populatedInvoice = await TeleconsultationInvoice.findById(invoice._id)
      .populate('teleconsultationId', 'scheduledDate scheduledTime status meetingId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name');

    res.status(201).json({
      success: true,
      message: 'Teleconsultation invoice created successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error creating teleconsultation invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create teleconsultation invoice',
      error: error.message 
    });
  }
});

// Approve teleconsultation invoice
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const invoice = await TeleconsultationInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teleconsultation invoice not found' 
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

    // Update the teleconsultation status from Processing to Scheduled
    const teleconsultation = await Teleconsultation.findById(invoice.teleconsultationId);
    if (teleconsultation && teleconsultation.status === 'Processing') {
      teleconsultation.status = 'Scheduled';
      await teleconsultation.save();
    }

    const populatedInvoice = await TeleconsultationInvoice.findById(invoice._id)
      .populate('teleconsultationId', 'scheduledDate scheduledTime status meetingId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name');

    res.json({
      success: true,
      message: 'Teleconsultation invoice approved successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error approving teleconsultation invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve teleconsultation invoice',
      error: error.message 
    });
  }
});

// Mark invoice as paid (called after successful Razorpay payment)
router.patch('/:id/mark-paid', auth, async (req, res) => {
  try {
    const { paymentDetails } = req.body;

    const invoice = await TeleconsultationInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teleconsultation invoice not found' 
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

    const populatedInvoice = await TeleconsultationInvoice.findById(invoice._id)
      .populate('teleconsultationId', 'scheduledDate scheduledTime status meetingId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name');

    res.json({
      success: true,
      message: 'Teleconsultation invoice marked as paid',
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

// Update teleconsultation invoice (e.g., payment method)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { paymentMethod, notes, status } = req.body;
    const invoice = await TeleconsultationInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teleconsultation invoice not found' 
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
    
    // If status is being changed to approved, update the teleconsultation status
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
      
      // Update the teleconsultation status from Processing to Scheduled
      const teleconsultation = await Teleconsultation.findById(invoice.teleconsultationId);
      if (teleconsultation && teleconsultation.status === 'Processing') {
        teleconsultation.status = 'Scheduled';
        await teleconsultation.save();
      }
    } else if (status) {
      invoice.status = status;
    }

    await invoice.save();

    const populatedInvoice = await TeleconsultationInvoice.findById(invoice._id)
      .populate('teleconsultationId', 'scheduledDate scheduledTime status meetingId')
      .populate('patientId', 'fullName phone email')
      .populate('doctorId', 'fullName specialty')
      .populate('clinicId', 'name');

    res.json({
      success: true,
      message: 'Teleconsultation invoice updated successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error updating teleconsultation invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update teleconsultation invoice',
      error: error.message 
    });
  }
});

// Cancel teleconsultation invoice
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const invoice = await TeleconsultationInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teleconsultation invoice not found' 
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
      message: 'Teleconsultation invoice cancelled successfully',
      invoice
    });
  } catch (error) {
    console.error('Error cancelling teleconsultation invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel teleconsultation invoice',
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

    const stats = await TeleconsultationInvoice.aggregate([
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
