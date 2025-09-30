const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Patient = require('../models/Patient');
const Revenue = require('../models/Revenue');
const auth = require('../middleware/auth');
const router = express.Router();

// Helper function to get user's clinic ID
const getUserClinicId = async (user) => {
  if (!user) return null;
  
  if (user.role === 'doctor') {
    const Doctor = require('../models/Doctor');
    const doctor = await Doctor.findById(user.id);
    return doctor?.clinicId || null;
  } else if (['nurse', 'head_nurse', 'supervisor'].includes(user.role)) {
    const Nurse = require('../models/Nurse');
    const nurse = await Nurse.findById(user.id);
    return nurse?.clinicId || null;
  } else if (user.role === 'clinic') {
    return user.id; // Clinic admin's ID is the clinic ID
  }
  
  return null;
};

// Validation middleware
const validateInvoice = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('patientName').trim().isLength({ min: 1 }).withMessage('Patient name is required'),
  body('invoiceNo').optional().isNumeric().withMessage('Valid invoice number is required'),
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
    console.log('=== Invoice Creation Debug ===');
    console.log('User object from auth:', req.user);
    console.log('User role:', req.user?.role);
    console.log('User ID:', req.user?.id);
    console.log('Request body clinicId:', req.body.clinicId);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
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

    // Check if invoice number already exists (only if provided)
    if (req.body.invoiceNo) {
      const existingInvoice = await Invoice.findOne({ invoiceNo: req.body.invoiceNo });
      if (existingInvoice) {
        return res.status(400).json({ error: 'Invoice number already exists' });
      }
    }

    // Create new invoice with clinic reference
    let clinicId;
    
    console.log('=== Clinic Assignment Logic ===');
    console.log('Checking user role:', req.user.role);
    
    if (req.user.role === 'clinic') {
      // Clinic admin uses their own ID
      clinicId = req.user.id;
      console.log('Clinic admin - using user ID as clinicId:', clinicId);
    } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // Nursing staff uses their assigned clinic
      console.log('Nurse detected - looking up nurse record');
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      
      console.log('Nurse found:', nurse ? 'Yes' : 'No');
      console.log('Nurse clinicId:', nurse?.clinicId);
      
      if (!nurse || !nurse.clinicId) {
        console.log('ERROR: Nurse not found or missing clinicId');
        return res.status(403).json({ 
          error: 'Access denied. Nurse clinic information not found. Please contact administrator to assign you to a clinic.',
          nurseInfo: {
            name: nurse?.fullName,
            email: nurse?.email,
            role: nurse?.role
          }
        });
      }
      
      clinicId = nurse.clinicId;
      console.log('Nurse clinicId assigned:', clinicId);
    } else if (req.user.role === 'doctor') {
      // Doctors use their assigned clinic (if any) or the provided clinicId
      console.log('Doctor detected - looking up doctor record');
      const Doctor = require('../models/Doctor');
      const doctor = await Doctor.findById(req.user.id);
      
      console.log('Doctor found:', doctor ? 'Yes' : 'No');
      console.log('Doctor clinicId:', doctor?.clinicId);
      
      if (doctor && doctor.clinicId) {
        clinicId = doctor.clinicId;
        console.log('Using doctor clinicId:', clinicId);
      } else {
        clinicId = req.body.clinicId;
        console.log('Using request body clinicId:', clinicId);
      }
    } else {
      // Super admin or other roles use provided clinicId
      clinicId = req.body.clinicId;
      console.log('Other role - using request body clinicId:', clinicId);
    }
    
    console.log('Final clinicId:', clinicId);
    
    if (!clinicId) {
      console.log('ERROR: No clinicId determined');
      return res.status(400).json({ 
        error: 'Clinic ID is required. Please ensure you are assigned to a clinic or provide a clinic ID.' 
      });
    }
    
    const invoiceData = {
      ...req.body,
      clinicId: clinicId
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

    // Record revenue for the clinic
    try {
      await Revenue.addRevenue(
        updatedInvoice.clinicId,
        updatedInvoice._id,
        updatedInvoice.total,
        'approved'
      );
      console.log(`✅ Revenue recorded for invoice ${updatedInvoice._id}: ₹${updatedInvoice.total}`);
    } catch (revenueError) {
      console.error('❌ Failed to record revenue:', revenueError);
      // Don't fail the invoice approval if revenue recording fails
    }

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
    if (!['Sent', 'Approved'].includes(invoice.status)) {
      return res.status(400).json({ 
        error: `Invoice cannot be rejected. Current status: ${invoice.status}` 
      });
    }

    // Track if we need to subtract revenue (if invoice was previously approved)
    const wasApproved = invoice.status === 'Approved';

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

    // Subtract revenue if invoice was previously approved
    if (wasApproved) {
      try {
        await Revenue.subtractRevenue(
          updatedInvoice.clinicId,
          updatedInvoice._id,
          updatedInvoice.total,
          'rejected'
        );
        console.log(`✅ Revenue subtracted for rejected invoice ${updatedInvoice._id}: ₹${updatedInvoice.total}`);
      } catch (revenueError) {
        console.error('❌ Failed to subtract revenue:', revenueError);
        // Don't fail the invoice rejection if revenue adjustment fails
      }
    }

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
    // Get user's clinic ID for filtering
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view revenue.' 
      });
    }

    // Get current month revenue from Revenue model
    const currentMonthData = await Revenue.getCurrentMonthRevenue(userClinicId);
    const previousMonthRevenue = await Revenue.getPreviousMonthRevenue(userClinicId);

    // Calculate percentage change
    let percentageChange = 0;
    if (previousMonthRevenue > 0) {
      percentageChange = ((currentMonthData.totalRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
    } else if (currentMonthData.totalRevenue > 0) {
      percentageChange = 100; // If no previous revenue but current revenue exists
    }

    res.json({
      currentMonthRevenue: currentMonthData.totalRevenue,
      previousMonthRevenue: previousMonthRevenue,
      percentageChange: Math.round(percentageChange * 10) / 10, // Round to 1 decimal place
      invoiceCount: currentMonthData.invoiceCount,
      month: currentMonthData.month
    });
  } catch (error) {
    console.error('Error fetching current month revenue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/invoices/stats/summary - Get invoice statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // Get user's clinic ID for filtering
    const userClinicId = await getUserClinicId(req.user);

    if (!userClinicId) {
      return res.status(403).json({ 
        error: 'Access denied. User must be associated with a clinic to view invoice statistics.' 
      });
    }

    // Get yearly revenue data from Revenue model
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Revenue.getYearlyRevenue(userClinicId, currentYear);

    // Calculate total revenue and invoice count from monthly data
    const totalRevenue = monthlyRevenue.reduce((sum, month) => sum + month.totalRevenue, 0);
    const totalInvoices = monthlyRevenue.reduce((sum, month) => sum + month.invoiceCount, 0);

    // Format monthly revenue for frontend compatibility
    const formattedMonthlyRevenue = monthlyRevenue.map(month => ({
      _id: month.month,
      total: month.totalRevenue,
      count: month.invoiceCount
    }));

    res.json({
      totalInvoices,
      totalRevenue,
      monthlyRevenue: formattedMonthlyRevenue
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
