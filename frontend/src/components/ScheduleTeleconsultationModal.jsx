import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Video, User, Settings } from 'lucide-react';
import { patientAPI, appointmentAPI, teleconsultationAPI, doctorAPI } from '@/services/api';
import { toast } from 'sonner';
import { getCurrentUser, isDoctor } from '@/utils/roleUtils';

const ScheduleTeleconsultationModal = ({ isOpen, onClose, onSuccess, selectedPatient = null }) => {
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  // Get current user from localStorage
  const user = getCurrentUser();
  
  const [formData, setFormData] = useState({
    appointmentId: '',
    patientId: selectedPatient?._id || '',
    doctorId: isDoctor() ? user?.id || '' : '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 30,
    requirePassword: false,
    enableRecording: false,
    features: {
      screenSharing: true,
      chat: true,
      whiteboard: false,
      fileSharing: true
    }
  });

  // Load patients and doctors when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!selectedPatient) {
        loadPatients();
      }
      // Only load doctors if user is not a doctor (clinic admins can choose doctors)
      if (!isDoctor()) {
        loadDoctors();
      }
    }
  }, [isOpen, selectedPatient]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        appointmentId: '',
        patientId: selectedPatient?._id || '',
        doctorId: isDoctor() ? user?.id || '' : '',
        scheduledDate: '',
        scheduledTime: '',
        duration: 30,
        requirePassword: false,
        enableRecording: false,
        features: {
          screenSharing: true,
          chat: true,
          whiteboard: false,
          fileSharing: true
        }
      });
    }
  }, [isOpen, selectedPatient]);

  const loadPatients = async () => {
    try {
      const response = await patientAPI.getAll(1, 100);
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await doctorAPI.getAll(1, 100);
      setDoctors(response.doctors || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast.error('Failed to load doctors');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureChange = (feature, value) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: value
      }
    }));
  };

  const validateForm = () => {
    if (!formData.patientId) {
      toast.error('Please select a patient');
      return false;
    }
    if (!formData.doctorId) {
      toast.error('Please select a doctor');
      return false;
    }
    if (!formData.scheduledDate) {
      toast.error('Please select a date');
      return false;
    }
    if (!formData.scheduledTime) {
      toast.error('Please select a time');
      return false;
    }

    // Check if date/time is in the future
    const selectedDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    if (isNaN(selectedDateTime.getTime())) {
      toast.error('Invalid date or time format');
      return false;
    }
    
    if (selectedDateTime <= new Date()) {
      toast.error('Please select a future date and time');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      // First create an appointment for the teleconsultation
      const appointmentData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        appointmentType: 'Teleconsultation',
        date: formData.scheduledDate,
        time: formData.scheduledTime,
        duration: formData.duration,
        isVirtual: true,
        reason: 'Teleconsultation via Jitsi Meet'
      };

      // Note: Clinic ID will be determined automatically by the backend based on user role

      const appointmentResponse = await appointmentAPI.create(appointmentData);
      const appointment = appointmentResponse.appointment || appointmentResponse;

      // Then create the teleconsultation
      const teleconsultationData = {
        appointmentId: appointment._id,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        duration: formData.duration,
        requirePassword: formData.requirePassword,
        enableRecording: formData.enableRecording,
        features: formData.features
      };

      console.log('Sending teleconsultation data:', teleconsultationData);
      console.log('Form data before sending:', formData);

      const response = await teleconsultationAPI.create(teleconsultationData);
      
      toast.success('Teleconsultation scheduled successfully!');
      
      if (onSuccess) {
        onSuccess(response.teleconsultation);
      }
      
      onClose();
      
      // Reload the page to refresh the data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error scheduling teleconsultation:', error);
      toast.error(error.message || 'Failed to schedule teleconsultation');
    } finally {
      setLoading(false);
    }
  };

  const selectedPatientData = selectedPatient || patients.find(p => p._id === formData.patientId);
  const selectedDoctorData = doctors.find(d => d._id === formData.doctorId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-600" />
            Schedule Teleconsultation
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            {selectedPatient ? (
              <div className="p-3 bg-gray-50 rounded-md flex items-center gap-3">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{selectedPatient.fullName}</span>
                <span className="text-sm text-gray-500">({selectedPatient.phone})</span>
              </div>
            ) : (
              <Select value={formData.patientId} onValueChange={(value) => handleInputChange('patientId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient._id} value={patient._id}>
                      {patient.fullName} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Doctor Selection */}
          <div className="space-y-2">
            <Label htmlFor="doctor">Doctor</Label>
            {isDoctor() ? (
              <div className="p-3 bg-blue-50 rounded-md flex items-center gap-3">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Dr. {user?.fullName || user?.name || 'Current Doctor'}</span>
                <span className="text-sm text-blue-600">(You)</span>
              </div>
            ) : (
              <Select value={formData.doctorId} onValueChange={(value) => handleInputChange('doctorId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor._id} value={doctor._id}>
                      Dr. {doctor.fullName} - {doctor.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={formData.duration.toString()} onValueChange={(value) => handleInputChange('duration', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Meeting Settings
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="requirePassword">Require Password</Label>
                  <p className="text-xs text-gray-500">Add password protection to the meeting</p>
                </div>
                <Switch
                  id="requirePassword"
                  checked={formData.requirePassword}
                  onCheckedChange={(checked) => handleInputChange('requirePassword', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableRecording">Enable Recording</Label>
                  <p className="text-xs text-gray-500">Allow meeting recording</p>
                </div>
                <Switch
                  id="enableRecording"
                  checked={formData.enableRecording}
                  onCheckedChange={(checked) => handleInputChange('enableRecording', checked)}
                />
              </div>
            </div>
          </div>

          {/* Feature Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Meeting Features</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="screenSharing" className="text-sm">Screen Sharing</Label>
                <Switch
                  id="screenSharing"
                  checked={formData.features.screenSharing}
                  onCheckedChange={(checked) => handleFeatureChange('screenSharing', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="chat" className="text-sm">Chat</Label>
                <Switch
                  id="chat"
                  checked={formData.features.chat}
                  onCheckedChange={(checked) => handleFeatureChange('chat', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="whiteboard" className="text-sm">Whiteboard</Label>
                <Switch
                  id="whiteboard"
                  checked={formData.features.whiteboard}
                  onCheckedChange={(checked) => handleFeatureChange('whiteboard', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="fileSharing" className="text-sm">File Sharing</Label>
                <Switch
                  id="fileSharing"
                  checked={formData.features.fileSharing}
                  onCheckedChange={(checked) => handleFeatureChange('fileSharing', checked)}
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {selectedPatientData && selectedDoctorData && formData.scheduledDate && formData.scheduledTime && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Meeting Summary</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Patient:</strong> {selectedPatientData.fullName}</p>
                <p><strong>Doctor:</strong> Dr. {selectedDoctorData.fullName} ({selectedDoctorData.specialty})</p>
                <p><strong>Date:</strong> {new Date(formData.scheduledDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {formData.scheduledTime}</p>
                <p><strong>Duration:</strong> {formData.duration} minutes</p>
                <p><strong>Platform:</strong> Jitsi Meet</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleTeleconsultationModal;
