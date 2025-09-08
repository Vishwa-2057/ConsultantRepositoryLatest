# Frontend-Backend Integration

This document describes how the frontend is connected to the backend API.

## API Configuration

The frontend is configured to connect to the backend at `http://localhost:5000/api`.

## API Service Layer

The API service layer is located in `src/services/api.js` and provides:

- **Patient API**: CRUD operations for patient management
- **Appointment API**: CRUD operations for appointment scheduling
- **Consultation API**: CRUD operations for consultations
- **Referral API**: CRUD operations for referrals
- **Invoice API**: CRUD operations for billing
- **Post API**: CRUD operations for community posts

## Integration Points

### Patient Management
- **PatientModal**: Creates new patients via `patientAPI.create()`
- **PatientManagement**: Loads patients via `patientAPI.getAll()` on component mount
- **Form Submission**: Patient data is sent to backend and stored in MongoDB

### Appointment Scheduling
- **AppointmentModal**: Creates new appointments via `appointmentAPI.create()`
- **Dashboard**: Loads appointments via `appointmentAPI.getAll()` on component mount
- **Form Submission**: Appointment data is sent to backend and stored in MongoDB

## Data Flow

1. **User Input**: User fills out forms in modals
2. **Form Validation**: Client-side validation ensures data integrity
3. **API Call**: Data is sent to backend via API service functions
4. **Backend Processing**: Backend validates and stores data in MongoDB
5. **Response**: Backend returns created/updated data
6. **UI Update**: Frontend updates UI with response data

## Error Handling

- API calls are wrapped in try-catch blocks
- Failed API calls log errors to console
- UI gracefully handles API failures
- Mock data is preserved as fallback

## Testing

An `APITest` component is temporarily added to the Dashboard for testing API connectivity.

## Environment Variables

The frontend expects the backend to be running on:
- **Development**: `http://localhost:5000`
- **Production**: Configurable via environment variables

## Next Steps

1. **Remove APITest component** after confirming API connectivity
2. **Add error toasts** for better user experience
3. **Implement loading states** during API calls
4. **Add retry logic** for failed API calls
5. **Implement real-time updates** using WebSockets (optional)

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS is configured for `http://localhost:5173`
2. **Connection Refused**: Verify backend server is running on port 5000
3. **API Endpoint Not Found**: Check backend routes are properly configured
4. **MongoDB Connection**: Ensure MongoDB is running and accessible

### Debug Steps

1. Check browser console for error messages
2. Verify backend server logs
3. Test API endpoints directly (e.g., `http://localhost:5000/api/patients`)
4. Check network tab in browser dev tools
