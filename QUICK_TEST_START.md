# Quick Test Start Guide

Get your Healthcare Management System tests running in 5 minutes!

## Prerequisites

- Node.js (v16+)
- MongoDB running locally
- Both backend and frontend dependencies installed

## Step 1: Install Test Dependencies (2 minutes)

```bash
# From project root
npm install

# This installs Jest, Playwright, and all testing tools
```

## Step 2: Install Playwright Browsers (1 minute)

```bash
npm run playwright:install
```

## Step 3: Setup Test Environment (1 minute)

Create `.env.test` file in the backend directory:

```bash
# Copy the example file
cp .env.test.example backend/.env.test
```

Or manually create `backend/.env.test`:

```env
NODE_ENV=test
MONGODB_TEST_URI=mongodb://localhost:27017/healthcare-test
JWT_SECRET=test-jwt-secret-key-for-testing-only
PORT=5001
```

## Step 4: Start Your Application (30 seconds)

```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Start frontend
npm run dev:frontend
```

## Step 5: Run Tests! (1 minute)

### Option A: Run All Tests

```bash
npm test
```

### Option B: Run Tests Separately

```bash
# API tests only
npm run test:api

# E2E tests only
npm run test:e2e
```

### Option C: Interactive Testing

```bash
# Playwright UI mode (recommended for E2E)
npm run test:e2e:ui

# Jest watch mode (recommended for API)
npm run test:watch
```

## What Gets Tested?

### ✅ API Tests (Backend)
- User authentication (register, login)
- Patient management (create, read, update, delete)
- Appointment management (create, read, update, delete)
- Authorization and permissions
- Input validation
- Error handling

### ✅ E2E Tests (Frontend)
- User registration flow
- Login/logout flow
- Navigation between pages
- Form validation
- Responsive design
- Cross-browser compatibility

## Quick Commands Reference

```bash
# All tests
npm test

# API tests
npm run test:api

# E2E tests (all browsers)
npm run test:e2e

# E2E tests (specific browser)
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Interactive modes
npm run test:e2e:ui          # Playwright UI
npm run test:e2e:headed      # See browser
npm run test:watch           # Jest watch mode

# Coverage
npm run test:coverage

# View reports
npm run test:report
```

## Test Results Location

After running tests, find results here:

```
test-results/
├── playwright-report/       # E2E test HTML report
├── playwright-results.json  # E2E test JSON results
├── jest-report.html         # API test HTML report
├── junit.xml                # CI/CD compatible results
└── artifacts/               # Screenshots, videos, traces
```

## Troubleshooting

### Tests fail with "Cannot connect to database"
**Fix**: Ensure MongoDB is running
```bash
# Check if MongoDB is running
mongosh

# Or start MongoDB service
# Windows: net start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Playwright tests timeout
**Fix**: Ensure frontend is running on port 8080
```bash
npm run dev:frontend
```

### Port already in use
**Fix**: Change test port in `.env.test`
```env
PORT=5002  # Use different port
```

### Authentication tests fail
**Fix**: Clear test database
```bash
mongosh healthcare-test --eval "db.dropDatabase()"
```

## Next Steps

1. ✅ Tests running? Great! Read [TESTING.md](./TESTING.md) for detailed documentation
2. 📝 Write your own tests using examples in `tests/` directory
3. 🔄 Set up CI/CD using the GitHub Actions example in TESTING.md
4. 📊 Review coverage reports to identify untested code

## Need Help?

- 📖 Full documentation: [TESTING.md](./TESTING.md)
- 🧪 Test examples: `tests/api/` and `tests/e2e/`
- ⚙️ Configuration: `jest.config.js` and `playwright.config.js`

Happy Testing! 🚀
