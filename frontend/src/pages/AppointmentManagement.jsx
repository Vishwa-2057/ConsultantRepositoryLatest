import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Phone, MapPin, AlertCircle, CheckCircle, XCircle, Plus, Search, Filter, Edit, CalendarDays, Users, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, Calendar as CalendarIcon, Info, Video, MessageCircle, Check, ChevronsUpDown, Link as LinkIcon, Share2, Copy, Eye, X, Mail } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { appointmentAPI, patientAPI, doctorAPI, doctorAvailabilityAPI } from '@/services/api';
import { getAvailableTimeSlots } from '@/utils/availabilityUtils';
import { format, parseISO, isToday, isTomorrow, isYesterday, addMinutes } from 'date-fns';
import RescheduleAppointmentModal from '@/components/RescheduleAppointmentModal';
import AppointmentConflictDialog from '@/components/AppointmentConflictDialog';
import ScheduleTeleconsultationModal from '@/components/ScheduleTeleconsultationModal';
import { getCurrentUser } from '@/utils/roleUtils';
import { config } from '@/config/env';
import sessionManager from '@/utils/sessionManager';
// import TimeSlotPicker from '@/components/TimeSlotPicker'; // Removed - using manual date/time selection

const AppointmentManagement = () => {
  // Set page title immediately
  document.title = "Smart Healthcare";
  
  // Get current user info
  const currentUser = getCurrentUser();
  const isDoctorUser = currentUser?.role === 'doctor';
  
  
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('appointmentManagement_pageSize');
    return saved ? parseInt(saved) : 20;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [stats, setStats] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [isTeleconsultationDialogOpen, setIsTeleconsultationDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [conflictData, setConflictData] = useState(null);
  // const [selectedSlot, setSelectedSlot] = useState(null); // Removed - using manual selection
  // const [showSlotPicker, setShowSlotPicker] = useState(false); // Removed - using manual selection
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [doctorComboboxOpen, setDoctorComboboxOpen] = useState(false);
  const [appointmentTypeComboboxOpen, setAppointmentTypeComboboxOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  const [doctorFees, setDoctorFees] = useState(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentLink, setPaymentLink] = useState(null);
  const [loadingPaymentLink, setLoadingPaymentLink] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' or 'cash'
  const [appointmentInvoices, setAppointmentInvoices] = useState({});
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    appointmentType: '',
    appointmentMode: 'in-person',
    consultationMode: '',
    date: '',
    time: '',
    duration: 30,
    priority: 'normal',
    reason: '',
    notes: '',
    symptoms: '',
    instructions: ''
  });

  const appointmentTypes = [
    'General Consultation',
    'Follow-up Visit'
  ];

  const statusOptions = [
    'Scheduled',
    'Confirmed', 
    'Completed',
    'Cancelled',
    'No Show'
  ];

  const priorityOptions = [
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Scheduled': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'Confirmed': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'In Progress': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'Completed': { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
      'Cancelled': { color: 'bg-red-100 text-red-800', icon: XCircle },
      'No Show': { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    };
    
    const config = statusConfig[status] || statusConfig['Scheduled'];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const config = priorityOptions.find(p => p.value === priority) || priorityOptions[1];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd, yyyy');
  };

  const loadAppointments = async () => {
    console.log('loadAppointments called');
    console.log('isDoctorUser:', isDoctorUser);
    console.log('currentUser:', currentUser);
    try {
      setLoading(true);
      const filters = {};
      
      // For doctors, we'll let the backend handle the filtering
      // The backend will show appointments where the doctor is conducting
      // OR appointments for patients assigned to the doctor
      if (isDoctorUser && currentUser) {
        const userId = currentUser.id || currentUser._id;
        console.log('Doctor user detected with ID:', userId);
        // We don't set doctorId filter here to allow backend to handle the logic
      }
      
      // Add timestamp to avoid caching issues
      filters._t = Date.now();

      // Load all appointments without pagination to enable frontend filtering
      console.log('Making API call with filters:', filters);
      const response = await appointmentAPI.getAll(1, 1000, filters);
      console.log('Full API response:', response);
      
      // Check if we have appointments in the response
      if (response && (response.appointments || response.data)) {
        const appointmentsList = response.appointments || response.data || [];
        console.log('Setting appointments to:', appointmentsList);
        setAppointments(appointmentsList);
      } else {
        console.log('No appointments in response, setting empty array');
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      console.error('Error details:', error.message, error.stack);
      toast.error('Failed to load appointments');
      setAppointments([]); // Ensure appointments is set to empty array on error
    } finally {
      console.log('loadAppointments finally block');
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // For doctors, we need to filter stats by their ID
      // Note: This assumes the backend supports doctorId filtering for stats
      // If not, we'll need to calculate stats client-side from filtered appointments
      const response = await appointmentAPI.getStats();
      console.log('Appointment stats response:', response);
      console.log('Status stats:', response.statusStats);
      setStats(response);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Calculate monthly appointments count
  const getMonthlyAppointmentsCount = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.getMonth() === currentMonth && 
             appointmentDate.getFullYear() === currentYear;
    }).length;
  };

  const loadPatients = async () => {
    try {
      const response = await patientAPI.getAll(1, 100);
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await doctorAPI.getAll();
      const doctorsList = response.doctors || response.data || [];
      setDoctors(doctorsList);
      
      // Auto-select current doctor if user is a doctor
      if (isDoctorUser && currentUser) {
        const userId = currentUser.id || currentUser._id;
        const currentDoctorInList = doctorsList.find(doctor => doctor._id === userId);
        
        if (currentDoctorInList) {
          setFormData(prev => ({ ...prev, doctorId: userId }));
        }
      }
    } catch (error) {
    }
  };

  const loadAppointmentInvoices = async () => {
    try {
      const token = await sessionManager.getToken();
      
      // Load appointment invoices (includes teleconsultation invoices)
      const appointmentResponse = await fetch(`${API_BASE_URL}/appointment-invoices?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (appointmentResponse.ok) {
        const data = await appointmentResponse.json();
        const invoicesMap = {};
        data.invoices.forEach(invoice => {
          if (invoice.appointmentId?._id || invoice.appointmentId) {
            const appointmentId = invoice.appointmentId._id || invoice.appointmentId;
            invoicesMap[appointmentId] = invoice;
          }
        });
        setAppointmentInvoices(invoicesMap);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  // Save itemsPerPage to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('appointmentManagement_pageSize', itemsPerPage.toString());
  }, [itemsPerPage, isInitialLoad]);

  useEffect(() => {
    console.log('Initial useEffect called');
    document.title = "Smart Healthcare";
    loadPatients();
    loadDoctors();
    console.log('About to call loadAppointments from initial useEffect');
    loadAppointments();
    loadStats();
    loadAppointmentInvoices();
  }, []);

  useEffect(() => {
    loadAppointments();
    loadStats();
    loadAppointmentInvoices();
  }, [statusFilter, typeFilter, priorityFilter, dateFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, priorityFilter, dateFilter, searchTerm]);

  // Load available slots when doctor or date changes
  const doctorId = formData.doctorId;
  const date = formData.date;
  
  useEffect(() => {
    if (doctorId && date) {
      loadAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [doctorId, date]);

  // Load doctor fees when doctor is selected
  useEffect(() => {
    if (doctorId) {
      loadDoctorFees(doctorId);
    } else {
      setDoctorFees(null);
    }
  }, [doctorId]);

  // Load doctor fees when viewing an appointment
  useEffect(() => {
    if (selectedAppointment?.doctorId?._id) {
      loadDoctorFees(selectedAppointment.doctorId._id);
      setPaymentLink(null); // Reset payment link when viewing a new appointment
    }
  }, [selectedAppointment]);

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

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      const response = await doctorAvailabilityAPI.getAvailableSlots(formData.doctorId, formData.date);
      
      if (response.success) {
        const { availability, exceptions, appointments } = response;
        const selectedDate = new Date(formData.date);
        
        // Get slot duration from availability
        const duration = availability.length > 0 && availability[0].slotDuration 
          ? availability[0].slotDuration 
          : 30;
        setSlotDuration(duration);
        setFormData(prev => ({ ...prev, duration }));
        
        const slots = getAvailableTimeSlots(availability, exceptions, appointments, selectedDate, duration);
        setAvailableSlots(slots);
        
        // Don't clear the time - let the user change duration and keep their selection if still valid
        // Only clear if the slot is truly unavailable (booked by another appointment)
      }
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
      toast.error('Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCreateAppointment = async (forceCreate = false) => {
    // Validate required fields
    if (!formData.reason || !formData.reason.trim()) {
      toast.error('Please provide a reason for the appointment');
      return;
    }
    
    setSubmitting(true);
    try {
      // Check for conflicts first (unless forcing creation)
      if (!forceCreate) {
        try {
          const conflictCheck = await appointmentAPI.checkConflicts(
            formData.doctorId,
            formData.date,
            formData.time,
            formData.duration
          );

          if (conflictCheck.hasConflicts) {
            // Show conflict dialog - pass the first conflict
            setConflictData(conflictCheck.conflicts[0]);
            setIsConflictDialogOpen(true);
            return;
          }
        } catch (conflictError) {
          console.log('Conflict check failed, proceeding with creation:', conflictError);
          // If conflict check fails, proceed with creation and handle errors there
        }
      }

      // No conflicts or force create - proceed with creation
      // Set status to Scheduled by default
      const appointmentData = forceCreate 
        ? { ...formData, forceCreate: true, status: 'Scheduled' } 
        : { ...formData, status: 'Scheduled' };
      const response = await appointmentAPI.create(appointmentData);
      
      // Slot booking removed - using manual date/time selection
      
      toast.success('Appointment created successfully');
      setIsConflictDialogOpen(false);
      
      // Store created appointment and show payment dialog
      setCreatedAppointment(response.appointment || response);
      
      // Close create modal first, then open payment dialog
      setIsCreateModalOpen(false);
      
      // Use setTimeout to ensure the create modal closes before payment dialog opens
      setTimeout(() => {
        setIsPaymentDialogOpen(true);
      }, 100);
    } catch (error) {
      console.error('Error creating appointment:', error);
      
      // Check if error is conflict-related (status 400 or 409, or message contains conflict info)
      console.log('Error details:', {
        status: error.response?.status,
        message: error.message,
        includesBooked: error.message?.includes('booked'),
        includesConflict: error.message?.includes('conflict')
      });

      // Check if it's a validation error (400 with validation message)
      if (error.message?.includes('Validation') || error.message?.includes('required')) {
        toast.error(error.message || 'Please fill in all required fields');
      } else if (error.response?.status === 409 || 
          error.message?.includes('booked') || error.message?.includes('conflict')) {
        
        console.log('Detected conflict error, parsing details...');
        // Parse conflict details from error message
        const conflictDetails = parseConflictFromError(error.message);
        console.log('Parsed conflict details:', conflictDetails);
        setConflictData(conflictDetails);
        setIsConflictDialogOpen(true);
      } else {
        toast.error(error.message || 'Failed to create appointment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to parse conflict information from error message
  const parseConflictFromError = (errorMessage) => {
    // Example message: "Doctor is already booked during this time. Conflicting appointments: 17:30 - Christopher Smith (Physical Therapy, 30 min)"
    const timeMatch = errorMessage.match(/(\d{2}:\d{2})/);
    const nameMatch = errorMessage.match(/- ([^(]+)/);
    const typeMatch = errorMessage.match(/\(([^,]+),/);
    const durationMatch = errorMessage.match(/(\d+) min\)/);

    return {
      time: timeMatch ? timeMatch[1] : formData.time,
      endTime: timeMatch ? addMinutesToTime(timeMatch[1], parseInt(durationMatch?.[1] || 30)) : addMinutesToTime(formData.time, 30),
      patientName: nameMatch ? nameMatch[1].trim() : 'Unknown Patient',
      appointmentType: typeMatch ? typeMatch[1].trim() : 'Unknown Type',
      duration: durationMatch ? parseInt(durationMatch[1]) : 30
    };
  };

  // Helper function to add minutes to time string
  const addMinutesToTime = (timeString, minutes) => {
    const [hours, mins] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes);
    return date.toTimeString().slice(0, 5);
  };

  const handleUpdateStatus = async (appointmentId, newStatus) => {
    try {
      console.log('Updating appointment status:', { appointmentId, newStatus });
      const result = await appointmentAPI.updateStatus(appointmentId, newStatus);
      console.log('Status update result:', result);
      toast.success(`Appointment ${newStatus.toLowerCase()} successfully`);
      loadAppointments();
      loadStats();
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        data: error.data
      });
      toast.error(`Failed to update appointment status: ${error.message}`);
    }
  };


  const handleRescheduleAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleSuccess = () => {
    loadAppointments();
    loadStats();
    setIsRescheduleModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleConflictSelectTime = (newTime) => {
    setFormData(prev => ({ ...prev, time: newTime }));
    setIsConflictDialogOpen(false);
    // Automatically try to create with new time
    handleCreateAppointment(false);
  };

  const handleConflictForceCreate = () => {
    handleCreateAppointment(true);
  };

  const handleConflictClose = () => {
    setIsConflictDialogOpen(false);
    setConflictData(null);
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
          name: 'Healthcare Consultation',
          description: `Appointment with Dr. ${createdAppointment.doctorId?.fullName || 'Doctor'}`,
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

              // Update appointment status to Scheduled after successful payment
              try {
                await fetch(`${API_BASE_URL}/appointments/${createdAppointment._id}`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ status: 'Scheduled' })
                });
              } catch (statusError) {
                console.error('Error updating appointment status:', statusError);
              }
              
              // Update invoice status to approved after successful payment
              try {
                const invoicesResponse = await fetch(`${API_BASE_URL}/appointment-invoices?appointmentId=${createdAppointment._id}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (invoicesResponse.ok) {
                  const invoicesData = await invoicesResponse.json();
                  if (invoicesData.invoices && invoicesData.invoices.length > 0) {
                    const invoice = invoicesData.invoices[0];
                    await fetch(`${API_BASE_URL}/appointment-invoices/${invoice._id}`, {
                      method: 'PATCH',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ status: 'approved' })
                    });
                  }
                }
              } catch (invoiceError) {
                console.error('Error updating invoice status:', invoiceError);
              }
              
              toast.success('Payment successful! Appointment confirmed.');
              setIsPaymentDialogOpen(false);
              resetForm();
              loadAppointments();
              loadStats();
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
    setPaymentMethod('online'); // Reset to default
    resetForm();
    loadAppointments();
    loadStats();
    toast.info('Appointment created. Payment can be made later.');
  };

  const handleCashPayment = async () => {
    if (!createdAppointment) {
      toast.error('Appointment information not available');
      return;
    }

    try {
      setProcessingPayment(true);
      const token = await sessionManager.getToken();

      // Find the appointment invoice and set payment method to cash (keep status as unapproved)
      const invoicesResponse = await fetch(`${API_BASE_URL}/appointment-invoices?appointmentId=${createdAppointment._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (invoicesResponse.ok) {
        const invoicesData = await invoicesResponse.json();
        if (invoicesData.invoices && invoicesData.invoices.length > 0) {
          const invoice = invoicesData.invoices[0];
          
          // Update payment method to cash and set status to approved
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

      // Update appointment status to Scheduled after cash payment selection
      try {
        await fetch(`${API_BASE_URL}/appointments/${createdAppointment._id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'Scheduled' })
        });
      } catch (statusError) {
        console.error('Error updating appointment status:', statusError);
      }
      
      setIsPaymentDialogOpen(false);
      setPaymentMethod('online'); // Reset to default
      resetForm();
      loadAppointments();
      loadStats();
      toast.success('Appointment confirmed. Payment will be collected in cash.');
    } catch (error) {
      console.error('Error processing cash payment:', error);
      toast.error('Failed to process cash payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const generatePaymentLink = async (appointmentId) => {
    try {
      setLoadingPaymentLink(true);
      const token = await sessionManager.getToken();
      
      // Create payment order
      const orderResponse = await fetch(`${API_BASE_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          amount: doctorFees?.appointmentFees || 500
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to generate payment link');
      }

      const orderData = await orderResponse.json();
      
      // Generate shareable link (you can customize this URL structure)
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/payment?order_id=${orderData.order.id}&appointment_id=${appointmentId}`;
      
      setPaymentLink(link);
      return link;
    } catch (error) {
      console.error('Error generating payment link:', error);
      toast.error('Failed to generate payment link');
      return null;
    } finally {
      setLoadingPaymentLink(false);
    }
  };

  const handleCopyPaymentLink = async (appointmentId) => {
    let link = paymentLink;
    
    if (!link) {
      link = await generatePaymentLink(appointmentId);
    }
    
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        toast.success('Payment link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  const handleSharePaymentLink = async (appointmentId) => {
    let link = paymentLink;
    
    if (!link) {
      link = await generatePaymentLink(appointmentId);
    }
    
    if (link && navigator.share) {
      try {
        await navigator.share({
          title: 'Appointment Payment',
          text: 'Complete your appointment payment using this link',
          url: link
        });
        toast.success('Payment link shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing link:', error);
          toast.error('Failed to share link');
        }
      }
    } else if (link) {
      // Fallback to copy if share is not supported
      handleCopyPaymentLink(appointmentId);
    }
  };

  const resetForm = () => {
    const userId = currentUser?.id || currentUser?._id;
    const isDoctor = isDoctorUser || currentUser?.role === 'doctor';
    
    setFormData({
      patientId: '',
      doctorId: isDoctor && userId ? userId : '', // Preserve doctor selection for doctors
      appointmentType: '',
      appointmentMode: 'in-person',
      consultationMode: '',
      date: '',
      time: '',
      duration: 30,
      priority: 'normal',
      reason: '',
      notes: '',
      symptoms: '',
      instructions: ''
    });
    setSelectedSpecialty(''); // Reset specialty filter
    // setSelectedSlot(null); // Removed
    // setShowSlotPicker(false); // Removed
  };

  console.log('All appointments:', appointments);
  console.log('Appointments length:', appointments.length);
  
  const filteredAppointments = appointments.filter(appointment => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      appointment.patientId?.fullName?.toLowerCase().includes(searchLower) ||
      appointment.doctorId?.fullName?.toLowerCase().includes(searchLower) ||
      appointment.appointmentType?.toLowerCase().includes(searchLower) ||
      appointment.reason?.toLowerCase().includes(searchLower)
    );

    // Status filter
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

    // Type filter
    const matchesType = typeFilter === 'all' || appointment.appointmentType === typeFilter;

    // Priority filter
    const matchesPriority = priorityFilter === 'all' || appointment.priority === priorityFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const appointmentDate = new Date(appointment.date);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = appointmentDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          matchesDate = appointmentDate >= weekStart && appointmentDate <= weekEnd;
          break;
        case 'month':
          matchesDate = appointmentDate.getMonth() === today.getMonth() && 
                       appointmentDate.getFullYear() === today.getFullYear();
          break;
        default:
          matchesDate = true;
      }
    }

    const result = matchesSearch && matchesStatus && matchesType && matchesPriority && matchesDate;
    if (!result) {
      console.log('Appointment filtered out:', appointment, {
        matchesSearch, matchesStatus, matchesType, matchesPriority, matchesDate
      });
    }
    return result;
  }).sort((a, b) => {
    // Sort appointments: upcoming first, then missed
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    dateA.setHours(0, 0, 0, 0);
    dateB.setHours(0, 0, 0, 0);
    
    // Determine if appointments are upcoming (future/today) or missed (past)
    const isUpcomingA = dateA >= today;
    const isUpcomingB = dateB >= today;
    
    // If one is upcoming and other is missed, upcoming comes first
    if (isUpcomingA && !isUpcomingB) return -1;
    if (!isUpcomingA && isUpcomingB) return 1;
    
    // Both are upcoming or both are missed - sort by date and time
    if (dateA.getTime() === dateB.getTime()) {
      // Same date, sort by time
      return a.time.localeCompare(b.time);
    }
    
    // Different dates
    if (isUpcomingA && isUpcomingB) {
      // Both upcoming - sort by date ascending (earliest first)
      return dateA - dateB;
    } else {
      // Both missed - sort by date descending (most recent first)
      return dateB - dateA;
    }
  });

  // Calculate pagination for filtered results
  const totalFilteredCount = filteredAppointments.length;
  console.log('Filtered appointments:', filteredAppointments);
  console.log('Filtered appointments length:', totalFilteredCount);
  const totalFilteredPages = Math.ceil(totalFilteredCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

  return (
    <div className="p-6 space-y-6">
      {/* Create Appointment Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Loading Overlay */}
          {submitting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-lg font-semibold text-gray-900">Creating Appointment...</p>
                <p className="text-sm text-gray-600">Please wait, do not close this window</p>
              </div>
            </div>
          )}
          
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new appointment for a patient
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              {/* Appointment Mode Selection */}
              <div className="grid grid-cols-2 gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    // Continue with in-person appointment form
                    setFormData({...formData, appointmentMode: 'in-person', consultationMode: ''});
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.appointmentMode === 'in-person'
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <MapPin className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">In-Person</div>
                  <div className="text-xs text-gray-600">Physical appointment</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Close this dialog and open teleconsultation dialog
                    setIsCreateModalOpen(false);
                    setIsTeleconsultationDialogOpen(true);
                  }}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <Video className="w-6 h-6 mx-auto mb-2" />
                  <div className="font-semibold">Virtual</div>
                  <div className="text-xs text-gray-600">Teleconsultation</div>
                </button>
              </div>

              <div className={`grid gap-4 ${isDoctorUser ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                <div>
                  <Label htmlFor="patient">Patient</Label>
                  <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={patientComboboxOpen}
                        className="w-full justify-between"
                        disabled={submitting}
                      >
                        {formData.patientId
                          ? patients.find(p => p._id === formData.patientId)?.fullName || "Select patient..."
                          : "Select patient..."}
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
                                value={`${patient.fullName} ${patient.phone} ${patient.email || ''} ${patient.uhid || ''}`}
                                onSelect={() => {
                                  setFormData({...formData, patientId: patient._id});
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
                                  <span className="text-sm text-muted-foreground">{patient.phone}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Only show specialty and doctor selection for non-doctor users */}
                {!isDoctorUser && (
                  <>
                    {/* Specialty Filter */}
                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Select
                        value={selectedSpecialty}
                        onValueChange={(value) => {
                          setSelectedSpecialty(value);
                          // Reset doctor selection when specialty changes
                          setFormData({...formData, doctorId: ''});
                        }}
                        disabled={submitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select specialty..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Specialties</SelectItem>
                          {[...new Set(doctors.map(d => d.specialty))]
                            .filter(Boolean)
                            .sort()
                            .map((specialty) => (
                              <SelectItem key={specialty} value={specialty}>
                                {specialty}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Doctor Selection */}
                    <div>
                      <Label htmlFor="doctor">Doctor</Label>
                      <Popover open={doctorComboboxOpen} onOpenChange={setDoctorComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={doctorComboboxOpen}
                            className="w-full justify-between"
                            disabled={submitting}
                          >
                            {formData.doctorId
                              ? `Dr. ${doctors.find(d => d._id === formData.doctorId)?.fullName || 'Select doctor...'}`
                              : "Select doctor..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                          <Command>
                            <CommandInput placeholder="Search doctors..." />
                            <CommandList className="max-h-[300px] overflow-y-auto">
                              <CommandEmpty>No doctor found.</CommandEmpty>
                              <CommandGroup>
                                {doctors
                                  .filter((doctor) => doctor.isActive !== false)
                                  .filter((doctor) => !selectedSpecialty || selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty)
                                  .map((doctor) => (
                                    <CommandItem
                                      key={doctor._id}
                                      value={`${doctor.fullName} ${doctor.specialty}`}
                                      onSelect={() => {
                                        setFormData({...formData, doctorId: doctor._id});
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
                    </div>
                  </>
                )}
                
                {/* Show selected doctor info for doctors */}
                {isDoctorUser && formData.doctorId && (
                  <div>
                    <Label>Assigned Doctor</Label>
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-medium text-primary">
                            Dr. {doctors.find(d => d._id === formData.doctorId)?.fullName || 'Loading...'}
                          </p>
                          <p className="text-sm text-primary/80">
                            {doctors.find(d => d._id === formData.doctorId)?.specialty || ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Display Doctor Fees */}
                {formData.doctorId && (
                  <div>
                    <Label>Appointment Fees</Label>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <div>
                          {loadingFees ? (
                            <p className="text-sm text-muted-foreground">Loading fees...</p>
                          ) : doctorFees ? (
                            <p className="font-semibold text-blue-900 dark:text-blue-100">
                              ₹{doctorFees.appointmentFees || 500}
                            </p>
                          ) : (
                            <p className="font-semibold text-blue-900 dark:text-blue-100">
                              ₹500 (Default)
                            </p>
                          )}
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Consultation fee
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Appointment Type</Label>
                  <Popover open={appointmentTypeComboboxOpen} onOpenChange={setAppointmentTypeComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={appointmentTypeComboboxOpen}
                        className="w-full justify-between"
                        disabled={submitting}
                      >
                        {formData.appointmentType || "Select type..."}
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
                                  setFormData({...formData, appointmentType: type});
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
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})} disabled={submitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Date, Time and Duration Selection */}
              {formData.doctorId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">Time</Label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center h-10 border rounded-md bg-gray-50">
                        <Clock className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
                        <span className="text-sm text-muted-foreground">Loading slots...</span>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="space-y-2">
                        <Select 
                          value={formData.time} 
                          onValueChange={(value) => setFormData({...formData, time: value})}
                          disabled={submitting}
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
                        {formData.time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Slot will be occupied for {formData.duration} minutes
                          </p>
                        )}
                      </div>
                    ) : formData.date ? (
                      <div className="flex items-center justify-center h-10 border rounded-md bg-amber-50 border-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
                        <span className="text-sm text-amber-700">No slots available</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-10 border rounded-md bg-gray-50">
                        <span className="text-sm text-muted-foreground">Select a date first</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="duration">Slot Duration</Label>
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-gray-50">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{slotDuration} minutes</span>
                      <span className="text-xs text-muted-foreground">(configured)</span>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="reason">Reason for Visit <span className="text-red-500">*</span></Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for appointment"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  disabled={submitting}
                  required
                  className={!formData.reason && formData.reason !== '' ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  placeholder="Additional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  disabled={submitting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button className="gradient-button" onClick={handleCreateAppointment} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Appointment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Search, Stats and Actions - Responsive Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-4">
        {/* Top Row: Search and New Appointment Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* New Appointment Button */}
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Appointment</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
        
        {/* Stats Row - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <div className="p-1.5 bg-blue-100 rounded-full flex-shrink-0">
              <CalendarDays className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm text-blue-600 font-medium block truncate">
                Total (Month): {getMonthlyAppointmentsCount()}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
            <div className="p-1.5 bg-green-100 rounded-full flex-shrink-0">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm text-green-600 font-medium block truncate">
                Today: {stats.todayAppointments || 0}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
            <div className="p-1.5 bg-purple-100 rounded-full flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm text-purple-600 font-medium block truncate">
                Upcoming: {stats.upcomingAppointments || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Appointments</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {totalFilteredCount}
                </Badge>
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-24 sm:w-28 h-8 text-xs bg-white border-gray-200 rounded-lg shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-20 sm:w-24 h-8 text-xs bg-white border-gray-200 rounded-lg shadow-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-24 sm:w-28 h-8 text-xs bg-white border-gray-200 rounded-lg shadow-sm">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-20 sm:w-24 h-8 text-xs bg-white border-gray-200 rounded-lg shadow-sm">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                className="h-8 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setPriorityFilter('all');
                  setDateFilter('all');
                }}
              >
                Clear
              </Button>
            </div>
          </div>
          
          {/* Pagination Controls - Separate Row */}
          <div className="flex items-center justify-end gap-6 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalFilteredCount)} of {totalFilteredCount}
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-md border border-gray-200">
              <span className="text-xs font-medium text-gray-500">Show</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-12 h-6 text-xs border-0 bg-transparent p-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : paginatedAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No appointments found
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column Headers - Desktop Only */}
              <div className="hidden lg:flex items-center justify-between gap-6 px-4 py-2 bg-gray-100 rounded-lg border border-gray-200">
                <div className="w-32 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Patient</span>
                </div>
                <div className="w-40 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Doctor</span>
                </div>
                <div className="w-24 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Date</span>
                </div>
                <div className="w-20 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Time</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Type</span>
                </div>
                <div style={{paddingRight:"70px"}} className="w-48 flex-shrink-0 flex items-center justify-end">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Actions</span>
                </div>
                                <div style={{paddingRight: "50px"}}>
                  <div className="w-24 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-700 uppercase">Status</span>
                  </div>
                </div>
              </div>
              
              {paginatedAppointments.map((appointment) => (
                <div key={appointment._id} className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 sm:p-4 transition-all duration-200">
                  {/* Mobile Layout */}
                  <div className="block lg:hidden space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-sm truncate">
                          {appointment.patientId?.fullName || 'Unknown Patient'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          Dr. {appointment.doctorId?.fullName || 'Unknown Doctor'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusBadge(appointment.status)}
                        {getPriorityBadge(appointment.priority)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(appointment.date)} at {appointment.time}</span>
                      </div>
                      <span>{appointment.duration}min</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {appointment.appointmentType} • {appointment.reason || 'No reason specified'}
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:flex items-center justify-between gap-6">
                    {/* Patient Name - Fixed width */}
                    <div className="w-32 flex-shrink-0">
                      <div className="font-semibold text-foreground text-sm truncate">
                        {appointment.patientId?.fullName || 'Unknown Patient'}
                      </div>
                    </div>
                    
                    {/* Doctor - Fixed width */}
                    <div className="w-40 flex-shrink-0">
                      <div className="text-sm font-medium truncate">Dr. {appointment.doctorId?.fullName || 'Unknown Doctor'}</div>
                      <div className="text-xs text-muted-foreground truncate">{appointment.doctorId?.specialty || 'General'}</div>
                    </div>
                    
                    {/* Date - Fixed width */}
                    <div className="w-24 flex-shrink-0">
                      <div className="text-sm font-medium">
                        {formatDate(appointment.date)}
                      </div>
                    </div>
                    
                    {/* Time & Duration - Fixed width */}
                    <div className="w-20 flex-shrink-0">
                      <div className="text-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{appointment.time}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{appointment.duration}min</div>
                    </div>
                    
                    {/* Type & Reason - Flexible width */}
                    <div className="flex-1 min-w-0" style={{}}>
                      <div className="text-sm text-muted-foreground truncate">
                        {appointment.appointmentType}
                      </div>
                    </div>
                    
                    
                    {/* Actions - Fixed width */}
                    <div className="w-48 flex-shrink-0 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setIsViewModalOpen(true);
                        }}
                        title="View Appointment Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRescheduleAppointment(appointment)}
                        className="text-primary hover:text-primary"
                        title="Reschedule Appointment"
                      >
                        Reschedule
                      </Button>
                      <Select 
                        onValueChange={(value) => handleUpdateStatus(appointment._id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const invoice = appointmentInvoices[appointment._id];
                          if (invoice) {
                            // Always use the appointment data from the appointments list for accurate duration
                            const enrichedInvoice = {
                              ...invoice,
                              appointmentId: {
                                ...appointment,
                                _id: appointment._id
                              }
                            };
                            setSelectedInvoice(enrichedInvoice);
                            setIsInvoiceDialogOpen(true);
                          } else {
                            toast.error('Invoice not found for this appointment');
                          }
                        }}
                        title="View Invoice"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Invoice
                      </Button>
                    </div>

                                        {/* Status & Priority - Fixed width */}
                    <div style={{paddingRight: "50px"}}>
                    <div className="w-24 flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(appointment.status)}
                        {getPriorityBadge(appointment.priority)}
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation - Only show when multiple pages */}
      {totalFilteredPages > 1 && (
        <div className="flex justify-center pb-2">
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="gradient-button-outline"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="gradient-button-outline"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalFilteredPages) }, (_, i) => {
                let pageNum;
                if (totalFilteredPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalFilteredPages - 2) {
                  pageNum = totalFilteredPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className={`w-8 h-8 p-0 ${currentPage === pageNum ? "gradient-button" : "gradient-button-outline"}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalFilteredPages))}
              disabled={currentPage === totalFilteredPages}
              className="gradient-button-outline"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalFilteredPages)}
              disabled={currentPage === totalFilteredPages}
              className="gradient-button-outline"
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* View Appointment Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Patient Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Name:</span>
                      <div className="text-sm text-foreground">{selectedAppointment.patientId?.fullName || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                      <div className="text-sm text-foreground">{selectedAppointment.patientId?.phone || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Email:</span>
                      <div className="text-sm text-foreground">{selectedAppointment.patientId?.email || 'N/A'}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Doctor Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Name:</span>
                      <div className="text-sm text-foreground">Dr. {selectedAppointment.doctorId?.fullName || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Specialty:</span>
                      <div className="text-sm text-foreground">{selectedAppointment.doctorId?.specialty || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                      <div className="text-sm text-foreground">{selectedAppointment.doctorId?.phone || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-foreground mb-3">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Type:</span>
                      <div className="text-sm text-foreground">{selectedAppointment.appointmentType || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Date:</span>
                      <div className="text-sm text-foreground">{formatDate(selectedAppointment.date) || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Time:</span>
                      <div className="text-sm text-foreground">{selectedAppointment.time || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Duration:</span>
                      <div className="text-sm text-foreground">{selectedAppointment.duration || 'N/A'} minutes</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Status:</span>
                      <div className="text-sm text-foreground">{getStatusBadge(selectedAppointment.status) || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Priority:</span>
                      <div className="text-sm text-foreground">{getPriorityBadge(selectedAppointment.priority) || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedAppointment.reason && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-foreground mb-3">Reason for Visit</h3>
                  <p className="text-sm text-foreground">{selectedAppointment.reason || 'N/A'}</p>
                </div>
              )}

              {selectedAppointment.notes && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-foreground mb-3">Notes</h3>
                  <p className="text-sm text-foreground">{selectedAppointment.notes || 'N/A'}</p>
                </div>
              )}

              {selectedAppointment.instructions && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-foreground mb-3">Instructions</h3>
                  <p className="text-sm text-foreground">{selectedAppointment.instructions || 'N/A'}</p>
                </div>
              )}

              {/* Payment Link Section - Show if appointment is not confirmed */}
              {selectedAppointment && (selectedAppointment.status === 'Processing' || selectedAppointment.status === 'Scheduled') && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
                    <LinkIcon className="w-4 h-4" />
                    Payment Link
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <p className="text-xs text-amber-800 dark:text-amber-200 truncate">
                            This appointment requires payment confirmation.
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 flex-shrink-0">
                          {selectedAppointment.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                          Amount: ₹{doctorFees?.appointmentFees || 500}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCopyPaymentLink(selectedAppointment._id)}
                        disabled={loadingPaymentLink}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {loadingPaymentLink ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                            <span className="text-xs">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            <span className="text-xs">Copy Link</span>
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleSharePaymentLink(selectedAppointment._id)}
                        disabled={loadingPaymentLink}
                        size="sm"
                        className="flex-1"
                      >
                        {loadingPaymentLink ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                            <span className="text-xs">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 mr-1.5" />
                            <span className="text-xs">Share Link</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {paymentLink && (
                      <div className="p-2 bg-muted rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Payment Link:</p>
                        <p className="text-xs font-mono break-all leading-tight">{paymentLink}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Appointment Modal */}
      <RescheduleAppointmentModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        appointment={selectedAppointment}
        onSuccess={handleRescheduleSuccess}
      />

      {/* Appointment Conflict Dialog */}
      <AppointmentConflictDialog
        isOpen={isConflictDialogOpen}
        onClose={handleConflictClose}
        conflictData={conflictData}
        formData={formData}
        onSelectTime={handleConflictSelectTime}
        onForceCreate={handleConflictForceCreate}
      />

      {/* Teleconsultation Modal */}
      <ScheduleTeleconsultationModal
        isOpen={isTeleconsultationDialogOpen}
        onClose={() => setIsTeleconsultationDialogOpen(false)}
        onSuccess={() => {
          setIsTeleconsultationDialogOpen(false);
          toast.success('Teleconsultation scheduled successfully!');
          loadAppointments(); // Reload appointments to show the new teleconsultation
        }}
        onSwitchToAppointment={() => {
          setIsTeleconsultationDialogOpen(false);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Appointment Created Successfully
            </DialogTitle>
            <DialogDescription>
              Complete payment to confirm your appointment
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
                      ? 'Complete the payment to confirm your appointment.'
                      : 'Appointment will be confirmed. Payment will be collected in cash at the clinic.'}
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex gap-2">
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

      {/* Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-blue-600" />
              Invoice Details
            </DialogTitle>
            <DialogDescription>
              View and manage invoice information
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Invoice #{selectedInvoice.invoiceNumber || 'N/A'}</h2>
                  <p className="text-muted-foreground">
                    Date: {selectedInvoice.createdAt ? format(parseISO(selectedInvoice.createdAt), 'MMM dd, yyyy') : 'N/A'}
                  </p>
                  {/* Status Badge */}
                  {selectedInvoice.status && (
                    <div className="mt-2">
                      <Badge variant={selectedInvoice.status === 'approved' ? 'success' : 'secondary'} className="flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" />
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">
                    ₹{Number(selectedInvoice.amount || selectedInvoice.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Patient Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedInvoice.patientId?.fullName || 'N/A'}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {selectedInvoice.patientId?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {selectedInvoice.patientId.phone}
                          </div>
                        )}
                        {selectedInvoice.patientId?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {selectedInvoice.patientId.email}
                          </div>
                        )}
                        {selectedInvoice.patientId?.uhid && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            UHID: {selectedInvoice.patientId.uhid}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice Date:</span>
                        <span className="font-medium">{selectedInvoice.createdAt ? format(parseISO(selectedInvoice.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Invoice Number:</span>
                        <span className="font-medium">{selectedInvoice.invoiceNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium capitalize">{selectedInvoice.status || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Method:</span>
                        <span className="font-medium">
                          {selectedInvoice.paymentMethod === 'cash' ? 'Cash' : 
                           selectedInvoice.paymentMethod === 'online' ? 'Card / UPI' : 
                           'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Doctor & Appointment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Appointment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">Doctor Information</h4>
                      <div className="space-y-1">
                        <p className="font-medium">Dr. {selectedInvoice.doctorId?.fullName || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{selectedInvoice.doctorId?.specialty || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">Appointment Information</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{selectedInvoice.appointmentId?.appointmentType || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">
                            {selectedInvoice.appointmentId?.date ? format(parseISO(selectedInvoice.appointmentId.date), 'MMM dd, yyyy') : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-medium">{selectedInvoice.appointmentId?.time || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">
                            {selectedInvoice.appointmentId?.duration ? `${selectedInvoice.appointmentId.duration} minutes` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span>₹{Number(selectedInvoice.amount || selectedInvoice.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedInvoice.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selectedInvoice.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button 
              onClick={() => window.print()}
              className="gradient-button"
            >
              <FileText className="w-4 h-4 mr-2" />
              Print Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentManagement;
