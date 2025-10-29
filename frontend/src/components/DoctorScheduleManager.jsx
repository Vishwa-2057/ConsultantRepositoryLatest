import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { doctorAvailabilityAPI, scheduleExceptionAPI } from "@/services/api";
import { Calendar, Clock, Plus, X, Save, Trash2, AlertCircle, CalendarOff, Loader2 } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
];

const DoctorScheduleManager = ({ doctorId, clinicId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30); // Default 30 minutes
  
  // Weekly schedule state
  const [schedule, setSchedule] = useState(
    DAYS_OF_WEEK.map(day => ({
      dayOfWeek: day.value,
      dayLabel: day.label,
      enabled: false,
      slots: [
        { startTime: '09:00', endTime: '17:00' }
      ]
    }))
  );

  // Exceptions state
  const [exceptions, setExceptions] = useState([]);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    date: '',
    type: 'unavailable',
    startTime: '09:00',
    endTime: '17:00',
    reason: ''
  });

  // Bulk exception state
  const [showBulkException, setShowBulkException] = useState(false);
  const [bulkExceptionForm, setBulkExceptionForm] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    if (doctorId) {
      // Reset schedule to default when doctor changes
      resetSchedule();
      loadAvailability();
      loadExceptions();
    }
  }, [doctorId]);

  const resetSchedule = () => {
    setSchedule(
      DAYS_OF_WEEK.map(day => ({
        dayOfWeek: day.value,
        dayLabel: day.label,
        enabled: false,
        slots: [
          { startTime: '09:00', endTime: '17:00' }
        ]
      }))
    );
    setSlotDuration(30);
  };

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const response = await doctorAvailabilityAPI.getAvailability(doctorId);
      const availability = response.availability || [];
      
      // Get slot duration from first availability entry (all should have the same duration)
      if (availability.length > 0 && availability[0].slotDuration) {
        setSlotDuration(availability[0].slotDuration);
      }
      
      // Update schedule with existing availability (group by day)
      setSchedule(prevSchedule => 
        prevSchedule.map(day => {
          const existingSlots = availability.filter(a => a.dayOfWeek === day.dayOfWeek);
          if (existingSlots.length > 0) {
            return {
              ...day,
              enabled: true,
              slots: existingSlots.map(slot => ({
                startTime: slot.startTime,
                endTime: slot.endTime,
                _id: slot._id
              }))
            };
          }
          return day;
        })
      );
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExceptions = async () => {
    try {
      const response = await scheduleExceptionAPI.getExceptions(doctorId);
      setExceptions(response.exceptions || []);
    } catch (error) {
      console.error('Error loading exceptions:', error);
    }
  };

  const handleScheduleChange = (dayOfWeek, field, value) => {
    setSchedule(prev =>
      prev.map(day =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, [field]: value }
          : day
      )
    );
  };

  const handleSlotChange = (dayOfWeek, slotIndex, field, value) => {
    setSchedule(prev =>
      prev.map(day =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              slots: day.slots.map((slot, idx) =>
                idx === slotIndex ? { ...slot, [field]: value } : slot
              )
            }
          : day
      )
    );
  };

  const handleAddSlot = (dayOfWeek) => {
    setSchedule(prev =>
      prev.map(day =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              slots: [...day.slots, { startTime: '09:00', endTime: '17:00' }]
            }
          : day
      )
    );
  };

  const handleRemoveSlot = (dayOfWeek, slotIndex) => {
    setSchedule(prev =>
      prev.map(day =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              slots: day.slots.filter((_, idx) => idx !== slotIndex)
            }
          : day
      )
    );
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      
      console.log('Saving schedule:', { doctorId, clinicId, schedule, slotDuration });
      
      await doctorAvailabilityAPI.bulkUpdate(doctorId, clinicId, schedule, slotDuration);
      
      toast({
        title: "Success",
        description: "Schedule updated successfully"
      });
      
      await loadAvailability();
    } catch (error) {
      console.error('Error saving schedule:', error);
      console.error('Error details:', error.response?.data);
      
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || error.message || "Failed to save schedule";
      
      toast({
        title: "Cannot Update Schedule",
        description: errorMessage,
        variant: "destructive",
        duration: 6000
      });
      
      // If there are conflicting days, show them
      if (errorData?.conflictingDays && errorData.conflictingDays.length > 0) {
        toast({
          title: "Days with Appointments",
          description: `${errorData.conflictingDays.join(', ')} - ${errorData.appointmentCount} appointment(s) scheduled`,
          variant: "destructive",
          duration: 6000
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddException = async () => {
    try {
      if (!exceptionForm.date) {
        toast({
          title: "Error",
          description: "Please select a date",
          variant: "destructive"
        });
        return;
      }

      await scheduleExceptionAPI.create({
        doctorId,
        clinicId,
        ...exceptionForm
      });

      toast({
        title: "Success",
        description: "Exception added successfully"
      });

      setShowExceptionForm(false);
      setExceptionForm({
        date: '',
        type: 'unavailable',
        startTime: '09:00',
        endTime: '17:00',
        reason: ''
      });
      
      await loadExceptions();
    } catch (error) {
      console.error('Error adding exception:', error);
      toast({
        title: "Error",
        description: "Failed to add exception",
        variant: "destructive"
      });
    }
  };

  const handleBulkException = async () => {
    try {
      if (!bulkExceptionForm.startDate || !bulkExceptionForm.endDate) {
        toast({
          title: "Error",
          description: "Please select start and end dates",
          variant: "destructive"
        });
        return;
      }

      await scheduleExceptionAPI.bulkCreate(
        doctorId,
        clinicId,
        bulkExceptionForm.startDate,
        bulkExceptionForm.endDate,
        'unavailable',
        bulkExceptionForm.reason
      );

      toast({
        title: "Success",
        description: "Bulk exceptions created successfully"
      });

      setShowBulkException(false);
      setBulkExceptionForm({
        startDate: '',
        endDate: '',
        reason: ''
      });
      
      await loadExceptions();
    } catch (error) {
      console.error('Error creating bulk exceptions:', error);
      toast({
        title: "Error",
        description: "Failed to create bulk exceptions",
        variant: "destructive"
      });
    }
  };

  const handleDeleteException = async (id) => {
    try {
      await scheduleExceptionAPI.delete(id);
      toast({
        title: "Success",
        description: "Exception deleted successfully"
      });
      await loadExceptions();
    } catch (error) {
      console.error('Error deleting exception:', error);
      toast({
        title: "Error",
        description: "Failed to delete exception",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Weekly Schedule
          </CardTitle>
          <CardDescription>
            Set the doctor's regular weekly availability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slot Duration Setting */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium text-blue-900">Appointment Slot Duration</Label>
                <p className="text-sm text-blue-700 mt-1">
                  Time slots will be created in {slotDuration}-minute intervals
                </p>
              </div>
              <Select 
                value={slotDuration.toString()} 
                onValueChange={(value) => setSlotDuration(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="20">20 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {schedule.map((day) => (
            <div key={day.dayOfWeek} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={day.enabled}
                  onCheckedChange={(checked) => 
                    handleScheduleChange(day.dayOfWeek, 'enabled', checked)
                  }
                />
                <Label className="font-medium w-28">{day.dayLabel}</Label>
                
                {!day.enabled && (
                  <span className="text-sm text-muted-foreground">
                    Not available
                  </span>
                )}
              </div>
              
              {day.enabled && (
                <div className="space-y-2 ml-11">
                  {day.slots.map((slot, slotIndex) => (
                    <div key={slotIndex}>
                      <div className="flex items-center gap-6">
                        <Badge variant="secondary" className="w-20 justify-center">
                          Slot {slotIndex + 1}
                        </Badge>
                        <div className="flex items-center gap-3">
                          <Label className="text-sm text-muted-foreground">From</Label>
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => 
                              handleSlotChange(day.dayOfWeek, slotIndex, 'startTime', e.target.value)
                            }
                            className="w-32"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="text-sm text-muted-foreground">To</Label>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => 
                              handleSlotChange(day.dayOfWeek, slotIndex, 'endTime', e.target.value)
                            }
                            className="w-32"
                          />
                        </div>
                        {day.slots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSlot(day.dayOfWeek, slotIndex)}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      {/* Show break indicator between slots */}
                      {slotIndex < day.slots.length - 1 && day.slots[slotIndex + 1] && (
                        <div className="flex items-center gap-2 ml-24 mt-1 mb-1">
                          <div className="h-px w-8 bg-amber-300"></div>
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                            Break: {slot.endTime} - {day.slots[slotIndex + 1].startTime}
                          </Badge>
                          <div className="h-px flex-1 bg-amber-300"></div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Add Break / Time Slot button at the bottom */}
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSlot(day.dayOfWeek)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Break / Time Slot
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <Button 
            onClick={handleSaveSchedule} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Schedule
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Schedule Exceptions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarOff className="w-5 h-5" />
                Schedule Exceptions
              </CardTitle>
              <CardDescription>
                Manage special dates and time-off periods
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkException(!showBulkException)}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Bulk Add
              </Button>
              <Button
                size="sm"
                onClick={() => setShowExceptionForm(!showExceptionForm)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Exception
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Exception Form */}
          {showBulkException && (
            <div className="p-4 border rounded-lg bg-blue-50 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Add Vacation/Time Off Period
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={bulkExceptionForm.startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBulkExceptionForm(prev => ({
                      ...prev,
                      startDate: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={bulkExceptionForm.endDate}
                    min={bulkExceptionForm.startDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setBulkExceptionForm(prev => ({
                      ...prev,
                      endDate: e.target.value
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  placeholder="e.g., Vacation, Conference, etc."
                  value={bulkExceptionForm.reason}
                  onChange={(e) => setBulkExceptionForm(prev => ({
                    ...prev,
                    reason: e.target.value
                  }))}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleBulkException} size="sm">
                  Create Exceptions
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBulkException(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Single Exception Form */}
          {showExceptionForm && (
            <div className="p-4 border rounded-lg bg-amber-50 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Add Single Exception
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={exceptionForm.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setExceptionForm(prev => ({
                      ...prev,
                      date: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={exceptionForm.type}
                    onValueChange={(value) => setExceptionForm(prev => ({
                      ...prev,
                      type: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                      <SelectItem value="custom_hours">Custom Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {exceptionForm.type === 'custom_hours' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={exceptionForm.startTime}
                      onChange={(e) => setExceptionForm(prev => ({
                        ...prev,
                        startTime: e.target.value
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={exceptionForm.endTime}
                      onChange={(e) => setExceptionForm(prev => ({
                        ...prev,
                        endTime: e.target.value
                      }))}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Optional reason for this exception"
                  value={exceptionForm.reason}
                  onChange={(e) => setExceptionForm(prev => ({
                    ...prev,
                    reason: e.target.value
                  }))}
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAddException} size="sm">
                  Add Exception
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowExceptionForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Exceptions List */}
          <div className="space-y-2">
            {exceptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No exceptions scheduled</p>
              </div>
            ) : (
              exceptions.map((exception) => (
                <div
                  key={exception._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(exception.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <Badge variant={exception.type === 'unavailable' ? 'destructive' : 'secondary'}>
                        {exception.type === 'unavailable' ? 'Unavailable' : 'Custom Hours'}
                      </Badge>
                    </div>
                    {exception.type === 'custom_hours' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {exception.startTime} - {exception.endTime}
                      </p>
                    )}
                    {exception.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {exception.reason}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteException(exception._id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorScheduleManager;
