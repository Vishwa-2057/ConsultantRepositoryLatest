{{ ... }}
## Prerequisites

Before running tests, ensure:

1. **Backend server is running** on `http://localhost:5000`
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend server is running** on `http://localhost:8000`
   ```bash
   cd frontend
   npm run dev
   ```
{{ ... }}
## TestSprite Configuration

The project uses `testsprite.config.js` for unified test configuration:

```javascript
{
  projectName: 'Healthcare Management System',
  testDir: './tests',
  environments: {
    backend: { baseURL: 'http://localhost:5000' },
    frontend: { baseURL: 'http://localhost:8000' }
  }
}
```
{{ ... }}
### Tests Fail to Connect
**Problem**: Cannot connect to backend/frontend
**Solution**: 
1. Ensure servers are running
2. Check ports 5000 (backend) and 8000 (frontend)
3. Verify `.env` configuration
{{ ... }}
