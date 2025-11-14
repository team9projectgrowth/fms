# Next Steps - Executor Profiles Integration

## ✅ Completed Steps

1. ✅ Created SQL migration for executor_profiles RLS policies
2. ✅ Updated executors.service.ts to link with executor_profiles
3. ✅ Added TypeScript types for ExecutorProfile
4. ✅ Fixed SQL syntax errors (NEW keyword issues)

## 📋 Remaining Steps

### Step 1: Run SQL Migration (REQUIRED)
**Priority: HIGH**

1. Open Supabase Dashboard → SQL Editor
2. Run: `EXECUTOR_PROFILES_RLS_SETUP_COMPLETE.sql`
3. Verify execution was successful:
   ```sql
   -- Check policies were created
   SELECT policyname FROM pg_policies WHERE tablename = 'executor_profiles';
   
   -- Check functions exist
   SELECT proname FROM pg_proc WHERE proname LIKE '%executor_profile%';
   ```

### Step 2: Update Types to Use ExecutorWithProfile
**Priority: HIGH**

Update `UserManagementExecutors.tsx` to use `ExecutorWithProfile` instead of `ExecutorWithUser`:
- Import: `import type { ExecutorWithProfile } from '../../types/database';`
- Update state types: `useState<ExecutorWithProfile[]>([])`

### Step 3: Add Ticket Counts for Executors
**Priority: MEDIUM**

Add ticket count display to executors list:
- Query tickets grouped by executor_id
- Display total tickets, open tickets, resolved tickets for each executor
- Update `UserManagementExecutors.tsx` to show ticket counts

### Step 4: Update Service to Return Ticket Counts
**Priority: MEDIUM**

Enhance `executors.service.ts`:
- Add `getExecutorStats(id: string)` method to get ticket counts
- Or add ticket counts to the executor query results

### Step 5: Test Tenant Admin Functionality
**Priority: HIGH**

1. Login as tenant admin
2. Navigate to User Management → Executors
3. Verify:
   - ✅ Can see only executors from their tenant
   - ✅ Can create new executor (should auto-create executor_profile)
   - ✅ Can edit/update executors
   - ✅ Can enable/disable executors
   - ✅ Ticket counts are displayed correctly

### Step 6: Update Complainants Management (if needed)
**Priority: LOW**

Ensure `UserManagementComplainants.tsx`:
- Filters by tenant_id correctly
- Shows all relevant user fields
- Has search, sort, filter functionality

## 🔧 Implementation Details

### Ticket Count Query Example
```typescript
// Add to tickets.service.ts or executors.service.ts
async getExecutorTicketCounts(executorId: string) {
  const { count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('executor_id', executorId);
    
  // Group by status
  const { data } = await supabase
    .from('tickets')
    .select('status')
    .eq('executor_id', executorId);
    
  return {
    total: count || 0,
    byStatus: {
      open: data?.filter(t => t.status === 'open').length || 0,
      inProgress: data?.filter(t => t.status === 'in-progress').length || 0,
      resolved: data?.filter(t => t.status === 'resolved').length || 0,
    }
  };
}
```

### Update UserManagementExecutors to Show Tickets
```typescript
// Add ticket counts display in the executor card
<div className="mt-2 text-sm text-gray-600">
  <span className="font-medium">Tickets:</span>
  <span className="ml-2">Total: {executor.ticketCount?.total || 0}</span>
  <span className="ml-2">Open: {executor.ticketCount?.open || 0}</span>
  <span className="ml-2">Resolved: {executor.ticketCount?.resolved || 0}</span>
</div>
```

## 🚨 Critical Issues to Address

1. **RLS Policies** - Ensure executor_profiles RLS is working correctly
2. **Data Migration** - If executor_profiles table already has data, ensure tenant_id is set correctly
3. **Backward Compatibility** - Handle cases where executor_profiles might not exist for existing executors

## 📝 Testing Checklist

- [ ] SQL migration runs successfully
- [ ] Tenant admin can see executors in their tenant only
- [ ] Creating executor creates executor_profile automatically
- [ ] Ticket counts display correctly for each executor
- [ ] Filtering by tenant works in executors list
- [ ] Editing executor updates executor_profile correctly
- [ ] RLS policies prevent cross-tenant access

## 🔄 Next Actions (Immediate)

1. **Run the SQL migration** (`EXECUTOR_PROFILES_RLS_SETUP_COMPLETE.sql`)
2. **Test executor creation** as tenant admin
3. **Verify executor_profiles** are created automatically
4. **Add ticket counts** to executor display
5. **Test full CRUD operations** for executors as tenant admin

