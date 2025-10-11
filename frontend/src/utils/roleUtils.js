// Role-based access control utilities

export const USER_ROLES = {
  CLINIC: 'clinic',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  HEAD_NURSE: 'head_nurse',
  SUPERVISOR: 'supervisor'
};

export const ROLE_PERMISSIONS = {
  [USER_ROLES.CLINIC]: {
    canAccess: [
      'dashboard',
      'patient-management',
      'appointment-management',
      'doctors-management',
      'nurses-management',
      'teleconsultation',
      'prescriptions',
      'referral-system',
      'community-hub',
      'invoice-management',
      'email-settings',
      'compliance-alerts',
      'activity-logs',
      'audit-logs'
    ],
    canViewAllPatients: true,
    canManageDoctors: true,
    canManageSystem: true
  },
  [USER_ROLES.DOCTOR]: {
    canAccess: [
      'dashboard',
      'patient-management',
      'appointment-management',
      'referral-system',
      'teleconsultation',
      'prescriptions',
      'community-hub'
    ],
    canViewAllPatients: false,
    canManageDoctors: false,
    canManageSystem: false
  },
  [USER_ROLES.NURSE]: {
    canAccess: [
      'dashboard',
      'patient-management',
      'appointment-management',
      'prescriptions',
      'invoice-management'
    ],
    canViewAllPatients: false,
    canManageDoctors: false,
    canManageSystem: false
  },
  [USER_ROLES.HEAD_NURSE]: {
    canAccess: [
      'dashboard',
      'patient-management',
      'appointment-management',
      'prescriptions',
      'invoice-management'
    ],
    canViewAllPatients: false,
    canManageDoctors: false,
    canManageSystem: false
  },
  [USER_ROLES.SUPERVISOR]: {
    canAccess: [
      'dashboard',
      'patient-management',
      'appointment-management',
      'prescriptions',
      'invoice-management'
    ],
    canViewAllPatients: false,
    canManageDoctors: false,
    canManageSystem: false
  }
};

// Get current user from localStorage
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Get user role
export const getUserRole = () => {
  const user = getCurrentUser();
  return user?.role || null;
};

// Check if user has specific role
export const hasRole = (role) => {
  const userRole = getUserRole();
  return userRole === role;
};

// Check if user is clinic admin
export const isClinic = () => {
  return hasRole(USER_ROLES.CLINIC);
};

// Check if user is doctor
export const isDoctor = () => {
  return hasRole(USER_ROLES.DOCTOR);
};

// Check if user is nurse
export const isNurse = () => {
  return hasRole(USER_ROLES.NURSE);
};

// Check if user is head nurse
export const isHeadNurse = () => {
  return hasRole(USER_ROLES.HEAD_NURSE);
};

// Check if user is supervisor
export const isSupervisor = () => {
  return hasRole(USER_ROLES.SUPERVISOR);
};

// Check if user can access a specific route/feature
export const canAccessRoute = (routeName) => {
  const userRole = getUserRole();
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }
  
  return ROLE_PERMISSIONS[userRole].canAccess.includes(routeName);
};

// Get allowed routes for current user
export const getAllowedRoutes = () => {
  const userRole = getUserRole();
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return [];
  }
  
  return ROLE_PERMISSIONS[userRole].canAccess;
};

// Check if user can view all patients (super admin) or only assigned patients (doctor)
export const canViewAllPatients = () => {
  const userRole = getUserRole();
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }
  
  return ROLE_PERMISSIONS[userRole].canViewAllPatients;
};

// Get current user ID for filtering
export const getCurrentUserId = () => {
  const user = getCurrentUser();
  return user?._id || user?.id || null;
};

// Check if user can edit patient information (only clinic admins)
export const canEditPatients = () => {
  return isClinic();
};
