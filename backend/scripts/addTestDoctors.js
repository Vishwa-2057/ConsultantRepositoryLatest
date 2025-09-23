const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import Doctor model
const Doctor = require('../models/Doctor');

const connectDB = async () => {
  try {
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI;
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const addTestDoctors = async () => {
  try {
    // Check if doctors already exist
    const existingDoctors = await Doctor.find({});
    console.log(`Found ${existingDoctors.length} existing doctors in database`);

    // Test doctors data
    const testDoctors = [
      {
        fullName: 'Dr. John Smith',
        email: 'john.smith@clinic.com',
        password: 'doctor123',
        specialty: 'Cardiologist',
        phone: '+1234567890',
        role: 'doctor'
      },
      {
        fullName: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@clinic.com',
        password: 'doctor123',
        specialty: 'Pediatrician',
        phone: '+1234567891',
        role: 'doctor'
      },
      {
        fullName: 'Dr. Michael Brown',
        email: 'michael.brown@clinic.com',
        password: 'doctor123',
        specialty: 'Neurologist',
        phone: '+1234567892',
        role: 'doctor'
      },
      {
        fullName: 'Dr. Emily Davis',
        email: 'emily.davis@clinic.com',
        password: 'doctor123',
        specialty: 'Dermatologist',
        phone: '+1234567893',
        role: 'doctor'
      },
      {
        fullName: 'Dr. Robert Wilson',
        email: 'robert.wilson@clinic.com',
        password: 'doctor123',
        specialty: 'Orthopedic Surgeon',
        phone: '+1234567894',
        role: 'doctor'
      }
    ];

    console.log('Adding test doctors...');

    for (const doctorData of testDoctors) {
      // Check if doctor already exists
      const existingDoctor = await Doctor.findOne({ email: doctorData.email });
      
      if (existingDoctor) {
        console.log(`Doctor ${doctorData.fullName} already exists, skipping...`);
        continue;
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(doctorData.password, saltRounds);

      // Create new doctor
      const doctor = new Doctor({
        fullName: doctorData.fullName,
        email: doctorData.email,
        passwordHash,
        specialty: doctorData.specialty,
        phone: doctorData.phone,
        role: doctorData.role,
        isActive: true
      });

      await doctor.save();
      console.log(`✅ Added doctor: ${doctorData.fullName} (${doctorData.specialty})`);
    }

    // Display all doctors
    const allDoctors = await Doctor.find({ isActive: true })
      .select('fullName email specialty phone role createdAt')
      .sort({ fullName: 1 });

    console.log('\n📋 All active doctors in database:');
    console.log('=====================================');
    allDoctors.forEach((doctor, index) => {
      console.log(`${index + 1}. ${doctor.fullName}`);
      console.log(`   Email: ${doctor.email}`);
      console.log(`   Specialty: ${doctor.specialty}`);
      console.log(`   Phone: ${doctor.phone}`);
      console.log(`   Role: ${doctor.role}`);
      console.log(`   Created: ${doctor.createdAt.toLocaleDateString()}`);
      console.log('   ---');
    });

    console.log(`\n✅ Total active doctors: ${allDoctors.length}`);

  } catch (error) {
    console.error('❌ Error adding test doctors:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
};

const main = async () => {
  await connectDB();
  await addTestDoctors();
};

main();
