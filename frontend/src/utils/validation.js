/**
 * Comprehensive validation utility for healthcare system forms
 * Provides reusable validation functions and patterns
 */

// Regular expressions for common validations
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\d{10}$/,
  aadhaar: /^\d{12}$/,
  uhid: /^[A-Z0-9]{6,12}$/,
  zipCode: /^\d{5,6}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[a-zA-Z\s'-]{2,50}$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+(\.\d{1,2})?$/,
  time24: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  date: /^\d{4}-\d{2}-\d{2}$/
};

// Common validation messages
export const VALIDATION_MESSAGES = {
  required: (field) => `${field} is required`,
  email: 'Please enter a valid email address',
  phone: 'Phone number must be 10 digits',
  aadhaar: 'Aadhaar number must be 12 digits',
  uhid: 'UHID must be 6-12 alphanumeric characters',
  zipCode: 'ZIP code must be 5-6 digits',
  password: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  strongPassword: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  name: 'Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes',
  minLength: (field, min) => `${field} must be at least ${min} characters`,
  maxLength: (field, max) => `${field} must not exceed ${max} characters`,
  min: (field, min) => `${field} must be at least ${min}`,
  max: (field, max) => `${field} must not exceed ${max}`,
  dateRange: 'Date must be within valid range',
  futureDate: 'Date cannot be in the future',
  pastDate: 'Date cannot be in the past',
  fileSize: (max) => `File size must be less than ${max}MB`,
  fileType: (types) => `File must be one of: ${types.join(', ')}`
};

/**
 * Basic validation functions
 */
export const validators = {
  required: (value, fieldName) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return VALIDATION_MESSAGES.required(fieldName);
    }
    return null;
  },

  email: (value) => {
    if (value && !VALIDATION_PATTERNS.email.test(value)) {
      return VALIDATION_MESSAGES.email;
    }
    return null;
  },

  phone: (value) => {
    if (value && !VALIDATION_PATTERNS.phone.test(value.replace(/\D/g, ''))) {
      return VALIDATION_MESSAGES.phone;
    }
    return null;
  },

  aadhaar: (value) => {
    if (value && !VALIDATION_PATTERNS.aadhaar.test(value.replace(/\D/g, ''))) {
      return VALIDATION_MESSAGES.aadhaar;
    }
    return null;
  },

  uhid: (value) => {
    if (value && !VALIDATION_PATTERNS.uhid.test(value.toUpperCase())) {
      return VALIDATION_MESSAGES.uhid;
    }
    return null;
  },

  zipCode: (value) => {
    if (value && !VALIDATION_PATTERNS.zipCode.test(value)) {
      return VALIDATION_MESSAGES.zipCode;
    }
    return null;
  },

  password: (value, strong = false) => {
    if (!value) return null;
    const pattern = strong ? VALIDATION_PATTERNS.strongPassword : VALIDATION_PATTERNS.password;
    const message = strong ? VALIDATION_MESSAGES.strongPassword : VALIDATION_MESSAGES.password;
    
    if (!pattern.test(value)) {
      return message;
    }
    return null;
  },

  name: (value) => {
    if (value && !VALIDATION_PATTERNS.name.test(value)) {
      return VALIDATION_MESSAGES.name;
    }
    return null;
  },

  minLength: (value, min, fieldName) => {
    if (value && value.length < min) {
      return VALIDATION_MESSAGES.minLength(fieldName, min);
    }
    return null;
  },

  maxLength: (value, max, fieldName) => {
    if (value && value.length > max) {
      return VALIDATION_MESSAGES.maxLength(fieldName, max);
    }
    return null;
  },

  min: (value, min, fieldName) => {
    if (value !== null && value !== undefined && Number(value) < min) {
      return VALIDATION_MESSAGES.min(fieldName, min);
    }
    return null;
  },

  max: (value, max, fieldName) => {
    if (value !== null && value !== undefined && Number(value) > max) {
      return VALIDATION_MESSAGES.max(fieldName, max);
    }
    return null;
  },

  dateRange: (value, minDate, maxDate) => {
    if (!value) return null;
    const date = new Date(value);
    const min = minDate ? new Date(minDate) : null;
    const max = maxDate ? new Date(maxDate) : null;
    
    if (min && date < min) return VALIDATION_MESSAGES.dateRange;
    if (max && date > max) return VALIDATION_MESSAGES.dateRange;
    return null;
  },

  futureDate: (value) => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date > today) {
      return VALIDATION_MESSAGES.futureDate;
    }
    return null;
  },

  pastDate: (value) => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (date < today) {
      return VALIDATION_MESSAGES.pastDate;
    }
    return null;
  },

  fileSize: (file, maxSizeMB) => {
    if (!file) return null;
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return VALIDATION_MESSAGES.fileSize(maxSizeMB);
    }
    return null;
  },

  fileType: (file, allowedTypes) => {
    if (!file) return null;
    if (!allowedTypes.includes(file.type)) {
      return VALIDATION_MESSAGES.fileType(allowedTypes);
    }
    return null;
  },

  time24: (value) => {
    if (value && !VALIDATION_PATTERNS.time24.test(value)) {
      return 'Please enter a valid time in HH:MM format';
    }
    return null;
  },

  numeric: (value) => {
    if (value && !VALIDATION_PATTERNS.numeric.test(value)) {
      return 'Please enter only numbers';
    }
    return null;
  },

  decimal: (value) => {
    if (value && !VALIDATION_PATTERNS.decimal.test(value)) {
      return 'Please enter a valid decimal number';
    }
    return null;
  }
};

/**
 * Validation schema builder for complex forms
 */
export class ValidationSchema {
  constructor() {
    this.rules = {};
  }

  field(fieldName) {
    this.rules[fieldName] = [];
    return {
      required: (message) => {
        this.rules[fieldName].push({
          validator: validators.required,
          params: [fieldName],
          message
        });
        return this.field(fieldName);
      },
      email: (message) => {
        this.rules[fieldName].push({
          validator: validators.email,
          params: [],
          message
        });
        return this.field(fieldName);
      },
      phone: (message) => {
        this.rules[fieldName].push({
          validator: validators.phone,
          params: [],
          message
        });
        return this.field(fieldName);
      },
      aadhaar: (message) => {
        this.rules[fieldName].push({
          validator: validators.aadhaar,
          params: [],
          message
        });
        return this.field(fieldName);
      },
      uhid: (message) => {
        this.rules[fieldName].push({
          validator: validators.uhid,
          params: [],
          message
        });
        return this.field(fieldName);
      },
      password: (strong = false, message) => {
        this.rules[fieldName].push({
          validator: validators.password,
          params: [strong],
          message
        });
        return this.field(fieldName);
      },
      minLength: (min, message) => {
        this.rules[fieldName].push({
          validator: validators.minLength,
          params: [min, fieldName],
          message
        });
        return this.field(fieldName);
      },
      maxLength: (max, message) => {
        this.rules[fieldName].push({
          validator: validators.maxLength,
          params: [max, fieldName],
          message
        });
        return this.field(fieldName);
      },
      custom: (validatorFn, message) => {
        this.rules[fieldName].push({
          validator: validatorFn,
          params: [],
          message
        });
        return this.field(fieldName);
      }
    };
  }

  validate(data) {
    const errors = {};
    
    for (const [fieldName, rules] of Object.entries(this.rules)) {
      const value = this.getNestedValue(data, fieldName);
      
      for (const rule of rules) {
        const error = rule.validator(value, ...rule.params);
        if (error) {
          errors[fieldName] = rule.message || error;
          break; // Stop at first error for this field
        }
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Pre-built validation schemas for common forms
 */
export const validationSchemas = {
  patient: () => {
    const schema = new ValidationSchema();
    
    schema.field('fullName').required().minLength(2).maxLength(100);
    schema.field('dateOfBirth').required();
    schema.field('gender').required();
    schema.field('uhid').required().uhid();
    schema.field('bloodGroup').required();
    schema.field('occupation').required().maxLength(100);
    schema.field('password').required().password();
    
    // Conditional validations for adults
    schema.field('phone').custom((value, formData) => {
      if (!formData.isUnder18 && !value) {
        return 'Phone number is required for patients 18 and older';
      }
      return validators.phone(value);
    });
    
    schema.field('email').custom((value, formData) => {
      if (value) return validators.email(value);
      return null;
    });
    
    // Address validations
    schema.field('address.street').required();
    schema.field('address.city').required();
    schema.field('address.state').required();
    schema.field('address.zipCode').required();
    
    // Parent/Guardian validations for under 18
    schema.field('parentGuardian.name').custom((value, formData) => {
      if (formData.isUnder18 && !value) {
        return 'Parent/Guardian name is required for patients under 18';
      }
      return null;
    });
    
    schema.field('parentGuardian.email').custom((value, formData) => {
      if (formData.isUnder18) {
        if (!value) return 'Parent/Guardian email is required for patients under 18';
        return validators.email(value);
      }
      return null;
    });
    
    schema.field('parentGuardian.mobileNumber').custom((value, formData) => {
      if (formData.isUnder18) {
        if (!value) return 'Parent/Guardian mobile number is required for patients under 18';
        return validators.phone(value);
      }
      return null;
    });
    
    return schema;
  },

  appointment: () => {
    const schema = new ValidationSchema();
    
    schema.field('patientId').required('Patient is required');
    schema.field('doctorId').required('Doctor is required');
    schema.field('appointmentType').required('Appointment type is required');
    schema.field('date').required('Date is required');
    schema.field('time').required('Time is required');
    schema.field('duration').required('Duration is required');
    
    // Custom validations
    schema.field('date').custom((value) => {
      if (!value) return null;
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        return 'Appointment date cannot be in the past';
      }
      return null;
    });
    
    return schema;
  },

  prescription: () => {
    const schema = new ValidationSchema();
    
    schema.field('patientId').required('Patient is required');
    schema.field('doctorId').required('Doctor is required');
    schema.field('diagnosis').required('Diagnosis is required');
    
    return schema;
  },

  doctor: () => {
    const schema = new ValidationSchema();
    
    schema.field('fullName').required().minLength(2).maxLength(100);
    schema.field('email').required().email();
    schema.field('phone').required().phone();
    schema.field('specialty').required();
    schema.field('qualification').required();
    schema.field('experience').required().min(0, 'Experience');
    schema.field('password').required().password();
    
    return schema;
  },

  nurse: () => {
    const schema = new ValidationSchema();
    
    schema.field('fullName').required().minLength(2).maxLength(100);
    schema.field('email').required().email();
    schema.field('phone').required().phone();
    schema.field('department').required();
    schema.field('shift').required();
    schema.field('experience').required().min(0, 'Experience');
    schema.field('password').required().password();
    
    return schema;
  },

  login: () => {
    const schema = new ValidationSchema();
    
    schema.field('email').required('Email is required').email();
    schema.field('password').required('Password is required');
    
    return schema;
  },

  register: () => {
    const schema = new ValidationSchema();
    
    schema.field('fullName').required('Full name is required').minLength(2).maxLength(100);
    schema.field('email').required('Email is required').email();
    schema.field('password').required('Password is required').password();
    schema.field('specialty').required('Specialty is required');
    
    return schema;
  }
};

/**
 * Utility function to validate a single field
 */
export const validateField = (value, validations) => {
  for (const validation of validations) {
    const error = validation(value);
    if (error) return error;
  }
  return null;
};

/**
 * Utility function to format validation errors for display
 */
export const formatValidationErrors = (errors) => {
  const formatted = {};
  for (const [field, error] of Object.entries(errors)) {
    formatted[field] = Array.isArray(error) ? error[0] : error;
  }
  return formatted;
};

/**
 * Input sanitization functions
 */
export const sanitizers = {
  phone: (value) => value.replace(/\D/g, '').slice(0, 10),
  aadhaar: (value) => value.replace(/\D/g, '').slice(0, 12),
  uhid: (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
  name: (value) => value.replace(/[^a-zA-Z\s'-]/g, '').slice(0, 100),
  numeric: (value) => value.replace(/\D/g, ''),
  alphanumeric: (value) => value.replace(/[^a-zA-Z0-9\s]/g, ''),
  email: (value) => value.toLowerCase().trim(),
  text: (value) => value // Don't trim during input, only on submit
};

export default {
  validators,
  ValidationSchema,
  validationSchemas,
  validateField,
  formatValidationErrors,
  sanitizers,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES
};
