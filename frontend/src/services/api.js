import { config } from '../config/env.js';
import sessionManager from '../utils/sessionManager.js';

const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';

// Generic API request function with session management
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    // Get current token with automatic refresh if needed
    const currentToken = await sessionManager.checkTokenRefresh();
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
      },
      ...options,
    };

    // Add debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Making API request to:', url);
      console.log('Request options:', { ...defaultOptions, headers: { ...defaultOptions.headers, Authorization: currentToken ? 'Bearer [HIDDEN]' : undefined } });
    }

    const response = await fetch(url, defaultOptions);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Response status:', response.status);
    }
    
    // Handle authentication errors
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      // Check if it's a token expiry or invalid token
      if (errorData.code === 'TOKEN_EXPIRED') {
        // Try to refresh token one more time
        try {
          const newToken = await sessionManager.refreshAuthToken();
          if (newToken) {
            // Retry the request with new token
            const retryOptions = {
              ...defaultOptions,
              headers: {
                ...defaultOptions.headers,
                'Authorization': `Bearer ${newToken}`
              }
            };
            const retryResponse = await fetch(url, retryOptions);
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
      
      // If refresh failed or other auth error, redirect to login
      console.warn('Authentication failed, redirecting to login');
      sessionManager.redirectToLogin('Session expired. Please log in again.');
      throw new Error('Authentication failed');
    }
    
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
    if (process.env.NODE_ENV === 'development') {
      console.error('API request failed:', {
        url,
        error: error.message,
        type: error.name
      });
    }
    
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
      const currentToken = await sessionManager.getToken();
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

  // Update patient medical history only
  updateMedicalHistory: async (id, medicalHistory) => {
    return apiRequest(`/patients/${id}/medical-history`, {
      method: 'PATCH',
      body: JSON.stringify({ medicalHistory }),
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

  // Get appointment trend data
  getTrend: async (days = 7) => {
    const queryParams = new URLSearchParams({
      days: days.toString()
    });
    return apiRequest(`/appointments/stats/trend?${queryParams}`);
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
  // Get all prescriptions
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    return apiRequest(`/prescriptions?${queryParams}`);
  },

  // Allot prescription to pharmacist
  allotToPharmacist: async (prescriptionId, pharmacistId) => {
    return apiRequest(`/prescriptions/${prescriptionId}/allot`, {
      method: 'PATCH',
      body: JSON.stringify({ pharmacistId }),
    });
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

  // Get upcoming consultations
  getUpcoming: async () => {
    return apiRequest('/consultations?status=Scheduled&sortBy=scheduledDate&sortOrder=asc');
  },

  // Get consultation history
  getHistory: async (page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status: 'Completed,Cancelled',
      sortBy: 'scheduledDate',
      sortOrder: 'desc',
      ...filters
    });
    return apiRequest(`/consultations?${params}`);
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

// Appointment Invoice API functions
export const appointmentInvoiceAPI = {
  // Get all appointment invoices
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/appointment-invoices?${queryParams}`);
  },

  // Get appointment invoice by ID
  getById: async (id) => {
    return apiRequest(`/appointment-invoices/${id}`);
  },

  // Approve appointment invoice
  approve: async (id) => {
    return apiRequest(`/appointment-invoices/${id}/approve`, {
      method: 'PATCH',
    });
  },

  // Update appointment invoice
  update: async (id, data) => {
    return apiRequest(`/appointment-invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Cancel appointment invoice
  cancel: async (id) => {
    return apiRequest(`/appointment-invoices/${id}/cancel`, {
      method: 'PATCH',
    });
  },

  // Get appointment invoice statistics
  getStats: async () => {
    return apiRequest('/appointment-invoices/stats/summary');
  },
};

// Teleconsultation Invoice API functions
export const teleconsultationInvoiceAPI = {
  // Get all teleconsultation invoices
  getAll: async (page = 1, limit = 10, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return apiRequest(`/teleconsultation-invoices?${queryParams}`);
  },

  // Get teleconsultation invoice by ID
  getById: async (id) => {
    return apiRequest(`/teleconsultation-invoices/${id}`);
  },

  // Approve teleconsultation invoice
  approve: async (id) => {
    return apiRequest(`/teleconsultation-invoices/${id}/approve`, {
      method: 'PATCH',
    });
  },

  // Update teleconsultation invoice
  update: async (id, data) => {
    return apiRequest(`/teleconsultation-invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Cancel teleconsultation invoice
  cancel: async (id) => {
    return apiRequest(`/teleconsultation-invoices/${id}/cancel`, {
      method: 'PATCH',
    });
  },

  // Get teleconsultation invoice statistics
  getStats: async () => {
    return apiRequest('/teleconsultation-invoices/stats/summary');
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
    const currentToken = await sessionManager.getToken();
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

  // Create a new activity log
  create: async (logData) => {
    return apiRequest('/activity-logs', {
      method: 'POST',
      body: JSON.stringify(logData),
    });
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
  getAll: async (page = 1, limit = 100, filters = {}, activeOnly = false) => {
    console.log('doctorAPI.getAll called');
    const currentToken = await sessionManager.getToken();
    console.log('Auth token in API:', currentToken ? 'Present' : 'Missing');
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(activeOnly ? { activeOnly: 'true' } : {}),
      ...filters
    });
    
    const result = await apiRequest(`/doctors?${queryParams}`);
    console.log('doctorAPI.getAll result:', result);
    
    // Normalize response format - backend returns { success: true, data: [...], pagination: {...} }
    // but frontend expects { doctors: [...] } for consistency with other APIs
    if (result.success && result.data) {
      return {
        success: result.success,
        doctors: result.data,
        data: result.data, // Keep both for backward compatibility
        pagination: result.pagination // Include pagination data
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

  // Create new doctor with pre-uploaded image
  createWithImage: async (doctorData) => {
    return apiRequest('/doctors/create-with-image', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  },

  // Create new doctor (legacy method with file upload)
  create: async (doctorData) => {
    // Handle FormData differently (for file uploads)
    if (doctorData instanceof FormData) {
      const currentToken = await sessionManager.getToken();
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
    
    // Handle regular JSON data - use the new endpoint
    return this.createWithImage(doctorData);
  },

  // Upload doctor profile image
  uploadImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('profileImage', imageFile);
    
    // Get current token with automatic refresh if needed
    const currentToken = await sessionManager.checkTokenRefresh();
    const url = `${API_BASE_URL}/doctors/upload-image`;
    
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
      let message = `HTTP error! status: ${response.status}`;
      if (errorData) {
        const backendMsg = errorData.message || errorData.error;
        message = backendMsg || message;
      }
      const error = new Error(message);
      error.response = response;
      error.data = errorData;
      throw error;
    }
    
    return await response.json();
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
  getAll: async (page = 1, limit = 100, filters = {}, activeOnly = false) => {
    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(activeOnly ? { activeOnly: 'true' } : {}),
      ...filters
    });
    
    return apiRequest(`/nurses?${queryParams}`);
  },

  // Get nurse by ID
  getById: async (id) => {
    return apiRequest(`/nurses/${id}`);
  },

  // Upload nurse profile image
  uploadImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('profileImage', imageFile);
    
    // Get current token with automatic refresh if needed
    const currentToken = await sessionManager.checkTokenRefresh();
    const url = `${API_BASE_URL}/nurses/upload-image`;
    
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
      let message = `HTTP error! status: ${response.status}`;
      if (errorData) {
        const backendMsg = errorData.message || errorData.error;
        message = backendMsg || message;
      }
      const error = new Error(message);
      error.response = response;
      error.data = errorData;
      throw error;
    }
    
    return await response.json();
  },

  // Create new nurse with pre-uploaded image
  createWithImage: async (nurseData) => {
    return apiRequest('/nurses/create-with-image', {
      method: 'POST',
      body: JSON.stringify(nurseData),
    });
  },

  // Create new nurse (legacy method with file upload)
  create: async (nurseData) => {
    // Handle FormData differently (for file uploads)
    if (nurseData instanceof FormData) {
      const currentToken = await sessionManager.getToken();
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
    
    // Handle regular JSON data - use the new endpoint
    return this.createWithImage(nurseData);
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

// Pharmacist API functions
export const pharmacistAPI = {
  // Get all pharmacists
  getAll: async (page = 1, limit = 100, filters = {}, activeOnly = false) => {
    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(activeOnly ? { activeOnly: 'true' } : {}),
      ...filters
    });
    
    return apiRequest(`/pharmacists?${queryParams}`);
  },

  // Get pharmacist by ID
  getById: async (id) => {
    return apiRequest(`/pharmacists/${id}`);
  },

  // Upload pharmacist profile image
  uploadImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('profileImage', imageFile);
    
    // Get current token with automatic refresh if needed
    const currentToken = await sessionManager.checkTokenRefresh();
    const url = `${API_BASE_URL}/pharmacists/upload-image`;
    
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
      let message = `HTTP error! status: ${response.status}`;
      if (errorData) {
        const backendMsg = errorData.message || errorData.error;
        message = backendMsg || message;
      }
      const error = new Error(message);
      error.response = response;
      error.data = errorData;
      throw error;
    }
    
    return await response.json();
  },

  // Create new pharmacist with pre-uploaded image
  createWithImage: async (pharmacistData) => {
    return apiRequest('/pharmacists/create-with-image', {
      method: 'POST',
      body: JSON.stringify(pharmacistData),
    });
  },

  // Create new pharmacist (legacy method with file upload)
  create: async (pharmacistData) => {
    // Handle FormData differently (for file uploads)
    if (pharmacistData instanceof FormData) {
      const currentToken = await sessionManager.getToken();
      const url = `${API_BASE_URL}/pharmacists`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}),
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: pharmacistData,
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
    
    // Handle regular JSON data - use the new endpoint
    return this.createWithImage(pharmacistData);
  },

  // Update pharmacist
  update: async (id, pharmacistData) => {
    return apiRequest(`/pharmacists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pharmacistData),
    });
  },

  // Delete pharmacist (soft delete)
  delete: async (id) => {
    return apiRequest(`/pharmacists/${id}`, {
      method: 'DELETE',
    });
  },

  // Activate pharmacist
  activate: async (id) => {
    return apiRequest(`/pharmacists/${id}/activate`, {
      method: 'PATCH',
    });
  },

  // Deactivate pharmacist
  deactivate: async (id) => {
    return apiRequest(`/pharmacists/${id}/deactivate`, {
      method: 'PATCH',
    });
  },

  // Search pharmacists by name or specialization
  search: async (query) => {
    return apiRequest(`/pharmacists/search?q=${encodeURIComponent(query)}`);
  },
};

// Inventory API functions
export const inventoryAPI = {
  // Get all inventory items
  getAll: async (page = 1, limit = 50, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    return apiRequest(`/inventory?${queryParams}`);
  },

  // Get inventory statistics
  getStats: async () => {
    return apiRequest('/inventory/stats');
  },

  // Get inventory item by ID
  getById: async (id) => {
    return apiRequest(`/inventory/${id}`);
  },

  // Create new inventory item
  create: async (itemData) => {
    return apiRequest('/inventory', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  // Update inventory item
  update: async (id, itemData) => {
    return apiRequest(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  },

  // Update stock quantity
  updateStock: async (id, quantity) => {
    return apiRequest(`/inventory/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  // Delete inventory item
  delete: async (id) => {
    return apiRequest(`/inventory/${id}`, {
      method: 'DELETE',
    });
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
  setToken: async (token, refreshToken = null, expiresIn = 3600) => {
    // Use session manager for secure token storage
    if (token) {
      await sessionManager.setToken(token, refreshToken, expiresIn);
    } else {
      await sessionManager.clearSession();
    }
  },
  clearToken: async () => {
    await sessionManager.clearSession();
  },
  getToken: async () => {
    return await sessionManager.getToken();
  },
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
  // 2-step verification endpoints
  loginStep1: async (payload) => {
    return apiRequest('/auth/login-step1', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  loginStep2: async (payload) => {
    return apiRequest('/auth/login-step2', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  // Developer login - bypasses OTP for development
  developerLogin: async (payload) => {
    return apiRequest('/auth/developer-login', {
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

  // Allot prescription to pharmacist
  allotToPharmacist: async (prescriptionId, pharmacistId) => {
    return apiRequest(`/prescriptions/${prescriptionId}/allot`, {
      method: 'PATCH',
      body: JSON.stringify({ pharmacistId }),
    });
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
  },

  // Get matching inventory for prescription medications
  getMatchingInventory: async (prescriptionId) => {
    return apiRequest(`/prescriptions/${prescriptionId}/matching-inventory`);
  },

  // Dispense medication from inventory
  dispenseMedication: async (prescriptionId, medicationIndex, inventoryId, quantity, notes = '') => {
    return apiRequest(`/prescriptions/${prescriptionId}/dispense`, {
      method: 'POST',
      body: JSON.stringify({ medicationIndex, inventoryId, quantity, notes }),
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
    const currentToken = await sessionManager.getToken();
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
  getUpcoming: async (page = 1, limit = 10) => {
    return apiRequest(`/teleconsultations?status=Scheduled&sortBy=scheduledDate&sortOrder=asc&page=${page}&limit=${limit}`);
  },

  // Get today's teleconsultations
  getToday: async () => {
    const today = new Date().toISOString().split('T')[0];
    return apiRequest(`/teleconsultations?date=${today}`);
  },

  // Get teleconsultation history
  getHistory: async (page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      status: 'Completed,Cancelled',
      sortBy: 'scheduledDate',
      sortOrder: 'desc',
      ...filters
    });
    return apiRequest(`/teleconsultations?${params}`);
  }
};

// Doctor Availability API
export const doctorAvailabilityAPI = {
  // Get doctor's availability
  getAvailability: async (doctorId) => {
    return apiRequest(`/doctor-availability/${doctorId}`);
  },

  // Get available time slots for a specific date
  getAvailableSlots: async (doctorId, date) => {
    return apiRequest(`/doctor-availability/${doctorId}/slots/${date}`);
  },

  // Bulk create/update availability
  bulkUpdate: async (doctorId, clinicId, schedule, slotDuration = 30) => {
    return apiRequest('/doctor-availability/bulk', {
      method: 'POST',
      body: JSON.stringify({ doctorId, clinicId, schedule, slotDuration })
    });
  },

  // Create single availability entry
  create: async (availabilityData) => {
    return apiRequest('/doctor-availability', {
      method: 'POST',
      body: JSON.stringify(availabilityData)
    });
  },

  // Update availability
  update: async (id, availabilityData) => {
    return apiRequest(`/doctor-availability/${id}`, {
      method: 'PUT',
      body: JSON.stringify(availabilityData)
    });
  },

  // Delete availability
  delete: async (id) => {
    return apiRequest(`/doctor-availability/${id}`, {
      method: 'DELETE'
    });
  }
};

// Schedule Exception API
export const scheduleExceptionAPI = {
  // Get exceptions for a doctor
  getExceptions: async (doctorId, startDate = null, endDate = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    return apiRequest(`/schedule-exceptions/${doctorId}${queryString ? '?' + queryString : ''}`);
  },

  // Create exception
  create: async (exceptionData) => {
    return apiRequest('/schedule-exceptions', {
      method: 'POST',
      body: JSON.stringify(exceptionData)
    });
  },

  // Bulk create exceptions (for vacation periods)
  bulkCreate: async (doctorId, clinicId, startDate, endDate, type, reason) => {
    return apiRequest('/schedule-exceptions/bulk', {
      method: 'POST',
      body: JSON.stringify({ doctorId, clinicId, startDate, endDate, type, reason })
    });
  },

  // Update exception
  update: async (id, exceptionData) => {
    return apiRequest(`/schedule-exceptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(exceptionData)
    });
  },

  // Delete exception
  delete: async (id) => {
    return apiRequest(`/schedule-exceptions/${id}`, {
      method: 'DELETE'
    });
  }
};

// Note: consultationAPI and teleconsultationAPI are separate APIs

export default {
  patientAPI,
  appointmentAPI,
  consultationAPI,
  referralAPI,
  invoiceAPI,
  appointmentInvoiceAPI,
  teleconsultationInvoiceAPI,
  activityLogAPI,
  postAPI,
  authAPI,
  complianceAlertAPI,
  doctorAPI,
  nurseAPI,
  pharmacistAPI,
  inventoryAPI,
  clinicAPI,
  prescriptionAPI,
  vitalsAPI,
  medicalImageAPI,
  revenueAPI,
  teleconsultationAPI,
  doctorAvailabilityAPI,
  scheduleExceptionAPI
};
