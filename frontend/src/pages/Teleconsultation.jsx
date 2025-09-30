import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  Phone,
  MessageCircle,
  FileText,
  Camera,
  Mic,
  Share,
  Plus,
  Settings
} from "lucide-react";
import ScheduleConsultationDialog from "@/components/ScheduleConsultationDialog";
import VideoCallModal from "@/components/VideoCallModal";
import PatientSelectionModal from "@/components/PatientSelectionModal";
import { consultationAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const Teleconsultation = () => {
  const { toast } = useToast();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [upcomingConsultations, setUpcomingConsultations] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completingConsultation, setCompletingConsultation] = useState(null);
  const [videoCallModalOpen, setVideoCallModalOpen] = useState(false);
  const [patientSelectionModalOpen, setPatientSelectionModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);

  // Format consultation data for display
  const formatConsultationForDisplay = (consultation) => {
    const consultationDate = new Date(consultation.date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let displayDate;
    if (consultationDate.toDateString() === today.toDateString()) {
      displayDate = "Today";
    } else if (consultationDate.toDateString() === tomorrow.toDateString()) {
      displayDate = "Tomorrow";
    } else {
      displayDate = consultationDate.toLocaleDateString();
    }

    return {
      id: consultation._id,
      patient: consultation.patientName || (consultation.patientId?.fullName) || "Unknown Patient",
      time: consultation.time,
      date: displayDate,
      type: consultation.consultationType,
      duration: `${consultation.duration} min`,
      status: consultation.status,
      mode: consultation.mode,
      reason: consultation.reason,
      priority: consultation.priority
    };
  };


  const getStatusColor = (status) => {
    switch (status) {
      case "Scheduled": return "success";
      case "Confirmed": return "primary";
      case "Pending": return "warning";
      case "Completed": return "secondary";
      default: return "muted";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "Follow-up": return "secondary";
      case "Consultation": return "primary";
      case "Check-up": return "accent";
      case "Initial Consultation": return "primary";
      default: return "muted";
    }
  };

  // Load upcoming consultations and history
  useEffect(() => {
    loadUpcomingConsultations();
    loadConsultationHistory();
  }, []);

  const loadUpcomingConsultations = async () => {
    try {
      setLoading(true);
      const response = await consultationAPI.getAll(1, 20, { 
        status: 'Scheduled',
        sortBy: 'date',
        sortOrder: 'asc'
      });
      setUpcomingConsultations(response.consultations || []);
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast({
        title: "Error",
        description: "Failed to load upcoming consultations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConsultationHistory = async () => {
    try {
      const response = await consultationAPI.getAll(1, 20, { 
        status: 'Completed',
        sortBy: 'date',
        sortOrder: 'desc'
      });
      setConsultationHistory(response.consultations || []);
    } catch (error) {
      console.error('Error loading consultation history:', error);
    }
  };

  const handleScheduleSuccess = (newConsultation) => {
    // Refresh the consultations list
    loadUpcomingConsultations();
    toast({
      title: "Success",
      description: `Consultation scheduled with ${newConsultation.patientName}`,
    });
  };


  const handleCompleteConsultation = async (consultationId) => {
    try {
      setCompletingConsultation(consultationId);
      
      // Update consultation status to 'Completed' using the status endpoint
      await consultationAPI.updateStatus(consultationId, 'Completed');
      
      // Refresh both lists
      await Promise.all([
        loadUpcomingConsultations(),
        loadConsultationHistory()
      ]);
      
      toast({
        title: "Success",
        description: "Consultation marked as completed",
      });
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete consultation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingConsultation(null);
    }
  };

  const handleStartVideoCall = () => {
    setPatientSelectionModalOpen(true);
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setSelectedConsultation(null); // For instant calls
    setVideoCallModalOpen(true);
  };

  const handleJoinCall = (consultation) => {
    const patient = {
      _id: consultation.patientId?._id || consultation.patientId,
      fullName: consultation.patientName || consultation.patientId?.fullName
    };
    setSelectedPatient(patient);
    setSelectedConsultation(consultation);
    setVideoCallModalOpen(true);
  };

  const handleVideoCallClose = () => {
    setVideoCallModalOpen(false);
    setSelectedPatient(null);
    setSelectedConsultation(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">Manage video consultations, chat, and patient interactions</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card 
          className="border-0 shadow-soft hover:shadow-medical transition-all duration-200 cursor-pointer"
          onClick={handleStartVideoCall}
        >
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Start Video Call</h3>
            <p className="text-sm text-muted-foreground">Begin immediate consultation</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft hover:shadow-medical transition-all duration-200 cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Chat Session</h3>
            <p className="text-sm text-muted-foreground">Text-based consultation</p>
          </CardContent>
        </Card>

      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Appointments</TabsTrigger>
          <TabsTrigger value="history">Consultation History</TabsTrigger>
          <TabsTrigger value="settings">Call Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>Manage your upcoming teleconsultations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary fmx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading consultations...</p>
                  </div>
                ) : upcomingConsultations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">No upcoming consultations</h3>
                    <p className="text-sm text-muted-foreground mb-4">Schedule your first consultation to get started</p>
                  </div>
                ) : (
                  upcomingConsultations.map((consultation) => {
                    const appointment = formatConsultationForDisplay(consultation);
                    return (
                      <div key={appointment.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{appointment.patient}</h3>
                              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                                <span className="flex items-center">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {appointment.time} • {appointment.date}
                                </span>
                                <span>•</span>
                                <span>{appointment.duration}</span>
                                {appointment.mode && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center">
                                      {appointment.mode === 'Video' && <Video className="w-3 h-3 mr-1" />}
                                      {appointment.mode === 'Phone' && <Phone className="w-3 h-3 mr-1" />}
                                      {appointment.mode === 'Chat' && <MessageCircle className="w-3 h-3 mr-1" />}
                                      {appointment.mode === 'In-person' && <User className="w-3 h-3 mr-1" />}
                                      {appointment.mode}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={getTypeColor(appointment.type)}>
                                  {appointment.type}
                                </Badge>
                                {appointment.priority && appointment.priority !== 'Medium' && (
                                  <Badge variant={appointment.priority === 'High' || appointment.priority === 'Urgent' ? 'destructive' : 'secondary'}>
                                    {appointment.priority}
                                  </Badge>
                                )}
                              </div>
                              {appointment.reason && (
                                <p className="text-xs text-muted-foreground mt-1 max-w-md truncate">
                                  {appointment.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <Badge variant={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                            <div className="flex space-x-2">
                              {appointment.mode === 'Chat' ? (
                                <Button variant="outline" size="sm">
                                  <MessageCircle className="w-4 h-4 mr-1" />
                                  Start Chat
                                </Button>
                              ) : appointment.mode === 'Phone' ? (
                                <Button variant="outline" size="sm">
                                  <Phone className="w-4 h-4 mr-1" />
                                  Call
                                </Button>
                              ) : appointment.mode === 'In-person' ? (
                                <Button variant="outline" size="sm">
                                  <User className="w-4 h-4 mr-1" />
                                  Check In
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  className="bg-gradient-primary"
                                  onClick={() => handleJoinCall(consultation)}
                                >
                                  <Video className="w-4 h-4 mr-1" />
                                  Join Call
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCompleteConsultation(appointment.id)}
                                disabled={completingConsultation === appointment.id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                {completingConsultation === appointment.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
                                ) : (
                                  <Clock className="w-4 h-4 mr-1" />
                                )}
                                Complete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Consultation History</CardTitle>
              <CardDescription>Previous teleconsultation sessions and notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {consultationHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-1">No consultation history</h3>
                    <p className="text-sm text-muted-foreground">Completed consultations will appear here</p>
                  </div>
                ) : (
                  consultationHistory.map((consultation) => {
                    const session = formatConsultationForDisplay(consultation);
                    return (
                      <div key={session.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{session.patient}</h3>
                              <div className="flex items-center space-x-3 text-sm text-muted-foreground mb-2">
                                <span>{new Date(consultation.date).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{session.duration}</span>
                                {session.mode && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center">
                                      {session.mode === 'Video' && <Video className="w-3 h-3 mr-1" />}
                                      {session.mode === 'Phone' && <Phone className="w-3 h-3 mr-1" />}
                                      {session.mode === 'Chat' && <MessageCircle className="w-3 h-3 mr-1" />}
                                      {session.mode === 'In-person' && <User className="w-3 h-3 mr-1" />}
                                      {session.mode}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Badge variant={getTypeColor(session.type)}>
                                  {session.type}
                                </Badge>
                                {session.priority && session.priority !== 'Medium' && (
                                  <Badge variant={session.priority === 'High' || session.priority === 'Urgent' ? 'destructive' : 'secondary'}>
                                    {session.priority}
                                  </Badge>
                                )}
                              </div>
                              {session.reason && (
                                <p className="text-sm text-muted-foreground max-w-md">
                                  {session.reason}
                                </p>
                              )}
                              {consultation.providerNotes && (
                                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                                  <strong>Notes:</strong> {consultation.providerNotes}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Audio/Video Settings</CardTitle>
                <CardDescription>Configure your consultation preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <span>Camera</span>
                  </div>
                  <Button variant="outline" size="sm">Test Camera</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Mic className="w-5 h-5 text-muted-foreground" />
                    <span>Microphone</span>
                  </div>
                  <Button variant="outline" size="sm">Test Mic</Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Share className="w-5 h-5 text-muted-foreground" />
                    <span>Screen Sharing</span>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Consultation Preferences</CardTitle>
                <CardDescription>Default settings for teleconsultations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Default Call Duration</span>
                  <span className="text-sm text-muted-foreground">30 minutes</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Auto-Record Sessions</span>
                  <span className="text-sm text-muted-foreground">Enabled</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Waiting Room</span>
                  <span className="text-sm text-muted-foreground">Enabled</span>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Settings className="w-4 h-4 mr-2" />
                  Advanced Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Schedule Consultation Dialog */}
      <ScheduleConsultationDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={handleScheduleSuccess}
      />

      {/* Patient Selection Modal */}
      <PatientSelectionModal
        isOpen={patientSelectionModalOpen}
        onClose={() => setPatientSelectionModalOpen(false)}
        onPatientSelect={handlePatientSelect}
        title="Select Patient for Video Call"
      />

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={videoCallModalOpen}
        onClose={handleVideoCallClose}
        consultation={selectedConsultation}
        patient={selectedPatient}
      />
    </div>
  );
};

export default Teleconsultation;
