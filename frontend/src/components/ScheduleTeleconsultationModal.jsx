import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Video, User, Settings, Check, ChevronsUpDown, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { patientAPI, appointmentAPI, teleconsultationAPI, doctorAPI, doctorAvailabilityAPI } from '@/services/api';
import { toast } from 'sonner';
import { getCurrentUser, isDoctor } from '@/utils/roleUtils';
import { getAvailableTimeSlots } from '@/utils/availabilityUtils';
import { config } from '@/config/env';
import sessionManager from '@/utils/sessionManager';
// import TimeSlotPicker from '@/components/TimeSlotPicker'; // Removed - using manual date/time selection

const ScheduleTeleconsultationModal = ({ isOpen, onClose, onSuccess, selectedPatient = null, onSwitchToAppointment }) => {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorComboboxOpen, setDoctorComboboxOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  const [doctorFees, setDoctorFees] = useState(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';
  
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

  // Load doctor fees when doctor is selected
  useEffect(() => {
    if (doctorId) {
      loadDoctorFees(doctorId);
    } else {
      setDoctorFees(null);
    }
  }, [doctorId]);

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

  const loadDoctorFees = async (doctorId) => {
    try {
      setLoadingFees(true);
      const token = await sessionManager.getToken();
      const response = await fetch(`${API_BASE_URL}/doctor-fees/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDoctorFees(data.fees);
      }
    } catch (error) {
      console.error('Error loading doctor fees:', error);
      setDoctorFees(null);
    } finally {
      setLoadingFees(false);
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
      
      // Store created appointment and show payment dialog
      setCreatedAppointment(appointment);
      
      // Use setTimeout to ensure the modal closes before payment dialog opens
      setTimeout(() => {
        setIsPaymentDialogOpen(true);
      }, 100);
    } catch (error) {
      console.error('Error scheduling teleconsultation:', error);
      toast.error(error.message || 'Failed to schedule teleconsultation');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!createdAppointment || !doctorFees) {
      toast.error('Payment information not available');
      return;
    }

    try {
      setProcessingPayment(true);

      // Create Razorpay order
      const token = await sessionManager.getToken();
      const orderResponse = await fetch(`${API_BASE_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId: createdAppointment._id,
          amount: doctorFees.appointmentFees || 500
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        if (orderResponse.status === 503) {
          toast.error('Payment gateway not configured. Please set up Razorpay keys.');
          console.error('Razorpay configuration error:', errorData.message);
          setProcessingPayment(false);
          return;
        }
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_dummy',
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: 'Healthcare Teleconsultation',
          description: `Teleconsultation with Dr. ${createdAppointment.doctorId?.fullName || 'Doctor'}`,
          order_id: orderData.order.id,
          handler: async function (response) {
            try {
              // Verify payment
              const verifyResponse = await fetch(`${API_BASE_URL}/payments/verify`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  appointmentId: createdAppointment._id
                })
              });

              if (!verifyResponse.ok) {
                throw new Error('Payment verification failed');
              }

              toast.success('Payment successful! Teleconsultation confirmed.');
              setIsPaymentDialogOpen(false);
              onClose();
              if (onSuccess) {
                onSuccess();
              }
              // Reload the page to refresh the data
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            } catch (error) {
              console.error('Payment verification error:', error);
              toast.error('Payment verification failed');
            } finally {
              setProcessingPayment(false);
            }
          },
          prefill: {
            name: createdAppointment.patientId?.fullName || '',
            email: createdAppointment.patientId?.email || '',
            contact: createdAppointment.patientId?.phone || ''
          },
          theme: {
            color: '#3B82F6'
          },
          modal: {
            ondismiss: function() {
              setProcessingPayment(false);
              toast.info('Payment cancelled');
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };

      script.onerror = () => {
        setProcessingPayment(false);
        toast.error('Failed to load payment gateway');
      };
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment');
      setProcessingPayment(false);
    }
  };

  const handleSkipPayment = () => {
    setIsPaymentDialogOpen(false);
    setPaymentMethod('online');
    onClose();
    if (onSuccess) {
      onSuccess();
    }
    // Reload the page to refresh the data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    toast.info('Teleconsultation created. Payment can be made later.');
  };

  const handleCashPayment = async () => {
    if (!createdAppointment) {
      toast.error('Appointment information not available');
      return;
    }

    try {
      setProcessingPayment(true);
      const token = await sessionManager.getToken();

      // Find the appointment invoice and set payment method to cash and status to approved
      const invoicesResponse = await fetch(`${API_BASE_URL}/appointment-invoices?appointmentId=${createdAppointment._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        if (invoicesData.invoices && invoicesData.invoices.length > 0) {
          const invoice = invoicesData.invoices[0];
          
          // Update payment method to cash and status to approved
          await fetch(`${API_BASE_URL}/appointment-invoices/${invoice._id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              paymentMethod: 'cash',
              status: 'approved'
            })
          });
        }
      }

      setIsPaymentDialogOpen(false);
      setPaymentMethod('online');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
      // Reload the page to refresh the data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      toast.success('Teleconsultation confirmed. Payment will be collected in cash.');
    } catch (error) {
      console.error('Error processing cash payment:', error);
      toast.error('Failed to process cash payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const selectedPatientData = selectedPatient || patients.find(p => p._id === formData.patientId);
  const selectedDoctorData = doctors.find(d => d._id === formData.doctorId);

  return (
    <>
    <Dialog open={isOpen && !isPaymentDialogOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-lg font-semibold text-gray-900">Scheduling Teleconsultation...</p>
              <p className="text-sm text-gray-600">Please wait, do not close this window</p>
            </div>
          </div>
        )}
        
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              Schedule Teleconsultation
            </DialogTitle>
            {onSwitchToAppointment && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSwitchToAppointment}
                className="text-sm mr-8"
                disabled={loading}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Switch to Appointment
              </Button>
            )}
          </div>
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
              <Select value={formData.patientId} onValueChange={(value) => handleInputChange('patientId', value)} disabled={loading}>
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
                  disabled={loading}
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
                disabled={loading}
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
                    disabled={loading}
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
              ) : (
                <Input
                  id="time"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                  required
                  disabled={loading}
                />
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
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
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

    {/* Payment Dialog */}
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Teleconsultation Scheduled Successfully
          </DialogTitle>
          <DialogDescription>
            Complete payment to confirm your teleconsultation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {createdAppointment && (
            <>
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Doctor:</span>
                    <span className="text-sm font-semibold">Dr. {createdAppointment.doctorId?.fullName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Date:</span>
                    <span className="text-sm font-semibold">
                      {createdAppointment.date ? new Date(createdAppointment.date).toLocaleDateString('en-GB') : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Time:</span>
                    <span className="text-sm font-semibold">{createdAppointment.time || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Type:</span>
                    <span className="text-sm font-semibold flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Teleconsultation
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-green-900 dark:text-green-100">
                    Consultation Fee:
                  </span>
                  <span className="text-2xl font-bold text-green-900 dark:text-green-100">
                    ₹{doctorFees?.appointmentFees || 500}
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('online')}
                    className={cn(
                      "p-4 border-2 rounded-lg transition-all duration-200 hover:shadow-md",
                      paymentMethod === 'online'
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        paymentMethod === 'online' ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                      )}>
                        <svg className={cn("w-5 h-5", paymentMethod === 'online' ? "text-white" : "text-gray-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">Card / UPI</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={cn(
                      "p-4 border-2 rounded-lg transition-all duration-200 hover:shadow-md",
                      paymentMethod === 'cash'
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                    )}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        paymentMethod === 'cash' ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                      )}>
                        <svg className={cn("w-5 h-5", paymentMethod === 'cash' ? "text-white" : "text-gray-600")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">Cash</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  {paymentMethod === 'online' 
                    ? 'Your teleconsultation is in "Processing" status. Complete the payment to confirm.'
                    : 'Teleconsultation will be confirmed. Payment will be collected in cash at the clinic.'}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSkipPayment}
            disabled={processingPayment}
          >
            Pay Later
          </Button>
          {paymentMethod === 'online' ? (
            <Button
              onClick={handlePayment}
              disabled={processingPayment}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Pay Online
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleCashPayment}
              disabled={processingPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Cash Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ScheduleTeleconsultationModal;
