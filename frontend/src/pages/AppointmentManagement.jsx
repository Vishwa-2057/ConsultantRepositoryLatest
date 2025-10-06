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
import { Calendar, Clock, User, Phone, MapPin, AlertCircle, CheckCircle, XCircle, Plus, Search, Filter, Edit, CalendarDays, Users, Activity, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentAPI, patientAPI, doctorAPI } from '@/services/api';
import { format, parseISO, isToday, isTomorrow, isYesterday, addMinutes } from 'date-fns';
import RescheduleAppointmentModal from '@/components/RescheduleAppointmentModal';
import AppointmentConflictDialog from '@/components/AppointmentConflictDialog';
import { getCurrentUser } from '@/utils/roleUtils';

const AppointmentManagement = () => {
  // Set page title immediately
  document.title = "Appointment Management - Smart Healthcare";
  
  // Get current user info
  const currentUser = getCurrentUser();
  const isDoctorUser = currentUser?.role === 'doctor';
  
  
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [expandedAppointments, setExpandedAppointments] = useState(new Set());
  const [conflictData, setConflictData] = useState(null);
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    appointmentType: '',
    date: '',
    time: '',
    duration: 30,
    priority: 'normal',
    reason: '',
    notes: '',
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
    'In Progress',
    'Completed',
    'Cancelled',
    'No Show'
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Scheduled': { color: 'bg-blue-100 text-blue-800', icon: Clock },
      'Confirmed': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'In Progress': { color: 'bg-yellow-100 text-yellow-800', icon: Activity },
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
    try {
      setLoading(true);
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.appointmentType = typeFilter;
      if (dateFilter !== 'all') {
        const today = new Date();
        if (dateFilter === 'today') {
          filters.date = format(today, 'yyyy-MM-dd');
        }
      }

      // For doctors, only show their own appointments
      if (isDoctorUser && currentUser) {
        const userId = currentUser.id || currentUser._id;
        filters.doctorId = userId;
      }

      const response = await appointmentAPI.getAll(currentPage, 5, filters);
      setAppointments(response.appointments || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCount(response.pagination?.totalAppointments || 0);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
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

  useEffect(() => {
    document.title = "Appointment Management - Smart Healthcare";
    loadPatients();
    loadDoctors();
  }, []);

  useEffect(() => {
    loadAppointments();
    loadStats();
  }, [currentPage, statusFilter, typeFilter, dateFilter]);

  const handleCreateAppointment = async (forceCreate = false) => {
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

          if (conflictCheck.hasConflict) {
            // Show conflict dialog
            setConflictData(conflictCheck.conflictDetails);
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

  const toggleAppointmentExpansion = (appointmentId) => {
    setExpandedAppointments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appointmentId)) {
        newSet.delete(appointmentId);
      } else {
        newSet.add(appointmentId);
      }
      return newSet;
    });
  };

  const resetForm = () => {
    const userId = currentUser?.id || currentUser?._id;
    const isDoctor = isDoctorUser || currentUser?.role === 'doctor';
    
    setFormData({
      patientId: '',
      doctorId: isDoctor && userId ? userId : '', // Preserve doctor selection for doctors
      appointmentType: '',
      date: '',
      time: '',
      duration: 30,
      priority: 'normal',
      reason: '',
      notes: '',
      instructions: ''
    });
  };

  const filteredAppointments = appointments.filter(appointment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      appointment.patientId?.fullName?.toLowerCase().includes(searchLower) ||
      appointment.doctorId?.fullName?.toLowerCase().includes(searchLower) ||
      appointment.appointmentType?.toLowerCase().includes(searchLower) ||
      appointment.reason?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground mt-1">Manage and track all patient appointments</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-button">
              <Plus className="w-4 h-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Appointment</DialogTitle>
              <DialogDescription>
                Schedule a new appointment for a patient
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className={`grid gap-4 ${isDoctorUser ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div>
                  <Label htmlFor="patient">Patient</Label>
                  <Select value={formData.patientId} onValueChange={(value) => setFormData({...formData, patientId: value})}>
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
                    <Select value={formData.doctorId} onValueChange={(value) => setFormData({...formData, doctorId: value})}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Appointment Type</Label>
                  <Select value={formData.appointmentType} onValueChange={(value) => setFormData({...formData, appointmentType: value})}>
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
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
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
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Reason for Visit</Label>
                <Textarea
                  placeholder="Enter reason for appointment"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  placeholder="Additional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button className="gradient-button" onClick={handleCreateAppointment}>
                Create Appointment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingAppointments || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const totalAppointments = stats.totalAppointments || 0;
                const statusStats = stats.statusStats || [];
                
                // More detailed debugging
                console.log('=== COMPLETION RATE DEBUG ===');
                console.log('Total appointments:', totalAppointments);
                console.log('Status stats array:', statusStats);
                console.log('Status stats length:', statusStats.length);
                
                // Check all status values in the array
                statusStats.forEach((stat, index) => {
                  console.log(`Status ${index}:`, {
                    id: stat._id,
                    count: stat.count,
                    idType: typeof stat._id,
                    idLength: stat._id?.length,
                    exactMatch: stat._id === 'Completed'
                  });
                });
                
                const completedStat = statusStats.find(s => s._id === 'Completed');
                const completedCount = completedStat?.count || 0;
                
                console.log('Completed stat found:', completedStat);
                console.log('Completed count:', completedCount);
                
                if (totalAppointments === 0) return '0%';
                
                const completionRate = Math.round((completedCount / totalAppointments) * 100);
                console.log('Final completion rate:', completionRate);
                console.log('=== END DEBUG ===');
                
                return `${completionRate}%`;
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Compact and Subtle */}
      <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 bg-background border-border text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 text-sm bg-background border-border">
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
              <SelectTrigger className="w-40 h-9 text-sm bg-background border-border">
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
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32 h-9 text-sm bg-background border-border">
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
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setDateFilter('all');
              }}
              className="text-muted-foreground hover:text-foreground h-9 px-3 text-sm"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <Card>
        <CardHeader>
          <CardTitle>Appointments ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No appointments found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div key={appointment._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="font-semibold text-foreground">
                          {appointment.patientId?.fullName || 'Unknown Patient'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {appointment.patientId?.phone || 'No phone'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          Dr. {appointment.doctorId?.fullName || 'Unknown Doctor'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.doctorId?.specialty || 'General'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {formatDate(appointment.date)}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appointment.time} ({appointment.duration}min)
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex gap-2">
                          {getStatusBadge(appointment.status)}
                          {getPriorityBadge(appointment.priority)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.appointmentType}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAppointmentExpansion(appointment._id)}
                      >
                        {expandedAppointments.has(appointment._id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRescheduleAppointment(appointment)}
                        className="text-primary hover:text-primary"
                        title="Reschedule Appointment"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Select onValueChange={(value) => handleUpdateStatus(appointment._id, value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Update Status" />
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
                  </div>
                  {appointment.reason && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Reason:</span> {appointment.reason}
                      </div>
                    </div>
                  )}
                  
                  {/* Expanded Details */}
                  {expandedAppointments.has(appointment._id) && (
                    <div className="mt-4 pt-4 border-t border-border bg-muted/30 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Patient Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Patient Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">Name:</span>
                              <span className="text-foreground ml-2">{appointment.patientId?.fullName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Phone:</span>
                              <span className="text-foreground ml-2">{appointment.patientId?.phone || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Email:</span>
                              <span className="text-foreground ml-2">{appointment.patientId?.email || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Doctor Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Doctor Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">Name:</span>
                              <span className="text-foreground ml-2">{appointment.doctorId?.fullName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Specialty:</span>
                              <span className="text-foreground ml-2">{appointment.doctorId?.specialty || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Phone:</span>
                              <span className="text-foreground ml-2">{appointment.doctorId?.phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Appointment Details */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Appointment Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">Duration:</span>
                              <span className="text-foreground ml-2">{appointment.duration || 30} minutes</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Priority:</span>
                              <span className="ml-2">{getPriorityBadge(appointment.priority)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Created:</span>
                              <span className="text-foreground ml-2">
                                {appointment.createdAt ? format(new Date(appointment.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Additional Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Additional Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            {appointment.symptoms && (
                              <div>
                                <span className="font-medium text-muted-foreground">Symptoms:</span>
                                <span className="text-foreground ml-2">{appointment.symptoms}</span>
                              </div>
                            )}
                            {appointment.notes && (
                              <div>
                                <span className="font-medium text-muted-foreground">Notes:</span>
                                <span className="text-foreground ml-2">{appointment.notes}</span>
                              </div>
                            )}
                            {!appointment.symptoms && !appointment.notes && (
                              <div className="text-muted-foreground italic">No additional information available</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * 5) + 1} to {Math.min(currentPage * 5, totalCount)} of {totalCount} appointments
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="gradient-button-outline"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="gradient-button-outline"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
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
    </div>
  );
};

export default AppointmentManagement;
