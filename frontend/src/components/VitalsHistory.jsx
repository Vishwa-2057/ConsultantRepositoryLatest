import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  Calendar,
  User,
  Eye,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import VitalsModal from "./VitalsModal";

const VitalsHistory = ({ isOpen, onClose, patient }) => {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVitals, setSelectedVitals] = useState(null);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && patient) {
      loadVitals();
    }
  }, [isOpen, patient]);

  const loadVitals = async () => {
    setLoading(true);
    try {
      const response = await vitalsAPI.getByPatient(patient._id);
      setVitals(response.data || []);
    } catch (error) {
      console.error('Error loading vitals:', error);
      toast({
        title: "Error",
        description: "Failed to load vitals history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVitals = async (vitalsId, visitDate) => {
    if (!confirm(`Are you sure you want to delete the vitals record from ${new Date(visitDate).toLocaleDateString()}?`)) {
      return;
    }

    try {
      await vitalsAPI.delete(vitalsId);
      toast({
        title: "Success",
        description: "Vitals record deleted successfully"
      });
      loadVitals();
    } catch (error) {
      console.error('Error deleting vitals:', error);
      toast({
        title: "Error",
        description: "Failed to delete vitals record. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditVitals = (vitalsRecord) => {
    setSelectedVitals(vitalsRecord);
    setIsEditMode(true);
    setIsVitalsModalOpen(true);
  };

  const handleAddVitals = () => {
    setSelectedVitals(null);
    setIsEditMode(false);
    setIsVitalsModalOpen(true);
  };

  const handleVitalsSuccess = () => {
    loadVitals();
    setIsVitalsModalOpen(false);
    setSelectedVitals(null);
  };

  const getBMIColor = (category) => {
    switch (category) {
      case 'Underweight': return 'bg-blue-100 text-blue-800';
      case 'Normal': return 'bg-green-100 text-green-800';
      case 'Overweight': return 'bg-yellow-100 text-yellow-800';
      case 'Obese': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Reviewed': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatVitalValue = (vital, unit = '') => {
    if (!vital || vital.value === undefined || vital.value === '') return 'Not recorded';
    return `${vital.value} ${unit || vital.unit || ''}`.trim();
  };

  const formatBloodPressure = (bp) => {
    if (!bp || !bp.systolic || !bp.diastolic) return 'Not recorded';
    return `${bp.systolic}/${bp.diastolic} ${bp.unit || 'mmHg'}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-600" />
                Vitals History
              </DialogTitle>
              <Button
                onClick={handleAddVitals}
                className="bg-gradient-to-r from-blue-800 to-teal-500 hover:from-blue-900 hover:to-teal-600"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Vitals
              </Button>
            </div>
            <DialogDescription>
              {patient?.fullName} - UHID: {patient?.uhid}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground">Loading vitals history...</p>
              </div>
            ) : vitals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 space-y-4">
                <p className="text-muted-foreground">No vitals records found for this patient.</p>
                <Button
                  onClick={handleAddVitals}
                  className="bg-gradient-to-r from-blue-800 to-teal-500 hover:from-blue-900 hover:to-teal-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Record First Vitals
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {vitals.map((vital) => (
                  <Card key={vital._id} className="border border-border hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(vital.visitDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <User className="w-3 h-3" />
                              Recorded by: {vital.recordedByName} ({vital.recordedByRole})
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(vital.status)}>
                              {vital.status}
                            </Badge>
                            {vital.isPreConsultation && (
                              <Badge variant="outline">Pre-consultation</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditVitals(vital)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteVitals(vital._id, vital.visitDate)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Physical Measurements */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Ruler className="w-4 h-4" />
                            Physical
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Height:</span>
                              <span>{formatVitalValue(vital.vitalSigns?.height, 'cm')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Weight:</span>
                              <span>{formatVitalValue(vital.vitalSigns?.weight, 'kg')}</span>
                            </div>
                            {vital.vitalSigns?.bmi?.value && (
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">BMI:</span>
                                <div className="flex items-center gap-2">
                                  <span>{vital.vitalSigns.bmi.value}</span>
                                  <Badge size="sm" className={getBMIColor(vital.vitalSigns.bmi.category)}>
                                    {vital.vitalSigns.bmi.category}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cardiovascular */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Heart className="w-4 h-4" />
                            Cardiovascular
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Blood Pressure:</span>
                              <span>{formatBloodPressure(vital.vitalSigns?.bloodPressure)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Heart Rate:</span>
                              <span>{formatVitalValue(vital.vitalSigns?.heartRate, 'bpm')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Respiratory & Temperature */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Thermometer className="w-4 h-4" />
                            Respiratory
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Temperature:</span>
                              <span>{formatVitalValue(vital.vitalSigns?.temperature, '°C')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Respiratory Rate:</span>
                              <span>{formatVitalValue(vital.vitalSigns?.respiratoryRate, 'breaths/min')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Oxygen Saturation:</span>
                              <span>{formatVitalValue(vital.vitalSigns?.oxygenSaturation, '%')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Clinical Notes Summary */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Clinical Notes
                          </h4>
                          <div className="space-y-2 text-sm">
                            {vital.clinicalNotes?.chiefComplaint?.complaint && (
                              <div>
                                <span className="text-muted-foreground">Chief Complaint:</span>
                                <p className="text-xs mt-1 line-clamp-2">{vital.clinicalNotes.chiefComplaint.complaint}</p>
                              </div>
                            )}
                            {vital.clinicalNotes?.nurseObservations?.generalAppearance && (
                              <div>
                                <span className="text-muted-foreground">General Appearance:</span>
                                <p className="text-xs mt-1 line-clamp-2">{vital.clinicalNotes.nurseObservations.generalAppearance}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Created: {new Date(vital.createdAt).toLocaleString()}</span>
                        {vital.updatedAt !== vital.createdAt && (
                          <span>Updated: {new Date(vital.updatedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Vitals Modal */}
      <VitalsModal
        isOpen={isVitalsModalOpen}
        onClose={() => {
          setIsVitalsModalOpen(false);
          setSelectedVitals(null);
        }}
        patient={patient}
        vitalsData={selectedVitals}
        onSuccess={handleVitalsSuccess}
      />
    </>
  );
};

export default VitalsHistory;
