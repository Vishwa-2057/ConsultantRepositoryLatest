# Database Scripts

This directory contains utility scripts for database maintenance and fixes.

## Available Scripts

### fix-invoice-indexes.js
Fixes invoice numbering by ensuring proper sequential indexing for each clinic.

**Usage:**
```bash
node scripts/fix-invoice-indexes.js
```

**What it does:**
- Scans all invoices in the database
- Groups them by clinic
- Reorders invoice numbers sequentially for each clinic
- Ensures no gaps or duplicates in invoice numbering

### fixNurseClinicIds.js
Updates nurse records to ensure proper clinic association.

**Usage:**
```bash
node scripts/fixNurseClinicIds.js
```

**What it does:**
- Finds nurses with missing or invalid clinic IDs
- Updates clinic associations based on existing data
- Ensures data consistency between nurses and clinics

### fix-clinic-passwords.js
Fixes clinic admin password encryption issues by hashing plain text passwords.

**Usage:**
```bash
node scripts/fix-clinic-passwords.js
```

**What it does:**
- Scans all clinic records for plain text passwords
- Converts plain text passwords to bcrypt hashes
- Ensures consistency between password storage and authentication
- Fixes "invalid credentials" issues after password reset

**When to use:**
- When clinic admins can't login after using forgot password feature
- After importing clinic data with plain text passwords
- When migrating from older system versions

## Running Scripts

1. Make sure MongoDB is running
2. Navigate to the backend directory
3. Run the desired script using Node.js

**Example:**
```bash
cd backend
node scripts/fix-clinic-passwords.js
```

## Important Notes

- Always backup your database before running any scripts
- Scripts are designed to be idempotent (safe to run multiple times)
- Check the console output for detailed information about changes made
- The fix-clinic-passwords.js script is particularly important for resolving authentication issues
