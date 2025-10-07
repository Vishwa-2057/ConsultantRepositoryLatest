import { config } from '@/config/env';

/**
 * Get the full URL for an image, handling both relative and absolute URLs
 * @param {string} imagePath - The image path from the database
 * @returns {string} - The full URL for the image
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL (starts with http), return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // For relative paths, prepend the backend base URL
  const baseUrl = config.API_BASE_URL.replace('/api', '');
  return `${baseUrl}${imagePath}`;
};

export default getImageUrl;
