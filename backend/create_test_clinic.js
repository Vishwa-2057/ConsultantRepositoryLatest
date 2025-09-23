const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/healthcare-management');

async function createTestClinic() {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('clinics');
    
    // Remove existing test clinic
    await collection.deleteOne({ adminEmail: 'admin@testclinic.com' });
    
    // Create new test clinic with proper schema
    const testClinic = {
      clinicId: 'CLINIC001',
      name: 'Test Healthcare Clinic',
      type: 'General Hospital',
      registrationNumber: 'REG123456',
      yearOfEstablishment: 2020,
      address: '123 Healthcare Street',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      zipCode: '12345',
      phone: '+1234567890',
      email: 'info@testclinic.com',
      website: 'https://testclinic.com',
      ownerName: 'Dr. Test Owner',
      ownerMedicalId: 'MED123',
      adminName: 'Test Admin',
      adminContact: '+1234567890',
      adminEmail: 'admin@testclinic.com',
      adminUsername: 'admin',
      adminPassword: 'admin123',
      tradeLicense: 'TL123456',
      specialties: ['General Medicine', 'Emergency Care'],
      services: ['Consultation', 'Emergency', 'Laboratory'],
      operatingHours: '24/7',
      staffCount: 50,
      beds: 100,
      pharmacyAvailable: true,
      laboratoryAvailable: true,
      paymentMethods: ['Cash', 'Card', 'Insurance'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(testClinic);
    console.log('Test clinic created successfully!');
    console.log('Login credentials:');
    console.log('Email/Username: admin@testclinic.com OR admin');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

setTimeout(createTestClinic, 1000);
