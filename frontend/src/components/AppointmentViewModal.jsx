import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Stethoscope,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { appointmentAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/utils/roleUtils";

const AppointmentViewModal = ({ isOpen, onClose }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const { toast } = useToast();

  const currentUser = getCurrentUser();
  const itemsPerPage = 10;

  // Load appointments with filters and pagination
  const loadAppointments = async (page = 1) => {
    setLoading(true);
    try {
      const filters = {};
      // Note: Backend doesn't support search parameter, so we'll filter client-side
      if (statusFilter && statusFilter !== "all") filters.status = statusFilter;
      if (priorityFilter && priorityFilter !== "all") filters.priority = priorityFilter;
      if (dateFilter) filters.date = dateFilter;

      // Remove priority from backend filters since we'll handle it client-side
      const backendFilters = { ...filters };
      delete backendFilters.priority;
      
      const response = await appointmentAPI.getAll(page, itemsPerPage, {
        ...backendFilters,
        sortBy: 'date',
        sortOrder: 'asc'
      });

      let appointmentsList = response.appointments || response.data || [];
      
      // Client-side filtering for search term
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        appointmentsList = appointmentsList.filter(appointment => {
          const patientName = appointment.patientId?.fullName || appointment.patientName || '';
          const doctorName = appointment.doctorId?.fullName || appointment.doctorName || '';
          const appointmentType = appointment.appointmentType || '';
          
          return patientName.toLowerCase().includes(searchLower) ||
                 doctorName.toLowerCase().includes(searchLower) ||
                 appointmentType.toLowerCase().includes(searchLower);
        });
      }

      // Client-side filtering for calculated priority (urgency)
      if (priorityFilter && priorityFilter !== "all") {
        appointmentsList = appointmentsList.filter(appointment => {
          const urgency = getAppointmentUrgency(appointment.date, appointment.time);
          return urgency === priorityFilter;
        });
      }
      
      setAppointments(appointmentsList);
      setTotalPages(Math.ceil((response.pagination?.totalAppointments || 0) / itemsPerPage));
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive"
      });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load appointments when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      loadAppointments(1);
    }
  }, [isOpen, statusFilter, priorityFilter, dateFilter]);

  // Handle search term with debounce
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        loadAppointments(1);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadAppointments(newPage);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setDateFilter("");
    setCurrentPage(1);
  };

  // Get status color for badges
  const getStatusColor = (status) => {
    switch (status) {
      case "Scheduled": return "default";
      case "Confirmed": return "success";
      case "In Progress": return "warning";
      case "Completed": return "secondary";
      case "Cancelled": return "destructive";
      default: return "default";
    }
  };

  // Get priority color for badges (based on urgency)
  const getPriorityColor = (urgency) => {
    switch (urgency) {
      case "urgent": return "destructive";
      case "soon": return "warning";
      case "past": return "secondary";
      case "normal": return "default";
      default: return "default";
    }
  };

  // Format appointment date and time
  const formatDateTime = (date, time) => {
    if (!date || !time) return { date: "No date", time: "No time" };
    
    try {
      // Handle MongoDB date format
      let appointmentDate;
      if (typeof date === 'string') {
        // If date is ISO string from MongoDB
        appointmentDate = new Date(date);
      } else if (date instanceof Date) {
        appointmentDate = date;
      } else {
        // Fallback: try to parse as string
        appointmentDate = new Date(date);
      }
      
      if (isNaN(appointmentDate.getTime())) {
        return { date: "Invalid date", time: time };
      }
      
      return {
        date: appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        time: time // Use time as-is from MongoDB
      };
    } catch (error) {
      console.error('Date formatting error:', error, 'Date:', date, 'Time:', time);
      return { date: "Invalid date", time: time || "No time" };
    }
  };

  // Get appointment urgency
  const getAppointmentUrgency = (date, time) => {
    if (!date || !time) return "normal";
    
    try {
      // Handle MongoDB date format properly
      let appointmentDate;
      if (typeof date === 'string') {
        appointmentDate = new Date(date);
      } else if (date instanceof Date) {
        appointmentDate = date;
      } else {
        appointmentDate = new Date(date);
      }
      
      // If we have a valid date, combine with time
      if (!isNaN(appointmentDate.getTime()) && time) {
        // Extract just the date part and combine with time
        const dateStr = appointmentDate.toISOString().split('T')[0];
        const fullDateTime = new Date(`${dateStr}T${time}`);
        
        if (!isNaN(fullDateTime.getTime())) {
          const now = new Date();
          const diffHours = (fullDateTime - now) / (1000 * 60 * 60);
          
          if (diffHours < 0) return "past";
          if (diffHours < 2) return "urgent";
          if (diffHours < 24) return "soon";
          return "normal";
        }
      }
      
      return "normal";
    } catch (error) {
      return "normal";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Appointments Overview
          </DialogTitle>
        </DialogHeader>

        {/* Filters Section */}
        <div className="flex-shrink-0 space-y-4 border-b pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgencies</SelectItem>
                <SelectItem value="urgent">Urgent (within 2 hours)</SelectItem>
                <SelectItem value="soon">Soon (within 24 hours)</SelectItem>
                <SelectItem value="normal">Normal (24+ hours)</SelectItem>
                <SelectItem value="past">Past Due</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by date"
            />
          </div>

          {/* Clear Filters Button */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Appointments List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                <p className="text-muted-foreground">Loading appointments...</p>
              </div>
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No appointments found</p>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter || priorityFilter || dateFilter 
                    ? "Try adjusting your filters to see more results."
                    : "No appointments have been scheduled yet."
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {appointments.map((appointment, index) => {
                const patientName = appointment.patientId?.fullName || appointment.patientName || 'Unknown Patient';
                const doctorName = appointment.doctorId?.fullName || appointment.doctorName || 'Unknown Doctor';
                const dateTime = formatDateTime(appointment.date, appointment.time);
                const urgency = getAppointmentUrgency(appointment.date, appointment.time);

                return (
                  <Card key={appointment._id || index} className={`transition-all duration-200 hover:shadow-md ${
                    urgency === 'urgent' ? 'border-red-200 bg-red-50/30' :
                    urgency === 'soon' ? 'border-yellow-200 bg-yellow-50/30' :
                    urgency === 'past' ? 'border-gray-200 bg-gray-50/30' :
                    'border-border hover:bg-muted/30'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="w-4 h-4 text-primary flex-shrink-0" />
                            <h3 className="font-semibold text-foreground truncate">{patientName}</h3>
                            <Badge variant={getStatusColor(appointment.status)} className="flex-shrink-0">
                              {appointment.status}
                            </Badge>
                            <Badge variant={getPriorityColor(urgency)} className="flex-shrink-0">
                              {urgency === 'urgent' ? 'Urgent' :
                               urgency === 'soon' ? 'Soon' :
                               urgency === 'past' ? 'Past Due' :
                               'Normal'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            {/* Date & Time */}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 flex-shrink-0" />
                              <span>{typeof dateTime === 'object' ? dateTime.date : dateTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              <span>{typeof dateTime === 'object' ? dateTime.time : appointment.time}</span>
                            </div>

                            {/* Doctor */}
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">Dr. {doctorName}</span>
                            </div>

                            {/* Appointment Type */}
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 flex-shrink-0 text-center">📋</span>
                              <span className="truncate">{appointment.appointmentType || 'Consultation'}</span>
                            </div>

                            {/* Location */}
                            {appointment.location && (
                              <div className="flex items-center gap-2 md:col-span-2">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{appointment.location}</span>
                              </div>
                            )}

                            {/* Contact Info */}
                            {appointment.patientId?.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{appointment.patientId.phone}</span>
                              </div>
                            )}
                            {appointment.patientId?.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{appointment.patientId.email}</span>
                              </div>
                            )}
                          </div>

                          {/* Notes */}
                          {appointment.notes && (
                            <div className="mt-3 p-2 bg-muted/50 rounded-md">
                              <p className="text-sm text-muted-foreground">
                                <strong>Notes:</strong> {appointment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && appointments.length > 0 && totalPages > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentViewModal;
