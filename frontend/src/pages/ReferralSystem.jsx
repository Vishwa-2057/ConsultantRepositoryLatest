import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import CreateReferralModal from "@/components/CreateReferralModal";
import { useToast } from "@/hooks/use-toast";
import { referralAPI } from "@/services/api";
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
  AlertCircle,
  Loader2,
  Download
} from "lucide-react";
import { generateReferralPDF } from "@/utils/pdfGenerator";

const ReferralSystem = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [outboundReferrals, setOutboundReferrals] = useState([]);
  const [inboundReferrals, setInboundReferrals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    outboundPending: 0,
    inboundNew: 0,
    completedThisMonth: 0,
    highPriority: 0
  });

  // Calculate statistics from referrals
  const calculateStats = (referrals) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const outboundPending = referrals.filter(r => 
      r.referralType === 'outbound' && r.status === 'Pending'
    ).length;

    const inboundNew = referrals.filter(r => 
      r.referralType === 'inbound' && r.status === 'New'
    ).length;

    const completedThisMonth = referrals.filter(r => {
      if (r.status !== 'Completed') return false;
      const completedDate = new Date(r.updatedAt || r.createdAt);
      return completedDate.getMonth() === currentMonth && 
             completedDate.getFullYear() === currentYear;
    }).length;

    const highPriority = referrals.filter(r => 
      r.urgency === 'High' || r.urgency === 'Urgent'
    ).length;

    return {
      outboundPending,
      inboundNew,
      completedThisMonth,
      highPriority
    };
  };

  // Fetch referrals from API
  const fetchReferrals = async () => {
    try {
      setIsLoading(true);
      const response = await referralAPI.getAll(1, 100);
      
      // Separate outbound and inbound referrals based on referralType field
      const referrals = response.referrals || [];
      const outbound = referrals.filter(r => r.referralType === 'outbound');
      const inbound = referrals.filter(r => r.referralType === 'inbound');
      
      setOutboundReferrals(outbound);
      setInboundReferrals(inbound);
      
      // Calculate and set statistics
      const calculatedStats = calculateStats(referrals);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      // Use mock data as fallback
      setOutboundReferrals(mockOutboundReferrals);
      setInboundReferrals(mockInboundReferrals);
      
      // Calculate stats from mock data
      const allMockReferrals = [...mockOutboundReferrals, ...mockInboundReferrals];
      const mockStats = calculateStats(allMockReferrals);
      setStats(mockStats);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleCreateSuccess = (newReferral) => {
    // Add to appropriate list based on referral type
    if (newReferral.referralType === 'outbound') {
      setOutboundReferrals(prev => [newReferral, ...prev]);
    } else {
      setInboundReferrals(prev => [newReferral, ...prev]);
    }
    
    // Recalculate stats with new referral
    const allReferrals = [
      newReferral,
      ...outboundReferrals,
      ...inboundReferrals
    ];
    const updatedStats = calculateStats(allReferrals);
    setStats(updatedStats);
    
    toast({
      title: "Success",
      description: "Referral created successfully!",
    });
    setIsCreateModalOpen(false);
  };

  const handleCompleteReferral = async (referralId) => {
    try {
      // Update status to completed via API
      await referralAPI.updateStatus(referralId, 'Completed');
      
      // Remove from both lists (since we're filtering out completed ones)
      setOutboundReferrals(prev => prev.filter(r => r._id !== referralId));
      setInboundReferrals(prev => prev.filter(r => r._id !== referralId));
      
      // Recalculate stats
      const allReferrals = [
        ...outboundReferrals.filter(r => r._id !== referralId),
        ...inboundReferrals.filter(r => r._id !== referralId)
      ];
      const updatedStats = calculateStats(allReferrals);
      setStats(updatedStats);
      
      toast({
        title: "Success",
        description: "Referral marked as completed!",
      });
    } catch (error) {
      console.error('Error completing referral:', error);
      toast({
        title: "Error",
        description: "Failed to complete referral. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReferralPDF = (referral, type) => {
    try {
      generateReferralPDF(referral, type);
      toast({
        title: "Success",
        description: "Referral PDF downloaded successfully!",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const mockOutboundReferrals = [
    {
      id: "OUT001",
      patientName: "Emma Thompson",
      specialistName: "Dr. Michael Rodriguez",
      specialty: "Cardiology",
      externalClinic: "Central Medical Center",
      reason: "Suspected heart murmur",
      preferredDate: "2024-01-15",
      status: "Pending",
      urgency: "High",
      notes: "Patient experiencing chest pains",
      referralType: "outbound"
    },
    {
      id: "OUT002", 
      patientName: "Robert Johnson",
      specialistName: "Dr. Sarah Kim",
      specialty: "Orthopedics",
      externalClinic: "City Hospital",
      reason: "Chronic knee pain",
      preferredDate: "2024-01-14",
      status: "Scheduled",
      urgency: "Medium",
      notes: "MRI results attached",
      referralType: "outbound"
    },
    {
      id: "OUT003",
      patientName: "Maria Garcia",
      specialistName: "Dr. James Wilson",
      specialty: "Dermatology", 
      externalClinic: "Skin Care Clinic",
      reason: "Suspicious mole",
      preferredDate: "2024-01-13",
      status: "Completed",
      urgency: "High",
      notes: "Urgent evaluation needed",
      referralType: "outbound"
    }
  ];

  const mockInboundReferrals = [
    {
      id: "IN001",
      patientName: "David Chen",
      specialistName: "Dr. Lisa Anderson",
      specialty: "General Practice",
      hospital: "Community Health Center",
      reason: "Follow-up care",
      preferredDate: "2024-01-16",
      status: "New",
      urgency: "Medium",
      notes: "Patient needs ongoing management",
      referralType: "inbound"
    },
    {
      id: "IN002",
      patientName: "Sarah Williams", 
      specialistName: "Dr. Mark Thompson",
      specialty: "Emergency Medicine",
      hospital: "Emergency Department",
      reason: "Post-ER follow-up",
      preferredDate: "2024-01-15",
      status: "Scheduled",
      urgency: "High",
      notes: "Recent hospital discharge",
      referralType: "inbound"
    },
    {
      id: "IN003",
      patientName: "Michael Brown",
      specialistName: "Dr. Jennifer Lee",
      specialty: "Psychiatry",
      hospital: "Mental Health Center",
      reason: "Primary care coordination",
      preferredDate: "2024-01-14",
      status: "In Progress",
      urgency: "Low",
      notes: "Medication management needed",
      referralType: "inbound"
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

  const getPriorityColor = (urgency) => {
    switch (urgency) {
      case "High": return "destructive";
      case "Medium": return "warning";
      case "Low": return "success";
      default: return "muted";
    }
  };

  const getPriorityIcon = (urgency) => {
    switch (urgency) {
      case "High": return AlertCircle;
      case "Medium": return Clock;
      case "Low": return CheckCircle;
      default: return Clock;
    }
  };

  // Filter referrals based on search term and exclude completed ones
  const filteredOutbound = outboundReferrals.filter(referral => 
    referral.status !== 'Completed' && (
      referral.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.specialistName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.externalClinic?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredInbound = inboundReferrals.filter(referral => 
    referral.status !== 'Completed' && (
      referral.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.specialistName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.hospital?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Create Referral Modal */}
      <CreateReferralModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referral System</h1>
          <p className="text-muted-foreground">Manage inbound and outbound patient referrals</p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-gradient-primary shadow-soft"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Referral
          </Button>
        </div>
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
            <p className="text-2xl font-bold text-foreground">{stats.outboundPending}</p>
            <p className="text-sm text-muted-foreground">Outbound Pending</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center mx-auto mb-2">
              <ArrowLeft className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.inboundNew}</p>
            <p className="text-sm text-muted-foreground">Inbound New</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.completedThisMonth}</p>
            <p className="text-sm text-muted-foreground">Completed This Month</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.highPriority}</p>
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
                {filteredOutbound.map((referral) => {
                  const PriorityIcon = getPriorityIcon(referral.urgency);
                  return (
                    <div key={referral._id || referral.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                            <ArrowRight className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{referral.patientName}</h3>
                            <p className="text-sm text-muted-foreground mb-2">ID: {referral.id}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                              <div className="flex items-center space-x-2">
                                <Hospital className="w-4 h-4 text-muted-foreground" />
                                <span><strong>To:</strong> {referral.specialistName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.specialty}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Hospital className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.externalClinic}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.preferredDate}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <PriorityIcon className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.urgency} Priority</span>
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
                          <Badge variant={getPriorityColor(referral.urgency)}>
                            {referral.urgency}
                          </Badge>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCompleteReferral(referral._id || referral.id)}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadReferralPDF(referral, 'outbound')}
                              title="Download Referral PDF"
                            >
                              <Download className="w-4 h-4" />
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
                {filteredInbound.map((referral) => {
                  const PriorityIcon = getPriorityIcon(referral.urgency);
                  return (
                    <div key={referral._id || referral.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                            <ArrowLeft className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{referral.patientName}</h3>
                            <p className="text-sm text-muted-foreground mb-2">ID: {referral.id}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                              <div className="flex items-center space-x-2">
                                <Hospital className="w-4 h-4 text-muted-foreground" />
                                <span><strong>From:</strong> {referral.specialistName}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.specialty}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Hospital className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.hospital}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.preferredDate}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <PriorityIcon className="w-4 h-4 text-muted-foreground" />
                                <span>{referral.urgency} Priority</span>
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
                          <Badge variant={getPriorityColor(referral.urgency)}>
                            {referral.urgency}
                          </Badge>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCompleteReferral(referral._id || referral.id)}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                            <Button variant="outline" size="sm">
                              Accept
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadReferralPDF(referral, 'inbound')}
                              title="Download Referral PDF"
                            >
                              <Download className="w-4 h-4" />
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
