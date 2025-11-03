const mongoose = require('mongoose');

const doctorFeesSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
    unique: true,
    index: true
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },
  appointmentFees: {
    type: Number,
    required: true,
    min: 0,
    default: 500
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'updatedByModel'
  },
  updatedByModel: {
    type: String,
    enum: ['Clinic', 'Doctor', 'Nurse']
  }
}, {
  timestamps: true
});

// Index for efficient querying
doctorFeesSchema.index({ doctorId: 1, clinicId: 1 });

// Static method to get or create fees for a doctor
doctorFeesSchema.statics.getOrCreateFees = async function(doctorId, clinicId) {
  let fees = await this.findOne({ doctorId, clinicId });
  
  if (!fees) {
    fees = await this.create({
      doctorId,
      clinicId,
      appointmentFees: 500
    });
  }
  
  return fees;
};

// Static method to update fees
doctorFeesSchema.statics.updateFees = async function(doctorId, clinicId, appointmentFees, updatedBy, updatedByModel) {
  return this.findOneAndUpdate(
    { doctorId, clinicId },
    { 
      appointmentFees,
      updatedBy,
      updatedByModel
    },
    { 
      new: true,
      upsert: true,
      runValidators: true
    }
  );
};

const DoctorFees = mongoose.model('DoctorFees', doctorFeesSchema);

module.exports = DoctorFees;
