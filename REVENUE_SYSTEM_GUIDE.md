# Revenue Tracking System Guide

## Overview
The revenue tracking system automatically records and maintains clinic revenue data separately from invoices, ensuring persistent revenue calculations that won't reset to 0.

## How It Works

### 1. Automatic Revenue Recording
- When an invoice is **approved**, revenue is automatically recorded
- When an approved invoice is **rejected**, revenue is automatically subtracted
- All changes are logged with timestamps and reasons

### 2. Data Structure
```javascript
// Revenue document structure
{
  clinicId: ObjectId,
  year: 2025,
  month: 9,
  totalRevenue: 15000,
  invoiceCount: 10,
  lastUpdated: Date,
  invoiceEntries: [
    {
      invoiceId: ObjectId,
      amount: 1500,
      action: 'add', // or 'subtract'
      reason: 'approved', // or 'rejected'
      timestamp: Date
    }
  ]
}
```

## API Endpoints

### Revenue Endpoints
- `GET /api/revenue/current-month` - Current month revenue with percentage change
- `GET /api/revenue/yearly/:year?` - Yearly revenue breakdown by month
- `GET /api/revenue/summary` - Complete revenue summary
- `GET /api/revenue/audit/:year/:month` - Detailed audit trail

### Updated Invoice Endpoints
- `PATCH /api/invoices/:id/approve` - Approves invoice and records revenue
- `PATCH /api/invoices/:id/reject` - Rejects invoice and adjusts revenue if needed

## Testing the System

### 1. Test Invoice Approval
1. Create a new invoice through the frontend
2. Approve the invoice
3. Check the dashboard - revenue should be updated
4. Check browser console for revenue recording logs

### 2. Test Invoice Rejection
1. Approve an invoice (revenue increases)
2. Reject the same invoice (revenue decreases)
3. Verify revenue adjustments in dashboard

### 3. Test Revenue Persistence
1. Approve several invoices
2. Restart the backend server
3. Check dashboard - revenue should persist

## Frontend Integration

### Dashboard Updates
The dashboard now uses `revenueAPI.getCurrentMonth()` instead of calculating from invoices:

```javascript
// Old way (temporary)
const response = await invoiceAPI.getCurrentMonthRevenue();

// New way (persistent)
const response = await revenueAPI.getCurrentMonth();
```

## Database Collections

### Revenue Collection
- **Collection**: `revenues`
- **Indexes**: 
  - `{ clinicId: 1, year: 1, month: 1 }` (unique)
  - `{ clinicId: 1, year: 1 }`
  - `{ lastUpdated: -1 }`

## Migration

### Existing Data
Run the migration script to convert existing approved invoices:
```bash
cd backend
node scripts/migrate-revenue-data.js
```

## Monitoring

### Console Logs
The system provides detailed logging:
- `✅ Revenue recorded for invoice X: ₹Y`
- `✅ Revenue subtracted for rejected invoice X: ₹Y`
- `❌ Failed to record revenue: [error]`

### Audit Trail
Use the audit endpoint to see detailed revenue history:
```javascript
const audit = await revenueAPI.getAudit(2025, 9);
// Returns all revenue changes for September 2025
```

## Benefits

1. **Persistent Storage** - Revenue data won't disappear
2. **Automatic Updates** - No manual intervention required
3. **Audit Trail** - Complete history of all changes
4. **Performance** - Fast queries without invoice aggregation
5. **Clinic Isolation** - Each clinic's data is separate
6. **Backward Compatible** - Existing UI works unchanged

## Troubleshooting

### Revenue Shows 0
1. Check if invoices are approved (only approved invoices count)
2. Verify clinic association in user profile
3. Check console logs for revenue recording errors
4. Run migration script if upgrading from old system

### Revenue Not Updating
1. Check browser console for API errors
2. Verify backend logs for revenue recording
3. Ensure invoice approval/rejection is working
4. Check database connection

## Future Enhancements

- Revenue reporting dashboard
- Monthly/yearly revenue comparisons
- Revenue forecasting
- Export revenue data to CSV/PDF
- Revenue alerts and notifications
