// Environment configuration
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.MODE === 'production' 
      ? 'https://consultantrepository.onrender.com/api' 
      : 'http://localhost:5000/api'),
  SIGNALING_SERVER_URL: import.meta.env.VITE_SIGNALING_SERVER_URL ||
    (import.meta.env.MODE === 'production'
      ? 'https://consultantrepository.onrender.com'
      : 'http://localhost:3001'),
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'Healthcare Management System',
  NODE_ENV: import.meta.env.MODE || 'development',
};

export default config;
