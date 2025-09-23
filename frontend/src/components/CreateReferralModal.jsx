import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { referralAPI, patientAPI, doctorAPI } from "@/services/api";

const CreateReferralModal = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    specialistName: "",
    specialty: "",
    urgency: "Medium",
    reason: "",
    preferredDate: new Date().toISOString().split('T')[0],
    notes: "",
    hospital: "",
    referralType: "outbound", // inbound or outbound
    externalClinic: "", // for outbound referrals
    specialistContact: {
      phone: "",
      email: ""
    }
  });

  // Fetch patients and doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPatientsAndDoctors();
    }
  }, [isOpen]);

  const fetchPatientsAndDoctors = async () => {
    try {
      const [patientsResponse, doctorsResponse] = await Promise.all([
        patientAPI.getAll(1, 100),
        doctorAPI.getAll()
      ]);
      
      // Patient API returns { patients: [...] } format
      setPatients(patientsResponse.patients || []);
      // Doctor API returns { data: [...] } format
      setDoctors(doctorsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Warning",
        description: "Could not load patients and doctors. You can still enter details manually.",
        variant: "destructive",
      });
    }
  };

  const handlePatientSelect = (patientId) => {
    const patient = patients.find(p => p._id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setFormData(prev => ({
        ...prev,
        patientId: patient._id,
        patientName: patient.fullName
      }));
    }
  };

  const handleDoctorSelect = (doctorId) => {
    const doctor = doctors.find(d => d._id === doctorId);
    if (doctor) {
      setSelectedDoctor(doctor);
      setFormData(prev => ({
        ...prev,
        specialistName: doctor.fullName,
        specialty: doctor.specialty,
        specialistContact: {
          phone: doctor.phone || "",
          email: doctor.email || ""
        }
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
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
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await referralAPI.create(formData);

      toast({
        title: "Success",
        description: "Referral created successfully!",
      });

      onSuccess?.(response);
      onClose();
      
      // Reset form
      setFormData({
        patientId: "",
        patientName: "",
        specialistName: "",
        specialty: "",
        urgency: "Medium",
        reason: "",
        preferredDate: new Date().toISOString().split('T')[0],
        notes: "",
        hospital: "",
        referralType: "outbound",
        externalClinic: "",
        specialistContact: {
          phone: "",
          email: ""
        }
      });
      setSelectedPatient(null);
      setSelectedDoctor(null);
    } catch (error) {
      console.error("Error creating referral:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create referral",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Referral</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new patient referral.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Referral Type Selection */}
          <div className="space-y-1">
            <Label htmlFor="referralType" className="text-sm">Referral Type *</Label>
            <Select
              value={formData.referralType}
              onValueChange={(value) => 
                setFormData(prev => ({ ...prev, referralType: value, externalClinic: "" }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select referral type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outbound">Outbound (Referring patient out)</SelectItem>
                <SelectItem value="inbound">Inbound (Receiving referral)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="patient" className="text-sm">Select Patient *</Label>
              <Select
                value={selectedPatient?._id || ""}
                onValueChange={handlePatientSelect}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient._id} value={patient._id}>
                      {patient.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedPatient && (
                <Input
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  placeholder="Or enter manually"
                  className="h-9 text-sm"
                />
              )}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="doctor" className="text-sm">
                {formData.referralType === 'outbound' ? 'External Specialist *' : 'Receiving Doctor *'}
              </Label>
              {formData.referralType === 'outbound' ? (
                <Input
                  name="specialistName"
                  value={formData.specialistName}
                  onChange={handleChange}
                  placeholder="Enter external specialist name"
                  className="h-9 text-sm"
                  required
                />
              ) : (
                <>
                  <Select
                    value={selectedDoctor?._id || ""}
                    onValueChange={handleDoctorSelect}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choose receiving doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor._id} value={doctor._id}>
                          {doctor.fullName} - {doctor.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedDoctor && (
                    <Input
                      name="specialistName"
                      value={formData.specialistName}
                      onChange={handleChange}
                      placeholder="Or enter manually"
                      className="h-9 text-sm"
                    />
                  )}
                </>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="urgency" className="text-sm">Priority *</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, urgency: value }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="specialty" className="text-sm">Specialty *</Label>
              <Input
                id="specialty"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="e.g., Cardiology"
                required
                disabled={selectedDoctor && formData.referralType === 'inbound'}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="hospital" className="text-sm">
                {formData.referralType === 'outbound' ? 'Hospital/Clinic' : 'Referring Hospital'}
              </Label>
              <Input
                id="hospital"
                name="hospital"
                value={formData.hospital}
                onChange={handleChange}
                placeholder={formData.referralType === 'outbound' ? 'Hospital name' : 'Referring hospital name'}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="preferredDate" className="text-sm">Preferred Date</Label>
              <Input
                type="date"
                id="preferredDate"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* External Clinic Field for Outbound Referrals */}
          {formData.referralType === 'outbound' && (
            <div className="space-y-1">
              <Label htmlFor="externalClinic" className="text-sm">External Clinic Name *</Label>
              <Input
                id="externalClinic"
                name="externalClinic"
                value={formData.externalClinic}
                onChange={handleChange}
                placeholder="Enter the name of the external clinic you're referring to"
                required
                className="h-9 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="specialistContact.phone" className="text-sm">
                {formData.referralType === 'outbound' ? 'External Specialist Phone' : 'Receiving Doctor Phone'}
              </Label>
              <Input
                id="specialistContact.phone"
                name="specialistContact.phone"
                value={formData.specialistContact.phone}
                onChange={handleChange}
                placeholder="Phone number"
                disabled={selectedDoctor && formData.referralType === 'inbound'}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="specialistContact.email" className="text-sm">
                {formData.referralType === 'outbound' ? 'External Specialist Email' : 'Receiving Doctor Email'}
              </Label>
              <Input
                type="email"
                id="specialistContact.email"
                name="specialistContact.email"
                value={formData.specialistContact.email}
                onChange={handleChange}
                placeholder="Email address"
                disabled={selectedDoctor && formData.referralType === 'inbound'}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="reason" className="text-sm">Reason for Referral *</Label>
              <Textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Brief reason for referral"
                required
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-sm">Additional Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional information"
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          
          <DialogFooter className="mt-4 pt-3 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="h-9"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary h-9"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Referral"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReferralModal;
