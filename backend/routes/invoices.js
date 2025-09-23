const express = require('express');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');
const router = express.Router();

// Validation middleware
const validateInvoice = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('patientName').trim().isLength({ min: 1 }).withMessage('Patient name is required'),
  body('invoiceNo').isNumeric().withMessage('Valid invoice number is required'),
  body('date').trim().isLength({ min: 1 }).withMessage('Invoice date is required'),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lineItems.*.description').trim().isLength({ min: 1 }).withMessage('Item description is required'),
  body('lineItems.*.qty').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('lineItems.*.unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
  body('address.line1').trim().isLength({ min: 1 }).withMessage('Address line 1 is required'),
  body('address.city').trim().isLength({ min: 1 }).withMessage('City is required'),
  body('address.state').trim().isLength({ min: 1 }).withMessage('State is required'),
  body('address.zipCode').trim().isLength({ min: 1 }).withMessage('Zip code is required'),
  body('total').isFloat({ min: 0 }).withMessage('Valid total is required')
];

// GET /api/invoices - Get all invoices with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      date = '',
      patientId = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    // Clinic-based filtering: clinic admins can only see their clinic's invoices
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    if (date) {
      query.date = date;
    }
    
    if (patientId) {
      query.patientId = patientId;
    }

    if (status) {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const invoices = await Invoice.find(query)
      .populate('patientId', 'fullName phone email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    // Get total count for pagination
    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalInvoices: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/:id - Get invoice by ID
router.get('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const invoice = await Invoice.findOne(query)
      .populate('patientId', 'fullName phone email address')
      .select('-__v');
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/invoices - Create new invoice
router.post('/', auth, validateInvoice, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if patient exists
    const patient = await Patient.findById(req.body.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check if invoice number already exists
    const existingInvoice = await Invoice.findOne({ invoiceNo: req.body.invoiceNo });
    if (existingInvoice) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }

    // Create new invoice with clinic reference
    const invoiceData = {
      ...req.body,
      clinicId: req.user.role === 'clinic' ? req.user.id : req.body.clinicId
    };
    const invoice = new Invoice(invoiceData);
    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('patientId', 'fullName phone email');

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice: populatedInvoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/invoices/:id - Update invoice
router.put('/:id', auth, validateInvoice, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    // Check if invoice exists
    const invoice = await Invoice.findOne(query);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if invoice number is being changed and conflicts with another invoice
    if (req.body.invoiceNo && req.body.invoiceNo !== invoice.invoiceNo) {
      const existingInvoice = await Invoice.findOne({ 
        invoiceNo: req.body.invoiceNo,
        _id: { $ne: req.params.id }
      });
      if (existingInvoice) {
        return res.status(400).json({ error: 'Invoice number already exists' });
      }
    }

    // Update invoice
    const updatedInvoice = await Invoice.findOneAndUpdate(
      query,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('patientId', 'fullName phone email')
    .select('-__v');

    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const invoice = await Invoice.findOne(query);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/invoices/:id/approve - Approve invoice
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const invoice = await Invoice.findOne(query);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if invoice is in a state that can be approved
    if (invoice.status !== 'Sent') {
      return res.status(400).json({ 
        error: `Invoice cannot be approved. Current status: ${invoice.status}` 
      });
    }

    // Update invoice status to approved
    const updatedInvoice = await Invoice.findOneAndUpdate(
      query,
      {
        status: 'Approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      { new: true, runValidators: true }
    )
    .populate('patientId', 'fullName phone email')
    .select('-__v');

    res.json({
      message: 'Invoice approved successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error approving invoice:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/invoices/:id/reject - Reject invoice
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Filter by clinic for clinic admins
    const query = { _id: req.params.id };
    if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const invoice = await Invoice.findOne(query);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if invoice is in a state that can be rejected
    if (invoice.status !== 'Sent') {
      return res.status(400).json({ 
        error: `Invoice cannot be rejected. Current status: ${invoice.status}` 
      });
    }

    // Update invoice status to rejected
    const updatedInvoice = await Invoice.findOneAndUpdate(
      query,
      {
        status: 'Rejected',
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectionReason: reason || 'No reason provided'
      },
      { new: true, runValidators: true }
    )
    .populate('patientId', 'fullName phone email')
    .select('-__v');

    res.json({
      message: 'Invoice rejected successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error rejecting invoice:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/invoices/stats/current-month-revenue - Get current month revenue
router.get('/stats/current-month-revenue', auth, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get current month revenue with clinic filtering
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const matchStage = {
      date: { $regex: `^${currentMonth}` }
    };
    
    // Add clinic filtering for clinic admins
    if (req.user.role === 'clinic') {
      matchStage.clinicId = req.user.id;
    }
    
    const currentMonthRevenue = await Invoice.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          invoiceCount: { $sum: 1 }
        }
      }
    ]);

    // Get previous month revenue for comparison
    const prevMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
    const prevMatchStage = {
      date: { $regex: `^${prevMonth}` }
    };
    
    // Add clinic filtering for clinic admins
    if (req.user.role === 'clinic') {
      prevMatchStage.clinicId = req.user.id;
    }
    
    const prevMonthRevenue = await Invoice.aggregate([
      {
        $match: prevMatchStage
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' }
        }
      }
    ]);

    const currentRevenue = currentMonthRevenue[0]?.totalRevenue || 0;
    const previousRevenue = prevMonthRevenue[0]?.totalRevenue || 0;
    const invoiceCount = currentMonthRevenue[0]?.invoiceCount || 0;

    // Calculate percentage change
    let percentageChange = 0;
    if (previousRevenue > 0) {
      percentageChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    } else if (currentRevenue > 0) {
      percentageChange = 100; // If no previous revenue but current revenue exists
    }

    res.json({
      currentMonthRevenue: currentRevenue,
      previousMonthRevenue: previousRevenue,
      percentageChange: Math.round(percentageChange * 10) / 10, // Round to 1 decimal place
      invoiceCount,
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
    });
  } catch (error) {
    console.error('Error fetching current month revenue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/stats/summary - Get invoice statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalInvoices = await Invoice.countDocuments();
    const totalRevenue = await Invoice.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Get monthly revenue for current year
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          date: { $regex: `^${currentYear}` }
        }
      },
      {
        $addFields: {
          month: { $toInt: { $substr: ['$date', 5, 2] } }
        }
      },
      {
        $group: {
          _id: '$month',
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
