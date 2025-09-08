const mongoose = require('mongoose');
const EmailConfig = require('./models/EmailConfig');
require('dotenv').config();

async function getConfigId() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare');
    const config = await EmailConfig.findOne({});
    if (config) {
      console.log('Config ID:', config._id);
      console.log('Email:', config.email);
      console.log('Current Password:', config.password);
    } else {
      console.log('No email configuration found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

getConfigId();
