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
import { User, Phone, Mail, MapPin, Calendar, FileText, Plus, X, Share2, AlertCircle } from "lucide-react";
import { appointmentAPI, patientAPI, doctorAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { validationSchemas, sanitizers, validators } from "@/utils/validation";
import { useAuditLog } from "@/hooks/useAuditLog";

// List of countries for nationality dropdown
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Macedonia", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Swaziland", "Sweden", "Switzerland",
  "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

const PatientModal = ({ isOpen, onClose, onSubmit }) => {
  const { toast } = useToast();
  const { logComponentAccess, logFormSubmission, logPatientAccess } = useAuditLog();
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
    // New fields from images
    maritalStatus: "",
    handDominance: "",
    nationality: "",
    aadhaarNumber: "",
    isUnder18: false,
    parentGuardian: {
      name: "",
      email: "",
      mobileNumber: ""
    },
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
    vitals: {
      height: "",
      weight: "",
      bmi: "",
      bloodPressure: {
        systolic: "",
        diastolic: ""
      },
      heartRate: "",
      temperature: "",
      respiratoryRate: "",
      oxygenSaturation: "",
      bloodSugar: ""
    },
    notes: ""
  });

  const [errors, setErrors] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState(null);
  
  // File upload states
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [governmentDocument, setGovernmentDocument] = useState(null);
  const [governmentDocumentName, setGovernmentDocumentName] = useState("");

  // Load doctors when modal opens and log component access
  useEffect(() => {
    if (isOpen) {
      loadDoctors();
      // Log patient form access
      logComponentAccess('PatientModal', 'OPEN');
    }
  }, [isOpen, logComponentAccess]);

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

  const handleInputChange = (field, value, sanitize = true) => {
    // Apply sanitization based on field type
    let sanitizedValue = value;
    if (sanitize) {
      switch (field) {
        case 'phone':
        case 'parentGuardian.mobileNumber':
        case 'emergencyContact.phone':
          sanitizedValue = sanitizers.phone(value);
          break;
        case 'aadhaarNumber':
          sanitizedValue = sanitizers.aadhaar(value);
          break;
        case 'uhid':
          sanitizedValue = sanitizers.uhid(value);
          break;
        case 'fullName':
        case 'parentGuardian.name':
        case 'emergencyContact.name':
          sanitizedValue = sanitizers.name(value);
          break;
        case 'email':
        case 'parentGuardian.email':
          sanitizedValue = sanitizers.email(value);
          break;
        case 'address.zipCode':
          sanitizedValue = sanitizers.numeric(value).slice(0, 6);
          break;
        default:
          sanitizedValue = typeof value === 'string' ? sanitizers.text(value) : value;
      }
    }
    
    // Handle nested fields (including double-nested like bloodPressure.systolic)
    if (field.includes('.')) {
      const parts = field.split('.');
      if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: sanitizedValue
          }
        }));
      } else if (parts.length === 3) {
        // Handle double-nested fields like vitals.bloodPressure.systolic
        const [parent, child, grandchild] = parts;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [grandchild]: sanitizedValue
            }
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: sanitizedValue
      }));
    }
    
    // Special validation for dateOfBirth to prevent future dates and auto-calculate age
    if (field === 'dateOfBirth' && sanitizedValue) {
      const selectedDate = new Date(sanitizedValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      
      if (selectedDate > today) {
        setErrors(prev => ({ ...prev, dateOfBirth: "Enter valid Date of birth" }));
        setCalculatedAge(null);
        return; // Don't clear the error
      }
      
      // Calculate age and automatically set isUnder18 checkbox
      const age = today.getFullYear() - selectedDate.getFullYear();
      const monthDiff = today.getMonth() - selectedDate.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate()) ? age - 1 : age;
      
      // Set calculated age for display
      setCalculatedAge(actualAge);
      
      // Automatically check/uncheck the isUnder18 checkbox based on calculated age
      setFormData(prev => ({
        ...prev,
        dateOfBirth: sanitizedValue,
        isUnder18: actualAge < 18
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Real-time field validation on blur
  const handleFieldBlur = (field, value) => {
    const newErrors = { ...errors };
    
    // Get nested value for nested fields
    const getNestedValue = (field) => {
      if (field.includes('.')) {
        const parts = field.split('.');
        if (parts.length === 2) {
          return formData[parts[0]]?.[parts[1]];
        }
      }
      return formData[field];
    };
    
    const fieldValue = value !== undefined ? value : getNestedValue(field);
    
    switch (field) {
      case 'fullName':
        const nameError = validators.minLength(fieldValue, 2, 'Full name') || 
                         validators.maxLength(fieldValue, 100, 'Full name');
        if (nameError) newErrors.fullName = nameError;
        else delete newErrors.fullName;
        break;
        
      case 'phone':
        if (!formData.isUnder18 && fieldValue) {
          const phoneError = validators.phone(fieldValue);
          if (phoneError) newErrors.phone = phoneError;
          else delete newErrors.phone;
        }
        break;
        
      case 'email':
      case 'parentGuardian.email':
        if (fieldValue) {
          const emailError = validators.email(fieldValue);
          if (emailError) newErrors[field] = emailError;
          else delete newErrors[field];
        }
        break;
        
      case 'aadhaarNumber':
        if (fieldValue) {
          const aadhaarError = validators.aadhaar(fieldValue);
          if (aadhaarError) newErrors.aadhaarNumber = aadhaarError;
          else delete newErrors.aadhaarNumber;
        }
        break;
        
      case 'uhid':
        if (fieldValue) {
          const uhidError = validators.uhid(fieldValue);
          if (uhidError) newErrors.uhid = uhidError;
          else delete newErrors.uhid;
        }
        break;
        
      case 'parentGuardian.mobileNumber':
      case 'emergencyContact.phone':
        if (fieldValue) {
          const phoneError = validators.phone(fieldValue);
          if (phoneError) newErrors[field] = phoneError;
          else delete newErrors[field];
        }
        break;
        
      case 'address.zipCode':
        if (fieldValue) {
          const zipError = validators.zipCode(fieldValue);
          if (zipError) newErrors['address.zipCode'] = zipError;
          else delete newErrors['address.zipCode'];
        }
        break;
        
      case 'occupation':
        if (fieldValue) {
          const occupationError = validators.maxLength(fieldValue, 100, 'Occupation');
          if (occupationError) newErrors.occupation = occupationError;
          else delete newErrors.occupation;
        }
        break;
        
      case 'password':
        if (fieldValue) {
          const passwordError = validators.password(fieldValue);
          if (passwordError) newErrors.password = passwordError;
          else delete newErrors.password;
        }
        break;
    }
    
    setErrors(newErrors);
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
    
    // Basic field validations
    const fullNameError = validators.required(formData.fullName, 'Full name') || 
                         validators.minLength(formData.fullName, 2, 'Full name') ||
                         validators.maxLength(formData.fullName, 100, 'Full name');
    if (fullNameError) newErrors.fullName = fullNameError;
    
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    
    // Date of birth should not be in the future
    if (formData.dateOfBirth) {
      const dobError = validators.futureDate(formData.dateOfBirth);
      if (dobError) newErrors.dateOfBirth = dobError;
      
      // Check if patient is actually under 18 based on DOB
      const today = new Date();
      const dob = new Date(formData.dateOfBirth);
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age;
      
      if (formData.isUnder18 && actualAge >= 18) {
        newErrors.isUnder18 = "Patient's age based on date of birth is 18 or older";
      }
      if (!formData.isUnder18 && actualAge < 18) {
        newErrors.isUnder18 = "Patient's age based on date of birth is under 18. Please check the 'Under 18' option";
      }
    }
    
    if (!formData.gender) newErrors.gender = "Gender is required";
    
    // UHID validation
    const uhidError = validators.required(formData.uhid, 'UHID') || validators.uhid(formData.uhid);
    if (uhidError) newErrors.uhid = uhidError;
    
    if (!formData.bloodGroup) newErrors.bloodGroup = "Blood group is required";
    
    const occupationError = validators.required(formData.occupation, 'Occupation') ||
                           validators.maxLength(formData.occupation, 100, 'Occupation');
    if (occupationError) newErrors.occupation = occupationError;
    
    // Password validation
    const passwordError = validators.required(formData.password, 'Password') ||
                         validators.password(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    // Phone and email validation for patients 18 and older
    if (!formData.isUnder18) {
      const phoneError = validators.required(formData.phone, 'Phone number') ||
                        validators.phone(formData.phone);
      if (phoneError) newErrors.phone = phoneError;
      
      if (formData.email) {
        const emailError = validators.email(formData.email);
        if (emailError) newErrors.email = emailError;
      }
    }
    
    // Aadhaar validation (optional but if provided must be valid)
    if (formData.aadhaarNumber) {
      const aadhaarError = validators.aadhaar(formData.aadhaarNumber);
      if (aadhaarError) newErrors.aadhaarNumber = aadhaarError;
    }
    
    // Nationality validation
    if (formData.nationality) {
      const nationalityError = validators.maxLength(formData.nationality, 50, 'Nationality');
      if (nationalityError) newErrors.nationality = nationalityError;
    }
    
    // Parent/Guardian validation for under 18 patients
    if (formData.isUnder18) {
      const parentNameError = validators.required(formData.parentGuardian.name, 'Parent/Guardian name') ||
                             validators.maxLength(formData.parentGuardian.name, 100, 'Parent/Guardian name');
      if (parentNameError) newErrors['parentGuardian.name'] = parentNameError;
      
      const parentEmailError = validators.required(formData.parentGuardian.email, 'Parent/Guardian email') ||
                              validators.email(formData.parentGuardian.email);
      if (parentEmailError) newErrors['parentGuardian.email'] = parentEmailError;
      
      const parentPhoneError = validators.required(formData.parentGuardian.mobileNumber, 'Parent/Guardian mobile number') ||
                              validators.phone(formData.parentGuardian.mobileNumber);
      if (parentPhoneError) newErrors['parentGuardian.mobileNumber'] = parentPhoneError;
    }
    
    // Address validation
    const streetError = validators.required(formData.address.street, 'Street address');
    if (streetError) newErrors['address.street'] = streetError;
    
    const cityError = validators.required(formData.address.city, 'City');
    if (cityError) newErrors['address.city'] = cityError;
    
    const stateError = validators.required(formData.address.state, 'State');
    if (stateError) newErrors['address.state'] = stateError;
    
    const zipError = validators.required(formData.address.zipCode, 'ZIP code') ||
                    validators.zipCode(formData.address.zipCode);
    if (zipError) newErrors['address.zipCode'] = zipError;
    
    // Emergency contact validation (if provided)
    if (formData.emergencyContact.name || formData.emergencyContact.phone || formData.emergencyContact.relationship) {
      if (formData.emergencyContact.name && !formData.emergencyContact.phone) {
        newErrors['emergencyContact.phone'] = "Emergency contact phone is required when name is provided";
      }
      if (formData.emergencyContact.phone && !formData.emergencyContact.name) {
        newErrors['emergencyContact.name'] = "Emergency contact name is required when phone is provided";
      }
      if (formData.emergencyContact.phone) {
        const emergencyPhoneError = validators.phone(formData.emergencyContact.phone);
        if (emergencyPhoneError) newErrors['emergencyContact.phone'] = emergencyPhoneError;
      }
    }
    
    // File validation
    if (!profileImage) {
      newErrors.profileImage = "Profile image is required";
    } else {
      const fileSizeError = validators.fileSize(profileImage, 5);
      if (fileSizeError) newErrors.profileImage = fileSizeError;
      
      const fileTypeError = validators.fileType(profileImage, ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
      if (fileTypeError) newErrors.profileImage = fileTypeError;
    }
    
    if (!governmentDocument) {
      newErrors.governmentDocument = "Government document is required";
    } else {
      const fileSizeError = validators.fileSize(governmentDocument, 10);
      if (fileSizeError) newErrors.governmentDocument = fileSizeError;
      
      const fileTypeError = validators.fileType(governmentDocument, ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']);
      if (fileTypeError) newErrors.governmentDocument = fileTypeError;
    }

    setErrors(newErrors);
    console.log('Validation errors:', newErrors);
    
    // Show toast with validation errors if any
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      toast({
        title: "Validation Error",
        description: firstError,
        variant: "destructive",
      });
    }
    
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
        
        // For under 18 patients, use parent's phone as patient phone
        if (formData.isUnder18) {
          formDataToSend.append('phone', formData.parentGuardian.mobileNumber.trim());
          formDataToSend.append('email', formData.parentGuardian.email.trim());
        } else {
          formDataToSend.append('phone', formData.phone.trim());
          formDataToSend.append('email', formData.email.trim());
        }
        formDataToSend.append('password', formData.password);
        formDataToSend.append('uhid', formData.uhid.trim().toUpperCase());
        formDataToSend.append('bloodGroup', formData.bloodGroup);
        formDataToSend.append('occupation', formData.occupation.trim());
        formDataToSend.append('referringDoctor', formData.referringDoctor.trim());
        formDataToSend.append('referredClinic', formData.referredClinic.trim());
        
        // Add new fields
        formDataToSend.append('maritalStatus', formData.maritalStatus);
        formDataToSend.append('handDominance', formData.handDominance);
        formDataToSend.append('nationality', formData.nationality.trim());
        formDataToSend.append('aadhaarNumber', formData.aadhaarNumber.trim());
        formDataToSend.append('isUnder18', formData.isUnder18);
        
        // Add parent/guardian information as JSON string
        formDataToSend.append('parentGuardian', JSON.stringify({
          name: formData.parentGuardian.name.trim(),
          email: formData.parentGuardian.email.trim(),
          mobileNumber: formData.parentGuardian.mobileNumber.trim()
        }));
        
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
        
        
        // Add assigned doctors as JSON string
        formDataToSend.append('assignedDoctors', JSON.stringify(formData.assignedDoctors));
        
        // Add notes
        formDataToSend.append('notes', formData.notes.trim());
        
        // Add files
        formDataToSend.append('profileImage', profileImage);
        formDataToSend.append('governmentDocument', governmentDocument);

        console.log('Submitting form data to API...');

        const response = await patientAPI.create(formDataToSend);
        const created = response.patient || response;
        
        // Log successful patient creation
        await logFormSubmission('PATIENT', 'CREATE', created._id || created.id, created._id || created.id);
        await logPatientAccess(created._id || created.id, formData.fullName, 'CREATE');
        
        toast({
          title: "Patient Added Successfully!",
          description: `${formData.fullName} has been added to the system.`,
        });
        
        onSubmit(created);
        handleClose();
        
        // Reload the page to refresh the data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
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
      // New fields from images
      maritalStatus: "",
      handDominance: "",
      nationality: "",
      aadhaarNumber: "",
      isUnder18: false,
      parentGuardian: {
        name: "",
        email: "",
        mobileNumber: ""
      },
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
      vitals: {
        height: "",
        weight: "",
        bmi: "",
        bloodPressure: {
          systolic: "",
          diastolic: ""
        },
        heartRate: "",
        temperature: "",
        respiratoryRate: "",
        oxygenSaturation: "",
        bloodSugar: ""
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
    setCalculatedAge(null);
    
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

        <div className={`space-y-8 ${submitting ? 'pointer-events-none opacity-50' : ''}`}>
          {/* Personal Information */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  onBlur={(e) => handleFieldBlur("fullName", e.target.value)}
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
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.dateOfBirth ? "border-red-500" : ""}
                />
                {errors.dateOfBirth && <p className="text-sm text-red-500 mt-1">{errors.dateOfBirth}</p>}
                {calculatedAge !== null && (
                  <p className="text-sm text-blue-600 mt-1 font-medium">
                    Age: {calculatedAge} {calculatedAge === 1 ? 'year' : 'years'} old
                  </p>
                )}
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
                  onBlur={(e) => handleFieldBlur("uhid", e.target.value)}
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
                  onBlur={(e) => handleFieldBlur("occupation", e.target.value)}
                  placeholder="Enter occupation"
                  className={errors.occupation ? "border-red-500" : ""}
                />
                {errors.occupation && <p className="text-sm text-red-500 mt-1">{errors.occupation}</p>}
              </div>
              
              <div>
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select value={formData.maritalStatus} onValueChange={(value) => handleInputChange("maritalStatus", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="handDominance">Hand Dominance</Label>
                <Select value={formData.handDominance} onValueChange={(value) => handleInputChange("handDominance", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hand dominance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Right">Right</SelectItem>
                    <SelectItem value="Left">Left</SelectItem>
                    <SelectItem value="Ambidextrous">Ambidextrous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Select value={formData.nationality} onValueChange={(value) => handleInputChange("nationality", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="aadhaarNumber">Aadhaar Number (12-Digit Numeric Input)</Label>
                <Input
                  id="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={(e) => handleInputChange("aadhaarNumber", e.target.value)}
                  onBlur={(e) => handleFieldBlur("aadhaarNumber", e.target.value)}
                  placeholder="Enter 12-digit Aadhaar number"
                  className={errors.aadhaarNumber ? "border-red-500" : ""}
                  maxLength={12}
                />
                {errors.aadhaarNumber && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-500">{errors.aadhaarNumber}</p>
                  </div>
                )}
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
                      <User className="w-4 h-4 mr-2" />
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

          {/* Login Information */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <Phone className="w-5 h-5 text-white" />
              </div>
              Login Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {!formData.isUnder18 && (
                <>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      onBlur={(e) => handleFieldBlur("phone", e.target.value)}
                      placeholder="Enter 10-digit phone number"
                      className={errors.phone ? "border-red-500" : ""}
                      maxLength={10}
                    />
                    {errors.phone && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-red-500">{errors.phone}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      onBlur={(e) => handleFieldBlur("email", e.target.value)}
                      placeholder="Enter email address"
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-red-500">{errors.email}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <div>
                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  onBlur={(e) => handleFieldBlur("password", e.target.value)}
                  placeholder="Enter password (min. 8 chars, uppercase, lowercase, number)"
                  className={errors.password ? "border-red-500" : ""}
                  required
                />
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>
            </div>
          </div>

          {/* Under 18 and Parent/Guardian Information */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              Age Verification & Parent/Guardian Details
            </h3>
            
            <div className="flex items-center space-x-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="isUnder18"
                checked={formData.isUnder18}
                onChange={(e) => handleInputChange("isUnder18", e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="isUnder18" className="text-base font-medium text-gray-700">
                Patient is under 18 years old
              </Label>
            </div>
            
            {formData.isUnder18 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
                <div>
                  <Label htmlFor="parentGuardianName">Parent/Guardian Name *</Label>
                  <Input
                    id="parentGuardianName"
                    value={formData.parentGuardian.name}
                    onChange={(e) => handleInputChange("parentGuardian.name", e.target.value)}
                    placeholder="Enter parent/guardian name"
                    className={errors['parentGuardian.name'] ? "border-red-500" : ""}
                  />
                  {errors['parentGuardian.name'] && <p className="text-sm text-red-500 mt-1">{errors['parentGuardian.name']}</p>}
                </div>
                
                <div>
                  <Label htmlFor="parentGuardianEmail">Parent Email (If {'<'}18 age) *</Label>
                  <Input
                    id="parentGuardianEmail"
                    type="email"
                    value={formData.parentGuardian.email}
                    onChange={(e) => handleInputChange("parentGuardian.email", e.target.value)}
                    onBlur={(e) => handleFieldBlur("parentGuardian.email", e.target.value)}
                    placeholder="Enter parent/guardian email"
                    className={errors['parentGuardian.email'] ? "border-red-500" : ""}
                  />
                  {errors['parentGuardian.email'] && <p className="text-sm text-red-500 mt-1">{errors['parentGuardian.email']}</p>}
                </div>
                
                <div>
                  <Label htmlFor="parentGuardianMobile">Parent Mobile No. (If {'<'}18 age) *</Label>
                  <Input
                    id="parentGuardianMobile"
                    value={formData.parentGuardian.mobileNumber}
                    onChange={(e) => handleInputChange("parentGuardian.mobileNumber", e.target.value)}
                    onBlur={(e) => handleFieldBlur("parentGuardian.mobileNumber", e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className={errors['parentGuardian.mobileNumber'] ? "border-red-500" : ""}
                    maxLength={10}
                  />
                  {errors['parentGuardian.mobileNumber'] && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <p className="text-sm text-red-500">{errors['parentGuardian.mobileNumber']}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* File Uploads */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              Documents & Images
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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


          {/* Referral Information */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              Referral Information (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              Address Information
              <span className="text-sm text-gray-500 ml-2">(Required)</span>
            </h3>
            <div className="space-y-6">
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    onBlur={(e) => handleFieldBlur("address.zipCode", e.target.value)}
                    placeholder="Enter ZIP code"
                    className={errors['address.zipCode'] ? "border-red-500" : ""}
                  />
                  {errors['address.zipCode'] && <p className="text-sm text-red-500 mt-1">{errors['address.zipCode']}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  onBlur={(e) => handleFieldBlur("emergencyContact.phone", e.target.value)}
                  placeholder="Enter contact phone"
                  className={errors['emergencyContact.phone'] ? "border-red-500" : ""}
                />
                {errors['emergencyContact.phone'] && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-sm text-red-500">{errors['emergencyContact.phone']}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              Insurance Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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


          {/* Additional Notes */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-xl flex items-center gap-3 mb-6 text-gray-800">
              <div className="p-2 bg-gray-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              Additional Notes
            </h3>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Enter any additional notes or special considerations"
              rows={4}
              className="w-full resize-none"
            />
          </div>
        </div>

        <DialogFooter className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 rounded-b-xl border-t border-gray-200">
          <div className="flex gap-4 w-full justify-end">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={submitting}
              className="px-8 py-3 text-base font-medium border-2 hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={(e) => {
                console.log('Button clicked - event triggered');
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }} 
              className="px-8 py-3 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              type="button"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Patient...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-3" />
                  Add Patient
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientModal;
