import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Pill,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Calendar,
  User,
  FileText,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Stethoscope
} from "lucide-react";
import PrescriptionModal from "@/components/PrescriptionModal";
import { useToast } from "@/hooks/use-toast";
import { prescriptionAPI } from "@/services/api";
import { isClinic, isDoctor } from "@/utils/roleUtils";

const Prescriptions = () => {
  // Set page title immediately
  document.title = "Prescriptions - Smart Healthcare";
  
  const { toast } = useToast();
  
  // State management
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  
  // Modal states
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState(null);
  
  // Expanded prescription state
  const [expandedPrescriptions, setExpandedPrescriptions] = useState(new Set());
  
  // Statistics
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    activePrescriptions: 0,
    completedPrescriptions: 0,
    cancelledPrescriptions: 0
  });

  // Load prescriptions
  useEffect(() => {
    document.title = "Prescriptions - Smart Healthcare";
    loadPrescriptions();
  }, [searchTerm, statusFilter, currentPage]);

  // Load statistics
  useEffect(() => {
    loadStats();
  }, []);

  const loadPrescriptions = async () => {
    setLoading(true);
    setError("");
    try {
      const filters = {};
      if (searchTerm.trim()) filters.search = searchTerm.trim();
      if (statusFilter !== "all") filters.status = statusFilter;

      const response = await prescriptionAPI.getAll(currentPage, pageSize, filters);
      console.log('Prescriptions API response:', response);
      
      // Handle different response structures
      if (response.data) {
        // If the response has a 'data' wrapper
        setPrescriptions(response.data.prescriptions || response.data || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalCount(response.data.pagination?.totalPrescriptions || 0);
      } else {
        // Direct response structure
        setPrescriptions(response.prescriptions || response || []);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalCount(response.pagination?.totalPrescriptions || 0);
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      setError(err.message || 'Failed to load prescriptions');
      setPrescriptions([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await prescriptionAPI.getStats();
      setStats(response);
    } catch (err) {
      console.error('Failed to load prescription stats:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "success";
      case "Completed": return "secondary";
      case "Cancelled": return "destructive";
      default: return "muted";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Active": return <Activity className="w-3 h-3" />;
      case "Completed": return <CheckCircle className="w-3 h-3" />;
      case "Cancelled": return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const handleCreatePrescription = () => {
    setEditingPrescription(null);
    setIsPrescriptionModalOpen(true);
  };

  const handleEditPrescription = (prescription) => {
    setEditingPrescription(prescription);
    setIsPrescriptionModalOpen(true);
  };

  const handlePrescriptionSubmit = async (prescriptionData) => {
    try {
      if (editingPrescription) {
        await prescriptionAPI.update(editingPrescription._id, prescriptionData);
      } else {
        await prescriptionAPI.create(prescriptionData);
      }
      
      loadPrescriptions();
      loadStats();
      setIsPrescriptionModalOpen(false);
      setEditingPrescription(null);
    } catch (error) {
      throw error; // Re-throw to be handled by the modal
    }
  };

  const handleDeletePrescription = async (prescriptionId) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) {
      return;
    }

    try {
      await prescriptionAPI.delete(prescriptionId);
      toast({
        title: "Success",
        description: "Prescription deleted successfully",
      });
      loadPrescriptions();
      loadStats();
    } catch (error) {
      console.error('Error deleting prescription:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete prescription",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (prescriptionId, newStatus) => {
    try {
      await prescriptionAPI.updateStatus(prescriptionId, newStatus);
      toast({
        title: "Success",
        description: "Prescription status updated successfully",
      });
      loadPrescriptions();
      loadStats();
    } catch (error) {
      console.error('Error updating prescription status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update prescription status",
        variant: "destructive",
      });
    }
  };

  const handlePrescriptionModalClose = () => {
    setIsPrescriptionModalOpen(false);
    setEditingPrescription(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatMedications = (medications) => {
    if (!medications || medications.length === 0) return 'No medications';
    return medications.map(med => med.name).join(', ');
  };

  const togglePrescriptionExpansion = (prescriptionId) => {
    const newExpanded = new Set(expandedPrescriptions);
    if (newExpanded.has(prescriptionId)) {
      newExpanded.delete(prescriptionId);
    } else {
      newExpanded.add(prescriptionId);
    }
    setExpandedPrescriptions(newExpanded);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            {isDoctor() ? "Manage your patient prescriptions" : "View and manage all prescriptions"}
          </p>
        </div>
        
        {(isClinic() || isDoctor()) && (
          <Button onClick={handleCreatePrescription} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Prescription
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prescriptions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrescriptions}</div>
            <p className="text-xs text-muted-foreground">All time prescriptions</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activePrescriptions}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completedPrescriptions}</div>
            <p className="text-xs text-muted-foreground">Treatment completed</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelledPrescriptions}</div>
            <p className="text-xs text-muted-foreground">Cancelled prescriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find prescriptions by patient name, prescription number, or medication</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search prescriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions Table */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Prescriptions ({totalCount})</CardTitle>
          <CardDescription>Comprehensive prescription management and tracking</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          
          {!loading && !error && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prescription #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Medications</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Pill className="w-12 h-12 text-muted-foreground" />
                            <p className="text-muted-foreground">No prescriptions found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      prescriptions.map((prescription) => {
                        const isExpanded = expandedPrescriptions.has(prescription._id);
                        return (
                          <React.Fragment key={prescription._id}>
                            <TableRow className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePrescriptionExpansion(prescription._id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </Button>
                                  {prescription.prescriptionNumber}
                                </div>
                              </TableCell>
                              <TableCell onClick={() => togglePrescriptionExpansion(prescription._id)}>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{prescription.patientId?.fullName || 'Unknown Patient'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {prescription.patientId?.age || 0}y • {prescription.patientId?.gender || 'Unknown'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell onClick={() => togglePrescriptionExpansion(prescription._id)}>
                                <div>
                                  <p className="font-medium">{prescription.doctorId?.fullName || 'Unknown Doctor'}</p>
                                  <p className="text-xs text-muted-foreground">{prescription.doctorId?.specialty || 'General'}</p>
                                </div>
                              </TableCell>
                              <TableCell onClick={() => togglePrescriptionExpansion(prescription._id)}>
                                <p className="max-w-xs truncate" title={prescription.diagnosis}>
                                  {prescription.diagnosis}
                                </p>
                              </TableCell>
                              <TableCell onClick={() => togglePrescriptionExpansion(prescription._id)}>
                                <p className="max-w-xs truncate" title={formatMedications(prescription.medications)}>
                                  {formatMedications(prescription.medications)}
                                </p>
                              </TableCell>
                              <TableCell onClick={() => togglePrescriptionExpansion(prescription._id)}>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-sm">{formatDate(prescription.date)}</span>
                                </div>
                              </TableCell>
                              <TableCell onClick={() => togglePrescriptionExpansion(prescription._id)}>
                                <Badge variant={getStatusColor(prescription.status)} className="flex items-center gap-1 w-fit">
                                  {getStatusIcon(prescription.status)}
                                  {prescription.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleEditPrescription(prescription)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleStatusChange(prescription._id, 'Active')}>
                                      <Activity className="mr-2 h-4 w-4" />
                                      Mark Active
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(prescription._id, 'Completed')}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark Completed
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(prescription._id, 'Cancelled')}>
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Cancel
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeletePrescription(prescription._id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                            
                            {/* Expanded Details Row */}
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={8} className="bg-muted/30 p-0">
                                  <div className="p-6 space-y-6">
                                    {/* Detailed Prescription Information */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                      {/* Patient Details */}
                                      <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3">
                                          <CardTitle className="text-sm flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Patient Information
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <p className="text-muted-foreground">Full Name</p>
                                              <p className="font-medium">{prescription.patientId?.fullName || 'N/A'}</p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Age & Gender</p>
                                              <p className="font-medium">{prescription.patientId?.age || 0}y • {prescription.patientId?.gender || 'Unknown'}</p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Phone</p>
                                              <p className="font-medium flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                {prescription.patientId?.phone || 'N/A'}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Email</p>
                                              <p className="font-medium flex items-center gap-1">
                                                <Mail className="w-3 h-3" />
                                                {prescription.patientId?.email || 'N/A'}
                                              </p>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>

                                      {/* Doctor Details */}
                                      <Card className="border-0 shadow-sm">
                                        <CardHeader className="pb-3">
                                          <CardTitle className="text-sm flex items-center gap-2">
                                            <Stethoscope className="w-4 h-4" />
                                            Prescribing Doctor
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div className="grid grid-cols-1 gap-4 text-sm">
                                            <div>
                                              <p className="text-muted-foreground">Doctor Name</p>
                                              <p className="font-medium">{prescription.doctorId?.fullName || 'Unknown Doctor'}</p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Specialty</p>
                                              <p className="font-medium">{prescription.doctorId?.specialty || 'General Medicine'}</p>
                                            </div>
                                            <div>
                                              <p className="text-muted-foreground">Prescription Date</p>
                                              <p className="font-medium flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(prescription.date)}
                                              </p>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>

                                    {/* Diagnosis */}
                                    <Card className="border-0 shadow-sm">
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4" />
                                          Diagnosis
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <p className="text-sm">{prescription.diagnosis || 'No diagnosis provided'}</p>
                                      </CardContent>
                                    </Card>

                                    {/* Medications */}
                                    <Card className="border-0 shadow-sm">
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                          <Pill className="w-4 h-4" />
                                          Prescribed Medications
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        {prescription.medications && prescription.medications.length > 0 ? (
                                          <div className="space-y-3">
                                            {prescription.medications.map((medication, index) => (
                                              <div key={index} className="border rounded-lg p-3 bg-background">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                                                  <div>
                                                    <p className="text-muted-foreground">Medication</p>
                                                    <p className="font-medium">{medication.name}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-muted-foreground">Dosage</p>
                                                    <p className="font-medium">{medication.dosage}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-muted-foreground">Frequency</p>
                                                    <p className="font-medium">{medication.frequency}</p>
                                                  </div>
                                                  <div>
                                                    <p className="text-muted-foreground">Duration</p>
                                                    <p className="font-medium">{medication.duration}</p>
                                                  </div>
                                                </div>
                                                {medication.instructions && (
                                                  <div className="mt-2">
                                                    <p className="text-muted-foreground text-xs">Instructions</p>
                                                    <p className="text-sm">{medication.instructions}</p>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">No medications prescribed</p>
                                        )}
                                      </CardContent>
                                    </Card>

                                    {/* Notes and Follow-up */}
                                    {(prescription.notes || prescription.followUpInstructions) && (
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {prescription.notes && (
                                          <Card className="border-0 shadow-sm">
                                            <CardHeader className="pb-3">
                                              <CardTitle className="text-sm flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Notes
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                              <p className="text-sm">{prescription.notes}</p>
                                            </CardContent>
                                          </Card>
                                        )}
                                        
                                        {prescription.followUpInstructions && (
                                          <Card className="border-0 shadow-sm">
                                            <CardHeader className="pb-3">
                                              <CardTitle className="text-sm flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                Follow-up Instructions
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                              <p className="text-sm">{prescription.followUpInstructions}</p>
                                            </CardContent>
                                          </Card>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      disabled={currentPage === totalPages} 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={handlePrescriptionModalClose}
        onSubmit={handlePrescriptionSubmit}
        prescription={editingPrescription}
      />
    </div>
  );
};

export default Prescriptions;
