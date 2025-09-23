import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { patientAPI, doctorAPI } from "@/services/api";
import { isClinic, isDoctor, isNurse, getCurrentUser } from "@/utils/roleUtils";
import { Plus, Trash2, User, Calendar, UserCheck } from "lucide-react";

const PrescriptionModal = ({ isOpen, onClose, onSubmit, prescription = null }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const currentUser = getCurrentUser();
  
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    diagnosis: "",
    medications: [
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: ""
      }
    ],
    notes: "",
    followUpDate: "",
    followUpInstructions: ""
  });

  const [errors, setErrors] = useState({});

  // Load patients and doctors on component mount
  useEffect(() => {
    if (isOpen) {
      loadPatients();
      // Load doctors for clinic admins and nurses (doctors don't need to select themselves)
      if (isClinic() || isNurse()) {
        loadDoctors();
      }
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (prescription) {
      setFormData({
        patientId: prescription.patientId?._id || "",
        doctorId: prescription.doctorId?._id || "",
        diagnosis: prescription.diagnosis || "",
        medications: prescription.medications?.length > 0 ? prescription.medications : [
          {
            name: "",
            dosage: "",
            frequency: "",
            duration: "",
            instructions: ""
          }
        ],
        notes: prescription.notes || "",
        followUpDate: prescription.followUpDate ? new Date(prescription.followUpDate).toISOString().split('T')[0] : "",
        followUpInstructions: prescription.followUpInstructions || ""
      });
    } else {
      // Reset form for new prescription
      setFormData({
        patientId: "",
        doctorId: isDoctor() ? currentUser?.id || currentUser?._id || "" : "",
        diagnosis: "",
        medications: [
          {
            name: "",
            dosage: "",
            frequency: "",
            duration: "",
            instructions: ""
          }
        ],
        notes: "",
        followUpDate: "",
        followUpInstructions: ""
      });
    }
    setErrors({});
  }, [prescription, isOpen]);

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await patientAPI.getAll(1, 100, { status: 'Active' });
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Failed to load patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await doctorAPI.getAll();
      console.log('Doctors API response:', response);
      setDoctors(response.doctors || []);
    } catch (error) {
      console.error('Failed to load doctors:', error);
      toast({
        title: "Error",
        description: "Failed to load doctors",
        variant: "destructive",
      });
    } finally {
      setLoadingDoctors(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.patientId) {
      newErrors.patientId = "Patient is required";
    }

    if ((isClinic() || isNurse()) && !formData.doctorId) {
      newErrors.doctorId = "Doctor is required";
    }

    if (!formData.diagnosis.trim()) {
      newErrors.diagnosis = "Diagnosis is required";
    }

    // Validate medications
    formData.medications.forEach((medication, index) => {
      if (!medication.name.trim()) {
        newErrors[`medication_${index}_name`] = "Medication name is required";
      }
      if (!medication.dosage.trim()) {
        newErrors[`medication_${index}_dosage`] = "Dosage is required";
      }
      if (!medication.frequency.trim()) {
        newErrors[`medication_${index}_frequency`] = "Frequency is required";
      }
      if (!medication.duration.trim()) {
        newErrors[`medication_${index}_duration`] = "Duration is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleMedicationChange = (index, field, value) => {
    const updatedMedications = [...formData.medications];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      medications: updatedMedications
    }));

    // Clear error when user starts typing
    const errorKey = `medication_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: undefined
      }));
    }
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: ""
        }
      ]
    }));
  };

  const removeMedication = (index) => {
    if (formData.medications.length > 1) {
      const updatedMedications = formData.medications.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        medications: updatedMedications
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        followUpDate: formData.followUpDate || undefined
      };

      await onSubmit(submitData);
      
      toast({
        title: "Success",
        description: `Prescription ${prescription ? 'updated' : 'created'} successfully`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting prescription:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${prescription ? 'update' : 'create'} prescription`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPatient = patients.find(p => p._id === formData.patientId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {prescription ? 'Edit Prescription' : 'New Prescription'}
          </DialogTitle>
          <DialogDescription>
            {prescription ? 'Update prescription details' : 'Create a new prescription for a patient'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient *</Label>
              <Select
                value={formData.patientId}
                onValueChange={(value) => handleInputChange('patientId', value)}
                disabled={loadingPatients || !!prescription}
              >
                <SelectTrigger className={errors.patientId ? "border-red-500" : ""}>
                  <SelectValue placeholder={loadingPatients ? "Loading patients..." : "Select a patient"} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient._id} value={patient._id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{patient.fullName}</span>
                        <Badge variant="outline" className="ml-2">
                          {patient.age || 0}y • {patient.gender || 'Unknown'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patientId && <p className="text-sm text-red-500">{errors.patientId}</p>}
            </div>

            {selectedPatient && (
              <div className="space-y-2">
                <Label>Patient Info</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{selectedPatient.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.age || 0} years • {selectedPatient.gender || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedPatient.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Doctor Selection - For Clinic Admins and Nurses */}
          {(isClinic() || isNurse()) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctorId">Doctor *</Label>
                <Select
                  value={formData.doctorId}
                  onValueChange={(value) => handleInputChange('doctorId', value)}
                  disabled={loadingDoctors}
                >
                  <SelectTrigger className={errors.doctorId ? "border-red-500" : ""}>
                    <SelectValue placeholder={loadingDoctors ? "Loading doctors..." : "Select a doctor"} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor._id} value={doctor._id}>
                        <div className="flex items-center justify-between w-full">
                          <span>Dr. {doctor.fullName}</span>
                          <Badge variant="outline" className="ml-2">
                            {doctor.specialty || 'General'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.doctorId && <p className="text-sm text-red-500">{errors.doctorId}</p>}
              </div>

              {formData.doctorId && (
                <div className="space-y-2">
                  <Label>Doctor Info</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    {(() => {
                      const selectedDoctor = doctors.find(d => d._id === formData.doctorId);
                      return selectedDoctor ? (
                        <>
                          <p className="font-medium">Dr. {selectedDoctor.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedDoctor.specialty || 'General Medicine'}
                          </p>
                          <p className="text-sm text-muted-foreground">{selectedDoctor.phone}</p>
                        </>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Doctor Display - For Logged-in Doctors */}
          {isDoctor() && (
            <div className="space-y-2">
              <Label>Prescribing Doctor</Label>
              <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Dr. {currentUser?.fullName || currentUser?.name || 'Current Doctor'}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUser?.specialty || 'General Medicine'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Diagnosis */}
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis *</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => handleInputChange('diagnosis', e.target.value)}
              placeholder="Enter diagnosis..."
              className={errors.diagnosis ? "border-red-500" : ""}
              rows={3}
            />
            {errors.diagnosis && <p className="text-sm text-red-500">{errors.diagnosis}</p>}
          </div>

          {/* Medications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Medications *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedication}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Medication
              </Button>
            </div>

            {formData.medications.map((medication, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Medication {index + 1}</span>
                    {formData.medications.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Medication Name *</Label>
                      <Input
                        value={medication.name}
                        onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                        placeholder="e.g., Paracetamol"
                        className={errors[`medication_${index}_name`] ? "border-red-500" : ""}
                      />
                      {errors[`medication_${index}_name`] && (
                        <p className="text-sm text-red-500">{errors[`medication_${index}_name`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Dosage *</Label>
                      <Input
                        value={medication.dosage}
                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                        placeholder="e.g., 500mg"
                        className={errors[`medication_${index}_dosage`] ? "border-red-500" : ""}
                      />
                      {errors[`medication_${index}_dosage`] && (
                        <p className="text-sm text-red-500">{errors[`medication_${index}_dosage`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Frequency *</Label>
                      <Input
                        value={medication.frequency}
                        onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                        placeholder="e.g., Twice daily"
                        className={errors[`medication_${index}_frequency`] ? "border-red-500" : ""}
                      />
                      {errors[`medication_${index}_frequency`] && (
                        <p className="text-sm text-red-500">{errors[`medication_${index}_frequency`]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Duration *</Label>
                      <Input
                        value={medication.duration}
                        onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                        placeholder="e.g., 7 days"
                        className={errors[`medication_${index}_duration`] ? "border-red-500" : ""}
                      />
                      {errors[`medication_${index}_duration`] && (
                        <p className="text-sm text-red-500">{errors[`medication_${index}_duration`]}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Instructions</Label>
                    <Textarea
                      value={medication.instructions}
                      onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                      placeholder="e.g., Take after meals"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow-up Date</Label>
              <Input
                id="followUpDate"
                type="date"
                value={formData.followUpDate}
                onChange={(e) => handleInputChange('followUpDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="followUpInstructions">Follow-up Instructions</Label>
            <Textarea
              id="followUpInstructions"
              value={formData.followUpInstructions}
              onChange={(e) => handleInputChange('followUpInstructions', e.target.value)}
              placeholder="Instructions for follow-up visit..."
              rows={2}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {prescription ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  {prescription ? 'Update Prescription' : 'Create Prescription'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionModal;
