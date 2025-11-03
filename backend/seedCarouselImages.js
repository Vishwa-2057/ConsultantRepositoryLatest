const mongoose = require('mongoose');
const CarouselImage = require('./models/CarouselImage');
const { cloudinary } = require('./config/cloudinary');
const path = require('path');
require('dotenv').config();

// Default carousel images data with local paths
const defaultImages = [
  {
    localPath: path.join(__dirname, '../frontend/src/assets/Images/labphoto1.jpg'),
    caption: 'State-of-the-Art Laboratory',
    description: 'Advanced diagnostic equipment for accurate results',
    order: 0
  },
  {
    localPath: path.join(__dirname, '../frontend/src/assets/Images/labphoto2.jpg'),
    caption: 'Research & Development',
    description: 'Cutting-edge research for better healthcare solutions',
    order: 1
  },
  {
    localPath: path.join(__dirname, '../frontend/src/assets/Images/labphoto3.jpg'),
    caption: 'Digital Healthcare',
    description: 'Innovative technology improving patient care',
    order: 2
  }
];

async function uploadToCloudinary(localPath, folder) {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder: folder,
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });
    return {
      imageUrl: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error(`Error uploading ${localPath}:`, error);
    throw error;
  }
}

async function seedCarouselImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all clinics
    const Clinic = require('./models/Clinic');
    const clinics = await Clinic.find({});
    
    if (clinics.length === 0) {
      console.log('⚠️  No clinics found in database');
      process.exit(0);
    }

    console.log(`Found ${clinics.length} clinic(s)`);

    // Seed images for each clinic
    for (const clinic of clinics) {
      // Check if clinic already has carousel images
      const existingImages = await CarouselImage.find({ clinicId: clinic._id });
      
      if (existingImages.length > 0) {
        console.log(`ℹ️  Clinic "${clinic.clinicName}" already has ${existingImages.length} carousel image(s), skipping...`);
        continue;
      }

      console.log(`\n📤 Uploading default images for clinic "${clinic.clinicName}"...`);

      // Upload images to Cloudinary and create database entries
      const imagesToInsert = [];
      
      for (const img of defaultImages) {
        try {
          console.log(`  Uploading ${path.basename(img.localPath)}...`);
          const { imageUrl, publicId } = await uploadToCloudinary(
            img.localPath, 
            `healthcare/carousel/${clinic._id}`
          );
          
          imagesToInsert.push({
            clinicId: clinic._id,
            imageUrl,
            publicId,
            caption: img.caption,
            description: img.description,
            order: img.order,
            isActive: true
          });
          
          console.log(`  ✅ Uploaded successfully`);
        } catch (error) {
          console.error(`  ❌ Failed to upload ${path.basename(img.localPath)}`);
        }
      }

      if (imagesToInsert.length > 0) {
        await CarouselImage.insertMany(imagesToInsert);
        console.log(`✅ Added ${imagesToInsert.length} default carousel images for clinic "${clinic.clinicName}"`);
      }
    }

    console.log('\n🎉 Carousel images seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding carousel images:', error);
    process.exit(1);
  }
}

// Run the seeding
seedCarouselImages();
