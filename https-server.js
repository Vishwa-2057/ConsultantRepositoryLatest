const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();

// Serve the frontend build (Vite uses 'dist' folder, not 'build')
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Serve patient test page
app.get('/patient-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'patient-test.html'));
});

// Handle React routing - serve index.html for all other routes except patient-test.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// Create self-signed certificate for development
const selfsigned = require('selfsigned');
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

// HTTPS server options
const httpsOptions = {
  key: pems.private,
  cert: pems.cert
};

// Create HTTPS server
const server = https.createServer(httpsOptions, app);

const PORT = 8443;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔒 HTTPS Server running on https://localhost:${PORT}`);
  console.log(`📄 Patient test page: https://localhost:${PORT}/patient-test.html`);
  console.log('');
  console.log('🌐 Network Access:');
  console.log(`   Local: https://192.168.0.30:${PORT}/patient-test.html`);
  console.log(`   Other devices on WiFi: https://192.168.0.30:${PORT}/patient-test.html`);
  console.log('');
  console.log('⚠️  IMPORTANT: You will see a security warning because we\'re using a self-signed certificate.');
  console.log('   Click "Advanced" → "Proceed to [IP address] (unsafe)" to continue.');
  console.log('   This is normal for development with HTTPS.');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    server.listen(PORT + 1);
  } else {
    console.error('HTTPS Server error:', err);
  }
});
