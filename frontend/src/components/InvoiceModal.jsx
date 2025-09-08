import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, User, DollarSign, Calendar, CreditCard } from "lucide-react";
import { invoiceAPI, patientAPI } from "@/services/api";

const InvoiceModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    patientId: "",
    serviceType: "",
    description: "",
    amount: "",
    dueDate: "",
    paymentMethod: "Insurance",
    status: "Pending",
    notes: ""
  });

  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Load patients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPatients();
    }
  }, [isOpen]);

  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const response = await patientAPI.getAll(1, 100); // Get up to 100 patients
      const list = response.patients || response.data || [];
      setPatients(list);
    } catch (error) {
      console.error('Failed to load patients:', error);
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.patientId) {
      newErrors.patientId = "Please select a patient";
    }
    if (!formData.serviceType) {
      newErrors.serviceType = "Service type is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!formData.amount) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }
    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}`;
        
        // Prepare invoice data to match backend structure
        const invoiceData = {
          patientId: formData.patientId,
          patientName: selectedPatient?.fullName || '',
          invoiceNumber: invoiceNumber,
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: formData.dueDate,
          status: formData.status,
          terms: 'Net 30',
          items: [{
            description: `${formData.serviceType}: ${formData.description.trim()}`,
            quantity: 1,
            rate: parseFloat(formData.amount),
            amount: parseFloat(formData.amount)
          }],
          subtotal: parseFloat(formData.amount),
          taxRate: 0,
          taxAmount: 0,
          total: parseFloat(formData.amount),
          notes: formData.notes.trim(),
          paymentMethod: formData.paymentMethod
        };
        
        // Send to backend API
        const response = await invoiceAPI.create(invoiceData);
        
        // Call onSubmit with the invoice data from backend response
        onSubmit(response.invoice);
        handleClose();
      } catch (error) {
        console.error('Failed to create invoice:', error);
        // Show error to user
        alert(`Failed to create invoice: ${error.message}`);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      patientId: "",
      serviceType: "",
      description: "",
      amount: "",
      dueDate: "",
      paymentMethod: "Insurance",
      status: "Pending",
      notes: ""
    });
    setErrors({});
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];
  const selectedPatient = patients.find(p => p._id === formData.patientId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-teal-600" />
            Generate New Invoice
          </DialogTitle>
          <DialogDescription>
            Create a new invoice for your patient. Fill in all required fields to proceed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              Patient Information
            </h3>

            <div className="space-y-2">
              <Label htmlFor="patientId">Select Patient *</Label>
              <Select value={formData.patientId} onValueChange={(value) => handleInputChange("patientId", value)}>
                <SelectTrigger className={errors.patientId ? "border-red-500" : ""}>
                  <SelectValue placeholder={loadingPatients ? "Loading patients..." : "Choose a patient"} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient._id} value={patient._id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{patient.fullName}</span>
                        <span className="text-sm text-muted-foreground">
                          {patient.phone} • {patient.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patientId && (
                <p className="text-sm text-red-600">{errors.patientId}</p>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Service Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type *</Label>
                <Select value={formData.serviceType} onValueChange={(value) => handleInputChange("serviceType", value)}>
                  <SelectTrigger className={errors.serviceType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">General Consultation</SelectItem>
                    <SelectItem value="Follow-up">Follow-up Visit</SelectItem>
                    <SelectItem value="Physical Exam">Physical Examination</SelectItem>
                    <SelectItem value="Lab Work">Laboratory Work</SelectItem>
                    <SelectItem value="Imaging">Medical Imaging</SelectItem>
                    <SelectItem value="Vaccination">Vaccination</SelectItem>
                    <SelectItem value="Emergency">Emergency Visit</SelectItem>
                    <SelectItem value="Specialist">Specialist Consultation</SelectItem>
                    <SelectItem value="Therapy">Physical Therapy</SelectItem>
                    <SelectItem value="Mental Health">Mental Health Session</SelectItem>
                  </SelectContent>
                </Select>
                {errors.serviceType && (
                  <p className="text-sm text-red-600">{errors.serviceType}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount && (
                  <p className="text-sm text-red-600">{errors.amount}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Service Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the service provided..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className={errors.description ? "border-red-500" : ""}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Payment & Billing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-600" />
              Payment & Billing
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  min={today}
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                  className={errors.dueDate ? "border-red-500" : ""}
                />
                {errors.dueDate && (
                  <p className="text-sm text-red-600">{errors.dueDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange("paymentMethod", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Medicare">Medicare</SelectItem>
                    <SelectItem value="Medicaid">Medicaid</SelectItem>
                    <SelectItem value="Self-Pay">Self-Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Invoice Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes or special instructions..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Summary */}
          {formData.patientId && formData.serviceType && formData.amount && formData.dueDate && (
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <h4 className="font-medium text-teal-900 mb-2">Invoice Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-teal-800">
                <div>
                  <span className="font-medium">Patient:</span> {selectedPatient?.fullName}
                </div>
                <div>
                  <span className="font-medium">Service:</span> {formData.serviceType}
                </div>
                <div>
                  <span className="font-medium">Amount:</span> ${formData.amount}
                </div>
                <div>
                  <span className="font-medium">Due Date:</span> {new Date(formData.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal;
