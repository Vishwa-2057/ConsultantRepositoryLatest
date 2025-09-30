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
import { FileText, User, DollarSign, Plus, Minus, MapPin } from "lucide-react";
import { invoiceAPI, patientAPI } from "@/services/api";

const InvoiceModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    lineItems: [{ description: "", qty: 1, unitPrice: 0 }],
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      zipCode: ""
    },
    phone: "",
    email: "",
    remarks: "",
    discount: 0,
    tax: 0,
    shipping: 0
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
    if (!formData.patientName.trim()) {
      newErrors.patientName = "Patient name is required";
    }
    if (!formData.lineItems.length || !formData.lineItems[0].description.trim()) {
      newErrors.lineItems = "At least one line item with description is required";
    }
    if (!formData.address.line1.trim()) {
      newErrors.addressLine1 = "Address line 1 is required";
    }
    if (!formData.address.city.trim()) {
      newErrors.addressCity = "City is required";
    }
    if (!formData.address.state.trim()) {
      newErrors.addressState = "State is required";
    }
    if (!formData.address.zipCode.trim()) {
      newErrors.addressZipCode = "Zip code is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        // Generate invoice number
        const invoiceNo = Date.now();
        
        // Calculate total from line items with proper number validation
        const subtotal = formData.lineItems.reduce((sum, item) => {
          const qty = parseFloat(item.qty) || 0;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          return sum + (qty * unitPrice);
        }, 0);
        
        const discount = parseFloat(formData.discount) || 0;
        const tax = parseFloat(formData.tax) || 0;
        const shipping = parseFloat(formData.shipping) || 0;
        const total = subtotal - discount + tax + shipping;
        
        // Validate that total is a valid number
        if (isNaN(total) || total < 0) {
          alert('Invalid total calculation. Please check your line items and additional charges.');
          return;
        }
        
        // Prepare invoice data to match new backend structure
        const invoiceData = {
          patientId: formData.patientId,
          patientName: formData.patientName || selectedPatient?.fullName || '',
          invoiceNo: invoiceNo,
          date: new Date().toISOString().split('T')[0],
          lineItems: formData.lineItems.map(item => ({
            description: item.description,
            qty: parseFloat(item.qty) || 1,
            unitPrice: parseFloat(item.unitPrice) || 0
          })),
          address: formData.address,
          phone: formData.phone || selectedPatient?.phone || '',
          email: formData.email || selectedPatient?.email || '',
          remarks: formData.remarks,
          discount: discount,
          tax: tax,
          shipping: shipping,
          total: total
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
      patientName: "",
      lineItems: [{ description: "", qty: 1, unitPrice: 0 }],
      address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        zipCode: ""
      },
      phone: "",
      email: "",
      remarks: "",
      discount: 0,
      tax: 0,
      shipping: 0
    });
    setErrors({});
    onClose();
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: "", qty: 1, unitPrice: 0 }]
    }));
  };

  const removeLineItem = (index) => {
    if (formData.lineItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLineItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const updateAddress = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const selectedPatient = patients.find(p => p._id === formData.patientId);
  const subtotal = formData.lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    return sum + (qty * unitPrice);
  }, 0);
  const discount = parseFloat(formData.discount) || 0;
  const tax = parseFloat(formData.tax) || 0;
  const shipping = parseFloat(formData.shipping) || 0;
  const total = subtotal - discount + tax + shipping;

  // Auto-populate patient data when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      setFormData(prev => ({
        ...prev,
        patientName: selectedPatient.fullName || '',
        phone: selectedPatient.phone || '',
        email: selectedPatient.email || '',
        address: {
          line1: selectedPatient.address?.street || '',
          line2: '',
          city: selectedPatient.address?.city || '',
          state: selectedPatient.address?.state || '',
          zipCode: selectedPatient.address?.zipCode || ''
        }
      }));
    }
  }, [selectedPatient]);

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name *</Label>
                <Input
                  id="patientName"
                  placeholder="Patient full name"
                  value={formData.patientName}
                  onChange={(e) => handleInputChange("patientName", e.target.value)}
                  className={errors.patientName ? "border-red-500" : ""}
                />
                {errors.patientName && (
                  <p className="text-sm text-red-600">{errors.patientName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Patient phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Patient email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-teal-600" />
              Address Information
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  placeholder="Street address"
                  value={formData.address.line1}
                  onChange={(e) => updateAddress("line1", e.target.value)}
                  className={errors.addressLine1 ? "border-red-500" : ""}
                />
                {errors.addressLine1 && (
                  <p className="text-sm text-red-600">{errors.addressLine1}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  placeholder="Apartment, suite, etc. (optional)"
                  value={formData.address.line2}
                  onChange={(e) => updateAddress("line2", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={formData.address.city}
                    onChange={(e) => updateAddress("city", e.target.value)}
                    className={errors.addressCity ? "border-red-500" : ""}
                  />
                  {errors.addressCity && (
                    <p className="text-sm text-red-600">{errors.addressCity}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={formData.address.state}
                    onChange={(e) => updateAddress("state", e.target.value)}
                    className={errors.addressState ? "border-red-500" : ""}
                  />
                  {errors.addressState && (
                    <p className="text-sm text-red-600">{errors.addressState}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code *</Label>
                  <Input
                    id="zipCode"
                    placeholder="Zip code"
                    value={formData.address.zipCode}
                    onChange={(e) => updateAddress("zipCode", e.target.value)}
                    className={errors.addressZipCode ? "border-red-500" : ""}
                  />
                  {errors.addressZipCode && (
                    <p className="text-sm text-red-600">{errors.addressZipCode}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-600" />
                Line Items
              </h3>
              <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {formData.lineItems.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Item {index + 1}</span>
                  {formData.lineItems.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateLineItem(index, "qty", parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit Price (₹) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Total</Label>
                    <Input
                      value={`₹${(item.qty * item.unitPrice).toFixed(2)}`}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            ))}

            {errors.lineItems && (
              <p className="text-sm text-red-600">{errors.lineItems}</p>
            )}
          </div>

          {/* Additional Charges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Additional Charges
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount">Discount (₹)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => handleInputChange("discount", parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax">Tax (₹)</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.tax}
                  onChange={(e) => handleInputChange("tax", parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping">Shipping (₹)</Label>
                <Input
                  id="shipping"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.shipping}
                  onChange={(e) => handleInputChange("shipping", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Any additional remarks or notes..."
                value={formData.remarks}
                onChange={(e) => handleInputChange("remarks", e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Summary */}
          {formData.patientId && formData.lineItems[0]?.description && (
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <h4 className="font-medium text-teal-900 mb-2">Invoice Summary</h4>
              <div className="space-y-2 text-sm text-teal-800">
                <div className="flex justify-between">
                  <span>Patient:</span>
                  <span className="font-medium">{formData.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                )}
                {shipping > 0 && (
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>₹{shipping.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
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
              className="gradient-button"
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
