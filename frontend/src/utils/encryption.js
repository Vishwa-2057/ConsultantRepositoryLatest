/**
 * Encryption utilities for sensitive healthcare data
 * Provides AES-256-GCM encryption for data at rest and in transit
 */

class HealthcareEncryption {
  constructor() {
    // Generate or retrieve encryption key from secure storage
    this.encryptionKey = this.getOrGenerateKey();
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
  }

  /**
   * Get or generate encryption key
   * In production, this should be managed by a secure key management service
   */
  getOrGenerateKey() {
    let key = localStorage.getItem('hc_encryption_key');
    if (!key) {
      // Generate a new 256-bit key
      const keyArray = new Uint8Array(32);
      crypto.getRandomValues(keyArray);
      key = Array.from(keyArray).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Store securely (in production, use secure key storage)
      localStorage.setItem('hc_encryption_key', key);
    }
    return key;
  }

  /**
   * Convert hex string to Uint8Array
   */
  hexToUint8Array(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Convert Uint8Array to hex string
   */
  uint8ArrayToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * @param {string} plaintext - Data to encrypt
   * @returns {Promise<string>} - Encrypted data as hex string with IV prepended
   */
  async encrypt(plaintext) {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        return plaintext; // Return as-is if not a string
      }

      // Generate random IV (12 bytes for GCM)
      const iv = new Uint8Array(12);
      crypto.getRandomValues(iv);

      // Import key
      const keyBytes = this.hexToUint8Array(this.encryptionKey);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: this.algorithm },
        false,
        ['encrypt']
      );

      // Encrypt data
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        cryptoKey,
        data
      );

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return this.uint8ArrayToHex(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      return plaintext; // Fallback to plaintext if encryption fails
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedHex - Encrypted data as hex string
   * @returns {Promise<string>} - Decrypted plaintext
   */
  async decrypt(encryptedHex) {
    try {
      if (!encryptedHex || typeof encryptedHex !== 'string') {
        return encryptedHex; // Return as-is if not a string
      }

      // Convert hex to bytes
      const combined = this.hexToUint8Array(encryptedHex);
      
      // Extract IV (first 12 bytes) and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Import key
      const keyBytes = this.hexToUint8Array(this.encryptionKey);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: this.algorithm },
        false,
        ['decrypt']
      );

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        cryptoKey,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedHex; // Return as-is if decryption fails
    }
  }

  /**
   * Encrypt sensitive fields in audit log data
   * @param {Object} auditData - Audit log entry
   * @returns {Promise<Object>} - Audit data with encrypted sensitive fields
   */
  async encryptAuditData(auditData) {
    if (!auditData || typeof auditData !== 'object') {
      return auditData;
    }

    const encrypted = { ...auditData };

    // Define sensitive fields that should be encrypted
    const sensitiveFields = [
      'userEmail',
      'userName',
      'details.patientName',
      'details.searchQuery',
      'details.fileName',
      'ipAddress',
      'userAgent'
    ];

    // Encrypt sensitive fields
    for (const field of sensitiveFields) {
      const value = this.getNestedValue(encrypted, field);
      if (value && typeof value === 'string') {
        const encryptedValue = await this.encrypt(value);
        this.setNestedValue(encrypted, field, encryptedValue);
      }
    }

    // Mark as encrypted
    encrypted._encrypted = true;
    encrypted._encryptionVersion = '1.0';

    return encrypted;
  }

  /**
   * Decrypt sensitive fields in audit log data
   * @param {Object} auditData - Encrypted audit log entry
   * @returns {Promise<Object>} - Audit data with decrypted sensitive fields
   */
  async decryptAuditData(auditData) {
    if (!auditData || typeof auditData !== 'object' || !auditData._encrypted) {
      return auditData;
    }

    const decrypted = { ...auditData };

    // Define sensitive fields that should be decrypted
    const sensitiveFields = [
      'userEmail',
      'userName',
      'details.patientName',
      'details.searchQuery',
      'details.fileName',
      'ipAddress',
      'userAgent'
    ];

    // Decrypt sensitive fields
    for (const field of sensitiveFields) {
      const value = this.getNestedValue(decrypted, field);
      if (value && typeof value === 'string') {
        const decryptedValue = await this.decrypt(value);
        this.setNestedValue(decrypted, field, decryptedValue);
      }
    }

    // Remove encryption markers
    delete decrypted._encrypted;
    delete decrypted._encryptionVersion;

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
   * Encrypt data for localStorage storage
   * @param {string} key - Storage key
   * @param {any} data - Data to store
   */
  async encryptAndStore(key, data) {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = await this.encrypt(jsonString);
      localStorage.setItem(`encrypted_${key}`, encrypted);
    } catch (error) {
      console.error('Failed to encrypt and store data:', error);
      // Fallback to regular storage (not recommended for production)
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  /**
   * Decrypt data from localStorage
   * @param {string} key - Storage key
   * @returns {Promise<any>} - Decrypted data
   */
  async decryptAndRetrieve(key) {
    try {
      const encrypted = localStorage.getItem(`encrypted_${key}`);
      if (!encrypted) {
        // Try fallback to unencrypted storage
        const fallback = localStorage.getItem(key);
        if (!fallback) return null;
        
        try {
          return JSON.parse(fallback);
        } catch (parseError) {
          console.warn('Corrupted fallback data, clearing:', key);
          localStorage.removeItem(key);
          return null;
        }
      }

      const decrypted = await this.decrypt(encrypted);
      try {
        return JSON.parse(decrypted);
      } catch (parseError) {
        console.warn('Corrupted encrypted data, clearing:', key);
        localStorage.removeItem(`encrypted_${key}`);
        return null;
      }
    } catch (error) {
      console.error('Failed to decrypt and retrieve data:', error);
      // Clean up corrupted data
      localStorage.removeItem(`encrypted_${key}`);
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Generate secure hash for data integrity verification
   * @param {string} data - Data to hash
   * @returns {Promise<string>} - SHA-256 hash as hex string
   */
  async generateHash(data) {
    try {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
      const hashArray = new Uint8Array(hashBuffer);
      return this.uint8ArrayToHex(hashArray);
    } catch (error) {
      console.error('Hash generation failed:', error);
      return '';
    }
  }

  /**
   * Verify data integrity using hash
   * @param {string} data - Original data
   * @param {string} expectedHash - Expected hash
   * @returns {Promise<boolean>} - True if hash matches
   */
  async verifyHash(data, expectedHash) {
    try {
      const actualHash = await this.generateHash(data);
      return actualHash === expectedHash;
    } catch (error) {
      console.error('Hash verification failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const healthcareEncryption = new HealthcareEncryption();

export default healthcareEncryption;
export { HealthcareEncryption };
