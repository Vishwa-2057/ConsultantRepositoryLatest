import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserCheck, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  User,
  Heart,
  FileText,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Stethoscope,
  ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { patientAPI } from "@/services/api";
import PatientModal from "@/components/PatientModal";
import { getImageUrl } from '@/utils/imageUtils';
import vitalsIcon from '@/assets/Images/vitals.png';
import { useAuditLog } from "@/hooks/useAuditLog";
import { isClinic, isDoctor } from "@/utils/roleUtils";
import { Link, useNavigate } from "react-router-dom";
import VitalsHistory from '../components/VitalsHistory';
import AssignDoctorsModal from '../components/AssignDoctorsModal';

const PatientManagement = () => {
  const navigate = useNavigate();
  const { logPageView, logPatientAccess, logSearch } = useAuditLog();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('patientManagement_pageSize');
    return saved ? parseInt(saved) : 5;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  
  
  // Vitals state
  const [isVitalsHistoryOpen, setIsVitalsHistoryOpen] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState(null);
  
  // Assign Doctors state
  const [isAssignDoctorsModalOpen, setIsAssignDoctorsModalOpen] = useState(false);
  const [selectedPatientForDoctors, setSelectedPatientForDoctors] = useState(null);

  const { toast } = useToast();

  // Save pageSize to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('patientManagement_pageSize', pageSize.toString());
  }, [pageSize, isInitialLoad]);

  // Load patients on component mount and when filters change
  useEffect(() => {
    loadPatients();
    // Log page access on mount
    if (currentPage === 1 && !searchTerm) {
      logPageView('PatientManagement', 'PATIENT_DATA');
    }
    // Log search on filter change
    if (searchTerm.trim()) {
      logSearch('PatientManagement', searchTerm.trim());
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, logPageView, logSearch]);

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
      const currentPageSize = pageSize;
      const response = await patientAPI.getAll(currentPage, currentPageSize, filters);
        const list = response.patients || response.data || [];
        const pagination = response.pagination || {};

        const transformedPatients = list.map(patient => {
          // Calculate age from dateOfBirth if age is 0 or not available
          let calculatedAge = patient.age;
          if (!calculatedAge || calculatedAge === 0) {
            if (patient.dateOfBirth) {
              const today = new Date();
              const birthDate = new Date(patient.dateOfBirth);
              calculatedAge = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
              }
            }
          }

          return {
            id: patient._id || patient.id,
            _id: patient._id,
            fullName: patient.fullName,
            name: patient.fullName,
            age: calculatedAge,
            calculatedAge: calculatedAge,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            phone: patient.phone,
            email: patient.email,
            
            // Enhanced patient fields
            uhid: patient.uhid,
            bloodGroup: patient.bloodGroup,
            occupation: patient.occupation,
            profileImage: patient.profileImage,
            
            // Referral information
            referringDoctor: patient.referringDoctor,
            referredClinic: patient.referredClinic,
            
            // Government identification
            governmentId: patient.governmentId,
            idNumber: patient.idNumber,
            governmentDocument: patient.governmentDocument,
            
            // Existing fields
            address: patient.address,
            emergencyContact: patient.emergencyContact,
            insurance: patient.insurance,
            medicalHistory: patient.medicalHistory,
            notes: patient.notes,
            condition: patient.medicalHistory?.conditions?.length > 0 
              ? patient.medicalHistory.conditions[0] 
              : "General Checkup",
            status: patient.status || "Active",
            lastVisit: patient.lastVisit,
            nextAppointment: patient.nextAppointment,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
            assignedDoctors: patient.assignedDoctors || []
          };
        });

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
  const handleNewPatient = () => {
    console.log("Add New Patient button clicked");
    setIsPatientModalOpen(true);
  };




  const handleVitalsHistory = (patient) => {
    setSelectedPatientForVitals(patient);
    setIsVitalsHistoryOpen(true);
  };

  const handleManageDoctors = (patient) => {
    setSelectedPatientForDoctors(patient);
    setIsAssignDoctorsModalOpen(true);
  };

  const handleDoctorAssignmentUpdate = (updatedPatient) => {
    // Update the patient in the local state
    setPatients(prevPatients => 
      prevPatients.map(p => 
        p._id === updatedPatient._id ? updatedPatient : p
      )
    );
  };

  const handleVitalsHistoryClose = () => {
    setIsVitalsHistoryOpen(false);
    setSelectedPatientForVitals(null);
  };

  // Helper functions

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

  // Navigate to patient details
  const handlePatientClick = (patientId) => {
    navigate(`/patients/${patientId}`);
  };


  return (
    <div className="p-6 space-y-6">
      {/* Modern Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 py-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search patients by name or condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-10 text-sm bg-white border-gray-200 rounded-lg shadow-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {isClinic() && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              onClick={handleNewPatient}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Patient
            </Button>
          )}
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Patients</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {totalCount}
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
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            {filteredPatients.map((patient) => {
              const patientId = patient.id || patient._id;
              
              return (
                <div key={patientId} className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-all duration-200 cursor-pointer" onClick={() => handlePatientClick(patientId)}>
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Column 1: Profile Image */}
                    <div className="col-span-1">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {patient.profileImage ? (
                          <img 
                            src={getImageUrl(patient.profileImage)}
                            alt={patient.fullName}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-blue-600 rounded-full flex items-center justify-center ${patient.profileImage ? 'hidden' : ''}`}>
                          <User className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Column 2-3: Name & UHID */}
                    <div className="col-span-2">
                      <h3 className="font-semibold text-foreground truncate text-base mb-1">{patient.fullName || patient.name || 'Unknown Patient'}</h3>
                      {patient.uhid && (
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {patient.uhid}
                        </span>
                      )}
                    </div>
                    
                    {/* Column 4: Age & Gender */}
                    <div className="col-span-1">
                      <div className="text-sm text-muted-foreground">
                        <div>{patient.age || patient.calculatedAge || 0} years</div>
                        <div>{patient.gender || 'Unknown'}</div>
                      </div>
                    </div>
                    
                    {/* Column 5: Blood Group */}
                    <div className="col-span-1">
                      {patient.bloodGroup ? (
                        <span className="text-sm text-red-600 font-medium">{patient.bloodGroup}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                    
                    {/* Column 6: Phone */}
                    <div className="col-span-2">
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        <span>{patient.phone || 'No phone'}</span>
                      </div>
                    </div>
                    
                    {/* Column 7-8: Assigned Doctors */}
                    <div className="col-span-2">
                      {patient.assignedDoctors && patient.assignedDoctors.length > 0 ? (
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <UserCheck className="w-3 h-3" />
                          <span className="truncate">{patient.assignedDoctors.map(doctor => 
                            typeof doctor === 'object' ? doctor.fullName : 'Dr. Assigned'
                          ).join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No doctors</span>
                      )}
                    </div>
                    
                    {/* Column 9-11: Actions */}
                    <div className="col-span-3 flex items-center justify-end space-x-2">
                      <div style={{paddingRight:"50px"}}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVitalsHistory(patient);
                        }}
                        title="View Vitals History"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        Vitals
                      </Button>
                      </div>
                      {isClinic() && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageDoctors(patient);
                          }}
                          title="Manage Assigned Doctors"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Stethoscope className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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


      {/* Patient Modal */}
      <PatientModal
        isOpen={isPatientModalOpen}
        onClose={handlePatientModalClose}
        onSubmit={handlePatientSubmit}
      />



      {/* Vitals History Modal */}
      <VitalsHistory
        isOpen={isVitalsHistoryOpen}
        onClose={handleVitalsHistoryClose}
        patient={selectedPatientForVitals}
      />

      {/* Assign Doctors Modal */}
      <AssignDoctorsModal
        isOpen={isAssignDoctorsModalOpen}
        onClose={() => setIsAssignDoctorsModalOpen(false)}
        patient={selectedPatientForDoctors}
        onUpdate={handleDoctorAssignmentUpdate}
      />
    </div>
  );
};

export default PatientManagement;
