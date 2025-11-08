import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  Users, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Clock, 
  Plus,
  Phone,
  Video,
  MessageCircle,
  User,
  Heart,
  Stethoscope,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  MapPin,
  Check,
  UserCheck,
  Shield,
  Loader2,
  RotateCcw
} from "lucide-react";
import AppointmentModal from "@/components/AppointmentModal";
import AppointmentViewModal from '../components/AppointmentViewModal';
import ComplianceAlertModal from '../components/ComplianceAlertModal';
import ActivityLogsModal from '../components/ActivityLogsModal';
import Carousel from "@/components/Carousel";
import { getCurrentUser, isDoctor, isNurse, isHeadNurse, isSupervisor, isClinic } from "@/utils/roleUtils";
// // import SnakeGame from "@/components/SnakeGame";
import sessionManager from "@/utils/sessionManager";

// Import lab images
import labPhoto1 from "@/assets/Images/labphoto1.jpg";
import labPhoto2 from "@/assets/Images/labphoto2.jpg";
import labPhoto3 from "@/assets/Images/labphoto3.jpg";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { patientAPI, appointmentAPI, consultationAPI, complianceAlertAPI, invoiceAPI, revenueAPI, doctorAPI, nurseAPI, clinicAPI } from "@/services/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  
  // Get current user from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isAppointmentViewModalOpen, setIsAppointmentViewModalOpen] = useState(false);
  const [isComplianceAlertModalOpen, setIsComplianceAlertModalOpen] = useState(false);
  const [isActivityLogsModalOpen, setIsActivityLogsModalOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentPatientsLoading, setRecentPatientsLoading] = useState(false);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPatientsLoading, setTotalPatientsLoading] = useState(true);
  const [monthlyPatients, setMonthlyPatients] = useState(0);
  const [monthlyPatientsLoading, setMonthlyPatientsLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [todayAppointmentsLoading, setTodayAppointmentsLoading] = useState(true);
  const [yesterdayAppointments, setYesterdayAppointments] = useState(0);
  const [yesterdayAppointmentsLoading, setYesterdayAppointmentsLoading] = useState(true);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyRevenueChange, setMonthlyRevenueChange] = useState("+0%");
  const [monthlyRevenueLoading, setMonthlyRevenueLoading] = useState(true);
  // const [isSnakeGameOpen, setIsSnakeGameOpen] = useState(false);
  // const [clickCount, setClickCount] = useState(0);
  // const [clickTimeout, setClickTimeout] = useState(null);
  const [complianceRate, setComplianceRate] = useState(94.2);
  const [complianceRateLoading, setComplianceRateLoading] = useState(true);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [totalDoctorsLoading, setTotalDoctorsLoading] = useState(true);
  const [totalNurses, setTotalNurses] = useState(0);
  const [totalNursesLoading, setTotalNursesLoading] = useState(true);
  const [clinicOwnerName, setClinicOwnerName] = useState('');
  
  const { toast } = useToast();

  // Carousel images data with state
  const [carouselImages, setCarouselImages] = useState([]);
  const [loadingCarousel, setLoadingCarousel] = useState(true);
  
  const [isCarouselEditOpen, setIsCarouselEditOpen] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isCarouselAddOpen, setIsCarouselAddOpen] = useState(false);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState("");
  const [newImageCaption, setNewImageCaption] = useState("");
  const [newImageDescription, setNewImageDescription] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load carousel images from database
  useEffect(() => {
    const loadCarouselImages = async () => {
      try {
        const token = await sessionManager.getToken();
        if (!token) {
          // Use default images if not logged in
          setCarouselImages([
            {
              src: labPhoto1,
              alt: "Modern Laboratory Equipment",
              caption: "State-of-the-Art Laboratory",
              description: "Advanced diagnostic equipment for accurate results"
            },
            {
              src: labPhoto2,
              alt: "Medical Research Facility",
              caption: "Research & Development",
              description: "Cutting-edge research for better healthcare solutions"
            },
            {
              src: labPhoto3,
              alt: "Healthcare Technology",
              caption: "Digital Healthcare",
              description: "Innovative technology improving patient care"
            }
          ]);
          setLoadingCarousel(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/carousel`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.images && data.images.length > 0) {
            setCarouselImages(data.images);
          } else {
            // Use default images if no custom images
            setCarouselImages([
              {
                src: labPhoto1,
                alt: "Modern Laboratory Equipment",
                caption: "State-of-the-Art Laboratory",
                description: "Advanced diagnostic equipment for accurate results"
              },
              {
                src: labPhoto2,
                alt: "Medical Research Facility",
                caption: "Research & Development",
                description: "Cutting-edge research for better healthcare solutions"
              },
              {
                src: labPhoto3,
                alt: "Healthcare Technology",
                caption: "Digital Healthcare",
                description: "Innovative technology improving patient care"
              }
            ]);
          }
        }
      } catch (error) {
        console.error('Error loading carousel images:', error);
        // Use default images on error
        setCarouselImages([
          {
            src: labPhoto1,
            alt: "Modern Laboratory Equipment",
            caption: "State-of-the-Art Laboratory",
            description: "Advanced diagnostic equipment for accurate results"
          },
          {
            src: labPhoto2,
            alt: "Medical Research Facility",
            caption: "Research & Development",
            description: "Cutting-edge research for better healthcare solutions"
          },
          {
            src: labPhoto3,
            alt: "Healthcare Technology",
            caption: "Digital Healthcare",
            description: "Innovative technology improving patient care"
          }
        ]);
      } finally {
        setLoadingCarousel(false);
      }
    };

    loadCarouselImages();
  }, []);

  // Load clinic owner name
  useEffect(() => {
    const loadClinicOwner = async () => {
      console.log('Loading clinic owner - isClinic:', isClinic());
      console.log('Current user:', currentUser);
      
      if (isClinic()) {
        try {
          // Use getProfile to get the current clinic's data
          const response = await clinicAPI.getProfile();
          console.log('Clinic data received:', response);
          
          // Handle nested response structure
          const clinicData = response?.data || response;
          console.log('Extracted clinic data:', clinicData);
          
          // Only use ownerName field from clinic data
          const ownerName = clinicData?.ownerName;
          
          console.log('Owner name extracted:', ownerName);
          
          if (ownerName) {
            setClinicOwnerName(ownerName);
          } else {
            console.log('No ownerName field found in clinic data');
            console.log('Available fields:', Object.keys(clinicData || {}));
          }
        } catch (error) {
          console.error('Failed to load clinic owner name:', error);
        }
      }
    };

    loadClinicOwner();
  }, [currentUser]);

  // Load appointments from API when component mounts
  useEffect(() => {
    const loadAppointments = async () => {
      setAppointmentsLoading(true);
      try {
        // For doctors, filter by doctorId to show only appointments they are conducting
        // Fetch more appointments (100) to properly populate the calendar
        const filters = isDoctor() 
          ? { sortBy: 'date', sortOrder: 'asc', doctorId: currentUser?.id }
          : { sortBy: 'date', sortOrder: 'asc' };
        const response = await appointmentAPI.getAll(1, 100, filters);
        const appointmentsList = response.appointments || response.data || [];
        setAppointments(appointmentsList);
      } catch (error) {
        console.error('Failed to load appointments:', error);
        setAppointments([]);
      } finally {
        setAppointmentsLoading(false);
      }
    };

    loadAppointments();
  }, []);

  // Load recent patients from API
  useEffect(() => {
    const loadRecentPatients = async () => {
      setRecentPatientsLoading(true);
      try {
        const response = await patientAPI.getAll(1, 3, { sortBy: 'createdAt', sortOrder: 'desc' });
        const list = response.patients || response.data || [];
        const mapped = list.map(p => ({
          name: p.fullName,
          condition: p.medicalHistory?.conditions?.[0] || 'General Checkup',
          status: p.status || 'Active',
          lastVisit: p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : ''
        }));
        setRecentPatients(mapped);
      } catch (error) {
        console.error('Failed to load recent patients:', error);
        setRecentPatients([]);
      } finally {
        setRecentPatientsLoading(false);
      }
    };

    loadRecentPatients();
    loadChartData();
  }, []);

  // Load total patients count and this month's registrations
  useEffect(() => {
    const loadTotalPatients = async () => {
      setTotalPatientsLoading(true);
      try {
        const response = await patientAPI.getAll(1, 1); // limit 1 to get pagination only
        const total = response?.pagination?.totalPatients || 0;
        setTotalPatients(total);
      } catch (error) {
        console.error('Failed to load total patients:', error);
        setTotalPatients(0);
      } finally {
        setTotalPatientsLoading(false);
      }
    };
    
    const loadMonthlyPatients = async () => {
      setMonthlyPatientsLoading(true);
      try {
        // Get all patients and filter by this month's registration
        const response = await patientAPI.getAll(1, 1000); // Get more patients to filter
        const patients = response?.patients || response?.data || [];
        
        // Get current month and year
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Filter patients registered this month
        const monthlyCount = patients.filter(patient => {
          if (patient.createdAt) {
            const createdDate = new Date(patient.createdAt);
            return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
          }
          return false;
        }).length;
        
        setMonthlyPatients(monthlyCount);
      } catch (error) {
        console.error('Failed to load monthly patients:', error);
        setMonthlyPatients(0);
      } finally {
        setMonthlyPatientsLoading(false);
      }
    };
    
    loadTotalPatients();
    loadMonthlyPatients();
  }, []);

  // Load today's and yesterday's appointments count
  useEffect(() => {
    const loadTodayAppointments = async () => {
      setTodayAppointmentsLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        // Use only date filter to get all of today's appointments for the doctor
        // The backend will handle filtering based on user role
        const filters = { date: today };
        const response = await appointmentAPI.getAll(1, 100, filters);
        const todayCount = response?.appointments?.length || 0;
        setTodayAppointments(todayCount);
      } catch (error) {
        console.error('Failed to load today\'s appointments:', error);
        setTodayAppointments(0);
      } finally {
        setTodayAppointmentsLoading(false);
      }
    };
    
    const loadYesterdayAppointments = async () => {
      setYesterdayAppointmentsLoading(true);
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format
        const filters = { date: yesterdayDate };
        const response = await appointmentAPI.getAll(1, 100, filters);
        const yesterdayCount = response?.appointments?.length || 0;
        setYesterdayAppointments(yesterdayCount);
      } catch (error) {
        console.error('Failed to load yesterday\'s appointments:', error);
        setYesterdayAppointments(0);
      } finally {
        setYesterdayAppointmentsLoading(false);
      }
    };
    
    loadTodayAppointments();
    loadYesterdayAppointments();
  }, []);

  // Load current month revenue
  useEffect(() => {
    const loadMonthlyRevenue = async () => {
      setMonthlyRevenueLoading(true);
      try {
        const response = await revenueAPI.getCurrentMonth();
        setMonthlyRevenue(response.currentMonthRevenue || 0);
        
        // Format percentage change
        const change = response.percentageChange || 0;
        const sign = change >= 0 ? '+' : '';
        setMonthlyRevenueChange(`${sign}${change}%`);
      } catch (error) {
        console.error('Failed to load monthly revenue:', error);
        setMonthlyRevenue(0);
        setMonthlyRevenueChange("+0%");
      } finally {
        setMonthlyRevenueLoading(false);
      }
    };
    loadMonthlyRevenue();
  }, []);

  // Load compliance rate
  useEffect(() => {
    const loadComplianceRate = async () => {
      setComplianceRateLoading(true);
      try {
        const rate = await complianceAlertAPI.getComplianceRate();
        setComplianceRate(rate);
      } catch (error) {
        console.error('Failed to load compliance rate:', error);
        setComplianceRate(94.2); // Fallback to default
      } finally {
        setComplianceRateLoading(false);
      }
    };
    loadComplianceRate();
  }, []);

  // Load total doctors
  useEffect(() => {
    const loadTotalDoctors = async () => {
      setTotalDoctorsLoading(true);
      try {
        const response = await doctorAPI.getAll();
        setTotalDoctors(response.data?.length || 0);
      } catch (error) {
        console.error('Failed to load total doctors:', error);
        setTotalDoctors(0);
      } finally {
        setTotalDoctorsLoading(false);
      }
    };
    loadTotalDoctors();
  }, []);

  // Load total nurses
  useEffect(() => {
    const loadTotalNurses = async () => {
      setTotalNursesLoading(true);
      try {
        const response = await nurseAPI.getAll();
        setTotalNurses(response.data?.length || 0);
      } catch (error) {
        console.error('Failed to load total nurses:', error);
        setTotalNurses(0);
      } finally {
        setTotalNursesLoading(false);
      }
    };
    loadTotalNurses();
  }, []);

  // Base stats available to all users
  const allBaseStats = [
    {
      title: "Appointments Today",
      value: todayAppointmentsLoading ? "…" : todayAppointments.toString(),
      change: "",
      icon: Calendar,
      color: "text-secondary",
      route: "/appointments",
      details: {
        description: "Appointments scheduled for today and yesterday",
        metrics: [
          { label: "Today", value: todayAppointmentsLoading ? "…" : todayAppointments },
          { label: "Yesterday", value: yesterdayAppointmentsLoading ? "…" : yesterdayAppointments }
        ]
      }
    },
    {
      title: "Total Patients",
      value: totalPatientsLoading ? "…" : totalPatients.toLocaleString(),
      change: "",
      icon: Users,
      color: "text-primary",
      route: "/patients",
      details: {
        description: "Total number of registered patients in the system",
        metrics: [
          { label: "Registered", value: totalPatientsLoading ? "…" : totalPatients },
          { label: `Registered (${new Date().toLocaleString('en-US', { month: 'short' })})`, value: monthlyPatientsLoading ? "…" : monthlyPatients }
        ]
      }
    },
    {
      title: "Total Doctors",
      value: totalDoctorsLoading ? "…" : totalDoctors.toLocaleString(),
      change: "",
      icon: UserCheck,
      color: "text-blue-600",
      route: "/doctors",
      details: {
        description: "Total number of doctors in the clinic",
        metrics: [
          { label: "Active Doctors", value: totalDoctors },
          { label: "Status", value: "Available" }
        ]
      }
    }
  ];

  // Filter out Total Doctors card for doctors and all nursing roles
  const baseStats = (isDoctor() || isNurse() || isHeadNurse() || isSupervisor()) 
    ? allBaseStats.filter(stat => stat.title !== "Total Doctors")
    : allBaseStats;

  // Clinic-specific stats for the separate row (only for clinic users)
  const clinicStats = (currentUser?.role === 'clinic' || currentUser?.isClinic) ? [
    {
      title: "Total Nurses",
      value: totalNursesLoading ? "…" : totalNurses.toLocaleString(),
      change: "",
      icon: Shield,
      color: "text-green-600",
      route: "/nurses",
      details: {
        description: "Total nursing staff in the clinic",
        metrics: [
          { label: "Active Nurses", value: totalNurses },
          { label: "Department", value: "All" }
        ]
      }
    },
    {
      title: "Compliance Rate",
      value: complianceRateLoading ? "…" : `${complianceRate}%`,
      icon: CheckCircle,
      color: "text-success",
      route: null, // No navigation for compliance rate
      details: {
        description: "Overall compliance rate for healthcare standards",
        metrics: [
          { label: "Current Rate", value: `${complianceRate}%` },
          { label: "Target", value: "95%" },
          { label: "Status", value: complianceRate >= 95 ? "Excellent" : complianceRate >= 90 ? "Good" : "Needs Improvement" }
        ]
      }
    },
    {
      title: "Revenue (Month)",
      value: monthlyRevenueLoading ? "…" : `₹${monthlyRevenue.toLocaleString('en-IN')}`,
      change: monthlyRevenueChange,
      icon: TrendingUp,
      color: "text-warning",
      route: "/invoices",
      details: {
        description: "Total revenue generated this month",
        metrics: [
          { label: "This Month", value: `₹${monthlyRevenue.toLocaleString('en-IN')}` },
          { label: "Change", value: monthlyRevenueChange },
          { label: "Trend", value: monthlyRevenueChange.startsWith('+') ? "Increasing" : "Decreasing" }
        ]
      }
    }
  ] : [];

  const stats = [...baseStats, ...clinicStats];

  // recentPatients are now loaded from the API

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({ type: "Medication", patientId: "", patientName: "", message: "", priority: "Medium" });
  const [alertErrors, setAlertErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  
  // Chart data states
  const [appointmentTrendData, setAppointmentTrendData] = useState([]);
  const [patientAgeData, setPatientAgeData] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [solvingAlerts, setSolvingAlerts] = useState(new Set());

  // Load compliance alerts from API
  useEffect(() => {
    const loadAlerts = async () => {
      setAlertsLoading(true);
      try {
        const response = await complianceAlertAPI.getAll(1, 3, { 
          status: 'Active',
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });
        const alertsList = response.data || [];
        setAlerts(alertsList);
      } catch (error) {
        console.error('Failed to load compliance alerts:', error);
        setAlerts([]);
      } finally {
        setAlertsLoading(false);
      }
    };

    loadAlerts();
  }, []);

  // Load patients for alert form
  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      try {
        const response = await patientAPI.getAll(1, 100); // Get up to 100 patients
        setPatients(response.patients || []);
      } catch (error) {
        console.error('Error loading patients:', error);
        toast({ title: "Error", description: "Failed to load patients", variant: "destructive" });
      } finally {
        setPatientsLoading(false);
      }
    };
    loadPatients();
  }, []);

  const openAlertModal = () => setIsAlertModalOpen(true);
  const closeAlertModal = () => { setIsAlertModalOpen(false); setAlertErrors({}); };
  const handleAlertChange = (field, value) => {
    setAlertForm(prev => ({ ...prev, [field]: value }));
    if (alertErrors[field]) setAlertErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handlePatientSelect = (patientId) => {
    const selectedPatient = patients.find(p => p._id === patientId);
    setAlertForm(prev => ({ 
      ...prev, 
      patientId: patientId,
      patientName: selectedPatient ? selectedPatient.fullName : ''
    }));
    if (alertErrors.patientId) setAlertErrors(prev => ({ ...prev, patientId: "" }));
  };
  const validateAlert = () => {
    const errs = {};
    if (!alertForm.type) errs.type = "Type is required";
    if (!alertForm.patientId) errs.patientId = "Patient is required";
    if (!alertForm.message.trim()) errs.message = "Message is required";
    if (!alertForm.priority) errs.priority = "Priority is required";
    setAlertErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const submitAlert = async (e) => {
    e.preventDefault();
    if (!validateAlert()) return;
    
    setSubmittingAlert(true);
    try {
      // Find the selected patient
      const selectedPatient = patients.find(p => p._id === alertForm.patientId);
      
      const alertData = {
        type: alertForm.type,
        patientId: alertForm.patientId,
        patientName: selectedPatient ? selectedPatient.fullName : 'Unknown Patient',
        title: `${alertForm.type} Alert`,
        message: alertForm.message.trim(),
        priority: alertForm.priority
      };
      
      await complianceAlertAPI.create(alertData);
      
      // Refresh alerts from API
      const response = await complianceAlertAPI.getAll(1, 3, { 
        status: 'Active',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      setAlerts(response.data || []);
      
      toast({ title: "Alert Added", description: "New compliance alert has been created." });
      setAlertForm({ type: "Medication", patientId: "", patientName: "", message: "", priority: "Medium" });
      closeAlertModal();
    } catch (error) {
      console.error('Failed to create compliance alert:', error);
      toast({ 
        title: "Error", 
        description: "Failed to create compliance alert. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingAlert(false);
    }
  };

  // Load chart data
  const loadChartData = async () => {
    setChartsLoading(true);
    try {
      // Load appointment trend data (last 7 days) from API
      try {
        const trendResponse = await appointmentAPI.getTrend(7);
        const appointmentTrend = trendResponse.trendData || [];
        setAppointmentTrendData(appointmentTrend);
      } catch (error) {
        console.error('Failed to load appointment trend data:', error);
        setAppointmentTrendData([]);
      }

      // Load patient age distribution data - use smaller limit to reduce load
      try {
        const patientsResponse = await patientAPI.getAll(1, 100); // Reduced from 1000 to 100
        const patients = patientsResponse.patients || patientsResponse.data || [];
        
        const ageGroups = {
          '0-18': 0,
          '19-35': 0,
          '36-50': 0,
          '51-65': 0,
          '65+': 0
        };

        patients.forEach(patient => {
          if (patient.age) {
            const age = parseInt(patient.age);
            if (age <= 18) ageGroups['0-18']++;
            else if (age <= 35) ageGroups['19-35']++;
            else if (age <= 50) ageGroups['36-50']++;
            else if (age <= 65) ageGroups['51-65']++;
            else ageGroups['65+']++;
          }
        });

        const ageData = Object.entries(ageGroups).map(([range, count]) => ({
          ageRange: range,
          patients: count,
          fill: '#8884d8' // Single color for all age groups
        }));

        setPatientAgeData(ageData);
      } catch (error) {
        console.error('Failed to load patient age data:', error);
        setPatientAgeData([]);
      }

    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setChartsLoading(false);
    }
  };

  // Handle solving compliance alert
  const handleSolveAlert = async (alertId) => {
    setSolvingAlerts(prev => new Set([...prev, alertId]));
    
    try {
      await complianceAlertAPI.resolve(alertId, 'Marked as solved from dashboard');
      
      // Remove the solved alert from the list
      setAlerts(prev => prev.filter(alert => alert._id !== alertId));
      
      // Refresh compliance rate since solving an alert changes the calculation
      try {
        const rate = await complianceAlertAPI.getComplianceRate();
        setComplianceRate(rate);
      } catch (error) {
        console.error('Failed to refresh compliance rate:', error);
      }
      
      toast({ 
        title: "Alert Solved", 
        description: "Compliance alert has been marked as solved and removed from the dashboard." 
      });
    } catch (error) {
      console.error('Failed to solve compliance alert:', error);
      toast({ 
        title: "Error", 
        description: "Failed to solve compliance alert. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSolvingAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "destructive";
      case "Medium": return "warning";
      default: return "muted";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "success";
      case "Follow-up": return "warning";
      case "Completed": return "muted";
      default: return "muted";
    }
  };

  const getAppointmentStatusColor = (status) => {
    switch (status) {
      case "Scheduled": return "default";
      case "Confirmed": return "success";
      case "In Progress": return "warning";
      case "Completed": return "muted";
      case "Cancelled": return "destructive";
      default: return "default";
    }
  };

  const formatAppointmentTime = (date, time) => {
    if (!date || !time) return "Invalid date";
    
    const appointmentDate = new Date(`${date}T${time}`);
    const now = new Date();
    
    // Check if the date is valid
    if (isNaN(appointmentDate.getTime())) return "Invalid date";
    
    const diffTime = appointmentDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Past";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (isNaN(diffDays)) return "Invalid date";
    return `${diffDays} days`;
  };

  const getAppointmentPriority = (date, time) => {
    const appointmentDate = new Date(`${date}T${time}`);
    const now = new Date();
    const diffTime = appointmentDate - now;
    const diffHours = diffTime / (1000 * 60 * 60);
    
    if (diffHours < 0) return "past";
    if (diffHours < 2) return "urgent";
    if (diffHours < 24) return "soon";
    return "normal";
  };

  // Snake game Easter egg - triple click handler (DISABLED)
  // const handleRevenueIconClick = () => {
  //   const newCount = clickCount + 1;
  //   console.log('Revenue icon clicked! Count:', newCount);
  //   
  //   // Clear existing timeout
  //   if (clickTimeout) {
  //     clearTimeout(clickTimeout);
  //   }
  //   
  //   // Check if triple clicked
  //   if (newCount === 3) {
  //     console.log('Triple click detected! Opening Snake game...');
  //     setIsSnakeGameOpen(true);
  //     setClickCount(0);
  //   } else {
  //     setClickCount(newCount);
  //     
  //     // Set new timeout to reset click count after 1 second
  //     const timeout = setTimeout(() => {
  //       console.log('Resetting click count');
  //       setClickCount(0);
  //     }, 1000);
  //     setClickTimeout(timeout);
  //   }
  // };

  // Modal handlers
  const handleNewAppointment = () => setIsAppointmentModalOpen(true);
  const handleViewAppointments = () => setIsAppointmentViewModalOpen(true);

  // Form submission handlers
  const handleAppointmentSubmit = (appointmentData) => {
    // Add the new appointment to the list
    setAppointments(prev => [appointmentData, ...prev]);
    
    // Update today's appointments count if the new appointment is for today
    const today = new Date().toISOString().split('T')[0];
    const appointmentDate = new Date(appointmentData.date).toISOString().split('T')[0];
    if (appointmentDate === today) {
      setTodayAppointments(prev => prev + 1);
    }
    
    // Extract patient name from populated patient data
    const patientName = appointmentData.patientId?.fullName || appointmentData.patientName || 'Unknown Patient';
    
    toast({
      title: "Appointment Scheduled!",
      description: `Successfully scheduled ${appointmentData.appointmentType} for ${patientName} on ${new Date(appointmentData.date).toLocaleDateString()} at ${appointmentData.time}`,
      variant: "default",
    });
  };

  // Modal close handlers
  const handleAppointmentModalClose = () => setIsAppointmentModalOpen(false);
  const handleAppointmentViewModalClose = () => {
    setIsAppointmentViewModalOpen(false);
  };

  const handleCloseComplianceModal = () => {
    setIsComplianceAlertModalOpen(false);
  };

  // Carousel management handlers
  const handleEditCarouselImage = (index) => {
    console.log('Edit clicked for index:', index);
    console.log('Current carousel images:', carouselImages);
    setEditingImageIndex(index);
    setEditCaption(carouselImages[index]?.caption || "");
    setEditDescription(carouselImages[index]?.description || "");
    setIsCarouselEditOpen(true);
  };

  const handleDeleteCarouselImage = async (index) => {
    console.log('Delete clicked for index:', index);
    if (carouselImages.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one image must remain in the carousel",
        variant: "destructive"
      });
      return;
    }

    const imageToDelete = carouselImages[index];
    if (!imageToDelete.id) {
      // Default image, just remove from state
      const newImages = carouselImages.filter((_, i) => i !== index);
      setCarouselImages(newImages);
      toast({
        title: "Success",
        description: "Image removed from carousel"
      });
      return;
    }

    try {
      const token = await sessionManager.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/carousel/${imageToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      const newImages = carouselImages.filter((_, i) => i !== index);
      setCarouselImages(newImages);
      toast({
        title: "Success",
        description: "Carousel image deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting carousel image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive"
      });
    }
  };

  const handleAddCarouselImage = () => {
    setNewImageFile(null);
    setNewImagePreview("");
    setNewImageCaption("");
    setNewImageDescription("");
    setIsCarouselAddOpen(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNewCarouselImage = async () => {
    if (!newImageFile) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    setUploadingImage(true);

    try {
      // Get token from sessionManager
      const token = await sessionManager.getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', newImageFile);
      formData.append('caption', newImageCaption);
      formData.append('description', newImageDescription);

      console.log('Uploading image:', newImageFile.name);
      console.log('Token exists:', !!token);

      // Upload to backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/carousel/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      console.log('Upload response:', data);

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to upload image');
      }

      // Add new image to carousel from server response
      setCarouselImages([...carouselImages, data.image]);
      setIsCarouselAddOpen(false);
      toast({
        title: "Success",
        description: "Carousel image uploaded successfully!"
      });
    } catch (error) {
      console.error('Error uploading carousel image:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveCarouselEdit = async () => {
    const imageToUpdate = carouselImages[editingImageIndex];
    
    if (!imageToUpdate.id) {
      // Default image, just update in state
      const updatedImages = [...carouselImages];
      updatedImages[editingImageIndex] = {
        ...updatedImages[editingImageIndex],
        caption: editCaption,
        description: editDescription
      };
      setCarouselImages(updatedImages);
      setIsCarouselEditOpen(false);
      toast({
        title: "Success",
        description: "Carousel image updated"
      });
      return;
    }

    try {
      const token = await sessionManager.getToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/carousel/${imageToUpdate.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caption: editCaption,
          description: editDescription
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update image');
      }

      const data = await response.json();
      const updatedImages = [...carouselImages];
      updatedImages[editingImageIndex] = data.image;
      setCarouselImages(updatedImages);
      setIsCarouselEditOpen(false);
      toast({
        title: "Success",
        description: "Carousel image updated successfully"
      });
    } catch (error) {
      console.error('Error updating carousel image:', error);
      toast({
        title: "Error",
        description: "Failed to update image",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
    
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="text-sm sm:text-base text-muted-foreground">
          Welcome back, {isClinic() && clinicOwnerName ? clinicOwnerName : (currentUser?.name || currentUser?.fullName || 'User')}. Here's your overview.
        </p>
      </div>
      {isClinic() && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setIsActivityLogsModalOpen(true)}
          className="flex items-center gap-2 gradient-button-outline self-start sm:self-auto"
        >
          <Activity className="w-4 h-4" />
          <span className="hidden sm:inline">Check Logs</span>
          <span className="sm:hidden">Logs</span>
        </Button>
      )}
    </div>

      {/* Carousel Section */}
      <div className="mb-4 sm:mb-6">
        <Carousel 
          images={carouselImages} 
          autoPlay={true} 
          interval={4000}
        />
      </div>

      {/* Main Content Grid - Stats, Chart, and Calendar */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-3">
        {/* Stats Column - Left side */}
        <div className="xl:col-span-1 grid gap-2.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 content-start">
          <TooltipProvider delayDuration={200}>
            {stats.map((stat, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Card 
                    className="border-0 shadow-soft hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                    onClick={() => stat.route && navigate(stat.route)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-muted-foreground truncate group-hover:text-primary transition-colors duration-300">{stat.title}</p>
                          <p className="text-lg font-bold text-foreground mt-0.5 group-hover:scale-110 transition-transform duration-300 origin-left">{stat.value}</p>
                        </div>
                        <div 
                          className={`p-2 rounded-lg bg-gradient-primary/10 flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
                        >
                          <stat.icon className={`w-5 h-5 ${stat.color} group-hover:animate-pulse`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="max-w-xs p-4 bg-gradient-to-br from-background to-muted border-2 border-primary/20 shadow-xl"
                  sideOffset={10}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      <h4 className="font-semibold text-sm">{stat.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {stat.details?.description}
                    </p>
                    <div className="space-y-2 pt-2">
                      {stat.details?.metrics.map((metric, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-medium">{metric.label}:</span>
                          <span className="font-semibold text-foreground">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Appointments Trend Chart - Middle */}
        <Card className="border-0 shadow-soft xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Appointment Trends (7 Days)
            </CardTitle>
            <CardDescription>
              Daily appointment bookings over the past week
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            {chartsLoading ? (
              <div className="h-[150px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart data...</div>
              </div>
            ) : (
              <div className="w-full flex justify-center" style={{paddingRight:"50px", paddingTop:"60px", border:"3px double #70ace8", borderRadius:"4px"}}>
                <ChartContainer
                config={{
                  appointments: {
                    label: "Appointments",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[200px] sm:h-[250px] lg:h-[200px] w-full max-w-[500px]"
              >
                <LineChart data={appointmentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin', 'dataMax']}
                    ticks={appointmentTrendData.length > 0 ? [appointmentTrendData[0]?.date, appointmentTrendData[appointmentTrendData.length - 1]?.date] : []}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="appointments" 
                    stroke="var(--color-appointments)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-appointments)" }}
                  />
                </LineChart>
              </ChartContainer>
              </div>
              
            )}
          </CardContent>
        </Card>

        {/* Appointment Calendar - Right side */}
        <Card className="border-0 shadow-soft xl:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Appointment Calendar
                </CardTitle>
                <CardDescription className="text-xs">
                  View and manage your appointments
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarMonth(new Date())}
                className="h-7 px-2 text-xs"
                title="Go to current month"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center p-4 bg-gradient-to-br from-background to-muted/20">
            <div className="flex justify-center w-full">
              <CalendarComponent
                mode="single"
                selected={new Date()}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                className="rounded-lg border-0 shadow-inner"
                modifiers={{
                  booked: appointments.map(apt => {
                    // Parse date string and create date at midnight local time
                    const dateStr = apt.date.split('T')[0]; // Get YYYY-MM-DD part
                    const [year, month, day] = dateStr.split('-').map(Number);
                    return new Date(year, month - 1, day);
                  }),
                  todayWithAppointment: appointments.some(apt => {
                    const dateStr = apt.date.split('T')[0];
                    const today = new Date().toISOString().split('T')[0];
                    return dateStr === today;
                  }) ? [new Date()] : []
                }}
                modifiersClassNames={{
                  booked: "bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 text-purple-700 dark:text-purple-300 font-bold hover:from-purple-200 hover:to-violet-200 dark:hover:from-purple-800/50 dark:hover:to-violet-800/50 border border-purple-300 dark:border-purple-700 shadow-sm",
                  todayWithAppointment: "!bg-gradient-to-br !from-blue-100 !to-indigo-100 dark:!from-blue-900 dark:!to-indigo-900 !text-blue-600 dark:!text-blue-200 font-bold ring-2 ring-primary/50 ring-offset-2 shadow-lg border-2 !border-primary"
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={handleAppointmentModalClose}
        onSubmit={handleAppointmentSubmit}
      />

      {/* Appointment View Modal */}
      <AppointmentViewModal
        isOpen={isAppointmentViewModalOpen}
        onClose={handleAppointmentViewModalClose}
      />

      {/* Compliance Alert Modal */}
      <ComplianceAlertModal
        isOpen={isComplianceAlertModalOpen}
        onClose={handleCloseComplianceModal}
      />

      {/* Add Compliance Alert Modal */}
      <Dialog open={isAlertModalOpen} onOpenChange={closeAlertModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Compliance Alert</DialogTitle>
            <DialogDescription>Create a new alert that will appear in the list.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAlert} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="alert-type">Type</Label>
                <Select value={alertForm.type} onValueChange={(v) => handleAlertChange('type', v)}>
                  <SelectTrigger id="alert-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medication">Medication</SelectItem>
                    <SelectItem value="Appointment">Appointment</SelectItem>
                    <SelectItem value="Lab Results">Lab Results</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
                {alertErrors.type && <p className="text-sm text-red-600">{alertErrors.type}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-priority">Priority</Label>
                <Select value={alertForm.priority} onValueChange={(v) => handleAlertChange('priority', v)}>
                  <SelectTrigger id="alert-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
                {alertErrors.priority && <p className="text-sm text-red-600">{alertErrors.priority}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-patient">Patient</Label>
              <Select value={alertForm.patientId} onValueChange={handlePatientSelect}>
                <SelectTrigger id="alert-patient">
                  <SelectValue placeholder={patientsLoading ? "Loading patients..." : "Select a patient"} />
                </SelectTrigger>
                <SelectContent>
                  {patients.length === 0 && !patientsLoading ? (
                    <SelectItem value="" disabled>No patients found</SelectItem>
                  ) : (
                    patients.map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        {patient.fullName} {patient.email ? `(${patient.email})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {alertErrors.patientId && <p className="text-sm text-red-600">{alertErrors.patientId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-message">Message</Label>
              <Textarea id="alert-message" value={alertForm.message} onChange={(e) => handleAlertChange('message', e.target.value)} rows={3} placeholder="Describe the compliance issue..." />
              {alertErrors.message && <p className="text-sm text-red-600">{alertErrors.message}</p>}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeAlertModal} disabled={submittingAlert} className="gradient-button-outline">Cancel</Button>
              <Button type="submit" className="gradient-button" disabled={submittingAlert}>
                {submittingAlert ? 'Adding Alert...' : 'Add Alert'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activity Logs Modal */}
      <ActivityLogsModal
        isOpen={isActivityLogsModalOpen}
        onClose={() => setIsActivityLogsModalOpen(false)}
      />

      {/* Carousel Edit Dialog */}
      <Dialog open={isCarouselEditOpen} onOpenChange={setIsCarouselEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Carousel Image</DialogTitle>
            <DialogDescription>
              Update the caption and description for this carousel image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Caption</label>
              <input
                type="text"
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                placeholder="Enter caption"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                rows={3}
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCarouselEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCarouselEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carousel Add Image Dialog */}
      <Dialog open={isCarouselAddOpen} onOpenChange={setIsCarouselAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Carousel Image</DialogTitle>
            <DialogDescription>
              Upload a new image to the carousel with caption and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Image File *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-xs text-muted-foreground">
                Select an image file (jpg, png, webp, etc.) - Max 5MB
              </p>
            </div>
            
            {/* Image Preview */}
            {newImagePreview && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Preview</label>
                <div className="border rounded-md overflow-hidden">
                  <img 
                    src={newImagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Caption</label>
              <input
                type="text"
                value={newImageCaption}
                onChange={(e) => setNewImageCaption(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                placeholder="Enter caption"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={newImageDescription}
                onChange={(e) => setNewImageDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                rows={3}
                placeholder="Enter description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCarouselAddOpen(false)} disabled={uploadingImage}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewCarouselImage} disabled={uploadingImage || !newImageFile}>
              {uploadingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Add Image'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snake Game Easter Egg - DISABLED */}
      {/* <SnakeGame isOpen={isSnakeGameOpen} onClose={() => setIsSnakeGameOpen(false)} /> */}
 
    </div>
  );
};

export default Dashboard;
