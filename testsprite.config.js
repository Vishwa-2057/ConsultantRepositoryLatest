/**
 * Testsprite Configuration for Healthcare Management System
 * This configuration sets up comprehensive testing for both backend API and frontend E2E tests
 */

module.exports = {
  // Project information
  projectName: 'Healthcare Management System',
  version: '1.0.0',
  
  // Test directories
  testDir: './tests',
  
  // Test patterns
  testMatch: [
    '**/*.test.js',
    '**/*.spec.js',
    '**/*.e2e.js'
  ],
  
  // Test environments
  environments: {
    backend: {
      type: 'api',
      baseURL: process.env.BACKEND_URL || 'http://localhost:5000',
      timeout: 30000,
      retries: 2
    },
    frontend: {
      type: 'browser',
      baseURL: process.env.FRONTEND_URL || 'http://localhost:8080',
      timeout: 60000,
      retries: 1,
      browser: {
        headless: process.env.HEADLESS !== 'false',
        slowMo: 0,
        viewport: {
          width: 1280,
          height: 720
        }
      }
    }
  },
  
  // Playwright configuration for E2E tests
  playwright: {
    use: {
      baseURL: process.env.FRONTEND_URL || 'http://localhost:8080',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      actionTimeout: 10000,
      navigationTimeout: 30000
    },
    projects: [
      {
        name: 'chromium',
        use: { browserName: 'chromium' }
      },
      {
        name: 'firefox',
        use: { browserName: 'firefox' }
      },
      {
        name: 'webkit',
        use: { browserName: 'webkit' }
      }
    ],
    reporter: [
      ['html', { outputFolder: 'test-results/html' }],
      ['json', { outputFile: 'test-results/results.json' }],
      ['junit', { outputFile: 'test-results/junit.xml' }],
      ['list']
    ],
    outputDir: 'test-results/artifacts'
  },
  
  // Jest configuration for API tests
  jest: {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'backend/**/*.js',
      '!backend/node_modules/**',
      '!backend/coverage/**'
    ],
    coverageReporters: ['text', 'lcov', 'html'],
    testTimeout: 30000,
    verbose: true
  },
  
  // Test data configuration
  testData: {
    users: {
      admin: {
        email: 'admin@test.com',
        password: 'Test@123'
      },
      doctor: {
        email: 'doctor@test.com',
        password: 'Test@123'
      },
      patient: {
        email: 'patient@test.com',
        password: 'Test@123'
      }
    }
  },
  
  // Reporting
  reporters: [
    'default',
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // Global setup and teardown
  globalSetup: './tests/setup/global-setup.js',
  globalTeardown: './tests/setup/global-teardown.js',
  
  // Parallel execution
  workers: process.env.CI ? 2 : 4,
  fullyParallel: false,
  
  // Fail fast
  maxFailures: process.env.CI ? 10 : 0
};
