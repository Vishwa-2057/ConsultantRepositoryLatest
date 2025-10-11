import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Utility function to format dates safely
  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      
      // Check if the date has time information (not just 00:00:00)
      const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
      
      if (hasTime) {
        // Format with both date and time
        return date.toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        // Format with just date
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [outboundReferrals, setOutboundReferrals] = useState([]);
  const [inboundReferrals, setInboundReferrals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("outbound");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('referralSystem_pageSize');
    return saved ? parseInt(saved) : 10;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
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
      r.urgency === 'High'
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
      const filters = {};
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }
      
      const response = await referralAPI.getAll(currentPage, pageSize, filters);
      
      // Separate outbound and inbound referrals based on referralType field
      const referrals = response.referrals || [];
      const outbound = referrals.filter(r => r.referralType === 'outbound');
      const inbound = referrals.filter(r => r.referralType === 'inbound');
      
      setOutboundReferrals(outbound);
      setInboundReferrals(inbound);
      
      // Set pagination info
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages || 1);
        setTotalCount(response.pagination.totalCount || 0);
      } else {
        setTotalPages(1);
        setTotalCount(referrals.length);
      }
      
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
      setTotalPages(1);
      setTotalCount(allMockReferrals.length);
    } finally {
      setIsLoading(false);
    }
  };

  // Save pageSize to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('referralSystem_pageSize', pageSize.toString());
  }, [pageSize, isInitialLoad]);

  useEffect(() => {
    fetchReferrals();
  }, [currentPage, pageSize, searchTerm]);

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
    
    // Reload the page to refresh the data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
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

  // Combine both inbound and outbound referrals for unified display
  const filteredReferrals = [
    ...filteredOutbound.map(ref => ({ ...ref, type: 'outbound' })),
    ...filteredInbound.map(ref => ({ ...ref, type: 'inbound' }))
  ].filter(referral => 
    referral.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.specialistName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.externalClinic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.hospital?.toLowerCase().includes(searchTerm.toLowerCase())
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
      
      {/* Search, Stats and Actions - Single Line */}
      <div className="flex items-center justify-between gap-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search referrals by patient name, doctor, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">
              Outbound: {stats.outboundPending || 0}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-100 rounded-full">
              <ArrowLeft className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">
              Inbound: {stats.inboundNew || 0}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-purple-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-sm text-purple-600 font-medium">
              Completed: {stats.completedThisMonth || 0}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-red-100 rounded-full">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-sm text-red-600 font-medium">
              High Priority: {stats.highPriority || 0}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Referral
          </Button>
        </div>
      </div>

      {/* Referrals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Referrals</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {filteredReferrals.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
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
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchTerm ? "No referrals found matching your search." : "No referrals found."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReferrals.map((referral) => {
                const PriorityIcon = getPriorityIcon(referral.urgency);
                const isOutbound = referral.type === 'outbound' || referral.direction === 'outbound';
                return (
                  <div key={referral._id || referral.id} className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isOutbound ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-green-500 to-green-600'
                          }`}>
                            {isOutbound ? (
                              <ArrowRight className="w-6 h-6 text-white" />
                            ) : (
                              <ArrowLeft className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{referral.patientName}</h3>
                            <p className="text-sm text-muted-foreground mb-2">ID: {referral.id}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span><strong>From:</strong> {referral.referringProvider?.name || 'Unknown Provider'}</span>
                              </div>
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
                                <span>{formatDate(referral.preferredDate)}</span>
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
                              onClick={() => handleDownloadReferralPDF(referral, isOutbound ? 'outbound' : 'inbound')}
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
    </div>
  );
};

export default ReferralSystem;
