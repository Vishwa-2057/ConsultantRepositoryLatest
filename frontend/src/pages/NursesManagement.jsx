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
import { 
  Heart, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Clock,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  Building,
  GraduationCap,
  Shield,
  Briefcase,
  FileText,
  UserX,
  UserPlus,
  X,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { nurseAPI } from '../services/api';
import { getImageUrl } from '@/utils/imageUtils';
// Removed direct Cloudinary import - now using backend upload endpoint

// Password validation function
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  if (password.length < minLength) {
    return {
      isValid: false,
      message: `Password must be at least ${minLength} characters long.`
    };
  }
  
  if (!hasUpperCase) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter (A-Z)."
    };
  }
  
  if (!hasLowerCase) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter (a-z)."
    };
  }
  
  if (!hasNumber) {
    return {
      isValid: false,
      message: "Password must contain at least one number (0-9)."
    };
  }
  
  if (!hasSpecialChar) {
    return {
      isValid: false,
      message: "Password must contain at least one special character (!@#$%^&*...)."
    };
  }
  
  return {
    isValid: true,
    message: "Strong password!"
  };
};

// Calculate password strength score
const calculatePasswordStrength = (password) => {
  if (!password) {
    return { score: 0, message: '', color: '' };
  }
  
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  // Calculate score
  if (checks.length) score++;
  if (checks.uppercase) score++;
  if (checks.lowercase) score++;
  if (checks.number) score++;
  if (checks.special) score++;
  
  // Determine strength message and color
  if (score === 5) {
    return { score: 5, message: 'Strong password', color: 'text-green-600' };
  } else if (score >= 3) {
    return { score, message: 'Medium strength', color: 'text-yellow-600' };
  } else {
    return { score, message: 'Weak password', color: 'text-red-600' };
  }
};

const NursesManagement = () => {
  const [nurses, setNurses] = useState([]);
  const [nursesLoading, setNursesLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [departmentComboboxOpen, setDepartmentComboboxOpen] = useState(false);
  const [isNurseViewOpen, setIsNurseViewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('nursesManagement_pageSize');
    return saved ? parseInt(saved) : 20;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [nurseForm, setNurseForm] = useState({
    fullName: "",
    uhid: "",
    profileImage: "",
    email: "",
    password: "",
    department: ["General Nursing"],
    shift: "Day",
    phone: "",
    licenseNumber: "",
    experience: 0,
    role: "nurse"
  });

  const { toast } = useToast();

  // Filter nurses based on search query and status
  const filteredNurses = nurses.filter(nurse => {
    // Status filter
    if (statusFilter === 'active' && !nurse.isActive) return false;
    if (statusFilter === 'inactive' && nurse.isActive) return false;
    return true;
  });

  // Calculate pagination for filtered results
  const filteredTotalCount = filteredNurses.length;
  const filteredTotalPages = Math.ceil(filteredTotalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedNurses = filteredNurses.slice(startIndex, endIndex);

  // Load nurses
  const loadNurses = async () => {
    try {
      setNursesLoading(true);
      const filters = {};
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      
      // Load all nurses for client-side pagination and filtering
      const response = await nurseAPI.getAll(1, 999999, filters);
      if (response.success) {
        const allNurses = response.data || [];
        setNurses(allNurses);
        setTotalCount(allNurses.length);
        
        // Calculate active/inactive counts
        setActiveCount(allNurses.filter(n => n.isActive).length);
        setInactiveCount(allNurses.filter(n => !n.isActive).length);
      } else {
        toast({
          title: "Error",
          description: "Failed to load nurses",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading nurses:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load nurses",
        variant: "destructive"
      });
    } finally {
      setNursesLoading(false);
    }
  };

  // Save pageSize to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('nursesManagement_pageSize', pageSize.toString());
  }, [pageSize, isInitialLoad]);

  useEffect(() => {
    loadNurses();
  }, [searchQuery]);

  // Reset to page 1 when search query or status filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, statusFilter]);

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
      const response = await nurseAPI.uploadImage(imageFile);
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

  // Handle add nurse
  const handleAddNurse = async () => {
    // Validate required fields according to Nurse model
    const requiredFields = [
      { field: 'fullName', name: 'Full Name' },
      { field: 'uhid', name: 'UHID' },
      { field: 'email', name: 'Email' },
      { field: 'password', name: 'Password' }
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

    // Check basic required fields
    for (const { field, name } of requiredFields) {
      if (!nurseForm[field] || nurseForm[field].toString().trim() === '') {
        toast({
          title: "Validation Error",
          description: `${name} is required`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(nurseForm.password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Weak Password",
        description: passwordValidation.message,
        variant: "destructive"
      });
      return;
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

      // Create nurse data with uploaded image URL
      const nurseData = {
        ...nurseForm,
        profileImage: profileImageUrl
      };

      const response = await nurseAPI.createWithImage(nurseData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Nurse added successfully",
        });
        setIsAddModalOpen(false);
        
        // Reload the page to refresh the data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        setNurseForm({
          fullName: "",
          uhid: "",
          profileImage: "",
          email: "",
          password: "",
          department: ["General Nursing"],
          shift: "Day",
          phone: "",
          licenseNumber: "",
          experience: 0,
          role: "nurse"
        });
        // Reset image states
        setSelectedImage(null);
        setImagePreview(null);
        // Reset password strength
        setPasswordStrength({ score: 0, message: '', color: '' });
        loadNurses();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to add nurse",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding nurse:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add nurse",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle activate nurse
  const handleActivateNurse = async (nurseId, nurseName) => {
    try {
      const response = await nurseAPI.activate(nurseId);
      if (response.success) {
        toast({
          title: "Success",
          description: `${nurseName} has been activated`,
        });
        loadNurses();
      } else {
        toast({
          title: "Error",
          description: "Failed to activate nurse",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error activating nurse:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate nurse",
        variant: "destructive"
      });
    }
  };

  // Handle deactivate nurse
  const handleDeactivateNurse = async (nurseId, nurseName) => {
    try {
      const response = await nurseAPI.deactivate(nurseId);
      if (response.success) {
        toast({
          title: "Success",
          description: `${nurseName} has been deactivated`,
        });
        loadNurses();
      } else {
        toast({
          title: "Error",
          description: "Failed to deactivate nurse",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deactivating nurse:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate nurse",
        variant: "destructive"
      });
    }
  };

  // Handle nurse card click to show expanded view
  const handleNurseClick = (nurse) => {
    setSelectedNurse(nurse);
    setIsNurseViewOpen(true);
  };

  // Available departments
  const departments = [
    "Emergency",
    "ICU",
    "Surgery",
    "Pediatrics",
    "Maternity",
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "General Ward",
    "Outpatient",
    "Radiology",
    "Laboratory"
  ];

  // Available shifts (from Nurse model enum)
  const shifts = [
    "Day",
    "Night", 
    "Evening",
    "Rotating"
  ];

  // Available roles (from Nurse model enum)
  const roles = [
    "nurse",
    "head_nurse",
    "supervisor"
  ];

  return (
    <div className="p-6 space-y-6">

      {/* Search, Stats and Actions - Single Line */}
      <div className="flex items-center justify-between gap-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search nurses by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Status Filter */}
        <div className="flex-shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-10 bg-white border-gray-200 rounded-lg shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Stats */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-full">
              <Heart className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">
              Total: {nurses.length}
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
        
        {/* Add Nurse Button */}
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Nurse
        </Button>
      </div>

      {/* Nurses List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Nurses List</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {filteredNurses.length}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {filteredTotalCount > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}-{Math.min(currentPage * pageSize, filteredTotalCount)} of {filteredTotalCount}
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
          {nursesLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading nurses...</p>
            </div>
          ) : filteredNurses.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? "No nurses found matching your filters." 
                  : "No nurses found."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Headers */}
              <div className="bg-gray-100 rounded-lg p-4 mb-2">
                <div className="flex items-center justify-between gap-6">
                  <div className="w-12 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Photo</span>
                  </div>
                  <div className="w-40 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Name & UHID</span>
                  </div>
                  <div className="w-40 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Department</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Email</span>
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Phone</span>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Status</span>
                  </div>
                  <div className="w-24 flex-shrink-0 text-right">
                    <span className="text-xs font-semibold text-gray-600 uppercase">Actions</span>
                  </div>
                </div>
              </div>
              
              {paginatedNurses.map((nurse) => (
                <div 
                  key={nurse._id} 
                  className={`bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-all duration-200 cursor-pointer ${!nurse.isActive ? 'opacity-75' : ''}`}
                  onClick={() => handleNurseClick(nurse)}
                >
                  <div className="flex items-center justify-between gap-6">
                    {/* Nurse Avatar - Fixed width */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {nurse.profileImage ? (
                        <img 
                          src={getImageUrl(nurse.profileImage)}
                          alt={nurse.fullName}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center ${nurse.profileImage ? 'hidden' : ''}`}>
                        <Heart className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    {/* Nurse Name - Fixed width */}
                    <div className="w-40 flex-shrink-0">
                      <h3 className="font-semibold text-foreground text-sm truncate">{nurse.fullName}</h3>
                      {nurse.uhid && (
                        <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                          {nurse.uhid}
                        </p>
                      )}
                    </div>
                    
                    {/* Department - Fixed width */}
                    <div className="w-40 flex-shrink-0">
                      {Array.isArray(nurse.department) ? (
                        <div className="flex flex-wrap gap-1">
                          {nurse.department.slice(0, 2).map((dept, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                              {dept}
                            </Badge>
                          ))}
                          {nurse.department.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-0">
                              +{nurse.department.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground truncate">{nurse.department || 'General'}</p>
                      )}
                    </div>
                    
                    {/* Email - Flexible width */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{nurse.email}</span>
                      </div>
                    </div>
                    
                    {/* Phone - Fixed width */}
                    <div className="w-32 flex-shrink-0">
                      {nurse.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{nurse.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status - Fixed width */}
                    <div className="w-24 flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        <Badge variant={nurse.isActive ? 'default' : 'destructive'} className="text-xs">
                          {nurse.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Actions - Fixed width */}
                    <div className="w-32 flex-shrink-0 flex items-center justify-end gap-2">
                      {nurse.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivateNurse(nurse._id, nurse.fullName);
                          }}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateNurse(nurse._id, nurse.fullName);
                          }}
                        >
                          Activate
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
      {filteredTotalPages > 1 && (
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
              {Array.from({ length: Math.min(5, filteredTotalPages) }, (_, i) => {
                let pageNum;
                if (filteredTotalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= filteredTotalPages - 2) {
                  pageNum = filteredTotalPages - 4 + i;
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, filteredTotalPages))}
              disabled={currentPage === filteredTotalPages}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(filteredTotalPages)}
              disabled={currentPage === filteredTotalPages}
              className="h-10 px-4 text-sm bg-white border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Add Nurse Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          {/* Loading Overlay */}
          {(submitting || uploadingImage) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-lg font-semibold text-gray-900">
                  {uploadingImage ? "Uploading Image..." : "Adding Nurse..."}
                </p>
                <p className="text-sm text-gray-600">Please wait, do not close this window</p>
              </div>
            </div>
          )}
          
          <DialogHeader>
            <DialogTitle>Add New Nurse</DialogTitle>
            <DialogDescription>
              Complete all required fields to register a new nurse in the system.
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
                    value={nurseForm.fullName}
                    onChange={(e) => setNurseForm({...nurseForm, fullName: e.target.value})}
                    placeholder="Nurse Jane Smith"
                    maxLength={100}
                    disabled={submitting || uploadingImage}
                  />
                </div>
                <div>
                  <Label htmlFor="uhid">UHID (Unique Hospital ID) *</Label>
                  <Input
                    id="uhid"
                    value={nurseForm.uhid}
                    onChange={(e) => setNurseForm({...nurseForm, uhid: e.target.value.toUpperCase()})}
                    placeholder="NUR001"
                    maxLength={50}
                    style={{ textTransform: 'uppercase' }}
                    disabled={submitting || uploadingImage}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={nurseForm.email}
                    onChange={(e) => setNurseForm({...nurseForm, email: e.target.value})}
                    placeholder="nurse@hospital.com"
                    disabled={submitting || uploadingImage}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={nurseForm.phone}
                    onChange={(e) => setNurseForm({...nurseForm, phone: e.target.value})}
                    placeholder="+91 98765 43210"
                    disabled={submitting || uploadingImage}
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="department">Departments (Multiple Selection) *</Label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50 min-h-[42px]">
                      {nurseForm.department.map((dept) => (
                        <Badge 
                          key={dept} 
                          variant="secondary" 
                          className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1"
                        >
                          {dept}
                          <button
                            type="button"
                            onClick={() => {
                              const newDepts = nurseForm.department.filter(d => d !== dept);
                              if (newDepts.length > 0) {
                                setNurseForm({...nurseForm, department: newDepts});
                              } else {
                                toast({
                                  title: "Validation Error",
                                  description: "At least one department must be selected",
                                  variant: "destructive"
                                });
                              }
                            }}
                            disabled={submitting || uploadingImage}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      {nurseForm.department.length === 0 && (
                        <span className="text-sm text-gray-400">No departments selected</span>
                      )}
                    </div>
                    <Popover open={departmentComboboxOpen} onOpenChange={setDepartmentComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={departmentComboboxOpen}
                          className="w-full justify-between"
                          disabled={submitting || uploadingImage}
                        >
                          Add department...
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                        <Command>
                          <CommandInput placeholder="Search departments..." />
                          <CommandList className="max-h-[300px] overflow-y-auto">
                            <CommandEmpty>No department found.</CommandEmpty>
                            <CommandGroup>
                              {departments.filter(dept => !nurseForm.department.includes(dept)).map((dept) => (
                                <CommandItem
                                  key={dept}
                                  value={dept}
                                  onSelect={() => {
                                    if (!nurseForm.department.includes(dept)) {
                                      setNurseForm({...nurseForm, department: [...nurseForm.department, dept]});
                                    }
                                    setDepartmentComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      nurseForm.department.includes(dept) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {dept}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Select multiple departments where this nurse will work
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={nurseForm.licenseNumber}
                    onChange={(e) => setNurseForm({...nurseForm, licenseNumber: e.target.value})}
                    placeholder="RN123456"
                    disabled={submitting || uploadingImage}
                  />
                </div>
                <div>
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={nurseForm.experience}
                    onChange={(e) => setNurseForm({...nurseForm, experience: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    disabled={submitting || uploadingImage}
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
                      disabled={submitting || uploadingImage}
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

            {/* Account Security */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Security</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={nurseForm.password}
                      onChange={(e) => {
                        const newPassword = e.target.value;
                        setNurseForm({...nurseForm, password: newPassword});
                        setPasswordStrength(calculatePasswordStrength(newPassword));
                      }}
                      placeholder="Enter secure password"
                      disabled={submitting || uploadingImage}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={submitting || uploadingImage}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {nurseForm.password && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              passwordStrength.score === 5 ? 'bg-green-500' :
                              passwordStrength.score >= 3 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${passwordStrength.color}`}>
                          {passwordStrength.message}
                        </span>
                      </div>
                      
                      {/* Password Requirements Checklist */}
                      <div className="text-xs space-y-1 text-gray-600">
                        <div className={`flex items-center gap-1 ${nurseForm.password.length >= 8 ? 'text-green-600' : ''}`}>
                          {nurseForm.password.length >= 8 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>At least 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[A-Z]/.test(nurseForm.password) ? 'text-green-600' : ''}`}>
                          {/[A-Z]/.test(nurseForm.password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>One uppercase letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[a-z]/.test(nurseForm.password) ? 'text-green-600' : ''}`}>
                          {/[a-z]/.test(nurseForm.password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>One lowercase letter (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[0-9]/.test(nurseForm.password) ? 'text-green-600' : ''}`}>
                          {/[0-9]/.test(nurseForm.password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>One number (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(nurseForm.password) ? 'text-green-600' : ''}`}>
                          {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(nurseForm.password) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          <span>One special character (!@#$%...)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={submitting || uploadingImage}>
              Cancel
            </Button>
            <Button onClick={handleAddNurse} disabled={submitting || uploadingImage}>
              {uploadingImage ? "Uploading Image..." : submitting ? "Adding Nurse..." : "Add Nurse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nurse Expanded View Modal */}
      <Dialog open={isNurseViewOpen} onOpenChange={setIsNurseViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                {selectedNurse?.profileImage ? (
                  <img 
                    src={getImageUrl(selectedNurse.profileImage)}
                    alt={selectedNurse.fullName}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{selectedNurse?.fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  {Array.isArray(selectedNurse?.department) 
                    ? selectedNurse.department.join(', ') 
                    : (selectedNurse?.department || 'General Nursing')}
                </p>
              </div>
              <Badge variant={selectedNurse?.isActive ? 'default' : 'destructive'} className="ml-auto">
                {selectedNurse?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedNurse && (
            <div className="space-y-6 py-4">
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
                      <p className="text-sm font-medium">{selectedNurse.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">UHID</Label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{selectedNurse.uhid}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <Badge variant={selectedNurse.role === 'head_nurse' || selectedNurse.role === 'supervisor' ? 'default' : 'secondary'} className="ml-2">
                        {selectedNurse.role === 'head_nurse' ? 'Head Nurse' : 
                         selectedNurse.role === 'supervisor' ? 'Supervisor' : 'Nurse'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={selectedNurse.isActive ? 'default' : 'destructive'} className="ml-2">
                        {selectedNurse.isActive ? 'Active' : 'Inactive'}
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
                      <p className="text-sm">{selectedNurse.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-sm">{selectedNurse.phone || 'Not provided'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Professional Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <Label className="text-sm font-medium text-muted-foreground">Departments</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Array.isArray(selectedNurse.department) ? (
                          selectedNurse.department.map((dept, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-700">
                              {dept}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            {selectedNurse.department || 'General Nursing'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Experience</Label>
                      <p className="text-sm">{selectedNurse.experience || 0} years</p>
                    </div>
                  </div>
                  {selectedNurse.licenseNumber && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{selectedNurse.licenseNumber}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Work Schedule & Availability */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Work Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Department Assignments</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Array.isArray(selectedNurse.department) ? (
                        selectedNurse.department.map((dept, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {dept}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {selectedNurse.department || 'General Nursing'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                      <p className="text-sm">{selectedNurse.createdAt ? new Date(selectedNurse.createdAt).toLocaleDateString('en-GB') : 'Not available'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p className="text-sm">{selectedNurse.updatedAt ? new Date(selectedNurse.updatedAt).toLocaleDateString('en-GB') : 'Not available'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNurseViewOpen(false)}>
              Close
            </Button>
            {selectedNurse && (
              <div className="flex gap-2">
                {selectedNurse.isActive ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeactivateNurse(selectedNurse._id, selectedNurse.fullName);
                      setIsNurseViewOpen(false);
                    }}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => {
                      handleActivateNurse(selectedNurse._id, selectedNurse.fullName);
                      setIsNurseViewOpen(false);
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

export default NursesManagement;
