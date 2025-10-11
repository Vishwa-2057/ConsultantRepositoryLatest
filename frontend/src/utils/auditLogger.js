/**
 * Audit Logger for Healthcare System
 * Tracks all medical data access and operations for compliance and security
 */

import { getCurrentUser } from './roleUtils';
import healthcareEncryption from './encryption';

// Audit event types
export const AUDIT_EVENTS = {
  // Data Access Events
  PATIENT_VIEW: 'PATIENT_VIEW',
  PATIENT_SEARCH: 'PATIENT_SEARCH',
  PATIENT_LIST_ACCESS: 'PATIENT_LIST_ACCESS',
  MEDICAL_RECORD_VIEW: 'MEDICAL_RECORD_VIEW',
  PRESCRIPTION_VIEW: 'PRESCRIPTION_VIEW',
  APPOINTMENT_VIEW: 'APPOINTMENT_VIEW',
  TELECONSULTATION_VIEW: 'TELECONSULTATION_VIEW',
  REFERRAL_VIEW: 'REFERRAL_VIEW',
  BILLING_VIEW: 'BILLING_VIEW',
  
  // Data Modification Events
  PATIENT_CREATE: 'PATIENT_CREATE',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PATIENT_DELETE: 'PATIENT_DELETE',
  PRESCRIPTION_CREATE: 'PRESCRIPTION_CREATE',
  PRESCRIPTION_UPDATE: 'PRESCRIPTION_UPDATE',
  PRESCRIPTION_DELETE: 'PRESCRIPTION_DELETE',
  APPOINTMENT_CREATE: 'APPOINTMENT_CREATE',
  APPOINTMENT_UPDATE: 'APPOINTMENT_UPDATE',
  APPOINTMENT_DELETE: 'APPOINTMENT_DELETE',
  TELECONSULTATION_CREATE: 'TELECONSULTATION_CREATE',
  TELECONSULTATION_UPDATE: 'TELECONSULTATION_UPDATE',
  REFERRAL_CREATE: 'REFERRAL_CREATE',
  REFERRAL_UPDATE: 'REFERRAL_UPDATE',
  BILLING_CREATE: 'BILLING_CREATE',
  BILLING_UPDATE: 'BILLING_UPDATE',
  
  // Authentication Events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  
  // System Events
  EXPORT_DATA: 'EXPORT_DATA',
  PRINT_RECORD: 'PRINT_RECORD',
  DOWNLOAD_DOCUMENT: 'DOWNLOAD_DOCUMENT',
  BULK_OPERATION: 'BULK_OPERATION',
  
  // Security Events
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY'
};

// Risk levels for audit events
export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Data sensitivity levels
export const SENSITIVITY_LEVELS = {
  PUBLIC: 'PUBLIC',
  INTERNAL: 'INTERNAL',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED'
};

class AuditLogger {
  constructor() {
    this.apiEndpoint = 'http://localhost:5000/api/audit-logs';
    this.batchSize = 10;
    this.batchTimeout = 5000; // 5 seconds
    this.pendingLogs = [];
    this.batchTimer = null;
  }

  /**
   * Log an audit event
   * @param {string} eventType - Type of event from AUDIT_EVENTS
   * @param {Object} details - Event details
   * @param {string} riskLevel - Risk level from RISK_LEVELS
   * @param {string} sensitivityLevel - Data sensitivity from SENSITIVITY_LEVELS
   */
  async logEvent(eventType, details = {}, riskLevel = RISK_LEVELS.LOW, sensitivityLevel = SENSITIVITY_LEVELS.INTERNAL) {
    try {
      const currentUser = getCurrentUser();
      const timestamp = new Date().toISOString();
      
      const auditEntry = {
        eventType,
        timestamp,
        userId: currentUser?.id || currentUser?._id || 'anonymous',
        userEmail: currentUser?.email || 'unknown',
        userRole: currentUser?.role || 'unknown',
        userName: currentUser?.fullName || currentUser?.name || 'Unknown User',
        riskLevel,
        sensitivityLevel,
        sessionId: this.getSessionId(),
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        details: {
          ...details,
          browserInfo: this.getBrowserInfo(),
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      // Encrypt sensitive data before storing
      const encryptedEntry = await healthcareEncryption.encryptAuditData(auditEntry);

      // Add to pending logs for batch processing
      this.pendingLogs.push(encryptedEntry);

      // For high-risk events, send immediately
      if (riskLevel === RISK_LEVELS.HIGH || riskLevel === RISK_LEVELS.CRITICAL) {
        await this.sendImmediately(encryptedEntry);
      } else if (this.pendingLogs.length >= this.batchSize) {
        await this.sendBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.sendBatch();
        }, this.batchTimeout);
      }

    } catch (error) {
      console.error('Audit logging failed:', error);
      // Store in local storage as fallback
      this.storeLocalFallback(eventType, details, riskLevel);
    }
  }

  /**
   * Log patient data access
   */
  async logPatientAccess(patientId, patientName, accessType = 'VIEW') {
    await this.logEvent(
      AUDIT_EVENTS.PATIENT_VIEW,
      {
        patientId,
        patientName,
        accessType,
        dataAccessed: ['demographics', 'contact_info']
      },
      RISK_LEVELS.MEDIUM,
      SENSITIVITY_LEVELS.CONFIDENTIAL
    );
  }

  /**
   * Log medical record access
   */
  async logMedicalRecordAccess(patientId, recordType, recordId) {
    await this.logEvent(
      AUDIT_EVENTS.MEDICAL_RECORD_VIEW,
      {
        patientId,
        recordType,
        recordId,
        dataAccessed: [recordType]
      },
      RISK_LEVELS.HIGH,
      SENSITIVITY_LEVELS.RESTRICTED
    );
  }

  /**
   * Log prescription access
   */
  async logPrescriptionAccess(prescriptionId, patientId, action = 'VIEW') {
    await this.logEvent(
      action === 'VIEW' ? AUDIT_EVENTS.PRESCRIPTION_VIEW : AUDIT_EVENTS.PRESCRIPTION_UPDATE,
      {
        prescriptionId,
        patientId,
        action,
        dataAccessed: ['medications', 'dosage', 'diagnosis']
      },
      RISK_LEVELS.HIGH,
      SENSITIVITY_LEVELS.RESTRICTED
    );
  }

  /**
   * Log appointment access
   */
  async logAppointmentAccess(appointmentId, patientId, doctorId, action = 'VIEW') {
    await this.logEvent(
      action === 'VIEW' ? AUDIT_EVENTS.APPOINTMENT_VIEW : AUDIT_EVENTS.APPOINTMENT_UPDATE,
      {
        appointmentId,
        patientId,
        doctorId,
        action,
        dataAccessed: ['appointment_details', 'patient_info']
      },
      RISK_LEVELS.MEDIUM,
      SENSITIVITY_LEVELS.CONFIDENTIAL
    );
  }

  /**
   * Log data export/download
   */
  async logDataExport(dataType, recordCount, exportFormat) {
    await this.logEvent(
      AUDIT_EVENTS.EXPORT_DATA,
      {
        dataType,
        recordCount,
        exportFormat,
        exportedAt: new Date().toISOString()
      },
      RISK_LEVELS.HIGH,
      SENSITIVITY_LEVELS.RESTRICTED
    );
  }

  /**
   * Log authentication events
   */
  async logAuthentication(eventType, success = true, details = {}) {
    await this.logEvent(
      success ? AUDIT_EVENTS.LOGIN_SUCCESS : AUDIT_EVENTS.LOGIN_FAILURE,
      {
        success,
        ...details
      },
      success ? RISK_LEVELS.LOW : RISK_LEVELS.HIGH,
      SENSITIVITY_LEVELS.INTERNAL
    );
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType, details = {}) {
    await this.logEvent(
      eventType,
      details,
      RISK_LEVELS.CRITICAL,
      SENSITIVITY_LEVELS.RESTRICTED
    );
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(operation, recordCount, affectedRecords = []) {
    await this.logEvent(
      AUDIT_EVENTS.BULK_OPERATION,
      {
        operation,
        recordCount,
        affectedRecords: affectedRecords.slice(0, 100), // Limit to first 100 for storage
        bulkOperationId: this.generateBulkId()
      },
      RISK_LEVELS.MEDIUM,
      SENSITIVITY_LEVELS.INTERNAL
    );
  }

  /**
   * Send batch of audit logs
   */
  async sendBatch() {
    if (this.pendingLogs.length === 0) return;

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      // Temporarily disabled - store in localStorage instead
      console.log(`Audit logs (${logsToSend.length} entries) stored locally - backend connection pending`);
      await this.storeInLocalStorage(logsToSend);
      return;

      /* Commented out until backend is working
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ logs: logsToSend })
      });

      if (!response.ok) {
        throw new Error(`Audit log submission failed: ${response.statusText}`);
      }

      console.log(`Successfully sent ${logsToSend.length} audit logs`);
      */
    } catch (error) {
      console.error('Failed to send audit logs:', error);
      
      // Store failed logs in localStorage as fallback
      this.storeInLocalStorage(logsToSend);
    }
  }

  /**
   * Send audit log immediately for high-risk events
   */
  async sendImmediately(auditEntry) {
    try {
      const response = await fetch(`${this.apiEndpoint}/immediate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(auditEntry)
      });

      if (!response.ok) {
        throw new Error(`Immediate audit log failed: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Failed to send immediate audit log:', error);
      this.storeLocalFallback(auditEntry.eventType, auditEntry.details, auditEntry.riskLevel);
    }
  }

  /**
   * Store audit log in local storage as fallback
   */
  storeLocalFallback(eventType, details, riskLevel) {
    try {
      const fallbackLogs = JSON.parse(localStorage.getItem('auditLogsFallback') || '[]');
      fallbackLogs.push({
        eventType,
        details,
        riskLevel,
        timestamp: new Date().toISOString(),
        userId: getCurrentUser()?.id || 'unknown'
      });

      // Keep only last 100 fallback logs
      if (fallbackLogs.length > 100) {
        fallbackLogs.splice(0, fallbackLogs.length - 100);
      }

      localStorage.setItem('auditLogsFallback', JSON.stringify(fallbackLogs));
    } catch (error) {
      console.error('Failed to store fallback audit log:', error);
    }
  }

  /**
   * Store audit logs in localStorage with encryption
   */
  async storeInLocalStorage(logs) {
    try {
      const existingLogs = await healthcareEncryption.decryptAndRetrieve('auditLogsFallback') || [];
      const updatedLogs = [...existingLogs, ...logs];
      
      // Keep only last 1000 logs to prevent storage overflow
      const trimmedLogs = updatedLogs.slice(-1000);
      
      await healthcareEncryption.encryptAndStore('auditLogsFallback', trimmedLogs);
      console.log(`🔒 Encrypted and stored ${logs.length} audit logs locally`);
    } catch (error) {
      console.error('Failed to store encrypted audit logs:', error);
      // Fallback to unencrypted storage
      try {
        const existingLogs = JSON.parse(localStorage.getItem('auditLogsFallback') || '[]');
        const updatedLogs = [...existingLogs, ...logs].slice(-1000);
        localStorage.setItem('auditLogsFallback', JSON.stringify(updatedLogs));
      } catch (fallbackError) {
        console.error('Failed to store audit logs even without encryption:', fallbackError);
      }
    }
  }

  /**
   * Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('auditSessionId');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('auditSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate bulk operation ID
   */
  generateBulkId() {
    return 'bulk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get client IP address (best effort)
   */
  async getClientIP() {
    try {
      // This would typically be handled by the backend
      return 'client-side-unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    
    return {
      name: browser,
      version: this.getBrowserVersion(ua, browser),
      platform: navigator.platform,
      language: navigator.language
    };
  }

  /**
   * Get browser version
   */
  getBrowserVersion(ua, browser) {
    const match = ua.match(new RegExp(browser + '/([0-9.]+)'));
    return match ? match[1] : 'Unknown';
  }

  /**
   * Flush all pending logs (call on page unload)
   */
  async flush() {
    if (this.pendingLogs.length > 0) {
      await this.sendBatch();
    }
  }
}

// Create singleton instance
const auditLogger = new AuditLogger();

// Flush logs on page unload
window.addEventListener('beforeunload', () => {
  auditLogger.flush();
});

export default auditLogger;
export { auditLogger };
