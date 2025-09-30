# Database Migration Scripts

## Nurse Clinic ID Migration

### Problem
Some nurses may not have a `clinicId` assigned, which prevents them from accessing appointments and other clinic-specific features.

### Solution
Use the `fixNurseClinicIds.js` script to identify and fix nurses without clinic assignments.

### Usage

#### 1. Check Current Status
```bash
cd backend
node scripts/fixNurseClinicIds.js check
```
This will show:
- Total number of nurses
- How many have clinic assignments
- Which nurses are missing clinic assignments
- Distribution of nurses across clinics

#### 2. Fix Missing Clinic IDs
```bash
cd backend
node scripts/fixNurseClinicIds.js fix
```
This will:
- Find all nurses without `clinicId`
- Assign them to the first active clinic found
- Verify the fix was successful

#### 3. Manual Assignment (if needed)
If you need to assign specific nurses to specific clinics, you can modify the script or use MongoDB directly:

```javascript
// In MongoDB shell or script
db.nurses.updateOne(
  { _id: ObjectId("nurse_id_here") },
  { $set: { clinicId: ObjectId("clinic_id_here") } }
)
```

### Environment Setup
Make sure your MongoDB connection string is set in your environment:
```bash
export MONGODB_URI="mongodb://localhost:27017/consultant-system"
```

Or the script will use the default: `mongodb://localhost:27017/consultant-system`

### Verification
After running the migration:
1. Check that nurses can access appointments
2. Verify no more "Nurse clinic information not found" errors
3. Run the check command again to confirm all nurses have clinic assignments

### Troubleshooting
- **No active clinic found**: Create at least one active clinic before running the migration
- **Connection errors**: Verify MongoDB is running and connection string is correct
- **Permission errors**: Ensure the script has database write permissions
