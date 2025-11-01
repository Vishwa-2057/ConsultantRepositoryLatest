const express = require('express');
const router = express.Router();
const ScheduleException = require('../models/ScheduleException');

// Get exceptions for a specific doctor
router.get('/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;
    
    let query = { doctorId, isActive: true };
    
    // Filter by date range if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const exceptions = await ScheduleException.find(query).sort({ date: 1 });
    
    res.json({
      success: true,
      exceptions
    });
  } catch (error) {
    console.error('Error fetching exceptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exceptions',
      error: error.message
    });
  }
});

// Create schedule exception
router.post('/', async (req, res) => {
  try {
    const { doctorId, clinicId, date, type, startTime, endTime, reason, breaks } = req.body;
    
    if (!doctorId || !clinicId || !date || !type) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, Clinic ID, date, and type are required'
      });
    }

    // Validate custom_hours and blocked_hours type has times
    if ((type === 'custom_hours' || type === 'blocked_hours') && (!startTime || !endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time are required for custom hours and blocked hours'
      });
    }

    // Check if an exception already exists for this doctor on this date
    const exceptionDate = new Date(date);
    exceptionDate.setHours(0, 0, 0, 0);
    
    const existingException = await ScheduleException.findOne({
      doctorId,
      date: {
        $gte: exceptionDate,
        $lt: new Date(exceptionDate.getTime() + 24 * 60 * 60 * 1000)
      },
      isActive: true
    });

    if (existingException) {
      return res.status(400).json({
        success: false,
        message: 'An exception already exists for this date. Please delete the existing exception first or choose a different date.'
      });
    }

    const exception = new ScheduleException({
      doctorId,
      clinicId,
      date: new Date(date),
      type,
      startTime,
      endTime,
      breaks: breaks || [],
      reason,
      isActive: true
    });

    await exception.save();

    res.status(201).json({
      success: true,
      message: 'Exception created successfully',
      exception
    });
  } catch (error) {
    console.error('Error creating exception:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exception',
      error: error.message
    });
  }
});

// Bulk create exceptions (for vacation periods)
router.post('/bulk', async (req, res) => {
  try {
    const { doctorId, clinicId, startDate, endDate, type, reason } = req.body;
    
    if (!doctorId || !clinicId || !startDate || !endDate || !type) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const exceptions = [];

    // Create exception for each day in the range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      exceptions.push({
        doctorId,
        clinicId,
        date: new Date(date),
        type,
        reason,
        isActive: true
      });
    }

    await ScheduleException.insertMany(exceptions);

    res.status(201).json({
      success: true,
      message: `${exceptions.length} exceptions created successfully`,
      count: exceptions.length
    });
  } catch (error) {
    console.error('Error creating bulk exceptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exceptions',
      error: error.message
    });
  }
});

// Update exception
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, startTime, endTime, reason, isActive } = req.body;
    
    const exception = await ScheduleException.findByIdAndUpdate(
      id,
      { type, startTime, endTime, reason, isActive },
      { new: true, runValidators: true }
    );

    if (!exception) {
      return res.status(404).json({
        success: false,
        message: 'Exception not found'
      });
    }

    res.json({
      success: true,
      message: 'Exception updated successfully',
      exception
    });
  } catch (error) {
    console.error('Error updating exception:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exception',
      error: error.message
    });
  }
});

// Delete exception
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const exception = await ScheduleException.findByIdAndDelete(id);

    if (!exception) {
      return res.status(404).json({
        success: false,
        message: 'Exception not found'
      });
    }

    res.json({
      success: true,
      message: 'Exception deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exception:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exception',
      error: error.message
    });
  }
});

module.exports = router;
