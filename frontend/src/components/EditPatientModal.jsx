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
import { patientAPI, doctorAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const EditPatientModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
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

  // Load patient data when modal opens or patient changes
  useEffect(() => {
    if (isOpen && patient) {
      loadPatientData();
      loadDoctors();
    }
  }, [isOpen, patient]);

  const loadPatientData = () => {
    if (!patient) return;

    setFormData({
      fullName: patient.fullName || "",
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : "",
      gender: patient.gender || "",
      phone: patient.phone || "",
      email: patient.email || "",
      uhid: patient.uhid || "",
      bloodGroup: patient.bloodGroup || "",
      occupation: patient.occupation || "",
      referringDoctor: patient.referringDoctor || "",
      referredClinic: patient.referredClinic || "",
      governmentId: patient.governmentId || "",
      idNumber: patient.idNumber || "",
      address: {
        street: patient.address?.street || "",
        city: patient.address?.city || "",
        state: patient.address?.state || "",
        zipCode: patient.address?.zipCode || "",
        country: patient.address?.country || "India"
      },
      assignedDoctors: patient.assignedDoctors || [],
      emergencyContact: {
        name: patient.emergencyContact?.name || "",
        relationship: patient.emergencyContact?.relationship || "",
        phone: patient.emergencyContact?.phone || ""
      },
      insurance: {
        provider: patient.insurance?.provider || "",
        policyNumber: patient.insurance?.policyNumber || "",
        groupNumber: patient.insurance?.groupNumber || ""
      },
      medicalHistory: {
        conditions: patient.medicalHistory?.conditions || [],
        allergies: patient.medicalHistory?.allergies || [],
        medications: patient.medicalHistory?.medications || [],
        surgeries: patient.medicalHistory?.surgeries || []
      },
      notes: patient.notes || ""
    });
  };

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const response = await doctorAPI.getAll();
      const doctorsList = response.doctors || response.data || [];
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

  const addToArray = (arrayPath, newItem, setNewItem) => {
    if (!newItem.trim()) return;
    
    const [parent, child] = arrayPath.split('.');
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: [...prev[parent][child], newItem.trim()]
      }
    }));
    setNewItem("");
  };

  const removeFromArray = (arrayPath, index) => {
    const [parent, child] = arrayPath.split('.');
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: prev[parent][child].filter((_, i) => i !== index)
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.uhid.trim()) newErrors.uhid = "UHID is required";
    if (!formData.bloodGroup) newErrors.bloodGroup = "Blood group is required";
    if (!formData.occupation.trim()) newErrors.occupation = "Occupation is required";
    if (!formData.governmentId) newErrors.governmentId = "Government ID type is required";
    if (!formData.idNumber.trim()) newErrors.idNumber = "ID number is required";
    if (!formData.address.street.trim()) newErrors['address.street'] = "Street address is required";
    if (!formData.address.city.trim()) newErrors['address.city'] = "City is required";
    if (!formData.address.state.trim()) newErrors['address.state'] = "State is required";
    if (!formData.address.zipCode.trim()) newErrors['address.zipCode'] = "ZIP code is required";

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Calculate age from date of birth
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const updateData = {
        ...formData,
        age,
        assignedDoctors: formData.assignedDoctors.map(doctorId => 
          typeof doctorId === 'string' ? doctorId : doctorId._id || doctorId.id
        )
      };

      console.log('Updating patient with data:', updateData);
      
      const response = await patientAPI.update(patient._id || patient.id, updateData);
      
      toast({
        title: "Success!",
        description: `Patient ${formData.fullName} has been updated successfully`,
        variant: "default",
      });

      if (onSuccess) {
        onSuccess(response.patient || response);
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setNewCondition("");
    setNewAllergy("");
    setNewMedication("");
    setNewSurgery("");
    onClose();
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Patient Information
          </DialogTitle>
          <DialogDescription>
            Update patient details and medical information for {patient.fullName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={errors.fullName ? "border-red-500" : ""}
                />
                {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="uhid">UHID *</Label>
                <Input
                  id="uhid"
                  value={formData.uhid}
                  onChange={(e) => handleInputChange('uhid', e.target.value)}
                  className={errors.uhid ? "border-red-500" : ""}
                />
                {errors.uhid && <p className="text-red-500 text-sm">{errors.uhid}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className={errors.dateOfBirth ? "border-red-500" : ""}
                />
                {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
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
                {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group *</Label>
                <Select value={formData.bloodGroup} onValueChange={(value) => handleInputChange('bloodGroup', value)}>
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
                {errors.bloodGroup && <p className="text-red-500 text-sm">{errors.bloodGroup}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation *</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                  className={errors.occupation ? "border-red-500" : ""}
                />
                {errors.occupation && <p className="text-red-500 text-sm">{errors.occupation}</p>}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contact Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street">Street Address *</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className={errors['address.street'] ? "border-red-500" : ""}
                />
                {errors['address.street'] && <p className="text-red-500 text-sm">{errors['address.street']}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className={errors['address.city'] ? "border-red-500" : ""}
                />
                {errors['address.city'] && <p className="text-red-500 text-sm">{errors['address.city']}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  className={errors['address.state'] ? "border-red-500" : ""}
                />
                {errors['address.state'] && <p className="text-red-500 text-sm">{errors['address.state']}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code *</Label>
                <Input
                  id="zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                  className={errors['address.zipCode'] ? "border-red-500" : ""}
                />
                {errors['address.zipCode'] && <p className="text-red-500 text-sm">{errors['address.zipCode']}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Government ID */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Government Identification
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="governmentId">ID Type *</Label>
                <Select value={formData.governmentId} onValueChange={(value) => handleInputChange('governmentId', value)}>
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
                {errors.governmentId && <p className="text-red-500 text-sm">{errors.governmentId}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number *</Label>
                <Input
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  className={errors.idNumber ? "border-red-500" : ""}
                />
                {errors.idNumber && <p className="text-red-500 text-sm">{errors.idNumber}</p>}
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">Contact Name</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Input
                  id="emergencyRelationship"
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Phone Number</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Insurance Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Insurance Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  value={formData.insurance.provider}
                  onChange={(e) => handleInputChange('insurance.provider', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="policyNumber">Policy Number</Label>
                <Input
                  id="policyNumber"
                  value={formData.insurance.policyNumber}
                  onChange={(e) => handleInputChange('insurance.policyNumber', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="groupNumber">Group Number</Label>
                <Input
                  id="groupNumber"
                  value={formData.insurance.groupNumber}
                  onChange={(e) => handleInputChange('insurance.groupNumber', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Additional Notes
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                placeholder="Any additional notes about the patient..."
              />
            </div>
          </div>
        </form>
        
        <DialogFooter className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-primary"
          >
            {submitting ? "Updating..." : "Update Patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPatientModal;
