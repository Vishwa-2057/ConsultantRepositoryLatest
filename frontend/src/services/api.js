import { config } from '../config/env.js';

const API_BASE_URL = config.API_BASE_URL;
let authToken = null;

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    },
    ...options,
  };

  // Add debugging
  console.log('Making API request to:', url);
  console.log('Request options:', defaultOptions);

  try {
    const response = await fetch(url, defaultOptions);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let message = `HTTP error! status: ${response.status}`;
      if (errorData) {
        const backendMsg = errorData.message || errorData.error;
        const details = Array.isArray(errorData.details)
          ? errorData.details.map(d => d.msg || d).join('; ')
          : (typeof errorData.details === 'string' ? errorData.details : undefined);
        message = [backendMsg, details].filter(Boolean).join(' - ') || message;
      }
      const error = new Error(message);
      error.response = response;
      error.data = errorData;
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', {
      url,
      error: error.message,
      stack: error.stack,
      type: error.name
    });
    
    // Provide more specific error messages
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to ${url}. Please check if the backend server is running.`);
    }
    
    throw error;
  }
};

// Patient API functions
export const patientAPI = {
  // Get all patients with optional pagination and filters
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/patients?${queryParams}`);
  },

  // Get patient by ID
  getById: async (id) => {
    return apiRequest(`/patients/${id}`);
  },

  // Create new patient
  create: async (patientData) => {
    return apiRequest('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  },

  // Update patient
  update: async (id, patientData) => {
    return apiRequest(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patientData),
    });
  },

  // Delete patient
  delete: async (id) => {
    return apiRequest(`/patients/${id}`, {
      method: 'DELETE',
    });
  },

  // Get patient statistics
  getStats: async () => {
    return apiRequest('/patients/stats');
  },

  // Quick search patients
  search: async (query) => {
    return apiRequest(`/patients/search?q=${encodeURIComponent(query)}`);
  },
};

// Appointment API functions
export const appointmentAPI = {
  // Get all appointments with optional pagination and filters
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/appointments?${queryParams}`);
  },

  // Get appointment by ID
  getById: async (id) => {
    return apiRequest(`/appointments/${id}`);
  },

  // Create new appointment
  create: async (appointmentData) => {
    return apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  },

  // Update appointment
  update: async (id, appointmentData) => {
    return apiRequest(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
  },

  // Delete appointment
  delete: async (id) => {
    return apiRequest(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },

  // Get today's appointments
  getToday: async () => {
    return apiRequest('/appointments/today');
  },

  // Get upcoming appointments
  getUpcoming: async () => {
    return apiRequest('/appointments/upcoming');
  },

  // Get appointment statistics
  getStats: async () => {
    return apiRequest('/appointments/stats');
  },
};

// Consultation API functions
export const consultationAPI = {
  // Get all consultations
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/consultations?${queryParams}`);
  },

  // Get consultation by ID
  getById: async (id) => {
    return apiRequest(`/consultations/${id}`);
  },

  // Create new consultation
  create: async (consultationData) => {
    return apiRequest('/consultations', {
      method: 'POST',
      body: JSON.stringify(consultationData),
    });
  },

  // Update consultation
  update: async (id, consultationData) => {
    return apiRequest(`/consultations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(consultationData),
    });
  },

  // Delete consultation
  delete: async (id) => {
    return apiRequest(`/consultations/${id}`, {
      method: 'DELETE',
    });
  },

  // Get consultation statistics
  getStats: async () => {
    return apiRequest('/consultations/stats');
  },
};

// Referral API functions
export const referralAPI = {
  // Get all referrals
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/referrals?${queryParams}`);
  },

  // Get referral by ID
  getById: async (id) => {
    return apiRequest(`/referrals/${id}`);
  },

  // Create new referral
  create: async (referralData) => {
    return apiRequest('/referrals', {
      method: 'POST',
      body: JSON.stringify(referralData),
    });
  },

  // Update referral
  update: async (id, referralData) => {
    return apiRequest(`/referrals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(referralData),
    });
  },

  // Delete referral
  delete: async (id) => {
    return apiRequest(`/referrals/${id}`, {
      method: 'DELETE',
    });
  },

  // Get referral statistics
  getStats: async () => {
    return apiRequest('/referrals/stats');
  },
};

// Invoice API functions
export const invoiceAPI = {
  // Get all invoices
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/invoices?${queryParams}`);
  },

  // Get invoice by ID
  getById: async (id) => {
    return apiRequest(`/invoices/${id}`);
  },

  // Create new invoice
  create: async (invoiceData) => {
    return apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  // Update invoice
  update: async (id, invoiceData) => {
    return apiRequest(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    });
  },

  // Update invoice status (uses backend PATCH /invoices/:id/status)
  updateStatus: async (id, status) => {
    return apiRequest(`/invoices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Delete invoice
  delete: async (id) => {
    return apiRequest(`/invoices/${id}`, {
      method: 'DELETE',
    });
  },

  // Get invoice statistics
  getStats: async () => {
    return apiRequest('/invoices/stats');
  },
};

// Post API functions
export const postAPI = {
  // Get all posts
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/posts?${queryParams}`);
  },

  // Get post by ID
  getById: async (id) => {
    return apiRequest(`/posts/${id}`);
  },

  // Create new post
  create: async (postData) => {
    return apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  // Update post
  update: async (id, postData) => {
    return apiRequest(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  },

  // Delete post
  delete: async (id) => {
    return apiRequest(`/posts/${id}`, {
      method: 'DELETE',
    });
  },

  // Get post statistics
  getStats: async () => {
    return apiRequest('/posts/stats');
  },

  // Search posts by tags
  searchByTags: async (tags) => {
    return apiRequest(`/posts/search?tags=${encodeURIComponent(tags.join(','))}`);
  },
};

// Compliance Alert API functions
export const complianceAlertAPI = {
  // Get all compliance alerts with optional pagination and filters
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/compliance-alerts?${queryParams}`);
  },

  // Get compliance alert by ID
  getById: async (id) => {
    return apiRequest(`/compliance-alerts/${id}`);
  },

  // Create new compliance alert
  create: async (alertData) => {
    return apiRequest('/compliance-alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  },

  // Update compliance alert
  update: async (id, alertData) => {
    return apiRequest(`/compliance-alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(alertData),
    });
  },

  // Update compliance alert status
  updateStatus: async (id, status, resolutionNotes = '') => {
    return apiRequest(`/compliance-alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolutionNotes }),
    });
  },

  // Delete compliance alert
  delete: async (id) => {
    return apiRequest(`/compliance-alerts/${id}`, {
      method: 'DELETE',
    });
  },

  // Get compliance alert statistics
  getStats: async () => {
    return apiRequest('/compliance-alerts/stats');
  },

  // Get alerts for specific patient
  getByPatient: async (patientId) => {
    return apiRequest(`/compliance-alerts/patient/${patientId}`);
  },

  // Acknowledge alert
  acknowledge: async (id) => {
    return apiRequest(`/compliance-alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Acknowledged' }),
    });
  },

  // Resolve alert
  resolve: async (id, resolutionNotes = '') => {
    return apiRequest(`/compliance-alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Resolved', resolutionNotes }),
    });
  },

  // Dismiss alert
  dismiss: async (id) => {
    return apiRequest(`/compliance-alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Dismissed' }),
    });
  },
};

// Auth API functions
export const authAPI = {
  setToken: (token) => { authToken = token; },
  clearToken: () => { authToken = null; },
  register: async (payload) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  login: async (payload) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  // OTP-based authentication
  requestOTP: async (email) => {
    return apiRequest('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  loginWithOTP: async (email, otp) => {
    return apiRequest('/auth/login-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },
  me: async () => {
    return apiRequest('/auth/me');
  }
};

// Email Config API functions
export const emailConfigAPI = {
  // Get all email configurations for a doctor
  getAll: async (doctorId) => {
    return apiRequest(`/email-config?doctorId=${doctorId}`);
  },
  
  // Get active email configuration
  getActive: async (doctorId) => {
    return apiRequest(`/email-config/active/${doctorId}`);
  },
  
  // Create new email configuration
  create: async (config) => {
    return apiRequest('/email-config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },
  
  // Update email configuration
  update: async (id, config) => {
    return apiRequest(`/email-config/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },
  
  // Delete email configuration
  delete: async (id) => {
    return apiRequest(`/email-config/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Test email configuration
  test: async (id) => {
    return apiRequest(`/email-config/${id}/test`, {
      method: 'POST',
    });
  },
  
  // Set as default configuration
  setDefault: async (id) => {
    return apiRequest(`/email-config/${id}/set-default`, {
      method: 'POST',
    });
  },
  
  // Create default configuration for new doctor
  createDefault: async (doctorId, email, password, displayName) => {
    return apiRequest('/email-config/create-default', {
      method: 'POST',
      body: JSON.stringify({ doctorId, email, password, displayName }),
    });
  }
};

export default {
  patientAPI,
  appointmentAPI,
  consultationAPI,
  referralAPI,
  invoiceAPI,
  postAPI,
  authAPI,
  complianceAlertAPI,
  emailConfigAPI
};
