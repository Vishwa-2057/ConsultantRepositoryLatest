/**
 * Emergency Script to Clear All Session Data
 * Run this in the browser console to clear all corrupted session data
 */

console.log('🚨 Starting emergency session data cleanup...');

// List of all possible session-related keys
const sessionKeys = [
  'authToken',
  'refreshToken', 
  'sessionData',
  'tokenExpiry',
  'sessionTimeout',
  'authUser',
  'loginMessage',
  // Legacy keys that might exist
  'token',
  'user',
  'session',
  'auth',
  'healthcare_session',
  'healthcare_token'
];

// Clear localStorage
sessionKeys.forEach(key => {
  if (localStorage.getItem(key)) {
    console.log(`Removing localStorage key: ${key}`);
    localStorage.removeItem(key);
  }
});

// Clear all localStorage items that might be encrypted session data
Object.keys(localStorage).forEach(key => {
  const value = localStorage.getItem(key);
  // Check if it looks like encrypted data (base64-like strings)
  if (value && value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value)) {
    console.log(`Removing potential encrypted data: ${key}`);
    localStorage.removeItem(key);
  }
});

// Clear sessionStorage
sessionStorage.clear();

console.log('🧹 Emergency cleanup completed!');
console.log('Please refresh the page to start with clean session data.');

// Optionally reload the page
// window.location.reload();
