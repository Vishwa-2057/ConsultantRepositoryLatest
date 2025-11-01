/**
 * Appointments API Tests
 * Tests for appointment management endpoints
 */

const request = require('supertest');
const TestDataFactory = require('../helpers/test-data');

describe('Appointments API', () => {
  let authToken;
  let patientId;
  let doctorId;
  const baseURL = process.env.BACKEND_URL || 'http://localhost:5000';

  beforeAll(async () => {
    // Create and login a test user
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
    doctorId = loginResponse.body.user._id || loginResponse.body.user.id;

    // Create a test patient
    const patientData = TestDataFactory.generatePatient();
    const patientResponse = await request(baseURL)
      .post('/api/patients')
      .set('Authorization', `Bearer ${authToken}`)
      .send(patientData);

    patientId = patientResponse.body._id || patientResponse.body.id;
  });

  describe('POST /api/appointments', () => {
    it('should create a new appointment', async () => {
      const appointmentData = TestDataFactory.generateAppointment(patientId, doctorId);

      const response = await request(baseURL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('patient');
      expect(response.body).toHaveProperty('doctor');
      expect(response.body).toHaveProperty('status');
    });

    it('should reject appointment without authentication', async () => {
      const appointmentData = TestDataFactory.generateAppointment(patientId, doctorId);

      const response = await request(baseURL)
        .post('/api/appointments')
        .send(appointmentData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject appointment with invalid date', async () => {
      const appointmentData = TestDataFactory.generateAppointment(patientId, doctorId);
      appointmentData.appointmentDate = 'invalid-date';

      const response = await request(baseURL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/appointments', () => {
    beforeAll(async () => {
      // Create some test appointments
      for (let i = 0; i < 3; i++) {
        const appointmentData = TestDataFactory.generateAppointment(patientId, doctorId);
        await request(baseURL)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(appointmentData);
      }
    });

    it('should get list of appointments', async () => {
      const response = await request(baseURL)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(Array.isArray(response.body) || Array.isArray(response.body.appointments)).toBe(true);
    });

    it('should filter appointments by status', async () => {
      const response = await request(baseURL)
        .get('/api/appointments?status=scheduled')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/appointments/:id', () => {
    let appointmentId;

    beforeAll(async () => {
      const appointmentData = TestDataFactory.generateAppointment(patientId, doctorId);
      const createResponse = await request(baseURL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);

      appointmentId = createResponse.body._id || createResponse.body.id;
    });

    it('should get appointment by ID', async () => {
      const response = await request(baseURL)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('_id', appointmentId);
    });
  });

  describe('PUT /api/appointments/:id', () => {
    let appointmentId;

    beforeAll(async () => {
      const appointmentData = TestDataFactory.generateAppointment(patientId, doctorId);
      const createResponse = await request(baseURL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);

      appointmentId = createResponse.body._id || createResponse.body.id;
    });

    it('should update appointment status', async () => {
      const updateData = {
        status: 'confirmed'
      };

      const response = await request(baseURL)
        .put(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('status', 'confirmed');
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    let appointmentId;

    beforeAll(async () => {
      const appointmentData = TestDataFactory.generateAppointment(patientId, doctorId);
      const createResponse = await request(baseURL)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData);

      appointmentId = createResponse.body._id || createResponse.body.id;
    });

    it('should cancel/delete appointment', async () => {
      const response = await request(baseURL)
        .delete(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 204]).toContain(response.status);
    });
  });
});
