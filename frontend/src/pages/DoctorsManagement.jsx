import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { 
  UserCheck, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Stethoscope,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MapPin,
  Award,
  Clock,
  User,
  Building,
  GraduationCap,
  UserX,
  UserPlus,
  X,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { doctorAPI } from "@/services/api";
import { getImageUrl } from '@/utils/imageUtils';
// Removed direct Cloudinary import - now using backend upload endpoint

const DoctorsManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState(new Set());
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isDoctorViewOpen, setIsDoctorViewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('doctorsManagement_pageSize');
    return saved ? parseInt(saved) : 10;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [languageInput, setLanguageInput] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState([]);
  const [specialtyComboboxOpen, setSpecialtyComboboxOpen] = useState(false);
  
  // Common languages list
  const commonLanguages = [
    'English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Urdu', 
    'Kannada', 'Odia', 'Malayalam', 'Punjabi', 'Assamese', 'Maithili', 'Sanskrit',
    'French', 'German', 'Spanish', 'Italian', 'Portuguese', 'Russian', 'Chinese',
    'Japanese', 'Korean', 'Arabic', 'Persian', 'Dutch', 'Swedish', 'Norwegian'
  ];
  
  const [doctorForm, setDoctorForm] = useState({
    fullName: "",
    email: "",
    password: "",
    specialty: "General Practitioner",
    phone: "",
    profileImage: "",
    uhid: "",
    qualification: "",
    currentAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India"
    },
    permanentAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India"
    },
    about: "",
    languages: [],
    role: "doctor"
  });

  const { toast } = useToast();

  // Language handling functions
  const handleLanguageInputChange = (value) => {
    setLanguageInput(value);
    if (value.trim()) {
      const filtered = commonLanguages.filter(lang => 
        lang.toLowerCase().includes(value.toLowerCase()) &&
        !doctorForm.languages.includes(lang)
      );
      setFilteredLanguages(filtered);
    } else {
      setFilteredLanguages([]);
    }
  };

  const addLanguage = (language) => {
    if (!doctorForm.languages.includes(language)) {
      setDoctorForm(prev => ({
        ...prev,
        languages: [...prev.languages, language]
      }));
    }
    setLanguageInput('');
    setFilteredLanguages([]);
  };

  const removeLanguage = (languageToRemove) => {
    setDoctorForm(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang !== languageToRemove)
    }));
  };

  const handleLanguageKeyPress = (e) => {
    if (e.key === 'Enter' && languageInput.trim()) {
      e.preventDefault();
      addLanguage(languageInput.trim());
    }
  };

  // Filter doctors based on search query
  // Use doctors directly since filtering is now done server-side
  const filteredDoctors = doctors;

  // Load doctors
  const loadDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const filters = {};
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      
      const response = await doctorAPI.getAll(currentPage, pageSize, filters);
      console.log('API Response:', response);
      console.log('Pagination:', response.pagination);
      console.log('Total Count from API:', response.pagination?.totalCount);
      if (response.success) {
        setDoctors(response.data || []);
        const pagination = response.pagination || {};
        setTotalPages(pagination.totalPages || 1);
        setTotalCount(pagination.totalCount || response.data?.length || 0);
        console.log('Set totalCount to:', pagination.totalCount || response.data?.length || 0);
        
        // Update active/inactive counts from pagination or calculate from all data
        if (pagination.activeCount !== undefined && pagination.inactiveCount !== undefined) {
          setActiveCount(pagination.activeCount);
          setInactiveCount(pagination.inactiveCount);
        } else {
          // Fallback: fetch counts separately or calculate from current data
          // For now, we'll need to get all doctors to count properly
          const allDoctorsResponse = await doctorAPI.getAll(1, 999999, {});
          if (allDoctorsResponse.success) {
            const allDoctors = allDoctorsResponse.data || [];
            setActiveCount(allDoctors.filter(d => d.isActive).length);
            setInactiveCount(allDoctors.filter(d => !d.isActive).length);
          }
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load doctors",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast({
        title: "Error",
        description: "Failed to load doctors",
        variant: "destructive"
      });
    } finally {
      setDoctorsLoading(false);
    }
  };

  // Save pageSize to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('doctorsManagement_pageSize', pageSize.toString());
  }, [pageSize, isInitialLoad]);

  useEffect(() => {
    loadDoctors();
  }, [currentPage, pageSize, searchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  // Handle image file selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to backend (which handles Cloudinary)
  const uploadImageToCloudinary = async (imageFile) => {
    try {
      setUploadingImage(true);
      const response = await doctorAPI.uploadImage(imageFile);
      if (response.success) {
        return response.data.imageUrl;
      } else {
        throw new Error(response.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle add doctor
  const handleAddDoctor = async () => {
    // Validate required fields according to Doctor model
    const requiredFields = [
      { field: 'fullName', name: 'Full Name' },
      { field: 'email', name: 'Email' },
      { field: 'password', name: 'Password' },
      { field: 'qualification', name: 'Qualification' },
      { field: 'uhid', name: 'UHID' },
      { field: 'about', name: 'About Doctor' }
    ];

    // Check if image is selected
    if (!selectedImage) {
      toast({
        title: "Validation Error",
        description: "Profile image is required",
        variant: "destructive"
      });
      return;
    }

    const currentAddressFields = [
      { field: 'street', name: 'Current Address Street' },
      { field: 'city', name: 'Current Address City' },
      { field: 'state', name: 'Current Address State' },
      { field: 'zipCode', name: 'Current Address Zip Code' }
    ];

    const permanentAddressFields = [
      { field: 'street', name: 'Permanent Address Street' },
      { field: 'city', name: 'Permanent Address City' },
      { field: 'state', name: 'Permanent Address State' },
      { field: 'zipCode', name: 'Permanent Address Zip Code' }
    ];

    // Check basic required fields
    for (const { field, name } of requiredFields) {
      if (!doctorForm[field] || doctorForm[field].trim() === '') {
        toast({
          title: "Validation Error",
          description: `${name} is required`,
          variant: "destructive"
        });
        return;
      }
    }

    // Check current address fields
    for (const { field, name } of currentAddressFields) {
      if (!doctorForm.currentAddress[field] || doctorForm.currentAddress[field].trim() === '') {
        toast({
          title: "Validation Error",
          description: `${name} is required`,
          variant: "destructive"
        });
        return;
      }
    }

    // Check permanent address fields
    for (const { field, name } of permanentAddressFields) {
      if (!doctorForm.permanentAddress[field] || doctorForm.permanentAddress[field].trim() === '') {
        toast({
          title: "Validation Error",
          description: `${name} is required`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      
      // Upload image to Cloudinary first
      let profileImageUrl = '';
      try {
        profileImageUrl = await uploadImageToCloudinary(selectedImage);
      } catch (error) {
        toast({
          title: "Image Upload Failed",
          description: "Failed to upload profile image. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Create doctor data with uploaded image URL
      const doctorData = {
        ...doctorForm,
        profileImage: profileImageUrl
      };

      const response = await doctorAPI.createWithImage(doctorData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Doctor added successfully",
        });
        setIsAddModalOpen(false);
        
        // Reload the page to refresh the data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        setDoctorForm({
          fullName: "",
          email: "",
          password: "",
          specialty: "General Practitioner",
          phone: "",
          profileImage: "",
          uhid: "",
          qualification: "",
          currentAddress: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "India"
          },
          permanentAddress: {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "India"
          },
          about: "",
          languages: [],
          role: "doctor"
        });
        // Reset image states
        setSelectedImage(null);
        setImagePreview(null);
        setSameAsCurrent(false);
        loadDoctors();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to add doctor",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
      toast({
        title: "Error",
        description: "Failed to add doctor",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle activate doctor
  const handleActivateDoctor = async (doctorId, doctorName) => {
    try {
      const response = await doctorAPI.update(doctorId, { isActive: true });
      if (response.success) {
        toast({
          title: "Success",
          description: `${doctorName} has been activated`,
        });
        loadDoctors();
      } else {
        toast({
          title: "Error",
          description: "Failed to activate doctor",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error activating doctor:', error);
      toast({
        title: "Error",
        description: "Failed to activate doctor",
        variant: "destructive"
      });
    }
  };

  // Handle deactivate doctor
  const handleDeactivateDoctor = async (doctorId, doctorName) => {
    try {
      const response = await doctorAPI.update(doctorId, { isActive: false });
      if (response.success) {
        toast({
          title: "Success",
          description: `${doctorName} has been deactivated`,
        });
        loadDoctors();
      } else {
        toast({
          title: "Error",
          description: "Failed to deactivate doctor",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deactivating doctor:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate doctor",
        variant: "destructive"
      });
    }
  };

  const toggleDoctorExpansion = (doctorId) => {
    setExpandedDoctors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(doctorId)) {
        newSet.delete(doctorId);
      } else {
        newSet.add(doctorId);
      }
      return newSet;
    });
  };

  // Handle doctor card click to show expanded view
  const handleDoctorClick = (doctor) => {
    setSelectedDoctor(doctor);
    setIsDoctorViewOpen(true);
  };

  // Available specialties
  const specialties = [
    "General Practitioner",
    "Cardiologist",
    "Dermatologist",
    "Endocrinologist",
    "Gastroenterologist",
    "Hematologist",
    "Neurologist",
    "Oncologist",
    "Ophthalmologist",
    "Orthopedic Surgeon",
    "Otolaryngologist",
    "Pediatrician",
    "Physiotherapist",
    "Psychiatrist",
    "Radiologist",
    "Anesthesiologist",
    "Emergency Medicine",
    "Internal Medicine",
    "Family Medicine"
  ];

  return (
    <div className="p-6 space-y-6">

      {/* Search, Stats and Actions - Single Line */}
      <div className="flex items-center justify-between gap-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search doctors by name, email, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <UserCheck className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">
              Total: {totalCount}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-green-100 rounded-full">
              <UserPlus className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-green-600 font-medium">
              Active: {activeCount}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-red-100 rounded-full">
              <UserX className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-sm text-red-600 font-medium">
              Inactive: {inactiveCount}
            </span>
          </div>
        </div>
        
        {/* Add Doctor Button */}
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Doctor
        </Button>
      </div>

      {/* Doctors List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Doctors List</h2>
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
          {doctorsLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading doctors...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchQuery ? "No doctors found matching your search." : "No doctors found."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDoctors.map((doctor) => (
                <div 
                  key={doctor._id} 
                  className={`bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-all duration-200 cursor-pointer ${!doctor.isActive ? 'opacity-75' : ''}`}
                  onClick={() => handleDoctorClick(doctor)}
                >
                  <div className="flex items-center justify-between gap-6">
                    {/* Doctor Avatar - Fixed width */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {doctor.profileImage ? (
                        <img 
                          src={getImageUrl(doctor.profileImage)}
                          alt={doctor.fullName}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-r from-blue-800 to-teal-500 rounded-full flex items-center justify-center ${doctor.profileImage ? 'hidden' : ''}`}>
                        <Stethoscope className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    {/* Doctor Name - Fixed width */}
                    <div className="w-40 flex-shrink-0">
                      <h3 className="font-semibold text-foreground text-sm truncate">{doctor.fullName}</h3>
                      {doctor.uhid && (
                        <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                          {doctor.uhid}
                        </p>
                      )}
                    </div>
                    
                    {/* Specialty - Fixed width */}
                    <div className="w-32 flex-shrink-0">
                      <p className="text-sm text-muted-foreground truncate">{doctor.specialty || 'General Practitioner'}</p>
                    </div>
                    
                    {/* Email - Flexible width */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{doctor.email}</span>
                      </div>
                    </div>
                    
                    {/* Phone - Fixed width */}
                    <div className="w-32 flex-shrink-0">
                      {doctor.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{doctor.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status - Fixed width */}
                    <div className="w-24 flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        <Badge variant={doctor.isActive ? 'default' : 'destructive'} className="text-xs">
                          {doctor.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Actions - Fixed width */}
                    <div className="w-24 flex-shrink-0 flex items-center justify-end gap-2">
                      {doctor.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivateDoctor(doctor._id, doctor.fullName);
                          }}
                          title="Deactivate Doctor"
                        >
                          <UserX className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateDoctor(doctor._id, doctor.fullName);
                          }}
                          title="Activate Doctor"
                        >
                          <UserPlus className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
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

      {/* Add Doctor Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Complete all required fields to register a new doctor in the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8 p-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={doctorForm.fullName}
                    onChange={(e) => setDoctorForm({...doctorForm, fullName: e.target.value})}
                    placeholder="Dr. John Smith"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm({...doctorForm, email: e.target.value})}
                    placeholder="doctor@hospital.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={doctorForm.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      if (value.length <= 15) {
                        setDoctorForm({...doctorForm, phone: value});
                      }
                    }}
                    placeholder="9876543210"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="uhid">UHID (Unique Hospital ID) *</Label>
                  <Input
                    id="uhid"
                    value={doctorForm.uhid}
                    onChange={(e) => setDoctorForm({...doctorForm, uhid: e.target.value.toUpperCase()})}
                    placeholder="DOC001"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="specialty">Medical Specialty</Label>
                  <Popover open={specialtyComboboxOpen} onOpenChange={setSpecialtyComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={specialtyComboboxOpen}
                        className="w-full justify-between"
                      >
                        {doctorForm.specialty || "Select specialty..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                      <Command>
                        <CommandInput placeholder="Search specialties..." />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty>No specialty found.</CommandEmpty>
                          <CommandGroup>
                            {specialties.map((specialty) => (
                              <CommandItem
                                key={specialty}
                                value={specialty}
                                onSelect={() => {
                                  setDoctorForm({...doctorForm, specialty: specialty});
                                  setSpecialtyComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    doctorForm.specialty === specialty ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {specialty}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="qualification">Qualification *</Label>
                  <Input
                    id="qualification"
                    value={doctorForm.qualification}
                    onChange={(e) => setDoctorForm({...doctorForm, qualification: e.target.value})}
                    placeholder="MBBS, MD, MS, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="profileImage">Profile Image *</Label>
                  <div className="space-y-3">
                    <Input
                      id="profileImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="cursor-pointer"
                    />
                    {imagePreview && (
                      <div className="flex items-center space-x-3">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        />
                        <div className="text-sm text-gray-600">
                          <p className="font-medium">{selectedImage?.name}</p>
                          <p className="text-xs">{(selectedImage?.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Select an image file (JPG, PNG, etc.) up to 5MB. This will be uploaded to Cloudinary.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Current Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="currentStreet">Address *</Label>
                  <Input
                    id="currentStreet"
                    value={doctorForm.currentAddress.street}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      currentAddress: {...doctorForm.currentAddress, street: e.target.value}
                    })}
                    placeholder="123 Main Street, Apartment 4B"
                  />
                </div>
                <div>
                  <Label htmlFor="currentCity">City *</Label>
                  <Input
                    id="currentCity"
                    value={doctorForm.currentAddress.city}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      currentAddress: {...doctorForm.currentAddress, city: e.target.value}
                    })}
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <Label htmlFor="currentState">State *</Label>
                  <Input
                    id="currentState"
                    value={doctorForm.currentAddress.state}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      currentAddress: {...doctorForm.currentAddress, state: e.target.value}
                    })}
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <Label htmlFor="currentZipCode">Zip Code *</Label>
                  <Input
                    id="currentZipCode"
                    value={doctorForm.currentAddress.zipCode}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      currentAddress: {...doctorForm.currentAddress, zipCode: e.target.value}
                    })}
                    placeholder="400001"
                  />
                </div>
                <div>
                  <Label htmlFor="currentCountry">Country</Label>
                  <Input
                    id="currentCountry"
                    value={doctorForm.currentAddress.country}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      currentAddress: {...doctorForm.currentAddress, country: e.target.value}
                    })}
                    placeholder="India"
                  />
                </div>
              </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Permanent Address</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sameAsCurrent"
                    checked={sameAsCurrent}
                    onChange={(e) => {
                      setSameAsCurrent(e.target.checked);
                      if (e.target.checked) {
                        setDoctorForm({
                          ...doctorForm,
                          permanentAddress: {...doctorForm.currentAddress}
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="sameAsCurrent" className="text-sm">Same as current address</Label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="permanentStreet">Address *</Label>
                  <Input
                    id="permanentStreet"
                    value={doctorForm.permanentAddress.street}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      permanentAddress: {...doctorForm.permanentAddress, street: e.target.value}
                    })}
                    placeholder="123 Main Street, Apartment 4B"
                    disabled={sameAsCurrent}
                  />
                </div>
                <div>
                  <Label htmlFor="permanentCity">City *</Label>
                  <Input
                    id="permanentCity"
                    value={doctorForm.permanentAddress.city}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      permanentAddress: {...doctorForm.permanentAddress, city: e.target.value}
                    })}
                    placeholder="Mumbai"
                    disabled={sameAsCurrent}
                  />
                </div>
                <div>
                  <Label htmlFor="permanentState">State *</Label>
                  <Input
                    id="permanentState"
                    value={doctorForm.permanentAddress.state}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      permanentAddress: {...doctorForm.permanentAddress, state: e.target.value}
                    })}
                    placeholder="Maharashtra"
                    disabled={sameAsCurrent}
                  />
                </div>
                <div>
                  <Label htmlFor="permanentZipCode">Zip Code *</Label>
                  <Input
                    id="permanentZipCode"
                    value={doctorForm.permanentAddress.zipCode}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      permanentAddress: {...doctorForm.permanentAddress, zipCode: e.target.value}
                    })}
                    placeholder="400001"
                    disabled={sameAsCurrent}
                  />
                </div>
                <div>
                  <Label htmlFor="permanentCountry">Country</Label>
                  <Input
                    id="permanentCountry"
                    value={doctorForm.permanentAddress.country}
                    onChange={(e) => setDoctorForm({
                      ...doctorForm, 
                      permanentAddress: {...doctorForm.permanentAddress, country: e.target.value}
                    })}
                    placeholder="India"
                    disabled={sameAsCurrent}
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="about">About Doctor *</Label>
                  <Textarea
                    id="about"
                    value={doctorForm.about}
                    onChange={(e) => setDoctorForm({...doctorForm, about: e.target.value})}
                    placeholder="Brief description about the doctor's experience, expertise, and background..."
                    maxLength={1000}
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">{doctorForm.about.length}/1000 characters</p>
                </div>
                
                {/* Languages */}
                <div>
                  <Label htmlFor="languages">Languages Spoken</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id="languages"
                        value={languageInput}
                        onChange={(e) => handleLanguageInputChange(e.target.value)}
                        onKeyPress={handleLanguageKeyPress}
                        placeholder="Type to search and add languages..."
                      />
                      {filteredLanguages.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {filteredLanguages.map((language, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => addLanguage(language)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                            >
                              {language}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Selected Languages */}
                    {doctorForm.languages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {doctorForm.languages.map((language, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            {language}
                            <button
                              type="button"
                              onClick={() => removeLanguage(language)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Type to search for languages or press Enter to add custom languages
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={doctorForm.password}
                        onChange={(e) => setDoctorForm({...doctorForm, password: e.target.value})}
                        placeholder="Enter secure password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDoctor} disabled={submitting || uploadingImage}>
              {uploadingImage ? "Uploading Image..." : submitting ? "Adding Doctor..." : "Add Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Doctor Expanded View Modal */}
      <Dialog open={isDoctorViewOpen} onOpenChange={setIsDoctorViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                {selectedDoctor?.profileImage ? (
                  <img 
                    src={getImageUrl(selectedDoctor.profileImage)}
                    alt={selectedDoctor.fullName}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-800 to-teal-500 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{selectedDoctor?.fullName}</h2>
                <p className="text-sm text-muted-foreground">{selectedDoctor?.specialty || 'General Practitioner'}</p>
              </div>
              <Badge variant={selectedDoctor?.isActive ? 'default' : 'destructive'} className="ml-auto">
                {selectedDoctor?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedDoctor && (
            <div className="space-y-6 py-4">
              {/* Debug: Log doctor data */}
              {console.log('Selected Doctor Data:', selectedDoctor)}
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                      <p className="text-sm font-medium">{selectedDoctor.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">UHID</Label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{selectedDoctor.uhid}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <Badge variant={selectedDoctor.role === 'admin' ? 'default' : 'secondary'} className="ml-2">
                        {selectedDoctor.role}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={selectedDoctor.isActive ? 'default' : 'destructive'} className="ml-2">
                        {selectedDoctor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-sm">{selectedDoctor.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-sm">{selectedDoctor.phone || 'Not provided'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Professional Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Specialty</Label>
                      <p className="text-sm">{selectedDoctor.specialty || 'General Practitioner'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Qualification</Label>
                      <p className="text-sm">{selectedDoctor.qualification || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">About</Label>
                    <p className="text-sm text-muted-foreground">{selectedDoctor.about || 'Not provided'}</p>
                  </div>
                  
                  {/* Languages */}
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Languages Spoken</Label>
                    {selectedDoctor.languages && selectedDoctor.languages.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedDoctor.languages.map((language, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Not provided</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Current Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedDoctor.currentAddress ? (
                      <>
                        <p className="text-sm">{selectedDoctor.currentAddress.street}</p>
                        <p className="text-sm">
                          {selectedDoctor.currentAddress.city}, {selectedDoctor.currentAddress.state} {selectedDoctor.currentAddress.zipCode}
                        </p>
                        <p className="text-sm">{selectedDoctor.currentAddress.country}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      Permanent Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedDoctor.permanentAddress ? (
                      <>
                        <p className="text-sm">{selectedDoctor.permanentAddress.street}</p>
                        <p className="text-sm">
                          {selectedDoctor.permanentAddress.city}, {selectedDoctor.permanentAddress.state} {selectedDoctor.permanentAddress.zipCode}
                        </p>
                        <p className="text-sm">{selectedDoctor.permanentAddress.country}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not provided</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Account Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                      <p className="text-sm">{selectedDoctor.createdAt ? new Date(selectedDoctor.createdAt).toLocaleDateString() : 'Not available'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p className="text-sm">{selectedDoctor.updatedAt ? new Date(selectedDoctor.updatedAt).toLocaleDateString() : 'Not available'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDoctorViewOpen(false)}>
              Close
            </Button>
            {selectedDoctor && (
              <div className="flex gap-2">
                {selectedDoctor.isActive ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeactivateDoctor(selectedDoctor._id, selectedDoctor.fullName);
                      setIsDoctorViewOpen(false);
                    }}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => {
                      handleActivateDoctor(selectedDoctor._id, selectedDoctor.fullName);
                      setIsDoctorViewOpen(false);
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Activate
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorsManagement;
