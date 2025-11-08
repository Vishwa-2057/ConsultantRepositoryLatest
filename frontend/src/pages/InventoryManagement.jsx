import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  Plus, 
  Search, 
  Edit,
  Trash2,
  AlertTriangle,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter
} from "lucide-react";
import { inventoryAPI } from '../services/api';
import { useToast } from "@/hooks/use-toast";

const InventoryManagement = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  
  const [itemForm, setItemForm] = useState({
    medicationName: "",
    genericName: "",
    manufacturer: "",
    batchNumber: "",
    category: "Tablet",
    strength: "",
    quantity: 0,
    reorderLevel: 10,
    unitPrice: 0,
    sellingPrice: 0,
    expiryDate: "",
    manufacturingDate: "",
    location: "",
    description: "",
    prescriptionRequired: true,
    notes: ""
  });

  const { toast } = useToast();

  const categories = [
    "Tablet", "Capsule", "Syrup", "Injection", "Ointment", 
    "Drops", "Inhaler", "Cream", "Gel", "Powder", "Other"
  ];

  useEffect(() => {
    loadInventory();
  }, [searchQuery, categoryFilter, statusFilter]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const filters = {};
      
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      
      if (categoryFilter !== "all") {
        filters.category = categoryFilter;
      }

      if (statusFilter === "lowStock") {
        filters.lowStock = "true";
      } else if (statusFilter === "expiring") {
        filters.expiring = "true";
      } else if (statusFilter === "expired") {
        filters.expired = "true";
      }

      const response = await inventoryAPI.getAll(1, 100, filters);
      
      if (response.success) {
        setInventory(response.data || []);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      setSubmitting(true);

      // Validation
      if (!itemForm.medicationName || !itemForm.batchNumber || !itemForm.strength || !itemForm.expiryDate) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const response = await inventoryAPI.create(itemForm);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Medication added successfully"
        });
        setIsAddModalOpen(false);
        resetForm();
        loadInventory();
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add medication",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = async () => {
    try {
      setSubmitting(true);

      const response = await inventoryAPI.update(selectedItem._id, itemForm);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Medication updated successfully"
        });
        setIsEditModalOpen(false);
        setSelectedItem(null);
        resetForm();
        loadInventory();
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update medication",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const response = await inventoryAPI.delete(id);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Medication deleted successfully"
        });
        loadInventory();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete medication",
        variant: "destructive"
      });
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setItemForm({
      medicationName: item.medicationName,
      genericName: item.genericName || "",
      manufacturer: item.manufacturer || "",
      batchNumber: item.batchNumber,
      category: item.category,
      strength: item.strength,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel,
      unitPrice: item.unitPrice,
      sellingPrice: item.sellingPrice,
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : "",
      manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate).toISOString().split('T')[0] : "",
      location: item.location || "",
      description: item.description || "",
      prescriptionRequired: item.prescriptionRequired,
      notes: item.notes || ""
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setItemForm({
      medicationName: "",
      genericName: "",
      manufacturer: "",
      batchNumber: "",
      category: "Tablet",
      strength: "",
      quantity: 0,
      reorderLevel: 10,
      unitPrice: 0,
      sellingPrice: 0,
      expiryDate: "",
      manufacturingDate: "",
      location: "",
      description: "",
      prescriptionRequired: true,
      notes: ""
    });
  };

  const getStockStatus = (item) => {
    if (item.quantity <= 0) return { label: "Out of Stock", color: "destructive" };
    if (item.quantity <= item.reorderLevel) return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "default" };
  };

  const isExpiringSoon = (expiryDate) => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(expiryDate) <= thirtyDaysFromNow && new Date(expiryDate) >= new Date();
  };

  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Manage medications and supplies</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Medication
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search medications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="lowStock">Low Stock</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle>Medications ({inventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No medications found</div>
          ) : (
            <div className="space-y-3">
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item);
                const expiringSoon = isExpiringSoon(item.expiryDate);
                const expired = isExpired(item.expiryDate);

                return (
                  <div key={item._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.medicationName}</h3>
                          <p className="text-sm text-gray-600">
                            {item.genericName && `${item.genericName} • `}
                            {item.strength} • Batch: {item.batchNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">Qty: {item.quantity}</p>
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(item.expiryDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <Badge variant={stockStatus.color}>{stockStatus.label}</Badge>
                        {expired && <Badge variant="destructive">Expired</Badge>}
                        {!expired && expiringSoon && <Badge variant="warning">Expiring Soon</Badge>}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteItem(item._id, item.medicationName)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedItem(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditModalOpen ? 'Edit Medication' : 'Add New Medication'}</DialogTitle>
            <DialogDescription>
              {isEditModalOpen ? 'Update medication details' : 'Add a new medication to inventory'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Medication Name *</Label>
                <Input
                  value={itemForm.medicationName}
                  onChange={(e) => setItemForm({...itemForm, medicationName: e.target.value})}
                  placeholder="Paracetamol"
                />
              </div>
              <div>
                <Label>Generic Name</Label>
                <Input
                  value={itemForm.genericName}
                  onChange={(e) => setItemForm({...itemForm, genericName: e.target.value})}
                  placeholder="Acetaminophen"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Manufacturer</Label>
                <Input
                  value={itemForm.manufacturer}
                  onChange={(e) => setItemForm({...itemForm, manufacturer: e.target.value})}
                  placeholder="Company Name"
                />
              </div>
              <div>
                <Label>Batch Number *</Label>
                <Input
                  value={itemForm.batchNumber}
                  onChange={(e) => setItemForm({...itemForm, batchNumber: e.target.value})}
                  placeholder="BATCH001"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={itemForm.category} onValueChange={(value) => setItemForm({...itemForm, category: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Strength *</Label>
                <Input
                  value={itemForm.strength}
                  onChange={(e) => setItemForm({...itemForm, strength: e.target.value})}
                  placeholder="500mg"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={itemForm.location}
                  onChange={(e) => setItemForm({...itemForm, location: e.target.value})}
                  placeholder="Shelf A1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
              <div>
                <Label>Reorder Level *</Label>
                <Input
                  type="number"
                  value={itemForm.reorderLevel}
                  onChange={(e) => setItemForm({...itemForm, reorderLevel: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit Price (₹) *</Label>
                <Input
                  type="number"
                  value={itemForm.unitPrice}
                  onChange={(e) => setItemForm({...itemForm, unitPrice: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Selling Price (₹) *</Label>
                <Input
                  type="number"
                  value={itemForm.sellingPrice}
                  onChange={(e) => setItemForm({...itemForm, sellingPrice: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Manufacturing Date</Label>
                <Input
                  type="date"
                  value={itemForm.manufacturingDate}
                  onChange={(e) => setItemForm({...itemForm, manufacturingDate: e.target.value})}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  value={itemForm.expiryDate}
                  onChange={(e) => setItemForm({...itemForm, expiryDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={itemForm.description}
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                placeholder="Additional details"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={itemForm.notes}
                onChange={(e) => setItemForm({...itemForm, notes: e.target.value})}
                placeholder="Internal notes"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="prescriptionRequired"
                checked={itemForm.prescriptionRequired}
                onChange={(e) => setItemForm({...itemForm, prescriptionRequired: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="prescriptionRequired">Prescription Required</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setSelectedItem(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={isEditModalOpen ? handleEditItem : handleAddItem} 
              disabled={submitting}
            >
              {submitting ? "Saving..." : isEditModalOpen ? "Update" : "Add Medication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
