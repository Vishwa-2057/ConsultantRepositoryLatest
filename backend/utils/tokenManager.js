/**
 * JWT Token Manager for Healthcare System
 * Handles token generation, validation, and refresh with security features
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

class TokenManager {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || this.generateSecret();
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || this.generateSecret();
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m'; // 15 minutes
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d'; // 7 days
    
    // Security settings
    this.maxRefreshTokens = 5; // Max refresh tokens per user
    this.tokenRotationEnabled = true;
    
    // In-memory blacklist (use Redis in production)
    this.tokenBlacklist = new Set();
    this.refreshTokenStore = new Map(); // user_id -> Set of refresh tokens
    
    this.warnAboutSecrets();
  }

  /**
   * Generate a secure secret for development
   */
  generateSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Warn about using default secrets
   */
  warnAboutSecrets() {
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn('⚠️  Using generated JWT secrets. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET environment variables for production.');
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload) {
    try {
      const tokenPayload = {
        ...payload,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID() // Unique token ID
      };

      return jwt.sign(tokenPayload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'healthcare-system',
        audience: 'healthcare-users'
      });
    } catch (error) {
      console.error('Access token generation failed:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    try {
      const tokenPayload = {
        userId: payload.id || payload.userId,
        email: payload.email,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID()
      };

      const refreshToken = jwt.sign(tokenPayload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'healthcare-system',
        audience: 'healthcare-users'
      });

      // Store refresh token
      this.storeRefreshToken(payload.id || payload.userId, refreshToken);

      return refreshToken;
    } catch (error) {
      console.error('Refresh token generation failed:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  generateTokenPair(user) {
    try {
      const payload = {
        id: user._id || user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName || user.name,
        clinicId: user.clinicId
      };

      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      return {
        accessToken,
        refreshToken,
        expiresIn: this.getExpirySeconds(this.accessTokenExpiry)
      };
    } catch (error) {
      console.error('Token pair generation failed:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      if (this.isTokenBlacklisted(token)) {
        throw new Error('Token is blacklisted');
      }

      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'healthcare-system',
        audience: 'healthcare-users'
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      if (this.isTokenBlacklisted(token)) {
        throw new Error('Refresh token is blacklisted');
      }

      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'healthcare-system',
        audience: 'healthcare-users'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token is stored
      if (!this.isRefreshTokenValid(decoded.userId, token)) {
        throw new Error('Refresh token not found or expired');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Generate new access token
      const newAccessToken = this.generateAccessToken({
        id: decoded.userId,
        email: decoded.email
      });

      let newRefreshToken = refreshToken;

      // Rotate refresh token if enabled
      if (this.tokenRotationEnabled) {
        // Blacklist old refresh token
        this.blacklistToken(refreshToken);
        this.removeRefreshToken(decoded.userId, refreshToken);

        // Generate new refresh token
        newRefreshToken = this.generateRefreshToken({
          id: decoded.userId,
          email: decoded.email
        });
      }

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.getExpirySeconds(this.accessTokenExpiry)
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Store refresh token for user
   */
  storeRefreshToken(userId, refreshToken) {
    if (!this.refreshTokenStore.has(userId)) {
      this.refreshTokenStore.set(userId, new Set());
    }

    const userTokens = this.refreshTokenStore.get(userId);
    
    // Remove oldest token if limit exceeded
    if (userTokens.size >= this.maxRefreshTokens) {
      const oldestToken = userTokens.values().next().value;
      userTokens.delete(oldestToken);
      this.blacklistToken(oldestToken);
    }

    userTokens.add(refreshToken);
  }

  /**
   * Check if refresh token is valid for user
   */
  isRefreshTokenValid(userId, refreshToken) {
    const userTokens = this.refreshTokenStore.get(userId);
    return userTokens && userTokens.has(refreshToken);
  }

  /**
   * Remove refresh token
   */
  removeRefreshToken(userId, refreshToken) {
    const userTokens = this.refreshTokenStore.get(userId);
    if (userTokens) {
      userTokens.delete(refreshToken);
      if (userTokens.size === 0) {
        this.refreshTokenStore.delete(userId);
      }
    }
  }

  /**
   * Remove all refresh tokens for user (logout all devices)
   */
  removeAllRefreshTokens(userId) {
    const userTokens = this.refreshTokenStore.get(userId);
    if (userTokens) {
      // Blacklist all tokens
      userTokens.forEach(token => this.blacklistToken(token));
      this.refreshTokenStore.delete(userId);
    }
  }

  /**
   * Blacklist a token
   */
  blacklistToken(token) {
    this.tokenBlacklist.add(token);
    
    // Clean up blacklist periodically (remove expired tokens)
    if (this.tokenBlacklist.size > 10000) {
      this.cleanupBlacklist();
    }
  }

  /**
   * Check if token is blacklisted
   */
  isTokenBlacklisted(token) {
    return this.tokenBlacklist.has(token);
  }

  /**
   * Clean up expired tokens from blacklist
   */
  cleanupBlacklist() {
    const expiredTokens = [];
    
    this.tokenBlacklist.forEach(token => {
      try {
        jwt.verify(token, this.accessTokenSecret);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          expiredTokens.push(token);
        }
      }
    });

    expiredTokens.forEach(token => this.tokenBlacklist.delete(token));
    console.log(`Cleaned up ${expiredTokens.length} expired tokens from blacklist`);
  }

  /**
   * Get expiry time in seconds
   */
  getExpirySeconds(expiryString) {
    const units = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400
    };

    const match = expiryString.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default 1 hour
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate token payload structure
   */
  validateTokenPayload(payload) {
    const requiredFields = ['id', 'email', 'role'];
    return requiredFields.every(field => payload.hasOwnProperty(field));
  }

  /**
   * Get token info (for debugging/monitoring)
   */
  getTokenInfo(token) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      return {
        header: decoded.header,
        payload: {
          ...decoded.payload,
          // Remove sensitive data
          iat: new Date(decoded.payload.iat * 1000),
          exp: new Date(decoded.payload.exp * 1000)
        },
        isExpired: decoded.payload.exp < Date.now() / 1000,
        isBlacklisted: this.isTokenBlacklisted(token)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      blacklistedTokens: this.tokenBlacklist.size,
      activeUsers: this.refreshTokenStore.size,
      totalRefreshTokens: Array.from(this.refreshTokenStore.values())
        .reduce((total, tokens) => total + tokens.size, 0)
    };
  }

  /**
   * Cleanup on shutdown
   */
  cleanup() {
    this.tokenBlacklist.clear();
    this.refreshTokenStore.clear();
  }
}

// Create singleton instance
const tokenManager = new TokenManager();

module.exports = tokenManager;
module.exports.TokenManager = TokenManager;
