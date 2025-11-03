const mongoose = require('mongoose');

const carouselImageSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
carouselImageSchema.index({ clinicId: 1, order: 1 });

module.exports = mongoose.model('CarouselImage', carouselImageSchema);
