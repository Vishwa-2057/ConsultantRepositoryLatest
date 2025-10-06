import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, User, Calendar, ChevronRight } from 'lucide-react';
import { format, addMinutes, parseISO } from 'date-fns';

const AppointmentConflictDialog = ({
  isOpen,
  onClose,
  conflictData,
  suggestedTimes,
  onSelectTime,
  onForceCreate,
  formData
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch (error) {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const generateTimeSuggestions = () => {
    if (!formData.date || !formData.time || !formData.duration) return [];

    const suggestions = [];
    const baseDate = new Date(`${formData.date}T${formData.time}`);
    const duration = parseInt(formData.duration);

    // Suggest times before the conflict
    for (let i = 1; i <= 3; i++) {
      const suggestedTime = new Date(baseDate.getTime() - (duration * i * 60000));
      if (suggestedTime.getHours() >= 9) { // Don't suggest before 9 AM
        suggestions.push({
          time: format(suggestedTime, 'HH:mm'),
          label: `${duration * i} min earlier`,
          display: format(suggestedTime, 'h:mm a')
        });
      }
    }

    // Suggest times after the conflict (assuming conflict duration)
    const conflictDuration = conflictData?.duration || 30;
    for (let i = 1; i <= 3; i++) {
      const suggestedTime = new Date(baseDate.getTime() + (conflictDuration * i * 60000));
      if (suggestedTime.getHours() < 18) { // Don't suggest after 6 PM
        suggestions.push({
          time: format(suggestedTime, 'HH:mm'),
          label: `${conflictDuration * i} min later`,
          display: format(suggestedTime, 'h:mm a')
        });
      }
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  };

  const timeSuggestions = generateTimeSuggestions();

  const handleSelectSuggestion = (suggestion) => {
    setSelectedSuggestion(suggestion);
    onSelectTime(suggestion.time);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-destructive text-xl">
            <AlertTriangle className="w-6 h-6" />
            Time Slot Conflict Detected
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed">
            The selected time slot is already occupied. Please choose an alternative time or review the conflicting appointment details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Conflict Details */}
          {conflictData && (
            <Card className="border-destructive/30 bg-destructive/8 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-destructive flex items-center gap-2 font-semibold">
                  <Calendar className="w-5 h-5" />
                  Conflicting Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2">
                    <div className="font-medium text-foreground text-sm">Patient:</div>
                    <div className="text-destructive font-medium px-3 py-2 bg-destructive/10 rounded-md border border-destructive/20">
                      {conflictData.patientName || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-foreground text-sm">Type:</div>
                    <div className="text-destructive font-medium px-3 py-2 bg-destructive/10 rounded-md border border-destructive/20">
                      {conflictData.appointmentType || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-foreground text-sm">Time:</div>
                    <div className="text-destructive font-medium px-3 py-2 bg-destructive/10 rounded-md border border-destructive/20">
                      {formatTime(conflictData.time)} - {formatTime(conflictData.endTime)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-foreground text-sm">Duration:</div>
                    <div className="text-destructive font-medium px-3 py-2 bg-destructive/10 rounded-md border border-destructive/20">
                      {conflictData.duration || 30} minutes
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Your Appointment Details */}
          <Card className="border-primary/30 bg-primary/8 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-primary flex items-center gap-2 font-semibold">
                <User className="w-5 h-5" />
                Your Appointment Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <div className="font-medium text-foreground text-sm">Date:</div>
                  <div className="text-primary font-medium px-3 py-2 bg-primary/10 rounded-md border border-primary/20">
                    {formatDate(formData.date)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-foreground text-sm">Time:</div>
                  <div className="text-primary font-medium px-3 py-2 bg-primary/10 rounded-md border border-primary/20">
                    {formatTime(formData.time)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-foreground text-sm">Duration:</div>
                  <div className="text-primary font-medium px-3 py-2 bg-primary/10 rounded-md border border-primary/20">
                    {formData.duration} minutes
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-foreground text-sm">Type:</div>
                  <div className="text-primary font-medium px-3 py-2 bg-primary/10 rounded-md border border-primary/20">
                    {formData.appointmentType}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Suggestions */}
          {timeSuggestions.length > 0 && (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground flex items-center gap-2 font-semibold">
                  <Clock className="w-5 h-5" />
                  Suggested Alternative Times
                </CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  Click on any suggested time below to automatically update your appointment request.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {timeSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant={selectedSuggestion?.time === suggestion.time ? "default" : "outline"}
                      className={`h-auto p-4 flex flex-col items-start gap-2 transition-all duration-200 ${
                        selectedSuggestion?.time === suggestion.time
                          ? "ring-2 ring-primary ring-offset-2"
                          : "hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20"
                      }`}
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <div className="font-semibold text-base">{suggestion.display}</div>
                      <div className="text-xs opacity-80">{suggestion.label}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-4 pt-2">
            <div className="text-sm text-muted-foreground font-medium">Choose an action:</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex items-center gap-2 h-11 hover:bg-muted hover:text-muted-foreground"
              >
                Cancel
              </Button>

              {selectedSuggestion && (
                <Button
                  onClick={() => onSelectTime(selectedSuggestion.time)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 h-11"
                >
                  <ChevronRight className="w-4 h-4" />
                  Use {selectedSuggestion.display}
                </Button>
              )}

              <Button
                variant="destructive"
                onClick={onForceCreate}
                className="flex items-center gap-2 h-11"
              >
                <AlertTriangle className="w-4 h-4" />
                Force Create Anyway
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentConflictDialog;
