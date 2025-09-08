# Healthcare Management System

A full-stack healthcare management system with separate backend and frontend applications.

## Project Structure

```
Sample Design _2/
├── backend/          # Node.js/Express API server
├── frontend/         # React/Vite frontend application
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory:
   ```bash
   cp env.example .env
   ```

4. Update the `.env` file with your MongoDB connection string and other configurations.

5. Start the backend server:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:5000`

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory (optional):
   ```bash
   # .env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_APP_TITLE=Healthcare Management System
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:8080`

## Quick Start (Recommended)

1. Install all dependencies:
   ```bash
   npm run install:all
   ```

2. Start both backend and frontend simultaneously:
   ```bash
   npm run dev
   ```

3. Test the connection:
   ```bash
   npm run test:connection
   ```

## Manual Setup

### Running Both Applications Separately

1. Open two terminal windows
2. In the first terminal, start the backend:
   ```bash
   cd backend && npm run dev
   ```
3. In the second terminal, start the frontend:
   ```bash
   cd frontend && npm run dev
   ```

### Windows Users

You can also use the provided batch file:
```bash
start-dev.bat
```

### Linux/Mac Users

You can use the provided shell script:
```bash
./start-dev.sh
```

## API Endpoints

The backend provides the following API endpoints:

- `GET /health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Create new patient
- `GET /api/appointments` - Get all appointments
- `POST /api/appointments` - Create new appointment
- And more...

## Configuration

### Backend Configuration

The backend uses the following environment variables:

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:8080)

### Frontend Configuration

The frontend uses the following environment variables:

- `VITE_API_BASE_URL` - Backend API URL (default: http://localhost:5000/api)
- `VITE_APP_TITLE` - Application title

## CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:8080` (default frontend port)
- `http://localhost:5173` (alternative frontend port)
- `http://127.0.0.1:8080`
- `http://127.0.0.1:5173`

## Troubleshooting

1. **CORS Errors**: Make sure the frontend URL is included in the backend's CORS configuration
2. **API Connection Issues**: Verify that the backend is running on port 5000 and the frontend is configured to use the correct API URL
3. **Database Connection**: Ensure MongoDB is running and the connection string in `.env` is correct

## Development

- Backend: Uses nodemon for auto-restart during development
- Frontend: Uses Vite for fast development with hot module replacement
