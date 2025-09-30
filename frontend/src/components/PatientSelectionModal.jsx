import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, Phone, Mail, Video, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { patientAPI } from '@/services/api';

const PatientSelectionModal = ({ isOpen, onClose, onPatientSelect, title = "Select Patient for Video Call" }) => {
  const { toast } = useToast();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);

  // Load patients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPatients();
    }
  }, [isOpen]);

  // Filter patients based on search term
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = patients.filter(patient => 
        patient.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm)
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [searchTerm, patients]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await patientAPI.getAll(1, 50); // Get up to 50 patients
      setPatients(response.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({
        title: "Error",
        description: "Failed to load patients. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient) => {
    onPatientSelect(patient);
    onClose();
    setSearchTerm('');
  };

  const getPatientStatus = (patient) => {
    // Simple logic to determine patient status based on recent activity
    const lastVisit = patient.lastVisit ? new Date(patient.lastVisit) : null;
    const now = new Date();
    const daysSinceLastVisit = lastVisit ? Math.floor((now - lastVisit) / (1000 * 60 * 60 * 24)) : null;

    if (!lastVisit) return { status: 'New', color: 'default' };
    if (daysSinceLastVisit <= 7) return { status: 'Recent', color: 'success' };
    if (daysSinceLastVisit <= 30) return { status: 'Active', color: 'primary' };
    return { status: 'Inactive', color: 'secondary' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex-shrink-0 relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search patients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Patient List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading patients...</p>
              </div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No patients found matching your search' : 'No patients available'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => {
                const patientStatus = getPatientStatus(patient);
                return (
                  <Card 
                    key={patient._id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{patient.fullName}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {patient.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  <span>{patient.email}</span>
                                </div>
                              )}
                              {patient.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{patient.phone}</span>
                                </div>
                              )}
                            </div>
                            {patient.medicalConditions && patient.medicalConditions.length > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-muted-foreground">Conditions:</span>
                                <span className="text-xs text-foreground">
                                  {patient.medicalConditions.slice(0, 2).join(', ')}
                                  {patient.medicalConditions.length > 2 && '...'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={patientStatus.color} className="text-xs">
                            {patientStatus.status}
                          </Badge>
                          <Button size="sm" className="gradient-button">
                            <Video className="w-4 h-4 mr-1" />
                            Start Call
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PatientSelectionModal;
