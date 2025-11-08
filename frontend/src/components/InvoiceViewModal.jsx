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
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Link as LinkIcon,
  Share2,
  Copy,
  Info
} from "lucide-react";
import jsPDF from 'jspdf';

const InvoiceViewModal = ({ 
  isOpen, 
  onClose, 
  invoice,
  onCopyPaymentLink,
  onSharePaymentLink,
  paymentLink,
  loadingPaymentLink
}) => {
  if (!invoice) return null;

  // Format address from the new address structure
  const formatAddress = (address) => {
    if (!address) return 'N/A';
    const parts = [address.line1, address.line2, address.city, address.state, address.zipCode].filter(Boolean);
    return parts.join(', ');
  };

  // Get status display properties
  const getStatusInfo = (status) => {
    switch (status) {
      case "Draft": 
        return { color: "secondary", icon: FileText, label: "Draft" };
      case "Sent": 
        return { color: "warning", icon: Clock, label: "Pending Approval" };
      case "Approved": 
        return { color: "success", icon: CheckCircle, label: "Approved" };
      case "Rejected": 
        return { color: "destructive", icon: AlertCircle, label: "Rejected" };
      case "Paid": 
        return { color: "success", icon: CheckCircle, label: "Paid" };
      case "Overdue": 
        return { color: "destructive", icon: AlertCircle, label: "Overdue" };
      case "Cancelled": 
        return { color: "secondary", icon: AlertCircle, label: "Cancelled" };
      default: 
        return { color: "secondary", icon: Clock, label: status || "Unknown" };
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // Helper function to add text with automatic line wrapping
    const addText = (text, x, y, options = {}) => {
      const { fontSize = 10, fontStyle = 'normal', maxWidth = pageWidth - 40, align = 'left' } = options;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      
      if (align === 'center') {
        doc.text(text, pageWidth / 2, y, { align: 'center' });
      } else if (align === 'right') {
        doc.text(text, x, y, { align: 'right' });
      } else {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * (fontSize * 0.4));
      }
      return y + (fontSize * 0.4);
    };

    // Header
    doc.setFillColor(4, 77, 153); // #004D99
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth / 2, 20, { align: 'center' });
    
    yPosition = 45;
    doc.setTextColor(0, 0, 0);

    // Invoice Details
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice #${invoice.invoiceNo}`, 20, yPosition);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${invoice.date}`, pageWidth - 20, yPosition, { align: 'right' });
    
    yPosition += 10;
    
    // Status information
    const statusInfo = getStatusInfo(invoice.status);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Status: ${statusInfo.label}`, pageWidth - 20, yPosition, { align: 'right' });
    
    yPosition += 15;

    // Patient Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    yPosition = addText(invoice.patientName || 'N/A', 20, yPosition, { fontSize: 11, fontStyle: 'bold' });
    yPosition += 3;
    
    if (invoice.phone) {
      yPosition = addText(`Phone: ${invoice.phone}`, 20, yPosition, { fontSize: 10 });
      yPosition += 3;
    }
    
    if (invoice.email) {
      yPosition = addText(`Email: ${invoice.email}`, 20, yPosition, { fontSize: 10 });
      yPosition += 3;
    }
    
    if (invoice.address) {
      yPosition = addText(`Address: ${formatAddress(invoice.address)}`, 20, yPosition, { fontSize: 10, maxWidth: pageWidth - 40 });
      yPosition += 5;
    }

    yPosition += 10;

    // Line Items Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LINE ITEMS:', 20, yPosition);
    yPosition += 10;

    // Table Header
    doc.setFillColor(66, 168, 155); // #42A89B
    doc.rect(20, yPosition - 5, pageWidth - 40, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 25, yPosition);
    doc.text('Qty', pageWidth - 120, yPosition, { align: 'center' });
    doc.text('Unit Price', pageWidth - 80, yPosition, { align: 'center' });
    doc.text('Amount', pageWidth - 25, yPosition, { align: 'right' });
    
    yPosition += 10;
    doc.setTextColor(0, 0, 0);

    // Line Items
    if (invoice.lineItems && invoice.lineItems.length > 0) {
      invoice.lineItems.forEach((item, index) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        // Add alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 249, 250);
          doc.rect(20, yPosition - 4, pageWidth - 40, 8, 'F');
        }
        
        const amount = (item.qty * item.unitPrice) || 0;
        
        doc.text(item.description || 'N/A', 25, yPosition);
        doc.text(String(item.qty || 0), pageWidth - 120, yPosition, { align: 'center' });
        doc.text(`₹${Number(item.unitPrice || 0).toFixed(2)}`, pageWidth - 80, yPosition, { align: 'center' });
        doc.text(`₹${amount.toFixed(2)}`, pageWidth - 25, yPosition, { align: 'right' });
        
        yPosition += 8;
      });
    } else {
      doc.setFontSize(10);
      doc.text('No items listed', 25, yPosition);
      yPosition += 8;
    }

    yPosition += 10;

    // Totals Section
    const subtotal = invoice.lineItems?.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0) || 0;
    const rightAlign = pageWidth - 25;
    const labelX = pageWidth - 80;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Subtotal:', labelX, yPosition);
    doc.text(`₹${subtotal.toFixed(2)}`, rightAlign, yPosition, { align: 'right' });
    yPosition += 6;

    if (invoice.discount > 0) {
      doc.text('Discount:', labelX, yPosition);
      doc.text(`-₹${Number(invoice.discount || 0).toFixed(2)}`, rightAlign, yPosition, { align: 'right' });
      yPosition += 6;
    }

    if (invoice.tax > 0) {
      doc.text('Tax:', labelX, yPosition);
      doc.text(`₹${Number(invoice.tax || 0).toFixed(2)}`, rightAlign, yPosition, { align: 'right' });
      yPosition += 6;
    }

    if (invoice.shipping > 0) {
      doc.text('Shipping:', labelX, yPosition);
      doc.text(`₹${Number(invoice.shipping || 0).toFixed(2)}`, rightAlign, yPosition, { align: 'right' });
      yPosition += 6;
    }

    // Total line
    doc.setLineWidth(0.5);
    doc.line(labelX - 5, yPosition + 2, rightAlign, yPosition + 2);
    yPosition += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', labelX, yPosition);
    doc.text(`₹${Number(invoice.total || 0).toFixed(2)}`, rightAlign, yPosition, { align: 'right' });

    // Remarks Section
    if (invoice.remarks) {
      yPosition += 20;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('REMARKS:', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const remarkLines = doc.splitTextToSize(invoice.remarks, pageWidth - 40);
      doc.text(remarkLines, 20, yPosition);
    }

    // Footer
    const footerY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('Generated by Smaart Healthcare System', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 5, { align: 'center' });

    // Save the PDF
    doc.save(`invoice-${invoice.invoiceNo}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-blue-600" />
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
              <h2 className="text-2xl font-bold text-foreground">Invoice #{invoice.invoiceNo}</h2>
              <p className="text-muted-foreground">
                Date: {invoice.date}
              </p>
              {/* Status Badge */}
              {invoice.status && (
                <div className="mt-2">
                  {(() => {
                    const statusInfo = getStatusInfo(invoice.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <Badge variant={statusInfo.color} className="flex items-center gap-1 w-fit">
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </Badge>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                ₹{Number(invoice.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </div>
          </div>

          <Separator />

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{invoice.patientName}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {invoice.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {invoice.phone}
                      </div>
                    )}
                    {invoice.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {invoice.email}
                      </div>
                    )}
                    {invoice.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {formatAddress(invoice.address)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span className="font-medium">{invoice.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Number:</span>
                    <span className="font-medium">{invoice.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{new Date(invoice.createdAt).toLocaleDateString()}</span>
                  </div>
                  {invoice.status && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium">{getStatusInfo(invoice.status).label}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <span className="font-medium">
                      {invoice.paymentStatus === 'paid' || invoice.status?.toLowerCase() === 'approved' || invoice.status?.toLowerCase() === 'paid' 
                        ? (invoice.paymentMethod === 'cash' ? 'Paid (Cash)' : invoice.paymentMethod === 'online' ? 'Paid (Online)' : 'Paid') 
                        : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.lineItems && invoice.lineItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  {invoice.lineItems.map((item, index) => {
                    // If unitPrice is 0 or missing, use the invoice total amount
                    // Check multiple possible field names for the total
                    const invoiceTotal = invoice.totalAmount || invoice.amount || invoice.total || 0;
                    const unitPrice = (item.unitPrice && item.unitPrice > 0) ? item.unitPrice : invoiceTotal;
                    const qty = item.qty || 1;
                    const amount = qty * unitPrice;
                    
                    console.log('Line item:', item, 'Invoice total:', invoiceTotal, 'Using unitPrice:', unitPrice);
                    
                    return (
                      <div key={index} className="grid grid-cols-12 gap-4 py-2 border-b border-border/50">
                        <div className="col-span-6">
                          <p className="font-medium">{item.description}</p>
                        </div>
                        <div className="col-span-2 text-center">{qty}</div>
                        <div className="col-span-2 text-right">₹{Number(unitPrice).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div className="col-span-2 text-right font-medium">₹{Number(amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      </div>
                    );
                  })}
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
                  <span className="font-medium">₹{Number(
                    invoice.lineItems?.reduce((sum, item) => {
                      const invoiceTotal = invoice.totalAmount || invoice.amount || invoice.total || 0;
                      const unitPrice = (item.unitPrice && item.unitPrice > 0) ? item.unitPrice : invoiceTotal;
                      const qty = item.qty || 1;
                      return sum + (qty * unitPrice);
                    }, 0) || (invoice.totalAmount || invoice.amount || invoice.total || 0)
                  ).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-red-600">-₹{Number(invoice.discount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                )}
                {invoice.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-medium">₹{Number(invoice.tax || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                )}
                {invoice.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">₹{Number(invoice.shipping || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{Number(invoice.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          {invoice.remarks && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{invoice.remarks}</p>
              </CardContent>
            </Card>
          )}

          {/* Payment Link Section - Show if invoice is unapproved */}
          {invoice && invoice.status === 'Unapproved' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Payment Link
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <p className="text-xs text-amber-800 dark:text-amber-200 truncate">
                          This invoice requires payment approval.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 flex-shrink-0">
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                        Amount: ₹{Number(invoice.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => onCopyPaymentLink && onCopyPaymentLink(invoice._id, invoice.total)}
                      disabled={loadingPaymentLink}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      {loadingPaymentLink ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                          <span className="text-xs">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          <span className="text-xs">Copy Link</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => onSharePaymentLink && onSharePaymentLink(invoice._id, invoice.total)}
                      disabled={loadingPaymentLink}
                      size="sm"
                      className="flex-1"
                    >
                      {loadingPaymentLink ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                          <span className="text-xs">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 mr-1.5" />
                          <span className="text-xs">Share Link</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {paymentLink && (
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Payment Link:</p>
                      <p className="text-xs font-mono break-all leading-tight">{paymentLink}</p>
                    </div>
                  )}
                </div>
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
            className="gradient-button"
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
