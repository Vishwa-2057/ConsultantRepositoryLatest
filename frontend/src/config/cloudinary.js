// Cloudinary Configuration
// Replace these values with your actual Cloudinary settings

export const CLOUDINARY_CONFIG = {
  // Your Cloudinary cloud name (from backend .env file)
  CLOUD_NAME: 'dlpmrdcqp', // Your actual Cloudinary cloud name
  
  // Upload presets (create these in your Cloudinary dashboard)
  UPLOAD_PRESETS: {
    DOCTORS: 'ml_default', // Using default preset - change to 'doctor_profiles' after creating custom preset
    NURSES: 'ml_default',  // Using default preset - change to 'nurse_profiles' after creating custom preset
    PATIENTS: 'ml_default'
  },
  
  // Folder structure
  FOLDERS: {
    DOCTORS: 'doctors',
    NURSES: 'nurses', 
    PATIENTS: 'patients'
  }
};

// Utility function to upload images to Cloudinary
export const uploadToCloudinary = async (file, preset, folder) => {
  if (CLOUDINARY_CONFIG.CLOUD_NAME === 'your-cloud-name' || !CLOUDINARY_CONFIG.CLOUD_NAME) {
    throw new Error('Cloudinary configuration not set. Please update CLOUD_NAME in src/config/cloudinary.js');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Cloudinary upload error:', errorData);
    throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
};

/* 
SETUP INSTRUCTIONS:

1. Sign up for a free Cloudinary account at https://cloudinary.com/
2. Get your Cloud Name from the Cloudinary dashboard
3. Replace 'your-cloud-name' above with your actual cloud name
4. Create upload presets in your Cloudinary dashboard:
   - Go to Settings > Upload > Upload presets
   - Create presets: 'doctor_profiles', 'nurse_profiles', 'patient_profiles'
   - Set them as "Unsigned" for direct uploads from frontend
   - Configure folder settings if needed

5. Optional: Set up folder auto-creation in Cloudinary settings
*/
