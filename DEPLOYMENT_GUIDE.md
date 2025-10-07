# Deployment Guide

## Overview
This guide covers the deployment configuration for the Healthcare Management System with:
- **Backend**: Deployed on Render at `https://consultantrepository.onrender.com`
- **Frontend**: Deployed on Netlify at `https://spontaneous-cheesecake-d2f6e1.netlify.app`

## Files Created/Modified

### Frontend Configuration Files

1. **`.env.production`** - Production environment variables
   ```
   VITE_API_BASE_URL=https://consultantrepository.onrender.com/api
   VITE_SIGNALING_SERVER_URL=https://consultantrepository.onrender.com
   VITE_APP_TITLE=Healthcare Management System
   ```

2. **`.env.development`** - Development environment variables
   ```
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_SIGNALING_SERVER_URL=http://localhost:3001
   VITE_APP_TITLE=Healthcare Management System
   ```

3. **`public/_redirects`** - Netlify SPA routing
   ```
   /*    /index.html   200
   ```

4. **`netlify.toml`** - Netlify build configuration
   - Sets build command and publish directory
   - Configures caching headers
   - Sets up redirects for SPA

### Backend Configuration

5. **Updated `server.js`** - Added CORS configuration for Netlify domain
   ```javascript
   'https://spontaneous-cheesecake-d2f6e1.netlify.app'
   ```

### Code Updates

6. **`src/config/env.js`** - Enhanced environment configuration
   - Added production/development URL switching
   - Added signaling server URL configuration

7. **`src/utils/imageUtils.js`** - New utility for handling image URLs
   - Handles both relative and absolute image paths
   - Uses environment configuration for base URLs

8. **Updated Components** - Fixed hardcoded URLs in:
   - `PatientManagement.jsx`
   - `PatientDetails.jsx` 
   - `NursesManagement.jsx`
   - `DoctorsManagement.jsx`
   - `VideoCallModal.jsx`
   - `ConnectionTest.jsx`
   - `APITest.jsx`

## Deployment Steps

### Backend (Render)
1. Backend is already deployed at `https://consultantrepository.onrender.com`
2. Ensure environment variables are set in Render dashboard
3. CORS has been configured to allow the Netlify domain

### Frontend (Netlify)
1. Frontend is already deployed at `https://spontaneous-cheesecake-d2f6e1.netlify.app`
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables are automatically loaded from `.env.production`

## Environment Variables

### Production (Netlify)
- `VITE_API_BASE_URL`: Points to Render backend
- `VITE_SIGNALING_SERVER_URL`: Points to Render signaling server
- `VITE_APP_TITLE`: Application title

### Development (Local)
- `VITE_API_BASE_URL`: Points to localhost:5000
- `VITE_SIGNALING_SERVER_URL`: Points to localhost:3001
- `VITE_APP_TITLE`: Application title

## Key Features Configured

1. **API Communication**: Frontend now correctly connects to production backend
2. **Image Handling**: Profile images work with both local and production URLs
3. **SPA Routing**: Netlify redirects configured for React Router
4. **CORS**: Backend allows requests from Netlify domain
5. **WebSocket/Video Calls**: Signaling server configuration for production
6. **Environment Switching**: Automatic URL switching based on build mode

## Testing

1. **API Connectivity**: Use the ConnectionTest component to verify backend connection
2. **Image Loading**: Check that profile images load correctly
3. **Routing**: Verify that direct URL access works (e.g., `/patients/123`)
4. **Video Calls**: Test WebRTC functionality if signaling server is deployed

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure Netlify domain is in backend's allowed origins
2. **API Not Found**: Check that `VITE_API_BASE_URL` is correct
3. **Images Not Loading**: Verify image URLs and CORS configuration
4. **Routing Issues**: Ensure `_redirects` file is in `public/` directory
5. **Build Failures**: Check that all environment variables are set

### Debug Tools

- Use the ConnectionTest component in the app
- Check browser developer tools for network errors
- Verify environment variables in build logs

## Next Steps

1. **SSL Certificate**: Ensure both domains have valid SSL certificates
2. **Custom Domain**: Consider setting up custom domains for both services
3. **Environment Secrets**: Store sensitive data in environment variables
4. **Monitoring**: Set up monitoring for both frontend and backend
5. **CDN**: Consider using a CDN for static assets

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify network requests in developer tools
3. Test API endpoints directly
4. Check deployment logs on both platforms
