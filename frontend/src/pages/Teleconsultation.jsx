import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Settings,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import VideoCallModal from "@/components/VideoCallModal";
import { consultationAPI, teleconsultationAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/utils/roleUtils";

const Teleconsultation = () => {
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const isDoctor = currentUser?.role === 'doctor';
  const [upcomingConsultations, setUpcomingConsultations] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [upcomingTeleconsultations, setUpcomingTeleconsultations] = useState([]);
  const [teleconsultationHistory, setTeleconsultationHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teleconsultationLoading, setTeleconsultationLoading] = useState(false);
  const [completingConsultation, setCompletingConsultation] = useState(null);
  const [videoCallModalOpen, setVideoCallModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [selectedTeleconsultation, setSelectedTeleconsultation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('teleconsultation_pageSize');
    return saved ? parseInt(saved) : 10;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
      type: consultation.appointmentType || consultation.type || "Consultation",
      status: consultation.status || "Scheduled",
      mode: consultation.mode || "In-person",
      duration: consultation.duration || "30 min"
    };
  };

  // Format teleconsultation data for display
  const formatTeleconsultationForDisplay = (teleconsultation) => {
    const consultationDate = new Date(teleconsultation.scheduledDate);
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
      id: teleconsultation._id,
      patient: teleconsultation.patientName || (teleconsultation.patientId?.fullName) || "Unknown Patient",
      time: teleconsultation.scheduledTime,
      date: displayDate,
      type: teleconsultation.consultationType || "Teleconsultation",
      status: teleconsultation.status || "Scheduled",
      duration: teleconsultation.duration || "30 min",
      meetingId: teleconsultation.jitsiConfig?.roomName || teleconsultation.meetingId
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

  // Load consultations
  useEffect(() => {
    const loadConsultations = async () => {
      setLoading(true);
      try {
        const response = await consultationAPI.getUpcoming();
        setUpcomingConsultations(response.consultations || []);
        
        const historyResponse = await consultationAPI.getHistory();
        setConsultationHistory(historyResponse.consultations || []);
      } catch (error) {
        console.error('Failed to load consultations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConsultations();
  }, []);

  // Save pageSize to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('teleconsultation_pageSize', pageSize.toString());
  }, [pageSize, isInitialLoad]);

  // Load teleconsultations
  useEffect(() => {
    const loadTeleconsultations = async () => {
      setTeleconsultationLoading(true);
      try {
        const response = await teleconsultationAPI.getUpcoming(currentPage, pageSize);
        setUpcomingTeleconsultations(response.teleconsultations || []);
        
        const historyResponse = await teleconsultationAPI.getHistory(currentPage, pageSize);
        setTeleconsultationHistory(historyResponse.teleconsultations || []);
        
        // Set pagination info from API response
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalCount(response.pagination.totalTeleconsultations || 0);
        } else {
          setTotalPages(1);
          setTotalCount((response.teleconsultations || []).length);
        }
      } catch (error) {
        console.error('Failed to load teleconsultations:', error);
      } finally {
        setTeleconsultationLoading(false);
      }
    };

    loadTeleconsultations();
  }, [currentPage, pageSize]);


  const handleJoinTeleconsultation = (teleconsultation) => {
    let meetingUrl;
    
    if (teleconsultation.doctorMeetingUrl) {
      meetingUrl = teleconsultation.doctorMeetingUrl;
    } else if (teleconsultation.jitsiConfig?.roomName && teleconsultation.jitsiConfig?.moderatorPassword) {
      const roomName = teleconsultation.jitsiConfig.roomName;
      const moderatorPassword = teleconsultation.jitsiConfig.moderatorPassword;
      const doctorName = teleconsultation.doctorName || 'Doctor';
      meetingUrl = `https://meet.jit.si/${roomName}?password=${moderatorPassword}&displayName=${encodeURIComponent(doctorName)}&startWithAudioMuted=false&startWithVideoMuted=false`;
    } else {
      meetingUrl = teleconsultation.meetingUrl;
    }
    
    if (meetingUrl) {
      window.open(meetingUrl, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Meeting URL not available",
        variant: "destructive"
      });
    }
  };

  const handleEndTeleconsultation = async (teleconsultationId) => {
    setCompletingConsultation(teleconsultationId);
    try {
      // First, try to start the teleconsultation if it's not active
      try {
        await teleconsultationAPI.start(teleconsultationId);
      } catch (startError) {
        // If it's already started or active, that's fine, continue to end it
        console.log('Teleconsultation already started or active');
      }
      
      // Now end the teleconsultation
      await teleconsultationAPI.end(teleconsultationId);
      toast({
        title: "Consultation Completed",
        description: "The teleconsultation has been marked as completed.",
      });
      
      // Reload teleconsultations
      const loadTeleconsultations = async () => {
        setTeleconsultationLoading(true);
        try {
          const response = await teleconsultationAPI.getUpcoming(currentPage, pageSize);
          setUpcomingTeleconsultations(response.teleconsultations || []);
          
          const historyResponse = await teleconsultationAPI.getHistory();
          setTeleconsultationHistory(historyResponse.teleconsultations || []);
          
          // Set pagination info
          if (response.pagination) {
            setTotalPages(response.pagination.totalPages || 1);
            setTotalCount(response.pagination.totalCount || 0);
          } else {
            setTotalPages(1);
            setTotalCount((response.teleconsultations || []).length);
          }
        } catch (error) {
          console.error('Failed to load teleconsultations:', error);
        } finally {
          setTeleconsultationLoading(false);
        }
      };

      loadTeleconsultations();
    } catch (error) {
      console.error('Failed to complete teleconsultation:', error);
      const errorMessage = error.message || "Failed to complete the teleconsultation. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCompletingConsultation(null);
    }
  };

  const handleVideoCallClose = () => {
    setVideoCallModalOpen(false);
    setSelectedPatient(null);
    setSelectedConsultation(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search, Stats and Actions - Single Line */}
      <div className="flex items-center justify-between gap-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Search consultations by patient name or type..."
            className="pl-10 h-10 w-full bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <Video className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">
              Scheduled: {upcomingTeleconsultations.length || 0}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">
              Completed: {teleconsultationHistory.length || 0}
            </span>
          </div>
        </div>
        
      </div>

      {/* Consultations List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Consultations</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {(upcomingTeleconsultations.length + upcomingConsultations.length + teleconsultationHistory.length + consultationHistory.length)} Total
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {totalCount > 0 ? `${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount}` : `${upcomingTeleconsultations.length + teleconsultationHistory.length} Total`}
                </span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-md border border-gray-200">
                <span className="text-xs font-medium text-gray-500">Show</span>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  setPageSize(parseInt(value));
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
        </div>
        <div className="p-6">
          {(loading || teleconsultationLoading) ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (upcomingConsultations.length === 0 && upcomingTeleconsultations.length === 0 && teleconsultationHistory.length === 0 && consultationHistory.length === 0) ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">No consultations</h3>
                <p className="text-sm text-muted-foreground">Schedule your first consultation to get started</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Upcoming Teleconsultations */}
              {upcomingTeleconsultations.map((teleconsultation) => {
                const appointment = formatTeleconsultationForDisplay(teleconsultation);
                return (
                  <div key={`tele-${appointment.id}`} className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200 border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
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
                            <span>•</span>
                            <span className="flex items-center">
                              <Video className="w-3 h-3 mr-1" />
                              Teleconsultation
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="default" className="bg-blue-100 text-blue-800">
                              {appointment.type}
                            </Badge>
                            {appointment.meetingId && (
                              <Badge variant="outline" className="text-xs">
                                ID: {appointment.meetingId}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge variant={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        {isDoctor && (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                              onClick={() => handleJoinTeleconsultation(teleconsultation)}
                            >
                              <Video className="w-4 h-4 mr-1" />
                              Join Meeting
                            </Button>
                            {appointment.status !== 'Completed' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEndTeleconsultation(teleconsultation._id);
                                }}
                                disabled={completingConsultation === teleconsultation._id}
                              >
                                {completingConsultation === teleconsultation._id ? (
                                  <>
                                    <Clock className="w-4 h-4 mr-1 animate-spin" />
                                    Completing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Complete
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Completed Teleconsultations */}
              {teleconsultationHistory.length > 0 && (
                <>
                  <div className="pt-4 pb-2">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Completed Teleconsultations
                    </h3>
                  </div>
                  {teleconsultationHistory.map((teleconsultation) => {
                    const appointment = formatTeleconsultationForDisplay(teleconsultation);
                    return (
                      <div key={`tele-history-${appointment.id}`} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-white" />
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
                                <span>•</span>
                                <span className="flex items-center">
                                  <Video className="w-3 h-3 mr-1" />
                                  Teleconsultation
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="default" className="bg-gray-100 text-gray-800">
                                  {appointment.type}
                                </Badge>
                                {appointment.meetingId && (
                                  <Badge variant="outline" className="text-xs">
                                    ID: {appointment.meetingId}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Completed
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation - Only show when multiple pages */}
      {totalPages > 1 && (
        <div className="flex justify-center pb-2">
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {/* Page Numbers */}
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
                    className={`w-8 h-8 p-0 ${currentPage === pageNum ? "bg-blue-600 text-white" : "bg-white border-gray-200 hover:bg-gray-50"} rounded-lg shadow-sm`}
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
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              Last
            </Button>
          </div>
        </div>
      )}
      
      {/* Modals */}
      
      <VideoCallModal
        isOpen={videoCallModalOpen}
        onClose={handleVideoCallClose}
        patient={selectedPatient}
        consultation={selectedConsultation}
        teleconsultation={selectedTeleconsultation}
      />
    </div>
  );
};

export default Teleconsultation;
