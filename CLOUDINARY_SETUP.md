# Cloudinary Integration Setup Guide

## Overview
This guide will help you migrate from local file storage (Multer) to Cloudinary for image and document uploads in the Healthcare Consultant System.

## Prerequisites
1. Cloudinary account (free tier available)
2. Node.js and npm installed
3. Existing Healthcare Consultant System

## Step 1: Install Required Packages

```bash
cd backend
npm install cloudinary multer-storage-cloudinary
```

## Step 2: Get Cloudinary Credentials

1. Sign up at [Cloudinary](https://cloudinary.com/) if you haven't already
2. Go to your Cloudinary Dashboard
3. Copy the following credentials:
   - Cloud Name
   - API Key
   - API Secret

## Step 3: Update Environment Variables

Add the following to your `.env` file in the backend directory:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

**Important**: Replace the placeholder values with your actual Cloudinary credentials.

## Step 4: Verify Configuration Files

The following files have been created/updated:

### New Files:
- `backend/config/cloudinary.js` - Cloudinary configuration and upload middleware

### Updated Files:
- `backend/routes/doctors.js` - Uses Cloudinary for doctor profile images
- `backend/routes/nurses.js` - Uses Cloudinary for nurse profile images  
- `backend/routes/patients.js` - Uses Cloudinary for patient images and documents
- `backend/.env` - Added Cloudinary environment variables

## Step 5: Folder Structure in Cloudinary

The system will automatically create the following folder structure in your Cloudinary account:

```
healthcare/
├── doctors/           # Doctor profile images
├── nurses/            # Nurse profile images
├── patients/          # Patient profile images
└── patient-documents/ # Patient government documents (images & PDFs)
```

## Step 6: Features Included

### Image Optimization
- Automatic image compression
- Format optimization (WebP when supported)
- Size limiting (max 1000x1000px for profiles)
- Quality optimization

### File Type Support
- **Profile Images**: JPG, JPEG, PNG, GIF, WebP
- **Patient Documents**: JPG, JPEG, PNG, PDF

### Security Features
- File type validation
- Size limits (5MB for images, 10MB for documents)
- Secure URL generation
- Automatic cleanup on failed uploads

### Upload Configurations

#### Doctor Images
- Folder: `healthcare/doctors`
- Max size: 5MB
- Formats: Image files only
- Transformations: Auto-optimization

#### Nurse Images  
- Folder: `healthcare/nurses`
- Max size: 5MB
- Formats: Image files only
- Transformations: Auto-optimization

#### Patient Images
- Folder: `healthcare/patients`
- Max size: 5MB (images), 10MB (documents)
- Formats: Images + PDF for documents
- Transformations: Auto-optimization

## Step 7: Testing the Integration

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Test image uploads through your frontend:
   - Create a new doctor with profile image
   - Create a new nurse with profile image
   - Create a new patient with profile image and government document

3. Verify in Cloudinary Dashboard:
   - Check that files appear in the correct folders
   - Verify transformations are applied
   - Check file URLs are accessible

## Step 8: Migration from Local Files (Optional)

If you have existing local files that need to be migrated to Cloudinary:

1. Create a migration script to upload existing files
2. Update database records with new Cloudinary URLs
3. Remove old local files after successful migration

## Benefits of Cloudinary Integration

### Performance
- ✅ Global CDN delivery
- ✅ Automatic image optimization
- ✅ Faster load times
- ✅ Reduced server storage

### Scalability
- ✅ Unlimited storage (based on plan)
- ✅ No server disk space concerns
- ✅ Automatic backups
- ✅ Global availability

### Features
- ✅ Image transformations on-the-fly
- ✅ Format optimization
- ✅ Quality adjustment
- ✅ Responsive images

### Security
- ✅ Secure URLs
- ✅ Access control
- ✅ File validation
- ✅ Automatic cleanup

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Verify your Cloudinary credentials in `.env`
   - Ensure no extra spaces in environment variables

2. **"Upload failed" error**
   - Check file size limits
   - Verify file type is supported
   - Check network connectivity

3. **Images not displaying**
   - Verify Cloudinary URLs are correct
   - Check CORS settings if needed
   - Ensure images are publicly accessible

### Debug Mode

To enable debug logging, add this to your Cloudinary config:

```javascript
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  // Add debug logging
  logging: true
});
```

## Support

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Node.js SDK Guide](https://cloudinary.com/documentation/node_integration)
- [Multer Storage Cloudinary](https://github.com/affanshahid/multer-storage-cloudinary)

## Next Steps

1. Set up your Cloudinary account
2. Add your credentials to `.env`
3. Install the required packages
4. Test the upload functionality
5. Monitor usage in Cloudinary dashboard

Your Healthcare Consultant System is now ready to use Cloudinary for all image and document uploads!
