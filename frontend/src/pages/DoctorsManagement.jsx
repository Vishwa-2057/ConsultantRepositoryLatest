import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Calendar,
  MapPin,
  Award,
  Clock,
  User,
  Building,
  GraduationCap,
  UserX,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doctorAPI } from "@/services/api";

const DoctorsManagement = () => {
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedDoctors, setExpandedDoctors] = useState(new Set());
  
  const [doctorForm, setDoctorForm] = useState({
    fullName: "",
    email: "",
    password: "",
    specialty: "",
    phone: "",
    role: "doctor",
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
    about: ""
  });
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formErrors, setFormErrors] = useState({});
  
  const { toast } = useToast();

  // Load doctors from API
  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      console.log('Loading doctors...');
      console.log('Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
      console.log('Current user:', JSON.parse(localStorage.getItem('authUser') || '{}'));
      
      const response = await doctorAPI.getAll();
      console.log('Doctors API response:', response);
      
      // Backend returns { success: true, data: [...] }
      setDoctors(response.data || []);
      console.log('Doctors set:', response.data?.length || 0, 'doctors');
    } catch (error) {
      console.error('Failed to load doctors:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast({
        title: "Error",
        description: "Failed to load doctors. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDoctorsLoading(false);
    }
  };

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setDoctorForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Handle nested address changes
  const handleAddressChange = (addressType, field, value) => {
    setDoctorForm(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: value
      }
    }));
    if (formErrors[`${addressType}.${field}`]) {
      setFormErrors(prev => ({ ...prev, [`${addressType}.${field}`]: "" }));
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setFormErrors(prev => ({ ...prev, profileImage: "Please select a valid image file (JPEG, PNG, GIF, WebP)" }));
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({ ...prev, profileImage: "Image size must be less than 5MB" }));
        return;
      }
      
      setSelectedImage(file);
      setFormErrors(prev => ({ ...prev, profileImage: "" }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!doctorForm.fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    
    if (!doctorForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(doctorForm.email)) {
      errors.email = "Please enter a valid email";
    }
    
    if (!doctorForm.password.trim()) {
      errors.password = "Password is required";
    } else if (doctorForm.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    if (doctorForm.phone && doctorForm.phone.length < 10) {
      errors.phone = "Phone number must be at least 10 digits";
    }
    
    if (!selectedImage) {
      errors.profileImage = "Profile image is required";
    }
    
    if (!doctorForm.uhid.trim()) {
      errors.uhid = "UHID is required";
    }
    
    if (!doctorForm.qualification.trim()) {
      errors.qualification = "Qualification is required";
    }
    
    // Current Address validation
    if (!doctorForm.currentAddress.street.trim()) {
      errors['currentAddress.street'] = "Current address street is required";
    }
    if (!doctorForm.currentAddress.city.trim()) {
      errors['currentAddress.city'] = "Current address city is required";
    }
    if (!doctorForm.currentAddress.state.trim()) {
      errors['currentAddress.state'] = "Current address state is required";
    }
    if (!doctorForm.currentAddress.zipCode.trim()) {
      errors['currentAddress.zipCode'] = "Current address zip code is required";
    }
    
    // Permanent Address validation
    if (!doctorForm.permanentAddress.street.trim()) {
      errors['permanentAddress.street'] = "Permanent address street is required";
    }
    if (!doctorForm.permanentAddress.city.trim()) {
      errors['permanentAddress.city'] = "Permanent address city is required";
    }
    if (!doctorForm.permanentAddress.state.trim()) {
      errors['permanentAddress.state'] = "Permanent address state is required";
    }
    if (!doctorForm.permanentAddress.zipCode.trim()) {
      errors['permanentAddress.zipCode'] = "Permanent address zip code is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('fullName', doctorForm.fullName);
      formData.append('email', doctorForm.email);
      formData.append('password', doctorForm.password);
      formData.append('specialty', doctorForm.specialty || '');
      formData.append('phone', doctorForm.phone || '');
      formData.append('role', doctorForm.role);
      formData.append('uhid', doctorForm.uhid);
      formData.append('qualification', doctorForm.qualification);
      formData.append('currentAddress', JSON.stringify(doctorForm.currentAddress));
      formData.append('permanentAddress', JSON.stringify(doctorForm.permanentAddress));
      formData.append('about', doctorForm.about || '');
      formData.append('profileImage', selectedImage);
      
      // Debug logging
      console.log('Form data being sent:');
      for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
      }
      
      const response = await doctorAPI.create(formData);
      
      toast({
        title: "Success",
        description: response.message || "Doctor added successfully!"
      });
      
      // Reset form and close modal
      setDoctorForm({
        fullName: "",
        email: "",
        password: "",
        specialty: "",
        phone: "",
        role: "doctor",
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
        about: ""
      });
      setFormErrors({});
      setSelectedImage(null);
      setImagePreview(null);
      setIsAddModalOpen(false);
      
      // Reload doctors list
      await loadDoctors();
    } catch (error) {
      console.error('Failed to create doctor:', error);
      
      // Handle validation errors from backend
      if (error.message && error.message.includes('already exists')) {
        if (error.message.includes('email')) {
          setFormErrors({ email: "A doctor with this email already exists" });
        } else if (error.message.includes('UHID')) {
          setFormErrors({ uhid: "A doctor with this UHID already exists" });
        }
      } else if (error.message && error.message.includes('Validation failed')) {
        // Try to extract specific validation errors
        const errorMsg = error.data?.details || error.message;
        toast({
          title: "Validation Error",
          description: Array.isArray(errorMsg) ? errorMsg.map(e => e.msg || e).join(', ') : (errorMsg || "Please check all required fields"),
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create doctor. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle doctor activation
  const handleActivateDoctor = async (doctorId, doctorName) => {
    if (!confirm(`Are you sure you want to activate ${doctorName}?`)) return;
    
    try {
      const response = await doctorAPI.activate(doctorId);
      toast({
        title: "Success",
        description: response.message || "Doctor activated successfully"
      });
      await loadDoctors();
    } catch (error) {
      console.error('Failed to activate doctor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate doctor. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle doctor deactivation
  const handleDeactivateDoctor = async (doctorId, doctorName) => {
    if (!confirm(`Are you sure you want to deactivate ${doctorName}? They will no longer be able to access the system.`)) return;
    
    try {
      const response = await doctorAPI.deactivate(doctorId);
      toast({
        title: "Success",
        description: response.message || "Doctor deactivated successfully"
      });
      await loadDoctors();
    } catch (error) {
      console.error('Failed to deactivate doctor:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate doctor. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Toggle doctor expansion
  const toggleDoctorExpansion = (doctorId) => {
    const newExpanded = new Set(expandedDoctors);
    if (newExpanded.has(doctorId)) {
      newExpanded.delete(doctorId);
    } else {
      newExpanded.add(doctorId);
    }
    setExpandedDoctors(newExpanded);
  };

  // Filter doctors based on search
  const filteredDoctors = doctors.filter(doctor =>
    doctor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doctor.specialty && doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const specialties = [
    "General Practitioner",
    "Cardiologist",
    "Dermatologist",
    "Neurologist",
    "Orthopedic Surgeon",
    "Pediatrician",
    "Psychiatrist",
    "Radiologist",
    "Anesthesiologist",
    "Emergency Medicine",
    "Internal Medicine",
    "Family Medicine"
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Doctors Management</h1>
          <p className="text-muted-foreground">Manage doctor accounts and their information</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-blue-800 to-teal-500 hover:from-blue-900 hover:to-teal-600 shadow-lg shadow-blue-500/25" 
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Doctor
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search doctors by name, email, or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Doctors</p>
                <p className="text-2xl font-bold text-foreground">{doctors.length}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-green-600">
                    Active: {doctors.filter(d => d.isActive).length}
                  </span>
                  <span className="text-xs text-red-600">
                    Inactive: {doctors.filter(d => !d.isActive).length}
                  </span>
                </div>
              </div>
              <UserCheck className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctors List */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            Doctors List
          </CardTitle>
          <CardDescription>
            {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-4">
              {filteredDoctors.map((doctor) => {
                const isExpanded = expandedDoctors.has(doctor._id);
                return (
                  <Card key={doctor._id} className={`border border-border hover:shadow-md transition-all duration-200 ${!doctor.isActive ? 'opacity-75 bg-muted/20' : ''}`}>
                    {/* Main Doctor Card - Clickable */}
                    <CardContent 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleDoctorExpansion(doctor._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {/* Expand/Collapse Icon */}
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Doctor Avatar */}
                          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {doctor.profileImage ? (
                              <img 
                                src={doctor.profileImage.startsWith('http') ? doctor.profileImage : `http://localhost:5000${doctor.profileImage}`}
                                alt={doctor.fullName}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                                onLoad={() => console.log('Image loaded successfully:', doctor.profileImage)}
                                onError={(e) => {
                                  console.error('Image failed to load:', doctor.profileImage);
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full bg-gradient-to-r from-blue-800 to-teal-500 rounded-full flex items-center justify-center ${doctor.profileImage ? 'hidden' : ''}`}>
                              <Stethoscope className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          
                          {/* Basic Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground text-lg">{doctor.fullName}</h3>
                              <Badge variant={doctor.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                {doctor.role}
                              </Badge>
                              <Badge variant={doctor.isActive ? 'default' : 'destructive'} className="text-xs">
                                {doctor.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{doctor.specialty || 'General Practitioner'}</p>
                            {doctor.uhid && (
                              <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                                UHID: {doctor.uhid}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{doctor.email}</span>
                              </div>
                              {doctor.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{doctor.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        {doctor.isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
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
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 flex-shrink-0"
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
                    </CardContent>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30">
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <Card className="border-0 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Personal Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Full Name</p>
                                    <p className="font-medium">{doctor.fullName}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Email Address</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {doctor.email}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Phone Number</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {doctor.phone || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Role & Status</p>
                                    <div className="flex gap-2">
                                      <Badge variant={doctor.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                        {doctor.role}
                                      </Badge>
                                      <Badge variant={doctor.isActive ? 'default' : 'destructive'} className="text-xs">
                                        {doctor.isActive ? 'Active' : 'Inactive'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Professional Information */}
                            <Card className="border-0 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4" />
                                  Professional Details
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">UHID</p>
                                    <p className="font-medium font-mono text-sm bg-muted px-2 py-1 rounded">{doctor.uhid || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Medical Specialty</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Award className="w-3 h-3" />
                                      {doctor.specialty || 'General Practitioner'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Qualification</p>
                                    <p className="font-medium">{doctor.qualification || 'Not provided'}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* System Information */}
                          <div className="mt-6">
                            <Card className="border-0 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  System Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Account Created</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(doctor.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Account Status</p>
                                    <Badge variant={doctor.isActive ? 'default' : 'secondary'} className="text-xs">
                                      {doctor.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">User ID</p>
                                    <p className="font-mono text-xs bg-muted px-2 py-1 rounded">{doctor._id}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Address Information */}
                          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Current Address */}
                            <Card className="border-0 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  Current Address
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-sm">
                                  {doctor.currentAddress ? (
                                    <div className="space-y-1">
                                      <p className="font-medium">{doctor.currentAddress.street}</p>
                                      <p className="text-muted-foreground">
                                        {doctor.currentAddress.city}, {doctor.currentAddress.state} {doctor.currentAddress.zipCode}
                                      </p>
                                      <p className="text-muted-foreground">{doctor.currentAddress.country || 'India'}</p>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">Address not provided</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Permanent Address */}
                            <Card className="border-0 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  Permanent Address
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-sm">
                                  {doctor.permanentAddress ? (
                                    <div className="space-y-1">
                                      <p className="font-medium">{doctor.permanentAddress.street}</p>
                                      <p className="text-muted-foreground">
                                        {doctor.permanentAddress.city}, {doctor.permanentAddress.state} {doctor.permanentAddress.zipCode}
                                      </p>
                                      <p className="text-muted-foreground">{doctor.permanentAddress.country || 'India'}</p>
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">Address not provided</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* About Section */}
                          {doctor.about && (
                            <Card className="border-0 shadow-sm mt-6">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  About Doctor
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm leading-relaxed">{doctor.about}</p>
                              </CardContent>
                            </Card>
                          )}

                          {/* Notes Section (if available) */}
                          {doctor.notes && (
                            <Card className="border-0 shadow-sm mt-6">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Edit className="w-4 h-4" />
                                  Additional Notes
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm">{doctor.notes}</p>
                              </CardContent>
                            </Card>
                          )}
                        </CardContent>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Doctor Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Create a new doctor account with login credentials
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={doctorForm.fullName}
                onChange={(e) => handleFormChange('fullName', e.target.value)}
                placeholder="Enter full name"
              />
              {formErrors.fullName && (
                <p className="text-sm text-red-600">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={doctorForm.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="Enter email address"
              />
              {formErrors.email && (
                <p className="text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={doctorForm.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formErrors.password && (
                <p className="text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image *</Label>
              <div className="flex flex-col gap-2">
                <Input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="cursor-pointer"
                />
                {imagePreview && (
                  <div className="flex justify-center">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded-full border-2 border-gray-300"
                    />
                  </div>
                )}
              </div>
              {formErrors.profileImage && (
                <p className="text-sm text-red-600">{formErrors.profileImage}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="uhid">UHID *</Label>
                <Input
                  id="uhid"
                  value={doctorForm.uhid}
                  onChange={(e) => handleFormChange('uhid', e.target.value.toUpperCase())}
                  placeholder="Enter UHID"
                />
                {formErrors.uhid && (
                  <p className="text-sm text-red-600">{formErrors.uhid}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Select value={doctorForm.specialty} onValueChange={(value) => handleFormChange('specialty', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification *</Label>
              <Input
                id="qualification"
                value={doctorForm.qualification}
                onChange={(e) => handleFormChange('qualification', e.target.value)}
                placeholder="Enter qualification (e.g., MBBS, MD, MS)"
              />
              {formErrors.qualification && (
                <p className="text-sm text-red-600">{formErrors.qualification}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={doctorForm.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
              {formErrors.phone && (
                <p className="text-sm text-red-600">{formErrors.phone}</p>
              )}
            </div>

            {/* Current Address Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold text-foreground">Current Address *</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentStreet">Street Address *</Label>
                  <Input
                    id="currentStreet"
                    value={doctorForm.currentAddress.street}
                    onChange={(e) => handleAddressChange('currentAddress', 'street', e.target.value)}
                    placeholder="Enter street address"
                  />
                  {formErrors['currentAddress.street'] && (
                    <p className="text-sm text-red-600">{formErrors['currentAddress.street']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentCity">City *</Label>
                  <Input
                    id="currentCity"
                    value={doctorForm.currentAddress.city}
                    onChange={(e) => handleAddressChange('currentAddress', 'city', e.target.value)}
                    placeholder="Enter city"
                  />
                  {formErrors['currentAddress.city'] && (
                    <p className="text-sm text-red-600">{formErrors['currentAddress.city']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentState">State *</Label>
                  <Input
                    id="currentState"
                    value={doctorForm.currentAddress.state}
                    onChange={(e) => handleAddressChange('currentAddress', 'state', e.target.value)}
                    placeholder="Enter state"
                  />
                  {formErrors['currentAddress.state'] && (
                    <p className="text-sm text-red-600">{formErrors['currentAddress.state']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentZipCode">Zip Code *</Label>
                  <Input
                    id="currentZipCode"
                    value={doctorForm.currentAddress.zipCode}
                    onChange={(e) => handleAddressChange('currentAddress', 'zipCode', e.target.value)}
                    placeholder="Enter zip code"
                  />
                  {formErrors['currentAddress.zipCode'] && (
                    <p className="text-sm text-red-600">{formErrors['currentAddress.zipCode']}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Permanent Address Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Permanent Address *</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDoctorForm(prev => ({
                      ...prev,
                      permanentAddress: { ...prev.currentAddress }
                    }));
                  }}
                >
                  Same as Current
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="permanentStreet">Street Address *</Label>
                  <Input
                    id="permanentStreet"
                    value={doctorForm.permanentAddress.street}
                    onChange={(e) => handleAddressChange('permanentAddress', 'street', e.target.value)}
                    placeholder="Enter street address"
                  />
                  {formErrors['permanentAddress.street'] && (
                    <p className="text-sm text-red-600">{formErrors['permanentAddress.street']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permanentCity">City *</Label>
                  <Input
                    id="permanentCity"
                    value={doctorForm.permanentAddress.city}
                    onChange={(e) => handleAddressChange('permanentAddress', 'city', e.target.value)}
                    placeholder="Enter city"
                  />
                  {formErrors['permanentAddress.city'] && (
                    <p className="text-sm text-red-600">{formErrors['permanentAddress.city']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permanentState">State *</Label>
                  <Input
                    id="permanentState"
                    value={doctorForm.permanentAddress.state}
                    onChange={(e) => handleAddressChange('permanentAddress', 'state', e.target.value)}
                    placeholder="Enter state"
                  />
                  {formErrors['permanentAddress.state'] && (
                    <p className="text-sm text-red-600">{formErrors['permanentAddress.state']}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permanentZipCode">Zip Code *</Label>
                  <Input
                    id="permanentZipCode"
                    value={doctorForm.permanentAddress.zipCode}
                    onChange={(e) => handleAddressChange('permanentAddress', 'zipCode', e.target.value)}
                    placeholder="Enter zip code"
                  />
                  {formErrors['permanentAddress.zipCode'] && (
                    <p className="text-sm text-red-600">{formErrors['permanentAddress.zipCode']}</p>
                  )}
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="about">About Doctor</Label>
              <textarea
                id="about"
                value={doctorForm.about}
                onChange={(e) => handleFormChange('about', e.target.value)}
                placeholder="Brief description about the doctor, experience, achievements, etc. (Optional)"
                className="w-full min-h-[100px] p-3 border border-input rounded-md resize-vertical"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {doctorForm.about.length}/1000 characters
              </p>
            </div>


            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-800 to-teal-500 hover:from-blue-900 hover:to-teal-600"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Doctor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorsManagement;
