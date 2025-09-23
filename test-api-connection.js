#!/usr/bin/env node

/**
 * Test script to verify API connection from frontend perspective
 * This simulates what the frontend would do
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:5001/api';

console.log('🔍 Testing API Connection (Frontend Perspective)...\n');

// Test function that simulates frontend fetch
function testAPICall(endpoint) {
  return new Promise((resolve) => {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Testing: ${url}`);
    
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'http://localhost:8080'  // Simulate frontend origin
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ ${endpoint}: Status ${res.statusCode}`);
          console.log(`   Response: ${JSON.stringify(response).substring(0, 100)}...`);
          resolve({ success: true, status: res.statusCode, data: response });
        } catch (error) {
          console.log(`❌ ${endpoint}: Invalid JSON response`);
          console.log(`   Raw response: ${data.substring(0, 200)}...`);
          resolve({ success: false, error: 'Invalid JSON' });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${endpoint}: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(5000, () => {
      console.log(`❌ ${endpoint}: Timeout`);
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing API endpoints that frontend would call:\n');
  
  const tests = [
    '/patients',
    '/appointments', 
    '/consultations',
    '/referrals',
    '/invoices',
    '/posts'
  ];

  const results = [];
  
  for (const endpoint of tests) {
    const result = await testAPICall(endpoint);
    results.push({ endpoint, ...result });
    console.log(''); // Empty line for readability
  }

  console.log('='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(({ endpoint, success, status, error }) => {
    const statusIcon = success ? '✅' : '❌';
    const statusText = success ? `Status ${status}` : error;
    console.log(`${statusIcon} ${endpoint.padEnd(15)} ${statusText}`);
  });
  
  console.log('='.repeat(60));
  console.log(`Success Rate: ${successful}/${total} (${Math.round(successful/total*100)}%)`);
  
  if (successful === total) {
    console.log('\n🎉 All API endpoints are working!');
    console.log('The "failed to fetch" error might be due to:');
    console.log('1. Frontend not running on the correct port (should be 8080)');
    console.log('2. CORS issues (though backend CORS is configured)');
    console.log('3. Network connectivity issues');
    console.log('4. Browser cache issues');
    console.log('\nTry:');
    console.log('- Open http://localhost:8080/api-test in your browser');
    console.log('- Check browser console for detailed error messages');
    console.log('- Clear browser cache and try again');
  } else {
    console.log('\n⚠️  Some API endpoints failed. Check the error messages above.');
    console.log('Make sure the backend server is running: cd backend && npm run dev');
  }
}

runTests().catch(console.error);
