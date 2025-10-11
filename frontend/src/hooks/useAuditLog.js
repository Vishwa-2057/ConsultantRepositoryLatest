/**
 * React Hook for Audit Logging
 * Provides easy-to-use audit logging functions for React components
 */

import React, { useCallback, useEffect } from 'react';
import auditLogger, { AUDIT_EVENTS, RISK_LEVELS, SENSITIVITY_LEVELS } from '@/utils/auditLogger';

export const useAuditLog = () => {
  // Log component mount/unmount for sensitive components
  const logComponentAccess = useCallback((componentName, action = 'MOUNT') => {
    auditLogger.logEvent(
      AUDIT_EVENTS.PATIENT_LIST_ACCESS,
      {
        componentName,
        action,
        accessTime: new Date().toISOString()
      },
      RISK_LEVELS.LOW,
      SENSITIVITY_LEVELS.INTERNAL
    );
  }, []);

  // Log patient data access
  const logPatientAccess = useCallback((patientId, patientName, accessType = 'VIEW') => {
    return auditLogger.logPatientAccess(patientId, patientName, accessType);
  }, []);

  // Log medical record access
  const logMedicalRecordAccess = useCallback((patientId, recordType, recordId) => {
    return auditLogger.logMedicalRecordAccess(patientId, recordType, recordId);
  }, []);

  // Log prescription access
  const logPrescriptionAccess = useCallback((prescriptionId, patientId, action = 'VIEW') => {
    return auditLogger.logPrescriptionAccess(prescriptionId, patientId, action);
  }, []);

  // Log appointment access
  const logAppointmentAccess = useCallback((appointmentId, patientId, doctorId, action = 'VIEW') => {
    return auditLogger.logAppointmentAccess(appointmentId, patientId, doctorId, action);
  }, []);

  // Log search operations
  const logSearch = useCallback((searchType, searchQuery, resultCount = 0) => {
    auditLogger.logEvent(
      AUDIT_EVENTS.PATIENT_SEARCH,
      {
        searchType,
        searchQuery: searchQuery.length > 100 ? searchQuery.substring(0, 100) + '...' : searchQuery,
        resultCount,
        searchTime: new Date().toISOString()
      },
      RISK_LEVELS.MEDIUM,
      SENSITIVITY_LEVELS.CONFIDENTIAL
    );
  }, []);

  // Log data export
  const logDataExport = useCallback((dataType, recordCount, exportFormat) => {
    return auditLogger.logDataExport(dataType, recordCount, exportFormat);
  }, []);

  // Log print operations
  const logPrint = useCallback((documentType, documentId, patientId = null) => {
    auditLogger.logEvent(
      AUDIT_EVENTS.PRINT_RECORD,
      {
        documentType,
        documentId,
        patientId,
        printTime: new Date().toISOString()
      },
      RISK_LEVELS.HIGH,
      SENSITIVITY_LEVELS.RESTRICTED
    );
  }, []);

  // Log file downloads
  const logDownload = useCallback((fileName, fileType, patientId = null) => {
    auditLogger.logEvent(
      AUDIT_EVENTS.DOWNLOAD_DOCUMENT,
      {
        fileName,
        fileType,
        patientId,
        downloadTime: new Date().toISOString()
      },
      RISK_LEVELS.HIGH,
      SENSITIVITY_LEVELS.RESTRICTED
    );
  }, []);

  // Log form submissions
  const logFormSubmission = useCallback((formType, action, recordId = null, patientId = null) => {
    const eventType = action === 'CREATE' ? 
      `${formType.toUpperCase()}_CREATE` : 
      `${formType.toUpperCase()}_UPDATE`;

    auditLogger.logEvent(
      AUDIT_EVENTS[eventType] || AUDIT_EVENTS.PATIENT_UPDATE,
      {
        formType,
        action,
        recordId,
        patientId,
        submissionTime: new Date().toISOString()
      },
      RISK_LEVELS.MEDIUM,
      SENSITIVITY_LEVELS.CONFIDENTIAL
    );
  }, []);

  // Log unauthorized access attempts
  const logUnauthorizedAccess = useCallback((attemptedResource, reason = '') => {
    auditLogger.logSecurityEvent(
      AUDIT_EVENTS.UNAUTHORIZED_ACCESS,
      {
        attemptedResource,
        reason,
        attemptTime: new Date().toISOString()
      }
    );
  }, []);

  // Log permission denied events
  const logPermissionDenied = useCallback((resource, requiredPermission) => {
    auditLogger.logSecurityEvent(
      AUDIT_EVENTS.PERMISSION_DENIED,
      {
        resource,
        requiredPermission,
        deniedTime: new Date().toISOString()
      }
    );
  }, []);

  // Log bulk operations
  const logBulkOperation = useCallback((operation, recordCount, affectedRecords = []) => {
    return auditLogger.logBulkOperation(operation, recordCount, affectedRecords);
  }, []);

  // Log page/component views for sensitive areas
  const logPageView = useCallback((pageName, pageType = 'MEDICAL_DATA') => {
    auditLogger.logEvent(
      AUDIT_EVENTS.PATIENT_LIST_ACCESS,
      {
        pageName,
        pageType,
        viewTime: new Date().toISOString(),
        referrer: document.referrer
      },
      RISK_LEVELS.LOW,
      SENSITIVITY_LEVELS.INTERNAL
    );
  }, []);

  return {
    logComponentAccess,
    logPatientAccess,
    logMedicalRecordAccess,
    logPrescriptionAccess,
    logAppointmentAccess,
    logSearch,
    logDataExport,
    logPrint,
    logDownload,
    logFormSubmission,
    logUnauthorizedAccess,
    logPermissionDenied,
    logBulkOperation,
    logPageView
  };
};

// Higher-order component for automatic audit logging
export const withAuditLog = (WrappedComponent, componentName, sensitivityLevel = SENSITIVITY_LEVELS.INTERNAL) => {
  return function AuditLoggedComponent(props) {
    const { logComponentAccess } = useAuditLog();

    useEffect(() => {
      logComponentAccess(componentName, 'MOUNT');
      
      return () => {
        logComponentAccess(componentName, 'UNMOUNT');
      };
    }, [logComponentAccess]);

    return React.createElement(WrappedComponent, props);
  };
};

export default useAuditLog;
