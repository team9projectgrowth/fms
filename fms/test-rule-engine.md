# Testing Rule Engine Backend

## Quick Test Methods

### Method 1: Test via Supabase SQL Editor (Direct Database)

1. **Create a test rule directly in database:**
```sql
-- Insert a test rule
INSERT INTO rules (tenant_id, rule_name, priority_order, trigger_event, is_active, stop_on_match)
VALUES (
  'your-tenant-id-here',  -- Replace with actual tenant ID
  'Test Rule: High Priority for Critical Category',
  1,
  'on_create',
  true,
  false
)
RETURNING id;

-- Note the rule_id from above, then insert a condition
INSERT INTO conditions (tenant_id, rule_id, field_path, operator, value, sequence)
VALUES (
  'your-tenant-id-here',
  'rule-id-from-above',  -- Use the ID from previous query
  'category',
  'equals',
  ARRAY['Critical']::text[],
  1
);

-- Insert an action
INSERT INTO actions (tenant_id, rule_id, action_type, action_params, step_order)
VALUES (
  'your-tenant-id-here',
  'rule-id-from-above',
  'set_priority',
  '{"priority": "critical"}'::jsonb,
  1
);
```

2. **Create a test ticket and trigger rule:**
```sql
-- Create test ticket
INSERT INTO tickets (
  tenant_id,
  title,
  description,
  category,
  priority,
  type,
  location,
  status,
  complainant_id
)
VALUES (
  'your-tenant-id-here',
  'Test Ticket for Rule Engine',
  'This is a test ticket to verify rule engine',
  'Critical',
  'low',  -- Initial priority, should be changed by rule
  'Repair',
  'Test Location',
  'open',
  'complainant-user-id-here'  -- Replace with actual user ID
)
RETURNING id;
```

3. **Check execution logs:**
```sql
-- View rule execution logs
SELECT 
  rel.rule_name,
  rel.execution_status,
  rel.matched_conditions,
  rel.actions_executed,
  rel.error_message,
  rel.execution_time_ms,
  rel.created_at
FROM rule_execution_logs rel
JOIN rules r ON r.id = rel.rule_id
WHERE rel.ticket_id = 'your-ticket-id-here'
ORDER BY rel.created_at DESC;
```

4. **Verify ticket was updated:**
```sql
-- Check if ticket priority was changed
SELECT id, ticket_number, title, priority, executor_profile_id, due_date
FROM tickets
WHERE id = 'your-ticket-id-here';
```

### Method 2: Test via Browser Console (Frontend)

Open browser console (F12) on your application and run:

```javascript
// Import the services (assuming they're available globally or via window)
import { ruleEngineService } from './services/rule-engine.service';
import { allocationRulesService } from './services/allocation-rules.service';
import { ticketsService } from './services/tickets.service';

// Test 1: Get all rules
const rules = await allocationRulesService.getRules();
console.log('All Rules:', rules);

// Test 2: Get a specific rule with details
const ruleDetails = await allocationRulesService.getRuleById('rule-id-here');
console.log('Rule Details:', ruleDetails);

// Test 3: Create a test ticket and trigger rules
const testTicket = await ticketsService.createTicket({
  title: 'Test Ticket',
  description: 'Testing rule engine',
  category: 'Critical',
  priority: 'low',
  type: 'Repair',
  location: 'Test Location'
});
console.log('Created Ticket:', testTicket);

// Test 4: Manually trigger rule execution
await ticketsService.triggerRuleExecution(testTicket.id, 'on_manual');
console.log('Rule execution triggered');

// Test 5: Check execution logs
const logs = await ruleEngineService.getTicketExecutionLogs(testTicket.id);
console.log('Execution Logs:', logs);
```

### Method 3: Test via Postman/API Client

1. **Get Rules:**
```
GET /rest/v1/rules?tenant_id=eq.your-tenant-id&is_active=eq.true
Headers:
  apikey: your-supabase-anon-key
  Authorization: Bearer your-jwt-token
```

2. **Create a Rule:**
```
POST /rest/v1/rules
Headers:
  apikey: your-supabase-anon-key
  Authorization: Bearer your-jwt-token
  Content-Type: application/json
Body:
{
  "tenant_id": "your-tenant-id",
  "rule_name": "Test Rule",
  "priority_order": 1,
  "trigger_event": "on_create",
  "is_active": true
}
```

3. **Create a Ticket (which triggers rules):**
```
POST /rest/v1/tickets
Headers:
  apikey: your-supabase-anon-key
  Authorization: Bearer your-jwt-token
  Content-Type: application/json
Body:
{
  "title": "Test Ticket",
  "description": "Testing rule engine",
  "category": "Critical",
  "priority": "low",
  "type": "Repair",
  "location": "Test Location",
  "tenant_id": "your-tenant-id"
}
```

4. **Check Execution Logs:**
```
GET /rest/v1/rule_execution_logs?ticket_id=eq.your-ticket-id
Headers:
  apikey: your-supabase-anon-key
  Authorization: Bearer your-jwt-token
```

### Method 4: Create Test Script (Node.js)

Create a test file: `test-rule-engine.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'your-supabase-url';
const supabaseKey = 'your-supabase-service-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRuleEngine() {
  try {
    // 1. Create a test rule
    const { data: rule, error: ruleError } = await supabase
      .from('rules')
      .insert({
        tenant_id: 'your-tenant-id',
        rule_name: 'Test Rule: VIP Priority',
        priority_order: 1,
        trigger_event: 'on_create',
        is_active: true
      })
      .select()
      .single();

    if (ruleError) throw ruleError;
    console.log('✅ Created rule:', rule.id);

    // 2. Add condition
    const { data: condition, error: condError } = await supabase
      .from('conditions')
      .insert({
        tenant_id: 'your-tenant-id',
        rule_id: rule.id,
        field_path: 'complainant.designation.name',
        operator: 'in',
        value: ['CEO', 'Director'],
        sequence: 1
      })
      .select()
      .single();

    if (condError) throw condError;
    console.log('✅ Created condition:', condition.id);

    // 3. Add action
    const { data: action, error: actionError } = await supabase
      .from('actions')
      .insert({
        tenant_id: 'your-tenant-id',
        rule_id: rule.id,
        action_type: 'set_priority',
        action_params: { priority: 'critical' },
        step_order: 1
      })
      .select()
      .single();

    if (actionError) throw actionError;
    console.log('✅ Created action:', action.id);

    // 4. Create test ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        tenant_id: 'your-tenant-id',
        title: 'Test Ticket',
        description: 'Testing rule engine',
        category: 'HVAC',
        priority: 'low',
        type: 'Repair',
        location: 'Test Location',
        complainant_id: 'user-with-vip-designation-id'
      })
      .select()
      .single();

    if (ticketError) throw ticketError;
    console.log('✅ Created ticket:', ticket.id);

    // 5. Wait a moment for rule processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Check execution logs
    const { data: logs, error: logsError } = await supabase
      .from('rule_execution_logs')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false });

    if (logsError) throw logsError;
    console.log('✅ Execution logs:', logs);

    // 7. Check updated ticket
    const { data: updatedTicket, error: updateError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticket.id)
      .single();

    if (updateError) throw updateError;
    console.log('✅ Updated ticket priority:', updatedTicket.priority);
    console.log('   Expected: critical, Got:', updatedTicket.priority);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRuleEngine();
```

Run with: `node test-rule-engine.js`

## Debugging Checklist

1. **Check if rules are active:**
   ```sql
   SELECT id, rule_name, is_active, trigger_event, priority_order 
   FROM rules 
   WHERE tenant_id = 'your-tenant-id' 
   ORDER BY priority_order;
   ```

2. **Check rule conditions:**
   ```sql
   SELECT * FROM conditions 
   WHERE rule_id = 'your-rule-id' 
   ORDER BY sequence;
   ```

3. **Check rule actions:**
   ```sql
   SELECT * FROM actions 
   WHERE rule_id = 'your-rule-id' 
   ORDER BY step_order;
   ```

4. **Check execution logs:**
   ```sql
   SELECT * FROM rule_execution_logs 
   WHERE rule_id = 'your-rule-id' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

5. **Verify ticket data structure:**
   ```sql
   SELECT 
     t.*,
     u.full_name as complainant_name,
     u.designation_id,
     d.name as designation_name
   FROM tickets t
   LEFT JOIN users u ON u.id = t.complainant_id
   LEFT JOIN designations d ON d.id = u.designation_id
   WHERE t.id = 'your-ticket-id';
   ```

## Common Issues

1. **Rule not executing:**
   - Check `is_active = true`
   - Check `trigger_event` matches the event type
   - Check `tenant_id` matches ticket's tenant_id

2. **Condition not matching:**
   - Verify field_path is correct (e.g., 'complainant.designation.name')
   - Check operator and value format
   - Verify ticket has the required data (designation, etc.)

3. **Action not executing:**
   - Check action_params JSON format
   - Verify action_type enum value
   - Check execution logs for errors

4. **No logs:**
   - Rule might be skipping (check conditions)
   - Check max_executions limit
   - Verify RLS policies allow log creation

