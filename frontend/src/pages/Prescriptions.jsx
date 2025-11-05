import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Pill,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  FileText,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { prescriptionAPI, pharmacistAPI } from "@/services/api";
import { isClinic, isDoctor, getCurrentUser } from "@/utils/roleUtils";
import PrescriptionModal from "@/components/PrescriptionModal";

const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPrescriptions, setExpandedPrescriptions] = useState(new Set());
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    completedPrescriptions: 0
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewPrescription, setViewPrescription] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('prescriptions_pageSize');
    return saved ? parseInt(saved) : 10;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isAllotModalOpen, setIsAllotModalOpen] = useState(false);
  const [allotPrescription, setAllotPrescription] = useState(null);
  const [pharmacists, setPharmacists] = useState([]);
  const [selectedPharmacist, setSelectedPharmacist] = useState("");

  const { toast } = useToast();

  // Use prescriptions directly since filtering is now done server-side
  const filteredPrescriptions = prescriptions;

  // Load prescriptions
  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      console.log('Loading prescriptions...');
      
      const filters = {};
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }
      
      const response = await prescriptionAPI.getAll(currentPage, pageSize, filters);
      console.log('Prescriptions response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null/undefined');
      
      if (response && response.success) {
        const prescriptionData = response.data || response.prescriptions || [];
        console.log('Setting prescriptions data:', prescriptionData);
        setPrescriptions(prescriptionData);
        calculateStats(prescriptionData);
        
        // Set pagination info
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalCount(response.pagination.totalCount || 0);
        } else {
          setTotalPages(1);
          setTotalCount(prescriptionData.length);
        }
      } else if (response && response.prescriptions && Array.isArray(response.prescriptions)) {
        // Handle the actual API response structure with prescriptions array
        console.log('Using response.prescriptions directly:', response.prescriptions);
        setPrescriptions(response.prescriptions);
        calculateStats(response.prescriptions);
        
        // Set pagination info
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages || 1);
          setTotalCount(response.pagination.totalCount || 0);
        } else {
          setTotalPages(1);
          setTotalCount(response.prescriptions.length);
        }
      } else if (response && response.data && Array.isArray(response.data)) {
        // Handle case where response doesn't have success flag but has data
        console.log('Using response.data directly:', response.data);
        setPrescriptions(response.data);
        calculateStats(response.data);
        setTotalPages(1);
        setTotalCount(response.data.length);
      } else {
        console.log('No valid prescription data found in response');
        console.log('Response structure:', JSON.stringify(response, null, 2));
        // Set empty data - this is likely a missing/unimplemented endpoint
        setPrescriptions([]);
        calculateStats([]);
        setTotalPages(1);
        setTotalCount(0);
        // Don't show error toast for missing service, just log it
        console.warn('Prescription service appears to be unavailable or not implemented');
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      
      // Set empty data for now instead of showing error
      setPrescriptions([]);
      calculateStats([]);
      
      // Only show toast for actual network errors, not missing endpoints
      if (error.message && !error.message.includes('404')) {
        toast({
          title: "Error",
          description: "Unable to connect to prescription service",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (prescriptionData) => {
    const stats = {
      totalPrescriptions: prescriptionData.length,
      completedPrescriptions: prescriptionData.filter(p => 
        p.status === 'completed' || p.status === 'Completed'
      ).length
    };
    setStats(stats);
  };

  // Save pageSize to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('prescriptions_pageSize', pageSize.toString());
  }, [pageSize, isInitialLoad]);

  useEffect(() => {
    loadPrescriptions();
    if (isClinic()) {
      loadPharmacists();
    }
  }, [currentPage, pageSize, searchTerm]);

  const loadPharmacists = async () => {
    try {
      const response = await pharmacistAPI.getAll(1, 100, {}, true);
      if (response.success) {
        setPharmacists(response.data || []);
      }
    } catch (error) {
      console.error('Error loading pharmacists:', error);
    }
  };

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Handle actions
  const handleCreatePrescription = () => {
    setSelectedPrescription(null);
    setIsModalOpen(true);
  };

  const handleViewPrescription = (prescription) => {
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const handlePrescriptionClick = (prescription) => {
    setViewPrescription(prescription);
    setIsViewModalOpen(true);
  };

  const handleEditPrescription = (prescription) => {
    // Prevent editing completed prescriptions
    if (prescription.status === 'Completed' || prescription.status === 'completed') {
      toast({
        title: "Cannot Edit",
        description: "Completed prescriptions cannot be edited",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedPrescription(prescription);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedPrescription(null);
  };

  const handleModalSubmit = async (prescriptionData) => {
    try {
      let response;
      if (selectedPrescription) {
        // Update existing prescription
        console.log('Updating prescription with ID:', selectedPrescription._id);
        console.log('Update data:', prescriptionData);
        response = await prescriptionAPI.update(selectedPrescription._id, prescriptionData);
      } else {
        // Create new prescription
        console.log('Creating new prescription with data:', prescriptionData);
        response = await prescriptionAPI.create(prescriptionData);
      }
      
      console.log('Prescription API response:', response);
      
      // Check if the response indicates success
      if (response && (response.message || response.prescription)) {
        // Close modal and reload prescriptions
        setIsModalOpen(false);
        setSelectedPrescription(null);
        loadPrescriptions();
        
        // Show success toast
        toast({
          title: "Success",
          description: `Prescription ${selectedPrescription ? 'updated' : 'created'} successfully`,
        });
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('Error submitting prescription:', error);
      throw error; // Re-throw to let modal handle the error display
    }
  };

  const handleCompletePrescription = async (prescriptionId) => {
    try {
      const response = await prescriptionAPI.updateStatus(prescriptionId, 'Completed');
      
      if (response && (response.message || response.prescription)) {
        toast({
          title: "Success",
          description: "Prescription marked as completed",
        });
        loadPrescriptions();
      } else {
        toast({
          title: "Error",
          description: "Failed to complete prescription",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error completing prescription:', error);
      toast({
        title: "Error",
        description: "Failed to complete prescription",
        variant: "destructive"
      });
    }
  };

  const handleAllotClick = (prescription, e) => {
    e.stopPropagation();
    setAllotPrescription(prescription);
    setSelectedPharmacist("");
    setIsAllotModalOpen(true);
  };

  const handleAllotSubmit = async () => {
    if (!selectedPharmacist) {
      toast({
        title: "Error",
        description: "Please select a pharmacist",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await prescriptionAPI.allotToPharmacist(allotPrescription._id, selectedPharmacist);
      
      if (response && response.success) {
        toast({
          title: "Success",
          description: "Prescription allotted to pharmacist successfully",
        });
        setIsAllotModalOpen(false);
        setAllotPrescription(null);
        setSelectedPharmacist("");
        loadPrescriptions();
      }
    } catch (error) {
      console.error('Error allotting prescription:', error);
      toast({
        title: "Error",
        description: "Failed to allot prescription",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* Search, Stats and Actions - Single Line */}
      <div className="flex items-center justify-between gap-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search prescriptions by patient, doctor, or medication..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <Pill className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">
              Total: {stats.totalPrescriptions || 0}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">
              Completed: {stats.completedPrescriptions || 0}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3">
          {(isClinic() || isDoctor()) && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              onClick={handleCreatePrescription}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Prescription
            </Button>
          )}
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Prescriptions</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {filteredPrescriptions.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {totalCount > 0 ? `${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, totalCount)} of ${totalCount}` : prescriptions.length > 0 ? `${prescriptions.length} Total` : '0 Total'}
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
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading prescriptions...</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchTerm ? "No prescriptions found matching your search." : "No prescriptions found."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Headers */}
              <div className="bg-gray-100 rounded-lg p-4 mb-2">
                <div className="flex items-center justify-between gap-6">
                  <div className="w-24 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">ID</span>
                  </div>
                  <div className="w-40 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Patient</span>
                  </div>
                  <div className="w-40 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Doctor</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Medications</span>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Date</span>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Status</span>
                  </div>
                  {isClinic() && (
                    <div className="w-24 flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-600 uppercase">Action</span>
                    </div>
                  )}
                </div>
              </div>
              
              {filteredPrescriptions.map((prescription) => (
                <div 
                  key={prescription._id} 
                  className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-all duration-200 cursor-pointer"
                  onClick={() => handlePrescriptionClick(prescription)}
                >
                  <div className="flex items-center justify-between gap-6">
                    {/* Prescription ID - Fixed width */}
                    <div className="w-24 flex-shrink-0">
                      <p className="text-sm font-mono font-semibold text-foreground">
                        #{prescription.prescriptionNumber || prescription._id?.slice(-6)}
                      </p>
                    </div>
                    
                    {/* Patient - Fixed width */}
                    <div className="w-40 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">
                          {prescription.patientId?.fullName || 'Unknown Patient'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Doctor - Fixed width */}
                    <div className="w-40 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground truncate">
                          Dr. {prescription.doctorId?.fullName || 'Unknown Doctor'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Medications - Flexible width */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Pill className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground truncate">
                          {prescription.medications?.length > 0 
                            ? `${prescription.medications[0].name}${prescription.medications.length > 1 ? ` +${prescription.medications.length - 1} more` : ''}`
                            : 'No medications'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {/* Date - Fixed width */}
                    <div className="w-24 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(prescription.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="w-28 flex-shrink-0">
                      <Badge 
                        variant={
                          prescription.status === 'Completed' ? 'success' : 
                          prescription.status === 'Active' ? 'default' : 
                          'destructive'
                        }
                        className={
                          prescription.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                          prescription.status === 'Active' ? 'bg-blue-100 text-blue-700' : 
                          'bg-red-100 text-red-700'
                        }
                      >
                        {prescription.fullyDispensed && prescription.status === 'Completed' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completed
                          </>
                        ) : (
                          prescription.status
                        )}
                      </Badge>
                    </div>

                    {/* Allot Button - Only for clinic */}
                    {isClinic() && prescription.status !== 'Completed' && (
                      <div className="w-24 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleAllotClick(prescription, e)}
                          className="text-xs"
                        >
                          {prescription.allottedPharmacist ? 'Re-allot' : 'Allot'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        prescription={selectedPrescription}
      />

      {/* Allot Pharmacist Modal */}
      <Dialog open={isAllotModalOpen} onOpenChange={setIsAllotModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allot Prescription to Pharmacist</DialogTitle>
            <DialogDescription>
              Select a pharmacist to allot this prescription
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Prescription</Label>
              <p className="text-sm text-gray-600">
                #{allotPrescription?.prescriptionNumber} - {allotPrescription?.patientId?.fullName}
              </p>
            </div>

            <div>
              <Label htmlFor="pharmacist">Select Pharmacist</Label>
              <Select value={selectedPharmacist} onValueChange={setSelectedPharmacist}>
                <SelectTrigger id="pharmacist">
                  <SelectValue placeholder="Choose a pharmacist" />
                </SelectTrigger>
                <SelectContent>
                  {pharmacists.map((pharmacist) => (
                    <SelectItem key={pharmacist._id} value={pharmacist._id}>
                      {pharmacist.fullName} - {pharmacist.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAllotModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAllotSubmit}>
              Allot Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prescription Expanded View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  Prescription #{viewPrescription?.prescriptionNumber || viewPrescription?._id?.slice(-6)}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {viewPrescription?.patientId?.fullName} • {viewPrescription?.diagnosis}
                </p>
              </div>
              <Badge 
                variant={
                  viewPrescription?.status === 'Active' ? 'default' : 
                  viewPrescription?.status === 'Completed' ? 'secondary' : 
                  'destructive'
                } 
                className="ml-auto"
              >
                {viewPrescription?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {viewPrescription && (
            <div className="space-y-6 py-4">
              {/* Patient and Doctor Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                      <p className="text-sm font-medium">{viewPrescription.patientId?.fullName || 'Unknown Patient'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Age & Gender</Label>
                      <p className="text-sm">{viewPrescription.patientId?.age || 'N/A'} years • {viewPrescription.patientId?.gender || 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-sm">{viewPrescription.patientId?.phone || 'Not provided'}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Doctor Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Doctor Name</Label>
                      <p className="text-sm font-medium">Dr. {viewPrescription.doctorId?.fullName || 'Unknown Doctor'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Specialty</Label>
                      <p className="text-sm">{viewPrescription.doctorId?.specialty || 'General Medicine'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-sm">{viewPrescription.doctorId?.phone || 'Not provided'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Prescription Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Prescription Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Prescription Number</Label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">
                        {viewPrescription.prescriptionNumber || viewPrescription._id?.slice(-6)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Date Issued</Label>
                      <p className="text-sm">{new Date(viewPrescription.date || viewPrescription.createdAt).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge 
                        variant={
                          viewPrescription.status === 'Active' ? 'default' : 
                          viewPrescription.status === 'Completed' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {viewPrescription.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Diagnosis</Label>
                    <p className="text-sm bg-muted p-3 rounded-lg">{viewPrescription.diagnosis}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Medications */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Medications ({viewPrescription.medications?.length || 0})
                    {viewPrescription.fullyDispensed && (
                      <Badge variant="success" className="ml-2 bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        All Dispensed
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {viewPrescription.medications?.length > 0 ? (
                    viewPrescription.medications.map((medication, index) => (
                      <div key={index} className={`border rounded-lg p-4 ${
                        medication.dispensed ? 'bg-green-50 border-green-200' : 'bg-muted/50'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-sm font-semibold">{medication.name}</h4>
                          {medication.dispensed ? (
                            <Badge variant="success" className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Dispensed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Dosage</Label>
                            <p className="text-sm">{medication.dosage}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Frequency</Label>
                            <p className="text-sm">{medication.frequency}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                            <p className="text-sm">{medication.duration}</p>
                          </div>
                          {medication.dispensed && medication.dispensedQuantity && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Dispensed Qty</Label>
                              <p className="text-sm font-medium text-green-700">{medication.dispensedQuantity}</p>
                            </div>
                          )}
                        </div>
                        {medication.instructions && (
                          <div className="mt-3">
                            <Label className="text-sm font-medium text-muted-foreground">Instructions</Label>
                            <p className="text-sm text-muted-foreground">{medication.instructions}</p>
                          </div>
                        )}
                        {medication.dispensed && medication.dispensedAt && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <Label className="text-sm font-medium text-muted-foreground">Dispensed On</Label>
                            <p className="text-sm text-green-700">
                              {new Date(medication.dispensedAt).toLocaleString('en-GB')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No medications prescribed</p>
                  )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              {(viewPrescription.notes || viewPrescription.followUpDate || viewPrescription.followUpInstructions) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {viewPrescription.notes && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                        <p className="text-sm bg-muted p-3 rounded-lg">{viewPrescription.notes}</p>
                      </div>
                    )}
                    
                    {viewPrescription.followUpDate && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Follow-up Date</Label>
                        <p className="text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(viewPrescription.followUpDate).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    )}
                    
                    {viewPrescription.followUpInstructions && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Follow-up Instructions</Label>
                        <p className="text-sm bg-muted p-3 rounded-lg">{viewPrescription.followUpInstructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* System Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                      <p className="text-sm">{new Date(viewPrescription.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p className="text-sm">{new Date(viewPrescription.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            {(isClinic() || isDoctor()) && viewPrescription && 
             viewPrescription.status !== 'Completed' && viewPrescription.status !== 'completed' && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEditPrescription(viewPrescription);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Prescription
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Prescriptions;
