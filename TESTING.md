# Testing Guide for Healthcare Management System

This document provides comprehensive information about testing the Healthcare Management System using industry-standard testing tools.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

The Healthcare Management System uses a comprehensive testing approach:

- **API Testing**: Jest + Supertest for backend API endpoints
- **E2E Testing**: Playwright for frontend end-to-end tests
- **Test Coverage**: Automated coverage reporting
- **Multiple Browsers**: Cross-browser testing support

## Testing Stack

### Backend API Testing
- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion library
- **@faker-js/faker**: Test data generation

### Frontend E2E Testing
- **Playwright**: Modern E2E testing framework
- **Multi-browser support**: Chromium, Firefox, WebKit
- **Mobile testing**: iOS and Android viewport testing

## Setup

### 1. Install Dependencies

Install all testing dependencies:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Install Playwright Browsers

```bash
npm run playwright:install
```

### 3. Configure Environment

Create a `.env.test` file in the backend directory:

```env
NODE_ENV=test
MONGODB_TEST_URI=mongodb://localhost:27017/healthcare-test
JWT_SECRET=test-jwt-secret-key-for-testing-only
PORT=5001
```

## Running Tests

### Run All Tests

```bash
npm test
```

### API Tests Only

```bash
npm run test:api
```

### E2E Tests Only

```bash
npm run test:e2e
```

### Specific Browser Tests

```bash
# Chromium only
npm run test:e2e:chromium

# Firefox only
npm run test:e2e:firefox

# WebKit (Safari) only
npm run test:e2e:webkit
```

### Interactive Mode

```bash
# Playwright UI mode
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Jest watch mode
npm run test:watch
```

### Coverage Reports

```bash
npm run test:coverage
```

Coverage reports will be generated in the `coverage/` directory.

### View Test Reports

```bash
# View Playwright HTML report
npm run test:report
```

## Test Structure

```
ConsultantSystem/
├── tests/
│   ├── api/                    # Backend API tests
│   │   ├── auth.test.js
│   │   ├── patients.test.js
│   │   └── appointments.test.js
│   ├── e2e/                    # Frontend E2E tests
│   │   ├── auth.e2e.js
│   │   └── navigation.e2e.js
│   ├── helpers/                # Test utilities
│   │   ├── api-helper.js
│   │   └── test-data.js
│   └── setup/                  # Test configuration
│       ├── global-setup.js
│       ├── global-teardown.js
│       └── jest-setup.js
├── jest.config.js              # Jest configuration
├── playwright.config.js        # Playwright configuration
└── testsprite.config.js        # Unified test configuration
```

## Writing Tests

### API Test Example

```javascript
const request = require('supertest');
const TestDataFactory = require('../helpers/test-data');

describe('Patients API', () => {
  const baseURL = 'http://localhost:5000';
  let authToken;

  beforeAll(async () => {
    // Setup: Login and get auth token
    const loginResponse = await request(baseURL)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Test@123' });
    
    authToken = loginResponse.body.token;
  });

  it('should create a new patient', async () => {
    const patientData = TestDataFactory.generatePatient();

    const response = await request(baseURL)
      .post('/api/patients')
      .set('Authorization', `Bearer ${authToken}`)
      .send(patientData)
      .expect(201);

    expect(response.body).toHaveProperty('_id');
    expect(response.body.name).toBe(patientData.name);
  });
});
```

### E2E Test Example

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Patient Management', () => {
  test('should create a new patient', async ({ page }) => {
    await page.goto('http://localhost:8080/login');
    
    // Login
    await page.fill('input[type="email"]', 'doctor@test.com');
    await page.fill('input[type="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    
    // Navigate to patients
    await page.click('a:has-text("Patients")');
    
    // Create patient
    await page.click('button:has-text("Add Patient")');
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.click('button[type="submit"]');
    
    // Verify
    await expect(page.locator('text=John Doe')).toBeVisible();
  });
});
```

## Test Data Generation

Use the `TestDataFactory` helper to generate realistic test data:

```javascript
const TestDataFactory = require('./tests/helpers/test-data');

// Generate user
const user = TestDataFactory.generateUser('patient');

// Generate patient
const patient = TestDataFactory.generatePatient();

// Generate appointment
const appointment = TestDataFactory.generateAppointment(patientId, doctorId);

// Generate prescription
const prescription = TestDataFactory.generatePrescription(patientId, doctorId);
```

## Test Coverage

### Current Coverage Areas

#### API Tests
- ✅ Authentication (register, login, logout)
- ✅ Patient management (CRUD operations)
- ✅ Appointment management (CRUD operations)
- 🔄 Consultation management
- 🔄 Prescription management
- 🔄 Invoice management

#### E2E Tests
- ✅ Authentication flows
- ✅ Navigation
- 🔄 Patient workflows
- 🔄 Appointment booking
- 🔄 Doctor dashboard

### Coverage Thresholds

Minimum coverage requirements (configured in `jest.config.js`):
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Install Playwright
        run: npm run playwright:install-deps
      
      - name: Run API tests
        run: npm run test:api
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` and `afterEach` for setup/cleanup
- Don't rely on test execution order

### 2. Descriptive Test Names
```javascript
// Good
it('should return 401 when user is not authenticated', async () => {});

// Bad
it('test auth', async () => {});
```

### 3. Test Data
- Use factories for consistent test data
- Clean up test data after tests
- Use unique identifiers to avoid conflicts

### 4. Assertions
- Make specific assertions
- Test both success and error cases
- Verify response structure and data

### 5. Performance
- Keep tests fast
- Use parallel execution when possible
- Mock external services

### 6. Maintenance
- Update tests when features change
- Remove obsolete tests
- Keep test code clean and DRY

## Debugging Tests

### API Tests

```bash
# Run specific test file
npm run test:api -- tests/api/auth.test.js

# Run tests matching pattern
npm run test:api -- --testNamePattern="login"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Tests

```bash
# Debug mode (opens browser)
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui

# Specific test file
npx playwright test tests/e2e/auth.e2e.js

# With trace
npx playwright test --trace on
```

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Cannot connect to database"
**Solution**: Ensure MongoDB is running and `MONGODB_TEST_URI` is correct

**Issue**: Playwright tests timeout
**Solution**: Increase timeout in `playwright.config.js` or ensure frontend is running

**Issue**: Authentication tests fail
**Solution**: Check JWT_SECRET is set correctly in test environment

**Issue**: Port conflicts
**Solution**: Ensure test ports (5001 for backend, 8080 for frontend) are available

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Faker.js Documentation](https://fakerjs.dev/)

## Support

For issues or questions about testing:
1. Check this documentation
2. Review test examples in `tests/` directory
3. Check test configuration files
4. Review error messages and logs in `test-results/`
