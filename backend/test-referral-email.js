const emailService = require('./services/emailService');
require('dotenv').config();

// Test referral data
const testReferral = {
  patientName: 'John Doe',
  specialistName: 'Dr. Sarah Wilson',
  specialty: 'Cardiology',
  referralType: 'outbound',
  urgency: 'High',
  reason: 'Chest pain and irregular heartbeat requiring specialist evaluation',
  clinicalHistory: 'Patient has history of hypertension and family history of heart disease',
  currentMedications: ['Lisinopril 10mg', 'Metoprolol 50mg'],
  testResults: 'ECG shows irregular rhythm, elevated troponin levels',
  specialInstructions: 'Please schedule within 2 weeks due to urgency',
  preferredDate: new Date('2025-01-15'),
  preferredTime: '10:00 AM',
  specialistContact: {
    email: 'test.doctor@example.com' // Replace with a real email for testing
  },
  referringProvider: {
    name: 'Dr. Johnson',
    phone: '(555) 123-4567',
    email: 'dr.johnson@clinic.com'
  },
  insuranceInfo: {
    provider: 'Blue Cross Blue Shield',
    policyNumber: 'BC123456789',
    authorizationRequired: true,
    authorizationNumber: 'AUTH-2025-001'
  },
  createdAt: new Date()
};

async function testReferralEmail() {
  console.log('🧪 Testing referral email notification...');
  
  try {
    // Test outbound referral email
    console.log('\n📧 Testing outbound referral email...');
    const result = await emailService.sendReferralNotification(testReferral);
    
    if (result.success) {
      console.log('✅ Outbound referral email sent successfully!');
      console.log('📨 Message ID:', result.messageId);
    } else {
      console.log('❌ Failed to send outbound referral email:', result.error);
    }
    
    // Test inbound referral email
    console.log('\n📧 Testing inbound referral email...');
    const inboundReferral = {
      ...testReferral,
      referralType: 'inbound'
    };
    
    const inboundResult = await emailService.sendReferralNotification(inboundReferral);
    
    if (inboundResult.success) {
      console.log('✅ Inbound referral email sent successfully!');
      console.log('📨 Message ID:', inboundResult.messageId);
    } else {
      console.log('❌ Failed to send inbound referral email:', inboundResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error during email test:', error);
  }
}

// Run the test
testReferralEmail();
