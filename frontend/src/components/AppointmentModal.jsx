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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar, Clock, User, Phone, Mail, MapPin, Stethoscope, X, AlertCircle, Video, MessageCircle, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { appointmentAPI, patientAPI, doctorAPI, doctorAvailabilityAPI } from "@/services/api";
import { getCurrentUser, isDoctor } from "@/utils/roleUtils";
import { validators, sanitizers } from "@/utils/validation";
import { useAuditLog } from "@/hooks/useAuditLog";
import { getAvailableTimeSlots } from "@/utils/availabilityUtils";

const AppointmentModal = ({ isOpen, onClose, onSubmit }) => {
  const { logComponentAccess, logFormSubmission, logAppointmentAccess } = useAuditLog();
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    appointmentType: "",
    appointmentMode: "in-person", // 'in-person' or 'virtual'
    consultationMode: "", // For virtual: 'Video', 'Phone', 'Chat'
    date: "",
    time: "",
    duration: "30",
    notes: "",
    priority: "normal",
    reason: "",
    symptoms: ""
  });

  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [isVirtualAppointment, setIsVirtualAppointment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [doctorComboboxOpen, setDoctorComboboxOpen] = useState(false);
  const [appointmentTypeComboboxOpen, setAppointmentTypeComboboxOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Get current user info
  const currentUser = getCurrentUser();
  const isDoctorUser = currentUser?.role === 'doctor';
  
  // Additional debug - check localStorage directly
  const rawAuthUser = localStorage.getItem('authUser');
  console.log('Raw authUser from localStorage:', rawAuthUser);
  
  // Debug logging
  console.log('Current user:', currentUser);
  console.log('Is doctor user:', isDoctorUser);
  console.log('User role:', currentUser?.role);
  console.log('Role check result:', currentUser?.role === 'doctor');
  console.log('Type of role:', typeof currentUser?.role);

  // Load patients and doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPatients();
      loadDoctors();
      // Log appointment form access
      logComponentAccess('AppointmentModal', 'OPEN');
    }
  }, [isOpen, logComponentAccess]);


  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await patientAPI.getAll(1, 100); // Get up to 100 patients
      const list = response.patients || response.data || [];
      setPatients(list);
    } catch (error) {
      console.error('Failed to load patients:', error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await doctorAPI.getAll(1, 100); // Get up to 100 doctors
      const list = response.doctors || response.data || [];
      setDoctors(list);
      
      // Auto-select current doctor if user is a doctor
      if ((isDoctorUser || currentUser?.role === 'doctor') && currentUser) {
        // Try both id and _id fields
        const userId = currentUser.id || currentUser._id;
        console.log('Attempting to auto-select doctor. Current user ID:', userId);
        console.log('Current user object keys:', Object.keys(currentUser));
        console.log('Available doctors:', list.map(d => ({ id: d._id, name: d.fullName })));
        
        const currentDoctorInList = list.find(doctor => doctor._id === userId);
        console.log('Found current doctor in list:', currentDoctorInList);
        
        if (currentDoctorInList) {
          console.log('Auto-selecting doctor:', userId);
          setFormData(prev => ({ ...prev, doctorId: userId }));
        } else {
          console.log('Current doctor not found in list. Trying alternative matching...');
          // Try to find by other fields if direct ID match fails
          const altMatch = list.find(doctor => 
            doctor.email === currentUser.email || 
            doctor.fullName === currentUser.fullName ||
            doctor.fullName === currentUser.name
          );
          if (altMatch) {
            console.log('Found doctor by alternative matching:', altMatch);
            setFormData(prev => ({ ...prev, doctorId: altMatch._id }));
          }
        }
      } else {
        console.log('Not auto-selecting doctor. isDoctorUser:', isDoctorUser, 'currentUser exists:', !!currentUser);
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const appointmentTypes = [
    "General Consultation",
    "Follow-up Visit"
  ];

  const durationOptions = [
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
    { value: "120", label: "2 hours" }
  ];

  const priorityOptions = [
    { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-800" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-800" }
  ];

  const consultationModes = [
    { value: "Video", label: "Video Call", icon: Video, color: "bg-blue-500" },
    { value: "Phone", label: "Phone Call", icon: Phone, color: "bg-green-500" },
    { value: "Chat", label: "Chat Session", icon: MessageCircle, color: "bg-purple-500" }
  ];

  // Load available slots when doctor and date are selected
  useEffect(() => {
    if (formData.doctorId && formData.date) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [formData.doctorId, formData.date]);

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      const response = await doctorAvailabilityAPI.getAvailableSlots(formData.doctorId, formData.date);
      
      if (response.success) {
        const { availability, exceptions, appointments } = response;
        const selectedDate = new Date(formData.date);
        const slots = getAvailableTimeSlots(availability, exceptions, appointments, selectedDate);
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleInputChange = (field, value) => {
    
    // Apply sanitization based on field type
    let sanitizedValue = value;
    switch (field) {
      case 'time':
        // Ensure time format is HH:MM
        if (value && value.length === 5) {
          sanitizedValue = value;
        }
        break;
      case 'notes':
        sanitizedValue = sanitizers.text(value).slice(0, 500);
        break;
      default:
        sanitizedValue = value;
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Patient validation
    if (!formData.patientId) {
      newErrors.patientId = "Please select a patient";
    }
    
    // Doctor validation - only require if user is not a doctor
    if (!formData.doctorId && !isDoctorUser && currentUser?.role !== 'doctor') {
      newErrors.doctorId = "Please select a doctor";
    }
    
    // Appointment type validation
    if (!formData.appointmentType) {
      newErrors.appointmentType = "Appointment type is required";
    }
    
    // Virtual appointment specific validations
    if (isVirtualAppointment) {
      if (!formData.consultationMode) {
        newErrors.consultationMode = "Consultation mode is required for virtual appointments";
      }
      if (!formData.reason || !formData.reason.trim()) {
        newErrors.reason = "Reason is required for virtual appointments";
      }
    }
    
    // Date validation
    const dateError = validators.required(formData.date, 'Date');
    if (dateError) {
      newErrors.date = dateError;
    } else {
      // Check if date is not in the past
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.date = "Appointment date cannot be in the past";
      }
      
      // Check if date is not too far in the future (e.g., 1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (selectedDate > oneYearFromNow) {
        newErrors.date = "Appointment date cannot be more than 1 year in the future";
      }
    }
    
    // Time validation
    const timeError = validators.required(formData.time, 'Time') || validators.time24(formData.time);
    if (timeError) {
      newErrors.time = timeError;
    } else {
      // Check business hours (8 AM to 6 PM)
      const [hours, minutes] = formData.time.split(':').map(Number);
      const timeInMinutes = hours * 60 + minutes;
      const startTime = 8 * 60; // 8:00 AM
      const endTime = 18 * 60; // 6:00 PM
      
      if (timeInMinutes < startTime || timeInMinutes >= endTime) {
        newErrors.time = "Appointment time must be between 8:00 AM and 6:00 PM";
      }
    }
    
    // Duration validation
    const durationError = validators.required(formData.duration, 'Duration');
    if (durationError) {
      newErrors.duration = durationError;
    } else {
      const duration = parseInt(formData.duration, 10);
      if (duration < 15 || duration > 240) {
        newErrors.duration = "Duration must be between 15 minutes and 4 hours";
      }
    }
    
    // Notes validation (optional but if provided, check length)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = "Notes must not exceed 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setSubmitting(true);
      try {
        // Prepare appointment data
        const appointmentData = {
          patientId: formData.patientId,
          doctorId: formData.doctorId,
          appointmentType: formData.appointmentType,
          date: formData.date,
          time: formData.time,
          duration: parseInt(formData.duration, 10),
          notes: formData.notes.trim(),
          priority: formData.priority,
          status: "Scheduled"
        };
        
        // Send to backend API
        const response = await appointmentAPI.create(appointmentData);
        
        // Log successful appointment creation
        await logFormSubmission('APPOINTMENT', 'CREATE', response.appointment._id || response.appointment.id, formData.patientId);
        await logAppointmentAccess(response.appointment._id || response.appointment.id, formData.patientId, formData.doctorId, 'CREATE');
        
        // Call onSubmit with the appointment data from backend response
        onSubmit(response.appointment);
        handleClose();
        
        // Reload the page to refresh the data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('Failed to create appointment:', error);
        // Set error state instead of alert
        setErrors(prev => ({ 
          ...prev, 
          submit: error.message || 'Failed to create appointment. Please try again.' 
        }));
      }
    }
  };

  const handleClose = () => {
    const userId = currentUser?.id || currentUser?._id;
    const isDoctor = isDoctorUser || currentUser?.role === 'doctor';
    setFormData({
      patientId: "",
      doctorId: isDoctor && userId ? userId : "", // Preserve doctor selection for doctors
      appointmentType: "",
      appointmentMode: "in-person",
      consultationMode: "",
      date: "",
      time: "",
      duration: "30",
      notes: "",
      priority: "normal",
      reason: "",
      symptoms: ""
    });
    setIsVirtualAppointment(false);
    setPatientSearchTerm("");
    setErrors({});
    setSubmitting(false);
    onClose();
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5 text-teal-600" />
            Schedule New Appointment
          </DialogTitle>
          <DialogDescription>
            Create a new appointment for your patient. Fill in all required fields to proceed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Appointment Mode Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Appointment Type
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsVirtualAppointment(false);
                  handleInputChange("appointmentMode", "in-person");
                  handleInputChange("consultationMode", "");
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  !isVirtualAppointment
                    ? "border-teal-600 bg-teal-50 text-teal-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <MapPin className="w-6 h-6 mx-auto mb-2" />
                <div className="font-semibold">In-Person</div>
                <div className="text-xs text-gray-600">Physical appointment at clinic</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsVirtualAppointment(true);
                  handleInputChange("appointmentMode", "virtual");
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isVirtualAppointment
                    ? "border-teal-600 bg-teal-50 text-teal-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Video className="w-6 h-6 mx-auto mb-2" />
                <div className="font-semibold">Virtual</div>
                <div className="text-xs text-gray-600">Teleconsultation online</div>
              </button>
            </div>
          </div>

          {/* Patient Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              Patient Selection
            </h3>
            
            <div className={`grid gap-4 ${(isDoctorUser || currentUser?.role === 'doctor') ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {/* Debug info */}
              {console.log('Rendering form. isDoctorUser:', isDoctorUser, 'currentUser:', currentUser)}
              <div className="space-y-2">
                <Label htmlFor="patientId">Select Patient *</Label>
                <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={patientComboboxOpen}
                      className={`w-full justify-between ${errors.patientId ? "border-red-500" : ""}`}
                      disabled={loadingPatients}
                    >
                      {formData.patientId
                        ? patients.find(p => p._id === formData.patientId)?.fullName || "Select patient..."
                        : loadingPatients ? "Loading patients..." : "Select patient..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                    <Command>
                      <CommandInput placeholder="Search patients..." />
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>No patient found.</CommandEmpty>
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem
                              key={patient._id}
                              value={`${patient.fullName} ${patient.phone} ${patient.email} ${patient.uhid || ''}`}
                              onSelect={() => {
                                handleInputChange("patientId", patient._id);
                                setPatientComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.patientId === patient._id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{patient.fullName}</span>
                                {patient.uhid && (
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {patient.uhid}
                                  </span>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {patient.phone}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.patientId && (
                  <p className="text-sm text-red-600">{errors.patientId}</p>
                )}
              </div>

              {/* Only show doctor selection for non-doctor users */}
              {console.log('Conditional check: !isDoctorUser =', !isDoctorUser, 'currentUser.role =', currentUser?.role)}
              {console.log('Should hide doctor dropdown:', isDoctorUser || currentUser?.role === 'doctor')}
              {false && (  /* Temporarily force hide for testing */
                <div className="space-y-2">
                  <Label htmlFor="doctorId">Select Doctor *</Label>
                  <Popover open={doctorComboboxOpen} onOpenChange={setDoctorComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={doctorComboboxOpen}
                        className={`w-full justify-between ${errors.doctorId ? "border-red-500" : ""}`}
                        disabled={loadingDoctors}
                      >
                        {formData.doctorId
                          ? `Dr. ${doctors.find(d => d._id === formData.doctorId)?.fullName || 'Select doctor...'}` 
                          : loadingDoctors ? "Loading doctors..." : "Select doctor..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                      <Command>
                        <CommandInput placeholder="Search doctors..." />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>No doctor found.</CommandEmpty>
                          <CommandGroup>
                            {doctors.map((doctor) => (
                              <CommandItem
                                key={doctor._id}
                                value={`${doctor.fullName} ${doctor.specialty} ${doctor.phone}`}
                                onSelect={() => {
                                  handleInputChange("doctorId", doctor._id);
                                  setDoctorComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.doctorId === doctor._id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">Dr. {doctor.fullName}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {doctor.specialty} • {doctor.phone}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.doctorId && (
                    <p className="text-sm text-red-600">{errors.doctorId}</p>
                  )}
                </div>
              )}

              {/* Show selected doctor info for doctors */}
              {true && (  /* Temporarily force show for testing */
                <div className="space-y-2">
                  <Label>Assigned Doctor</Label>
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      <div>
                        <p className="font-medium text-teal-900">
                          Dr. {doctors.find(d => d._id === formData.doctorId)?.fullName || 'Loading...'}
                        </p>
                        <p className="text-sm text-teal-700">
                          {doctors.find(d => d._id === formData.doctorId)?.specialty || ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <Badge className={option.color}>
                          {option.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Appointment Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointmentType">Appointment Type *</Label>
                <Popover open={appointmentTypeComboboxOpen} onOpenChange={setAppointmentTypeComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={appointmentTypeComboboxOpen}
                      className={`w-full justify-between ${errors.appointmentType ? "border-red-500" : ""}`}
                    >
                      {formData.appointmentType || "Select appointment type..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                    <Command>
                      <CommandInput placeholder="Search appointment types..." />
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>No appointment type found.</CommandEmpty>
                        <CommandGroup>
                          {appointmentTypes.map((type) => (
                            <CommandItem
                              key={type}
                              value={type}
                              onSelect={() => {
                                handleInputChange("appointmentType", type);
                                setAppointmentTypeComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.appointmentType === type ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {type}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.appointmentType && (
                  <p className="text-sm text-red-600">{errors.appointmentType}</p>
                )}
              </div>

              {/* Consultation Mode - Only for Virtual Appointments */}
              {isVirtualAppointment && (
                <div className="space-y-2">
                  <Label htmlFor="consultationMode">Consultation Mode *</Label>
                  <Select value={formData.consultationMode} onValueChange={(value) => handleInputChange("consultationMode", value)}>
                    <SelectTrigger className={errors.consultationMode ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select consultation mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {consultationModes.map((mode) => {
                        const Icon = mode.icon;
                        return (
                          <SelectItem key={mode.value} value={mode.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{mode.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {errors.consultationMode && (
                    <p className="text-sm text-red-600">{errors.consultationMode}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={formData.duration} onValueChange={(value) => handleInputChange("duration", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* Date and time input */}
            {formData.doctorId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
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
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange("time", e.target.value)}
                    className={errors.time ? "border-red-500" : ""}
                  />
                  {errors.time && (
                    <p className="text-sm text-red-600">{errors.time}</p>
                  )}
                </div>
              </div>
            )}

            {/* Reason and Symptoms - For Virtual Appointments */}
            {isVirtualAppointment && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Consultation *</Label>
                  <Input
                    id="reason"
                    placeholder="Brief reason for the consultation"
                    value={formData.reason}
                    onChange={(e) => handleInputChange("reason", e.target.value)}
                    className={errors.reason ? "border-red-500" : ""}
                  />
                  {errors.reason && (
                    <p className="text-sm text-red-600">{errors.reason}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <Textarea
                    id="symptoms"
                    placeholder="Describe the symptoms..."
                    value={formData.symptoms}
                    onChange={(e) => handleInputChange("symptoms", e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes, symptoms, or special requirements..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Summary */}
          {formData.patientId && formData.doctorId && formData.appointmentType && formData.date && formData.time && (
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <h4 className="font-medium text-teal-900 mb-2">Appointment Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-teal-800">
                <div>
                  <span className="font-medium">Patient:</span> {patients.find(p => p._id === formData.patientId)?.fullName}
                </div>
                <div>
                  <span className="font-medium">Doctor:</span> Dr. {doctors.find(d => d._id === formData.doctorId)?.fullName}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {formData.appointmentType}
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
                <div>
                  <span className="font-medium">Priority:</span> 
                  <Badge className={priorityOptions.find(p => p.value === formData.priority)?.color + " ml-2"}>
                    {priorityOptions.find(p => p.value === formData.priority)?.label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="gradient-button"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentModal;
