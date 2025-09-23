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
import { Calendar, Clock, User, Phone, MapPin, AlertCircle, CheckCircle, XCircle, Plus, Search, Filter, Edit, Trash2, CalendarDays, Users, Activity, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentAPI, patientAPI, doctorAPI } from '@/services/api';
import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';

const AppointmentManagement = () => {
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
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [expandedAppointments, setExpandedAppointments] = useState(new Set());
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

      const response = await appointmentAPI.getAll(currentPage, 10, filters);
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
      setDoctors(response.doctors || response.data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadStats();
    loadPatients();
    loadDoctors();
  }, [currentPage, statusFilter, typeFilter, dateFilter]);

  const handleCreateAppointment = async () => {
    try {
      await appointmentAPI.create(formData);
      toast.success('Appointment created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      loadAppointments();
      loadStats();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    }
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

  const handleDeleteAppointment = async (appointmentId) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await appointmentAPI.delete(appointmentId);
        toast.success('Appointment deleted successfully');
        loadAppointments();
        loadStats();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast.error('Failed to delete appointment');
      }
    }
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
    setFormData({
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
          <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
          <p className="text-gray-600 mt-1">Manage and track all patient appointments</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
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
              <div className="grid grid-cols-2 gap-4">
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
              <Button onClick={handleCreateAppointment}>
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
      <div className="bg-gray-50/50 border border-gray-200/60 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 bg-white/80 border-gray-200/60 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 text-sm bg-white/80 border-gray-200/60">
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
              <SelectTrigger className="w-40 h-9 text-sm bg-white/80 border-gray-200/60">
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
              <SelectTrigger className="w-32 h-9 text-sm bg-white/80 border-gray-200/60">
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
              className="text-gray-500 hover:text-gray-700 h-9 px-3 text-sm"
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
            <div className="text-center py-8 text-gray-500">
              No appointments found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div key={appointment._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {appointment.patientId?.fullName || 'Unknown Patient'}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {appointment.patientId?.phone || 'No phone'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Dr. {appointment.doctorId?.fullName || 'Unknown Doctor'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {appointment.doctorId?.specialty || 'General'}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDate(appointment.date)}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appointment.time} ({appointment.duration}min)
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex gap-2">
                          {getStatusBadge(appointment.status)}
                          {getPriorityBadge(appointment.priority)}
                        </div>
                        <div className="text-sm text-gray-600">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAppointment(appointment._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {appointment.reason && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Reason:</span> {appointment.reason}
                      </div>
                    </div>
                  )}
                  
                  {/* Expanded Details */}
                  {expandedAppointments.has(appointment._id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Patient Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Patient Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Name:</span>
                              <span className="ml-2 text-gray-600">{appointment.patientId?.fullName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Phone:</span>
                              <span className="ml-2 text-gray-600">{appointment.patientId?.phone || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Email:</span>
                              <span className="ml-2 text-gray-600">{appointment.patientId?.email || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Doctor Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Doctor Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Name:</span>
                              <span className="ml-2 text-gray-600">{appointment.doctorId?.fullName || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Specialty:</span>
                              <span className="ml-2 text-gray-600">{appointment.doctorId?.specialty || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Phone:</span>
                              <span className="ml-2 text-gray-600">{appointment.doctorId?.phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Appointment Details */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Appointment Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Duration:</span>
                              <span className="ml-2 text-gray-600">{appointment.duration || 30} minutes</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Priority:</span>
                              <span className="ml-2">{getPriorityBadge(appointment.priority)}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Created:</span>
                              <span className="ml-2 text-gray-600">
                                {appointment.createdAt ? format(new Date(appointment.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Additional Information */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Additional Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            {appointment.symptoms && (
                              <div>
                                <span className="font-medium text-gray-700">Symptoms:</span>
                                <span className="ml-2 text-gray-600">{appointment.symptoms}</span>
                              </div>
                            )}
                            {appointment.notes && (
                              <div>
                                <span className="font-medium text-gray-700">Notes:</span>
                                <span className="ml-2 text-gray-600">{appointment.notes}</span>
                              </div>
                            )}
                            {!appointment.symptoms && !appointment.notes && (
                              <div className="text-gray-500 italic">No additional information available</div>
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
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount} appointments
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
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
                    className="w-8 h-8 p-0"
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
                  <h3 className="font-semibold text-gray-900 mb-3">Patient Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <div className="text-sm text-gray-900">{selectedAppointment.patientId?.fullName}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <div className="text-sm text-gray-900">{selectedAppointment.patientId?.phone}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <div className="text-sm text-gray-900">{selectedAppointment.patientId?.email}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Doctor Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Name:</span>
                      <div className="text-sm text-gray-900">Dr. {selectedAppointment.doctorId?.fullName}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Specialty:</span>
                      <div className="text-sm text-gray-900">{selectedAppointment.doctorId?.specialty}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone:</span>
                      <div className="text-sm text-gray-900">{selectedAppointment.doctorId?.phone}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Type:</span>
                      <div className="text-sm text-gray-900">{selectedAppointment.appointmentType}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Date:</span>
                      <div className="text-sm text-gray-900">{formatDate(selectedAppointment.date)}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Time:</span>
                      <div className="text-sm text-gray-900">{selectedAppointment.time}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Duration:</span>
                      <div className="text-sm text-gray-900">{selectedAppointment.duration} minutes</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Status:</span>
                      <div className="text-sm text-gray-900">{getStatusBadge(selectedAppointment.status)}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Priority:</span>
                      <div className="text-sm text-gray-900">{getPriorityBadge(selectedAppointment.priority)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedAppointment.reason && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Reason for Visit</h3>
                  <p className="text-sm text-gray-900">{selectedAppointment.reason}</p>
                </div>
              )}

              {selectedAppointment.notes && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                  <p className="text-sm text-gray-900">{selectedAppointment.notes}</p>
                </div>
              )}

              {selectedAppointment.instructions && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
                  <p className="text-sm text-gray-900">{selectedAppointment.instructions}</p>
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
    </div>
  );
};

export default AppointmentManagement;
