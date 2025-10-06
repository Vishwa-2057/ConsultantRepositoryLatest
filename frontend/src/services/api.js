import { config } from '../config/env.js';

const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';
let authToken = null;

// Initialize auth token from localStorage
const initializeAuth = () => {
  const token = localStorage.getItem('authToken');
  if (token) {
    authToken = token;
  }
};

// Call initialization
initializeAuth();

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Always get fresh token from localStorage
  const currentToken = localStorage.getItem('authToken');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
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
    // Handle FormData differently (for file uploads)
    if (patientData instanceof FormData) {
      const currentToken = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/patients`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: patientData,
      });
      
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
    }
    
    // Handle regular JSON data
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

  // Get patients grouped by doctor specialties
  getGroupedBySpecialty: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters);
    return apiRequest(`/patients/grouped-by-specialty?${queryParams}`);
  },

  // Update patient assigned doctors
  updateAssignedDoctors: async (id, assignedDoctors) => {
    return apiRequest(`/patients/${id}/assigned-doctors`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedDoctors }),
    });
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
    return apiRequest('/appointments/stats/summary');
  },

  // Update appointment status
  updateStatus: async (id, status) => {
    return apiRequest(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Check for appointment conflicts
  checkConflicts: async (doctorId, date, time, duration = 30, excludeAppointmentId = null) => {
    const queryParams = new URLSearchParams({
      doctorId,
      date: date instanceof Date ? date.toISOString().split('T')[0] : date,
      time,
      duration: duration.toString(),
      ...(excludeAppointmentId && { excludeAppointmentId })
    });
    return apiRequest(`/appointments/check-conflicts?${queryParams}`);
  },

  // Get doctor's availability for a specific date
  getDoctorAvailability: async (doctorId, date) => {
    const queryParams = new URLSearchParams({
      date: date instanceof Date ? date.toISOString().split('T')[0] : date
    });
    return apiRequest(`/appointments/doctor-availability/${doctorId}?${queryParams}`);
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

  // Update consultation status
  updateStatus: async (id, status) => {
    return apiRequest(`/consultations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
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

  // Update referral status
  updateStatus: async (id, status) => {
    return apiRequest(`/referrals/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Get referral statistics
  getStats: async () => {
    return apiRequest('/referrals/stats/summary');
  },

  // Generate shareable referral link
  generateLink: async (id) => {
    return apiRequest(`/referrals/${id}/generate-link`, {
      method: 'POST',
    });
  },

  // Get referral by shareable code
  getByCode: async (code) => {
    return apiRequest(`/referrals/shared/${code}`);
  },

  // Deactivate shareable link
  deactivateLink: async (id) => {
    return apiRequest(`/referrals/${id}/deactivate-link`, {
      method: 'PATCH',
    });
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

  // Get current month revenue
  getCurrentMonthRevenue: async () => {
    return apiRequest('/invoices/stats/current-month-revenue');
  },

  // Approve invoice
  approve: async (id) => {
    return apiRequest(`/invoices/${id}/approve`, {
      method: 'PATCH',
    });
  },

  // Reject invoice
  reject: async (id, reason = '') => {
    return apiRequest(`/invoices/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },
};

// Activity Log API functions
export const activityLogAPI = {
  // Get all activity logs with pagination and filters
  getAll: async (options = {}) => {
    const {
      page = 1,
      limit = 20,
      activityType,
      userId,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    if (activityType) queryParams.append('activityType', activityType);
    if (userId) queryParams.append('userId', userId);
    if (startDate) queryParams.append('startDate', startDate.toISOString());
    if (endDate) queryParams.append('endDate', endDate.toISOString());

    return apiRequest(`/activity-logs?${queryParams}`);
  },

  // Get activity statistics
  getStats: async (options = {}) => {
    const { startDate, endDate } = options;
    const queryParams = new URLSearchParams();

    if (startDate) queryParams.append('startDate', startDate.toISOString());
    if (endDate) queryParams.append('endDate', endDate.toISOString());

    return apiRequest(`/activity-logs/stats?${queryParams}`);
  },

  // Get users for filtering
  getUsers: async () => {
    return apiRequest('/activity-logs/users');
  },

  // Export activity logs
  export: async (options = {}) => {
    const {
      activityType,
      userId,
      startDate,
      endDate,
      format = 'csv'
    } = options;

    const queryParams = new URLSearchParams({ format });

    if (activityType) queryParams.append('activityType', activityType);
    if (userId) queryParams.append('userId', userId);
    if (startDate) queryParams.append('startDate', startDate.toISOString());
    if (endDate) queryParams.append('endDate', endDate.toISOString());

    // For file downloads, we need to handle the response differently
    const currentToken = localStorage.getItem('authToken');
    const url = `${API_BASE_URL}/activity-logs/export?${queryParams}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Create download link
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `activity-logs-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true };
  },

  // Clean up old logs (admin only)
  cleanup: async (days = 90) => {
    return apiRequest(`/activity-logs/cleanup?days=${days}`, {
      method: 'DELETE',
    });
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
    return apiRequest('/posts/stats/summary');
  },

  // Search posts by tags
  searchByTags: async (tags) => {
    return apiRequest(`/posts/search?tags=${encodeURIComponent(tags.join(','))}`);
  },

  // Like a post
  like: async (id) => {
    return apiRequest(`/posts/${id}/like`, {
      method: 'POST',
    });
  },

  // Unlike a post
  unlike: async (id) => {
    return apiRequest(`/posts/${id}/unlike`, {
      method: 'POST',
    });
  },

  // Share a post
  share: async (id) => {
    return apiRequest(`/posts/${id}/share`, {
      method: 'POST',
    });
  },

  // Add comment to a post
  addComment: async (id, content) => {
    return apiRequest(`/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  // Record a view
  recordView: async (id) => {
    return apiRequest(`/posts/${id}/view`, {
      method: 'POST',
    });
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

  // Get compliance rate
  getComplianceRate: async () => {
    const response = await apiRequest('/compliance-alerts/stats');
    return response.data.overview.complianceRate;
  },
};

// Doctor API functions
export const doctorAPI = {
  // Get all doctors
  getAll: async (page = 1, limit = 100, filters = {}) => {
    console.log('doctorAPI.getAll called');
    console.log('Auth token in API:', authToken ? 'Present' : 'Missing');
    const result = await apiRequest('/doctors');
    console.log('doctorAPI.getAll result:', result);
    
    // Normalize response format - backend returns { success: true, data: [...] }
    // but frontend expects { doctors: [...] } for consistency with other APIs
    if (result.success && result.data) {
      return {
        success: result.success,
        doctors: result.data,
        data: result.data // Keep both for backward compatibility
      };
    }
    
    return result;
  },

  // Get doctor by ID
  getById: async (id) => {
    return apiRequest(`/doctors/${id}`);
  },

  // Get doctors by clinic ID
  getByClinic: async (clinicId) => {
    return apiRequest(`/doctors/clinic/${clinicId}`);
  },

  // Create new doctor
  create: async (doctorData) => {
    // Handle FormData differently (for file uploads)
    if (doctorData instanceof FormData) {
      const currentToken = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/doctors`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: doctorData,
      });
      
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
    }
    
    // Handle regular JSON data
    return apiRequest('/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  },

  // Update doctor
  update: async (id, doctorData) => {
    return apiRequest(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(doctorData),
    });
  },

  // Delete doctor (soft delete)
  delete: async (id) => {
    return apiRequest(`/doctors/${id}`, {
      method: 'DELETE',
    });
  },

  // Activate doctor
  activate: async (id) => {
    return apiRequest(`/doctors/${id}/activate`, {
      method: 'PATCH',
    });
  },

  // Deactivate doctor
  deactivate: async (id) => {
    return apiRequest(`/doctors/${id}/deactivate`, {
      method: 'PATCH',
    });
  },

  // Search doctors by name or specialty
  search: async (query) => {
    return apiRequest(`/doctors/search?q=${encodeURIComponent(query)}`);
  },
};

// Nurse API functions
export const nurseAPI = {
  // Get all nurses
  getAll: async () => {
    return apiRequest('/nurses');
  },

  // Get nurse by ID
  getById: async (id) => {
    return apiRequest(`/nurses/${id}`);
  },

  // Create new nurse
  create: async (nurseData) => {
    // Handle FormData differently (for file uploads)
    if (nurseData instanceof FormData) {
      const currentToken = localStorage.getItem('authToken');
      const url = `${API_BASE_URL}/nurses`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: nurseData,
      });
      
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
    }
    
    // Handle regular JSON data
    return apiRequest('/nurses', {
      method: 'POST',
      body: JSON.stringify(nurseData),
    });
  },

  // Update nurse
  update: async (id, nurseData) => {
    return apiRequest(`/nurses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(nurseData),
    });
  },

  // Delete nurse (soft delete)
  delete: async (id) => {
    return apiRequest(`/nurses/${id}`, {
      method: 'DELETE',
    });
  },

  // Activate nurse
  activate: async (id) => {
    return apiRequest(`/nurses/${id}/activate`, {
      method: 'PATCH',
    });
  },

  // Deactivate nurse
  deactivate: async (id) => {
    return apiRequest(`/nurses/${id}/deactivate`, {
      method: 'PATCH',
    });
  },

  // Search nurses by name or department
  search: async (query) => {
    return apiRequest(`/nurses/search?q=${encodeURIComponent(query)}`);
  },
};

// Clinic API functions
export const clinicAPI = {
  // Login clinic
  login: async (payload) => {
    return apiRequest('/auth/clinic-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Get clinic profile
  getProfile: async () => {
    return apiRequest('/clinics/profile');
  },

  // OTP-based authentication for clinics
  requestOTP: async (email) => {
    return apiRequest('/auth/clinic-request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  
  loginWithOTP: async (email, otp) => {
    return apiRequest('/auth/clinic-login-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  // Update clinic profile
  updateProfile: async (payload) => {
    return apiRequest('/clinics/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Change password
  changePassword: async (payload) => {
    return apiRequest('/clinics/change-password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Get all clinics
  getAll: async () => {
    return apiRequest('/clinics/all');
  },
  
  // Forgot Password - Send reset OTP
  forgotPassword: async (email) => {
    return apiRequest('/auth/clinic-forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  
  // Reset Password with OTP
  resetPassword: async (email, otp, newPassword) => {
    return apiRequest('/auth/clinic-reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    });
  },
};

// Auth API functions
export const authAPI = {
  setToken: (token) => {
    authToken = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  },
  clearToken: () => authToken = null,
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
  },
  logout: async () => {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },
  // Forgot Password - Send reset OTP
  forgotPassword: async (email) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  // Reset Password with OTP
  resetPassword: async (email, otp, newPassword) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword })
    });
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

// Prescription API functions
export const prescriptionAPI = {
  // Get all prescriptions with optional pagination and filters
  getAll: async (page = 1, limit = 10, filters = {}) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      console.log('Requesting prescriptions with URL:', `/prescriptions?${queryParams}`);
      const response = await apiRequest(`/prescriptions?${queryParams}`);
      console.log('Raw prescriptions response:', response);
      return response;
    } catch (error) {
      console.error('Error in prescriptionAPI.getAll:', error);
      throw error;
    }
  },

  // Create new prescription
  create: async (prescriptionData) => {
    return apiRequest('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescriptionData),
    });
  },

  // Update prescription
  update: async (id, prescriptionData) => {
    return apiRequest(`/prescriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(prescriptionData),
    });
  },

  // Delete prescription
  delete: async (id) => {
    return apiRequest(`/prescriptions/${id}`, {
      method: 'DELETE',
    });
  },

  // Get prescription statistics
  getStats: async () => {
    return apiRequest('/prescriptions/stats/summary');
  },

  // Get prescriptions for specific patient
  getByPatient: async (patientId) => {
    return apiRequest(`/prescriptions/patient/${patientId}`);
  },

  // Update prescription status
  updateStatus: async (id, status) => {
    return apiRequest(`/prescriptions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
};

// Vitals API functions
export const vitalsAPI = {
  // Get all vitals for a patient
  getByPatient: async (patientId, page = 1, limit = 10) => {
    return apiRequest(`/vitals/patient/${patientId}?page=${page}&limit=${limit}`);
  },

  // Get latest vitals for a patient
  getLatestByPatient: async (patientId) => {
    return apiRequest(`/vitals/patient/${patientId}/latest`);
  },

  // Get single vitals record
  getById: async (id) => {
    return apiRequest(`/vitals/${id}`);
  },

  // Create new vitals record
  create: async (vitalsData) => {
    return apiRequest('/vitals', {
      method: 'POST',
      body: JSON.stringify(vitalsData),
    });
  },

  // Update vitals record
  update: async (id, vitalsData) => {
    return apiRequest(`/vitals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vitalsData),
    });
  },

  // Delete vitals record
  delete: async (id) => {
    return apiRequest(`/vitals/${id}`, {
      method: 'DELETE',
    });
  },

};

// Medical Images API functions
export const medicalImageAPI = {
  // Get all medical images with pagination and filtering
  getAll: async (page = 1, limit = 20, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/medical-images?${queryParams}`);
  },

  // Get medical images for specific patient
  getByPatient: async (patientId, filters = {}) => {
    const queryParams = new URLSearchParams(filters);
    return apiRequest(`/medical-images/patient/${patientId}?${queryParams}`);
  },

  // Upload new medical image
  upload: async (formData) => {
    const currentToken = localStorage.getItem('authToken');
    const url = `${API_BASE_URL}/medical-images`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Medical image upload error:', errorData);
      
      let message = `HTTP error! status: ${response.status}`;
      if (errorData) {
        const backendMsg = errorData.message || errorData.error;
        const details = Array.isArray(errorData.errors)
          ? errorData.errors.map(e => e.msg || e).join('; ')
          : (typeof errorData.errors === 'string' ? errorData.errors : undefined);
        
        if (backendMsg) {
          message = details ? `${backendMsg}: ${details}` : backendMsg;
        }
      }
      throw new Error(message);
    }
    
    return response.json();
  },

  // Get specific medical image
  getById: async (id) => {
    return apiRequest(`/medical-images/${id}`);
  },

  // Update medical image metadata
  update: async (id, imageData) => {
    return apiRequest(`/medical-images/${id}`, {
      method: 'PUT',
      body: JSON.stringify(imageData),
    });
  },

  // Delete medical image (archive)
  delete: async (id) => {
    return apiRequest(`/medical-images/${id}`, {
      method: 'DELETE',
    });
  },

  // Get medical images statistics
  getStats: async () => {
    return apiRequest('/medical-images/stats/summary');
  }
};

// Revenue API functions
export const revenueAPI = {
  // Get current month revenue
  getCurrentMonth: async () => {
    return apiRequest('/revenue/current-month');
  },

  // Get yearly revenue breakdown
  getYearly: async (year = null) => {
    const endpoint = year ? `/revenue/yearly/${year}` : '/revenue/yearly';
    return apiRequest(endpoint);
  },

  // Get revenue summary
  getSummary: async () => {
    return apiRequest('/revenue/summary');
  },

  // Get revenue audit trail for specific month
  getAudit: async (year, month) => {
    return apiRequest(`/revenue/audit/${year}/${month}`);
  }
};

// Teleconsultation API
export const teleconsultationAPI = {
  // Get all teleconsultations with filtering and pagination
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/teleconsultations?${params}`);
  },

  // Get teleconsultation by ID
  getById: async (id) => {
    return apiRequest(`/teleconsultations/${id}`);
  },

  // Get teleconsultation by meeting ID
  getByMeetingId: async (meetingId) => {
    return apiRequest(`/teleconsultations/meeting/${meetingId}`);
  },

  // Create new teleconsultation
  create: async (teleconsultationData) => {
    return apiRequest('/teleconsultations', {
      method: 'POST',
      body: JSON.stringify(teleconsultationData)
    });
  },

  // Start teleconsultation
  start: async (id) => {
    return apiRequest(`/teleconsultations/${id}/start`, {
      method: 'PATCH'
    });
  },

  // End teleconsultation
  end: async (id, consultationData = {}) => {
    return apiRequest(`/teleconsultations/${id}/end`, {
      method: 'PATCH',
      body: JSON.stringify(consultationData)
    });
  },

  // Cancel teleconsultation
  cancel: async (id, reason = '') => {
    return apiRequest(`/teleconsultations/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  },

  // Join teleconsultation (for tracking)
  join: async (id, userType = 'Patient') => {
    return apiRequest(`/teleconsultations/${id}/join`, {
      method: 'POST',
      body: JSON.stringify({ userType })
    });
  },

  // Get teleconsultation statistics
  getStats: async () => {
    return apiRequest('/teleconsultations/stats/summary');
  },

  // Get upcoming teleconsultations
  getUpcoming: async () => {
    return apiRequest('/teleconsultations?status=Scheduled&sortBy=scheduledDate&sortOrder=asc');
  },

  // Get today's teleconsultations
  getToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    return apiRequest(`/teleconsultations?date=${today}`);
  }
};

export default {
  patientAPI,
  appointmentAPI,
  consultationAPI,
  referralAPI,
  invoiceAPI,
  activityLogAPI,
  postAPI,
  authAPI,
  complianceAlertAPI,
  doctorAPI,
  nurseAPI,
  clinicAPI,
  prescriptionAPI,
  vitalsAPI,
  medicalImageAPI,
  revenueAPI,
  teleconsultationAPI
};
