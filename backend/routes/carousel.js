const express = require('express');
const router = express.Router();
const { carouselUpload, deleteFromCloudinary } = require('../config/cloudinary');
const auth = require('../middleware/auth');
const CarouselImage = require('../models/CarouselImage');

// Get all carousel images for a clinic
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.role === 'clinic' ? req.user.id : req.user.clinicId;
    
    if (!clinicId) {
      return res.status(400).json({ message: 'Clinic ID not found' });
    }

    const images = await CarouselImage.find({ clinicId, isActive: true })
      .sort({ order: 1 })
      .lean();

    res.status(200).json({
      success: true,
      images: images.map(img => ({
        id: img._id,
        src: img.imageUrl,
        alt: img.caption || 'Carousel Image',
        caption: img.caption,
        description: img.description,
        order: img.order
      }))
    });
  } catch (error) {
    console.error('Error fetching carousel images:', error);
    res.status(500).json({ message: 'Failed to fetch carousel images', error: error.message });
  }
});

// Upload and save carousel image - Only for clinic admins
router.post('/upload', auth, carouselUpload.single('image'), async (req, res) => {
  try {
    // Check if user is clinic admin
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ message: 'Only clinic admins can upload carousel images' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { caption, description } = req.body;

    // Get the highest order number
    const lastImage = await CarouselImage.findOne({ clinicId: req.user.id })
      .sort({ order: -1 })
      .lean();
    
    const nextOrder = lastImage ? lastImage.order + 1 : 0;

    // Save to database
    const carouselImage = new CarouselImage({
      clinicId: req.user.id,
      imageUrl: req.file.path,
      publicId: req.file.filename,
      caption: caption || '',
      description: description || '',
      order: nextOrder
    });

    await carouselImage.save();

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
        id: carouselImage._id,
        src: carouselImage.imageUrl,
        alt: carouselImage.caption || 'Carousel Image',
        caption: carouselImage.caption,
        description: carouselImage.description,
        order: carouselImage.order
      }
    });
  } catch (error) {
    console.error('Error uploading carousel image:', error);
    res.status(500).json({ message: 'Failed to upload image', error: error.message });
  }
});

// Update carousel image caption/description - Only for clinic admins
router.patch('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ message: 'Only clinic admins can update carousel images' });
    }

    const { caption, description } = req.body;

    const image = await CarouselImage.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.user.id },
      { caption, description },
      { new: true }
    );

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      image: {
        id: image._id,
        src: image.imageUrl,
        alt: image.caption || 'Carousel Image',
        caption: image.caption,
        description: image.description,
        order: image.order
      }
    });
  } catch (error) {
    console.error('Error updating carousel image:', error);
    res.status(500).json({ message: 'Failed to update image', error: error.message });
  }
});

// Delete carousel image - Only for clinic admins
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'clinic') {
      return res.status(403).json({ message: 'Only clinic admins can delete carousel images' });
    }

    const image = await CarouselImage.findOne({ _id: req.params.id, clinicId: req.user.id });

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(image.publicId);
    } catch (cloudinaryError) {
      console.error('Error deleting from Cloudinary:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await CarouselImage.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting carousel image:', error);
    res.status(500).json({ message: 'Failed to delete image', error: error.message });
  }
});

module.exports = router;
