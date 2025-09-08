# Healthcare Management System - Backend API

A comprehensive Node.js/Express backend API for managing healthcare operations including patients, appointments, consultations, referrals, invoices, and community posts.

## 🚀 Features

- **Patient Management**: Complete CRUD operations for patient records
- **Appointment Scheduling**: Manage appointments with conflict detection
- **Consultation Records**: Track medical consultations and follow-ups
- **Referral System**: Manage specialist referrals with urgency tracking
- **Billing & Invoices**: Generate and manage invoices with payment tracking
- **Community Posts**: Blog-style posts for healthcare community engagement
- **MongoDB Integration**: Robust data persistence with Mongoose ODM
- **RESTful API**: Clean, consistent API design with proper HTTP methods
- **Input Validation**: Comprehensive validation using express-validator
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Security**: Helmet.js for security headers, rate limiting, CORS protection

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: express-validator
- **Security**: Helmet.js, CORS, Rate Limiting
- **Logging**: Morgan
- **Compression**: Compression middleware

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `env.example` to `.env`
   - Update the following variables:
     ```env
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/healthcare_system
     JWT_SECRET=your_super_secret_jwt_key_here
     FRONTEND_URL=http://localhost:5173
     ```

4. **Start MongoDB**
   - Local: Ensure MongoDB service is running
   - Cloud: Use MongoDB Atlas or other cloud provider

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## 📊 Database Models

### Patient
- Personal information (name, DOB, gender)
- Contact details (phone, email, address)
- Emergency contact information
- Insurance details
- Medical history (conditions, allergies, medications, surgeries)

### Appointment
- Patient association
- Date, time, and duration
- Type and priority
- Status tracking
- Provider information
- Notes and instructions

### Consultation
- Patient and provider details
- Consultation type and mode
- Medical notes and prescriptions
- Lab tests and imaging orders
- Follow-up scheduling

### Referral
- Patient and specialist information
- Urgency and priority levels
- Clinical history and reason
- Insurance and authorization
- Status tracking

### Invoice
- Patient billing information
- Itemized services
- Tax and discount calculations
- Payment tracking
- Insurance coverage

### Post
- Community content management
- Categories and tags
- Engagement metrics
- Comment system
- Moderation features

## 🔌 API Endpoints

### Base URL: `http://localhost:5000/api`

#### Patients
- `GET /patients` - Get all patients (with pagination and filtering)
- `GET /patients/:id` - Get patient by ID
- `POST /patients` - Create new patient
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Delete patient
- `PATCH /patients/:id/status` - Update patient status
- `GET /patients/stats/summary` - Get patient statistics
- `GET /patients/search/quick` - Quick search patients

#### Appointments
- `GET /appointments` - Get all appointments
- `GET /appointments/:id` - Get appointment by ID
- `POST /appointments` - Create new appointment
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Delete appointment
- `PATCH /appointments/:id/status` - Update appointment status
- `GET /appointments/today` - Get today's appointments
- `GET /appointments/upcoming` - Get upcoming appointments
- `GET /appointments/stats/summary` - Get appointment statistics

#### Consultations
- `GET /consultations` - Get all consultations
- `GET /consultations/:id` - Get consultation by ID
- `POST /consultations` - Create new consultation
- `PUT /consultations/:id` - Update consultation
- `DELETE /consultations/:id` - Delete consultation
- `PATCH /consultations/:id/status` - Update consultation status
- `GET /consultations/stats/summary` - Get consultation statistics

#### Referrals
- `GET /referrals` - Get all referrals
- `GET /referrals/:id` - Get referral by ID
- `POST /referrals` - Create new referral
- `PUT /referrals/:id` - Update referral
- `DELETE /referrals/:id` - Delete referral
- `PATCH /referrals/:id/status` - Update referral status
- `GET /referrals/stats/summary` - Get referral statistics

#### Invoices
- `GET /invoices` - Get all invoices
- `GET /invoices/:id` - Get invoice by ID
- `POST /invoices` - Create new invoice
- `PUT /invoices/:id` - Update invoice
- `DELETE /invoices/:id` - Delete invoice
- `PATCH /invoices/:id/status` - Update invoice status
- `GET /invoices/stats/summary` - Get invoice statistics

#### Posts
- `GET /posts` - Get all posts
- `GET /posts/:id` - Get post by ID
- `POST /posts` - Create new post
- `PUT /posts/:id` - Update post
- `DELETE /posts/:id` - Delete post
- `PATCH /posts/:id/feature` - Toggle post featured status
- `PATCH /posts/:id/visibility` - Update post visibility
- `GET /posts/stats/summary` - Get post statistics
- `GET /posts/search/tags` - Search posts by tags

## 🔒 Security Features

- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents API abuse with configurable limits
- **Security Headers**: Helmet.js for security best practices
- **Input Validation**: Comprehensive validation for all endpoints
- **Error Handling**: Secure error messages without information leakage

## 📝 API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": {
    "message": "Error description",
    "status": 400,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Pagination Response
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch
```

## 📦 Deployment

### Environment Variables
- `NODE_ENV`: Set to 'production' for production deployment
- `MONGODB_URI_PROD`: Production MongoDB connection string
- `JWT_SECRET`: Strong secret key for JWT tokens
- `FRONTEND_URL`: Production frontend URL for CORS

### Production Commands
```bash
# Install production dependencies only
npm ci --only=production

# Start production server
npm start

# Use PM2 for process management
pm2 start server.js --name "healthcare-backend"
```

## 🔧 Configuration

### MongoDB Connection Options
- Connection pooling with max 10 connections
- 5-second server selection timeout
- 45-second socket timeout
- Buffer commands disabled for better performance

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable via environment variables

### CORS Settings
- Configurable origin via `FRONTEND_URL`
- Credentials enabled
- Secure defaults

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Note**: This backend is designed to work with the healthcare management frontend application. Ensure both frontend and backend are properly configured and running for full functionality.
