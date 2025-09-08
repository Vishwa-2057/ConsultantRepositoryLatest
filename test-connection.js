#!/usr/bin/env node

/**
 * Simple test script to verify backend and frontend connection
 * Run this script to test if the backend API is accessible
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:8080';

console.log('🔍 Testing Backend and Frontend Connection...\n');

// Test backend health endpoint
function testBackend() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Backend Health Check:', response.message);
          console.log('   Status:', response.status);
          console.log('   Timestamp:', response.timestamp);
          resolve(true);
        } catch (error) {
          console.log('❌ Backend Health Check Failed: Invalid JSON response');
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Backend Health Check Failed:', error.message);
      console.log('   Make sure the backend is running on port 5000');
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Backend Health Check Failed: Timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test frontend accessibility
function testFrontend() {
  return new Promise((resolve) => {
    const req = http.get(`${FRONTEND_URL}`, (res) => {
      console.log('✅ Frontend Accessibility Check: OK');
      console.log('   Status Code:', res.statusCode);
      resolve(true);
    });

    req.on('error', (error) => {
      console.log('❌ Frontend Accessibility Check Failed:', error.message);
      console.log('   Make sure the frontend is running on port 8080');
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ Frontend Accessibility Check Failed: Timeout');
      req.destroy();
      resolve(false);
    });
  });
}

// Test API endpoint
function testAPI() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/patients`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ API Endpoint Test: OK');
        console.log('   Status Code:', res.statusCode);
        console.log('   Content-Type:', res.headers['content-type']);
        resolve(true);
      });
    });

    req.on('error', (error) => {
      console.log('❌ API Endpoint Test Failed:', error.message);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ API Endpoint Test Failed: Timeout');
      req.destroy();
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('Testing Backend...');
  const backendOk = await testBackend();
  
  console.log('\nTesting Frontend...');
  const frontendOk = await testFrontend();
  
  console.log('\nTesting API...');
  const apiOk = await testAPI();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`Backend (${BACKEND_URL}): ${backendOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Frontend (${FRONTEND_URL}): ${frontendOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`API Endpoints: ${apiOk ? '✅ OK' : '❌ FAILED'}`);
  
  if (backendOk && frontendOk && apiOk) {
    console.log('\n🎉 All tests passed! Backend and frontend are properly connected.');
    console.log('\nYou can now:');
    console.log('1. Open http://localhost:8080 in your browser');
    console.log('2. The frontend should be able to communicate with the backend API');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the error messages above.');
    console.log('\nTo fix issues:');
    if (!backendOk) {
      console.log('- Start the backend: cd backend && npm run dev');
    }
    if (!frontendOk) {
      console.log('- Start the frontend: cd frontend && npm run dev');
    }
  }
}

runTests().catch(console.error);
