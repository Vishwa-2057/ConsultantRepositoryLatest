import { useState } from "react";
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
import { User, Phone, Mail, MapPin, Calendar, Heart, FileText, Plus, X } from "lucide-react";
import { appointmentAPI, patientAPI } from "@/services/api";

const PatientModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
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
  const [newCondition, setNewCondition] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newMedication, setNewMedication] = useState("");
  const [newSurgery, setNewSurgery] = useState("");

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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.zipCode.trim()) newErrors.zipCode = "ZIP code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        const today = new Date();
        const birthDate = new Date(formData.dateOfBirth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

        // Map to backend schema (nest address fields, trim strings)
        const patientData = {
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: {
            street: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            zipCode: formData.zipCode.trim(),
          },
          emergencyContact: {
            name: formData.emergencyContact.name.trim(),
            relationship: formData.emergencyContact.relationship.trim(),
            phone: formData.emergencyContact.phone.trim(),
          },
          insurance: {
            provider: formData.insurance.provider.trim(),
            policyNumber: formData.insurance.policyNumber.trim(),
            groupNumber: formData.insurance.groupNumber.trim(),
          },
          medicalHistory: {
            conditions: formData.medicalHistory.conditions,
            allergies: formData.medicalHistory.allergies,
            medications: formData.medicalHistory.medications,
            surgeries: formData.medicalHistory.surgeries,
          },
          notes: formData.notes.trim(),
          age: actualAge,
          status: "Active",
          lastVisit: new Date().toISOString(),
          nextAppointment: appointmentAPI.time,
        };

        const response = await patientAPI.create(patientData);
        const created = response.patient || response;
        onSubmit(created);
        handleClose();
      } catch (error) {
        console.error('Failed to create patient:', error);
        alert(`Failed to create patient: ${error.message}`);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      fullName: "",
      dateOfBirth: "",
      gender: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
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
    setErrors({});
    setNewCondition("");
    setNewAllergy("");
    setNewMedication("");
    setNewSurgery("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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

        <div className="space-y-6">
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
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter street address"
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Enter city"
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
                </div>
                
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    placeholder="Enter state"
                    className={errors.state ? "border-red-500" : ""}
                  />
                  {errors.state && <p className="text-sm text-red-500 mt-1">{errors.state}</p>}
                </div>
                
                <div>
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange("zipCode", e.target.value)}
                    placeholder="Enter ZIP code"
                    className={errors.zipCode ? "border-red-500" : ""}
                  />
                  {errors.zipCode && <p className="text-sm text-red-500 mt-1">{errors.zipCode}</p>}
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
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PatientModal;
