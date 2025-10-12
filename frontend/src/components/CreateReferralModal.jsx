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
import { referralAPI, patientAPI, doctorAPI, clinicAPI, authAPI } from "@/services/api";

const CreateReferralModal = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [currentClinicDoctors, setCurrentClinicDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [currentUserClinic, setCurrentUserClinic] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    specialistId: "", // ID of the receiving doctor
    specialistName: "",
    specialty: "",
    urgency: "Medium",
    reason: "",
    preferredDate: new Date().toISOString().split('T')[0],
    notes: "",
    hospital: "",
    referralType: "outbound", // inbound or outbound
    externalClinic: "", // for outbound referrals
    clinicId: "", // Clinic ID for the referral
    referringProvider: {
      name: "",
      contact: "",
      clinic: ""
    },
    specialistContact: {
      phone: "",
      email: ""
    }
  });

  // Fetch patients, doctors, and clinics when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  // Update doctors list when referral type changes and currentClinicDoctors is available
  useEffect(() => {
    console.log('Referral type changed:', formData.referralType);
    console.log('Current clinic doctors available:', currentClinicDoctors.length);
    if (formData.referralType === 'inbound' && currentClinicDoctors.length > 0) {
      console.log('Setting doctors for inbound referral:', currentClinicDoctors);
      setDoctors(currentClinicDoctors);
    } else if (formData.referralType === 'outbound' && selectedClinic) {
      // Fetch doctors for the selected external clinic when referral type is outbound
      const fetchClinicDoctors = async () => {
        try {
          const doctorsResponse = await doctorAPI.getByClinic(selectedClinic._id);
          setDoctors(doctorsResponse.data || []);
        } catch (error) {
          console.error('Error fetching doctors for clinic:', error);
          setDoctors([]);
        }
      };
      fetchClinicDoctors();
    }
  }, [formData.referralType, currentClinicDoctors, selectedClinic]);

  // Clear conflicting selections for inbound referrals
  useEffect(() => {
    if (formData.referralType === 'inbound') {
      // If referring doctor is same as receiving doctor, clear referring doctor
      if (formData.referringProvider.name && formData.specialistName && 
          formData.referringProvider.name === formData.specialistName) {
        setFormData(prev => ({
          ...prev,
          referringProvider: {
            ...prev.referringProvider,
            name: "",
            contact: "",
            clinic: ""
          }
        }));
      }
    }
  }, [formData.referralType, formData.specialistName, formData.referringProvider.name]);

  const fetchInitialData = async () => {
    try {
      // Get current logged-in user
      const authUser = JSON.parse(localStorage.getItem('authUser') || 'null');
      setCurrentUser(authUser);
      console.log('Current logged-in user:', authUser);
      
      const [patientsResponse, clinicsResponse, userProfile] = await Promise.all([
        patientAPI.getAll(1, 100),
        clinicAPI.getAll(),
        clinicAPI.getProfile().catch(() => null)
      ]);
      
      // Patient API returns { patients: [...] } format
      setPatients(patientsResponse.patients || []);
      
      // Clinic API returns { data: [...] } format
      const allClinics = clinicsResponse.data || clinicsResponse || [];
      
      // Get current user's clinic info and fetch clinic-specific doctors
      let currentClinic = null;
      let clinicId = null;
      
      // Determine clinic ID based on user type
      if (authUser?.role === 'doctor' && authUser?.clinic) {
        // For doctors, use their clinic ID from user profile
        clinicId = authUser.clinic;
        currentClinic = { 
          id: clinicId, 
          name: authUser.clinicName || 'Current Clinic'
        };
        setCurrentUserClinic(currentClinic);
        console.log('Doctor user detected, clinic ID:', clinicId);
      } else if (userProfile && (userProfile.data || userProfile._id)) {
        // For clinic admins, use profile data
        const profileData = userProfile.data || userProfile;
        clinicId = profileData._id || profileData.id;
        currentClinic = { 
          id: clinicId, 
          name: profileData.name || profileData.fullName || profileData.adminName 
        };
        setCurrentUserClinic(currentClinic);
        console.log('Clinic admin detected, clinic ID:', clinicId);
      }
      
      if (clinicId) {
        // Set clinic ID in form data
        setFormData(prev => ({
          ...prev,
          clinicId: clinicId
        }));
        
        // Fetch doctors only from current user's clinic - FORCE FETCH REGARDLESS OF ERRORS
        try {
          console.log('Fetching doctors for clinic ID:', clinicId);
          const doctorsResponse = await doctorAPI.getByClinic(clinicId);
          console.log('Doctors response:', doctorsResponse);
          const currentDoctors = doctorsResponse.data || [];
          console.log('Current clinic doctors loaded:', currentDoctors);
          setCurrentClinicDoctors(currentDoctors);
          // Initialize doctors array with current clinic doctors for inbound referrals
          if (formData.referralType === 'inbound') {
            setDoctors(currentDoctors);
          }
          
          // Auto-set referring doctor if logged-in user is a doctor
          if (authUser?.role === 'doctor' && authUser?.id) {
            const loggedInDoctor = currentDoctors.find(doc => doc._id === authUser.id);
            if (loggedInDoctor) {
              console.log('Auto-setting referring doctor to logged-in doctor:', loggedInDoctor);
              setFormData(prev => ({
                ...prev,
                clinicId: clinicId,
                referringProvider: {
                  name: loggedInDoctor.fullName,
                  contact: `${loggedInDoctor.phone || ''} ${loggedInDoctor.email || ''}`.trim(),
                  clinic: currentClinic?.name || 'Current Clinic'
                }
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching clinic doctors:', error);
          setCurrentClinicDoctors([]);
          
          // Try again with a direct API call as fallback
          try {
            const fallbackResponse = await fetch(`${import.meta.env.VITE_API_URL}/doctors/clinic/${clinicId}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            const fallbackData = await fallbackResponse.json();
            console.log('Fallback doctors response:', fallbackData);
            if (fallbackData.success && fallbackData.data) {
              setCurrentClinicDoctors(fallbackData.data);
              if (formData.referralType === 'inbound') {
                setDoctors(fallbackData.data);
              }
            }
          } catch (fallbackError) {
            console.error('Fallback doctor fetch also failed:', fallbackError);
          }
        }
        
        // Filter out current user's clinic from the list for outbound referrals
        const otherClinics = allClinics.filter(clinic => clinic._id !== clinicId);
        setClinics(otherClinics);
      } else {
        setClinics(allClinics);
        setCurrentClinicDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Warning",
        description: "Could not load all data. You can still enter details manually.",
        variant: "destructive",
      });
    }
  };

  const handlePatientSelect = (patientId) => {
    console.log('Patient selected:', patientId);
    const patient = patients.find(p => p._id === patientId);
    console.log('Found patient:', patient);
    if (patient) {
      setSelectedPatient(patient);
      setFormData(prev => ({
        ...prev,
        patientId: patient._id,
        patientName: patient.fullName
      }));
      console.log('Updated form data with patient:', { patientId: patient._id, patientName: patient.fullName });
    }
  };

  const handleClinicSelect = async (clinicId) => {
    const clinic = clinics.find(c => c._id === clinicId);
    if (clinic) {
      setSelectedClinic(clinic);
      const clinicName = clinic.name || clinic.fullName || clinic.adminName;
      setFormData(prev => ({
        ...prev,
        externalClinic: clinicName,
        hospital: clinicName, // Automatically set hospital field
        specialistName: "", // Reset specialist selection
        specialty: ""
      }));
      
      // Fetch doctors for this clinic
      try {
        const doctorsResponse = await doctorAPI.getByClinic(clinicId);
        setDoctors(doctorsResponse.data || []);
        setSelectedDoctor(null); // Reset selected doctor
      } catch (error) {
        console.error('Error fetching doctors for clinic:', error);
        setDoctors([]);
        toast({
          title: "Warning",
          description: "Could not load doctors for this clinic.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDoctorSelect = (doctorId) => {
    console.log('Doctor selected:', doctorId);
    const doctor = doctors.find(d => d._id === doctorId);
    console.log('Found doctor:', doctor);
    if (doctor) {
      setSelectedDoctor(doctor);
      setFormData(prev => ({
        ...prev,
        specialistId: doctor._id, // Add specialistId for backend filtering
        specialistName: doctor.fullName,
        specialty: doctor.specialty,
        specialistContact: {
          phone: doctor.phone || "",
          email: doctor.email || ""
        }
      }));
      console.log('Updated form data with doctor:', { specialistId: doctor._id, specialistName: doctor.fullName, specialty: doctor.specialty });
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
    setSubmitting(true);

    try {
      console.log('Form data being submitted:', formData);
      console.log('Selected patient:', selectedPatient);
      console.log('Selected doctor:', selectedDoctor);
      
      // Validate required fields before submission
      if (!formData.patientId || !formData.patientName) {
        throw new Error('Please select a patient');
      }
      if (!formData.specialistName || !formData.specialty) {
        throw new Error('Please select a receiving doctor');
      }
      
      const response = await referralAPI.create(formData);

      toast({
        title: "Success",
        description: "Referral created successfully!",
      });

      onSuccess?.(response);
      onClose();
      
      // Reload the page to refresh the data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      // Reset form
      setFormData({
        patientId: "",
        patientName: "",
        specialistId: "",
        specialistName: "",
        specialty: "",
        urgency: "Medium",
        reason: "",
        preferredDate: new Date().toISOString().split('T')[0],
        notes: "",
        hospital: "",
        referralType: "outbound",
        externalClinic: "",
        clinicId: "",
        referringProvider: {
          name: "",
          contact: "",
          clinic: ""
        },
        specialistContact: {
          phone: "",
          email: ""
        }
      });
      setSelectedPatient(null);
      setSelectedDoctor(null);
      setSelectedClinic(null);
    } catch (error) {
      console.error("Error creating referral:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create referral",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setSubmitting(false);
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
              onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  referralType: value, 
                  externalClinic: "", 
                  specialistId: "",
                  specialistName: "", 
                  specialty: "",
                  hospital: value === 'inbound' && currentUserClinic ? currentUserClinic.name : ""
                }));
                setSelectedClinic(null);
                setSelectedDoctor(null);
                // For inbound/internal referrals, reset doctors to current clinic doctors
                if (value === 'inbound') {
                  setDoctors(currentClinicDoctors);
                } else {
                  setDoctors([]); // Clear doctors list for outbound referrals
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select referral type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outbound">Outbound (Refer to external clinic)</SelectItem>
                <SelectItem value="inbound">Internal (Refer within clinic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
            
            {formData.referralType === 'outbound' ? (
              <div className="space-y-1">
                <Label htmlFor="clinic" className="text-sm">Select External Clinic *</Label>
                <Select
                  value={selectedClinic?._id || ""}
                  onValueChange={handleClinicSelect}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose external clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic._id} value={clinic._id}>
                        {clinic.name || clinic.fullName || clinic.adminName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="doctor" className="text-sm">Receiving Doctor (Internal) *</Label>
                <Select
                  value={selectedDoctor?._id || ""}
                  onValueChange={handleDoctorSelect}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose doctor from your clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentClinicDoctors && currentClinicDoctors.length > 0 ? (
                      currentClinicDoctors
                        .filter((doctor) => doctor.isActive !== false)
                        .filter((doctor) => formData.referringProvider.name !== doctor.fullName)
                        .map((doctor) => (
                          <SelectItem key={doctor._id} value={doctor._id}>
                            {doctor.fullName} - {doctor.specialty}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no-doctors-available-inbound" disabled>No doctors available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.referralType === 'outbound' && selectedClinic && (
              <div className="space-y-1">
                <Label htmlFor="specialist" className="text-sm">Select Doctor *</Label>
                <Select
                  value={selectedDoctor?._id || ""}
                  onValueChange={handleDoctorSelect}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose doctor from clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors && doctors.length > 0 ? (
                      doctors
                        .filter((doctor) => doctor.isActive !== false)
                        .map((doctor) => (
                          <SelectItem key={doctor._id} value={doctor._id}>
                            {doctor.fullName} - {doctor.specialty}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no-doctors-available-outbound" disabled>No doctors available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                {formData.referralType === 'outbound' ? 'Hospital/Clinic' : 'Clinic (Internal)'}
              </Label>
              <Input
                id="hospital"
                name="hospital"
                value={formData.referralType === 'outbound' && selectedClinic 
                  ? (selectedClinic.name || selectedClinic.fullName || selectedClinic.adminName)
                  : formData.referralType === 'inbound' && currentUserClinic
                  ? currentUserClinic.name
                  : formData.hospital
                }
                onChange={handleChange}
                placeholder={formData.referralType === 'outbound' ? 'Select external clinic first' : 'Current clinic'}
                className="h-9 text-sm"
                disabled={(formData.referralType === 'outbound' && selectedClinic) || (formData.referralType === 'inbound' && currentUserClinic)}
                readOnly={(formData.referralType === 'outbound' && selectedClinic) || (formData.referralType === 'inbound' && currentUserClinic)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="preferredDate" className="text-sm">Preferred Date</Label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                id="preferredDate"
                name="preferredDate"
                value={formData.preferredDate}
                onChange={handleChange}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Referring Provider Field for Outbound Referrals */}
          {formData.referralType === 'outbound' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="referringProvider.name" className="text-sm">
                  Referring Doctor * {currentUser?.role === 'doctor' && '(Auto-filled)'}
                </Label>
                <Select
                  value={currentClinicDoctors.find(doc => doc.fullName === formData.referringProvider.name)?._id || ""}
                  onValueChange={(value) => {
                    const selectedDoc = currentClinicDoctors.find(doc => doc._id === value);
                    setFormData(prev => ({
                      ...prev,
                      referringProvider: {
                        ...prev.referringProvider,
                        name: selectedDoc ? selectedDoc.fullName : value,
                        contact: selectedDoc ? `${selectedDoc.phone || ''} ${selectedDoc.email || ''}`.trim() : '',
                        clinic: selectedDoc ? 'Current Clinic' : ''
                      }
                    }));
                  }}
                  disabled={currentUser?.role === 'doctor'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select referring doctor">
                      {formData.referringProvider.name || "Select referring doctor"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {currentClinicDoctors && currentClinicDoctors.length > 0 ? (
                      currentClinicDoctors
                        .filter((doctor) => doctor.isActive !== false)
                        .map((doctor) => (
                          <SelectItem key={doctor._id} value={doctor._id}>
                            {doctor.fullName} - {doctor.specialty}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no-doctors-available-disabled" disabled>No doctors available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
            </div>
          )}

          {/* Referring Provider Fields for Inbound Referrals */}
          {formData.referralType === 'inbound' && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="referringProvider.name" className="text-sm">
                  Referring Doctor (Internal) * {currentUser?.role === 'doctor' && '(Auto-filled)'}
                </Label>
                <Select
                  value={currentClinicDoctors.find(doc => doc.fullName === formData.referringProvider.name)?._id || ""}
                  onValueChange={(value) => {
                    const selectedDoc = currentClinicDoctors.find(doc => doc._id === value);
                    setFormData(prev => ({
                      ...prev,
                      referringProvider: {
                        ...prev.referringProvider,
                        name: selectedDoc ? selectedDoc.fullName : value,
                        contact: selectedDoc ? `${selectedDoc.phone || ''} ${selectedDoc.email || ''}`.trim() : '',
                        clinic: currentUserClinic?.name || 'Current Clinic'
                      }
                    }));
                  }}
                  disabled={currentUser?.role === 'doctor'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select referring doctor from your clinic">
                      {formData.referringProvider.name || "Select referring doctor from your clinic"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {currentClinicDoctors && currentClinicDoctors.length > 0 ? (
                      currentClinicDoctors
                        .filter((doctor) => doctor.isActive !== false)
                        .filter((doctor) => formData.specialistName !== doctor.fullName)
                        .map((doctor) => (
                          <SelectItem key={doctor._id} value={doctor._id}>
                            {doctor.fullName} - {doctor.specialty}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no-doctors-available-disabled-inbound" disabled>No doctors available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
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
              disabled={submitting}
              className="h-9"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="h-9"
              style={{ backgroundColor: '#0059B3', color: 'white' }}
              onMouseEnter={(e) => !submitting && (e.target.style.backgroundColor = '#004494')}
              onMouseLeave={(e) => !submitting && (e.target.style.backgroundColor = '#0059B3')}
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Referral"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateReferralModal;
