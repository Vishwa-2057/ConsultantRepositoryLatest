const express = require('express');
const path = require('path');
const app = express();

// Serve static files from current directory
app.use(express.static(__dirname));

// Specific route for patient-test.html
app.get('/patient-test.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'patient-test.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server running' });
});

const PORT = 8080;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP Server running on port ${PORT}`);
    console.log(`Local access: http://localhost:${PORT}/patient-test.html`);
    console.log(`Network access: http://192.168.0.30:${PORT}/patient-test.html`);
    console.log(`Use this URL on other devices: http://192.168.0.30:${PORT}/patient-test.html`);
});
