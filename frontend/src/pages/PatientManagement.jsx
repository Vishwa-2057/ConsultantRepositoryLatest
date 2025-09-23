import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Activity,
  Heart,
  FileText,
  Share2,
  Stethoscope,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Clock,
  UserCheck,
  CalendarDays,
  ArrowRight,
  AlertTriangle,
  Check,
  Phone,
  Mail,
  Calendar
} from "lucide-react";
import PatientModal from "@/components/PatientModal";
import AppointmentModal from "@/components/AppointmentModal";
import { useToast } from "@/hooks/use-toast";
import { patientAPI, appointmentAPI, complianceAlertAPI } from "@/services/api";
import { isClinic, isDoctor } from "@/utils/roleUtils";
import { Link } from "react-router-dom";
import AppointmentViewModal from '../components/AppointmentViewModal';
import ComplianceAlertsModal from '../components/ComplianceAlertsModal';
import VitalsHistory from '../components/VitalsHistory';

const PatientManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(5);
  const [cardPageSize] = useState(6);
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedPatients, setExpandedPatients] = useState(new Set());
  
  // Specialty-based organization state
  const [specialtyGroups, setSpecialtyGroups] = useState([]);
  const [specialtyLoading, setSpecialtyLoading] = useState(false);
  const [expandedSpecialties, setExpandedSpecialties] = useState(new Set());
  
  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [isAppointmentViewModalOpen, setIsAppointmentViewModalOpen] = useState(false);
  
  // Compliance alerts state
  const [complianceAlerts, setComplianceAlerts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [solvingAlerts, setSolvingAlerts] = useState(new Set());
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [isComplianceAlertsModalOpen, setIsComplianceAlertsModalOpen] = useState(false);
  const [selectedPatientForCompliance, setSelectedPatientForCompliance] = useState(null);
  
  // Vitals state
  const [isVitalsHistoryOpen, setIsVitalsHistoryOpen] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState(null);

  const { toast } = useToast();

  // Load patients from API (server-side filters + pagination)
  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      setError("");
      try {
        const filters = {};
        if (searchTerm.trim()) filters.search = searchTerm.trim();
        if (statusFilter !== "all") {
          const statusMap = { 'active': 'Active', 'follow-up': 'Follow-up', 'completed': 'Completed' };
          filters.status = statusMap[statusFilter] || statusFilter;
        }
        const currentPageSize = activeTab === "cards" ? cardPageSize : pageSize;
        const response = await patientAPI.getAll(currentPage, currentPageSize, filters);
        const list = response.patients || response.data || [];
        const pagination = response.pagination || {};

        const transformedPatients = list.map(patient => {
          // Calculate age from dateOfBirth if age is 0 or not available
          let calculatedAge = patient.age;
          if (!calculatedAge || calculatedAge === 0) {
            if (patient.dateOfBirth) {
              const today = new Date();
              const birthDate = new Date(patient.dateOfBirth);
              calculatedAge = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
              }
            }
          }

          return {
            id: patient._id || patient.id,
            _id: patient._id,
            fullName: patient.fullName,
            name: patient.fullName,
            age: calculatedAge,
            calculatedAge: calculatedAge,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            phone: patient.phone,
            email: patient.email,
            
            // Enhanced patient fields
            uhid: patient.uhid,
            bloodGroup: patient.bloodGroup,
            occupation: patient.occupation,
            profileImage: patient.profileImage,
            
            // Referral information
            referringDoctor: patient.referringDoctor,
            referredClinic: patient.referredClinic,
            
            // Government identification
            governmentId: patient.governmentId,
            idNumber: patient.idNumber,
            governmentDocument: patient.governmentDocument,
            
            // Existing fields
            address: patient.address,
            emergencyContact: patient.emergencyContact,
            insurance: patient.insurance,
            medicalHistory: patient.medicalHistory,
            notes: patient.notes,
            condition: patient.medicalHistory?.conditions?.length > 0 
              ? patient.medicalHistory.conditions[0] 
              : "General Checkup",
            status: patient.status || "Active",
            lastVisit: patient.lastVisit,
            nextAppointment: patient.nextAppointment,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
            assignedDoctors: patient.assignedDoctors || []
          };
        });

        setPatients(transformedPatients);
        setTotalPages(pagination.totalPages || 1);
        setTotalCount(pagination.totalPatients || transformedPatients.length);
      } catch (err) {
        console.error('Failed to load patients:', err);
        setError(err.message || 'Failed to load patients');
        setPatients([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [searchTerm, statusFilter, currentPage, activeTab]);

  // Load patients grouped by specialty
  useEffect(() => {
    const loadSpecialtyGroups = async () => {
      if (activeTab !== "specialty") return;
      
      setSpecialtyLoading(true);
      setError("");
      try {
        const filters = {};
        if (searchTerm.trim()) filters.search = searchTerm.trim();
        if (statusFilter !== "all") {
          const statusMap = { 'active': 'Active', 'follow-up': 'Follow-up', 'completed': 'Completed' };
          filters.status = statusMap[statusFilter] || statusFilter;
        }
        
        const response = await patientAPI.getGroupedBySpecialty(filters);
        setSpecialtyGroups(response.specialtyGroups || []);
      } catch (err) {
        console.error('Failed to load specialty groups:', err);
        setError(err.message || 'Failed to load specialty groups');
        setSpecialtyGroups([]);
      } finally {
        setSpecialtyLoading(false);
      }
    };

    loadSpecialtyGroups();
  }, [searchTerm, statusFilter, activeTab]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "success";
      case "Follow-up": return "warning";
      case "Completed": return "secondary";
      default: return "muted";
    }
  };

  // Load appointments from API
  useEffect(() => {
    const loadAppointments = async () => {
      setAppointmentsLoading(true);
      try {
        const response = await appointmentAPI.getAll(1, 5, { sortBy: 'date', sortOrder: 'asc' });
        const appointmentsList = response.appointments || response.data || [];
        setAppointments(appointmentsList);
      } catch (error) {
        console.error('Failed to load appointments:', error);
        setAppointments([]);
      } finally {
        setAppointmentsLoading(false);
      }
    };

    loadAppointments();
  }, []);

  // Load compliance alerts from API
  useEffect(() => {
    const loadAlerts = async () => {
      setAlertsLoading(true);
      try {
        const response = await complianceAlertAPI.getAll(1, 6, { 
          status: 'Active',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        const alertsList = response.data || [];
        setAlerts(alertsList);
      } catch (error) {
        console.error('Failed to load compliance alerts:', error);
        setAlerts([]);
      } finally {
        setAlertsLoading(false);
      }
    };

    loadAlerts();
  }, []);

  const filteredPatients = patients; // server-side filtering applied

  // Modal handlers
  const handleNewPatient = () => {
    console.log("Add New Patient button clicked");
    setIsPatientModalOpen(true);
  };

  const handleNewAppointment = () => {
    setIsAppointmentModalOpen(true);
  };

  const handleAppointmentSubmit = (appointmentData) => {
    // Extract patient name from populated patient data
    const patientName = appointmentData.patientId?.fullName || appointmentData.patientName || 'Unknown Patient';
    
    toast({
      title: "Appointment Scheduled!",
      description: `Successfully scheduled ${appointmentData.appointmentType} for ${patientName} on ${new Date(appointmentData.date).toLocaleDateString()} at ${appointmentData.time}`,
      variant: "default",
    });
  };

  const handleAppointmentModalClose = () => {
    setIsAppointmentModalOpen(false);
  };

  const handleViewAppointments = () => {
    setIsAppointmentViewModalOpen(true);
  };

  const handleViewComplianceAlerts = () => {
    setIsComplianceAlertsModalOpen(true);
  };

  const handleComplianceAlertsModalClose = () => {
    setIsComplianceAlertsModalOpen(false);
  };

  const handleVitalsHistory = (patient) => {
    // Ensure the patient object has the correct ID structure
    const patientWithId = {
      ...patient,
      _id: patient._id || patient.id,
      id: patient.id || patient._id
    };
    setSelectedPatientForVitals(patientWithId);
    setIsVitalsHistoryOpen(true);
  };

  const handleVitalsHistoryClose = () => {
    setIsVitalsHistoryOpen(false);
    setSelectedPatientForVitals(null);
  };

  // Handle solving compliance alert
  const handleSolveAlert = async (alertId) => {
    setSolvingAlerts(prev => new Set([...prev, alertId]));
    
    try {
      await complianceAlertAPI.resolve(alertId, 'Marked as solved from patient management');
      
      // Remove the solved alert from the list
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
      
      toast({ 
        title: "Alert Solved", 
        description: "Compliance alert has been marked as solved." 
      });
    } catch (error) {
      console.error('Failed to solve compliance alert:', error);
      toast({ 
        title: "Error", 
        description: "Failed to solve compliance alert. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSolvingAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  // Helper functions
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const handleAppointmentViewModalClose = () => {
    setIsAppointmentViewModalOpen(false);
  };

  const getAppointmentStatusColor = (status) => {
    switch (status) {
      case "Scheduled": return "default";
      case "Confirmed": return "success";
      case "In Progress": return "warning";
      case "Completed": return "secondary";
      case "Cancelled": return "destructive";
      default: return "default";
    }
  };

  const getAppointmentPriority = (date, time) => {
    const appointmentDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffTime = appointmentDate - now;
    const diffHours = diffTime / (1000 * 60 * 60);
    
    if (diffHours < 0) return "past";
    if (diffHours < 2) return "urgent";
    if (diffHours < 24) return "soon";
    return "normal";
  };
  const handlePatientModalClose = () => setIsPatientModalOpen(false);

  // Form submission handler
  const handlePatientSubmit = (patientData) => {
    toast({
      title: "Patient Added!",
      description: `Successfully added ${patientData.fullName} to the system`,
      variant: "default",
    });
    setCurrentPage(1);
  };

  // Toggle patient expansion
  const togglePatientExpansion = (patientId) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedPatients(newExpanded);
  };

  // Toggle specialty expansion
  const toggleSpecialtyExpansion = (specialty) => {
    const newExpanded = new Set(expandedSpecialties);
    if (newExpanded.has(specialty)) {
      newExpanded.delete(specialty);
    } else {
      newExpanded.add(specialty);
    }
    setExpandedSpecialties(newExpanded);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Management</h1>
          <p className="text-muted-foreground">
            {isDoctor() ? "View your assigned patients" : "Manage patient records, onboarding, and information"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-500/25" 
            onClick={handleNewAppointment}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
          {isClinic() && (
            <Button 
              className="bg-gradient-primary shadow-soft" 
              onClick={handleNewPatient}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Patient
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patients by name or condition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="follow-up">Follow-up</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <Tabs defaultValue="list" className="space-y-4" onValueChange={(value) => {
        setActiveTab(value);
        setCurrentPage(1); // Reset to first page when switching views
      }}>
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="specialty">By Specialty</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Patients ({totalCount})</CardTitle>
              <CardDescription>Comprehensive patient information and status tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="space-y-4">
                {filteredPatients.map((patient) => {
                  const isExpanded = expandedPatients.has(patient.id || patient._id);
                  const patientId = patient.id || patient._id;
                  
                  return (
                    <div key={patientId} className="rounded-lg border border-border hover:bg-muted/30 transition-all duration-200">
                      {/* Main Patient Row */}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {patient.profileImage ? (
                                <img 
                                  src={patient.profileImage.startsWith('http') ? patient.profileImage : `http://localhost:5000${patient.profileImage}`}
                                  alt={patient.fullName}
                                  className="w-full h-full object-cover"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-full h-full bg-gradient-to-r from-blue-800 to-teal-500 rounded-full flex items-center justify-center ${patient.profileImage ? 'hidden' : ''}`}>
                                <User className="w-6 h-6 text-white" />
                              </div>
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{patient.fullName || patient.name || 'Unknown Patient'}</h3>
                              <p className="text-sm text-muted-foreground">
                                {patient.age || patient.calculatedAge || 0} years • {patient.gender || 'Unknown'}
                              </p>
                              {patient.uhid && (
                                <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                                  UHID: {patient.uhid}
                                </p>
                              )}
                              {patient.bloodGroup && (
                                <p className="text-sm text-red-600 font-medium">
                                  Blood Group: {patient.bloodGroup}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right hidden md:block">
                              <p className="text-sm text-muted-foreground">Status</p>
                              <Badge variant={getStatusColor(patient.status)}>
                                {patient.status || 'Active'}
                              </Badge>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleVitalsHistory(patient)}
                                title="View Vitals History"
                              >
                                <Stethoscope className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => togglePatientExpansion(patientId)}
                                className="ml-2"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border/50 bg-muted/20">
                          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Patient Identification */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm text-foreground flex items-center">
                                <UserCheck className="w-4 h-4 mr-2" />
                                Patient Identification
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">UHID:</span>
                                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                    {patient.uhid || 'Not provided'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Blood Group:</span>
                                  <span className="font-medium text-red-600">
                                    {patient.bloodGroup || 'Not provided'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Occupation:</span>
                                  <span>{patient.occupation || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Government ID:</span>
                                  <span>{patient.governmentId || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">ID Number:</span>
                                  <span className="font-mono text-xs">
                                    {patient.idNumber || 'Not provided'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm text-foreground flex items-center">
                                <Phone className="w-4 h-4 mr-2" />
                                Contact Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-3 h-3 text-muted-foreground" />
                                  <span>{patient.phone || 'Not provided'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Mail className="w-3 h-3 text-muted-foreground" />
                                  <span>{patient.email || 'Not provided'}</span>
                                </div>
                                <div className="flex items-start space-x-2">
                                  <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                                  <span className="text-sm">
                                    {patient.address && (patient.address.street || patient.address.city || patient.address.state || patient.address.zipCode)
                                      ? `${patient.address.street || ''}, ${patient.address.city || ''}, ${patient.address.state || ''} ${patient.address.zipCode || ''}`.replace(/^,\s*|,\s*$/, '').replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, '')
                                      : 'Address not provided'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Medical Information */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm text-foreground flex items-center">
                                <Heart className="w-4 h-4 mr-2" />
                                Medical Information
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Date of Birth:</span>
                                  <span>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Emergency Contact:</span>
                                  <span>
                                    {patient.emergencyContact?.name 
                                      ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship || 'Relationship not specified'})`
                                      : 'Not provided'
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Emergency Phone:</span>
                                  <span>{patient.emergencyContact?.phone || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Insurance Provider:</span>
                                  <span>{patient.insurance?.provider || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Policy Number:</span>
                                  <span>{patient.insurance?.policyNumber || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Age:</span>
                                  <span>{patient.age || patient.calculatedAge || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Gender:</span>
                                  <span>{patient.gender || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status:</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    patient.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                    patient.status === 'Inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                                    patient.status === 'Follow-up' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  }`}>
                                    {patient.status || 'Active'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Activity & Timeline */}
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm text-foreground flex items-center">
                                <Activity className="w-4 h-4 mr-2" />
                                Recent Activity
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">Last Visit</div>
                                    <div className="text-muted-foreground">
                                      {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'No recent visits'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">Next Appointment</div>
                                    <div className="text-muted-foreground">
                                      {patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString() : 'Not scheduled'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <User className="w-3 h-3 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">Assigned Doctors</div>
                                    <div className="text-muted-foreground">
                                      {patient.assignedDoctors && patient.assignedDoctors.length > 0 
                                        ? patient.assignedDoctors.map(doctor => 
                                            typeof doctor === 'object' ? doctor.fullName : 'Dr. Assigned'
                                          ).join(', ')
                                        : 'No doctors assigned'
                                      }
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Referral Information Section */}
                          {(patient.referringDoctor || patient.referredClinic) && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <Share2 className="w-4 h-4 mr-2" />
                                Referral Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {patient.referringDoctor && (
                                  <div>
                                    <div className="font-medium text-foreground mb-1">Referring Doctor</div>
                                    <div className="text-muted-foreground bg-background/50 px-3 py-2 rounded">
                                      {patient.referringDoctor}
                                    </div>
                                  </div>
                                )}
                                {patient.referredClinic && (
                                  <div>
                                    <div className="font-medium text-foreground mb-1">Referred Clinic</div>
                                    <div className="text-muted-foreground bg-background/50 px-3 py-2 rounded">
                                      {patient.referredClinic}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Notes Section */}
                          {patient.notes && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <FileText className="w-4 h-4 mr-2" />
                                Additional Notes
                              </h4>
                              <div className="text-sm text-muted-foreground bg-background/50 px-3 py-2 rounded">
                                {patient.notes}
                              </div>
                            </div>
                          )}

                          {/* Medical History Section */}
                          {(patient.medicalHistory?.conditions?.length > 0 || 
                            patient.medicalHistory?.allergies?.length > 0 || 
                            patient.medicalHistory?.medications?.length > 0) && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <Heart className="w-4 h-4 mr-2" />
                                Medical History
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                {patient.medicalHistory?.conditions?.length > 0 && (
                                  <div>
                                    <div className="font-medium text-foreground mb-1">Conditions</div>
                                    <div className="space-y-1">
                                      {patient.medicalHistory.conditions.map((condition, index) => (
                                        <div key={index} className="text-muted-foreground bg-background/50 px-2 py-1 rounded text-xs">
                                          {condition}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {patient.medicalHistory?.allergies?.length > 0 && (
                                  <div>
                                    <div className="font-medium text-foreground mb-1">Allergies</div>
                                    <div className="space-y-1">
                                      {patient.medicalHistory.allergies.map((allergy, index) => (
                                        <div key={index} className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                                          {allergy}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {patient.medicalHistory?.medications?.length > 0 && (
                                  <div>
                                    <div className="font-medium text-foreground mb-1">Medications</div>
                                    <div className="space-y-1">
                                      {patient.medicalHistory.medications.map((medication, index) => (
                                        <div key={index} className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                          {medication}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Notes Section */}
                          {patient.notes && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <h4 className="font-semibold text-sm text-foreground mb-2">Notes</h4>
                              <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded-md">
                                {patient.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} patients
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="border-0 shadow-soft hover:shadow-medical transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {patient.profileImage ? (
                          <img 
                            src={patient.profileImage.startsWith('http') ? patient.profileImage : `http://localhost:5000${patient.profileImage}`}
                            alt={patient.fullName || patient.name}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-gradient-to-r from-blue-800 to-teal-500 rounded-full flex items-center justify-center ${patient.profileImage ? 'hidden' : ''}`}>
                          <User className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-base">{patient.fullName || patient.name || 'Unknown Patient'}</CardTitle>
                        <CardDescription>
                          {patient.uhid ? `UHID: ${patient.uhid}` : `ID: ${patient.id || patient._id}`}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(patient.status)}>
                      {patient.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Age</p>
                      <p className="font-medium">{patient.age || patient.calculatedAge || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium">{patient.gender || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Blood Group</p>
                      <p className="font-medium text-red-600">{patient.bloodGroup || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Occupation</p>
                      <p className="font-medium">{patient.occupation || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Condition</p>
                    <p className="font-medium">{patient.condition}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">
                      {patient.address && typeof patient.address === 'object' 
                        ? `${patient.address.street || ''}, ${patient.address.city || ''}, ${patient.address.state || ''} ${patient.address.zipCode || ''}`.replace(/^,\s*|,\s*$/, '').replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, '') || 'Address not provided'
                        : patient.address || 'Address not provided'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>Next: {patient.nextAppointment ? new Date(patient.nextAppointment).toLocaleDateString() : 'Not scheduled'}</span>
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleVitalsHistory(patient)}
                    >
                      <Stethoscope className="w-4 h-4 mr-1" />
                      Vitals
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * cardPageSize) + 1} to {Math.min(currentPage * cardPageSize, totalCount)} of {totalCount} patients
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="specialty">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                Patients by Doctor Specialty
              </CardTitle>
              <CardDescription>Patients organized by their assigned doctors' medical specialties</CardDescription>
            </CardHeader>
            <CardContent>
              {specialtyLoading && <p className="text-sm text-muted-foreground">Loading specialty groups...</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              
              <div className="space-y-4">
                {specialtyGroups.map((group) => {
                  const isExpanded = expandedSpecialties.has(group.specialty);
                  const specialtyName = group.specialty || 'Unassigned';
                  
                  return (
                    <div key={group.specialty || 'unassigned'} className="rounded-lg border border-border">
                      {/* Specialty Header */}
                      <div 
                        className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 cursor-pointer hover:from-primary/10 hover:to-secondary/10 transition-all duration-200"
                        onClick={() => toggleSpecialtyExpansion(group.specialty)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                              <UserCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground text-lg">{specialtyName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {group.patientCount} patient{group.patientCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-background">
                              {group.patientCount}
                            </Badge>
                            <Button variant="ghost" size="icon">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Patients in Specialty */}
                      {isExpanded && (
                        <div className="border-t border-border/50">
                          <div className="p-4 space-y-3">
                            {group.patients.map((patient) => (
                              <div key={patient._id} className="rounded-lg border border-border/30 hover:bg-muted/20 transition-all duration-200">
                                <div className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-white" />
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-foreground">{patient.fullName}</h4>
                                        <p className="text-xs text-muted-foreground">
                                          {patient.age || 0} years • {patient.gender || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Doctors: {patient.assignedDoctors?.map(doc => doc.fullName).join(', ') || 'None assigned'}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <Badge variant={getStatusColor(patient.status)} className="text-xs">
                                        {patient.status || 'Active'}
                                      </Badge>
                                      <div className="flex space-x-1">
                                        <Button variant="ghost" size="sm">
                                          <Phone className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                          <Mail className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {!specialtyLoading && specialtyGroups.length === 0 && (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No patients found with assigned doctors</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upcoming Appointments and Compliance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-secondary" />
                Upcoming Appointments
              </span>
              <Button variant="ghost" size="sm" onClick={handleViewAppointments}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
            <CardDescription>Your scheduled appointments and meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointmentsLoading && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              )}
              {!appointmentsLoading && appointments.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                </div>
              )}
              <div className="space-y-3">
                {appointments.slice(0, 2).map((appointment, index) => {
                  const priority = getAppointmentPriority(appointment.date, appointment.time);
                  const patientName = appointment.patientId?.fullName || appointment.patientName || 'Unknown Patient';
                  
                  return (
                    <div key={index} className={`p-3 rounded-lg border transition-colors ${
                      priority === 'urgent' ? 'border-red-200 bg-red-50/50' :
                      priority === 'soon' ? 'border-yellow-200 bg-yellow-50/50' :
                      priority === 'past' ? 'border-gray-200 bg-gray-50/50' :
                      'border-border hover:bg-muted/30'
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">{patientName}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge variant={getAppointmentStatusColor(appointment.status)} className="text-xs px-1.5 py-0.5">
                            {appointment.status}
                          </Badge>
                          {priority === 'urgent' && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">Urgent</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{appointment.appointmentType || 'Consultation'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{new Date(appointment.date).toLocaleDateString()} at {appointment.time}</span>
                      </div>
                      {appointment.location && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{appointment.location}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Alerts */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Compliance Alerts
              </span>
              <Button variant="ghost" size="sm" onClick={handleViewComplianceAlerts}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
            <CardDescription>Important notifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alertsLoading && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              )}
              {!alertsLoading && alerts.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">No compliance alerts.</p>
                </div>
              )}
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert, index) => (
                  <div key={alert._id || index} className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground truncate">{alert.type}</span>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <Badge variant={getPriorityColor(alert.priority)} className="text-xs">
                          {alert.priority}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
                          onClick={() => handleSolveAlert(alert._id)}
                          disabled={solvingAlerts.has(alert._id)}
                        >
                          {solvingAlerts.has(alert._id) ? (
                            <>
                              <Clock className="w-3 h-3 mr-1 animate-spin" />
                              Solving...
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Solved
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="font-medium text-foreground mb-1 truncate">{alert.patientName}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patient Modal */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={handlePatientModalClose}
        onSubmit={handlePatientSubmit}
      />

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={handleAppointmentModalClose}
        onSubmit={handleAppointmentSubmit}
      />

      {/* Appointment View Modal */}
      <AppointmentViewModal
        isOpen={isAppointmentViewModalOpen}
        onClose={handleAppointmentViewModalClose}
      />

      {/* Compliance Alerts Modal */}
      <ComplianceAlertsModal
        isOpen={isComplianceAlertsModalOpen}
        onClose={handleComplianceAlertsModalClose}
      />

      {/* Vitals History Modal */}
      <VitalsHistory
        isOpen={isVitalsHistoryOpen}
        onClose={handleVitalsHistoryClose}
        patient={selectedPatientForVitals}
      />
    </div>
  );
};

export default PatientManagement;
