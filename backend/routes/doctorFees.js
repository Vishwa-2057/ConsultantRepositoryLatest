const express = require('express');
const router = express.Router();
const DoctorFees = require('../models/DoctorFees');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

// Helper function to get clinic ID
const getClinicId = async (user) => {
  if (user.role === 'clinic') {
    return user.id;
  } else if (user.role === 'doctor') {
    const doctor = await Doctor.findById(user.id).select('clinicId');
    return doctor?.clinicId;
  }
  return null;
};

// Helper function to get uploader model name
const getUploaderModel = (role) => {
  if (role === 'clinic') return 'Clinic';
  if (role === 'doctor') return 'Doctor';
  if (role === 'nurse' || role === 'head_nurse' || role === 'supervisor') return 'Nurse';
  return null;
};

// GET /api/doctor-fees/:doctorId - Get fees for a specific doctor
router.get('/:doctorId', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    // Verify doctor belongs to the clinic
    const doctor = await Doctor.findOne({ _id: doctorId, clinicId });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found or does not belong to your clinic' });
    }

    // Get or create fees
    const fees = await DoctorFees.getOrCreateFees(doctorId, clinicId);

    res.json({ 
      success: true,
      fees 
    });
  } catch (error) {
    console.error('Error fetching doctor fees:', error);
    res.status(500).json({ error: 'Failed to fetch doctor fees', message: error.message });
  }
});

// PUT /api/doctor-fees/:doctorId - Update fees for a specific doctor
router.put('/:doctorId', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { appointmentFees } = req.body;

    if (appointmentFees === undefined || appointmentFees === null) {
      return res.status(400).json({ error: 'Appointment fees is required' });
    }

    if (appointmentFees < 0) {
      return res.status(400).json({ error: 'Appointment fees cannot be negative' });
    }

    // Get clinic ID
    const clinicId = await getClinicId(req.user);
    if (!clinicId) {
      return res.status(400).json({ error: 'Unable to determine clinic association' });
    }

    // Verify doctor belongs to the clinic
    const doctor = await Doctor.findOne({ _id: doctorId, clinicId });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found or does not belong to your clinic' });
    }

    // Update fees
    const fees = await DoctorFees.updateFees(
      doctorId,
      clinicId,
      appointmentFees,
      req.user.id,
      getUploaderModel(req.user.role)
    );

    res.json({
      success: true,
      message: 'Doctor fees updated successfully',
      fees
    });
  } catch (error) {
    console.error('Error updating doctor fees:', error);
    res.status(500).json({ error: 'Failed to update doctor fees', message: error.message });
  }
});

// GET /api/doctor-fees/clinic/:clinicId - Get all fees for a clinic
router.get('/clinic/:clinicId', auth, async (req, res) => {
  try {
    const { clinicId } = req.params;

    // Verify user has access to this clinic
    const userClinicId = await getClinicId(req.user);
    if (userClinicId !== clinicId) {
      return res.status(403).json({ error: 'Access denied to this clinic' });
    }

    const fees = await DoctorFees.find({ clinicId })
      .populate('doctorId', 'fullName specialty email')
      .sort({ 'doctorId.fullName': 1 });

    res.json({
      success: true,
      fees,
      count: fees.length
    });
  } catch (error) {
    console.error('Error fetching clinic doctor fees:', error);
    res.status(500).json({ error: 'Failed to fetch clinic doctor fees', message: error.message });
  }
});

module.exports = router;
