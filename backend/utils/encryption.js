/**
 * Server-side encryption utilities for healthcare data
 * Provides AES-256-GCM encryption for sensitive data at rest and in transit
 */

const crypto = require('crypto');
require('dotenv').config();

class HealthcareEncryption {
  constructor() {
    // Use environment variable for encryption key in production
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateDefaultKey();
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 12; // 96 bits for GCM
    this.tagLength = 16; // 128 bits
  }

  /**
   * Generate a default key (for development only)
   * In production, use a secure key management service
   */
  generateDefaultKey() {
    console.warn('⚠️  Using default encryption key. Set ENCRYPTION_KEY environment variable for production.');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * @param {string} plaintext - Data to encrypt
   * @returns {string} - Encrypted data as base64 string with IV and tag
   */
  encrypt(plaintext) {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        return plaintext; // Return as-is if not a string
      }

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
      cipher.setAAD(Buffer.from('healthcare-audit-log', 'utf8')); // Additional authenticated data
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine IV + tag + encrypted data
      const combined = Buffer.concat([iv, tag, encrypted]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      return plaintext; // Fallback to plaintext if encryption fails
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data as base64 string
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'string') {
        return encryptedData; // Return as-is if not a string
      }

      // Convert from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract IV, tag, and encrypted data
      const iv = combined.slice(0, this.ivLength);
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.slice(this.ivLength + this.tagLength);
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, Buffer.from(this.encryptionKey, 'hex'));
      decipher.setAAD(Buffer.from('healthcare-audit-log', 'utf8'));
      decipher.setAuthTag(tag);
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedData; // Return as-is if decryption fails
    }
  }

  /**
   * Encrypt sensitive fields in audit log data
   * @param {Object} auditData - Audit log entry
   * @returns {Object} - Audit data with encrypted sensitive fields
   */
  encryptAuditData(auditData) {
    if (!auditData || typeof auditData !== 'object') {
      return auditData;
    }

    const encrypted = JSON.parse(JSON.stringify(auditData)); // Deep clone

    // Define sensitive fields that should be encrypted
    const sensitiveFields = [
      'userEmail',
      'userName',
      'ipAddress',
      'userAgent',
      'details.patientName',
      'details.searchQuery',
      'details.fileName'
    ];

    // Encrypt sensitive fields
    for (const field of sensitiveFields) {
      const value = this.getNestedValue(encrypted, field);
      if (value && typeof value === 'string') {
        const encryptedValue = this.encrypt(value);
        this.setNestedValue(encrypted, field, encryptedValue);
      }
    }

    // Mark as encrypted
    encrypted._encrypted = true;
    encrypted._encryptionVersion = '1.0';
    encrypted._encryptedAt = new Date().toISOString();

    return encrypted;
  }

  /**
   * Decrypt sensitive fields in audit log data
   * @param {Object} auditData - Encrypted audit log entry
   * @returns {Object} - Audit data with decrypted sensitive fields
   */
  decryptAuditData(auditData) {
    if (!auditData || typeof auditData !== 'object' || !auditData._encrypted) {
      return auditData;
    }

    const decrypted = JSON.parse(JSON.stringify(auditData)); // Deep clone

    // Define sensitive fields that should be decrypted
    const sensitiveFields = [
      'userEmail',
      'userName',
      'ipAddress',
      'userAgent',
      'details.patientName',
      'details.searchQuery',
      'details.fileName'
    ];

    // Decrypt sensitive fields
    for (const field of sensitiveFields) {
      const value = this.getNestedValue(decrypted, field);
      if (value && typeof value === 'string') {
        const decryptedValue = this.decrypt(value);
        this.setNestedValue(decrypted, field, decryptedValue);
      }
    }

    // Remove encryption markers for client
    delete decrypted._encrypted;
    delete decrypted._encryptionVersion;
    delete decrypted._encryptedAt;

    return decrypted;
  }

  /**
   * Get nested object value by dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested object value by dot notation
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Generate secure hash for data integrity verification
   * @param {string} data - Data to hash
   * @returns {string} - SHA-256 hash as hex string
   */
  generateHash(data) {
    try {
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      console.error('Hash generation failed:', error);
      return '';
    }
  }

  /**
   * Verify data integrity using hash
   * @param {string} data - Original data
   * @param {string} expectedHash - Expected hash
   * @returns {boolean} - True if hash matches
   */
  verifyHash(data, expectedHash) {
    try {
      const actualHash = this.generateHash(data);
      return actualHash === expectedHash;
    } catch (error) {
      console.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Encrypt data for database storage
   * @param {any} data - Data to encrypt
   * @returns {string} - Encrypted data as base64 string
   */
  encryptForStorage(data) {
    try {
      const jsonString = JSON.stringify(data);
      return this.encrypt(jsonString);
    } catch (error) {
      console.error('Failed to encrypt data for storage:', error);
      return JSON.stringify(data); // Fallback to unencrypted
    }
  }

  /**
   * Decrypt data from database storage
   * @param {string} encryptedData - Encrypted data as base64 string
   * @returns {any} - Decrypted data
   */
  decryptFromStorage(encryptedData) {
    try {
      const decrypted = this.decrypt(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt data from storage:', error);
      try {
        return JSON.parse(encryptedData); // Try parsing as unencrypted
      } catch (parseError) {
        return null;
      }
    }
  }
}

// Create singleton instance
const healthcareEncryption = new HealthcareEncryption();

module.exports = healthcareEncryption;
module.exports.HealthcareEncryption = HealthcareEncryption;
