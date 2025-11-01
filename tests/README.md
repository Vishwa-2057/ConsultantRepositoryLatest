# Tests Directory

This directory contains all automated tests for the Healthcare Management System.

## Directory Structure

```
tests/
├── api/                    # Backend API tests (Jest + Supertest)
│   ├── auth.test.js       # Authentication endpoints
│   ├── patients.test.js   # Patient management endpoints
│   ├── appointments.test.js # Appointment endpoints
│   └── health.test.js     # Health check and server tests
│
├── e2e/                    # Frontend E2E tests (Playwright)
│   ├── auth.e2e.js        # Authentication flows
│   ├── navigation.e2e.js  # Navigation and routing
│   └── dashboard.e2e.js   # Dashboard functionality
│
├── helpers/                # Test utilities and helpers
│   ├── api-helper.js      # API testing utilities
│   └── test-data.js       # Test data factory
│
└── setup/                  # Test configuration
    ├── global-setup.js    # Global test setup
    ├── global-teardown.js # Global test cleanup
    └── jest-setup.js      # Jest-specific setup
```

## Test Categories

### API Tests (`tests/api/`)

Backend API tests using Jest and Supertest. These tests verify:
- Endpoint functionality
- Request/response validation
- Authentication and authorization
- Error handling
- Data persistence

**Run API tests:**
```bash
npm run test:api
```

### E2E Tests (`tests/e2e/`)

Frontend end-to-end tests using Playwright. These tests verify:
- User workflows
- UI interactions
- Form submissions
- Navigation
- Cross-browser compatibility

**Run E2E tests:**
```bash
npm run test:e2e
```

## Test Helpers

### ApiHelper (`helpers/api-helper.js`)

Utility class for making authenticated API requests:

```javascript
const ApiHelper = require('./helpers/api-helper');

const api = new ApiHelper('http://localhost:5000');
await api.login('user@test.com', 'password');
const response = await api.get('/api/patients');
```

### TestDataFactory (`helpers/test-data.js`)

Factory for generating realistic test data:

```javascript
const TestDataFactory = require('./helpers/test-data');

const user = TestDataFactory.generateUser('patient');
const patient = TestDataFactory.generatePatient();
const appointment = TestDataFactory.generateAppointment(patientId, doctorId);
```

## Writing New Tests

### API Test Template

```javascript
const request = require('supertest');
const TestDataFactory = require('../helpers/test-data');

describe('Feature Name API', () => {
  const baseURL = process.env.BACKEND_URL || 'http://localhost:5000';
  let authToken;

  beforeAll(async () => {
    // Setup code
  });

  afterAll(async () => {
    // Cleanup code
  });

  it('should perform expected action', async () => {
    const response = await request(baseURL)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('expectedField');
  });
});
```

### E2E Test Template

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
  const baseURL = process.env.FRONTEND_URL || 'http://localhost:8080';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
  });

  test('should perform expected action', async ({ page }) => {
    await page.click('button:has-text("Action")');
    await expect(page.locator('text=Expected Result')).toBeVisible();
  });
});
```

## Test Data

All test data should be:
- Generated using `TestDataFactory`
- Unique to avoid conflicts
- Cleaned up after tests
- Realistic and valid

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Assertions**: Make specific, meaningful assertions
4. **Naming**: Use descriptive test names
5. **Speed**: Keep tests fast and focused
6. **Reliability**: Avoid flaky tests

## Running Specific Tests

### Run single test file
```bash
# API test
npm run test:api -- tests/api/auth.test.js

# E2E test
npx playwright test tests/e2e/auth.e2e.js
```

### Run tests matching pattern
```bash
# Jest
npm run test:api -- --testNamePattern="login"

# Playwright
npx playwright test --grep "login"
```

### Debug mode
```bash
# API tests
npm run test:watch

# E2E tests
npm run test:e2e:ui
```

## Coverage

Generate coverage reports:
```bash
npm run test:coverage
```

View coverage report:
```
coverage/lcov-report/index.html
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines. See `.github/workflows/` for examples.

## Troubleshooting

### Tests are slow
- Run tests in parallel
- Use `test.only()` for focused testing
- Check for unnecessary waits

### Tests are flaky
- Add proper wait conditions
- Avoid hardcoded timeouts
- Check for race conditions

### Database issues
- Ensure test database is separate
- Clear data between tests
- Check connection strings

## Additional Resources

- [TESTING.md](../TESTING.md) - Comprehensive testing guide
- [QUICK_TEST_START.md](../QUICK_TEST_START.md) - Quick start guide
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
