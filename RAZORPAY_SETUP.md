# Razorpay Payment Integration Setup

## Overview
The application now supports Razorpay payment integration for appointment fees. Patients can pay consultation fees after creating an appointment, and the appointment status will automatically change to "Confirmed" upon successful payment.

## Test Mode Setup (Free for Testing)

### 1. Get Razorpay Test Keys
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/signup)
2. Go to **Settings → API Keys**
3. Switch to **Test Mode** (toggle in the top-left)
4. Generate Test Keys:
   - **Key ID**: Starts with `rzp_test_`
   - **Key Secret**: Your secret key

### 2. Backend Configuration
Add these to your backend `.env` file:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_secret_key_here
```

### 3. Frontend Configuration
Add this to your frontend `.env` file:

```env
REACT_APP_RAZORPAY_KEY_ID=rzp_test_your_key_id_here
```

**Important**: Use the same Key ID in both backend and frontend.

## Testing Payments

### Test Card Details
Use these test cards in Test Mode (no real money will be charged):

#### Success Scenarios
- **Card Number**: `4111 1111 1111 1111` (Visa)
- **Card Number**: `5104 0600 0000 0008` (Mastercard)
- **CVV**: Any 3 digits (e.g., `123`)
- **Expiry**: Any future date (e.g., `12/25`)
- **Name**: Any name

#### Failure Scenarios
- **Card Number**: `4111 1111 1111 1234` (Will fail)

### Test UPI
- **UPI ID**: `success@razorpay`
- **UPI ID**: `failure@razorpay` (Will fail)

### Test Netbanking
- Select any bank and use:
- **Success**: Click "Success" button
- **Failure**: Click "Failure" button

## How It Works

### Payment Flow
1. **Create Appointment** → Appointment created with status "Processing"
2. **Payment Dialog Opens** → Shows appointment details and fees
3. **Pay Now** → Razorpay checkout opens
4. **Complete Payment** → Use test card details
5. **Payment Verified** → Appointment status changes to "Confirmed"
6. **Pay Later** → Appointment remains in "Processing" status

### Features
- ✅ Automatic appointment confirmation on successful payment
- ✅ Payment records stored in database
- ✅ Razorpay signature verification for security
- ✅ Option to pay later
- ✅ Test mode for development (no real money)

## Database Models

### Payment Model
Tracks all payment transactions:
- `appointmentId` - Reference to appointment
- `amount` - Payment amount
- `status` - pending, processing, completed, failed, refunded
- `razorpayOrderId` - Razorpay order ID
- `razorpayPaymentId` - Razorpay payment ID
- `razorpaySignature` - Signature for verification

### Appointment Status Flow
- **Processing** (Default) → Created but not paid
- **Confirmed** → Payment successful
- **Scheduled** → Can be set manually
- **Completed** → Appointment finished
- **Cancelled** → Appointment cancelled
- **No Show** → Patient didn't show up

## API Endpoints

### Create Payment Order
```
POST /api/payments/create-order
Body: { appointmentId, amount }
```

### Verify Payment
```
POST /api/payments/verify
Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId }
```

### Get Payment by Appointment
```
GET /api/payments/appointment/:appointmentId
```

## Production Setup

When moving to production:
1. Switch to **Live Mode** in Razorpay Dashboard
2. Generate **Live Keys** (start with `rzp_live_`)
3. Update `.env` files with live keys
4. **Important**: Live mode will charge real money!

## Troubleshooting

### Payment Not Working
- Check if Razorpay keys are correctly set in `.env` files
- Verify frontend can access `REACT_APP_RAZORPAY_KEY_ID`
- Check browser console for errors
- Ensure backend server is running

### Payment Verification Failed
- Check if `RAZORPAY_KEY_SECRET` is correct in backend
- Verify signature calculation matches Razorpay's format
- Check network tab for API response errors

### Appointment Not Confirming
- Check if payment verification endpoint is being called
- Verify appointment ID is passed correctly
- Check backend logs for errors

## Support
For Razorpay-specific issues, visit:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Integration Guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/)
