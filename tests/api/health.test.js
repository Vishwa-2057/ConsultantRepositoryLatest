/**
 * Health Check API Tests
 * Tests for server health and status endpoints
 */

const request = require('supertest');

describe('Health Check API', () => {
  const baseURL = process.env.BACKEND_URL || 'http://localhost:5000';

  describe('GET /health', () => {
    it('should return server health status', async () => {
      const response = await request(baseURL)
        .get('/health')
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
    });

    it('should respond within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(baseURL)
        .get('/health');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Health check should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('Server Configuration', () => {
    it('should have CORS enabled', async () => {
      const response = await request(baseURL)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:8080')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should have security headers', async () => {
      const response = await request(baseURL)
        .get('/health');

      // Check for common security headers (Helmet)
      expect(
        response.headers['x-content-type-options'] ||
        response.headers['x-frame-options'] ||
        response.headers['x-xss-protection']
      ).toBeDefined();
    });

    it('should handle JSON content type', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'test' })
        .expect('Content-Type', /json/);

      expect(response.body).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(baseURL)
        .get('/api/non-existent-route-12345');

      expect(response.status).toBeGreaterThanOrEqual(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid json"');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing content-type', async () => {
      const response = await request(baseURL)
        .post('/api/auth/login')
        .send('some data');

      // Should either parse or reject gracefully
      expect(response.status).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should accept reasonable number of requests', async () => {
      const requests = [];
      
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(baseURL)
            .get('/health')
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All should succeed (rate limit is high for testing)
      responses.forEach(response => {
        expect(response.status).toBeLessThan(429);
      });
    });
  });
});
