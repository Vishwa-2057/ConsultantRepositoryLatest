import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Plus, 
  User, 
  Clock,
  Hospital,
  FileText,
  Phone,
  Calendar,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const ReferralSystem = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const outboundReferrals = [
    {
      id: "OUT001",
      patient: "Emma Thompson",
      referredTo: "Dr. Michael Rodriguez",
      specialty: "Cardiology",
      hospital: "Central Medical Center",
      reason: "Suspected heart murmur",
      date: "2024-01-15",
      status: "Pending",
      priority: "High",
      notes: "Patient experiencing chest pains"
    },
    {
      id: "OUT002", 
      patient: "Robert Johnson",
      referredTo: "Dr. Sarah Kim",
      specialty: "Orthopedics",
      hospital: "City Hospital",
      reason: "Chronic knee pain",
      date: "2024-01-14",
      status: "Scheduled",
      priority: "Medium",
      notes: "MRI results attached"
    },
    {
      id: "OUT003",
      patient: "Maria Garcia",
      referredTo: "Dr. James Wilson",
      specialty: "Dermatology", 
      hospital: "Skin Care Clinic",
      reason: "Suspicious mole",
      date: "2024-01-13",
      status: "Completed",
      priority: "High",
      notes: "Urgent evaluation needed"
    }
  ];

  const inboundReferrals = [
    {
      id: "IN001",
      patient: "David Chen",
      referredBy: "Dr. Lisa Anderson",
      specialty: "General Practice",
      hospital: "Community Health Center",
      reason: "Follow-up care",
      date: "2024-01-16",
      status: "New",
      priority: "Medium",
      notes: "Patient needs ongoing management"
    },
    {
      id: "IN002",
      patient: "Sarah Williams", 
      referredBy: "Dr. Mark Thompson",
      specialty: "Emergency Medicine",
      hospital: "Emergency Department",
      reason: "Post-ER follow-up",
      date: "2024-01-15",
      status: "Scheduled",
      priority: "High",
      notes: "Recent hospital discharge"
    },
    {
      id: "IN003",
      patient: "Michael Brown",
      referredBy: "Dr. Jennifer Lee",
      specialty: "Psychiatry",
      hospital: "Mental Health Center",
      reason: "Primary care coordination",
      date: "2024-01-14",
      status: "In Progress",
      priority: "Low",
      notes: "Medication management needed"
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "warning";
      case "Scheduled": return "primary";
      case "Completed": return "success";
      case "New": return "primary";
      case "In Progress": return "secondary";
      default: return "muted";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "destructive";
      case "Medium": return "warning";
      case "Low": return "success";
      default: return "muted";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "High": return AlertCircle;
      case "Medium": return Clock;
      case "Low": return CheckCircle;
      default: return Clock;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referral System</h1>
          <p className="text-muted-foreground">Manage inbound and outbound patient referrals</p>
        </div>
        <Button className="bg-gradient-primary shadow-soft">
          <Plus className="w-4 h-4 mr-2" />
          Create Referral
        </Button>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search referrals by patient name, doctor, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-2">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-sm text-muted-foreground">Outbound Pending</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center mx-auto mb-2">
              <ArrowLeft className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">8</p>
            <p className="text-sm text-muted-foreground">Inbound New</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">45</p>
            <p className="text-sm text-muted-foreground">Completed This Month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">3</p>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="outbound" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outbound">
            <ArrowRight className="w-4 h-4 mr-2" />
            Outbound Referrals
          </TabsTrigger>
          <TabsTrigger value="inbound">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Inbound Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outbound">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Outbound Referrals</CardTitle>
              <CardDescription>Patients referred to other specialists</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {outboundReferrals.map((referral) => {
                  const PriorityIcon = getPriorityIcon(referral.priority);
                  return (
                    <div key={referral.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{referral.patient}</h3>
                            <p className="text-sm text-muted-foreground mb-2">ID: {referral.id}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                              <div className="flex items-center space-x-2">
                                <Hospital className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.referredTo}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.specialty}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.date}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <PriorityIcon className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.priority} Priority</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-foreground mb-2">
                              <strong>Reason:</strong> {referral.reason}
                            </p>
                            <p className="text-sm text-muted-foreground">{referral.notes}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          <Badge variant={getStatusColor(referral.status)}>
                            {referral.status}
                          </Badge>
                          <Badge variant={getPriorityColor(referral.priority)}>
                            {referral.priority}
                          </Badge>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbound">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Inbound Referrals</CardTitle>
              <CardDescription>Patients referred to your practice</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inboundReferrals.map((referral) => {
                  const PriorityIcon = getPriorityIcon(referral.priority);
                  return (
                    <div key={referral.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{referral.patient}</h3>
                            <p className="text-sm text-muted-foreground mb-2">ID: {referral.id}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                              <div className="flex items-center space-x-2">
                                <Hospital className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.referredBy}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.specialty}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.date}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <PriorityIcon className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.priority} Priority</span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-foreground mb-2">
                              <strong>Reason:</strong> {referral.reason}
                            </p>
                            <p className="text-sm text-muted-foreground">{referral.notes}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          <Badge variant={getStatusColor(referral.status)}>
                            {referral.status}
                          </Badge>
                          <Badge variant={getPriorityColor(referral.priority)}>
                            {referral.priority}
                          </Badge>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              Accept
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Calendar className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralSystem;
