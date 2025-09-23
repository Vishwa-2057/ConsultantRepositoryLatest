import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { nurseAPI } from "@/services/api";

const NursesManagement = () => {
  const [nurses, setNurses] = useState([]);
  const [nursesLoading, setNursesLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedNurses, setExpandedNurses] = useState(new Set());
  
  const [nurseForm, setNurseForm] = useState({
    fullName: "",
    uhid: "",
    email: "",
    password: "",
    department: "",
    shift: "",
    phone: "",
    licenseNumber: "",
    experience: "",
    role: "nurse"
  });
  
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  
  const [formErrors, setFormErrors] = useState({});
  
  const { toast } = useToast();

  // Handle profile image upload
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Load nurses from API
  useEffect(() => {
    loadNurses();
  }, []);

  const loadNurses = async () => {
    setNursesLoading(true);
    try {
      const response = await nurseAPI.getAll();
      // Backend returns { success: true, data: [...] }
      setNurses(response.data || []);
    } catch (error) {
      console.error('Failed to load nurses:', error);
      toast({
        title: "Error",
        description: "Failed to load nurses. Please try again.",
        variant: "destructive"
      });
    } finally {
      setNursesLoading(false);
    }
  };

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setNurseForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!nurseForm.fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    
    if (!nurseForm.uhid.trim()) {
      errors.uhid = "UHID is required";
    }
    
    if (!profileImage) {
      errors.profileImage = "Profile image is required";
    }
    
    if (!nurseForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(nurseForm.email)) {
      errors.email = "Please enter a valid email";
    }
    
    if (!nurseForm.password.trim()) {
      errors.password = "Password is required";
    } else if (nurseForm.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    
    if (nurseForm.phone && nurseForm.phone.length < 10) {
      errors.phone = "Phone number must be at least 10 digits";
    }

    if (nurseForm.experience && (isNaN(nurseForm.experience) || nurseForm.experience < 0)) {
      errors.experience = "Experience must be a positive number";
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
      
      // Add all form fields
      Object.keys(nurseForm).forEach(key => {
        if (nurseForm[key]) {
          formData.append(key, nurseForm[key]);
        }
      });
      
      // Add profile image
      if (profileImage) {
        formData.append('profileImage', profileImage);
      }
      
      const response = await nurseAPI.create(formData);
      
      toast({
        title: "Success",
        description: response.message || "Nurse added successfully!"
      });
      
      // Reset form and close modal
      setNurseForm({
        fullName: "",
        uhid: "",
        email: "",
        password: "",
        department: "",
        shift: "",
        phone: "",
        licenseNumber: "",
        experience: "",
        role: "nurse"
      });
      setProfileImage(null);
      setProfileImagePreview("");
      setFormErrors({});
      setIsAddModalOpen(false);
      
      // Reload nurses list
      await loadNurses();
    } catch (error) {
      console.error('Failed to create nurse:', error);
      
      // Handle validation errors from backend
      if (error.message && error.message.includes('already exists')) {
        setFormErrors({ email: "A nurse with this email already exists" });
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to add nurse. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle nurse activation
  const handleActivateNurse = async (nurseId, nurseName) => {
    if (!confirm(`Are you sure you want to activate ${nurseName}?`)) return;
    
    try {
      const response = await nurseAPI.activate(nurseId);
      toast({
        title: "Success",
        description: response.message || "Nurse activated successfully"
      });
      await loadNurses();
    } catch (error) {
      console.error('Failed to activate nurse:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate nurse. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle nurse deactivation
  const handleDeactivateNurse = async (nurseId, nurseName) => {
    if (!confirm(`Are you sure you want to deactivate ${nurseName}? They will no longer be able to access the system.`)) return;
    
    try {
      const response = await nurseAPI.deactivate(nurseId);
      toast({
        title: "Success",
        description: response.message || "Nurse deactivated successfully"
      });
      await loadNurses();
    } catch (error) {
      console.error('Failed to deactivate nurse:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate nurse. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Toggle nurse expansion
  const toggleNurseExpansion = (nurseId) => {
    const newExpanded = new Set(expandedNurses);
    if (newExpanded.has(nurseId)) {
      newExpanded.delete(nurseId);
    } else {
      newExpanded.add(nurseId);
    }
    setExpandedNurses(newExpanded);
  };

  // Filter nurses based on search
  const filteredNurses = nurses.filter(nurse =>
    nurse.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nurse.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (nurse.department && nurse.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const departments = [
    "General Nursing",
    "Emergency Department",
    "Intensive Care Unit (ICU)",
    "Pediatric Nursing",
    "Surgical Nursing",
    "Maternity/Obstetrics",
    "Oncology",
    "Cardiology",
    "Orthopedic",
    "Mental Health",
    "Geriatric Care",
    "Outpatient Services"
  ];

  const shifts = [
    "Day",
    "Night", 
    "Evening",
    "Rotating"
  ];

  const roles = [
    "nurse",
    "head_nurse",
    "supervisor"
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nurses Management</h1>
          <p className="text-muted-foreground">Manage nurse accounts and their information</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-500/25" 
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Nurse
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search nurses by name, email, or department..."
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
                <p className="text-sm font-medium text-muted-foreground">Total Nurses</p>
                <p className="text-2xl font-bold text-foreground">{nurses.length}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-green-600">
                    Active: {nurses.filter(n => n.isActive).length}
                  </span>
                  <span className="text-xs text-red-600">
                    Inactive: {nurses.filter(n => !n.isActive).length}
                  </span>
                </div>
              </div>
              <Heart className="w-8 h-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nurses List */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-teal-600" />
            Nurses List
          </CardTitle>
          <CardDescription>
            {filteredNurses.length} nurse{filteredNurses.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nursesLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading nurses...</p>
            </div>
          ) : filteredNurses.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">
                {searchQuery ? "No nurses found matching your search." : "No nurses found."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNurses.map((nurse) => {
                const isExpanded = expandedNurses.has(nurse._id);
                return (
                  <Card key={nurse._id} className={`border border-border hover:shadow-md transition-all duration-200 ${!nurse.isActive ? 'opacity-75 bg-muted/20' : ''}`}>
                    {/* Main Nurse Card - Clickable */}
                    <CardContent 
                      className="p-4 cursor-pointer"
                      onClick={() => toggleNurseExpansion(nurse._id)}
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
                          
                          {/* Nurse Avatar */}
                          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {nurse.profileImage ? (
                              <img 
                                src={nurse.profileImage.startsWith('http') ? nurse.profileImage : `http://localhost:5000${nurse.profileImage}`}
                                alt={nurse.fullName}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                                onLoad={() => console.log('Nurse image loaded successfully:', nurse.profileImage)}
                                onError={(e) => {
                                  console.error('Nurse image failed to load:', nurse.profileImage);
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full bg-gradient-to-r from-blue-800 to-teal-500 rounded-full flex items-center justify-center ${nurse.profileImage ? 'hidden' : ''}`}>
                              <Heart className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          
                          {/* Basic Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground text-lg">{nurse.fullName}</h3>
                              <Badge variant={nurse.role === 'supervisor' ? 'default' : nurse.role === 'head_nurse' ? 'secondary' : 'outline'} className="text-xs">
                                {nurse.role.replace('_', ' ')}
                              </Badge>
                              <Badge variant={nurse.isActive ? 'default' : 'destructive'} className="text-xs">
                                {nurse.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            {nurse.uhid && (
                              <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                                UHID: {nurse.uhid}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">{nurse.department || 'General Nursing'}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{nurse.email}</span>
                              </div>
                              {nurse.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{nurse.phone}</span>
                                </div>
                              )}
                              {nurse.shift && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{nurse.shift} Shift</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        {nurse.isActive ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeactivateNurse(nurse._id, nurse.fullName);
                            }}
                            title="Deactivate Nurse"
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
                              handleActivateNurse(nurse._id, nurse.fullName);
                            }}
                            title="Activate Nurse"
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
                                    <p className="font-medium">{nurse.fullName}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">UHID</p>
                                    <p className="font-medium font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                                      {nurse.uhid || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Email Address</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {nurse.email}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Phone Number</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {nurse.phone || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Role & Status</p>
                                    <div className="flex gap-2">
                                      <Badge variant={nurse.role === 'supervisor' ? 'default' : nurse.role === 'head_nurse' ? 'secondary' : 'outline'} className="text-xs">
                                        {nurse.role.replace('_', ' ')}
                                      </Badge>
                                      <Badge variant={nurse.isActive ? 'default' : 'destructive'} className="text-xs">
                                        {nurse.isActive ? 'Active' : 'Inactive'}
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
                                  <Heart className="w-4 h-4" />
                                  Professional Details
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Department</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Building className="w-3 h-3" />
                                      {nurse.department || 'Not specified'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Work Shift</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {nurse.shift || 'Not specified'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">License Number</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      {nurse.licenseNumber || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Years of Experience</p>
                                    <p className="font-medium flex items-center gap-1">
                                      <Award className="w-3 h-3" />
                                      {nurse.experience || 'Not specified'} {nurse.experience ? 'years' : ''}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
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

      {/* Add Nurse Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Nurse</DialogTitle>
            <DialogDescription>
              Create a new nurse account with login credentials
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={nurseForm.fullName}
                onChange={(e) => handleFormChange('fullName', e.target.value)}
                placeholder="Enter full name"
              />
              {formErrors.fullName && (
                <p className="text-sm text-red-600">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="uhid">UHID *</Label>
              <Input
                id="uhid"
                value={nurseForm.uhid}
                onChange={(e) => handleFormChange('uhid', e.target.value.toUpperCase())}
                placeholder="Enter UHID (e.g., N001)"
                style={{ textTransform: 'uppercase' }}
              />
              {formErrors.uhid && (
                <p className="text-sm text-red-600">{formErrors.uhid}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileImage">Profile Image *</Label>
              <Input
                id="profileImage"
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="cursor-pointer"
              />
              {formErrors.profileImage && (
                <p className="text-sm text-red-600">{formErrors.profileImage}</p>
              )}
              {profileImagePreview && (
                <div className="flex justify-center mt-2">
                  <img 
                    src={profileImagePreview} 
                    alt="Profile Preview" 
                    className="w-20 h-20 object-cover rounded-full border-2 border-gray-300"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={nurseForm.email}
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
                  value={nurseForm.password}
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
              <Label htmlFor="department">Department</Label>
              <Select value={nurseForm.department} onValueChange={(value) => handleFormChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shift">Shift</Label>
              <Select value={nurseForm.shift} onValueChange={(value) => handleFormChange('shift', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((shift) => (
                    <SelectItem key={shift} value={shift}>
                      {shift}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={nurseForm.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
              {formErrors.phone && (
                <p className="text-sm text-red-600">{formErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={nurseForm.licenseNumber}
                onChange={(e) => handleFormChange('licenseNumber', e.target.value)}
                placeholder="Enter nursing license number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min="0"
                value={nurseForm.experience}
                onChange={(e) => handleFormChange('experience', e.target.value)}
                placeholder="Enter years of experience"
              />
              {formErrors.experience && (
                <p className="text-sm text-red-600">{formErrors.experience}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={nurseForm.role} onValueChange={(value) => handleFormChange('role', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Nurse'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NursesManagement;
