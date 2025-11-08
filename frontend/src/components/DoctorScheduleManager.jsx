import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { doctorAvailabilityAPI, scheduleExceptionAPI } from "@/services/api";
import { Calendar, Clock, Plus, X, Save, Trash2, AlertCircle, CalendarOff, Loader2, Coffee, ArrowRight, Info } from "lucide-react";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState(null);
  const [exceptionForm, setExceptionForm] = useState({
    date: '',
    type: 'unavailable',
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
    breaks: []
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

      // Check if an exception already exists for this date
      const selectedDate = new Date(exceptionForm.date).toISOString().split('T')[0];
      const existingException = exceptions.find(ex => {
        const exDate = new Date(ex.date).toISOString().split('T')[0];
        return exDate === selectedDate;
      });

      if (existingException) {
        toast({
          title: "Error",
          description: "An exception already exists for this date. Please delete it first or choose a different date.",
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
        reason: '',
        breaks: []
      });
      
      await loadExceptions();
    } catch (error) {
      console.error('Error adding exception:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add exception",
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

  const confirmDeleteException = (exception) => {
    setExceptionToDelete(exception);
    setDeleteDialogOpen(true);
  };

  const handleDeleteException = async () => {
    if (!exceptionToDelete) return;
    
    try {
      await scheduleExceptionAPI.delete(exceptionToDelete._id);
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
    } finally {
      setDeleteDialogOpen(false);
      setExceptionToDelete(null);
    }
  };

  // Break management functions
  const handleAddBreak = () => {
    setExceptionForm(prev => ({
      ...prev,
      breaks: [...prev.breaks, { startTime: '12:00', endTime: '13:00' }]
    }));
  };

  const handleRemoveBreak = (index) => {
    setExceptionForm(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index)
    }));
  };

  const handleBreakChange = (index, field, value) => {
    setExceptionForm(prev => ({
      ...prev,
      breaks: prev.breaks.map((breakItem, i) => 
        i === index ? { ...breakItem, [field]: value } : breakItem
      )
    }));
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
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium text-blue-900 dark:text-blue-100">Appointment Slot Duration</Label>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
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
            <div key={day.dayOfWeek} className="p-4 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 rounded-lg space-y-4 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={(checked) => 
                      handleScheduleChange(day.dayOfWeek, 'enabled', checked)
                    }
                  />
                  <Label className="font-semibold text-base w-28 text-gray-900 dark:text-white">{day.dayLabel}</Label>
                  
                  {!day.enabled && (
                    <Badge variant="secondary" className="text-xs">
                      Not Available
                    </Badge>
                  )}
                  {day.enabled && (
                    <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                      {day.slots.length} {day.slots.length === 1 ? 'Period' : 'Periods'}
                    </Badge>
                  )}
                </div>
              </div>
              
              {day.enabled && (
                <div className="space-y-3 ml-11">
                  {/* Info Banner */}
                  {day.slots.length === 1 && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        <strong>Tip:</strong> Click "Add Break Period" below to split this into multiple work periods with breaks in between.
                      </p>
                    </div>
                  )}
                  
                  {/* Visual Timeline */}
                  <div className="space-y-3">
                    {day.slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="space-y-2">
                        {/* Work Period Card */}
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                                Work Period {slotIndex + 1}
                              </span>
                            </div>
                            {day.slots.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveSlot(day.dayOfWeek, slotIndex)}
                                className="h-7 px-2 hover:bg-red-100 dark:hover:bg-red-900/30"
                              >
                                <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Label className="text-xs text-blue-700 dark:text-blue-300 mb-1 block">Start Time</Label>
                              <Input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => 
                                  handleSlotChange(day.dayOfWeek, slotIndex, 'startTime', e.target.value)
                                }
                                className="h-9 bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700 focus:border-blue-500"
                              />
                            </div>
                            <ArrowRight className="w-5 h-5 text-blue-400 dark:text-blue-600 mt-5" />
                            <div className="flex-1">
                              <Label className="text-xs text-blue-700 dark:text-blue-300 mb-1 block">End Time</Label>
                              <Input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => 
                                  handleSlotChange(day.dayOfWeek, slotIndex, 'endTime', e.target.value)
                                }
                                className="h-9 bg-white dark:bg-gray-900 border-blue-300 dark:border-blue-700 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Break Indicator between slots */}
                        {slotIndex < day.slots.length - 1 && day.slots[slotIndex + 1] && (
                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t-2 border-dashed border-amber-300 dark:border-amber-600"></div>
                            </div>
                            <div className="relative flex justify-center">
                              <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 rounded-full flex items-center gap-2 shadow-sm">
                                <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                  Break: {slot.endTime} - {day.slots[slotIndex + 1].startTime}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Add Break Period button */}
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSlot(day.dayOfWeek)}
                      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Break Period (Split Schedule)
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Adding a break period will create a new work session with a break in between
                    </p>
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
            <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/40 space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
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
            <div className="p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/30 space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
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
                  {exceptionForm.date && exceptions.find(ex => 
                    new Date(ex.date).toISOString().split('T')[0] === exceptionForm.date
                  ) && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ This date already has an exception
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Exception Type</Label>
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
                      <SelectItem value="unavailable">Unavailable (Block All Day)</SelectItem>
                      <SelectItem value="blocked_hours">Block Specific Hours</SelectItem>
                      <SelectItem value="custom_hours">Custom Hours (Override Schedule)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Info message based on type */}
              <div className={`p-3 rounded-md text-sm border ${
                exceptionForm.type === 'unavailable' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : 
                exceptionForm.type === 'blocked_hours' ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' :
                'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}>
                {exceptionForm.type === 'unavailable' ? (
                  <p><strong>Unavailable:</strong> No appointment slots will be available on this date. The entire day will be blocked.</p>
                ) : exceptionForm.type === 'blocked_hours' ? (
                  <p><strong>Block Specific Hours:</strong> The time range you specify will be blocked (unavailable). Slots outside this range will remain available according to the regular schedule.</p>
                ) : (
                  <p><strong>Custom Hours:</strong> The regular schedule for this date will be completely replaced. Only slots within the custom hours you specify will be available.</p>
                )}
              </div>
              
              {(exceptionForm.type === 'custom_hours' || exceptionForm.type === 'blocked_hours') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>
                      {exceptionForm.type === 'blocked_hours' ? 'Block From' : 'Start Time'}
                    </Label>
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
                    <Label>
                      {exceptionForm.type === 'blocked_hours' ? 'Block Until' : 'End Time'}
                    </Label>
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
              
              {/* Breaks Section - Only for Custom Hours */}
              {exceptionForm.type === 'custom_hours' && (
                <div className="space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Breaks (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddBreak}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Break
                    </Button>
                  </div>
                  
                  {exceptionForm.breaks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No breaks added. Click "Add Break" to add break times.</p>
                  ) : (
                    <div className="space-y-2">
                      {exceptionForm.breaks.map((breakItem, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Break Start</Label>
                              <Input
                                type="time"
                                value={breakItem.startTime}
                                onChange={(e) => handleBreakChange(index, 'startTime', e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Break End</Label>
                              <Input
                                type="time"
                                value={breakItem.endTime}
                                onChange={(e) => handleBreakChange(index, 'endTime', e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveBreak(index)}
                            className="h-8 px-2"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                  className="flex items-start gap-4 p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {/* Date Column */}
                  <div className="flex items-center gap-2 min-w-[280px]">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(exception.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  {/* Details Column */}
                  <div className="flex-1 min-w-0">
                    {exception.type === 'custom_hours' && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          Override Schedule: {exception.startTime} - {exception.endTime}
                        </p>
                        {exception.breaks && exception.breaks.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Breaks: </span>
                            {exception.breaks.map((breakItem, idx) => (
                              <span key={idx}>
                                {breakItem.startTime} - {breakItem.endTime}
                                {idx < exception.breaks.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {exception.type === 'blocked_hours' && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        Blocked: {exception.startTime} - {exception.endTime}
                      </p>
                    )}
                    {exception.type === 'unavailable' && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        No slots available on this date
                      </p>
                    )}
                    {exception.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {exception.reason}
                      </p>
                    )}
                  </div>
                  
                  {/* Type Badge Column */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="whitespace-nowrap">
                      {exception.type === 'unavailable' ? 'Unavailable' : 
                       exception.type === 'blocked_hours' ? 'Blocked Hours' :
                       'Custom Hours'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDeleteException(exception)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule Exception</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this exception for{' '}
              <strong>
                {exceptionToDelete && new Date(exceptionToDelete.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </strong>?
              {exceptionToDelete?.reason && (
                <span className="block mt-2 text-sm">
                  Reason: {exceptionToDelete.reason}
                </span>
              )}
              <span className="block mt-2 font-semibold text-destructive">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteException}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Exception
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DoctorScheduleManager;
