/**
 * Test Data Factory
 * Provides sample data for testing
 */

const { faker } = require('@faker-js/faker');

class TestDataFactory {
  /**
   * Generate test user data
   */
  static generateUser(role = 'patient') {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password: 'Test@123456',
      role: role,
      phone: faker.phone.number(),
      dateOfBirth: faker.date.past({ years: 30 }),
      gender: faker.helpers.arrayElement(['male', 'female', 'other'])
    };
  }

  /**
   * Generate test patient data
   */
  static generatePatient() {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      dateOfBirth: faker.date.past({ years: 40 }),
      gender: faker.helpers.arrayElement(['male', 'female', 'other']),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: 'USA'
      },
      emergencyContact: {
        name: faker.person.fullName(),
        relationship: 'Spouse',
        phone: faker.phone.number()
      },
      bloodGroup: faker.helpers.arrayElement(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
      allergies: ['None'],
      medicalHistory: []
    };
  }

  /**
   * Generate test doctor data
   */
  static generateDoctor() {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      specialization: faker.helpers.arrayElement([
        'Cardiology',
        'Dermatology',
        'Neurology',
        'Pediatrics',
        'Orthopedics'
      ]),
      licenseNumber: faker.string.alphanumeric(10).toUpperCase(),
      experience: faker.number.int({ min: 1, max: 30 }),
      qualifications: ['MBBS', 'MD'],
      consultationFee: faker.number.int({ min: 500, max: 2000 })
    };
  }

  /**
   * Generate test appointment data
   */
  static generateAppointment(patientId, doctorId) {
    const appointmentDate = faker.date.future({ days: 30 });
    
    return {
      patient: patientId,
      doctor: doctorId,
      appointmentDate: appointmentDate,
      appointmentTime: faker.helpers.arrayElement(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']),
      reason: faker.helpers.arrayElement([
        'Regular checkup',
        'Follow-up consultation',
        'New symptoms',
        'Prescription renewal'
      ]),
      status: 'scheduled',
      type: faker.helpers.arrayElement(['in-person', 'teleconsultation'])
    };
  }

  /**
   * Generate test prescription data
   */
  static generatePrescription(patientId, doctorId) {
    return {
      patient: patientId,
      doctor: doctorId,
      medications: [
        {
          name: faker.helpers.arrayElement(['Amoxicillin', 'Ibuprofen', 'Metformin', 'Lisinopril']),
          dosage: '500mg',
          frequency: 'Twice daily',
          duration: '7 days',
          instructions: 'Take with food'
        }
      ],
      diagnosis: faker.lorem.sentence(),
      notes: faker.lorem.paragraph()
    };
  }

  /**
   * Generate test consultation data
   */
  static generateConsultation(patientId, doctorId, appointmentId) {
    return {
      patient: patientId,
      doctor: doctorId,
      appointment: appointmentId,
      chiefComplaint: faker.lorem.sentence(),
      symptoms: [faker.lorem.word(), faker.lorem.word()],
      diagnosis: faker.lorem.sentence(),
      treatment: faker.lorem.paragraph(),
      notes: faker.lorem.paragraph(),
      followUpDate: faker.date.future({ days: 14 })
    };
  }

  /**
   * Generate test invoice data
   */
  static generateInvoice(patientId, appointmentId) {
    const items = [
      {
        description: 'Consultation Fee',
        quantity: 1,
        unitPrice: faker.number.int({ min: 500, max: 2000 }),
        total: 0
      }
    ];
    
    items[0].total = items[0].quantity * items[0].unitPrice;
    
    return {
      patient: patientId,
      appointment: appointmentId,
      items: items,
      subtotal: items[0].total,
      tax: items[0].total * 0.1,
      total: items[0].total * 1.1,
      status: 'pending',
      dueDate: faker.date.future({ days: 30 })
    };
  }

  /**
   * Generate test vital signs data
   */
  static generateVitals(patientId) {
    return {
      patient: patientId,
      bloodPressure: {
        systolic: faker.number.int({ min: 110, max: 140 }),
        diastolic: faker.number.int({ min: 70, max: 90 })
      },
      heartRate: faker.number.int({ min: 60, max: 100 }),
      temperature: faker.number.float({ min: 36.5, max: 37.5, precision: 0.1 }),
      respiratoryRate: faker.number.int({ min: 12, max: 20 }),
      oxygenSaturation: faker.number.int({ min: 95, max: 100 }),
      weight: faker.number.float({ min: 50, max: 100, precision: 0.1 }),
      height: faker.number.int({ min: 150, max: 190 })
    };
  }
}

module.exports = TestDataFactory;
