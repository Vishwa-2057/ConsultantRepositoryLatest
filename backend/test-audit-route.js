// Simple test to check if audit logs route is working
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/audit-logs', (req, res) => {
  console.log('Audit logs route accessed!');
  res.json({
    success: true,
    logs: [],
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      pages: 1
    }
  });
});

app.post('/api/audit-logs', (req, res) => {
  console.log('Audit logs POST route accessed!');
  console.log('Request body:', req.body);
  res.json({
    success: true,
    message: 'Audit logs received'
  });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
