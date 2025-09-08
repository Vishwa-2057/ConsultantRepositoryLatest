import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  Plus, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  User,
  FileText,
  Download
} from "lucide-react";
import PatientModal from "@/components/PatientModal";
import { useToast } from "@/hooks/use-toast";
import { patientAPI } from "@/services/api";

const PatientManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        const response = await patientAPI.getAll(currentPage, pageSize, filters);
        const list = response.patients || response.data || [];
        const pagination = response.pagination || {};

        const transformedPatients = list.map(patient => ({
          id: patient._id || patient.id,
          name: patient.fullName,
          age: patient.age,
          gender: patient.gender,
          phone: patient.phone,
          email: patient.email,
          address: patient.address?.street ? 
            `${patient.address.street}, ${patient.address.city}, ${patient.address.state} ${patient.address.zipCode}` :
            patient.address || '',
          condition: patient.medicalHistory?.conditions?.length > 0 
            ? patient.medicalHistory.conditions[0] 
            : "General Checkup",
          status: patient.status || "Active",
          lastVisit: patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : "",
          nextAppointment: patient.nextAppointment || ""
        }));

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
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "success";
      case "Follow-up": return "warning";
      case "Completed": return "secondary";
      default: return "muted";
    }
  };

  const filteredPatients = patients; // server-side filtering applied

  // Modal handlers
  const handleNewPatient = () => setIsPatientModalOpen(true);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Management</h1>
          <p className="text-muted-foreground">Manage patient records, onboarding, and information</p>
        </div>
        <Button 
          className="bg-gradient-primary shadow-soft" 
          onClick={handleNewPatient}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Patient
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patients by name, ID, or condition..."
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
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="cards">Card View</TabsTrigger>
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
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{patient.name}</h3>
                          <p className="text-sm text-muted-foreground">ID: {patient.id} • {patient.age} years • {patient.gender}</p>
                          <p className="text-sm text-muted-foreground">{patient.condition}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right hidden md:block">
                          <p className="text-sm text-muted-foreground">Last Visit</p>
                          <p className="text-sm font-medium">{patient.lastVisit}</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-sm text-muted-foreground">Next Appointment</p>
                          <p className="text-sm font-medium">{patient.nextAppointment}</p>
                        </div>
                        <Badge variant={getStatusColor(patient.status)}>
                          {patient.status}
                        </Badge>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon">
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
                <div className="space-x-2">
                  <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</Button>
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
                      <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{patient.name}</CardTitle>
                        <CardDescription>ID: {patient.id}</CardDescription>
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
                      <p className="font-medium">{patient.age}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium">{patient.gender}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Condition</p>
                    <p className="font-medium">{patient.condition}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{patient.address}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Next: {patient.nextAppointment}</span>
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <FileText className="w-4 h-4 mr-1" />
                      Records
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
            <div className="space-x-2">
              <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</Button>
              <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Patient Modal */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={handlePatientModalClose}
        onSubmit={handlePatientSubmit}
      />
    </div>
  );
};

export default PatientManagement;
