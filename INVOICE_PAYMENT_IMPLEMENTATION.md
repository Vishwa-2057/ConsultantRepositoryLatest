# Invoice Payment Implementation Guide

## Backend Implementation ✅ COMPLETED

### 1. Payment Model Updated
**File**: `backend/models/Payment.js`

Added support for invoice payments:
- `invoiceId` field (optional, alongside `appointmentId`)
- `doctorId` made optional (not all invoices have doctors)
- `appointmentId` made optional (to support invoice-only payments)

### 2. Payment Routes Added
**File**: `backend/routes/payments.js`

New endpoints created:
- `POST /api/payments/create-invoice-order` - Create Razorpay order for invoice
- `POST /api/payments/verify-invoice` - Verify payment and approve invoice
- `GET /api/payments/invoice/:invoiceId` - Get payment for specific invoice

**Flow**:
1. Create invoice → Status: "Unapproved"
2. Generate payment link
3. Patient pays → Payment verified
4. Invoice status changes to "Approved"

## Frontend Implementation (TO DO)

### Required Changes in `Billing.jsx`

#### 1. Add Imports
```javascript
import { Link as LinkIcon, Share2, Copy, CheckCircle } from 'lucide-react';
import { config } from '@/config/env';
import sessionManager from '@/utils/sessionManager';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
```

#### 2. Add State Variables
```javascript
const [paymentLink, setPaymentLink] = useState(null);
const [loadingPaymentLink, setLoadingPaymentLink] = useState(false);
const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
const [processingPayment, setProcessingPayment] = useState(false);
const API_BASE_URL = config.API_BASE_URL || 'http://localhost:5000/api';
```

#### 3. Add Payment Functions
Copy these functions from `AppointmentManagement.jsx`:
- `generatePaymentLink()` - Modified for invoices
- `handleCopyPaymentLink()` - Copy link to clipboard
- `handleSharePaymentLink()` - Share via native share
- `handlePayment()` - Process Razorpay payment
- `handleSkipPayment()` - Skip payment for later

**Modifications needed**:
- Change API endpoint from `/payments/create-order` to `/payments/create-invoice-order`
- Change verification endpoint from `/payments/verify` to `/payments/verify-invoice`
- Use `invoiceId` instead of `appointmentId`
- Use `invoice.total` instead of `doctorFees.appointmentFees`

#### 4. Add Payment Dialog After Invoice Creation
When invoice is created successfully:
```javascript
// After invoice creation success
setSelectedInvoiceForPayment(response.invoice);
setIsPaymentDialogOpen(true);
```

#### 5. Add Payment Link Section in Invoice View Modal
Similar to appointment details, add payment link section:
- Show only for "Unapproved" invoices
- Display invoice total amount
- Copy Link and Share Link buttons
- Payment link display

#### 6. Update Invoice List Actions
Add payment button/icon for unapproved invoices in the invoice list.

### Example Code Snippets

#### Generate Payment Link for Invoice
```javascript
const generateInvoicePaymentLink = async (invoiceId, amount) => {
  try {
    setLoadingPaymentLink(true);
    const token = await sessionManager.getToken();
    
    const orderResponse = await fetch(`${API_BASE_URL}/payments/create-invoice-order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoiceId: invoiceId,
        amount: amount
      })
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      throw new Error(errorData.message || 'Failed to generate payment link');
    }

    const orderData = await orderResponse.json();
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invoice-payment?order_id=${orderData.order.id}&invoice_id=${invoiceId}`;
    
    setPaymentLink(link);
    return link;
  } catch (error) {
    console.error('Error generating payment link:', error);
    toast.error('Failed to generate payment link');
    return null;
  } finally {
    setLoadingPaymentLink(false);
  }
};
```

#### Payment Dialog UI
```jsx
<Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-600" />
        Invoice Created Successfully
      </DialogTitle>
      <DialogDescription>
        Complete payment to approve this invoice
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      {selectedInvoiceForPayment && (
        <>
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Invoice No:</span>
                <span className="text-sm font-semibold">#{selectedInvoiceForPayment.invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Patient:</span>
                <span className="text-sm font-semibold">{selectedInvoiceForPayment.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Date:</span>
                <span className="text-sm font-semibold">{selectedInvoiceForPayment.date}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold text-green-900 dark:text-green-100">
                Total Amount:
              </span>
              <span className="text-2xl font-bold text-green-900 dark:text-green-100">
                ₹{selectedInvoiceForPayment.total}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Invoice is in "Unapproved" status. Complete the payment to approve it.
            </p>
          </div>
        </>
      )}
    </div>

    <DialogFooter className="flex gap-2">
      <Button
        variant="outline"
        onClick={handleSkipPayment}
        disabled={processingPayment}
      >
        Pay Later
      </Button>
      <Button
        onClick={() => handleInvoicePayment(selectedInvoiceForPayment)}
        disabled={processingPayment}
        className="bg-green-600 hover:bg-green-700"
      >
        {processingPayment ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Pay Now
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Payment Link Section in Invoice View
```jsx
{/* Payment Link Section - Show if invoice is unapproved */}
{selectedInvoice && selectedInvoice.status === 'Unapproved' && (
  <div className="border-t pt-4">
    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2 text-sm">
      <LinkIcon className="w-4 h-4" />
      Payment Link
    </h3>
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
            {selectedInvoice.status}
          </Badge>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
            Amount: ₹{selectedInvoice.total}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => handleCopyPaymentLink(selectedInvoice._id)}
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
          onClick={() => handleSharePaymentLink(selectedInvoice._id)}
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
  </div>
)}
```

## Testing Checklist

- [ ] Create new invoice → Status should be "Unapproved"
- [ ] Payment dialog appears after invoice creation
- [ ] "Pay Now" button opens Razorpay checkout
- [ ] Complete test payment with test card
- [ ] Invoice status changes to "Approved" after payment
- [ ] Payment link can be copied
- [ ] Payment link can be shared (on mobile)
- [ ] "Pay Later" skips payment but keeps invoice unapproved
- [ ] View invoice details shows payment link section for unapproved invoices
- [ ] Payment link section hidden for approved invoices

## Status Flow

```
Invoice Created
     ↓
Status: "Unapproved"
     ↓
Payment Dialog Shown
     ↓
[Pay Now] → Razorpay → Payment Success → Status: "Approved" ✅
     OR
[Pay Later] → Status remains "Unapproved" → Can pay later via payment link
```

## Notes

- Backend is fully implemented and ready
- Frontend requires similar implementation to AppointmentManagement
- Use invoice total amount instead of doctor fees
- Status changes from "Unapproved" to "Approved" on payment
- Payment link can be shared with patients for later payment
- All Razorpay test mode features work the same way

## Next Steps

1. Update `Billing.jsx` with payment functionality
2. Test invoice creation with payment
3. Test payment link generation and sharing
4. Verify status changes after payment
5. Test "Pay Later" functionality
