const express = require('express');
const router = express.Router();
const DoctorAvailability = require('../models/DoctorAvailability');
const Doctor = require('../models/Doctor');

// Get availability for a specific doctor
router.get('/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const availability = await DoctorAvailability.find({ 
      doctorId,
      isActive: true 
    }).sort({ dayOfWeek: 1, startTime: 1 });
    
    res.json({
      success: true,
      availability
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch availability',
      error: error.message
    });
  }
});

// Get available time slots for a doctor on a specific date
router.get('/:doctorId/slots/:date', async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const Appointment = require('../models/Appointment');
    const ScheduleException = require('../models/ScheduleException');
    
    // Get doctor's weekly availability
    const availability = await DoctorAvailability.find({ 
      doctorId,
      isActive: true 
    });
    
    // Get exceptions for this date
    const selectedDate = new Date(date);
    const exceptions = await ScheduleException.find({
      doctorId,
      date: {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lte: new Date(selectedDate.setHours(23, 59, 59, 999))
      },
      isActive: true
    });
    
    // Get existing appointments for this date
    const appointments = await Appointment.find({
      doctorId,
      date: {
        $gte: new Date(date + 'T00:00:00'),
        $lte: new Date(date + 'T23:59:59')
      },
      status: { $ne: 'Cancelled' }
    });
    
    res.json({
      success: true,
      availability,
      exceptions,
      appointments
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time slots',
      error: error.message
    });
  }
});

// Create or update availability for a doctor (bulk operation)
router.post('/bulk', async (req, res) => {
  try {
    const { doctorId, clinicId, schedule, slotDuration } = req.body;
    const Appointment = require('../models/Appointment');
    
    console.log('Bulk update request:', { doctorId, clinicId, scheduleLength: schedule?.length, slotDuration });
    
    if (!doctorId || !clinicId || !schedule) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, Clinic ID, and schedule are required'
      });
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check for existing appointments in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureAppointments = await Appointment.find({
      doctorId,
      date: { $gte: today },
      status: { $nin: ['Cancelled', 'Completed'] }
    });

    // Get days that have appointments
    const daysWithAppointments = new Set();
    futureAppointments.forEach(apt => {
      const dayOfWeek = new Date(apt.date).getDay();
      daysWithAppointments.add(dayOfWeek);
    });

    // Get current availability for comparison
    const currentAvailability = await DoctorAvailability.find({ doctorId, clinicId });
    
    // Check if any day being modified has appointments
    const conflictingDays = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const day of schedule) {
      if (daysWithAppointments.has(day.dayOfWeek)) {
        // Get current slots for this day
        const currentSlots = currentAvailability
          .filter(s => s.dayOfWeek === day.dayOfWeek)
          .map(s => ({ start: s.startTime, end: s.endTime }))
          .sort((a, b) => a.start.localeCompare(b.start));
        
        // Get new slots for this day
        const newSlots = day.enabled && day.slots 
          ? day.slots.map(s => ({ start: s.startTime, end: s.endTime })).sort((a, b) => a.start.localeCompare(b.start))
          : [];
        
        // Check if availability is being changed
        const isDifferent = JSON.stringify(currentSlots) !== JSON.stringify(newSlots);
        
        if (isDifferent) {
          conflictingDays.push(dayNames[day.dayOfWeek]);
        }
      }
    }

    // If there are conflicts, return warning
    if (conflictingDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot modify availability for ${conflictingDays.join(', ')} - existing appointments are scheduled on these days. Please cancel or reschedule appointments first.`,
        conflictingDays,
        appointmentCount: futureAppointments.length
      });
    }

    // Delete existing availability for this doctor
    await DoctorAvailability.deleteMany({ doctorId, clinicId });

    // Create new availability entries
    const availabilityEntries = [];
    for (const day of schedule) {
      console.log('Processing day:', { dayOfWeek: day.dayOfWeek, enabled: day.enabled, slotsCount: day.slots?.length });
      if (day.enabled && day.slots && day.slots.length > 0) {
        // Support multiple time slots per day (for breaks)
        for (const slot of day.slots) {
          if (slot.startTime && slot.endTime) {
            availabilityEntries.push({
              doctorId,
              clinicId,
              dayOfWeek: day.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotDuration: slotDuration || 30,
              isActive: true
            });
          }
        }
      }
    }
    
    console.log('Creating availability entries:', availabilityEntries.length);

    if (availabilityEntries.length > 0) {
      await DoctorAvailability.insertMany(availabilityEntries);
    }

    // Fetch and return updated availability
    const updatedAvailability = await DoctorAvailability.find({ 
      doctorId,
      clinicId,
      isActive: true 
    }).sort({ dayOfWeek: 1, startTime: 1 });

    res.json({
      success: true,
      message: 'Availability updated successfully',
      availability: updatedAvailability
    });
  } catch (error) {
    console.error('Error updating availability (bulk):', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      error: error.message,
      details: error.stack
    });
  }
});

// Create single availability entry
router.post('/', async (req, res) => {
  try {
    const { doctorId, clinicId, dayOfWeek, startTime, endTime } = req.body;
    
    if (!doctorId || !clinicId || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const availability = new DoctorAvailability({
      doctorId,
      clinicId,
      dayOfWeek,
      startTime,
      endTime,
      isActive: true
    });

    await availability.save();

    res.status(201).json({
      success: true,
      message: 'Availability created successfully',
      availability
    });
  } catch (error) {
    console.error('Error creating availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create availability',
      error: error.message
    });
  }
});

// Update availability entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, isActive } = req.body;
    
    const availability = await DoctorAvailability.findByIdAndUpdate(
      id,
      { startTime, endTime, isActive },
      { new: true, runValidators: true }
    );

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    res.json({
      success: true,
      message: 'Availability updated successfully',
      availability
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      error: error.message
    });
  }
});

// Delete availability entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const availability = await DoctorAvailability.findByIdAndDelete(id);

    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'Availability not found'
      });
    }

    res.json({
      success: true,
      message: 'Availability deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete availability',
      error: error.message
    });
  }
});

module.exports = router;
