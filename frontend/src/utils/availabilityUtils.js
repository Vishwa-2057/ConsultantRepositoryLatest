/**
 * Utility functions for doctor availability and appointment scheduling
 */

/**
 * Get available time slots for a doctor on a specific date
 * @param {Array} availability - Doctor's weekly availability
 * @param {Array} exceptions - Schedule exceptions for the doctor
 * @param {Array} existingAppointments - Existing appointments for the doctor
 * @param {Date} selectedDate - The date to check availability for
 * @param {number} duration - Duration in minutes (default 30)
 * @returns {Array} Array of available time slots
 */
export const getAvailableTimeSlots = (availability, exceptions, existingAppointments, selectedDate, duration = 30) => {
  const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dateString = selectedDate.toISOString().split('T')[0];
  
  // Check if there's an exception for this date
  const exception = exceptions.find(ex => {
    const exDate = new Date(ex.date).toISOString().split('T')[0];
    return exDate === dateString && ex.isActive;
  });
  
  // If exception is "unavailable", return empty array
  if (exception && exception.type === 'unavailable') {
    return [];
  }
  
  // Get the day's availability slots and slot duration
  let daySlots = [];
  let slotInterval = 30; // Default interval
  
  if (exception && exception.type === 'custom_hours') {
    // Use exception custom hours
    daySlots = [{
      startTime: exception.startTime,
      endTime: exception.endTime
    }];
  } else {
    // Use regular weekly availability
    const availabilityForDay = availability.filter(slot => slot.dayOfWeek === dayOfWeek && slot.isActive);
    daySlots = availabilityForDay.map(slot => ({
      startTime: slot.startTime,
      endTime: slot.endTime
    }));
    
    // Get slot duration from availability (all slots should have the same duration)
    if (availabilityForDay.length > 0 && availabilityForDay[0].slotDuration) {
      slotInterval = availabilityForDay[0].slotDuration;
    }
  }
  
  if (daySlots.length === 0) {
    return [];
  }
  
  // Helper function to check if a time range is available
  const isTimeRangeAvailable = (startTimeMinutes, durationMinutes) => {
    const endTimeMinutes = startTimeMinutes + durationMinutes;
    
    // Check if the time range fits within any availability slot
    const fitsInSlot = daySlots.some(slot => {
      const [slotStartHour, slotStartMin] = slot.startTime.split(':').map(Number);
      const [slotEndHour, slotEndMin] = slot.endTime.split(':').map(Number);
      const slotStart = slotStartHour * 60 + slotStartMin;
      const slotEnd = slotEndHour * 60 + slotEndMin;
      
      return startTimeMinutes >= slotStart && endTimeMinutes <= slotEnd;
    });
    
    if (!fitsInSlot) return false;
    
    // Check if the time range overlaps with any break periods (for custom_hours exceptions)
    if (exception && exception.type === 'custom_hours' && exception.breaks && exception.breaks.length > 0) {
      const overlapsWithBreak = exception.breaks.some(breakPeriod => {
        const [breakStartHour, breakStartMin] = breakPeriod.startTime.split(':').map(Number);
        const [breakEndHour, breakEndMin] = breakPeriod.endTime.split(':').map(Number);
        const breakStart = breakStartHour * 60 + breakStartMin;
        const breakEnd = breakEndHour * 60 + breakEndMin;
        
        // Check if slot overlaps with break period
        return (startTimeMinutes < breakEnd && endTimeMinutes > breakStart);
      });
      
      if (overlapsWithBreak) return false;
    }
    
    // Check if any existing appointment conflicts with this time range
    return !existingAppointments.some(apt => {
      const aptDate = new Date(apt.date).toISOString().split('T')[0];
      if (aptDate !== dateString || apt.status === 'Cancelled') return false;
      
      const [aptHour, aptMin] = apt.time.split(':').map(Number);
      const aptStart = aptHour * 60 + aptMin;
      const aptEnd = aptStart + (apt.duration || 30);
      
      // Check for overlap
      return (startTimeMinutes < aptEnd && endTimeMinutes > aptStart);
    });
  };
  
  // Generate time slots (using configured interval, but check for full duration availability)
  const timeSlots = [];
  
  // Check if selected date is today
  const today = new Date();
  const isToday = dateString === today.toISOString().split('T')[0];
  const currentTimeInMinutes = isToday ? (today.getHours() * 60 + today.getMinutes()) : 0;
  
  daySlots.forEach(slot => {
    const [startHour, startMin] = slot.startTime.split(':').map(Number);
    const [endHour, endMin] = slot.endTime.split(':').map(Number);
    
    let currentTime = startHour * 60 + startMin; // Convert to minutes
    const endTime = endHour * 60 + endMin;
    
    while (currentTime + duration <= endTime) {
      const hour = Math.floor(currentTime / 60);
      const min = currentTime % 60;
      const timeString = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      
      // Skip past time slots if today is selected
      if (isToday && currentTime <= currentTimeInMinutes) {
        currentTime += slotInterval;
        continue;
      }
      
      // Check if this time slot has enough consecutive free time for the duration
      if (isTimeRangeAvailable(currentTime, duration)) {
        timeSlots.push({
          time: timeString,
          display: formatTime(timeString),
          duration: duration
        });
      }
      
      currentTime += slotInterval;
    }
  });
  
  return timeSlots;
};

/**
 * Check if a doctor is available on a specific date
 * @param {Array} availability - Doctor's weekly availability
 * @param {Array} exceptions - Schedule exceptions
 * @param {Date} date - Date to check
 * @returns {boolean} True if available
 */
export const isDoctorAvailable = (availability, exceptions, date) => {
  const dayOfWeek = date.getDay();
  const dateString = date.toISOString().split('T')[0];
  
  // Check for exceptions first
  const exception = exceptions.find(ex => {
    const exDate = new Date(ex.date).toISOString().split('T')[0];
    return exDate === dateString && ex.isActive;
  });
  
  if (exception) {
    return exception.type === 'custom_hours'; // Available if custom hours, not if unavailable
  }
  
  // Check regular availability
  return availability.some(slot => slot.dayOfWeek === dayOfWeek && slot.isActive);
};

/**
 * Get disabled dates for a date picker (dates when doctor is not available)
 * @param {Array} availability - Doctor's weekly availability
 * @param {Array} exceptions - Schedule exceptions
 * @param {Date} startDate - Start date range
 * @param {Date} endDate - End date range
 * @returns {Array} Array of disabled dates
 */
export const getDisabledDates = (availability, exceptions, startDate, endDate) => {
  const disabledDates = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (!isDoctorAvailable(availability, exceptions, current)) {
      disabledDates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return disabledDates;
};

/**
 * Format time string to 12-hour format
 * @param {string} time - Time in HH:MM format
 * @returns {string} Formatted time (e.g., "2:30 PM")
 */
export const formatTime = (time) => {
  const [hour, min] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${String(min).padStart(2, '0')} ${period}`;
};

/**
 * Check if a specific time slot is available
 * @param {string} doctorId - Doctor ID
 * @param {string} date - Date string
 * @param {string} time - Time string
 * @param {Array} existingAppointments - Existing appointments
 * @returns {boolean} True if slot is available
 */
export const isTimeSlotAvailable = (doctorId, date, time, existingAppointments) => {
  return !existingAppointments.some(apt => 
    apt.doctorId === doctorId &&
    new Date(apt.date).toISOString().split('T')[0] === date &&
    apt.time === time &&
    apt.status !== 'Cancelled'
  );
};
