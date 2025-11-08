import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Stethoscope, AlertTriangle } from "lucide-react";
import { appointmentAPI, doctorAPI, doctorAvailabilityAPI } from "@/services/api";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { getAvailableTimeSlots } from '@/utils/availabilityUtils';

const RescheduleAppointmentModal = ({ isOpen, onClose, appointment, onSuccess }) => {
  const [formData, setFormData] = useState({
    doctorId: "",
    date: "",
    time: "",
    duration: "",
    notes: "",
    reason: ""
  });

  const [errors, setErrors] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);

  // Initialize form data when appointment changes
  useEffect(() => {
    if (appointment && isOpen) {
      const appointmentDate = appointment.date ? 
        (typeof appointment.date === 'string' ? 
          parseISO(appointment.date).toISOString().split('T')[0] : 
          appointment.date.toISOString().split('T')[0]) : 
        "";

      setFormData({
        doctorId: appointment.doctorId?._id || appointment.doctorId || "",
        date: appointmentDate,
        time: appointment.time || "",
        duration: appointment.duration?.toString() || "30",
        notes: appointment.notes || "",
        reason: `Rescheduled from ${format(parseISO(appointment.date), 'MMM dd, yyyy')} at ${appointment.time}`
      });
    }
  }, [appointment, isOpen]);

  // Load doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDoctors();
    }
  }, [isOpen]);

  // Load available slots when doctor and date change
  useEffect(() => {
    if (formData.doctorId && formData.date && isOpen) {
      loadAvailableSlots();
    } else if (!formData.doctorId || !formData.date) {
      setAvailableSlots([]);
      setFormData(prev => ({ ...prev, time: '' })); // Clear selected time
    }
  }, [formData.doctorId, formData.date, isOpen]);

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      console.log('Loading slots for doctor:', formData.doctorId, 'date:', formData.date);
      const response = await doctorAvailabilityAPI.getAvailableSlots(formData.doctorId, formData.date);
      console.log('Slots response:', response);
      
      if (response.success) {
        const { availability, exceptions, appointments } = response;
        const selectedDate = new Date(formData.date);
        
        // Get slot duration from availability
        const duration = availability.length > 0 && availability[0].slotDuration 
          ? availability[0].slotDuration 
          : 30;
        setSlotDuration(duration);
        setFormData(prev => ({ ...prev, duration: duration.toString() }));
        
        // Exclude the current appointment being rescheduled from the booked appointments
        // This frees up the original slot so it can be selected again if needed
        const filteredAppointments = appointments.filter(apt => 
          apt._id !== appointment._id && apt.id !== appointment._id
        );
        
        console.log('Total appointments:', appointments.length, 'After filtering current:', filteredAppointments.length);
        
        // Calculate available slots using utility function
        const slots = getAvailableTimeSlots(availability, exceptions, filteredAppointments, selectedDate, duration);
        console.log('Calculated available slots:', slots);
        setAvailableSlots(slots);
      } else {
        console.log('Response not successful:', response);
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
      toast.error('Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await doctorAPI.getAll();
      const list = response.doctors || response.data || [];
      setDoctors(list.filter(doctor => doctor.isActive !== false));
    } catch (error) {
      console.error('Failed to load doctors:', error);
      toast.error('Failed to load doctors');
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const durationOptions = [
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
    { value: "120", label: "2 hours" }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.doctorId) {
      newErrors.doctorId = "Please select a doctor";
    }
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    if (!formData.time) {
      newErrors.time = "Time is required";
    }

    // Check if the new date/time is in the future
    if (formData.date && formData.time) {
      const newDateTime = new Date(`${formData.date}T${formData.time}`);
      const now = new Date();
      if (newDateTime <= now) {
        newErrors.date = "Please select a future date and time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Prepare updated appointment data - include all required fields
      const updatedData = {
        patientId: appointment.patientId?._id || appointment.patientId,
        doctorId: formData.doctorId,
        appointmentType: appointment.appointmentType,
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration, 10),
        priority: appointment.priority || 'normal',
        notes: formData.notes.trim(),
        reason: formData.reason.trim(),
        status: "Scheduled" // Reset status to scheduled when rescheduled
      };

      // Include clinicId if it exists in the original appointment
      if (appointment.clinicId) {
        updatedData.clinicId = appointment.clinicId?._id || appointment.clinicId;
      }

      // Include location if it exists
      if (appointment.location) {
        updatedData.location = appointment.location;
      }
      
      // Validate that we have all required fields
      if (!updatedData.patientId || !updatedData.doctorId || !updatedData.appointmentType) {
        throw new Error('Missing required fields for appointment update');
      }

      console.log('Sending reschedule data:', updatedData);
      console.log('Original appointment:', appointment);
      
      // Update the appointment
      await appointmentAPI.update(appointment._id, updatedData);
      
      toast.success('Appointment rescheduled successfully');
      
      // Close modal first
      handleClose();
      
      // Call onSuccess to refresh the appointments list
      // This will update the UI without a full page reload
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
      toast.error(`Failed to reschedule appointment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      doctorId: "",
      date: "",
      time: "",
      duration: "30",
      notes: "",
      reason: ""
    });
    setErrors({});
    onClose();
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  // Check if there are any changes
  const hasChanges = appointment && (
    formData.doctorId !== (appointment.doctorId?._id || appointment.doctorId) ||
    formData.date !== (appointment.date ? 
      (typeof appointment.date === 'string' ? 
        parseISO(appointment.date).toISOString().split('T')[0] : 
        appointment.date.toISOString().split('T')[0]) : 
      "") ||
    formData.time !== appointment.time ||
    formData.duration !== appointment.duration?.toString()
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5 text-blue-600" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Update the appointment details. You can change the date, time, and doctor if needed.
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Current Appointment Details
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div>
                <span className="font-medium">Patient:</span> {appointment.patientId?.fullName || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Doctor:</span> Dr. {appointment.doctorId?.fullName || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Date:</span> {format(parseISO(appointment.date), 'MMM dd, yyyy')}
              </div>
              <div>
                <span className="font-medium">Time:</span> {appointment.time}
              </div>
              <div>
                <span className="font-medium">Type:</span> {appointment.appointmentType}
              </div>
              <div>
                <span className="font-medium">Status:</span> {appointment.status}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Doctor Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              New Appointment Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctorId">Doctor *</Label>
                <Select value={formData.doctorId} onValueChange={(value) => handleInputChange("doctorId", value)}>
                  <SelectTrigger className={errors.doctorId ? "border-red-500" : ""}>
                    <SelectValue placeholder={loadingDoctors ? "Loading doctors..." : "Choose a doctor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor._id} value={doctor._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">Dr. {doctor.fullName}</span>
                          <span className="text-sm text-muted-foreground">
                            {doctor.specialty} • {doctor.phone}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.doctorId && (
                  <p className="text-sm text-red-600">{errors.doctorId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Slot Duration</Label>
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-gray-50">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{slotDuration} minutes</span>
                  <span className="text-xs text-muted-foreground">(configured)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">New Date *</Label>
                <Input
                  id="date"
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  className={errors.date ? "border-red-500" : ""}
                />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Available Time Slots *</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center p-4 border rounded-md">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading available slots...</span>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <Select 
                    value={formData.time} 
                    onValueChange={(value) => handleInputChange("time", value)}
                  >
                    <SelectTrigger className={errors.time ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select available time" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlots.map((slot) => {
                        // Handle both string slots and object slots
                        const slotTime = typeof slot === 'string' ? slot : slot.time;
                        const slotDisplay = typeof slot === 'string' ? slot : (slot.display || slot.time);
                        return (
                          <SelectItem key={slotTime} value={slotTime}>
                            {slotDisplay}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : formData.date && formData.doctorId ? (
                  <div className="p-3 border border-amber-200 bg-amber-50 rounded-md">
                    <p className="text-sm text-amber-800">No available slots for this date. Please select a different date.</p>
                  </div>
                ) : (
                  <div className="p-3 border border-gray-200 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">Please select a doctor and date to view available time slots.</p>
                  </div>
                )}
                {errors.time && (
                  <p className="text-sm text-red-600">{errors.time}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Rescheduling</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for rescheduling..."
                value={formData.reason}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes or special requirements..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Summary */}
          {hasChanges && formData.doctorId && formData.date && formData.time && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">New Appointment Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                <div>
                  <span className="font-medium">Doctor:</span> Dr. {doctors.find(d => d._id === formData.doctorId)?.fullName}
                </div>
                <div>
                  <span className="font-medium">Specialty:</span> {doctors.find(d => d._id === formData.doctorId)?.specialty}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {new Date(formData.date).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {formData.time}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {durationOptions.find(d => d.value === formData.duration)?.label}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="gradient-button"
              disabled={!hasChanges || submitting}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Reschedule Appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleAppointmentModal;
