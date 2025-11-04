import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Search, 
  Calendar,
  User,
  Pill,
  Clock,
  Eye,
  Package,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { prescriptionAPI } from '../services/api';
import { useToast } from "@/hooks/use-toast";

const PharmacistPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [matchingInventory, setMatchingInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [dispenseQuantity, setDispenseQuantity] = useState(1);
  const [dispenseNotes, setDispenseNotes] = useState("");
  const [dispensing, setDispensing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrescriptions();
  }, [searchQuery]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await prescriptionAPI.getAll(1, 100);
      
      console.log('Pharmacist prescriptions response:', response);
      
      // Handle different response structures
      let data = [];
      if (response.success) {
        data = response.data || [];
      } else if (response.prescriptions && Array.isArray(response.prescriptions)) {
        data = response.prescriptions;
      }
      
      console.log('Prescriptions data:', data);
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        data = data.filter(p => 
          p.patientId?.fullName?.toLowerCase().includes(query) ||
          p.doctorId?.fullName?.toLowerCase().includes(query) ||
          p.medications?.some(m => m.name?.toLowerCase().includes(query))
        );
      }
      
      setPrescriptions(data);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load prescriptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const viewPrescription = (prescription) => {
    setSelectedPrescription(prescription);
    setIsViewModalOpen(true);
  };

  const openDispenseModal = async (prescription, medicationIndex) => {
    setSelectedPrescription(prescription);
    setSelectedMedication({ ...prescription.medications[medicationIndex], index: medicationIndex });
    setIsDispenseModalOpen(true);
    setDispenseQuantity(1);
    setDispenseNotes("");
    setSelectedInventoryItem(null);
    
    // Load matching inventory
    setLoadingInventory(true);
    try {
      const response = await prescriptionAPI.getMatchingInventory(prescription._id);
      if (response.success) {
        setMatchingInventory(response.data);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast({
        title: "Error",
        description: "Failed to load matching inventory",
        variant: "destructive"
      });
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleDispenseMedication = async () => {
    if (!selectedInventoryItem) {
      toast({
        title: "Error",
        description: "Please select an inventory item",
        variant: "destructive"
      });
      return;
    }

    if (dispenseQuantity <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    setDispensing(true);
    try {
      const response = await prescriptionAPI.dispenseMedication(
        selectedPrescription._id,
        selectedMedication.index,
        selectedInventoryItem._id,
        dispenseQuantity,
        dispenseNotes
      );

      if (response.success) {
        toast({
          title: "Success",
          description: `Medication dispensed successfully. Remaining stock: ${response.data.inventoryUpdated.remainingStock}`,
        });
        
        setIsDispenseModalOpen(false);
        setIsViewModalOpen(false);
        loadPrescriptions();
      }
    } catch (error) {
      console.error('Error dispensing medication:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to dispense medication",
        variant: "destructive"
      });
    } finally {
      setDispensing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Prescriptions</h1>
          <p className="text-gray-600 mt-1">View and manage patient prescriptions</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by patient name, doctor, or medication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Prescriptions ({prescriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : prescriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? "No prescriptions found matching your search" : "No prescriptions available"}
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((prescription) => (
                <div 
                  key={prescription._id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => viewPrescription(prescription)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {prescription.patientId?.fullName || 'Unknown Patient'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Prescribed by: Dr. {prescription.doctorId?.fullName || 'Unknown Doctor'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {prescription.medications?.length || 0} medication(s)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(prescription.createdAt).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(prescription.createdAt).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {prescription.status || 'Active'}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Prescription Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              View complete prescription information
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-6 py-4">
              {/* Patient & Doctor Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium">{selectedPrescription.patientId?.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">UHID</p>
                      <p className="font-medium">{selectedPrescription.patientId?.uhid || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Age</p>
                      <p className="font-medium">
                        {selectedPrescription.patientId?.dateOfBirth 
                          ? new Date().getFullYear() - new Date(selectedPrescription.patientId.dateOfBirth).getFullYear()
                          : 'N/A'} years
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Doctor Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium">Dr. {selectedPrescription.doctorId?.fullName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Specialty</p>
                      <p className="font-medium">{selectedPrescription.doctorId?.specialty || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="font-medium">
                        {new Date(selectedPrescription.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    Prescribed Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPrescription.medications && selectedPrescription.medications.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPrescription.medications.map((med, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900">{med.name || 'Unnamed Medication'}</h4>
                                {med.dispensed && (
                                  <Badge variant="success" className="bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Dispensed
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-2 space-y-1 text-sm text-gray-600">
                                <p><span className="font-medium">Dosage:</span> {med.dosage || 'N/A'}</p>
                                <p><span className="font-medium">Frequency:</span> {med.frequency || 'N/A'}</p>
                                <p><span className="font-medium">Duration:</span> {med.duration || 'N/A'}</p>
                                {med.instructions && (
                                  <p><span className="font-medium">Instructions:</span> {med.instructions}</p>
                                )}
                                {med.dispensed && med.dispensedQuantity && (
                                  <p className="text-green-600">
                                    <span className="font-medium">Dispensed Quantity:</span> {med.dispensedQuantity}
                                  </p>
                                )}
                              </div>
                              {!med.dispensed && (
                                <Button
                                  size="sm"
                                  className="mt-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDispenseModal(selectedPrescription, index);
                                  }}
                                >
                                  <Package className="w-4 h-4 mr-2" />
                                  Dispense from Inventory
                                </Button>
                              )}
                            </div>
                            <Badge variant="secondary">{index + 1}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">No medications prescribed</p>
                  )}
                </CardContent>
              </Card>

              {/* Diagnosis & Notes */}
              {(selectedPrescription.diagnosis || selectedPrescription.notes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedPrescription.diagnosis && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Diagnosis</p>
                        <p className="text-sm mt-1">{selectedPrescription.diagnosis}</p>
                      </div>
                    )}
                    {selectedPrescription.notes && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Notes</p>
                        <p className="text-sm mt-1">{selectedPrescription.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Follow-up */}
              {selectedPrescription.followUpDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Follow-up
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {new Date(selectedPrescription.followUpDate).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispense Medication Modal */}
      <Dialog open={isDispenseModalOpen} onOpenChange={setIsDispenseModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Dispense Medication from Inventory
            </DialogTitle>
            <DialogDescription>
              Select inventory item and quantity to dispense
            </DialogDescription>
          </DialogHeader>

          {selectedMedication && (
            <div className="space-y-4 py-4">
              {/* Medication Details */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-lg mb-2">{selectedMedication.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Dosage:</span>
                      <span className="ml-2 font-medium">{selectedMedication.dosage}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Frequency:</span>
                      <span className="ml-2 font-medium">{selectedMedication.frequency}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium">{selectedMedication.duration}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Matching Inventory Items */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Available Inventory Items
                </Label>
                {loadingInventory ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading inventory...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {matchingInventory
                      .find(item => item.medicationIndex === selectedMedication.index)
                      ?.matches?.length > 0 ? (
                      matchingInventory
                        .find(item => item.medicationIndex === selectedMedication.index)
                        .matches.map((item) => (
                          <div
                            key={item._id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedInventoryItem?._id === item._id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedInventoryItem(item)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{item.medicationName}</h4>
                                  {item.genericName && (
                                    <span className="text-xs text-gray-500">({item.genericName})</span>
                                  )}
                                </div>
                                <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">Strength:</span> {item.strength}
                                  </div>
                                  <div>
                                    <span className="font-medium">Batch:</span> {item.batchNumber}
                                  </div>
                                  <div>
                                    <span className="font-medium">Stock:</span> {item.quantity}
                                  </div>
                                  <div>
                                    <span className="font-medium">Expiry:</span>{' '}
                                    {new Date(item.expiryDate).toLocaleDateString('en-IN')}
                                  </div>
                                </div>
                              </div>
                              <Badge variant="outline" className="ml-2">
                                {item.category}
                              </Badge>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                        <p>No matching inventory items found</p>
                        <p className="text-xs mt-1">Please add this medication to inventory first</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity Input */}
              {selectedInventoryItem && (
                <div>
                  <Label htmlFor="quantity">Quantity to Dispense</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedInventoryItem.quantity}
                    value={dispenseQuantity}
                    onChange={(e) => setDispenseQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available stock: {selectedInventoryItem.quantity}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={dispenseNotes}
                  onChange={(e) => setDispenseNotes(e.target.value)}
                  placeholder="Add any notes about this dispensing..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDispenseModalOpen(false)}
              disabled={dispensing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispenseMedication}
              disabled={!selectedInventoryItem || dispensing}
            >
              {dispensing ? 'Dispensing...' : 'Dispense Medication'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PharmacistPrescriptions;
