import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { vitalsAPI } from "@/services/api";
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Scale, 
  Ruler,
  Stethoscope,
  FileText,
  Calendar,
  User,
  Plus,
  Trash2
} from "lucide-react";

const VitalsModal = ({ isOpen, onClose, patient, vitalsData = null, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("vitals");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    patientId: patient?._id || "",
    uhid: patient?.uhid || patient?._id || patient?.id || "",
    visitDate: new Date().toISOString().split('T')[0],
    status: "Draft",
    isPreConsultation: true,
    
    // Vital Signs
    vitalSigns: {
      height: { value: "", unit: "cm" },
      weight: { value: "", unit: "kg" },
      bmi: { value: "", category: "" },
      bloodPressure: { systolic: "", diastolic: "", unit: "mmHg" },
      heartRate: { value: "", unit: "bpm" },
      respiratoryRate: { value: "", unit: "breaths/min" },
      temperature: { value: "", unit: "°C" },
      oxygenSaturation: { value: "", unit: "%" }
    },
    
    // Clinical Notes
    clinicalNotes: {
      chiefComplaint: { complaint: "", duration: "" },
      allergies: { drug: [], food: [], environment: [] },
      currentMedications: [],
      recentHospitalizations: [],
      pastMedicalHistory: {
        chronicIllnesses: [],
        surgeries: [],
        hospitalizations: []
      },
      familyMedicalHistory: {
        diabetes: false,
        hypertension: false,
        heartDisease: false,
        cancer: false,
        other: []
      },
      immunizationStatus: {
        upToDate: false,
        lastUpdated: "",
        notes: ""
      },
      lifestyleHabits: { general: "" },
      nurseObservations: {
        generalAppearance: "",
        specialRemarks: "",
        additionalNotes: ""
      }
    }
  });

  // Load existing vitals data if editing
  useEffect(() => {
    if (vitalsData) {
      setFormData({
        ...formData,
        ...vitalsData,
        visitDate: vitalsData.visitDate ? new Date(vitalsData.visitDate).toISOString().split('T')[0] : formData.visitDate,
        vitalSigns: { ...formData.vitalSigns, ...vitalsData.vitalSigns },
        clinicalNotes: { ...formData.clinicalNotes, ...vitalsData.clinicalNotes }
      });
    }
  }, [vitalsData]);

  // Calculate BMI when height or weight changes
  useEffect(() => {
    const height = parseFloat(formData.vitalSigns.height.value);
    const weight = parseFloat(formData.vitalSigns.weight.value);
    
    if (height > 0 && weight > 0) {
      const heightInM = height / 100;
      const bmi = weight / (heightInM * heightInM);
      const roundedBmi = Math.round(bmi * 10) / 10;
      
      let category = "";
      if (bmi < 18.5) category = "Underweight";
      else if (bmi < 25) category = "Normal";
      else if (bmi < 30) category = "Overweight";
      else category = "Obese";
      
      setFormData(prev => ({
        ...prev,
        vitalSigns: {
          ...prev.vitalSigns,
          bmi: { value: roundedBmi, category }
        }
      }));
    }
  }, [formData.vitalSigns.height.value, formData.vitalSigns.weight.value]);

  const handleVitalSignChange = (field, subfield, value) => {
    setFormData(prev => ({
      ...prev,
      vitalSigns: {
        ...prev.vitalSigns,
        [field]: {
          ...prev.vitalSigns[field],
          [subfield]: value
        }
      }
    }));
  };

  const handleClinicalNoteChange = (field, subfield, value) => {
    setFormData(prev => ({
      ...prev,
      clinicalNotes: {
        ...prev.clinicalNotes,
        [field]: typeof prev.clinicalNotes[field] === 'object' && !Array.isArray(prev.clinicalNotes[field])
          ? { ...prev.clinicalNotes[field], [subfield]: value }
          : value
      }
    }));
  };

  const addArrayItem = (field, subfield = null) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (subfield) {
        newData.clinicalNotes[field][subfield].push("");
      } else {
        newData.clinicalNotes[field].push("");
      }
      return newData;
    });
  };

  const removeArrayItem = (field, index, subfield = null) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (subfield) {
        newData.clinicalNotes[field][subfield].splice(index, 1);
      } else {
        newData.clinicalNotes[field].splice(index, 1);
      }
      return newData;
    });
  };

  const updateArrayItem = (field, index, value, subfield = null) => {
    setFormData(prev => {
      const newData = { ...prev };
      if (subfield) {
        newData.clinicalNotes[field][subfield][index] = value;
      } else {
        newData.clinicalNotes[field][index] = value;
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        patientId: patient._id || patient.id,
        uhid: patient.uhid || patient._id || patient.id || `PAT-${Date.now()}`
      };

      let response;
      if (vitalsData) {
        response = await vitalsAPI.update(vitalsData._id, submitData);
      } else {
        response = await vitalsAPI.create(submitData);
      }

      toast({
        title: "Success",
        description: response.message || `Vitals ${vitalsData ? 'updated' : 'recorded'} successfully!`
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving vitals:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save vitals. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getBMIColor = (category) => {
    switch (category) {
      case 'Underweight': return 'text-blue-600';
      case 'Normal': return 'text-green-600';
      case 'Overweight': return 'text-yellow-600';
      case 'Obese': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            {vitalsData ? 'Edit Vitals Record' : 'Record Patient Vitals'}
          </DialogTitle>
          <DialogDescription>
            {patient?.fullName} - UHID: {patient?.uhid}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="visitDate">Visit Date</Label>
              <Input
                id="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="isPreConsultation"
                checked={formData.isPreConsultation}
                onChange={(e) => setFormData(prev => ({ ...prev, isPreConsultation: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="isPreConsultation">Pre-consultation</Label>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
              <TabsTrigger value="clinical">Clinical Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="vitals" className="space-y-6">
              {/* Vital Signs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Height & Weight */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Ruler className="w-4 h-4" />
                      Physical Measurements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Height (cm)</Label>
                      <Input
                        type="number"
                        value={formData.vitalSigns.height.value}
                        onChange={(e) => handleVitalSignChange('height', 'value', e.target.value)}
                        placeholder="170"
                        min="0"
                        max="300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input
                        type="number"
                        value={formData.vitalSigns.weight.value}
                        onChange={(e) => handleVitalSignChange('weight', 'value', e.target.value)}
                        placeholder="70"
                        min="0"
                        max="500"
                      />
                    </div>
                    {formData.vitalSigns.bmi.value && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium">BMI</div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{formData.vitalSigns.bmi.value}</span>
                          <Badge className={getBMIColor(formData.vitalSigns.bmi.category)}>
                            {formData.vitalSigns.bmi.category}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Blood Pressure & Heart Rate */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Heart className="w-4 h-4" />
                      Cardiovascular
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Blood Pressure (mmHg)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={formData.vitalSigns.bloodPressure.systolic}
                          onChange={(e) => handleVitalSignChange('bloodPressure', 'systolic', e.target.value)}
                          placeholder="120"
                          min="50"
                          max="300"
                        />
                        <span className="flex items-center">/</span>
                        <Input
                          type="number"
                          value={formData.vitalSigns.bloodPressure.diastolic}
                          onChange={(e) => handleVitalSignChange('bloodPressure', 'diastolic', e.target.value)}
                          placeholder="80"
                          min="30"
                          max="200"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Heart Rate (bpm)</Label>
                      <Input
                        type="number"
                        value={formData.vitalSigns.heartRate.value}
                        onChange={(e) => handleVitalSignChange('heartRate', 'value', e.target.value)}
                        placeholder="72"
                        min="30"
                        max="200"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Temperature & Respiratory */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Thermometer className="w-4 h-4" />
                      Respiratory & Temperature
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Temperature (°C)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.vitalSigns.temperature.value}
                        onChange={(e) => handleVitalSignChange('temperature', 'value', e.target.value)}
                        placeholder="36.5"
                        min="30"
                        max="45"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Respiratory Rate (breaths/min)</Label>
                      <Input
                        type="number"
                        value={formData.vitalSigns.respiratoryRate.value}
                        onChange={(e) => handleVitalSignChange('respiratoryRate', 'value', e.target.value)}
                        placeholder="16"
                        min="8"
                        max="60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Oxygen Saturation (%)</Label>
                      <Input
                        type="number"
                        value={formData.vitalSigns.oxygenSaturation.value}
                        onChange={(e) => handleVitalSignChange('oxygenSaturation', 'value', e.target.value)}
                        placeholder="98"
                        min="70"
                        max="100"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="clinical" className="space-y-6">
              {/* Chief Complaint */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    Chief Complaint
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Complaint</Label>
                      <Textarea
                        value={formData.clinicalNotes.chiefComplaint.complaint}
                        onChange={(e) => handleClinicalNoteChange('chiefComplaint', 'complaint', e.target.value)}
                        placeholder="Patient's main concern..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Input
                        value={formData.clinicalNotes.chiefComplaint.duration}
                        onChange={(e) => handleClinicalNoteChange('chiefComplaint', 'duration', e.target.value)}
                        placeholder="e.g., 3 days, 2 weeks"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Nurse Observations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" />
                    Nurse Observations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>General Appearance</Label>
                    <Textarea
                      value={formData.clinicalNotes.nurseObservations.generalAppearance}
                      onChange={(e) => handleClinicalNoteChange('nurseObservations', 'generalAppearance', e.target.value)}
                      placeholder="Patient appears alert, oriented..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Special Remarks</Label>
                    <Textarea
                      value={formData.clinicalNotes.nurseObservations.specialRemarks}
                      onChange={(e) => handleClinicalNoteChange('nurseObservations', 'specialRemarks', e.target.value)}
                      placeholder="Any special observations..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={formData.clinicalNotes.nurseObservations.additionalNotes}
                      onChange={(e) => handleClinicalNoteChange('nurseObservations', 'additionalNotes', e.target.value)}
                      placeholder="Additional clinical notes..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
              disabled={loading}
            >
              {loading ? 'Saving...' : vitalsData ? 'Update Vitals' : 'Record Vitals'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VitalsModal;
