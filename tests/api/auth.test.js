/**
 * Authentication API Tests
 * Tests for user registration, login, and authentication flows
 */

const request = require('supertest');
const ApiHelper = require('../helpers/api-helper');
const TestDataFactory = require('../helpers/test-data');

describe('Authentication API', () => {
  let apiHelper;
  const baseURL = process.env.BACKEND_URL || 'http://localhost:5000';

  beforeAll(() => {
    apiHelper = new ApiHelper(baseURL);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new patient successfully', async () => {
      const userData = TestDataFactory.generateUser('patient');
      
      const response = await request(baseURL)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/);

      // May return 201 or 200 depending on implementation
      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', userData.email);
    });

    it('should reject registration with invalid email', async () => {
      const userData = TestDataFactory.generateUser('patient');
      userData.email = 'invalid-email';

      const response = await request(baseURL)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject registration with weak password', async () => {
      const userData = TestDataFactory.generateUser('patient');
      userData.password = '123';

      const response = await request(baseURL)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject duplicate email registration', async () => {
      const userData = TestDataFactory.generateUser('patient');
      
      // First registration
      await request(baseURL)
        .post('/api/auth/register')
        .send(userData);

      // Duplicate registration
      const response = await request(baseURL)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = TestDataFactory.generateUser('patient');

    beforeAll(async () => {
      // Register a test user
      await request(baseURL)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', testUser.email);
    });

    it('should reject login with invalid password', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Test@123456'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/auth/me', () => {
    const testUser = TestDataFactory.generateUser('patient');
    let authToken;

    beforeAll(async () => {
      // Register and login
      await request(baseURL)
        .post('/api/auth/register')
        .send(testUser);

      const loginResponse = await request(baseURL)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authToken = loginResponse.body.token;
    });

    it('should get current user profile with valid token', async () => {
      const response = await request(baseURL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('email', testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(baseURL)
        .get('/api/auth/me');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(baseURL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
