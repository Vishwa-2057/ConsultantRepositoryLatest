import { useState } from "react";
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

const Teleconsultation = () => {
  const upcomingAppointments = [
    {
      id: "T001",
      patient: "Emma Thompson",
      time: "10:00 AM",
      date: "Today",
      type: "Follow-up",
      duration: "30 min",
      status: "Scheduled"
    },
    {
      id: "T002", 
      patient: "Michael Chen",
      time: "11:30 AM",
      date: "Today",
      type: "Consultation",
      duration: "45 min",
      status: "Scheduled"
    },
    {
      id: "T003",
      patient: "Sarah Williams", 
      time: "2:00 PM",
      date: "Today",
      type: "Check-up",
      duration: "30 min",
      status: "Confirmed"
    },
    {
      id: "T004",
      patient: "Robert Johnson",
      time: "9:00 AM",
      date: "Tomorrow",
      type: "Consultation",
      duration: "60 min", 
      status: "Pending"
    }
  ];

  const consultationHistory = [
    {
      id: "H001",
      patient: "Lisa Anderson",
      date: "2024-01-14",
      duration: "35 min",
      type: "Follow-up",
      status: "Completed",
      notes: "Patient showed improvement in symptoms"
    },
    {
      id: "H002",
      patient: "David Brown",
      date: "2024-01-13", 
      duration: "50 min",
      type: "Initial Consultation",
      status: "Completed",
      notes: "Prescribed medication, follow-up in 2 weeks"
    },
    {
      id: "H003",
      patient: "Maria Garcia",
      date: "2024-01-12",
      duration: "25 min",
      type: "Check-up",
      status: "Completed",
      notes: "Routine check-up, all parameters normal"
    }
  ];

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teleconsultation</h1>
          <p className="text-muted-foreground">Manage video consultations, chat, and patient interactions</p>
        </div>
        <Button className="bg-gradient-primary shadow-soft">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Consultation
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-soft hover:shadow-medical transition-all duration-200 cursor-pointer">
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

        <Card className="border-0 shadow-soft hover:shadow-medical transition-all duration-200 cursor-pointer">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Schedule Later</h3>
            <p className="text-sm text-muted-foreground">Book future appointment</p>
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
                {upcomingAppointments.map((appointment) => (
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
                          </div>
                          <Badge variant={getTypeColor(appointment.type)} className="mt-1">
                            {appointment.type}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge variant={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Chat
                          </Button>
                          <Button size="sm" className="bg-gradient-primary">
                            <Video className="w-4 h-4 mr-1" />
                            Join Call
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                {consultationHistory.map((session) => (
                  <div key={session.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{session.patient}</h3>
                          <div className="flex items-center space-x-3 text-sm text-muted-foreground mb-2">
                            <span>{session.date}</span>
                            <span>•</span>
                            <span>{session.duration}</span>
                          </div>
                          <Badge variant={getTypeColor(session.type)} className="mb-2">
                            {session.type}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{session.notes}</p>
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
                ))}
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
    </div>
  );
};

export default Teleconsultation;
