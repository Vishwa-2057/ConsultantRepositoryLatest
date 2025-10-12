import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, User, Phone, MapPin, AlertCircle, CheckCircle, XCircle, Plus, Search, Filter, Edit, CalendarDays, Users, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, Calendar as CalendarIcon, Info, Video, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentAPI, patientAPI, doctorAPI } from '@/services/api';
import { format, parseISO, isToday, isTomorrow, isYesterday, addMinutes } from 'date-fns';
import RescheduleAppointmentModal from '@/components/RescheduleAppointmentModal';
import AppointmentConflictDialog from '@/components/AppointmentConflictDialog';
import ScheduleTeleconsultationModal from '@/components/ScheduleTeleconsultationModal';
import { getCurrentUser } from '@/utils/roleUtils';

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
    return saved ? parseInt(saved) : 10;
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
    'Follow-up Visit', 
    'Annual Checkup',
    'Specialist Consultation',
    'Emergency Visit',
    'Lab Work',
    'Imaging',
    'Vaccination',
    'Physical Therapy',
    'Mental Health'
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
  }, []);

  useEffect(() => {
    loadAppointments();
    loadStats();
  }, [statusFilter, typeFilter, priorityFilter, dateFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, priorityFilter, dateFilter, searchTerm]);

  const handleCreateAppointment = async (forceCreate = false) => {
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
      const appointmentData = forceCreate ? { ...formData, forceCreate: true } : formData;
      await appointmentAPI.create(appointmentData);
      toast.success('Appointment created successfully');
      setIsCreateModalOpen(false);
      setIsConflictDialogOpen(false);
      resetForm();
      loadAppointments();
      loadStats();
    } catch (error) {
      console.error('Error creating appointment:', error);
      
      // Check if error is conflict-related (status 400 or 409, or message contains conflict info)
      console.log('Error details:', {
        status: error.response?.status,
        message: error.message,
        includesBooked: error.message?.includes('booked'),
        includesConflict: error.message?.includes('conflict')
      });

      if (error.response?.status === 400 || error.response?.status === 409 || 
          error.message?.includes('booked') || error.message?.includes('conflict')) {
        
        console.log('Detected conflict error, parsing details...');
        // Parse conflict details from error message
        const conflictDetails = parseConflictFromError(error.message);
        console.log('Parsed conflict details:', conflictDetails);
        setConflictData(conflictDetails);
        setIsConflictDialogOpen(true);
      } else {
        toast.error('Failed to create appointment');
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
      symptoms: ''
    });
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
  console.log('Paginated appointments:', paginatedAppointments);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-md lg:max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
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
                  <Select value={formData.patientId} onValueChange={(value) => setFormData({...formData, patientId: value})} disabled={submitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient._id} value={patient._id}>
                          {patient.fullName} - {patient.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Only show doctor selection for non-doctor users */}
                {!isDoctorUser && (
                  <div>
                    <Label htmlFor="doctor">Doctor</Label>
                    <Select value={formData.doctorId} onValueChange={(value) => setFormData({...formData, doctorId: value})} disabled={submitting}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors
                          .filter((doctor) => doctor.isActive !== false)
                          .map((doctor) => (
                            <SelectItem key={doctor._id} value={doctor._id}>
                              Dr. {doctor.fullName} - {doctor.specialty}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
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
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Appointment Type</Label>
                  <Select value={formData.appointmentType} onValueChange={(value) => setFormData({...formData, appointmentType: value})} disabled={submitting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    max="240"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Reason for Visit</Label>
                <Textarea
                  placeholder="Enter reason for appointment"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  disabled={submitting}
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
                Total: {stats.totalAppointments || 0}
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
                        <Info className="w-4 h-4" />
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
                      <Select onValueChange={(value) => handleUpdateStatus(appointment._id, value)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
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
      />
    </div>
  );
};

export default AppointmentManagement;
