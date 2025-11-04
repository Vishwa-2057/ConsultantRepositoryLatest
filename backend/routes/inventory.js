const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');
const { body, validationResult, param } = require('express-validator');

// Get all inventory items with pagination and filters
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category, lowStock, expiring, expired } = req.query;
    const clinicId = req.user.clinicId;

    // Build query
    const query = { clinicId, isActive: true };

    // Search filter
    if (search) {
      query.$or = [
        { medicationName: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { batchNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Low stock filter
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$reorderLevel'] };
    }

    // Expiring soon filter (within 30 days)
    if (expiring === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query.expiryDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
    }

    // Expired filter
    if (expired === 'true') {
      query.expiryDate = { $lt: new Date() };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Inventory.find(query)
        .populate('addedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Inventory.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory items',
      error: error.message
    });
  }
});

// Get inventory statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId;

    const [
      totalItems,
      lowStockItems,
      expiringItems,
      expiredItems,
      totalValue
    ] = await Promise.all([
      Inventory.countDocuments({ clinicId, isActive: true }),
      Inventory.countDocuments({
        clinicId,
        isActive: true,
        $expr: { $lte: ['$quantity', '$reorderLevel'] }
      }),
      Inventory.countDocuments({
        clinicId,
        isActive: true,
        expiryDate: {
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          $gte: new Date()
        }
      }),
      Inventory.countDocuments({
        clinicId,
        isActive: true,
        expiryDate: { $lt: new Date() }
      }),
      Inventory.aggregate([
        { $match: { clinicId, isActive: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        lowStockItems,
        expiringItems,
        expiredItems,
        totalValue: totalValue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory statistics',
      error: error.message
    });
  }
});

// Get single inventory item
router.get('/:id', auth, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const item = await Inventory.findOne({
      _id: req.params.id,
      clinicId: req.user.clinicId
    }).populate('addedBy', 'fullName email');

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory item',
      error: error.message
    });
  }
});

// Create new inventory item
router.post('/',
  auth,
  [
    body('medicationName').trim().notEmpty().withMessage('Medication name is required'),
    body('batchNumber').trim().notEmpty().withMessage('Batch number is required'),
    body('strength').trim().notEmpty().withMessage('Strength is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive number'),
    body('reorderLevel').isInt({ min: 0 }).withMessage('Reorder level must be a positive number'),
    body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
    body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
    body('category').optional().isIn(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'Cream', 'Gel', 'Powder', 'Other'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const itemData = {
        ...req.body,
        clinicId: req.user.clinicId,
        addedBy: req.user._id
      };

      const item = new Inventory(itemData);
      await item.save();

      await item.populate('addedBy', 'fullName email');

      res.status(201).json({
        success: true,
        message: 'Inventory item added successfully',
        data: item
      });
    } catch (error) {
      console.error('Error creating inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create inventory item',
        error: error.message
      });
    }
  }
);

// Update inventory item
router.put('/:id',
  auth,
  param('id').isMongoId(),
  [
    body('medicationName').optional().trim().notEmpty(),
    body('quantity').optional().isInt({ min: 0 }),
    body('reorderLevel').optional().isInt({ min: 0 }),
    body('unitPrice').optional().isFloat({ min: 0 }),
    body('sellingPrice').optional().isFloat({ min: 0 }),
    body('expiryDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const item = await Inventory.findOneAndUpdate(
        { _id: req.params.id, clinicId: req.user.clinicId },
        { $set: req.body },
        { new: true, runValidators: true }
      ).populate('addedBy', 'fullName email');

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      res.json({
        success: true,
        message: 'Inventory item updated successfully',
        data: item
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory item',
        error: error.message
      });
    }
  }
);

// Update stock quantity (for quick stock adjustments)
router.patch('/:id/stock',
  auth,
  param('id').isMongoId(),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive number'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const item = await Inventory.findOneAndUpdate(
        { _id: req.params.id, clinicId: req.user.clinicId },
        { $set: { quantity: req.body.quantity } },
        { new: true }
      ).populate('addedBy', 'fullName email');

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      res.json({
        success: true,
        message: 'Stock quantity updated successfully',
        data: item
      });
    } catch (error) {
      console.error('Error updating stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock quantity',
        error: error.message
      });
    }
  }
);

// Delete inventory item (soft delete)
router.delete('/:id', auth, param('id').isMongoId(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const item = await Inventory.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.user.clinicId },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inventory item',
      error: error.message
    });
  }
});

module.exports = router;
