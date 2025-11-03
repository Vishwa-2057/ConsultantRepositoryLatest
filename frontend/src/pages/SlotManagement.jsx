import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import DoctorScheduleManager from "@/components/DoctorScheduleManager";
import { doctorAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, Loader2, Check, ChevronsUpDown, DollarSign, Save } from "lucide-react";
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Doctor Selection */}
      {doctors.length > 0 && (
        <Card className="border-gray-100 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Select Doctor
            </CardTitle>
            <CardDescription>
              Choose a doctor to manage their availability schedule and fees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label>Doctor</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between mt-2"
                  >
                      {selectedDoctor
                        ? `Dr. ${selectedDoctor.fullName} - ${selectedDoctor.specialty}`
                        : "Select a doctor..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" onWheel={(e) => e.stopPropagation()}>
                  <Command>
                    <CommandInput placeholder="Search doctors..." />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                      <CommandEmpty>No doctor found.</CommandEmpty>
                      <CommandGroup>
                        {doctors.map((doctor) => (
                          <CommandItem
                            key={doctor._id}
                            value={`${doctor.fullName} ${doctor.specialty} ${doctor.email}`}
                            onSelect={() => {
                              setSelectedDoctor(doctor);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDoctor?._id === doctor._id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">Dr. {doctor.fullName}</span>
                              <span className="text-sm text-muted-foreground">{doctor.specialty}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Manager */}
      {selectedDoctor ? (
        <div>
          <Card className="mb-4 border-gray-100 dark:border-gray-800 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-lg">
                    {selectedDoctor.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Dr. {selectedDoctor.fullName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedDoctor.specialty} • {selectedDoctor.email}
                    </p>
                  </div>
                </div>
                
                {/* Appointment Fees Section */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Appointment Fees (₹)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="50"
                        value={appointmentFees}
                        onChange={(e) => setAppointmentFees(e.target.value)}
                        disabled={loadingFees || savingFees}
                        className="w-32"
                        placeholder="0"
                      />
                      <Button
                        onClick={saveDoctorFees}
                        disabled={savingFees || loadingFees}
                        size="sm"
                      >
                        {savingFees ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        <DoctorScheduleManager
          doctorId={selectedDoctor._id}
          clinicId={selectedDoctor.clinicId || currentUser?.clinicId || currentUser?.id}
        />
      </div>
      ) : (
        <Card className="border-gray-100 dark:border-gray-800 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Doctor Selected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
              {doctors.length === 0
                ? "No doctors found in the system. Please add doctors first."
                : "Please select a doctor to manage their availability schedule."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SlotManagement;
