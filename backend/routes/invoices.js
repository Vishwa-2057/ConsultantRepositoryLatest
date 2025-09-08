const express = require('express');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const router = express.Router();

// Validation middleware
const validateInvoice = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('patientName').trim().isLength({ min: 1 }).withMessage('Patient name is required'),
  body('invoiceNumber').trim().isLength({ min: 1 }).withMessage('Invoice number is required'),
  body('invoiceDate').isISO8601().withMessage('Valid invoice date is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').trim().isLength({ min: 1 }).withMessage('Item description is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('items.*.rate').isFloat({ min: 0 }).withMessage('Valid rate is required')
];

// GET /api/invoices - Get all invoices with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      date = '',
      patientId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.invoiceDate = { $gte: startDate, $lt: endDate };
    }
    
    if (patientId) {
      query.patientId = patientId;
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
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
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
router.post('/', validateInvoice, async (req, res) => {
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
    const existingInvoice = await Invoice.findOne({ invoiceNumber: req.body.invoiceNumber });
    if (existingInvoice) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }

    // Create new invoice
    const invoice = new Invoice(req.body);
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
router.put('/:id', validateInvoice, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check if invoice exists
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if invoice number is being changed and conflicts with another invoice
    if (req.body.invoiceNumber && req.body.invoiceNumber !== invoice.invoiceNumber) {
      const existingInvoice = await Invoice.findOne({ 
        invoiceNumber: req.body.invoiceNumber,
        _id: { $ne: req.params.id }
      });
      if (existingInvoice) {
        return res.status(400).json({ error: 'Invoice number already exists' });
      }
    }

    // Update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
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
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
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

// PATCH /api/invoices/:id/status - Update invoice status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    invoice.status = status;
    invoice.updatedAt = new Date();
    await invoice.save();

    const updatedInvoice = await Invoice.findById(req.params.id)
      .populate('patientId', 'fullName phone email');

    res.json({
      message: 'Invoice status updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }
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
    
    // Get invoices by status
    const statusStats = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      }
    ]);

    // Get monthly revenue for current year
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$invoiceDate' },
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      totalInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusStats,
      monthlyRevenue
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
