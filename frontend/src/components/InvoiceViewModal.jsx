import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  User, 
  Calendar, 
  DollarSign, 
  Download,
  X,
  MapPin,
  Phone,
  Mail
} from "lucide-react";

const InvoiceViewModal = ({ isOpen, onClose, invoice }) => {
  if (!invoice) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid": return "success";
      case "Sent": return "primary";
      case "Draft": return "muted";
      case "Overdue": return "destructive";
      case "Cancelled": return "destructive";
      default: return "muted";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Paid": return "✓";
      case "Sent": return "📤";
      case "Draft": return "📝";
      case "Overdue": return "⚠️";
      case "Cancelled": return "❌";
      default: return "📄";
    }
  };

  const handleDownload = () => {
    // Create a simple text-based invoice for download
    const invoiceContent = `
INVOICE
Invoice Number: ${invoice.invoiceNumber}
Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

BILL TO:
${invoice.patientName}
${invoice.patientId?.phone || 'N/A'}
${invoice.patientId?.email || 'N/A'}

SERVICES:
${invoice.items?.map(item => 
  `${item.description} - Qty: ${item.quantity} x $${item.rate} = $${item.amount}`
).join('\n') || 'No items listed'}

SUBTOTAL: $${invoice.subtotal?.toFixed(2) || '0.00'}
TAX: $${invoice.taxAmount?.toFixed(2) || '0.00'}
TOTAL: $${invoice.total?.toFixed(2) || '0.00'}

STATUS: ${invoice.status}
PAYMENT METHOD: ${invoice.paymentMethod || 'N/A'}

NOTES:
${invoice.notes || 'No additional notes'}
    `.trim();

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoiceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-teal-600" />
            Invoice Details
          </DialogTitle>
          <DialogDescription>
            View and manage invoice information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Invoice #{invoice.invoiceNumber}</h2>
              <p className="text-muted-foreground">
                Created: {new Date(invoice.invoiceDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <Badge variant={getStatusColor(invoice.status)} className="mb-2">
                {getStatusIcon(invoice.status)} {invoice.status}
              </Badge>
              <p className="text-2xl font-bold text-foreground">
                ${Number(invoice.total || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-teal-600" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{invoice.patientName}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {invoice.patientId?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {invoice.patientId.phone}
                      </div>
                    )}
                    {invoice.patientId?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {invoice.patientId.email}
                      </div>
                    )}
                    {invoice.patientId?.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {invoice.patientId.address}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium">{invoice.paymentMethod || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Terms:</span>
                    <span className="font-medium">{invoice.terms || 'Net 30'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services/Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                Services & Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.items && invoice.items.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  {invoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 py-2 border-b border-border/50">
                      <div className="col-span-6">
                        <p className="font-medium">{item.description}</p>
                      </div>
                      <div className="col-span-2 text-center">{item.quantity}</div>
                      <div className="col-span-2 text-right">${Number(item.rate || 0).toFixed(2)}</div>
                      <div className="col-span-2 text-right font-medium">${Number(item.amount || 0).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No items listed</p>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${Number(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({invoice.taxRate || 0}%):</span>
                  <span className="font-medium">${Number(invoice.taxAmount || 0).toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>${Number(invoice.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button 
            onClick={handleDownload}
            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Invoice
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceViewModal;
