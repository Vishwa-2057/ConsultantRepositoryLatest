import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Heart, 
  FileText, 
  Activity, 
  Stethoscope,
  Camera,
  Clock,
  UserCheck,
  AlertTriangle,
  Share2,
  Edit,
  Pill,
  CalendarDays,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Upload,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Download,
  TestTubeDiagonal
} from "lucide-react";
import { patientAPI, prescriptionAPI, appointmentAPI, vitalsAPI, referralAPI, medicalImageAPI } from "@/services/api";
import sessionManager from "@/utils/sessionManager";
import { config } from "@/config/env";
import { toast } from "sonner";
import { canEditPatients } from "@/utils/roleUtils";
import { getImageUrl } from '@/utils/imageUtils';
import EditPatientModal from "@/components/EditPatientModal";

// Utility function to safely format dates
const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'Not specified';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Utility function to safely format date and time
const formatDateTime = (dateString) => {
  if (!dateString) return 'Not specified';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  return `${dateStr} at ${timeStr}`;
};

const PatientDetails = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [caseLogs, setCaseLogs] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [medicalImages, setMedicalImages] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [labReportsLoading, setLabReportsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [caseLogsLoading, setCaseLogsLoading] = useState(false);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [medicalImagesLoading, setMedicalImagesLoading] = useState(false);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedVitals, setExpandedVitals] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isMedicalHistoryModalOpen, setIsMedicalHistoryModalOpen] = useState(false);
  const [medicalHistoryForm, setMedicalHistoryForm] = useState({
    conditions: [],
    allergies: [],
    medications: [],
    surgeries: []
  });
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newSurgery, setNewSurgery] = useState('');
  const [savingMedicalHistory, setSavingMedicalHistory] = useState(false);
  const [selectedLabReport, setSelectedLabReport] = useState(null);
  const [isLabReportModalOpen, setIsLabReportModalOpen] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadPatientDetails();
    }
  }, [patientId]);

  const loadPatientDetails = async () => {
    try {
      setLoading(true);
      const response = await patientAPI.getById(patientId);
      const patientData = response.patient || response;
      
      // Calculate age from dateOfBirth if not available
      if (patientData.dateOfBirth && (!patientData.age || patientData.age === 0)) {
        const today = new Date();
        const birthDate = new Date(patientData.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        patientData.calculatedAge = age;
      }
      
      console.log('Patient API response:', response);
      console.log('Patient data:', patientData);
      console.log('Patient ID from URL:', patientId);
      console.log('Patient _id:', patientData._id);
      console.log('Patient id:', patientData.id);
      setPatient(patientData);
    } catch (error) {
      console.error('Error loading patient details:', error);
      toast.error('Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptions = async () => {
    try {
      setPrescriptionsLoading(true);
      console.log('Loading prescriptions for patient:', patient);
      
      // Use the patient's database _id for prescription lookup
      const patientDbId = patient._id || patient.id;
      console.log('Using patient database ID:', patientDbId);
      
      const response = await prescriptionAPI.getByPatient(patientDbId);
      console.log('Prescriptions API response:', response);
      
      setPrescriptions(response.prescriptions || response.data || response || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setPrescriptionsLoading(false);
    }
  };

  const loadCaseLogs = async () => {
    try {
      setCaseLogsLoading(true);
      const patientDbId = patient._id || patient.id;
      
      // Load data from multiple sources
      const [prescriptionsRes, appointmentsRes, vitalsRes] = await Promise.allSettled([
        prescriptionAPI.getByPatient(patientDbId),
        appointmentAPI.getAll(1, 100, { patientId: patientDbId }),
        vitalsAPI.getByPatient ? vitalsAPI.getByPatient(patientDbId) : Promise.resolve([])
      ]);

      // Process prescriptions
      const prescriptionsData = prescriptionsRes.status === 'fulfilled' 
        ? (prescriptionsRes.value.prescriptions || prescriptionsRes.value.data || prescriptionsRes.value || [])
        : [];

      // Process appointments
      const appointmentsData = appointmentsRes.status === 'fulfilled'
        ? (appointmentsRes.value.appointments || appointmentsRes.value.data || appointmentsRes.value || [])
        : [];

      // Process vitals
      const vitalsData = vitalsRes.status === 'fulfilled'
        ? (vitalsRes.value.vitals || vitalsRes.value.data || vitalsRes.value || [])
        : [];

      // Create timeline entries
      const timelineEntries = [];

      // Add prescription entries
      prescriptionsData.forEach(prescription => {
        timelineEntries.push({
          id: `prescription-${prescription._id}`,
          type: 'prescription',
          title: 'Prescription Created',
          description: prescription.diagnosis || 'Prescription issued',
          doctor: prescription.doctorId?.fullName || 'Unknown Doctor',
          timestamp: prescription.createdAt || prescription.date,
          icon: 'pill',
          color: 'blue',
          details: {
            medications: prescription.medications?.length || 0,
            status: prescription.status
          }
        });
      });

      // Add appointment entries
      appointmentsData.forEach(appointment => {
        timelineEntries.push({
          id: `appointment-${appointment._id}`,
          type: 'appointment',
          title: `${appointment.appointmentType || 'Appointment'} Scheduled`,
          description: `Appointment with Dr. ${appointment.doctorId?.fullName || 'Unknown Doctor'} - ${appointment.status}`,
          doctor: `Scheduled by System`, // Since there's no createdBy field, we indicate it was scheduled
          timestamp: appointment.createdAt || appointment.date, // Use creation time, fallback to appointment date
          icon: 'calendar',
          color: appointment.status === 'Completed' ? 'green' : 
                 appointment.status === 'Cancelled' ? 'red' : 'orange',
          details: {
            appointmentDate: appointment.date,
            appointmentTime: appointment.time,
            duration: appointment.duration,
            location: appointment.location,
            status: appointment.status,
            reason: appointment.reason,
            doctorName: appointment.doctorId?.fullName || 'Unknown Doctor'
          }
        });
      });

      // Add vitals entries
      vitalsData.forEach(vital => {
        timelineEntries.push({
          id: `vital-${vital._id}`,
          type: 'vitals',
          title: 'Vitals Recorded',
          description: 'Patient vitals were recorded and documented',
          doctor: vital.recordedByName || 'Healthcare Staff',
          timestamp: vital.visitDate || vital.createdAt,
          icon: 'activity',
          color: 'purple',
          details: {}
        });
      });

      // Sort by timestamp (newest first)
      timelineEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setCaseLogs(timelineEntries);
    } catch (error) {
      console.error('Error loading case logs:', error);
      toast.error('Failed to load case logs');
    } finally {
      setCaseLogsLoading(false);
    }
  };

  // Load prescriptions when diagnosis tab is accessed
  useEffect(() => {
    if (activeTab === 'diagnosis' && patient && prescriptions.length === 0) {
      loadPrescriptions();
    }
  }, [activeTab, patient]);

  // Load case logs when case-logs tab is accessed
  useEffect(() => {
    if (activeTab === 'case-logs' && patient && caseLogs.length === 0) {
      loadCaseLogs();
    }
  }, [activeTab, patient]);

  const loadReferrals = async () => {
    try {
      setReferralsLoading(true);
      const patientDbId = patient._id || patient.id;
      
      // Get referrals for this patient
      const response = await referralAPI.getAll(1, 100, { patientId: patientDbId });
      console.log('Referrals API response:', response);
      
      setReferrals(response.referrals || response.data || response || []);
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Failed to load referrals');
    } finally {
      setReferralsLoading(false);
    }
  };

  // Load referrals when referrals tab is accessed
  useEffect(() => {
    if (activeTab === 'referrals' && patient && referrals.length === 0) {
      loadReferrals();
    }
  }, [activeTab, patient]);

  const loadMedicalImages = async () => {
    try {
      setMedicalImagesLoading(true);
      const patientDbId = patient._id || patient.id;
      
      const response = await medicalImageAPI.getByPatient(patientDbId);
      console.log('Medical images API response:', response);
      
      setMedicalImages(response.images || response.data || response || []);
    } catch (error) {
      console.error('Error loading medical images:', error);
      toast.error('Failed to load medical images');
    } finally {
      setMedicalImagesLoading(false);
    }
  };

  // Load medical images when gallery tab is accessed
  useEffect(() => {
    if (activeTab === 'gallery' && patient && medicalImages.length === 0) {
      loadMedicalImages();
    }
  }, [activeTab, patient]);

  // Load prescriptions when treatment tab is accessed
  useEffect(() => {
    if (activeTab === 'treatment' && patient && prescriptions.length === 0) {
      loadPrescriptions();
    }
  }, [activeTab, patient]);

  const loadVitals = async () => {
    try {
      setVitalsLoading(true);
      const patientDbId = patient._id || patient.id;
      
      const response = await vitalsAPI.getByPatient(patientDbId);
      console.log('Vitals API response:', response);
      
      setVitals(response.vitals || response.data || response || []);
    } catch (error) {
      console.error('Error loading vitals:', error);
      toast.error('Failed to load vitals');
    } finally {
      setVitalsLoading(false);
    }
  };

  // Load vitals and lab reports when investigations tab is accessed
  useEffect(() => {
    if (activeTab === 'investigations' && patient) {
      if (vitals.length === 0) {
        loadVitals();
      }
      if (labReports.length === 0) {
        loadLabReports();
      }
    }
  }, [activeTab, patient]);

  const loadLabReports = async () => {
    try {
      setLabReportsLoading(true);
      const patientDbId = patient._id || patient.id;
      const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';
      
      console.log('Loading lab reports for patient:', patientDbId);
      console.log('API URL:', `${API_BASE_URL}/lab-reports/patient/${patientDbId}`);
      
      const token = await sessionManager.getToken();
      console.log('Token retrieved:', token ? 'Yes' : 'No');
      
      const response = await fetch(`${API_BASE_URL}/lab-reports/patient/${patientDbId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to load lab reports');
      }
      
      const data = await response.json();
      console.log('Lab reports data:', data);
      console.log('Number of reports:', data.reports?.length || 0);
      console.log('Reports array:', data.reports);
      
      setLabReports(data.reports || []);
      console.log('Lab reports state updated');
    } catch (error) {
      console.error('Error loading lab reports:', error);
      toast.error(`Failed to load lab reports: ${error.message}`);
    } finally {
      setLabReportsLoading(false);
    }
  };

  const toggleVitalExpansion = (vitalId) => {
    setExpandedVitals(prev => ({
      ...prev,
      [vitalId]: !prev[vitalId]
    }));
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setIsImageModalOpen(true);
  };

  const handleDocumentClick = (documentUrl, title, index) => {
    setSelectedDocument({
      url: documentUrl,
      title: title || `Government Document ${index !== undefined ? index + 1 : ''}`,
      type: 'Government Document'
    });
    setIsDocumentModalOpen(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, GIF, WebP, or PDF files.');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size too large. Please upload files smaller than 10MB.');
      return;
    }

    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('patientId', patient._id || patient.id);
      formData.append('imageType', 'Other'); // Default type, can be made configurable
      formData.append('title', file.name);
      formData.append('description', `Medical image uploaded for ${patient.fullName}`);

      const response = await medicalImageAPI.upload(formData);
      
      toast.success('Medical image uploaded successfully!');
      
      // Reload medical images to show the new upload
      await loadMedicalImages();
      
      // Clear the file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Error uploading medical image:', error);
      const errorMessage = error.message && error.message !== '[object Object]' 
        ? error.message 
        : 'Failed to upload medical image. Please check the console for details.';
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditPatient = () => {
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = (updatedPatient) => {
    setPatient(updatedPatient);
    toast.success('Patient information updated successfully!');
    setIsEditModalOpen(false);
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
  };

  const handleOpenMedicalHistory = () => {
    // Initialize form with existing medical history
    if (patient.medicalHistory) {
      setMedicalHistoryForm({
        conditions: patient.medicalHistory.conditions || [],
        allergies: patient.medicalHistory.allergies || [],
        medications: patient.medicalHistory.medications || [],
        surgeries: patient.medicalHistory.surgeries || []
      });
    }
    setIsMedicalHistoryModalOpen(true);
  };

  const handleCloseMedicalHistory = () => {
    setIsMedicalHistoryModalOpen(false);
    setNewCondition('');
    setNewAllergy('');
    setNewMedication('');
    setNewSurgery('');
  };

  const addItem = (type, value, setter) => {
    if (value.trim()) {
      setMedicalHistoryForm(prev => ({
        ...prev,
        [type]: [...prev[type], value.trim()]
      }));
      setter('');
    }
  };

  const removeItem = (type, index) => {
    setMedicalHistoryForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSaveMedicalHistory = async () => {
    try {
      setSavingMedicalHistory(true);
      
      const response = await patientAPI.updateMedicalHistory(patient._id, medicalHistoryForm);
      
      // Update local patient state
      setPatient(prev => ({
        ...prev,
        medicalHistory: medicalHistoryForm
      }));
      
      toast.success('Medical history updated successfully!');
      handleCloseMedicalHistory();
    } catch (error) {
      console.error('Error updating medical history:', error);
      toast.error(error.message || 'Failed to update medical history');
    } finally {
      setSavingMedicalHistory(false);
    }
  };

  const handleViewLabReport = async (report) => {
    try {
      const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';
      const token = await sessionManager.getToken();
      
      const response = await fetch(`${API_BASE_URL}/lab-reports/${report._id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      setSelectedLabReport({
        ...report,
        fileUrl: url
      });
      setIsLabReportModalOpen(true);
    } catch (error) {
      console.error('Error viewing report:', error);
      toast.error('Failed to view report');
    }
  };

  const handleDownloadLabReport = async (report) => {
    try {
      const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';
      const token = await sessionManager.getToken();
      
      const response = await fetch(`${API_BASE_URL}/lab-reports/${report._id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = report.fileName || `${report.testName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };

  const handleCloseLabReportModal = () => {
    if (selectedLabReport?.fileUrl) {
      window.URL.revokeObjectURL(selectedLabReport.fileUrl);
    }
    setSelectedLabReport(null);
    setIsLabReportModalOpen(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/patients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/patients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">Patient not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/patients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Patients
          </Button>
          <div>
            <p className="text-gray-600 mt-1">Comprehensive patient information and medical history</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditPatients() && (
            <Button variant="outline" onClick={handleEditPatient}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Patient
            </Button>
          )}
        </div>
      </div>

      {/* Patient Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {patient.profileImage ? (
                <img 
                  src={getImageUrl(patient.profileImage)}
                  alt={patient.fullName}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-800 to-teal-500 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{patient.fullName || patient.name}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">UHID:</span>
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                    {patient.uhid || 'Not provided'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Age:</span>
                  <span>{patient.age || patient.calculatedAge || 0} years</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Gender:</span>
                  <span>{patient.gender || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Phone:</span>
                  <span>{patient.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">Email:</span>
                  <span>{patient.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className="text-gray-600">Blood Group:</span>
                  <span className="text-red-600 font-medium">{patient.bloodGroup || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">Patient History</TabsTrigger>
          <TabsTrigger value="case-logs">Case Logs</TabsTrigger>
          <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
          <TabsTrigger value="investigations">Investigations</TabsTrigger>
          <TabsTrigger value="treatment">Treatment</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="gallery">Image Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date of Birth:</span>
                    <p className="font-medium">{formatDate(patient.dateOfBirth)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Occupation:</span>
                    <p className="font-medium">{patient.occupation || 'Not provided'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Address:</span>
                    <p className="font-medium">
                      {patient.address && typeof patient.address === 'object' 
                        ? `${patient.address.street || ''}, ${patient.address.city || ''}, ${patient.address.state || ''} ${patient.address.zipCode || ''}`.replace(/^,\s*|,\s*$/, '').replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, '') || 'Address not provided'
                        : patient.address || 'Address not provided'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Emergency Contact:</span>
                    <p className="font-medium">
                      {patient.emergencyContact?.name 
                        ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship || 'Relationship not specified'})`
                        : 'Not provided'
                      }
                    </p>
                    {patient.emergencyContact?.phone && (
                      <p className="text-gray-600 text-xs">{patient.emergencyContact.phone}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">Insurance Provider:</span>
                    <p className="font-medium">{patient.insurance?.provider || 'Not provided'}</p>
                    {patient.insurance?.policyNumber && (
                      <p className="text-gray-600 text-xs">Policy: {patient.insurance.policyNumber}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Medical History
                </div>
                {canEditPatients() && (
                  <Button onClick={handleOpenMedicalHistory} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Medical History
                  </Button>
                )}
              </CardTitle>
              <CardDescription>Complete medical history and timeline</CardDescription>
            </CardHeader>
            <CardContent>
              {patient.medicalHistory && (
                patient.medicalHistory.conditions?.length > 0 ||
                patient.medicalHistory.allergies?.length > 0 ||
                patient.medicalHistory.medications?.length > 0 ||
                patient.medicalHistory.surgeries?.length > 0
              ) ? (
                <div className="space-y-6">
                  {/* Medical Conditions */}
                  {patient.medicalHistory.conditions?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        Medical Conditions
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {patient.medicalHistory.conditions.map((condition, index) => (
                          <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Allergies */}
                  {patient.medicalHistory.allergies?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        Allergies
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {patient.medicalHistory.allergies.map((allergy, index) => (
                          <Badge key={index} variant="destructive" className="bg-red-100 text-red-800">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Current Medications */}
                  {patient.medicalHistory.medications?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-blue-600" />
                        Current Medications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {patient.medicalHistory.medications.map((medication, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            {medication}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Surgeries */}
                  {patient.medicalHistory.surgeries?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-600" />
                        Previous Surgeries
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {patient.medicalHistory.surgeries.map((surgery, index) => (
                          <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                            {surgery}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No medical history recorded</p>
                  <p className="text-sm">Click "Add Medical History" to add patient's medical information</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="case-logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Case Logs
              </CardTitle>
              <CardDescription>Timestamped patient activity timeline</CardDescription>
            </CardHeader>
            <CardContent>
              {caseLogsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : caseLogs.length > 0 ? (
                <div className="space-y-2">
                  {caseLogs.map((log, index) => {
                    const IconComponent = log.icon === 'pill' ? Pill : 
                                        log.icon === 'calendar' ? CalendarDays : 
                                        log.icon === 'activity' ? Activity : FileText;
                    
                    const colorClasses = {
                      blue: 'bg-blue-100 text-blue-600',
                      green: 'bg-green-100 text-green-600',
                      orange: 'bg-orange-100 text-orange-600',
                      red: 'bg-red-100 text-red-600',
                      purple: 'bg-purple-100 text-purple-600'
                    };

                    // Build additional details string
                    const additionalDetails = [];
                    if (log.details.medications > 0) additionalDetails.push(`${log.details.medications} meds`);
                    if (log.details.duration) additionalDetails.push(`${log.details.duration}min`);
                    if (log.details.location) additionalDetails.push(log.details.location);
                    if (log.details.reason) additionalDetails.push(log.details.reason);
                    
                    const detailsText = additionalDetails.length > 0 ? ` • ${additionalDetails.join(' • ')}` : '';

                    return (
                      <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 text-sm">
                        {/* Timeline Icon */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClasses[log.color] || colorClasses.blue}`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        
                        {/* Date & Time */}
                        <div className="flex-shrink-0 w-24 text-xs text-gray-500">
                          <div>{formatDate(log.timestamp)}</div>
                          <div>
                            {log.timestamp && !isNaN(new Date(log.timestamp)) 
                              ? new Date(log.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true})
                              : 'No time'
                            }
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-900">{log.title}</span>
                          <span className="text-gray-600 ml-2">- {log.description}</span>
                          <span className="text-gray-500 ml-2">by {log.doctor}</span>
                          {detailsText && <span className="text-gray-400 ml-1">{detailsText}</span>}
                        </div>
                        
                        {/* Status Badge */}
                        {log.details.status && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {log.details.status}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No case logs found</p>
                  <p className="text-sm">Patient activities will appear here as they occur</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnosis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Diagnosis History
              </CardTitle>
              <CardDescription>Diagnoses from prescriptions and medical records</CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : prescriptions.length > 0 ? (
                <div className="space-y-4">
                  {prescriptions
                    .filter(prescription => prescription.diagnosis && prescription.diagnosis.trim())
                    .map((prescription, index) => (
                      <div key={prescription._id || index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                              <span className="font-medium text-gray-900">Diagnosis</span>
                            </div>
                            <p className="text-gray-800 bg-orange-50 p-3 rounded-md border-l-4 border-orange-200">
                              {prescription.diagnosis}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>Dr. {prescription.doctorId?.fullName || prescription.doctorName || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {formatDate(prescription.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {prescriptions.filter(prescription => prescription.diagnosis && prescription.diagnosis.trim()).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No diagnoses found in prescriptions</p>
                      <p className="text-xs text-gray-400">Diagnoses will appear here when included in prescriptions</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No prescriptions found</p>
                  <p className="text-xs text-gray-400">Diagnoses from prescriptions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investigations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Investigations & Vitals
              </CardTitle>
              <CardDescription>Vital signs, lab results, and medical investigations</CardDescription>
            </CardHeader>
            <CardContent>
              {vitalsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : vitals.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Vital Signs History
                    </h3>
                    <div className="space-y-4">
                      {vitals.map((vital, index) => {
                        const vitalId = vital._id || `vital-${index}`;
                        const isExpanded = expandedVitals[vitalId];
                        
                        return (
                          <div key={vitalId} className="border rounded-lg overflow-hidden">
                            <div 
                              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleVitalExpansion(vitalId)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">
                                      Vitals Record #{index + 1}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {vital.recordedAt ? new Date(vital.recordedAt).toLocaleDateString() : 
                                       vital.createdAt ? new Date(vital.createdAt).toLocaleDateString() : 'Date not specified'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-sm text-gray-500">
                                    {vital.recordedAt ? new Date(vital.recordedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                                     vital.createdAt ? new Date(vital.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Time not specified'}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {/* Quick preview of key vitals */}
                                    {!isExpanded && (
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        {vital.bloodPressure && (
                                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                                            BP: {vital.bloodPressure}
                                          </span>
                                        )}
                                        {vital.heartRate && (
                                          <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded">
                                            HR: {vital.heartRate}
                                          </span>
                                        )}
                                        {vital.temperature && (
                                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                            Temp: {vital.temperature}°F
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {isExpanded ? (
                                      <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-6 pb-6 space-y-6 bg-gray-50"
                                   onClick={(e) => e.stopPropagation()}
                              >
                                {/* Vital Signs Section */}
                                <div>
                                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Vital Signs
                                  </h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Blood Pressure */}
                                    {(vital.vitalSigns?.bloodPressure?.systolic || vital.bloodPressure) && (
                                      <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Heart className="w-4 h-4 text-red-600" />
                                          <span className="text-sm font-medium text-red-900">Blood Pressure</span>
                                        </div>
                                        <p className="text-lg font-bold text-red-800">
                                          {vital.vitalSigns?.bloodPressure?.systolic && vital.vitalSigns?.bloodPressure?.diastolic 
                                            ? `${vital.vitalSigns.bloodPressure.systolic}/${vital.vitalSigns.bloodPressure.diastolic}`
                                            : vital.bloodPressure}
                                        </p>
                                        <p className="text-xs text-red-600">
                                          {vital.vitalSigns?.bloodPressure?.unit || 'mmHg'}
                                        </p>
                                      </div>
                                    )}

                                    {/* Heart Rate */}
                                    {(vital.vitalSigns?.heartRate?.value || vital.heartRate) && (
                                      <div className="bg-pink-50 p-4 rounded-lg border-l-4 border-pink-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Activity className="w-4 h-4 text-pink-600" />
                                          <span className="text-sm font-medium text-pink-900">Heart Rate</span>
                                        </div>
                                        <p className="text-lg font-bold text-pink-800">
                                          {vital.vitalSigns?.heartRate?.value || vital.heartRate}
                                        </p>
                                        <p className="text-xs text-pink-600">
                                          {vital.vitalSigns?.heartRate?.unit || 'bpm'}
                                        </p>
                                      </div>
                                    )}

                                    {/* Temperature */}
                                    {(vital.vitalSigns?.temperature?.value || vital.temperature) && (
                                      <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <FileText className="w-4 h-4 text-orange-600" />
                                          <span className="text-sm font-medium text-orange-900">Temperature</span>
                                        </div>
                                        <p className="text-lg font-bold text-orange-800">
                                          {vital.vitalSigns?.temperature?.value || vital.temperature}
                                        </p>
                                        <p className="text-xs text-orange-600">
                                          {vital.vitalSigns?.temperature?.unit || '°C'}
                                        </p>
                                      </div>
                                    )}

                                    {/* Weight */}
                                    {(vital.vitalSigns?.weight?.value || vital.weight) && (
                                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <UserCheck className="w-4 h-4 text-blue-600" />
                                          <span className="text-sm font-medium text-blue-900">Weight</span>
                                        </div>
                                        <p className="text-lg font-bold text-blue-800">
                                          {vital.vitalSigns?.weight?.value || vital.weight}
                                        </p>
                                        <p className="text-xs text-blue-600">
                                          {vital.vitalSigns?.weight?.unit || 'kg'}
                                        </p>
                                      </div>
                                    )}

                                    {/* Height */}
                                    {(vital.vitalSigns?.height?.value || vital.height) && (
                                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <User className="w-4 h-4 text-green-600" />
                                          <span className="text-sm font-medium text-green-900">Height</span>
                                        </div>
                                        <p className="text-lg font-bold text-green-800">
                                          {vital.vitalSigns?.height?.value || vital.height}
                                        </p>
                                        <p className="text-xs text-green-600">
                                          {vital.vitalSigns?.height?.unit || 'cm'}
                                        </p>
                                      </div>
                                    )}

                                    {/* Respiratory Rate */}
                                    {(vital.vitalSigns?.respiratoryRate?.value || vital.respiratoryRate) && (
                                      <div className="bg-teal-50 p-4 rounded-lg border-l-4 border-teal-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Activity className="w-4 h-4 text-teal-600" />
                                          <span className="text-sm font-medium text-teal-900">Respiratory Rate</span>
                                        </div>
                                        <p className="text-lg font-bold text-teal-800">
                                          {vital.vitalSigns?.respiratoryRate?.value || vital.respiratoryRate}
                                        </p>
                                        <p className="text-xs text-teal-600">
                                          {vital.vitalSigns?.respiratoryRate?.unit || 'breaths/min'}
                                        </p>
                                      </div>
                                    )}

                                    {/* Oxygen Saturation */}
                                    {(vital.vitalSigns?.oxygenSaturation?.value || vital.oxygenSaturation) && (
                                      <div className="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Heart className="w-4 h-4 text-indigo-600" />
                                          <span className="text-sm font-medium text-indigo-900">Oxygen Saturation</span>
                                        </div>
                                        <p className="text-lg font-bold text-indigo-800">
                                          {vital.vitalSigns?.oxygenSaturation?.value || vital.oxygenSaturation}
                                        </p>
                                        <p className="text-xs text-indigo-600">
                                          {vital.vitalSigns?.oxygenSaturation?.unit || '%'}
                                        </p>
                                      </div>
                                    )}

                                    {/* BMI */}
                                    {(vital.vitalSigns?.bmi?.value || vital.bmi) && (
                                      <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                                        <div className="flex items-center gap-2 mb-1">
                                          <UserCheck className="w-4 h-4 text-purple-600" />
                                          <span className="text-sm font-medium text-purple-900">BMI</span>
                                        </div>
                                        <p className="text-lg font-bold text-purple-800">
                                          {vital.vitalSigns?.bmi?.value || vital.bmi}
                                        </p>
                                        <p className="text-xs text-purple-600">kg/m²</p>
                                        {vital.vitalSigns?.bmi?.category && (
                                          <p className="text-xs text-purple-700 font-medium mt-1">
                                            {vital.vitalSigns.bmi.category}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Clinical Notes Section */}
                                {vital.clinicalNotes && (
                                  <div className="space-y-4">
                                    <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                                      <FileText className="w-4 h-4" />
                                      Clinical Information
                                    </h5>

                                    {/* Chief Complaint */}
                                    {vital.clinicalNotes.chiefComplaint?.complaint && (
                                      <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                                        <h6 className="font-medium text-yellow-900 mb-2">Chief Complaint</h6>
                                        <p className="text-yellow-800">{vital.clinicalNotes.chiefComplaint.complaint}</p>
                                        {vital.clinicalNotes.chiefComplaint.duration && (
                                          <p className="text-yellow-700 text-sm mt-1">Duration: {vital.clinicalNotes.chiefComplaint.duration}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Allergies */}
                                    {(vital.clinicalNotes.allergies?.drug?.length > 0 || 
                                      vital.clinicalNotes.allergies?.food?.length > 0 || 
                                      vital.clinicalNotes.allergies?.environment?.length > 0) && (
                                      <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                                        <h6 className="font-medium text-red-900 mb-2">Allergies</h6>
                                        <div className="space-y-2">
                                          {vital.clinicalNotes.allergies.drug?.length > 0 && (
                                            <div>
                                              <span className="text-red-800 font-medium text-sm">Drug: </span>
                                              <span className="text-red-700">{vital.clinicalNotes.allergies.drug.join(', ')}</span>
                                            </div>
                                          )}
                                          {vital.clinicalNotes.allergies.food?.length > 0 && (
                                            <div>
                                              <span className="text-red-800 font-medium text-sm">Food: </span>
                                              <span className="text-red-700">{vital.clinicalNotes.allergies.food.join(', ')}</span>
                                            </div>
                                          )}
                                          {vital.clinicalNotes.allergies.environment?.length > 0 && (
                                            <div>
                                              <span className="text-red-800 font-medium text-sm">Environmental: </span>
                                              <span className="text-red-700">{vital.clinicalNotes.allergies.environment.join(', ')}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Current Medications */}
                                    {vital.clinicalNotes.currentMedications?.length > 0 && (
                                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                                        <h6 className="font-medium text-blue-900 mb-2">Current Medications</h6>
                                        <div className="space-y-2">
                                          {vital.clinicalNotes.currentMedications.map((med, index) => (
                                            <div key={index} className="text-blue-800">
                                              <span className="font-medium">{med.name}</span>
                                              {med.dosage && <span className="text-blue-700"> - {med.dosage}</span>}
                                              {med.frequency && <span className="text-blue-600"> ({med.frequency})</span>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Medical History */}
                                    {vital.clinicalNotes.pastMedicalHistory?.chronicIllnesses?.length > 0 && (
                                      <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
                                        <h6 className="font-medium text-gray-900 mb-2">Chronic Illnesses</h6>
                                        <p className="text-gray-700">{vital.clinicalNotes.pastMedicalHistory.chronicIllnesses.join(', ')}</p>
                                      </div>
                                    )}

                                    {/* Family History */}
                                    {vital.clinicalNotes.familyMedicalHistory && (
                                      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                                        <h6 className="font-medium text-green-900 mb-2">Family Medical History</h6>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          {vital.clinicalNotes.familyMedicalHistory.diabetes && (
                                            <span className="text-green-700">✓ Diabetes</span>
                                          )}
                                          {vital.clinicalNotes.familyMedicalHistory.hypertension && (
                                            <span className="text-green-700">✓ Hypertension</span>
                                          )}
                                          {vital.clinicalNotes.familyMedicalHistory.heartDisease && (
                                            <span className="text-green-700">✓ Heart Disease</span>
                                          )}
                                          {vital.clinicalNotes.familyMedicalHistory.cancer && (
                                            <span className="text-green-700">✓ Cancer</span>
                                          )}
                                        </div>
                                        {vital.clinicalNotes.familyMedicalHistory.other?.length > 0 && (
                                          <p className="text-green-700 mt-2">Other: {vital.clinicalNotes.familyMedicalHistory.other.join(', ')}</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Nurse Observations */}
                                    {(vital.clinicalNotes.nurseObservations?.generalAppearance || 
                                      vital.clinicalNotes.nurseObservations?.specialRemarks ||
                                      vital.clinicalNotes.nurseObservations?.additionalNotes) && (
                                      <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                                        <h6 className="font-medium text-purple-900 mb-2">Nurse Observations</h6>
                                        <div className="space-y-2">
                                          {vital.clinicalNotes.nurseObservations.generalAppearance && (
                                            <div>
                                              <span className="text-purple-800 font-medium text-sm">General Appearance: </span>
                                              <span className="text-purple-700">{vital.clinicalNotes.nurseObservations.generalAppearance}</span>
                                            </div>
                                          )}
                                          {vital.clinicalNotes.nurseObservations.specialRemarks && (
                                            <div>
                                              <span className="text-purple-800 font-medium text-sm">Special Remarks: </span>
                                              <span className="text-purple-700">{vital.clinicalNotes.nurseObservations.specialRemarks}</span>
                                            </div>
                                          )}
                                          {vital.clinicalNotes.nurseObservations.additionalNotes && (
                                            <div>
                                              <span className="text-purple-800 font-medium text-sm">Additional Notes: </span>
                                              <span className="text-purple-700">{vital.clinicalNotes.nurseObservations.additionalNotes}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Record Information */}
                                <div className="bg-white p-4 rounded-lg border">
                                  <h6 className="font-medium text-gray-900 mb-2">Record Information</h6>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-600">Status: </span>
                                      <span className={`font-medium ${
                                        vital.status === 'Completed' ? 'text-green-600' :
                                        vital.status === 'Reviewed' ? 'text-blue-600' : 'text-yellow-600'
                                      }`}>
                                        {vital.status || 'Draft'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Type: </span>
                                      <span className="font-medium">
                                        {vital.isPreConsultation ? 'Pre-Consultation' : 'Post-Consultation'}
                                      </span>
                                    </div>
                                    {vital.uhid && (
                                      <div>
                                        <span className="text-gray-600">UHID: </span>
                                        <span className="font-medium font-mono">{vital.uhid}</span>
                                      </div>
                                    )}
                                    {vital.visitDate && (
                                      <div>
                                        <span className="text-gray-600">Visit Date: </span>
                                        <span className="font-medium">{new Date(vital.visitDate).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {vital.notes && (
                                  <div className="bg-gray-50 p-3 rounded-md">
                                    <h5 className="font-medium text-gray-900 mb-1">Notes</h5>
                                    <p className="text-gray-700 text-sm">{vital.notes}</p>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4" />
                                      <span>{vital.recordedBy?.fullName ? `Dr. ${vital.recordedBy.fullName}` : 'Healthcare Staff'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Lab Reports Section - Always visible */}
              <div className={vitals.length > 0 ? "border-t pt-6" : ""}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TestTubeDiagonal className="w-5 h-5" />
                  Lab Reports & Tests
                </h3>
                {console.log('Rendering lab reports section. Loading:', labReportsLoading, 'Reports count:', labReports.length, 'Reports:', labReports)}
                {labReportsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : labReports.length > 0 ? (
                  <div className="space-y-4">
                    {labReports.map((report, index) => (
                      <div key={report._id || index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{report.testName}</h4>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Test Date: {new Date(report.testDate).toLocaleDateString('en-GB')}</span>
                                </div>
                                {report.labName && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>{report.labName}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Uploaded: {new Date(report.uploadedAt).toLocaleDateString('en-GB')}</span>
                                </div>
                              </div>
                              {report.notes && (
                                <div className="mt-2 text-sm text-gray-700 bg-blue-50 p-2 rounded">
                                  <span className="font-medium">Notes: </span>{report.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewLabReport(report)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadLabReport(report)}
                              className="flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <TestTubeDiagonal className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No lab reports found</p>
                    <p className="text-xs text-gray-400">Lab reports will appear here when uploaded</p>
                  </div>
                )}
              </div>

              {/* Empty state when no vitals and no lab reports */}
              {vitals.length === 0 && labReports.length === 0 && !vitalsLoading && !labReportsLoading && (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No investigations found</p>
                  <p className="text-sm">Patient vitals and investigation results will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Treatment History
              </CardTitle>
              <CardDescription>Medications, prescriptions, and treatment plans</CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : prescriptions.length > 0 ? (
                <div className="space-y-6">
                  {prescriptions.map((prescription, index) => (
                    <div key={prescription._id || index} className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Pill className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Treatment #{prescription.prescriptionNumber || `T${index + 1}`}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatDate(prescription.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={prescription.status === 'Active' ? 'default' : 'secondary'}>
                            {prescription.status || 'Active'}
                          </Badge>
                        </div>
                      </div>

                      {prescription.diagnosis && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <h4 className="font-medium text-blue-900 mb-1">Diagnosis</h4>
                          <p className="text-blue-800 text-sm">{prescription.diagnosis}</p>
                        </div>
                      )}

                      {prescription.medications && prescription.medications.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Pill className="w-4 h-4" />
                            Prescribed Medications ({prescription.medications.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {prescription.medications.map((medication, medIndex) => (
                              <div key={medIndex} className="bg-gray-50 rounded-lg p-4 border-l-4 border-green-400">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-medium text-gray-900">
                                    {medication.name || medication.medication}
                                  </h5>
                                  <span className="text-sm font-medium text-green-600">
                                    {medication.dosage}
                                  </span>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {medication.frequency}
                                    </span>
                                    {medication.duration && (
                                      <span className="flex items-center gap-1">
                                        <CalendarDays className="w-3 h-3" />
                                        {medication.duration}
                                      </span>
                                    )}
                                  </div>
                                  {medication.instructions && (
                                    <p className="text-xs text-gray-700 italic mt-2 bg-white p-2 rounded">
                                      <strong>Instructions:</strong> {medication.instructions}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>Dr. {prescription.doctorId?.fullName || prescription.doctorName || 'Unknown'}</span>
                          </div>
                          {prescription.followUpDate && (
                            <div className="flex items-center gap-1">
                              <CalendarDays className="w-4 h-4" />
                              <span>Follow-up: {formatDate(prescription.followUpDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {prescription.notes && (
                        <div className="bg-yellow-50 p-3 rounded-md">
                          <h4 className="font-medium text-yellow-900 mb-1">Treatment Notes</h4>
                          <p className="text-yellow-800 text-sm">{prescription.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No treatment history found</p>
                  <p className="text-sm">Patient prescriptions and treatments will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Referrals
              </CardTitle>
              <CardDescription>Referrals to specialists and other healthcare providers</CardDescription>
            </CardHeader>
            <CardContent>
              {referralsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : referrals.length > 0 ? (
                <div className="space-y-4">
                  {referrals.map((referral, index) => {
                    const statusIcon = referral.status === 'Completed' ? CheckCircle :
                                     referral.status === 'Cancelled' ? XCircle :
                                     referral.status === 'Pending' ? AlertCircle : Share2;
                    
                    const statusColor = referral.status === 'Completed' ? 'text-green-600' :
                                      referral.status === 'Cancelled' ? 'text-red-600' :
                                      referral.status === 'Pending' ? 'text-yellow-600' : 'text-blue-600';

                    const StatusIcon = statusIcon;

                    return (
                      <div key={referral._id || index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                              <span className="font-medium text-gray-900">
                                {referral.referralType || 'Specialist Referral'}
                              </span>
                              <Badge variant="outline" className={statusColor}>
                                {referral.status || 'Active'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                              <div>
                                <span className="text-gray-600">Referred To:</span>
                                <p className="font-medium">
                                  {referral.referredTo?.name || referral.specialistName || 'Specialist'}
                                </p>
                                {referral.referredTo?.specialty && (
                                  <p className="text-gray-500 text-xs">{referral.referredTo.specialty}</p>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-600">Referring Doctor:</span>
                                <p className="font-medium">
                                  Dr. {referral.referringProvider?.name || referral.referringDoctor?.fullName || referral.doctorName || 'Unknown'}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">Date & Time:</span>
                                <p className="font-medium">
                                  {formatDateTime(referral.createdAt)}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">Priority:</span>
                                <p className={`font-medium ${
                                  referral.priority === 'urgent' ? 'text-red-600' :
                                  referral.priority === 'high' ? 'text-orange-600' : 'text-gray-900'
                                }`}>
                                  {referral.priority ? referral.priority.charAt(0).toUpperCase() + referral.priority.slice(1) : 'Normal'}
                                </p>
                              </div>
                            </div>

                            {referral.reason && (
                              <div className="mb-3">
                                <span className="text-gray-600 text-sm">Reason for Referral:</span>
                                <p className="text-gray-800 bg-gray-50 p-2 rounded mt-1">
                                  {referral.reason}
                                </p>
                              </div>
                            )}

                            {referral.notes && (
                              <div className="mb-3">
                                <span className="text-gray-600 text-sm">Additional Notes:</span>
                                <p className="text-gray-700 bg-blue-50 p-2 rounded mt-1">
                                  {referral.notes}
                                </p>
                              </div>
                            )}

                            {(referral.clinicAddress || referral.contactInfo) && (
                              <div className="flex items-start gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
                                {referral.clinicAddress && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{referral.clinicAddress}</span>
                                  </div>
                                )}
                                {referral.contactInfo && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{referral.contactInfo}</span>
                                  </div>
                                )}
                                {referral.shareableLink && (
                                  <div className="flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    <a 
                                      href={referral.shareableLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      View Details
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Share2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No referrals found</p>
                  <p className="text-sm">Patient referrals will appear here when created</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Image Gallery
              </CardTitle>
              <CardDescription>Medical images, scans, and documents</CardDescription>
            </CardHeader>
            <CardContent>
              {patient?.governmentDocument ? (
                <div className="space-y-6">
                  {/* Government Documents Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Government Documents
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.isArray(patient.governmentDocument) ? (
                        patient.governmentDocument.map((doc, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="aspect-[4/3] bg-gray-100 relative">
                              <img
                                src={doc}
                                alt={`Government Document ${index + 1}`}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => handleDocumentClick(doc, null, index)}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-200">
                                <div className="text-center text-gray-500">
                                  <FileText className="w-8 h-8 mx-auto mb-2" />
                                  <p className="text-sm">Unable to load image</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="text-sm font-medium text-gray-900">Government Document {index + 1}</p>
                              <p className="text-xs text-gray-500 mt-1">Click to view in popup</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="aspect-[4/3] bg-gray-100 relative">
                            <img
                              src={patient.governmentDocument}
                              alt="Government Document"
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => handleDocumentClick(patient.governmentDocument, 'Government Document')}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-200">
                              <div className="text-center text-gray-500">
                                <FileText className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-sm">Unable to load image</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-medium text-gray-900">Government Document</p>
                            <p className="text-xs text-gray-500 mt-1">Click to view in popup</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Medical Images Section */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Medical Images
                      </h3>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="medical-image-upload"
                          accept="image/*,.pdf"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <Button
                          onClick={() => document.getElementById('medical-image-upload').click()}
                          disabled={uploadingImage}
                          className="flex items-center gap-2"
                        >
                          {uploadingImage ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          {uploadingImage ? 'Uploading...' : 'Add Image'}
                        </Button>
                      </div>
                    </div>

                    {medicalImagesLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : medicalImages.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {medicalImages.map((image, index) => (
                          <div key={image._id || index} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="aspect-[4/3] bg-gray-100 relative">
                              <img
                                src={image.imageUrl || image.cloudinaryUrl}
                                alt={image.title || `Medical Image ${index + 1}`}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => handleImageClick(image)}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-200">
                                <div className="text-center text-gray-500">
                                  <FileText className="w-8 h-8 mx-auto mb-2" />
                                  <p className="text-sm">Unable to load image</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {image.title || `Medical Image ${index + 1}`}
                                </p>
                                {image.imageType && (
                                  <Badge variant="outline" className="text-xs">
                                    {image.imageType}
                                  </Badge>
                                )}
                              </div>
                              {image.bodyPart && (
                                <p className="text-xs text-gray-500 mb-1">Body Part: {image.bodyPart}</p>
                              )}
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>
                                  {image.uploadedBy?.fullName ? `Dr. ${image.uploadedBy.fullName}` : 'Unknown'}
                                </span>
                                <span>
                                  {image.createdAt ? new Date(image.createdAt).toLocaleDateString() : 'Unknown date'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Click to view in popup</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <Camera className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No medical images found</p>
                        <p className="text-xs text-gray-400">Click "Add Image" to upload X-rays, scans, and other medical images</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No images found</p>
                  <p className="text-sm">Patient images and documents will appear here when uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Patient Modal */}
      <EditPatientModal
        isOpen={isEditModalOpen}
        onClose={handleEditClose}
        patient={patient}
        onSuccess={handleEditSuccess}
      />

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedImage?.title || 'Medical Image'}
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
                <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                  <img
                    src={selectedImage.imageUrl || selectedImage.cloudinaryUrl}
                    alt={selectedImage.title || 'Medical Image'}
                    className="w-full max-h-[60vh] object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-200">
                    <div className="text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4" />
                      <p>Unable to load image</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Image Type:</span>
                    <p className="text-gray-600">{selectedImage.imageType || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Body Part:</span>
                    <p className="text-gray-600">{selectedImage.bodyPart || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Uploaded By:</span>
                    <p className="text-gray-600">
                      {selectedImage.uploadedBy?.fullName ? `Dr. ${selectedImage.uploadedBy.fullName}` : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Upload Date:</span>
                    <p className="text-gray-600">
                      {selectedImage.createdAt ? formatDateTime(selectedImage.createdAt) : 'Unknown date'}
                    </p>
                  </div>
                </div>

                {selectedImage.description && (
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="text-gray-600 mt-1">{selectedImage.description}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedImage.imageUrl || selectedImage.cloudinaryUrl;
                      link.download = selectedImage.title || 'medical-image';
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedImage.imageUrl || selectedImage.cloudinaryUrl, '_blank')}
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>

      {/* Document Modal */}
      <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDocument?.title || 'Government Document'}
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="relative bg-gray-50 rounded-lg overflow-hidden">
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.title || 'Government Document'}
                  className="w-full max-h-[60vh] object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.classList.remove('hidden');
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>Unable to load document</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Document Type:</span>
                  <p className="text-gray-600">{selectedDocument.type || 'Government Document'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Patient:</span>
                  <p className="text-gray-600">{patient?.fullName || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedDocument.url;
                    link.download = selectedDocument.title || 'government-document';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedDocument.url, '_blank')}
                >
                  Open in New Tab
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lab Report Modal */}
      <Dialog open={isLabReportModalOpen} onOpenChange={handleCloseLabReportModal}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTubeDiagonal className="w-5 h-5" />
              {selectedLabReport?.testName || 'Lab Report'}
            </DialogTitle>
          </DialogHeader>
          {selectedLabReport && (
            <div className="space-y-4">
              {/* Report Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-b pb-4">
                <div>
                  <span className="font-medium text-gray-700">Test Date:</span>
                  <p className="text-gray-600">{new Date(selectedLabReport.testDate).toLocaleDateString('en-GB')}</p>
                </div>
                {selectedLabReport.labName && (
                  <div>
                    <span className="font-medium text-gray-700">Lab Name:</span>
                    <p className="text-gray-600">{selectedLabReport.labName}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Uploaded:</span>
                  <p className="text-gray-600">{new Date(selectedLabReport.uploadedAt).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Patient:</span>
                  <p className="text-gray-600">{patient?.fullName || 'Unknown'}</p>
                </div>
              </div>

              {selectedLabReport.notes && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <span className="font-medium text-blue-900">Notes: </span>
                  <span className="text-blue-800">{selectedLabReport.notes}</span>
                </div>
              )}

              {/* File Preview */}
              <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '60vh' }}>
                {selectedLabReport.fileType?.includes('pdf') ? (
                  <iframe
                    src={selectedLabReport.fileUrl}
                    className="w-full h-full"
                    title={selectedLabReport.testName}
                  />
                ) : selectedLabReport.fileType?.includes('image') ? (
                  <img
                    src={selectedLabReport.fileUrl}
                    alt={selectedLabReport.testName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4" />
                      <p>Preview not available for this file type</p>
                      <p className="text-sm">Click download to view the file</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadLabReport(selectedLabReport)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseLabReportModal}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Medical History Modal */}
      <Dialog open={isMedicalHistoryModalOpen} onOpenChange={setIsMedicalHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Medical History
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Medical Conditions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Medical Conditions
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Add medical condition"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('conditions', newCondition, setNewCondition)}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => addItem('conditions', newCondition, setNewCondition)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {medicalHistoryForm.conditions.map((condition, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 bg-orange-100 text-orange-800">
                    {condition}
                    <button
                      type="button"
                      onClick={() => removeItem('conditions', index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Allergies
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Add allergy"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('allergies', newAllergy, setNewAllergy)}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => addItem('allergies', newAllergy, setNewAllergy)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {medicalHistoryForm.allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive" className="gap-1 bg-red-100 text-red-800">
                    {allergy}
                    <button
                      type="button"
                      onClick={() => removeItem('allergies', index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Current Medications */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Current Medications
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  placeholder="Add medication"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('medications', newMedication, setNewMedication)}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => addItem('medications', newMedication, setNewMedication)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {medicalHistoryForm.medications.map((medication, index) => (
                  <Badge key={index} variant="outline" className="gap-1 bg-blue-50 text-blue-800 border-blue-200">
                    {medication}
                    <button
                      type="button"
                      onClick={() => removeItem('medications', index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Previous Surgeries */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Previous Surgeries
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newSurgery}
                  onChange={(e) => setNewSurgery(e.target.value)}
                  placeholder="Add surgery"
                  onKeyPress={(e) => e.key === 'Enter' && addItem('surgeries', newSurgery, setNewSurgery)}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={() => addItem('surgeries', newSurgery, setNewSurgery)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {medicalHistoryForm.surgeries.map((surgery, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 bg-purple-100 text-purple-800">
                    {surgery}
                    <button
                      type="button"
                      onClick={() => removeItem('surgeries', index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseMedicalHistory} disabled={savingMedicalHistory}>
              Cancel
            </Button>
            <Button onClick={handleSaveMedicalHistory} disabled={savingMedicalHistory}>
              {savingMedicalHistory ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Save Medical History
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientDetails;
