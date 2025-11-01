/**
 * Patients API Tests
 * Tests for patient management endpoints
 */

const request = require('supertest');
const ApiHelper = require('../helpers/api-helper');
const TestDataFactory = require('../helpers/test-data');

describe('Patients API', () => {
  let apiHelper;
  let authToken;
  const baseURL = process.env.BACKEND_URL || 'http://localhost:5000';

  beforeAll(async () => {
    apiHelper = new ApiHelper(baseURL);
    
    // Create and login a test user (doctor or admin)
    const testUser = TestDataFactory.generateUser('doctor');
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

  describe('POST /api/patients', () => {
    it('should create a new patient', async () => {
      const patientData = TestDataFactory.generatePatient();

      const response = await request(baseURL)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('name', patientData.name);
      expect(response.body).toHaveProperty('email', patientData.email);
      expect(response.body).toHaveProperty('_id');
    });

    it('should reject patient creation without authentication', async () => {
      const patientData = TestDataFactory.generatePatient();

      const response = await request(baseURL)
        .post('/api/patients')
        .send(patientData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject patient with invalid email', async () => {
      const patientData = TestDataFactory.generatePatient();
      patientData.email = 'invalid-email';

      const response = await request(baseURL)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/patients', () => {
    beforeAll(async () => {
      // Create some test patients
      for (let i = 0; i < 3; i++) {
        const patientData = TestDataFactory.generatePatient();
        await request(baseURL)
          .post('/api/patients')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patientData);
      }
    });

    it('should get list of patients', async () => {
      const response = await request(baseURL)
        .get('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(Array.isArray(response.body) || Array.isArray(response.body.patients)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(baseURL)
        .get('/api/patients');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/patients/:id', () => {
    let patientId;

    beforeAll(async () => {
      const patientData = TestDataFactory.generatePatient();
      const createResponse = await request(baseURL)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      patientId = createResponse.body._id || createResponse.body.id;
    });

    it('should get patient by ID', async () => {
      const response = await request(baseURL)
        .get(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('_id', patientId);
    });

    it('should return 404 for non-existent patient', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId format

      const response = await request(baseURL)
        .get(`/api/patients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PUT /api/patients/:id', () => {
    let patientId;

    beforeAll(async () => {
      const patientData = TestDataFactory.generatePatient();
      const createResponse = await request(baseURL)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      patientId = createResponse.body._id || createResponse.body.id;
    });

    it('should update patient information', async () => {
      const updateData = {
        phone: '+1234567890',
        address: {
          street: '123 Updated St',
          city: 'New City',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      };

      const response = await request(baseURL)
        .put(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('phone', updateData.phone);
    });

    it('should reject update without authentication', async () => {
      const updateData = { phone: '+1234567890' };

      const response = await request(baseURL)
        .put(`/api/patients/${patientId}`)
        .send(updateData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('DELETE /api/patients/:id', () => {
    let patientId;

    beforeAll(async () => {
      const patientData = TestDataFactory.generatePatient();
      const createResponse = await request(baseURL)
        .post('/api/patients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(patientData);

      patientId = createResponse.body._id || createResponse.body.id;
    });

    it('should delete patient', async () => {
      const response = await request(baseURL)
        .delete(`/api/patients/${patientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 204]).toContain(response.status);
    });

    it('should reject delete without authentication', async () => {
      const response = await request(baseURL)
        .delete(`/api/patients/${patientId}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
