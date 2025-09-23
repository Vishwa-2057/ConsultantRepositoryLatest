const https = require('https');
const path = require('path');
const express = require('express');
const selfsigned = require('selfsigned');

const app = express();

// Create self-signed certificate for development
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Serve patient test page specifically
app.get('/patient-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'patient-test.html'));
});

// Serve React app for all other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

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
  console.log(`📄 Patient: https://192.168.0.30:${PORT}/patient-test.html`);
  console.log(`🩺 Doctor: https://192.168.0.30:${PORT}/teleconsultation`);
  console.log('');
  console.log('⚠️  Accept certificate warnings to continue.');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
    server.listen(PORT + 1, '0.0.0.0');
  } else {
    console.error('HTTPS Server error:', err);
  }
});
