const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  medicationName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  genericName: {
    type: String,
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  batchNumber: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Tablet',
      'Capsule',
      'Syrup',
      'Injection',
      'Ointment',
      'Drops',
      'Inhaler',
      'Cream',
      'Gel',
      'Powder',
      'Other'
    ],
    default: 'Tablet'
  },
  strength: {
    type: String,
    required: true,
    trim: true // e.g., "500mg", "10ml"
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  reorderLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  manufacturingDate: {
    type: Date
  },
  location: {
    type: String,
    trim: true // Shelf/rack location
  },
  description: {
    type: String,
    trim: true
  },
  prescriptionRequired: {
    type: Boolean,
    default: true
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacist',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
inventorySchema.index({ medicationName: 1, clinicId: 1 });
inventorySchema.index({ expiryDate: 1 });
inventorySchema.index({ quantity: 1 });

// Virtual for checking if stock is low
inventorySchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.reorderLevel;
});

// Virtual for checking if expired or expiring soon (within 30 days)
inventorySchema.virtual('isExpiringSoon').get(function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expiryDate <= thirtyDaysFromNow;
});

inventorySchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date();
});

// Ensure virtuals are included in JSON
inventorySchema.set('toJSON', { virtuals: true });
inventorySchema.set('toObject', { virtuals: true });

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
