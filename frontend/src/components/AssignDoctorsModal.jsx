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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, X, Plus, Users, Stethoscope } from "lucide-react";
import { doctorAPI, patientAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const AssignDoctorsModal = ({ isOpen, onClose, patient, onUpdate }) => {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [assignedDoctors, setAssignedDoctors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Load doctors and initialize assigned doctors when modal opens
  useEffect(() => {
    if (isOpen && patient) {
      loadDoctors();
      setAssignedDoctors(patient.assignedDoctors || []);
    }
  }, [isOpen, patient]);

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const response = await doctorAPI.getAll();
      const doctorsList = response.doctors || response.data || [];
      console.log('Loaded doctors for assignment:', doctorsList);
      setDoctors(Array.isArray(doctorsList) ? doctorsList : []);
    } catch (error) {
      console.error('Failed to load doctors:', error);
      setDoctors([]);
      toast({
        title: "Error",
        description: "Failed to load doctors. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDoctorsLoading(false);
    }
  };

  const addDoctor = (doctorId) => {
    if (doctorId !== "none" && doctorId !== "unavailable" && !assignedDoctors.some(d => d._id === doctorId)) {
      const doctor = doctors.find(d => d._id === doctorId);
      if (doctor) {
        setAssignedDoctors(prev => [...prev, doctor]);
      }
    }
  };

  const removeDoctor = (doctorId) => {
    setAssignedDoctors(prev => prev.filter(d => d._id !== doctorId));
  };

  const handleSave = async () => {
    if (!patient) return;
    
    setSubmitting(true);
    try {
      // Extract just the doctor IDs for the API call
      const doctorIds = assignedDoctors.map(d => d._id);
      
      // Update patient with new assigned doctors using the dedicated endpoint
      const response = await patientAPI.updateAssignedDoctors(patient._id, doctorIds);

      toast({
        title: "Success",
        description: `Assigned doctors updated for ${patient.fullName}`,
      });

      // Call onUpdate with the updated patient data
      if (onUpdate) {
        onUpdate({
          ...patient,
          assignedDoctors: assignedDoctors
        });
      }

      handleClose();
    } catch (error) {
      console.error('Error updating assigned doctors:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update assigned doctors. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setAssignedDoctors([]);
      onClose();
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={submitting ? undefined : handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Manage Assigned Doctors
          </DialogTitle>
          <DialogDescription>
            Add or remove doctors assigned to <strong>{patient.fullName}</strong> (UHID: {patient.uhid})
          </DialogDescription>
        </DialogHeader>

        {/* Submitting Overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg border flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="font-medium text-gray-900">Updating Assignments...</p>
                <p className="text-sm text-gray-600">Please wait while we save the changes</p>
              </div>
            </div>
          </div>
        )}

        <div className={`space-y-6 ${submitting ? 'pointer-events-none opacity-50' : ''}`}>
          {/* Patient Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{patient.fullName}</h3>
                <p className="text-sm text-gray-600">UHID: {patient.uhid} • {patient.gender} • {patient.bloodGroup}</p>
              </div>
            </div>
          </div>

          {/* Add Doctor Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Doctor
            </h4>
            <Select onValueChange={addDoctor}>
              <SelectTrigger>
                <Stethoscope className="w-4 h-4 mr-2" />
                <SelectValue placeholder={doctorsLoading ? "Loading doctors..." : "Select a doctor to assign"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a doctor</SelectItem>
                {doctors && doctors.length > 0 ? (
                  doctors
                    .filter(doctor => !assignedDoctors.some(d => d._id === doctor._id))
                    .map((doctor) => (
                      <SelectItem key={doctor._id} value={doctor._id}>
                        Dr. {doctor.fullName} - {doctor.specialty}
                      </SelectItem>
                    ))
                ) : (
                  <SelectItem value="unavailable" disabled>
                    {doctorsLoading ? "Loading..." : "No doctors available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned Doctors List */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Currently Assigned Doctors ({assignedDoctors.length})
            </h4>
            
            {assignedDoctors.length > 0 ? (
              <div className="space-y-2">
                {assignedDoctors.map((doctor) => (
                  <div key={doctor._id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Dr. {doctor.fullName}</p>
                        <p className="text-sm text-gray-600">{doctor.specialty}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDoctor(doctor._id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No doctors currently assigned</p>
                <p className="text-sm">Use the dropdown above to assign doctors to this patient</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {assignedDoctors.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Summary of Changes</h5>
              <p className="text-sm text-blue-800">
                {assignedDoctors.length} doctor{assignedDoctors.length !== 1 ? 's' : ''} will be assigned to {patient.fullName}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="gradient-button"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDoctorsModal;
