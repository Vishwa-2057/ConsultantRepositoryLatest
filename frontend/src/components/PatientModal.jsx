import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, MapPin, Calendar, Heart, FileText, Plus, X, UserCheck, Share2 } from "lucide-react";
import { appointmentAPI, patientAPI, doctorAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const PatientModal = ({ isOpen, onClose, onSubmit }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    password: "",
    uhid: "",
    bloodGroup: "",
    occupation: "",
    referringDoctor: "",
    referredClinic: "",
    governmentId: "",
    idNumber: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India"
    },
    assignedDoctors: [],
    emergencyContact: {
      name: "",
      relationship: "",
      phone: ""
    },
    insurance: {
      provider: "",
      policyNumber: "",
      groupNumber: ""
    },
    medicalHistory: {
      conditions: [],
      allergies: [],
      medications: [],
      surgeries: []
    },
    notes: ""
  });

  const [errors, setErrors] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newSurgery, setNewSurgery] = useState("");
  
  // File upload states
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [governmentDocument, setGovernmentDocument] = useState(null);
  const [governmentDocumentName, setGovernmentDocumentName] = useState("");

  // Load doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDoctors();
    }
  }, [isOpen]);

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const response = await doctorAPI.getAll();
      const doctorsList = response.doctors || response.data || [];
      console.log('Loaded doctors:', doctorsList);
      setDoctors(Array.isArray(doctorsList) ? doctorsList : []);
    } catch (error) {
      console.error('Failed to load doctors:', error);
      setDoctors([]);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const addItem = (type, value, setter) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        medicalHistory: {
          ...prev.medicalHistory,
          [type]: [...prev.medicalHistory[type], value.trim()]
        }
      }));
      setter("");
    }
  };

  const removeItem = (type, index) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: {
        ...prev.medicalHistory,
        [type]: prev.medicalHistory[type].filter((_, i) => i !== index)
      }
    }));
  };

  // Handle profile image upload
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, profileImage: "Please select a valid image file (JPEG, PNG, GIF, WebP)" }));
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, profileImage: "Image size must be less than 5MB" }));
        return;
      }
      
      setProfileImage(file);
      setErrors(prev => ({ ...prev, profileImage: "" }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle government document upload
  const handleGovernmentDocumentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, governmentDocument: "Please select a valid image file or PDF" }));
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, governmentDocument: "File size must be less than 10MB" }));
        return;
      }
      
      setGovernmentDocument(file);
      setGovernmentDocumentName(file.name);
      setErrors(prev => ({ ...prev, governmentDocument: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }
    
    // New required fields validation
    if (!formData.uhid.trim()) newErrors.uhid = "UHID is required";
    if (!formData.bloodGroup) newErrors.bloodGroup = "Blood group is required";
    if (!formData.occupation.trim()) newErrors.occupation = "Occupation is required";
    if (!formData.governmentId) newErrors.governmentId = "Government ID type is required";
    if (!formData.idNumber.trim()) newErrors.idNumber = "ID number is required";
    
    // Address validation
    if (!formData.address.street.trim()) newErrors['address.street'] = "Street address is required";
    if (!formData.address.city.trim()) newErrors['address.city'] = "City is required";
    if (!formData.address.state.trim()) newErrors['address.state'] = "State is required";
    if (!formData.address.zipCode.trim()) newErrors['address.zipCode'] = "ZIP code is required";
    
    // File validation
    if (!profileImage) newErrors.profileImage = "Profile image is required";
    if (!governmentDocument) newErrors.governmentDocument = "Government document is required";

    setErrors(newErrors);
    console.log('Validation errors:', newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('Add Patient button clicked!');
    console.log('Form data before validation:', {
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      password: formData.password ? `[${formData.password.length} characters]` : 'Not provided',
      uhid: formData.uhid,
      bloodGroup: formData.bloodGroup,
      profileImage: profileImage ? 'Selected' : 'Not selected',
      governmentDocument: governmentDocument ? 'Selected' : 'Not selected'
    });
    
    if (validateForm()) {
      console.log('Frontend validation passed, submitting form...');
      setSubmitting(true);
      try {
        // Create FormData for file upload
        const formDataToSend = new FormData();
        
        // Add basic fields
        formDataToSend.append('fullName', formData.fullName.trim());
        formDataToSend.append('dateOfBirth', formData.dateOfBirth);
        formDataToSend.append('gender', formData.gender);
        formDataToSend.append('phone', formData.phone.trim());
        formDataToSend.append('email', formData.email.trim());
        formDataToSend.append('password', formData.password);
        formDataToSend.append('uhid', formData.uhid.trim().toUpperCase());
        formDataToSend.append('bloodGroup', formData.bloodGroup);
        formDataToSend.append('occupation', formData.occupation.trim());
        formDataToSend.append('referringDoctor', formData.referringDoctor.trim());
        formDataToSend.append('referredClinic', formData.referredClinic.trim());
        formDataToSend.append('governmentId', formData.governmentId);
        formDataToSend.append('idNumber', formData.idNumber.trim());
        
        // Add address as JSON string (easier for backend to parse)
        formDataToSend.append('address', JSON.stringify({
          street: formData.address.street.trim(),
          city: formData.address.city.trim(),
          state: formData.address.state.trim(),
          zipCode: formData.address.zipCode.trim(),
          country: formData.address.country
        }));
        
        // Add emergency contact as JSON string
        formDataToSend.append('emergencyContact', JSON.stringify({
          name: formData.emergencyContact.name.trim(),
          relationship: formData.emergencyContact.relationship.trim(),
          phone: formData.emergencyContact.phone.trim()
        }));
        
        // Add insurance as JSON string
        formDataToSend.append('insurance', JSON.stringify({
          provider: formData.insurance.provider.trim(),
          policyNumber: formData.insurance.policyNumber.trim(),
          groupNumber: formData.insurance.groupNumber.trim()
        }));
        
        // Add medical history as JSON string
        formDataToSend.append('medicalHistory', JSON.stringify({
          conditions: formData.medicalHistory.conditions,
          allergies: formData.medicalHistory.allergies,
          medications: formData.medicalHistory.medications,
          surgeries: formData.medicalHistory.surgeries
        }));
        
        // Add assigned doctors as JSON string
        formDataToSend.append('assignedDoctors', JSON.stringify(formData.assignedDoctors));
        
        // Add notes and status
        formDataToSend.append('notes', formData.notes.trim());
        formDataToSend.append('status', 'Active');
        
        // Add files
        formDataToSend.append('profileImage', profileImage);
        formDataToSend.append('governmentDocument', governmentDocument);

        console.log('Submitting form data to API...');

        const response = await patientAPI.create(formDataToSend);
        const created = response.patient || response;
        
        toast({
          title: "Patient Added Successfully!",
          description: `${formData.fullName} has been added to the system.`,
        });
        
        onSubmit(created);
        handleClose();
      } catch (error) {
        console.error('Error creating patient:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to create patient. Please try again.",
          variant: "destructive"
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      console.log('Frontend validation failed, not submitting form');
    }
  };

  const handleClose = () => {
    // Reset form data
    setFormData({
      fullName: "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      email: "",
      password: "",
      uhid: "",
      bloodGroup: "",
      occupation: "",
      referringDoctor: "",
      referredClinic: "",
      governmentId: "",
      idNumber: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "India"
      },
      assignedDoctors: [],
      emergencyContact: {
        name: "",
        relationship: "",
        phone: ""
      },
      insurance: {
        provider: "",
        policyNumber: "",
        groupNumber: ""
      },
      medicalHistory: {
        conditions: [],
        allergies: [],
        medications: [],
        surgeries: []
      },
      notes: ""
    });
    
    // Reset file states
    setProfileImage(null);
    setProfileImagePreview(null);
    setGovernmentDocument(null);
    setGovernmentDocumentName("");
    
    // Reset other states
    setErrors({});
    setSubmitting(false);
    setNewCondition("");
    setNewAllergy("");
    setNewMedication("");
    setNewSurgery("");
    
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={submitting ? undefined : handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Add New Patient
          </DialogTitle>
          <DialogDescription>
            Enter comprehensive patient information to create a new patient record
          </DialogDescription>
        </DialogHeader>

        {/* Submitting Overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg border flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="font-medium text-gray-900">Creating Patient...</p>
                <p className="text-sm text-gray-600">Please wait while we process your request</p>
              </div>
            </div>
          </div>
        )}

        <div className={`space-y-6 ${submitting ? 'pointer-events-none opacity-50' : ''}`}>
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="Enter full name"
                  className={errors.fullName ? "border-red-500" : ""}
                />
                {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>}
              </div>
              
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                  className={errors.dateOfBirth ? "border-red-500" : ""}
                />
                {errors.dateOfBirth && <p className="text-sm text-red-500 mt-1">{errors.dateOfBirth}</p>}
              </div>
              
              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-sm text-red-500 mt-1">{errors.gender}</p>}
              </div>
              
              <div>
                <Label htmlFor="uhid">UHID *</Label>
                <Input
                  id="uhid"
                  value={formData.uhid}
                  onChange={(e) => handleInputChange("uhid", e.target.value.toUpperCase())}
                  placeholder="Enter UHID"
                  className={errors.uhid ? "border-red-500" : ""}
                />
                {errors.uhid && <p className="text-sm text-red-500 mt-1">{errors.uhid}</p>}
              </div>
              
              <div>
                <Label htmlFor="bloodGroup">Blood Group *</Label>
                <Select value={formData.bloodGroup} onValueChange={(value) => handleInputChange("bloodGroup", value)}>
                  <SelectTrigger className={errors.bloodGroup ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bloodGroup && <p className="text-sm text-red-500 mt-1">{errors.bloodGroup}</p>}
              </div>
              
              <div>
                <Label htmlFor="occupation">Occupation *</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange("occupation", e.target.value)}
                  placeholder="Enter occupation"
                  className={errors.occupation ? "border-red-500" : ""}
                />
                {errors.occupation && <p className="text-sm text-red-500 mt-1">{errors.occupation}</p>}
              </div>

              <div>
                <Label htmlFor="assignedDoctors">Assigned Doctors</Label>
                <div className="space-y-2">
                  <Select onValueChange={(value) => {
                    if (value !== "none" && value !== "unavailable" && !formData.assignedDoctors.includes(value)) {
                      handleInputChange("assignedDoctors", [...formData.assignedDoctors, value]);
                    }
                  }}>
                    <SelectTrigger>
                      <UserCheck className="w-4 h-4 mr-2" />
                      <SelectValue placeholder={doctorsLoading ? "Loading doctors..." : "Select doctors (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No doctor assigned</SelectItem>
                      {doctors && doctors.length > 0 ? (
                        doctors.map((doctor) => (
                          <SelectItem 
                            key={doctor._id} 
                            value={doctor._id}
                            disabled={formData.assignedDoctors.includes(doctor._id)}
                          >
                            Dr. {doctor.fullName} - {doctor.specialty}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="unavailable" disabled>No doctors available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {/* Selected Doctors Display */}
                  {formData.assignedDoctors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.assignedDoctors.map((doctorId) => {
                        const doctor = doctors.find(d => d._id === doctorId);
                        return doctor ? (
                          <Badge key={doctorId} variant="secondary" className="gap-1">
                            Dr. {doctor.fullName}
                            <button
                              type="button"
                              onClick={() => {
                                const updatedDoctors = formData.assignedDoctors.filter(id => id !== doctorId);
                                handleInputChange("assignedDoctors", updatedDoctors);
                              }}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter phone number"
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter email address"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Enter password (min. 6 characters)"
                  className={errors.password ? "border-red-500" : ""}
                  required
                />
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>
            </div>
          </div>

          {/* File Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents & Images
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profileImage">Profile Image *</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className={`cursor-pointer ${errors.profileImage ? "border-red-500" : ""}`}
                  />
                  {profileImagePreview && (
                    <div className="flex justify-center">
                      <img 
                        src={profileImagePreview} 
                        alt="Profile Preview" 
                        className="w-20 h-20 object-cover rounded-full border-2 border-gray-300"
                      />
                    </div>
                  )}
                </div>
                {errors.profileImage && <p className="text-sm text-red-500 mt-1">{errors.profileImage}</p>}
              </div>
              
              <div>
                <Label htmlFor="governmentDocument">Government Document *</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    id="governmentDocument"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleGovernmentDocumentChange}
                    className={`cursor-pointer ${errors.governmentDocument ? "border-red-500" : ""}`}
                  />
                  {governmentDocumentName && (
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      Selected: {governmentDocumentName}
                    </p>
                  )}
                </div>
                {errors.governmentDocument && <p className="text-sm text-red-500 mt-1">{errors.governmentDocument}</p>}
              </div>
            </div>
          </div>

          {/* Government ID Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Government Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="governmentId">Government ID Type *</Label>
                <Select value={formData.governmentId} onValueChange={(value) => handleInputChange("governmentId", value)}>
                  <SelectTrigger className={errors.governmentId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                    <SelectItem value="PAN Card">PAN Card</SelectItem>
                    <SelectItem value="Passport">Passport</SelectItem>
                    <SelectItem value="Driving License">Driving License</SelectItem>
                    <SelectItem value="Voter ID">Voter ID</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.governmentId && <p className="text-sm text-red-500 mt-1">{errors.governmentId}</p>}
              </div>
              
              <div>
                <Label htmlFor="idNumber">ID Number *</Label>
                <Input
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange("idNumber", e.target.value)}
                  placeholder="Enter ID number"
                  className={errors.idNumber ? "border-red-500" : ""}
                />
                {errors.idNumber && <p className="text-sm text-red-500 mt-1">{errors.idNumber}</p>}
              </div>
            </div>
          </div>

          {/* Referral Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Referral Information (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="referringDoctor">Referring Doctor</Label>
                <Input
                  id="referringDoctor"
                  value={formData.referringDoctor}
                  onChange={(e) => handleInputChange("referringDoctor", e.target.value)}
                  placeholder="Enter referring doctor name"
                />
              </div>
              
              <div>
                <Label htmlFor="referredClinic">Referred Clinic</Label>
                <Input
                  id="referredClinic"
                  value={formData.referredClinic}
                  onChange={(e) => handleInputChange("referredClinic", e.target.value)}
                  placeholder="Enter referred clinic name"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address.street">Street Address *</Label>
                <Input
                  id="address.street"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange("address.street", e.target.value)}
                  placeholder="Enter street address"
                  className={errors['address.street'] ? "border-red-500" : ""}
                />
                {errors['address.street'] && <p className="text-sm text-red-500 mt-1">{errors['address.street']}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="address.city">City *</Label>
                  <Input
                    id="address.city"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange("address.city", e.target.value)}
                    placeholder="Enter city"
                    className={errors['address.city'] ? "border-red-500" : ""}
                  />
                  {errors['address.city'] && <p className="text-sm text-red-500 mt-1">{errors['address.city']}</p>}
                </div>
                
                <div>
                  <Label htmlFor="address.state">State *</Label>
                  <Input
                    id="address.state"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange("address.state", e.target.value)}
                    placeholder="Enter state"
                    className={errors['address.state'] ? "border-red-500" : ""}
                  />
                  {errors['address.state'] && <p className="text-sm text-red-500 mt-1">{errors['address.state']}</p>}
                </div>
                
                <div>
                  <Label htmlFor="address.zipCode">ZIP Code *</Label>
                  <Input
                    id="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={(e) => handleInputChange("address.zipCode", e.target.value)}
                    placeholder="Enter ZIP code"
                    className={errors['address.zipCode'] ? "border-red-500" : ""}
                  />
                  {errors['address.zipCode'] && <p className="text-sm text-red-500 mt-1">{errors['address.zipCode']}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergencyName">Contact Name</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleInputChange("emergencyContact.name", e.target.value)}
                  placeholder="Enter contact name"
                />
              </div>
              
              <div>
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input
                  id="emergencyRelationship"
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => handleInputChange("emergencyContact.relationship", e.target.value)}
                  placeholder="e.g., Spouse, Parent"
                />
              </div>
              
              <div>
                <Label htmlFor="emergencyPhone">Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleInputChange("emergencyContact.phone", e.target.value)}
                  placeholder="Enter contact phone"
                />
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Insurance Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  value={formData.insurance.provider}
                  onChange={(e) => handleInputChange("insurance.provider", e.target.value)}
                  placeholder="Enter insurance provider"
                />
              </div>
              
              <div>
                <Label htmlFor="policyNumber">Policy Number</Label>
                <Input
                  id="policyNumber"
                  value={formData.insurance.policyNumber}
                  onChange={(e) => handleInputChange("insurance.policyNumber", e.target.value)}
                  placeholder="Enter policy number"
                />
              </div>
              
              <div>
                <Label htmlFor="groupNumber">Group Number</Label>
                <Input
                  id="groupNumber"
                  value={formData.insurance.groupNumber}
                  onChange={(e) => handleInputChange("insurance.groupNumber", e.target.value)}
                  placeholder="Enter group number"
                />
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Medical History
            </h3>
            
            {/* Medical Conditions */}
            <div className="space-y-2">
              <Label>Medical Conditions</Label>
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
                {formData.medicalHistory.conditions.map((condition, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
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
            <div className="space-y-2">
              <Label>Allergies</Label>
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
                {formData.medicalHistory.allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive" className="gap-1">
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
            <div className="space-y-2">
              <Label>Current Medications</Label>
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
                {formData.medicalHistory.medications.map((medication, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
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
            <div className="space-y-2">
              <Label>Previous Surgeries</Label>
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
                {formData.medicalHistory.surgeries.map((surgery, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
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

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Enter any additional notes or special considerations"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={(e) => {
              console.log('Button clicked - event triggered');
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }} 
            className="gradient-button"
            type="button"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Patient...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Patient
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientModal;
