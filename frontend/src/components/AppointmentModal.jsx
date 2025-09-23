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
import { Calendar, Clock, User, Phone, Mail, MapPin, Stethoscope, X } from "lucide-react";
import { appointmentAPI, patientAPI, doctorAPI } from "@/services/api";

const AppointmentModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    appointmentType: "",
    date: "",
    time: "",
    duration: "30",
    notes: "",
    priority: "normal"
  });

  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Load patients and doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPatients();
      loadDoctors();
    }
  }, [isOpen]);

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await patientAPI.getAll(1, 100); // Get up to 100 patients
      const list = response.patients || response.data || [];
      setPatients(list);
    } catch (error) {
      console.error('Failed to load patients:', error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await doctorAPI.getAll(1, 100); // Get up to 100 doctors
      const list = response.doctors || response.data || [];
      setDoctors(list);
    } catch (error) {
      console.error('Failed to load doctors:', error);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const appointmentTypes = [
    "General Consultation",
    "Follow-up Visit",
    "Annual Checkup",
    "Specialist Consultation",
    "Emergency Visit",
    "Lab Work",
    "Imaging",
    "Vaccination",
    "Physical Therapy",
    "Mental Health"
  ];

  const durationOptions = [
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
    { value: "120", label: "2 hours" }
  ];

  const priorityOptions = [
    { value: "low", label: "Low", color: "bg-green-100 text-green-800" },
    { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-800" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
    { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.patientId) {
      newErrors.patientId = "Please select a patient";
    }
    if (!formData.doctorId) {
      newErrors.doctorId = "Please select a doctor";
    }
    if (!formData.appointmentType) {
      newErrors.appointmentType = "Appointment type is required";
    }
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    if (!formData.time) {
      newErrors.time = "Time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        // Prepare appointment data
        const appointmentData = {
          patientId: formData.patientId,
          doctorId: formData.doctorId,
          appointmentType: formData.appointmentType,
          date: formData.date,
          time: formData.time,
          duration: parseInt(formData.duration, 10),
          notes: formData.notes.trim(),
          priority: formData.priority,
          status: "Scheduled"
        };
        
        // Send to backend API
        const response = await appointmentAPI.create(appointmentData);
        
        // Call onSubmit with the appointment data from backend response
        onSubmit(response.appointment);
        handleClose();
      } catch (error) {
        console.error('Failed to create appointment:', error);
        // Show error to user
        alert(`Failed to create appointment: ${error.message}`);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      patientId: "",
      doctorId: "",
      appointmentType: "",
      date: "",
      time: "",
      duration: "30",
      notes: "",
      priority: "normal"
    });
    setErrors({});
    onClose();
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5 text-teal-600" />
            Schedule New Appointment
          </DialogTitle>
          <DialogDescription>
            Create a new appointment for your patient. Fill in all required fields to proceed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              Patient Selection
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientId">Select Patient *</Label>
                <Select value={formData.patientId} onValueChange={(value) => handleInputChange("patientId", value)}>
                  <SelectTrigger className={errors.patientId ? "border-red-500" : ""}>
                    <SelectValue placeholder={loadingPatients ? "Loading patients..." : "Choose a patient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient._id} value={patient._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{patient.fullName}</span>
                          <span className="text-sm text-muted-foreground">
                            {patient.phone} • {patient.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.patientId && (
                  <p className="text-sm text-red-600">{errors.patientId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="doctorId">Select Doctor *</Label>
                <Select value={formData.doctorId} onValueChange={(value) => handleInputChange("doctorId", value)}>
                  <SelectTrigger className={errors.doctorId ? "border-red-500" : ""}>
                    <SelectValue placeholder={loadingDoctors ? "Loading doctors..." : "Choose a doctor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor._id} value={doctor._id}>
                        <div className="flex flex-col">
                          <span className="font-medium">Dr. {doctor.fullName}</span>
                          <span className="text-sm text-muted-foreground">
                            {doctor.specialty} • {doctor.phone}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.doctorId && (
                  <p className="text-sm text-red-600">{errors.doctorId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <Badge className={option.color}>
                          {option.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Appointment Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appointmentType">Appointment Type *</Label>
                <Select value={formData.appointmentType} onValueChange={(value) => handleInputChange("appointmentType", value)}>
                  <SelectTrigger className={errors.appointmentType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.appointmentType && (
                  <p className="text-sm text-red-600">{errors.appointmentType}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={formData.duration} onValueChange={(value) => handleInputChange("duration", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  className={errors.date ? "border-red-500" : ""}
                />
                {errors.date && (
                  <p className="text-sm text-red-600">{errors.date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange("time", e.target.value)}
                  className={errors.time ? "border-red-500" : ""}
                />
                {errors.time && (
                  <p className="text-sm text-red-600">{errors.time}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes, symptoms, or special requirements..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Summary */}
          {formData.patientId && formData.doctorId && formData.appointmentType && formData.date && formData.time && (
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <h4 className="font-medium text-teal-900 mb-2">Appointment Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-teal-800">
                <div>
                  <span className="font-medium">Patient:</span> {patients.find(p => p._id === formData.patientId)?.fullName}
                </div>
                <div>
                  <span className="font-medium">Doctor:</span> Dr. {doctors.find(d => d._id === formData.doctorId)?.fullName}
                </div>
                <div>
                  <span className="font-medium">Type:</span> {formData.appointmentType}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {new Date(formData.date).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Time:</span> {formData.time}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {durationOptions.find(d => d.value === formData.duration)?.label}
                </div>
                <div>
                  <span className="font-medium">Priority:</span> 
                  <Badge className={priorityOptions.find(p => p.value === formData.priority)?.color + " ml-2"}>
                    {priorityOptions.find(p => p.value === formData.priority)?.label}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentModal;
