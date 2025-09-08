// Environment configuration
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'Healthcare Management System',
  NODE_ENV: import.meta.env.MODE || 'development',
};

export default config;
