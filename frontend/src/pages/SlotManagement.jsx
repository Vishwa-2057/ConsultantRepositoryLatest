import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DoctorScheduleManager from "@/components/DoctorScheduleManager";
import { doctorAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, Loader2, Check, ChevronsUpDown, DollarSign, Save, CalendarDays, Info, Search, Stethoscope, Mail, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/utils/roleUtils";
import { cn } from "@/lib/utils";
import { config } from "@/config/env";
import sessionManager from "@/utils/sessionManager";

const SlotManagement = () => {
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [appointmentFees, setAppointmentFees] = useState(500);
  const [savingFees, setSavingFees] = useState(false);
  const [loadingFees, setLoadingFees] = useState(false);
  const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      loadDoctorFees(selectedDoctor._id);
    }
  }, [selectedDoctor]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      
      // Get clinic ID from current user
      const clinicId = currentUser?.clinicId || currentUser?.id;
      
      // Fetch doctors filtered by clinic
      let response;
      if (clinicId) {
        response = await doctorAPI.getByClinic(clinicId);
      } else {
        // Fallback to all doctors if no clinic ID
        response = await doctorAPI.getAll();
      }
      
      const doctorsList = response.doctors || response.data || [];
      setDoctors(Array.isArray(doctorsList) ? doctorsList : []);

      // Auto-select first doctor if available
      if (doctorsList.length > 0) {
        setSelectedDoctor(doctorsList[0]);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
      toast({
        title: "Error",
        description: "Failed to load doctors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorFees = async (doctorId) => {
    try {
      setLoadingFees(true);
      const token = await sessionManager.getToken();
      const response = await fetch(`${API_BASE_URL}/doctor-fees/${doctorId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointmentFees(data.fees?.appointmentFees || 500);
      }
    } catch (error) {
      console.error('Error loading doctor fees:', error);
      setAppointmentFees(500); // Set default on error
    } finally {
      setLoadingFees(false);
    }
  };

  const saveDoctorFees = async () => {
    if (!selectedDoctor) return;
    
    try {
      setSavingFees(true);
      const token = await sessionManager.getToken();
      const response = await fetch(`${API_BASE_URL}/doctor-fees/${selectedDoctor._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ appointmentFees: parseFloat(appointmentFees) || 0 })
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Appointment fees saved successfully",
        });
      } else {
        throw new Error('Failed to save fees');
      }
    } catch (error) {
      console.error('Error saving doctor fees:', error);
      toast({
        title: "Error",
        description: "Failed to save appointment fees",
        variant: "destructive"
      });
    } finally {
      setSavingFees(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mt-1">
              Manage doctor availability schedules and consultation fees
            </p>
          </div>
          {doctors.length > 0 && (
            <Badge variant="secondary" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5">
              <Stethoscope className="w-4 h-4" />
              {doctors.length} {doctors.length === 1 ? 'Doctor' : 'Doctors'}
            </Badge>
          )}
        </div>

        {/* Info Alert */}
        {doctors.length > 0 && !selectedDoctor && (
          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              Select a doctor below to configure their availability schedule and consultation fees
            </AlertDescription>
          </Alert>
        )}

        {/* Doctor Selection Card */}
        {doctors.length > 0 && (
          <Card className="shadow-md border-gray-200 dark:border-gray-800">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Select Doctor</CardTitle>
                  <CardDescription className="text-xs">
                    Choose from {doctors.length} available {doctors.length === 1 ? 'doctor' : 'doctors'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto py-3 px-4 hover:bg-accent hover:border-primary transition-colors"
                  >
                    {selectedDoctor ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {selectedDoctor.fullName.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">Dr. {selectedDoctor.fullName}</p>
                          <p className="text-xs text-muted-foreground">{selectedDoctor.specialty}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>Select a doctor to manage schedule...</span>
                      </div>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                  <Command>
                    <CommandInput placeholder="Search by name or specialty..." className="h-10" />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>
                        <div className="text-center py-6">
                          <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No doctor found</p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {doctors.map((doctor) => (
                          <CommandItem
                            key={doctor._id}
                            value={`${doctor.fullName} ${doctor.specialty} ${doctor.email}`}
                            onSelect={() => {
                              setSelectedDoctor(doctor);
                              setOpen(false);
                            }}
                            className="py-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                                {doctor.fullName.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm truncate">Dr. {doctor.fullName}</p>
                                  {selectedDoctor?._id === doctor._id && (
                                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    {doctor.specialty}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {doctor.email}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        )}

        {/* Selected Doctor Info & Fees */}
        {selectedDoctor ? (
          <div className="space-y-6">
            <Card className="shadow-md border-gray-200 dark:border-gray-800">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Doctor Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                      {selectedDoctor.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        Dr. {selectedDoctor.fullName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Stethoscope className="w-3 h-3 mr-1" />
                          {selectedDoctor.specialty}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {selectedDoctor.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Consultation Fees */}
                  <div className="lg:border-l lg:pl-6 lg:border-gray-200 dark:lg:border-gray-700">
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Consultation Fee
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="50"
                          value={appointmentFees}
                          onChange={(e) => setAppointmentFees(e.target.value)}
                          disabled={loadingFees || savingFees}
                          className="w-36 pl-7 h-10 text-base font-semibold border-2 focus:border-primary"
                          placeholder="500"
                        />
                      </div>
                      <Button
                        onClick={saveDoctorFees}
                        disabled={savingFees || loadingFees}
                        className="h-10 px-4"
                      >
                        {savingFees ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Set the consultation fee for appointments
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Manager */}
            <DoctorScheduleManager
              doctorId={selectedDoctor._id}
              clinicId={selectedDoctor.clinicId || currentUser?.clinicId || currentUser?.id}
            />
          </div>
        ) : (
          <Card className="shadow-md border-gray-200 dark:border-gray-800">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <CalendarDays className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {doctors.length === 0 ? 'No Doctors Available' : 'Select a Doctor to Begin'}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {doctors.length === 0
                  ? "No doctors found in the system. Please add doctors first to manage their schedules."
                  : "Choose a doctor from the dropdown above to configure their availability schedule and consultation fees."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SlotManagement;
