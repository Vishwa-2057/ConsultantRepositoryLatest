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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { patientAPI, doctorAPI } from "@/services/api";
import { isClinic, isDoctor, isNurse, getCurrentUser } from "@/utils/roleUtils";
import { Plus, Trash2, User, Calendar, UserCheck, AlertCircle, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { validators, sanitizers } from "@/utils/validation";
import { useAuditLog } from "@/hooks/useAuditLog";

const PrescriptionModal = ({ isOpen, onClose, onSubmit, prescription = null }) => {
  const { toast } = useToast();
  const { logComponentAccess, logFormSubmission, logPrescriptionAccess } = useAuditLog();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const currentUser = getCurrentUser();
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [doctorComboboxOpen, setDoctorComboboxOpen] = useState(false);
  
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

  // Load data when modal opens and log component access
  useEffect(() => {
    if (isOpen) {
      loadPatients();
      // Load doctors for clinic admins and nurses (doctors don't need to select themselves)
      if (isClinic() || isNurse()) {
        loadDoctors();
      }
      // Log prescription form access
      logComponentAccess('PrescriptionModal', prescription ? 'EDIT' : 'CREATE');
    }
  }, [isOpen, prescription, logComponentAccess]);

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

    // Patient validation
    if (!formData.patientId) {
      newErrors.patientId = "Patient is required";
    }

    // Doctor validation - only for clinic admins and nurses
    if ((isClinic() || isNurse()) && !formData.doctorId) {
      newErrors.doctorId = "Doctor is required";
    }

    // Diagnosis validation
    const diagnosisError = validators.required(formData.diagnosis, 'Diagnosis') ||
                          validators.minLength(formData.diagnosis, 3, 'Diagnosis') ||
                          validators.maxLength(formData.diagnosis, 200, 'Diagnosis');
    if (diagnosisError) {
      newErrors.diagnosis = diagnosisError;
    }

    // Validate medications
    if (formData.medications.length === 0) {
      newErrors.medications = "At least one medication is required";
    } else {
      formData.medications.forEach((medication, index) => {
        // Medication name validation
        const nameError = validators.required(medication.name, 'Medication name') ||
                         validators.minLength(medication.name, 2, 'Medication name') ||
                         validators.maxLength(medication.name, 100, 'Medication name');
        if (nameError) {
          newErrors[`medication_${index}_name`] = nameError;
        }
        
        // Dosage validation
        const dosageError = validators.required(medication.dosage, 'Dosage') ||
                           validators.maxLength(medication.dosage, 50, 'Dosage');
        if (dosageError) {
          newErrors[`medication_${index}_dosage`] = dosageError;
        }
        
        // Frequency validation
        const frequencyError = validators.required(medication.frequency, 'Frequency') ||
                              validators.maxLength(medication.frequency, 50, 'Frequency');
        if (frequencyError) {
          newErrors[`medication_${index}_frequency`] = frequencyError;
        }
        
        // Duration validation
        const durationError = validators.required(medication.duration, 'Duration') ||
                             validators.maxLength(medication.duration, 50, 'Duration');
        if (durationError) {
          newErrors[`medication_${index}_duration`] = durationError;
        }
        
        // Instructions validation (optional but if provided, check length)
        if (medication.instructions && medication.instructions.length > 200) {
          newErrors[`medication_${index}_instructions`] = "Instructions must not exceed 200 characters";
        }
      });
    }

    // Notes validation (optional but if provided, check length)
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = "Notes must not exceed 500 characters";
    }

    // Follow-up date validation (optional but if provided, must be in future)
    if (formData.followUpDate) {
      const followUpError = validators.pastDate(formData.followUpDate);
      if (followUpError) {
        newErrors.followUpDate = "Follow-up date must be in the future";
      }
    }

    // Follow-up instructions validation (optional but if provided, check length)
    if (formData.followUpInstructions && formData.followUpInstructions.length > 300) {
      newErrors.followUpInstructions = "Follow-up instructions must not exceed 300 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    // Don't sanitize while typing - only on submit
    // This allows users to type spaces at the end of sentences
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
    // Don't trim while typing - only apply length limits
    let sanitizedValue = value;
    
    // Apply field-specific limits
    switch (field) {
      case 'name':
        sanitizedValue = sanitizedValue.slice(0, 100);
        break;
      case 'dosage':
      case 'frequency':
      case 'duration':
        sanitizedValue = sanitizedValue.slice(0, 50);
        break;
      case 'instructions':
        sanitizedValue = sanitizedValue.slice(0, 200);
        break;
    }
    
    const updatedMedications = [...formData.medications];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: sanitizedValue
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
      // Trim all text fields before submitting
      const submitData = {
        ...formData,
        diagnosis: formData.diagnosis?.trim(),
        notes: formData.notes?.trim(),
        followUpInstructions: formData.followUpInstructions?.trim(),
        medications: formData.medications.map(med => ({
          ...med,
          name: med.name?.trim(),
          dosage: med.dosage?.trim(),
          frequency: med.frequency?.trim(),
          duration: med.duration?.trim(),
          instructions: med.instructions?.trim()
        })),
        followUpDate: formData.followUpDate || undefined
      };

      const result = await onSubmit(submitData);
      
      // Log successful prescription operation
      const action = prescription ? 'UPDATE' : 'CREATE';
      const prescriptionId = result?._id || result?.id || prescription?._id;
      await logFormSubmission('PRESCRIPTION', action, prescriptionId, formData.patientId);
      await logPrescriptionAccess(prescriptionId, formData.patientId, action);
      
      toast({
        title: "Success",
        description: `Prescription ${prescription ? 'updated' : 'created'} successfully`,
      });
      
      onClose();
      
      // Reload the page to refresh the data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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
              <Popover open={patientComboboxOpen} onOpenChange={setPatientComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientComboboxOpen}
                    className={`w-full justify-between ${errors.patientId ? "border-red-500" : ""}`}
                    disabled={loadingPatients || !!prescription || loading}
                  >
                    {formData.patientId
                      ? patients.find(p => p._id === formData.patientId)?.fullName || "Select patient..."
                      : loadingPatients ? "Loading patients..." : "Select patient..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                  <Command>
                    <CommandInput placeholder="Search patients..." />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>No patient found.</CommandEmpty>
                      <CommandGroup>
                        {patients.map((patient) => (
                          <CommandItem
                            key={patient._id}
                            value={`${patient.fullName} ${patient.phone} ${patient.email || ''}`}
                            onSelect={() => {
                              handleInputChange('patientId', patient._id);
                              setPatientComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.patientId === patient._id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{patient.fullName}</span>
                              <span className="text-sm text-muted-foreground">
                                {patient.age || 0}y • {patient.gender || 'Unknown'} • {patient.phone}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                <Popover open={doctorComboboxOpen} onOpenChange={setDoctorComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={doctorComboboxOpen}
                      className={`w-full justify-between ${errors.doctorId ? "border-red-500" : ""}`}
                      disabled={loadingDoctors || loading}
                    >
                      {formData.doctorId
                        ? `Dr. ${doctors.find(d => d._id === formData.doctorId)?.fullName || 'Select doctor...'}`
                        : loadingDoctors ? "Loading doctors..." : "Select doctor..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                    <Command>
                      <CommandInput placeholder="Search doctors..." />
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>No doctor found.</CommandEmpty>
                        <CommandGroup>
                          {doctors.map((doctor) => (
                            <CommandItem
                              key={doctor._id}
                              value={`${doctor.fullName} ${doctor.specialty}`}
                              onSelect={() => {
                                handleInputChange('doctorId', doctor._id);
                                setDoctorComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.doctorId === doctor._id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">Dr. {doctor.fullName}</span>
                                <span className="text-sm text-muted-foreground">{doctor.specialty || 'General'}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
              disabled={loading}
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
                className="flex items-center gap-1"
                disabled={loading}
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
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
                      disabled={loading}
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
                min={new Date().toISOString().split('T')[0]}
                value={formData.followUpDate}
                onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
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
