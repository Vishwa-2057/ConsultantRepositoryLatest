import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Video, User, Settings, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { patientAPI, appointmentAPI, teleconsultationAPI, doctorAPI, doctorAvailabilityAPI } from '@/services/api';
import { toast } from 'sonner';
import { getCurrentUser, isDoctor } from '@/utils/roleUtils';
import { getAvailableTimeSlots } from '@/utils/availabilityUtils';
// import TimeSlotPicker from '@/components/TimeSlotPicker'; // Removed - using manual date/time selection

const ScheduleTeleconsultationModal = ({ isOpen, onClose, onSuccess, selectedPatient = null }) => {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorComboboxOpen, setDoctorComboboxOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  
  // Get current user from localStorage
  const user = getCurrentUser();
  
  const [formData, setFormData] = useState({
    appointmentId: '',
    patientId: selectedPatient?._id || '',
    doctorId: isDoctor() ? user?.id || '' : '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 30,
    requirePassword: false,
    enableRecording: false,
    features: {
      screenSharing: true,
      chat: true,
      whiteboard: false,
      fileSharing: true
    }
  });

  // Load patients and doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!selectedPatient) {
        loadPatients();
      }
      // Only load doctors if user is not a doctor (clinic admins can choose doctors)
      if (!isDoctor()) {
        loadDoctors();
      }
    }
  }, [isOpen, selectedPatient]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        appointmentId: '',
        patientId: selectedPatient?._id || '',
        doctorId: isDoctor() ? user?.id || '' : '',
        scheduledDate: '',
        scheduledTime: '',
        duration: 30,
        requirePassword: false,
        enableRecording: false,
        features: {
          screenSharing: true,
          chat: true,
          whiteboard: false,
          fileSharing: true
        }
      });
      // setSelectedSlot(null); // Removed
      // setShowSlotPicker(false); // Removed
    }
  }, [isOpen, selectedPatient]);

  // Load available slots when doctor or date changes
  const doctorId = formData.doctorId;
  const scheduledDate = formData.scheduledDate;
  
  useEffect(() => {
    if (doctorId && scheduledDate) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [doctorId, scheduledDate]);

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      const response = await doctorAvailabilityAPI.getAvailableSlots(formData.doctorId, formData.scheduledDate);
      
      if (response.success) {
        const { availability, exceptions, appointments } = response;
        const selectedDate = new Date(formData.scheduledDate);
        
        // Get slot duration from availability
        const duration = availability.length > 0 && availability[0].slotDuration 
          ? availability[0].slotDuration 
          : 30;
        setSlotDuration(duration);
        setFormData(prev => ({ ...prev, duration }));
        
        const slots = getAvailableTimeSlots(availability, exceptions, appointments, selectedDate, duration);
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
      toast.error('Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadPatients = async () => {
    try {
      const response = await patientAPI.getAll(1, 100);
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await doctorAPI.getAll(1, 100);
      setDoctors(response.doctors || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error('Failed to load doctors');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureChange = (feature, value) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: value
      }
    }));
  };

  const validateForm = () => {
    if (!formData.patientId) {
      toast.error('Please select a patient');
      return false;
    }
    if (!formData.doctorId) {
      toast.error('Please select a doctor');
      return false;
    }
    if (!formData.scheduledDate) {
      toast.error('Please select a date');
      return false;
    }
    if (!formData.scheduledTime) {
      toast.error('Please select a time');
      return false;
    }

    // Check if date/time is in the future
    const selectedDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    if (isNaN(selectedDateTime.getTime())) {
      toast.error('Invalid date or time format');
      return false;
    }
    
    if (selectedDateTime <= new Date()) {
      toast.error('Please select a future date and time');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      // First create an appointment for the teleconsultation
      const appointmentData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentType: 'Teleconsultation',
        date: formData.scheduledDate,
        time: formData.scheduledTime,
        duration: formData.duration,
        isVirtual: true,
        reason: 'Teleconsultation via Jitsi Meet'
      };

      // Note: Clinic ID will be determined automatically by the backend based on user role

      const appointmentResponse = await appointmentAPI.create(appointmentData);
      const appointment = appointmentResponse.appointment || appointmentResponse;

      // Then create the teleconsultation
      const teleconsultationData = {
        appointmentId: appointment._id,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        duration: formData.duration,
        requirePassword: formData.requirePassword,
        enableRecording: formData.enableRecording,
        features: formData.features
      };

      console.log('Sending teleconsultation data:', teleconsultationData);
      console.log('Form data before sending:', formData);

      const response = await teleconsultationAPI.create(teleconsultationData);
      
      toast.success('Teleconsultation scheduled successfully!');
      
      if (onSuccess) {
        onSuccess(response.teleconsultation);
      }
      
      onClose();
      
      // Reload the page to refresh the data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error scheduling teleconsultation:', error);
      toast.error(error.message || 'Failed to schedule teleconsultation');
    } finally {
      setLoading(false);
    }
  };

  const selectedPatientData = selectedPatient || patients.find(p => p._id === formData.patientId);
  const selectedDoctorData = doctors.find(d => d._id === formData.doctorId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Schedule Teleconsultation
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            {selectedPatient ? (
              <div className="p-3 bg-gray-50 rounded-md flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{selectedPatient.fullName}</span>
                <span className="text-sm text-gray-500">({selectedPatient.phone})</span>
              </div>
            ) : (
              <Select value={formData.patientId} onValueChange={(value) => handleInputChange('patientId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient._id} value={patient._id}>
                      {patient.fullName} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor</Label>
            {isDoctor() ? (
              <div className="p-3 bg-blue-50 rounded-md flex items-center gap-3">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Dr. {user?.fullName || user?.name || 'Current Doctor'}</span>
                <span className="text-sm text-blue-600">(You)</span>
              </div>
            ) : (
              <Popover open={doctorComboboxOpen} onOpenChange={setDoctorComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={doctorComboboxOpen}
                    className="w-full justify-between"
                  >
                    {formData.doctorId
                      ? `Dr. ${doctors.find(d => d._id === formData.doctorId)?.fullName || 'Select doctor...'}`
                      : "Select a doctor..."}
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
                            value={`${doctor.fullName} ${doctor.specialty}`}
                            onSelect={() => {
                              handleInputChange('doctorId', doctor._id);
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
                              <span className="text-sm text-muted-foreground">{doctor.specialty}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Date, Time and Duration Selection */}
          {formData.doctorId && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time
                </Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center h-10 border rounded-md bg-gray-50">
                    <Clock className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Loading slots...</span>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="space-y-2">
                    <Select 
                      value={formData.scheduledTime} 
                      onValueChange={(value) => handleInputChange('scheduledTime', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select available time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {availableSlots.map((slot) => (
                          <SelectItem key={slot.time} value={slot.time}>
                            {slot.display}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.scheduledTime && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Slot will be occupied for {formData.duration} minutes
                      </p>
                    )}
                  </div>
                ) : formData.scheduledDate ? (
                  <div className="flex items-center justify-center h-10 border rounded-md bg-amber-50 border-amber-200">
                    <span className="text-sm text-amber-700">No slots available</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-10 border rounded-md bg-gray-50">
                    <span className="text-sm text-muted-foreground">Select a date first</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Slot Duration</Label>
            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-gray-50">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{slotDuration} minutes</span>
              <span className="text-xs text-muted-foreground">(configured)</span>
            </div>
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Meeting Settings
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requirePassword">Require Password</Label>
                  <p className="text-xs text-gray-500">Add password protection to the meeting</p>
                </div>
                <Switch
                  id="requirePassword"
                  checked={formData.requirePassword}
                  onCheckedChange={(checked) => handleInputChange('requirePassword', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableRecording">Enable Recording</Label>
                  <p className="text-xs text-gray-500">Allow meeting recording</p>
                </div>
                <Switch
                  id="enableRecording"
                  checked={formData.enableRecording}
                  onCheckedChange={(checked) => handleInputChange('enableRecording', checked)}
                />
              </div>
            </div>
          </div>

          {/* Feature Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Meeting Features</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="screenSharing" className="text-sm">Screen Sharing</Label>
                <Switch
                  id="screenSharing"
                  checked={formData.features.screenSharing}
                  onCheckedChange={(checked) => handleFeatureChange('screenSharing', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="chat" className="text-sm">Chat</Label>
                <Switch
                  id="chat"
                  checked={formData.features.chat}
                  onCheckedChange={(checked) => handleFeatureChange('chat', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="whiteboard" className="text-sm">Whiteboard</Label>
                <Switch
                  id="whiteboard"
                  checked={formData.features.whiteboard}
                  onCheckedChange={(checked) => handleFeatureChange('whiteboard', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="fileSharing" className="text-sm">File Sharing</Label>
                <Switch
                  id="fileSharing"
                  checked={formData.features.fileSharing}
                  onCheckedChange={(checked) => handleFeatureChange('fileSharing', checked)}
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {selectedPatientData && selectedDoctorData && formData.scheduledDate && formData.scheduledTime && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Meeting Summary</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Patient:</strong> {selectedPatientData.fullName}</p>
                <p><strong>Doctor:</strong> Dr. {selectedDoctorData.fullName} ({selectedDoctorData.specialty})</p>
                <p><strong>Date:</strong> {new Date(formData.scheduledDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {formData.scheduledTime}</p>
                <p><strong>Duration:</strong> {formData.duration} minutes</p>
                <p><strong>Platform:</strong> Jitsi Meet</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleTeleconsultationModal;
