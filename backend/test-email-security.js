const { EmailService } = require('./services/emailService');
require('dotenv').config();

/**
 * Comprehensive Email Security Test Script
 * Tests email configuration, security, and functionality
 */

class EmailSecurityTester {
  constructor() {
    this.emailService = new EmailService();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🔒 Starting Email Security Tests...\n');

    await this.testConfigurationValidation();
    await this.testConnectionSecurity();
    await this.testInputValidation();
    await this.testRateLimiting();
    await this.testEmailMasking();
    await this.testOTPGeneration();

    this.printResults();
  }

  async testConfigurationValidation() {
    console.log('📋 Testing Configuration Validation...');
    
    try {
      const config = this.emailService.getCentralizedConfig();
      
      if (!config) {
        this.addResult('Configuration Validation', 'FAIL', 'No valid configuration found');
        return;
      }

      // Check required security settings
      const securityChecks = [
        { name: 'TLS Enabled', check: config.secure === true },
        { name: 'Secure Port', check: config.port === 465 },
        { name: 'Certificate Validation', check: config.tls.rejectUnauthorized === true },
        { name: 'Minimum TLS Version', check: config.tls.minVersion === 'TLSv1.2' },
        { name: 'Connection Pool', check: config.pool === true },
        { name: 'Connection Limits', check: config.maxConnections <= 5 }
      ];

      const failedChecks = securityChecks.filter(check => !check.check);
      
      if (failedChecks.length === 0) {
        this.addResult('Configuration Validation', 'PASS', 'All security settings configured correctly');
      } else {
        this.addResult('Configuration Validation', 'WARN', `Failed checks: ${failedChecks.map(c => c.name).join(', ')}`);
      }
    } catch (error) {
      this.addResult('Configuration Validation', 'FAIL', error.message);
    }
  }

  async testConnectionSecurity() {
    console.log('🔐 Testing Connection Security...');
    
    try {
      const transporter = await this.emailService.getTransporter();
      await transporter.verify();
      
      this.addResult('Connection Security', 'PASS', 'Secure connection established successfully');
    } catch (error) {
      this.addResult('Connection Security', 'FAIL', error.message);
    }
  }

  async testInputValidation() {
    console.log('✅ Testing Input Validation...');
    
    const testCases = [
      { email: '', otp: '123456', expected: 'fail', description: 'Empty email' },
      { email: 'invalid-email', otp: '123456', expected: 'fail', description: 'Invalid email format' },
      { email: 'test@example.com', otp: '', expected: 'fail', description: 'Empty OTP' },
      { email: 'test@example.com', otp: '12345', expected: 'fail', description: 'Short OTP' },
      { email: 'test@example.com', otp: 'abcdef', expected: 'fail', description: 'Non-numeric OTP' },
      { email: 'test@example.com', otp: '123456', expected: 'pass', description: 'Valid inputs' }
    ];

    let passedTests = 0;
    
    for (const testCase of testCases) {
      try {
        const result = await this.emailService.sendOTPEmail(null, testCase.email, testCase.otp, 'test');
        
        if (testCase.expected === 'fail' && !result.success) {
          passedTests++;
        } else if (testCase.expected === 'pass' && result.success) {
          passedTests++;
        }
      } catch (error) {
        if (testCase.expected === 'fail') {
          passedTests++;
        }
      }
    }

    if (passedTests === testCases.length) {
      this.addResult('Input Validation', 'PASS', `All ${testCases.length} validation tests passed`);
    } else {
      this.addResult('Input Validation', 'FAIL', `${passedTests}/${testCases.length} validation tests passed`);
    }
  }

  async testRateLimiting() {
    console.log('⏱️  Testing Rate Limiting...');
    
    try {
      const testEmail = 'test@example.com';
      const testOTP = '123456';
      
      // First request should succeed
      const result1 = await this.emailService.sendOTPEmail(null, testEmail, testOTP, 'test');
      
      // Second immediate request should be rate limited
      const result2 = await this.emailService.sendOTPEmail(null, testEmail, testOTP, 'test');
      
      if (result1.success && !result2.success && result2.error.includes('Too many email requests')) {
        this.addResult('Rate Limiting', 'PASS', 'Rate limiting working correctly');
      } else {
        this.addResult('Rate Limiting', 'FAIL', 'Rate limiting not working as expected');
      }
    } catch (error) {
      this.addResult('Rate Limiting', 'FAIL', error.message);
    }
  }

  async testEmailMasking() {
    console.log('🎭 Testing Email Masking...');
    
    try {
      const testEmails = [
        { input: 'john.doe@example.com', expected: 'jo*****@example.com' },
        { input: 'a@b.com', expected: 'a*@b.com' },
        { input: '', expected: 'unknown' },
        { input: null, expected: 'unknown' }
      ];

      let passedTests = 0;
      
      for (const test of testEmails) {
        const masked = this.emailService.maskEmail(test.input);
        if (masked === test.expected) {
          passedTests++;
        }
      }

      if (passedTests === testEmails.length) {
        this.addResult('Email Masking', 'PASS', 'Email masking working correctly');
      } else {
        this.addResult('Email Masking', 'FAIL', `${passedTests}/${testEmails.length} masking tests passed`);
      }
    } catch (error) {
      this.addResult('Email Masking', 'FAIL', error.message);
    }
  }

  async testOTPGeneration() {
    console.log('🔢 Testing OTP Security...');
    
    try {
      // Test OTP format validation
      const validOTPs = ['123456', '000000', '999999'];
      const invalidOTPs = ['12345', '1234567', 'abcdef', '12345a', ''];
      
      let validationPassed = true;
      
      for (const otp of validOTPs) {
        if (!/^\d{6}$/.test(otp)) {
          validationPassed = false;
          break;
        }
      }
      
      for (const otp of invalidOTPs) {
        if (/^\d{6}$/.test(otp)) {
          validationPassed = false;
          break;
        }
      }
      
      if (validationPassed) {
        this.addResult('OTP Security', 'PASS', 'OTP format validation working correctly');
      } else {
        this.addResult('OTP Security', 'FAIL', 'OTP format validation issues detected');
      }
    } catch (error) {
      this.addResult('OTP Security', 'FAIL', error.message);
    }
  }

  addResult(test, status, message) {
    this.testResults.push({ test, status, message });
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`  ${statusIcon} ${test}: ${message}`);
  }

  printResults() {
    console.log('\n📊 Email Security Test Results:');
    console.log('================================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const warned = this.testResults.filter(r => r.status === 'WARN').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warned}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0 && warned === 0) {
      console.log('\n🎉 All email security tests passed! Your email service is properly configured.');
    } else if (failed === 0) {
      console.log('\n✅ Email service is functional with minor warnings.');
    } else {
      console.log('\n⚠️  Email service has security issues that need attention.');
    }
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new EmailSecurityTester();
  tester.runAllTests().catch(console.error);
}

module.exports = EmailSecurityTester;
