# Tenant Approval System Setup

## Overview

A new approval workflow has been added for tenant registrations. Now, when a new tenant registers, they must be approved by a Super Admin before they can access the system.

## What Was Added

### 1. Database Changes
- `approved` column (boolean) - Whether tenant is approved
- `approved_at` column (timestamp) - When approval was granted
- `approved_by` column (uuid) - Which admin approved it

### 2. Super Admin Screen
- **New Screen:** `SuperAdminTenantManagement.tsx`
- **Location:** Sidebar → "Tenant Management"
- **Features:**
  - View all tenants
  - See pending approvals
  - Approve/Reject tenant requests
  - Enable/Disable tenants
  - Update tenant information
  - Delete tenants
  - Search and filter by status, subscription, approval

### 3. Services Updated
- `approveTenant()` - Approves a tenant and records who approved
- `rejectTenant()` - Rejects a tenant (sets approved to false)
- `createTenant()` - Now creates tenants as unapproved by default

## Setup Instructions

### Step 1: Run the Approval Migration

1. Go to Supabase SQL Editor
2. Copy the entire contents of `APPROVAL_MIGRATION.sql`
3. Paste and run it
4. Wait for success ✅

### Step 2: Test the Feature

1. **Create a test tenant:**
   - Go to `/tenant-register`
   - Fill in tenant registration form
   - Submit

2. **As Super Admin:**
   - Login at `/dashboard/login`
   - Go to "Tenant Management" in sidebar
   - You should see the new tenant with "Pending" badge
   - Click the ✓ (checkmark) icon to approve
   - Tenant admin can now login!

## How It Works

### Tenant Registration Flow:
1. User fills tenant registration form
2. Tenant is created with `approved: false`
3. Tenant admin user is created
4. Super Admin must approve
5. Once approved, tenant admin can login

### Super Admin Actions:
- **Approve:** Sets `approved: true`, records timestamp and approver
- **Reject:** Sets `approved: false` 
- **Activate/Deactivate:** Toggles `active` status
- **Delete:** Removes tenant entirely

### Security:
- Only Super Admins can see this screen
- Only Super Admins can approve tenants
- Unapproved tenants cannot login

## UI Features

### Statistics Dashboard:
- Total Tenants
- Pending Approvals (highlighted in orange)
- Approved
- Active/Inactive

### Filtering:
- Search by name, email, contact person
- Filter by approval status (All/Approved/Pending)
- Filter by active status (All/Active/Inactive)
- Filter by subscription (All/Trial/Active/Inactive/Expired)

### Actions Per Tenant:
- ✓ Approve (green checkmark)
- ✗ Reject (red X)
- ⚡ Activate/Deactivate (power icon)
- ✏️ Edit (blue pencil)
- 🗑️ Delete (red X)

## Technical Details

### Files Modified:
1. `src/types/database.ts` - Added approval fields
2. `src/services/tenants.service.ts` - Added approve/reject methods
3. `src/App.tsx` - Added route
4. `src/dashboard/DashboardSidebar.tsx` - Added menu item

### Files Created:
1. `src/dashboard/screens/SuperAdminTenantManagement.tsx` - Main screen
2. `supabase/migrations/20251102140000_add_tenant_approval_system.sql` - Migration

### Dependencies:
- None! Uses existing services and utilities

## Notes

- Approved tenants show green "Approved" badge
- Pending tenants show orange "Pending" badge
- Active/Inactive status is separate from approval
- All actions are logged with user ID
- Deletion requires confirmation

