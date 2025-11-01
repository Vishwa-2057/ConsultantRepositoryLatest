/**
 * API Test Helper Functions
 * Provides utility functions for API testing
 */

const request = require('supertest');

class ApiHelper {
  constructor(baseURL) {
    this.baseURL = baseURL || 'http://localhost:5000';
    this.authToken = null;
  }

  /**
   * Login and get authentication token
   */
  async login(email, password) {
    const response = await request(this.baseURL)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    
    this.authToken = response.body.token;
    return response.body;
  }

  /**
   * Register a new user
   */
  async register(userData) {
    const response = await request(this.baseURL)
      .post('/api/auth/register')
      .send(userData);
    
    return response;
  }

  /**
   * Make authenticated GET request
   */
  async get(endpoint) {
    const req = request(this.baseURL).get(endpoint);
    
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    
    return req;
  }

  /**
   * Make authenticated POST request
   */
  async post(endpoint, data) {
    const req = request(this.baseURL)
      .post(endpoint)
      .send(data);
    
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    
    return req;
  }

  /**
   * Make authenticated PUT request
   */
  async put(endpoint, data) {
    const req = request(this.baseURL)
      .put(endpoint)
      .send(data);
    
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    
    return req;
  }

  /**
   * Make authenticated DELETE request
   */
  async delete(endpoint) {
    const req = request(this.baseURL).delete(endpoint);
    
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    
    return req;
  }

  /**
   * Clear authentication token
   */
  clearAuth() {
    this.authToken = null;
  }
}

module.exports = ApiHelper;
