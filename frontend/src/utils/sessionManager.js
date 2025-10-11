/**
 * Secure Session Management for Healthcare System
 * Handles JWT tokens, session security, and automatic token refresh
 */

import healthcareEncryption from './encryption';

class SessionManager {
  constructor() {
    this.tokenKey = 'authToken';
    this.refreshTokenKey = 'refreshToken';
    this.sessionDataKey = 'sessionData';
    this.tokenExpiryKey = 'tokenExpiry';
    this.sessionTimeoutKey = 'sessionTimeout';
    
    // Session configuration (longer timeouts in development)
    this.sessionTimeout = process.env.NODE_ENV === 'development' 
      ? 2 * 60 * 60 * 1000  // 2 hours in development
      : 30 * 60 * 1000;     // 30 minutes in production
    this.tokenRefreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry
    this.maxSessionDuration = process.env.NODE_ENV === 'development'
      ? 12 * 60 * 60 * 1000 // 12 hours in development
      : 8 * 60 * 60 * 1000; // 8 hours in production
    
    // Security settings
    this.maxFailedAttempts = 3;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    
    // Error tracking to prevent infinite loops
    this.errorCount = 0;
    this.maxErrors = 3;
    
    // Check for corrupted data before initializing (skip in development for now)
    if (process.env.NODE_ENV !== 'development') {
      this.checkAndCleanCorruptedData();
    }
    
    // Initialize session monitoring
    this.initializeSessionMonitoring();
    this.setupActivityTracking();
  }

  /**
   * Check and clean corrupted data before initialization
   */
  checkAndCleanCorruptedData() {
    try {
      // Check if sessionData exists and try to parse it
      const sessionData = localStorage.getItem(this.sessionDataKey);
      if (sessionData) {
        // Quick check: if data is obviously invalid (too short or empty)
        if (sessionData.length < 10 || sessionData === 'null' || sessionData === 'undefined') {
          console.warn('🧹 Invalid session data format, clearing...');
          this.performEmergencyCleanup();
          return;
        }
        
        // Log the data format for debugging (remove in production)
        if (process.env.NODE_ENV === 'development') {
          console.log('Session data format check:', {
            length: sessionData.length,
            firstChars: sessionData.substring(0, 20),
            lastChars: sessionData.substring(sessionData.length - 10)
          });
        }
        
        // Try to decrypt synchronously with timeout
        try {
          // Set a flag to prevent recursive calls
          if (window.sessionCleanupInProgress) {
            return;
          }
          window.sessionCleanupInProgress = true;
          
          healthcareEncryption.decrypt(sessionData).then(decrypted => {
            try {
              JSON.parse(decrypted);
              window.sessionCleanupInProgress = false;
            } catch (parseError) {
              console.warn('🧹 Detected corrupted session data, clearing...');
              this.performEmergencyCleanup();
              window.sessionCleanupInProgress = false;
            }
          }).catch(decryptError => {
            console.warn('🧹 Detected corrupted encrypted data, clearing...');
            this.performEmergencyCleanup();
            window.sessionCleanupInProgress = false;
          });
        } catch (syncError) {
          console.warn('🧹 Synchronous error checking session data, clearing...');
          this.performEmergencyCleanup();
          window.sessionCleanupInProgress = false;
        }
      }
    } catch (error) {
      console.warn('🧹 Error checking session data, performing cleanup...');
      this.performEmergencyCleanup();
    }
  }

  /**
   * Initialize session monitoring and cleanup
   */
  initializeSessionMonitoring() {
    // Check for expired sessions on load (with error recovery)
    // In development, be more lenient with initial validation
    if (process.env.NODE_ENV === 'development') {
      this.validateSession().catch(error => {
        console.warn('Initial session validation failed in development:', error);
        // Don't perform emergency cleanup in development
      });
    } else {
      this.validateSession().catch(error => {
        console.error('Initial session validation failed:', error);
        this.performEmergencyCleanup();
      });
    }
    
    // Set up periodic session validation (much less frequent in development)
    const checkInterval = process.env.NODE_ENV === 'development' ? 600000 : 60000; // 10 min in dev, 1 min in prod
    this.sessionCheckInterval = setInterval(() => {
      this.validateSession().catch(error => {
        console.warn('Periodic session validation failed:', error);
        // Don't perform cleanup on periodic checks in development
        if (process.env.NODE_ENV !== 'development') {
          this.performEmergencyCleanup();
        }
      });
    }, checkInterval);
    
    // Set up token refresh monitoring
    this.tokenRefreshInterval = setInterval(() => {
      this.checkTokenRefresh();
    }, 30000); // Check every 30 seconds
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.validateSession();
      }
    });
    
    // Handle beforeunload for cleanup
    window.addEventListener('beforeunload', () => {
      this.updateLastActivity();
    });
  }

  /**
   * Set up user activity tracking
   */
  setupActivityTracking() {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      this.updateLastActivity();
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  /**
   * Secure token storage with encryption
   */
  async setToken(token, refreshToken = null, expiresIn = 3600) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      // Calculate expiry time
      const expiryTime = Date.now() + (expiresIn * 1000);
      
      // Encrypt tokens before storage
      const encryptedToken = await healthcareEncryption.encrypt(token);
      const encryptedRefreshToken = refreshToken ? 
        await healthcareEncryption.encrypt(refreshToken) : null;
      
      // Store encrypted tokens
      localStorage.setItem(this.tokenKey, encryptedToken);
      localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
      
      if (encryptedRefreshToken) {
        localStorage.setItem(this.refreshTokenKey, encryptedRefreshToken);
      }
      
      // Update session data
      await this.updateSessionData({
        loginTime: Date.now(),
        lastActivity: Date.now(),
        sessionId: this.generateSessionId(),
        deviceFingerprint: await this.generateDeviceFingerprint()
      });
      
      console.log('🔐 Secure token storage completed');
      return true;
    } catch (error) {
      console.error('Failed to store token securely:', error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt token
   */
  async getToken() {
    try {
      const encryptedToken = localStorage.getItem(this.tokenKey);
      if (!encryptedToken) {
        return null;
      }
      
      // Check if token is expired
      if (this.isTokenExpired()) {
        await this.clearSession();
        return null;
      }
      
      // Decrypt token
      const token = await healthcareEncryption.decrypt(encryptedToken);
      return token;
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      await this.clearSession();
      return null;
    }
  }

  /**
   * Get refresh token
   */
  async getRefreshToken() {
    try {
      const encryptedRefreshToken = localStorage.getItem(this.refreshTokenKey);
      if (!encryptedRefreshToken) {
        return null;
      }
      
      return await healthcareEncryption.decrypt(encryptedRefreshToken);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired() {
    const expiryTime = localStorage.getItem(this.tokenExpiryKey);
    if (!expiryTime) {
      return true;
    }
    
    return Date.now() >= parseInt(expiryTime);
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh() {
    const expiryTime = localStorage.getItem(this.tokenExpiryKey);
    if (!expiryTime) {
      return false;
    }
    
    const timeUntilExpiry = parseInt(expiryTime) - Date.now();
    return timeUntilExpiry <= this.tokenRefreshThreshold;
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      if (data.success) {
        await this.setToken(data.token, data.refreshToken, data.expiresIn);
        console.log('🔄 Token refreshed successfully');
        return data.token;
      } else {
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearSession();
      window.location.href = '/login';
      return null;
    }
  }

  /**
   * Check and perform token refresh if needed
   */
  async checkTokenRefresh() {
    if (this.needsRefresh()) {
      return await this.refreshAuthToken();
    }
    return await this.getToken();
  }

  /**
   * Validate current session
   */
  async validateSession() {
    try {
      // Circuit breaker: if cleanup is in progress, skip validation
      if (window.sessionCleanupInProgress) {
        return false;
      }
      
      const sessionData = await this.getSessionData();
      if (!sessionData) {
        return false;
      }
      
      // Check session timeout
      const timeSinceLastActivity = Date.now() - sessionData.lastActivity;
      if (timeSinceLastActivity > this.sessionTimeout) {
        console.log('Session expired due to inactivity');
        await this.clearSession();
        this.redirectToLogin('Session expired due to inactivity');
        return false;
      }
      
      // Check maximum session duration
      const sessionDuration = Date.now() - sessionData.loginTime;
      if (sessionDuration > this.maxSessionDuration) {
        console.log('Session expired due to maximum duration');
        await this.clearSession();
        this.redirectToLogin('Session expired. Please log in again.');
        return false;
      }
      
      // Validate device fingerprint (more lenient in development)
      const currentFingerprint = await this.generateDeviceFingerprint();
      if (sessionData.deviceFingerprint !== currentFingerprint) {
        
        // In development mode, silently allow and update fingerprint
        if (process.env.NODE_ENV === 'development') {
          // Only log occasionally to reduce noise
          if (Math.random() < 0.1) { // 10% chance to log
            console.log('🔧 Development: Updated device fingerprint');
          }
          // Update the fingerprint to current one
          sessionData.deviceFingerprint = currentFingerprint;
          const encryptedSessionData = await healthcareEncryption.encrypt(JSON.stringify(sessionData));
          localStorage.setItem(this.sessionDataKey, encryptedSessionData);
        } else {
          // In production, log the security event and terminate
          console.warn('Device fingerprint mismatch detected');
          console.warn('🚨 Production mode: Terminating session for security');
          // In production, terminate session for security
          await this.clearSession();
          this.redirectToLogin('Security alert: Session terminated due to device change');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      await this.clearSession();
      return false;
    }
  }

  /**
   * Update session data
   */
  async updateSessionData(data) {
    try {
      const existingData = await this.getSessionData() || {};
      const updatedData = { ...existingData, ...data };
      
      await healthcareEncryption.encryptAndStore(this.sessionDataKey, updatedData);
    } catch (error) {
      console.error('Failed to update session data:', error);
    }
  }

  /**
   * Get session data
   */
  async getSessionData() {
    try {
      // Increment error count to prevent infinite loops
      this.errorCount++;
      
      // If too many errors, perform emergency cleanup and stop
      if (this.errorCount > this.maxErrors) {
        console.warn('🚨 Too many session errors, performing emergency cleanup');
        this.performEmergencyCleanup();
        this.errorCount = 0; // Reset counter
        return null;
      }
      
      const result = await healthcareEncryption.decryptAndRetrieve(this.sessionDataKey);
      
      // Reset error count on success
      this.errorCount = 0;
      return result;
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
      
      // Clear corrupted session data
      console.warn('🧹 Clearing corrupted session data');
      localStorage.removeItem(this.sessionDataKey);
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.tokenExpiryKey);
      
      return null;
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    this.updateSessionData({ lastActivity: Date.now() });
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
  }

  /**
   * Generate device fingerprint for security
   */
  async generateDeviceFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.cookieEnabled,
      typeof localStorage !== 'undefined',
      typeof sessionStorage !== 'undefined'
    ];
    
    const fingerprint = components.join('|');
    return await healthcareEncryption.generateHash(fingerprint);
  }

  /**
   * Handle failed login attempts
   */
  async handleFailedLogin(email) {
    try {
      const failedAttempts = await this.getFailedAttempts(email);
      const newAttempts = failedAttempts + 1;
      
      await this.setFailedAttempts(email, newAttempts);
      
      if (newAttempts >= this.maxFailedAttempts) {
        await this.lockAccount(email);
        return {
          locked: true,
          attemptsRemaining: 0,
          lockoutDuration: this.lockoutDuration
        };
      }
      
      return {
        locked: false,
        attemptsRemaining: this.maxFailedAttempts - newAttempts,
        lockoutDuration: 0
      };
    } catch (error) {
      console.error('Failed to handle failed login:', error);
      return { locked: false, attemptsRemaining: 1, lockoutDuration: 0 };
    }
  }

  /**
   * Handle successful login
   */
  async handleSuccessfulLogin(email) {
    try {
      await this.clearFailedAttempts(email);
      await this.unlockAccount(email);
    } catch (error) {
      console.error('Failed to handle successful login:', error);
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(email) {
    try {
      const lockData = await healthcareEncryption.decryptAndRetrieve(`account_lock_${email}`);
      if (!lockData) {
        return false;
      }
      
      const timeSinceLock = Date.now() - lockData.lockedAt;
      if (timeSinceLock >= this.lockoutDuration) {
        await this.unlockAccount(email);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to check account lock status:', error);
      return false;
    }
  }

  /**
   * Get failed login attempts count
   */
  async getFailedAttempts(email) {
    try {
      const attempts = await healthcareEncryption.decryptAndRetrieve(`failed_attempts_${email}`);
      return attempts || 0;
    } catch (error) {
      console.error('Failed to get failed attempts:', error);
      return 0;
    }
  }

  /**
   * Set failed login attempts count
   */
  async setFailedAttempts(email, count) {
    try {
      await healthcareEncryption.encryptAndStore(`failed_attempts_${email}`, count);
    } catch (error) {
      console.error('Failed to set failed attempts:', error);
    }
  }

  /**
   * Clear failed login attempts
   */
  async clearFailedAttempts(email) {
    try {
      localStorage.removeItem(`encrypted_failed_attempts_${email}`);
    } catch (error) {
      console.error('Failed to clear failed attempts:', error);
    }
  }

  /**
   * Lock account
   */
  async lockAccount(email) {
    try {
      await healthcareEncryption.encryptAndStore(`account_lock_${email}`, {
        lockedAt: Date.now(),
        reason: 'Too many failed login attempts'
      });
      console.warn(`Account locked for ${email}`);
    } catch (error) {
      console.error('Failed to lock account:', error);
    }
  }

  /**
   * Unlock account
   */
  async unlockAccount(email) {
    try {
      localStorage.removeItem(`encrypted_account_lock_${email}`);
    } catch (error) {
      console.error('Failed to unlock account:', error);
    }
  }

  /**
   * Clear all session data
   */
  async clearSession() {
    try {
      // Clear tokens
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.tokenExpiryKey);
      
      // Clear encrypted session data
      localStorage.removeItem(`encrypted_${this.sessionDataKey}`);
      
      // Clear intervals
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
      }
      if (this.tokenRefreshInterval) {
        clearInterval(this.tokenRefreshInterval);
      }
      
      console.log('🧹 Session cleared successfully');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Redirect to login with message
   */
  redirectToLogin(message = 'Please log in') {
    // Store message for display on login page
    sessionStorage.setItem('loginMessage', message);
    
    // Redirect to login
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  /**
   * Emergency cleanup for corrupted session data
   */
  performEmergencyCleanup() {
    console.warn('🚨 Performing emergency session cleanup');
    
    // Clear all session-related localStorage items
    const keysToRemove = [
      this.tokenKey,
      this.refreshTokenKey,
      this.sessionDataKey,
      this.tokenExpiryKey,
      this.sessionTimeoutKey,
      'authUser', // Also clear user data
      'loginMessage'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage as well
    sessionStorage.clear();
    
    console.log('🧹 Emergency cleanup completed');
  }

  /**
   * Get session info for display
   */
  async getSessionInfo() {
    try {
      const sessionData = await this.getSessionData();
      const expiryTime = localStorage.getItem(this.tokenExpiryKey);
      
      if (!sessionData || !expiryTime) {
        return null;
      }
      
      return {
        sessionId: sessionData.sessionId,
        loginTime: new Date(sessionData.loginTime),
        lastActivity: new Date(sessionData.lastActivity),
        expiresAt: new Date(parseInt(expiryTime)),
        timeUntilExpiry: parseInt(expiryTime) - Date.now(),
        isActive: this.validateSession()
      };
    } catch (error) {
      console.error('Failed to get session info:', error);
      return null;
    }
  }

  /**
   * Extend session (for active users)
   */
  async extendSession() {
    try {
      const currentToken = await this.getToken();
      if (currentToken) {
        // Refresh token to extend session
        return await this.refreshAuthToken();
      }
      return false;
    } catch (error) {
      console.error('Failed to extend session:', error);
      return false;
    }
  }

  /**
   * Cleanup on destroy
   */
  destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;
export { SessionManager };
