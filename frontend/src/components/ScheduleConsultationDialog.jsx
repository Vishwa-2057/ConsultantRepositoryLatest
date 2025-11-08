import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, User, Video, Phone, MessageCircle, Users } from "lucide-react";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { consultationAPI, patientAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const ScheduleConsultationDialog = ({ open, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    consultationType: "",
    mode: "",
    date: null,
    time: "",
    duration: 30,
    reason: "",
    symptoms: "",
    patientNotes: "",
    priority: "Medium"
  });

  // Available time slots (9 AM to 6 PM, 30-minute intervals)
  const timeSlots = [];
  for (let hour = 9; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  const consultationTypes = [
    { value: "General", label: "General Consultation", icon: User },
    { value: "Follow-up", label: "Follow-up Visit", icon: Clock }
  ];

  const consultationModes = [
    { value: "Video", label: "Video Call", icon: Video, color: "bg-blue-500" },
    { value: "Phone", label: "Phone Call", icon: Phone, color: "bg-green-500" },
    { value: "Chat", label: "Chat Session", icon: MessageCircle, color: "bg-purple-500" },
    { value: "In-person", label: "In-Person", icon: User, color: "bg-orange-500" }
  ];

  const priorityOptions = [
    { value: "Medium", label: "Medium Priority", color: "primary" },
    { value: "High", label: "High Priority", color: "warning" }
  ];

  // Load patients on component mount
  useEffect(() => {
    if (open) {
      loadPatients();
    }
  }, [open]);

  // Search patients when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      searchPatients(searchQuery);
    } else {
      loadPatients();
    }
  }, [searchQuery]);

  const loadPatients = async () => {
    try {
      const response = await patientAPI.getAll(1, 50);
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients. Please try again.",
        variant: "destructive",
      });
    }
  };

  const searchPatients = async (query) => {
    try {
      const response = await patientAPI.search(query);
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast({
        title: "Error",
        description: "Failed to search patients. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patientId: patient._id,
      patientName: patient.fullName
    }));
    setSearchQuery("");
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.consultationType || !formData.mode || !formData.date || !formData.time) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const consultationData = {
        ...formData,
        date: format(formData.date, 'yyyy-MM-dd'),
        provider: "Dr. Johnson" // Default provider
      };

      const response = await consultationAPI.create(consultationData);
      
      toast({
        title: "Success",
        description: "Consultation scheduled successfully!",
      });

      // Reset form
      setFormData({
        patientId: "",
        patientName: "",
        consultationType: "",
        mode: "",
        date: null,
        time: "",
        duration: 30,
        reason: "",
        symptoms: "",
        patientNotes: "",
        priority: "Medium"
      });
      setSelectedPatient(null);
      setSearchQuery("");
      
      onSuccess && onSuccess(response.consultation);
      onOpenChange(false);
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule consultation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: "",
      patientName: "",
      consultationType: "",
      mode: "",
      date: null,
      time: "",
      duration: 30,
      reason: "",
      symptoms: "",
      patientNotes: "",
      priority: "Medium"
    });
    setSelectedPatient(null);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <span>Schedule New Consultation</span>
          </DialogTitle>
          <DialogDescription>
            Schedule a new teleconsultation or in-person appointment with a patient.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patient">Patient *</Label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedPatient.fullName}</p>
                      <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPatient(null);
                      setFormData(prev => ({ ...prev, patientId: "", patientName: "" }));
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Search patients by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {patients.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      {patients.map((patient) => (
                        <div
                          key={patient._id}
                          className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{patient.fullName}</p>
                              <p className="text-xs text-muted-foreground">{patient.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Consultation Type */}
            <div className="space-y-2">
              <Label htmlFor="consultationType">Consultation Type *</Label>
              <Select value={formData.consultationType} onValueChange={(value) => handleInputChange('consultationType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consultation type" />
                </SelectTrigger>
                <SelectContent>
                  {consultationTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Consultation Mode */}
            <div className="space-y-2">
              <Label htmlFor="mode">Consultation Mode *</Label>
              <div className="grid grid-cols-2 gap-2">
                {consultationModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <Button
                      key={mode.value}
                      type="button"
                      variant={formData.mode === mode.value ? "default" : "outline"}
                      className={cn(
                        "justify-start h-auto p-3",
                        formData.mode === mode.value && "bg-gradient-primary"
                      )}
                      onClick={() => handleInputChange('mode', mode.value)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", mode.color)}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm">{mode.label}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => handleInputChange('date', date)}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Select value={formData.time} onValueChange={(value) => handleInputChange('time', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">120 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center space-x-2">
                        <Badge variant={priority.color} className="w-2 h-2 p-0" />
                        <span>{priority.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Consultation</Label>
              <Textarea
                id="reason"
                placeholder="Brief description of the consultation reason..."
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symptoms">Symptoms (if any)</Label>
              <Textarea
                id="symptoms"
                placeholder="Patient's current symptoms..."
                value={formData.symptoms}
                onChange={(e) => handleInputChange('symptoms', e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patientNotes">Additional Notes</Label>
              <Textarea
                id="patientNotes"
                placeholder="Any additional information or special instructions..."
                value={formData.patientNotes}
                onChange={(e) => handleInputChange('patientNotes', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary"
              disabled={loading}
            >
              {loading ? "Scheduling..." : "Schedule Consultation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleConsultationDialog;
