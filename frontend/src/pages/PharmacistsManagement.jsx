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
  Pill, 
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
import { pharmacistAPI } from '../services/api';
import { getImageUrl } from '@/utils/imageUtils';
// Removed direct Cloudinary import - now using backend upload endpoint

const PharmacistsManagement = () => {
  const [pharmacists, setPharmacists] = useState([]);
  const [pharmacistsLoading, setPharmacistsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedPharmacist, setSelectedPharmacist] = useState(null);
  const [isPharmacistViewOpen, setIsPharmacistViewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('pharmacistsManagement_pageSize');
    return saved ? parseInt(saved) : 20;
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [pharmacistForm, setPharmacistForm] = useState({
    fullName: "",
    uhid: "",
    profileImage: "",
    email: "",
    password: "",
    specialization: "General Pharmacy",
    shift: "Day",
    phone: "",
    licenseNumber: "",
    experience: 0,
    role: "pharmacist"
  });

  const { toast } = useToast();

  // Filter pharmacists based on search query and status
  const filteredPharmacists = pharmacists.filter(pharmacist => {
    // Status filter
    if (statusFilter === 'active' && !pharmacist.isActive) return false;
    if (statusFilter === 'inactive' && pharmacist.isActive) return false;
    return true;
  });

  // Calculate pagination for filtered results
  const filteredTotalCount = filteredPharmacists.length;
  const filteredTotalPages = Math.ceil(filteredTotalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedPharmacists = filteredPharmacists.slice(startIndex, endIndex);

  // Load pharmacists
  const loadPharmacists = async () => {
    try {
      setPharmacistsLoading(true);
      const filters = {};
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      
      // Load all pharmacists for client-side pagination and filtering
      const response = await pharmacistAPI.getAll(1, 999999, filters);
      if (response.success) {
        const allPharmacists = response.data || [];
        setPharmacists(allPharmacists);
        setTotalCount(allPharmacists.length);
        
        // Calculate active/inactive counts
        setActiveCount(allPharmacists.filter(p => p.isActive).length);
        setInactiveCount(allPharmacists.filter(p => !p.isActive).length);
      } else {
        toast({
          title: "Error",
          description: "Failed to load pharmacists",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading pharmacists:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load pharmacists",
        variant: "destructive"
      });
    } finally {
      setPharmacistsLoading(false);
    }
  };

  // Save pageSize to localStorage when it changes (skip initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    localStorage.setItem('pharmacistsManagement_pageSize', pageSize.toString());
  }, [pageSize, isInitialLoad]);

  useEffect(() => {
    loadPharmacists();
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
      const response = await pharmacistAPI.uploadImage(imageFile);
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

  // Handle add pharmacist
  const handleAddPharmacist = async () => {
    // Validate required fields according to Pharmacist model
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
      if (!pharmacistForm[field] || pharmacistForm[field].toString().trim() === '') {
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

      // Create pharmacist data with uploaded image URL
      const pharmacistData = {
        ...pharmacistForm,
        profileImage: profileImageUrl
      };

      const response = await pharmacistAPI.createWithImage(pharmacistData);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Pharmacist added successfully",
        });
        setIsAddModalOpen(false);
        
        // Reload the page to refresh the data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        setPharmacistForm({
          fullName: "",
          uhid: "",
          profileImage: "",
          email: "",
          password: "",
          specialization: "General Pharmacy",
          shift: "Day",
          phone: "",
          licenseNumber: "",
          experience: 0,
          role: "pharmacist"
        });
        // Reset image states
        setSelectedImage(null);
        setImagePreview(null);
        loadPharmacists();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to add pharmacist",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding pharmacist:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add pharmacist",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle activate pharmacist
  const handleActivatePharmacist = async (pharmacistId, pharmacistName) => {
    try {
      const response = await pharmacistAPI.activate(pharmacistId);
      if (response.success) {
        toast({
          title: "Success",
          description: `${pharmacistName} has been activated`,
        });
        loadPharmacists();
      } else {
        toast({
          title: "Error",
          description: "Failed to activate pharmacist",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error activating pharmacist:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate pharmacist",
        variant: "destructive"
      });
    }
  };

  // Handle deactivate pharmacist
  const handleDeactivatePharmacist = async (pharmacistId, pharmacistName) => {
    try {
      const response = await pharmacistAPI.deactivate(pharmacistId);
      if (response.success) {
        toast({
          title: "Success",
          description: `${pharmacistName} has been deactivated`,
        });
        loadPharmacists();
      } else {
        toast({
          title: "Error",
          description: "Failed to deactivate pharmacist",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deactivating pharmacist:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate pharmacist",
        variant: "destructive"
      });
    }
  };

  // Handle pharmacist card click to show expanded view
  const handlePharmacistClick = (pharmacist) => {
    setSelectedPharmacist(pharmacist);
    setIsPharmacistViewOpen(true);
  };

  // Available specializations
  const specializations = [
    "General Pharmacy",
    "Clinical Pharmacy",
    "Hospital Pharmacy",
    "Community Pharmacy",
    "Industrial Pharmacy",
    "Pharmaceutical Chemistry",
    "Pharmacology",
    "Pharmacognosy",
    "Pharmaceutical Technology"
  ];

  // Available shifts (from Pharmacist model enum)
  const shifts = [
    "Day",
    "Night", 
    "Evening",
    "Rotating"
  ];

  // Available roles (from Pharmacist model enum)
  const roles = [
    "pharmacist",
    "head_pharmacist",
    "pharmacy_manager"
  ];

  return (
    <div className="p-6 space-y-6">

      {/* Search, Stats and Actions - Single Line */}
      <div className="flex items-center justify-between gap-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search pharmacists by name, email, or specialization..."
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
              <Pill className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-blue-600 font-medium">
              Total: {pharmacists.length}
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
        
        {/* Add Pharmacist Button */}
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Pharmacist
        </Button>
      </div>

      {/* Pharmacists List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">Pharmacists List</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 border-0">
                  {filteredPharmacists.length}
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
          {pharmacistsLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading pharmacists...</p>
            </div>
          ) : filteredPharmacists.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? "No pharmacists found matching your filters." 
                  : "No pharmacists found."}
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
                    <span className="text-xs font-semibold text-gray-600 uppercase">Specialization</span>
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
              
              {paginatedPharmacists.map((pharmacist) => (
                <div 
                  key={pharmacist._id} 
                  className={`bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition-all duration-200 cursor-pointer ${!pharmacist.isActive ? 'opacity-75' : ''}`}
                  onClick={() => handlePharmacistClick(pharmacist)}
                >
                  <div className="flex items-center justify-between gap-6">
                    {/* Pharmacist Avatar - Fixed width */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {pharmacist.profileImage ? (
                        <img 
                          src={getImageUrl(pharmacist.profileImage)}
                          alt={pharmacist.fullName}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center ${pharmacist.profileImage ? 'hidden' : ''}`}>
                        <Pill className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    
                    {/* Pharmacist Name - Fixed width */}
                    <div className="w-40 flex-shrink-0">
                      <h3 className="font-semibold text-foreground text-sm truncate">{pharmacist.fullName}</h3>
                      {pharmacist.uhid && (
                        <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                          {pharmacist.uhid}
                        </p>
                      )}
                    </div>
                    
                    {/* Specialization - Fixed width */}
                    <div className="w-40 flex-shrink-0">
                      <p className="text-sm text-muted-foreground truncate">{pharmacist.specialization || 'General Pharmacy'}</p>
                    </div>
                    
                    {/* Email - Flexible width */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{pharmacist.email}</span>
                      </div>
                    </div>
                    
                    {/* Phone - Fixed width */}
                    <div className="w-32 flex-shrink-0">
                      {pharmacist.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{pharmacist.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status - Fixed width */}
                    <div className="w-24 flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        <Badge variant={pharmacist.isActive ? 'default' : 'destructive'} className="text-xs">
                          {pharmacist.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Actions - Fixed width */}
                    <div className="w-32 flex-shrink-0 flex items-center justify-end gap-2">
                      {pharmacist.isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivatePharmacist(pharmacist._id, pharmacist.fullName);
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
                            handleActivatePharmacist(pharmacist._id, pharmacist.fullName);
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

      {/* Add Pharmacist Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          {/* Loading Overlay */}
          {(submitting || uploadingImage) && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-lg font-semibold text-gray-900">
                  {uploadingImage ? "Uploading Image..." : "Adding Pharmacist..."}
                </p>
                <p className="text-sm text-gray-600">Please wait, do not close this window</p>
              </div>
            </div>
          )}
          {/* Rest of the code remains the same */}
          
          <DialogHeader>
            <DialogTitle>Add New Pharmacist</DialogTitle>
            <DialogDescription>
              Complete all required fields to register a new pharmacist in the system.
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
                    value={pharmacistForm.fullName}
                    onChange={(e) => setPharmacistForm({...pharmacistForm, fullName: e.target.value})}
                    placeholder="Pharmacist Jane Smith"
                    maxLength={100}
                    disabled={submitting || uploadingImage}
                  />
                </div>
                <div>
                  <Label htmlFor="uhid">UHID (Unique Hospital ID) *</Label>
                  <Input
                    id="uhid"
                    value={pharmacistForm.uhid}
                    onChange={(e) => setPharmacistForm({...pharmacistForm, uhid: e.target.value.toUpperCase()})}
                    placeholder="PHA001"
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
                    value={pharmacistForm.email}
                    onChange={(e) => setPharmacistForm({...pharmacistForm, email: e.target.value})}
                    placeholder="pharmacist@hospital.com"
                    disabled={submitting || uploadingImage}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={pharmacistForm.phone}
                    onChange={(e) => setPharmacistForm({...pharmacistForm, phone: e.target.value})}
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
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select 
                    value={pharmacistForm.specialization} 
                    onValueChange={(value) => setPharmacistForm({...pharmacistForm, specialization: value})}
                    disabled={submitting || uploadingImage}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={pharmacistForm.licenseNumber}
                    onChange={(e) => setPharmacistForm({...pharmacistForm, licenseNumber: e.target.value})}
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
                    value={pharmacistForm.experience}
                    onChange={(e) => setPharmacistForm({...pharmacistForm, experience: parseInt(e.target.value) || 0})}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={pharmacistForm.password}
                      onChange={(e) => setPharmacistForm({...pharmacistForm, password: e.target.value})}
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
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={submitting || uploadingImage}>
              Cancel
            </Button>
            <Button onClick={handleAddPharmacist} disabled={submitting || uploadingImage}>
              {uploadingImage ? "Uploading Image..." : submitting ? "Adding Pharmacist..." : "Add Pharmacist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pharmacist Expanded View Modal */}
      <Dialog open={isPharmacistViewOpen} onOpenChange={setIsPharmacistViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                {selectedPharmacist?.profileImage ? (
                  <img 
                    src={getImageUrl(selectedPharmacist.profileImage)}
                    alt={selectedPharmacist.fullName}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{selectedPharmacist?.fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedPharmacist?.specialization || 'General Pharmacy'}
                </p>
              </div>
              <Badge variant={selectedPharmacist?.isActive ? 'default' : 'destructive'} className="ml-auto">
                {selectedPharmacist?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedPharmacist && (
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
                      <p className="text-sm font-medium">{selectedPharmacist.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">UHID</Label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{selectedPharmacist.uhid}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                      <Badge variant={selectedPharmacist.role === 'head_pharmacist' || selectedPharmacist.role === 'pharmacy_manager' ? 'default' : 'secondary'} className="ml-2">
                        {selectedPharmacist.role === 'head_pharmacist' ? 'Head Pharmacist' : 
                         selectedPharmacist.role === 'pharmacy_manager' ? 'Pharmacy Manager' : 'Pharmacist'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge variant={selectedPharmacist.isActive ? 'default' : 'destructive'} className="ml-2">
                        {selectedPharmacist.isActive ? 'Active' : 'Inactive'}
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
                      <p className="text-sm">{selectedPharmacist.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-sm">{selectedPharmacist.phone || 'Not provided'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Professional Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <Label className="text-sm font-medium text-muted-foreground">Specialization</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {selectedPharmacist.specialization || 'General Pharmacy'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Experience</Label>
                      <p className="text-sm">{selectedPharmacist.experience || 0} years</p>
                    </div>
                  </div>
                  {selectedPharmacist.licenseNumber && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">License Number</Label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded inline-block">{selectedPharmacist.licenseNumber}</p>
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
                    <Label className="text-sm font-medium text-muted-foreground">Shift</Label>
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      <Clock className="w-3 h-3" />
                      {selectedPharmacist.shift || 'Day'}
                    </Badge>
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
                      <p className="text-sm">{selectedPharmacist.createdAt ? new Date(selectedPharmacist.createdAt).toLocaleDateString('en-GB') : 'Not available'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                      <p className="text-sm">{selectedPharmacist.updatedAt ? new Date(selectedPharmacist.updatedAt).toLocaleDateString('en-GB') : 'Not available'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPharmacistViewOpen(false)}>
              Close
            </Button>
            {selectedPharmacist && (
              <div className="flex gap-2">
                {selectedPharmacist.isActive ? (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeactivatePharmacist(selectedPharmacist._id, selectedPharmacist.fullName);
                      setIsPharmacistViewOpen(false);
                    }}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={() => {
                      handleActivatePharmacist(selectedPharmacist._id, selectedPharmacist.fullName);
                      setIsPharmacistViewOpen(false);
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

export default PharmacistsManagement;
