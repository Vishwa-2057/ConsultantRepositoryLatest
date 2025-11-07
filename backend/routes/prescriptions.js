const express = require('express');
const { body, validationResult } = require('express-validator');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const auth = require('../middleware/auth');
const ActivityLogger = require('../utils/activityLogger');
const router = express.Router();

// Validation middleware
const validatePrescription = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('diagnosis').trim().isLength({ min: 1, max: 500 }).withMessage('Diagnosis is required and must be less than 500 characters'),
  body('medications').isArray({ min: 1 }).withMessage('At least one medication is required'),
  body('medications.*.name').trim().isLength({ min: 1 }).withMessage('Medication name is required'),
  body('medications.*.dosage').trim().isLength({ min: 1 }).withMessage('Medication dosage is required'),
  body('medications.*.frequency').trim().isLength({ min: 1 }).withMessage('Medication frequency is required'),
  body('medications.*.duration').trim().isLength({ min: 1 }).withMessage('Medication duration is required'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters'),
  body('followUpInstructions').optional().isLength({ max: 500 }).withMessage('Follow-up instructions cannot exceed 500 characters')
];

// GET /api/prescriptions - Get all prescriptions with pagination and filtering
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      patientId = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      // Find patients assigned to this doctor
      const assignedPatients = await Patient.find({ assignedDoctors: req.user.id }).select('_id');
      const assignedPatientIds = assignedPatients.map(patient => patient._id);
      
      // Show prescriptions where doctor is the prescribing doctor OR prescriptions for patients assigned to the doctor
      query.$or = [
        { doctorId: req.user.id },
        { patientId: { $in: assignedPatientIds } }
      ];
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    } else if (req.user.role === 'pharmacist' || req.user.role === 'head_pharmacist' || req.user.role === 'pharmacy_manager') {
      // Pharmacists only see prescriptions allotted to them
      query.allottedPharmacist = req.user.id;
      query.clinicId = req.user.clinicId;
    }
    
    if (patientId) {
      query.patientId = patientId;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const prescriptions = await Prescription.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('patientId', 'fullName age gender phone email')
      .populate('doctorId', 'fullName specialty')
      .select('-__v');

    // Apply search filter after population if needed
    let filteredPrescriptions = prescriptions;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filteredPrescriptions = prescriptions.filter(prescription => 
        searchRegex.test(prescription.prescriptionNumber) ||
        searchRegex.test(prescription.diagnosis) ||
        (prescription.patientId && searchRegex.test(prescription.patientId.fullName)) ||
        (prescription.doctorId && searchRegex.test(prescription.doctorId.fullName)) ||
        prescription.medications.some(med => searchRegex.test(med.name))
      );
    }

    // Get total count for pagination
    const total = await Prescription.countDocuments(query);

    res.json({
      prescriptions: filteredPrescriptions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPrescriptions: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prescriptions/:id - Get prescription by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // For doctors, we don't need additional filtering here since we're already looking at a specific prescription
    if (req.user.role === 'doctor') {
      const prescription = await Prescription.findById(req.params.id).select('patientId');
      if (prescription) {
        // Check if this patient is assigned to the doctor
        const isAssigned = await Patient.exists({ 
          _id: prescription.patientId, 
          assignedDoctors: req.user.id 
        });
        
        if (!isAssigned) {
          // If not assigned, only show prescriptions where this doctor is the prescribing doctor
          query.doctorId = req.user.id;
        }
        // If assigned, show the prescription regardless of who prescribed it
      } else {
        // If prescription not found, restrict to doctor's own prescriptions
        query.doctorId = req.user.id;
      }
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }
    
    const prescription = await Prescription.findOne(query)
      .populate('patientId', 'fullName age gender phone email address medicalHistory')
      .populate('doctorId', 'fullName specialty phone email')
      .select('-__v');
    
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    
    res.json(prescription);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid prescription ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/prescriptions - Create new prescription
router.post('/', auth, validatePrescription, async (req, res) => {
  try {
    // Only doctors can create prescriptions
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ 
        error: 'Access denied. Only doctors can create prescriptions.' 
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Verify patient exists and doctor has access
    const patient = await Patient.findById(req.body.patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Check if doctor is assigned to this patient
    if (!patient.assignedDoctors.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied. You are not assigned to this patient.' });
    }

    // Create new prescription
    const prescriptionData = {
      ...req.body,
      // Use the logged-in doctor's ID
      doctorId: req.user.id,
      clinicId: req.body.clinicId
    };

    const prescription = new Prescription(prescriptionData);
    await prescription.save();

    // Populate the saved prescription
    await prescription.populate('patientId', 'fullName age gender phone email');
    await prescription.populate('doctorId', 'fullName specialty');

    // Log prescription creation activity
    try {
      // Get current user details for logging
      let currentUser = null;
      if (req.user.role === 'clinic') {
        currentUser = await Clinic.findById(req.user.id);
      } else if (req.user.role === 'doctor') {
        currentUser = await Doctor.findById(req.user.id);
      }

      // Get clinic name for logging
      let clinicName = 'Unknown Clinic';
      if (prescription.clinicId) {
        const clinic = await Clinic.findById(prescription.clinicId);
        if (clinic) {
          clinicName = clinic.name || clinic.fullName || 'Unknown Clinic';
        }
      }

      const doctor = await Doctor.findById(prescription.doctorId);

      if (currentUser && doctor) {
        await ActivityLogger.logPrescriptionActivity(
          'prescription_created',
          prescription,
          patient,
          doctor,
          {
            id: req.user.id,
            fullName: currentUser.fullName || currentUser.name,
            email: currentUser.email,
            role: req.user.role
          },
          req,
          clinicName
        );
      }
    } catch (logError) {
      console.error('Failed to log prescription creation:', logError);
      // Don't fail the prescription creation if logging fails
    }

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription: prescription.toJSON()
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/prescriptions/:id - Update prescription
router.put('/:id', auth, validatePrescription, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const query = { _id: req.params.id };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    // Check if prescription exists
    const prescription = await Prescription.findOne(query);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Update prescription
    const updatedPrescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
    .populate('patientId', 'fullName age gender phone email')
    .populate('doctorId', 'fullName specialty')
    .select('-__v');

    res.json({
      message: 'Prescription updated successfully',
      prescription: updatedPrescription
    });
  } catch (error) {
    console.error('Error updating prescription:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid prescription ID' });
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

// PATCH /api/prescriptions/:id/status - Update prescription status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['Active', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const query = { _id: req.params.id };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    } else if (['nurse', 'head_nurse', 'supervisor'].includes(req.user.role)) {
      // For nursing roles, get the nurse's clinic and filter by clinicId
      const Nurse = require('../models/Nurse');
      const nurse = await Nurse.findById(req.user.id);
      console.log('Nurse lookup result:', nurse);
      console.log('Nurse clinicId:', nurse?.clinicId);
      
      if (nurse && nurse.clinicId) {
        query.clinicId = nurse.clinicId;
      } else {
        console.error('Nurse clinic info missing:', { nurseId: req.user.id, nurse: nurse });
        return res.status(403).json({ 
          error: 'Access denied. Nurse clinic information not found.',
          debug: { nurseFound: !!nurse, hasClinicId: !!(nurse?.clinicId) }
        });
      }
    }

    const prescription = await Prescription.findOne(query);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    prescription.status = status;
    prescription.updatedAt = new Date();
    await prescription.save();

    res.json({
      message: 'Prescription status updated successfully',
      prescription: prescription.toJSON()
    });
  } catch (error) {
    console.error('Error updating prescription status:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid prescription ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/prescriptions/:id - Delete prescription
router.delete('/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      query.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const prescription = await Prescription.findOne(query);
    
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    await Prescription.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid prescription ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prescriptions/stats/summary - Get prescription statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // Build base query for role-based filtering
    const baseQuery = {};
    if (req.user.role === 'doctor') {
      baseQuery.doctorId = req.user.id;
    } else if (req.user.role === 'clinic') {
      baseQuery.clinicId = req.user.id;
    } else if (req.user.role === 'pharmacist' || req.user.role === 'head_pharmacist' || req.user.role === 'pharmacy_manager') {
      // Pharmacists only see prescriptions allotted to them
      baseQuery.allottedPharmacist = req.user.id;
      baseQuery.clinicId = req.user.clinicId;
    }
    
    const totalPrescriptions = await Prescription.countDocuments(baseQuery);
    const activePrescriptions = await Prescription.countDocuments({ ...baseQuery, status: 'Active' });
    const completedPrescriptions = await Prescription.countDocuments({ ...baseQuery, status: 'Completed' });
    const cancelledPrescriptions = await Prescription.countDocuments({ ...baseQuery, status: 'Cancelled' });
    
    // Get recent prescriptions
    const recentPrescriptions = await Prescription.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patientId', 'fullName')
      .populate('doctorId', 'fullName')
      .select('prescriptionNumber diagnosis status createdAt medications');

    res.json({
      totalPrescriptions,
      activePrescriptions,
      completedPrescriptions,
      cancelledPrescriptions,
      recentPrescriptions
    });
  } catch (error) {
    console.error('Error fetching prescription stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/prescriptions/patient/:patientId - Get prescriptions for a specific patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const query = { patientId };
    
    // Role-based filtering
    if (req.user.role === 'doctor') {
      // Check if this patient is assigned to the doctor
      const isAssigned = await Patient.exists({ 
        _id: patientId, 
        assignedDoctors: req.user.id 
      });
      
      if (!isAssigned) {
        // If not assigned, only show prescriptions where this doctor is the prescribing doctor
        query.doctorId = req.user.id;
      }
      // If assigned, show all prescriptions for this patient regardless of who prescribed them
    } else if (req.user.role === 'clinic') {
      query.clinicId = req.user.id;
    }

    const prescriptions = await Prescription.find(query)
      .sort({ createdAt: -1 })
      .populate('doctorId', 'fullName specialty')
      .select('-__v');

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/prescriptions/:id/allot - Allot prescription to pharmacist
router.patch('/:id/allot', auth, async (req, res) => {
  try {
    const { pharmacistId } = req.body;
    
    // Only clinic admins can allot prescriptions
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ 
        success: false,
        error: 'Only clinic administrators can allot prescriptions to pharmacists' 
      });
    }
    
    if (!pharmacistId) {
      return res.status(400).json({ 
        success: false,
        error: 'Pharmacist ID is required' 
      });
    }
    
    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.user.id },
      { 
        allottedPharmacist: pharmacistId,
        allottedAt: new Date()
      },
      { new: true }
    )
    .populate('patientId', 'fullName')
    .populate('doctorId', 'fullName')
    .populate('allottedPharmacist', 'fullName email');
    
    if (!prescription) {
      return res.status(404).json({ 
        success: false,
        error: 'Prescription not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Prescription allotted successfully',
      data: prescription
    });
  } catch (error) {
    console.error('Error allotting prescription:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// POST /api/prescriptions/:id/dispense - Dispense medication from inventory
router.post('/:id/dispense', auth, async (req, res) => {
  try {
    const { medicationIndex, inventoryId, quantity, notes } = req.body;
    
    // Only pharmacists can dispense medications
    if (!['pharmacist', 'head_pharmacist', 'pharmacy_manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Only pharmacists can dispense medications' 
      });
    }
    
    // Validate required fields
    if (medicationIndex === undefined || !inventoryId || !quantity) {
      return res.status(400).json({ 
        success: false,
        error: 'Medication index, inventory ID, and quantity are required' 
      });
    }
    
    // Find prescription
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      allottedPharmacist: req.user.id
    });
    
    if (!prescription) {
      return res.status(404).json({ 
        success: false,
        error: 'Prescription not found or not allotted to you' 
      });
    }
    
    // Check if medication index is valid
    if (medicationIndex < 0 || medicationIndex >= prescription.medications.length) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid medication index' 
      });
    }
    
    // Check if medication is already dispensed
    if (prescription.medications[medicationIndex].dispensed) {
      return res.status(400).json({ 
        success: false,
        error: 'This medication has already been dispensed' 
      });
    }
    
    // Find inventory item
    const Inventory = require('../models/Inventory');
    const inventoryItem = await Inventory.findOne({
      _id: inventoryId,
      clinicId: req.user.clinicId,
      isActive: true
    });
    
    if (!inventoryItem) {
      return res.status(404).json({ 
        success: false,
        error: 'Inventory item not found' 
      });
    }
    
    // Check if inventory has enough stock
    if (inventoryItem.quantity < quantity) {
      return res.status(400).json({ 
        success: false,
        error: `Insufficient stock. Available: ${inventoryItem.quantity}, Required: ${quantity}` 
      });
    }
    
    // Check if inventory item is expired
    if (inventoryItem.expiryDate < new Date()) {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot dispense expired medication' 
      });
    }
    
    // Update inventory stock
    inventoryItem.quantity -= quantity;
    await inventoryItem.save();
    
    // Update prescription medication
    prescription.medications[medicationIndex].dispensed = true;
    prescription.medications[medicationIndex].dispensedInventoryId = inventoryId;
    prescription.medications[medicationIndex].dispensedQuantity = quantity;
    prescription.medications[medicationIndex].dispensedBy = req.user.id;
    prescription.medications[medicationIndex].dispensedAt = new Date();
    
    // Add dispensing notes if provided
    if (notes) {
      prescription.dispensingNotes = prescription.dispensingNotes 
        ? `${prescription.dispensingNotes}\n${notes}` 
        : notes;
    }
    
    // Check if all medications are dispensed
    const allDispensed = prescription.medications.every(med => med.dispensed);
    if (allDispensed) {
      prescription.fullyDispensed = true;
      prescription.status = 'Completed';
    }
    
    prescription.updatedAt = new Date();
    await prescription.save();
    
    // Populate the prescription for response
    await prescription.populate('patientId', 'fullName uhid');
    await prescription.populate('doctorId', 'fullName');
    await prescription.populate('medications.dispensedInventoryId', 'medicationName batchNumber');
    
    res.json({
      success: true,
      message: 'Medication dispensed successfully',
      data: {
        prescription,
        inventoryUpdated: {
          id: inventoryItem._id,
          medicationName: inventoryItem.medicationName,
          remainingStock: inventoryItem.quantity
        }
      }
    });
  } catch (error) {
    console.error('Error dispensing medication:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// GET /api/prescriptions/:id/matching-inventory - Get matching inventory items for prescription medications
router.get('/:id/matching-inventory', auth, async (req, res) => {
  try {
    // Only pharmacists can access this
    if (!['pharmacist', 'head_pharmacist', 'pharmacy_manager'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        error: 'Only pharmacists can access inventory matching' 
      });
    }
    
    // Find prescription
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      allottedPharmacist: req.user.id
    });
    
    if (!prescription) {
      return res.status(404).json({ 
        success: false,
        error: 'Prescription not found or not allotted to you' 
      });
    }
    
    // Find matching inventory items for each medication
    const Inventory = require('../models/Inventory');
    const matchingInventory = [];
    
    for (let i = 0; i < prescription.medications.length; i++) {
      const medication = prescription.medications[i];
      
      // Skip if already dispensed
      if (medication.dispensed) {
        matchingInventory.push({
          medicationIndex: i,
          medicationName: medication.name,
          dispensed: true,
          matches: []
        });
        continue;
      }
      
      // Search for matching inventory items
      const matches = await Inventory.find({
        clinicId: req.user.clinicId,
        isActive: true,
        quantity: { $gt: 0 },
        expiryDate: { $gte: new Date() },
        $or: [
          { medicationName: { $regex: medication.name, $options: 'i' } },
          { genericName: { $regex: medication.name, $options: 'i' } }
        ]
      })
      .select('medicationName genericName batchNumber strength quantity expiryDate unitPrice sellingPrice category')
      .sort({ expiryDate: 1 }) // Sort by expiry date (FIFO)
      .limit(10);
      
      matchingInventory.push({
        medicationIndex: i,
        medicationName: medication.name,
        dosage: medication.dosage,
        dispensed: false,
        matches: matches
      });
    }
    
    res.json({
      success: true,
      data: matchingInventory
    });
  } catch (error) {
    console.error('Error finding matching inventory:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
