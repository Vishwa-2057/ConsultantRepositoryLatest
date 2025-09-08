import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Plus,
  ArrowRight,
  CalendarDays,
  User,
  MapPin
} from "lucide-react";
import AppointmentModal from "@/components/AppointmentModal";
import { useToast } from "@/hooks/use-toast";
import { appointmentAPI, patientAPI, complianceAlertAPI } from "@/services/api";
 
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentPatientsLoading, setRecentPatientsLoading] = useState(false);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPatientsLoading, setTotalPatientsLoading] = useState(true);
  
  const { toast } = useToast();

  // Load appointments from API when component mounts
  useEffect(() => {
    const loadAppointments = async () => {
      setAppointmentsLoading(true);
      try {
        const response = await appointmentAPI.getAll(1, 3, { sortBy: 'date', sortOrder: 'asc' });
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

  // Load recent patients from API
  useEffect(() => {
    const loadRecentPatients = async () => {
      setRecentPatientsLoading(true);
      try {
        const response = await patientAPI.getAll(1, 3, { sortBy: 'createdAt', sortOrder: 'desc' });
        const list = response.patients || response.data || [];
        const mapped = list.map(p => ({
          name: p.fullName,
          condition: p.medicalHistory?.conditions?.[0] || 'General Checkup',
          status: p.status || 'Active',
          lastVisit: p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : ''
        }));
        setRecentPatients(mapped);
      } catch (error) {
        console.error('Failed to load recent patients:', error);
        setRecentPatients([]);
      } finally {
        setRecentPatientsLoading(false);
      }
    };

    loadRecentPatients();
  }, []);

  // Load total patients count
  useEffect(() => {
    const loadTotalPatients = async () => {
      setTotalPatientsLoading(true);
      try {
        const response = await patientAPI.getAll(1, 1); // limit 1 to get pagination only
        const total = response?.pagination?.totalPatients || 0;
        setTotalPatients(total);
      } catch (error) {
        console.error('Failed to load total patients:', error);
        setTotalPatients(0);
      } finally {
        setTotalPatientsLoading(false);
      }
    };
    loadTotalPatients();
  }, []);

  const stats = [
    {
      title: "Total Patients",
      value: totalPatientsLoading ? "…" : totalPatients.toLocaleString(),
      change: "+12.5%",
      icon: Users,
      color: "text-primary"
    },
    {
      title: "Appointments Today",
      value: "23",
      change: "+3 from yesterday",
      icon: Calendar,
      color: "text-secondary"
    },
    {
      title: "Compliance Rate",
      value: "94.2%",
      change: "+2.1%",
      icon: CheckCircle,
      color: "text-success"
    },
    {
      title: "Revenue (Month)",
      value: "$45,230",
      change: "+8.7%",
      icon: TrendingUp,
      color: "text-warning"
    }
  ];

  // recentPatients are now loaded from the API

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({ type: "Medication", patientId: "", patientName: "", message: "", priority: "Medium" });
  const [alertErrors, setAlertErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [submittingAlert, setSubmittingAlert] = useState(false);

  // Load compliance alerts from API
  useEffect(() => {
    const loadAlerts = async () => {
      setAlertsLoading(true);
      try {
        const response = await complianceAlertAPI.getAll(1, 3, { 
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

  // Load patients for alert form
  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      try {
        const response = await patientAPI.getAll(1, 100); // Get up to 100 patients
        setPatients(response.patients || []);
      } catch (error) {
        console.error('Error loading patients:', error);
        toast({ title: "Error", description: "Failed to load patients", variant: "destructive" });
      } finally {
        setPatientsLoading(false);
      }
    };
    loadPatients();
  }, []);

  const openAlertModal = () => setIsAlertModalOpen(true);
  const closeAlertModal = () => { setIsAlertModalOpen(false); setAlertErrors({}); };
  const handleAlertChange = (field, value) => {
    setAlertForm(prev => ({ ...prev, [field]: value }));
    if (alertErrors[field]) setAlertErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handlePatientSelect = (patientId) => {
    const selectedPatient = patients.find(p => p._id === patientId);
    setAlertForm(prev => ({ 
      ...prev, 
      patientId: patientId,
      patientName: selectedPatient ? selectedPatient.fullName : ''
    }));
    if (alertErrors.patientId) setAlertErrors(prev => ({ ...prev, patientId: "" }));
  };
  const validateAlert = () => {
    const errs = {};
    if (!alertForm.type) errs.type = "Type is required";
    if (!alertForm.patientId) errs.patientId = "Patient is required";
    if (!alertForm.message.trim()) errs.message = "Message is required";
    if (!alertForm.priority) errs.priority = "Priority is required";
    setAlertErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const submitAlert = async (e) => {
    e.preventDefault();
    if (!validateAlert()) return;
    
    setSubmittingAlert(true);
    try {
      // Find the selected patient
      const selectedPatient = patients.find(p => p._id === alertForm.patientId);
      
      const alertData = {
        type: alertForm.type,
        patientId: alertForm.patientId,
        patientName: selectedPatient ? selectedPatient.fullName : 'Unknown Patient',
        title: `${alertForm.type} Alert`,
        message: alertForm.message.trim(),
        priority: alertForm.priority
      };
      
      await complianceAlertAPI.create(alertData);
      
      // Refresh alerts from API
      const response = await complianceAlertAPI.getAll(1, 3, { 
        status: 'Active',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setAlerts(response.data || []);
      
      toast({ title: "Alert Added", description: "New compliance alert has been created." });
      setAlertForm({ type: "Medication", patientId: "", patientName: "", message: "", priority: "Medium" });
      closeAlertModal();
    } catch (error) {
      console.error('Failed to create compliance alert:', error);
      toast({ 
        title: "Error", 
        description: "Failed to create compliance alert. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingAlert(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "destructive";
      case "Medium": return "warning";
      default: return "muted";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "success";
      case "Follow-up": return "warning";
      case "Completed": return "muted";
      default: return "muted";
    }
  };

  const getAppointmentStatusColor = (status) => {
    switch (status) {
      case "Scheduled": return "default";
      case "Confirmed": return "success";
      case "In Progress": return "warning";
      case "Completed": return "muted";
      case "Cancelled": return "destructive";
      default: return "default";
    }
  };

  const formatAppointmentTime = (date, time) => {
    const appointmentDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffTime = appointmentDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Past";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days`;
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

  // Modal handlers
  const handleNewAppointment = () => setIsAppointmentModalOpen(true);

  // Form submission handlers
  const handleAppointmentSubmit = (appointmentData) => {
    // Add the new appointment to the list
    setAppointments(prev => [appointmentData, ...prev]);
    
    // Extract patient name from populated patient data
    const patientName = appointmentData.patientId?.fullName || appointmentData.patientName || 'Unknown Patient';
    
    toast({
      title: "Appointment Scheduled!",
      description: `Successfully scheduled ${appointmentData.appointmentType} for ${patientName} on ${new Date(appointmentData.date).toLocaleDateString()} at ${appointmentData.time}`,
      variant: "default",
    });
  };

  // Modal close handlers
  const handleAppointmentModalClose = () => setIsAppointmentModalOpen(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Dr. Johnson. Here's your overview.</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-500/25" 
          onClick={handleNewAppointment}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-soft hover:shadow-medical transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className={`text-sm ${stat.color}`}>{stat.change}</p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-primary/10`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients */}
        <Card className="border-0 shadow-soft h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Recent Patients
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/patients">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardTitle>
            <CardDescription>Latest patient interactions and updates</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              {recentPatientsLoading && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              )}
              {!recentPatientsLoading && recentPatients.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">No recent patients.</p>
                </div>
              )}
              {recentPatients.slice(0, 3).map((patient, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{patient.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{patient.condition}</p>
                  </div>
                  <div className="text-right ml-2 flex-shrink-0">
                    <Badge variant="outline" className={`mb-1 text-${getStatusColor(patient.status)}`}>
                      {patient.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{patient.lastVisit}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="border-0 shadow-soft h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-secondary" />
                Upcoming Appointments
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/teleconsultation">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </CardTitle>
            <CardDescription>Your scheduled appointments and meetings</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
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
              {appointments.slice(0, 3).map((appointment, index) => {
                const priority = getAppointmentPriority(appointment.date, appointment.time);
                const timeUntil = formatAppointmentTime(appointment.date, appointment.time);
                const patientName = appointment.patientId?.fullName || appointment.patientName || 'Unknown Patient';
                
                return (
                  <div key={index} className={`p-2 rounded-lg border transition-colors ${
                    priority === 'urgent' ? 'border-red-200 bg-red-50/50' :
                    priority === 'soon' ? 'border-yellow-200 bg-yellow-50/50' :
                    priority === 'past' ? 'border-gray-200 bg-gray-50/50' :
                    'border-border hover:bg-muted/30'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{patientName}</span>
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                          • {appointment.appointmentType || 'Consultation'}
                        </span>
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
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 flex-1">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{new Date(appointment.date).toLocaleDateString()} at {appointment.time}</span>
                        {appointment.location && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <MapPin className="w-3 h-3 flex-shrink-0 hidden sm:inline" />
                            <span className="truncate hidden sm:inline">{appointment.location}</span>
                          </>
                        )}
                      </div>
                      <span className={`text-xs font-medium truncate ml-2 ${
                        priority === 'urgent' ? 'text-red-600' :
                        priority === 'soon' ? 'text-yellow-600' :
                        priority === 'past' ? 'text-gray-500' :
                        'text-muted-foreground'
                      }`}>
                        {timeUntil}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Alerts */}
        <Card className="border-0 shadow-soft h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Compliance Alerts
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/billing">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
                </Button>
                <Button variant="outline" size="sm" onClick={openAlertModal}>Add Alert</Button>
              </div>
            </CardTitle>
            <CardDescription>Important notifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
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
              {alerts.slice(0, 3).map((alert, index) => (
                <div key={alert._id || index} className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground truncate">{alert.type}</span>
                    <Badge variant={getPriorityColor(alert.priority)} className="text-xs flex-shrink-0 ml-2">
                      {alert.priority}
                    </Badge>
                  </div>
                  <p className="font-medium text-foreground mb-1 truncate">{alert.patientName}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={handleAppointmentModalClose}
        onSubmit={handleAppointmentSubmit}
      />

      {/* Add Compliance Alert Modal */}
      <Dialog open={isAlertModalOpen} onOpenChange={closeAlertModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Compliance Alert</DialogTitle>
            <DialogDescription>Create a new alert that will appear in the list.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAlert} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="alert-type">Type</Label>
                <Select value={alertForm.type} onValueChange={(v) => handleAlertChange('type', v)}>
                  <SelectTrigger id="alert-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medication">Medication</SelectItem>
                    <SelectItem value="Appointment">Appointment</SelectItem>
                    <SelectItem value="Lab Results">Lab Results</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
                {alertErrors.type && <p className="text-sm text-red-600">{alertErrors.type}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-priority">Priority</Label>
                <Select value={alertForm.priority} onValueChange={(v) => handleAlertChange('priority', v)}>
                  <SelectTrigger id="alert-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
                {alertErrors.priority && <p className="text-sm text-red-600">{alertErrors.priority}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-patient">Patient</Label>
              <Select value={alertForm.patientId} onValueChange={handlePatientSelect}>
                <SelectTrigger id="alert-patient">
                  <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select a patient"} />
                </SelectTrigger>
                <SelectContent>
                  {patients.length === 0 && !patientsLoading ? (
                    <SelectItem value="" disabled>No patients found</SelectItem>
                  ) : (
                    patients.map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        {patient.fullName} {patient.email ? `(${patient.email})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {alertErrors.patientId && <p className="text-sm text-red-600">{alertErrors.patientId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-message">Message</Label>
              <Textarea id="alert-message" value={alertForm.message} onChange={(e) => handleAlertChange('message', e.target.value)} rows={3} placeholder="Describe the compliance issue..." />
              {alertErrors.message && <p className="text-sm text-red-600">{alertErrors.message}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeAlertModal} disabled={submittingAlert}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700" disabled={submittingAlert}>
                {submittingAlert ? 'Adding Alert...' : 'Add Alert'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
 
    </div>
  );
};

export default Dashboard;
