/**
 * Quick Test Script for Rule Engine
 * Run this in browser console after importing the services
 * Or use this as a reference for manual testing
 */

// ============================================================================
// TEST 1: Check if rules service is working
// ============================================================================
async function testGetRules() {
  try {
    const { allocationRulesService } = await import('./src/services/allocation-rules.service.ts');
    const rules = await allocationRulesService.getRules();
    console.log('✅ Rules loaded:', rules);
    return rules;
  } catch (error) {
    console.error('❌ Error getting rules:', error);
  }
}

// ============================================================================
// TEST 2: Get rule details with conditions and actions
// ============================================================================
async function testGetRuleDetails(ruleId) {
  try {
    const { allocationRulesService } = await import('./src/services/allocation-rules.service.ts');
    const ruleDetails = await allocationRulesService.getRuleById(ruleId);
    console.log('✅ Rule details:', ruleDetails);
    console.log('   Conditions:', ruleDetails.conditions);
    console.log('   Actions:', ruleDetails.actions);
    return ruleDetails;
  } catch (error) {
    console.error('❌ Error getting rule details:', error);
  }
}

// ============================================================================
// TEST 3: Create a test ticket and trigger rules
// ============================================================================
async function testCreateTicketAndTriggerRules() {
  try {
    const { ticketsService } = await import('./src/services/tickets.service.ts');
    
    // Create a test ticket
    const ticket = await ticketsService.createTicket({
      title: 'Test Ticket - Rule Engine',
      description: 'This ticket is created to test rule engine functionality',
      category: 'Critical',
      priority: 'low',  // Initial priority, should be changed by rule
      type: 'Repair',
      location: 'Test Location',
      complainant_name: 'Test User',
      complainant_email: 'test@example.com'
    });
    
    console.log('✅ Ticket created:', ticket);
    console.log('   Ticket ID:', ticket.id);
    console.log('   Initial Priority:', ticket.priority);
    
    // Wait a moment for rule processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check execution logs
    const { ruleEngineService } = await import('./src/services/rule-engine.service.ts');
    const logs = await ruleEngineService.getTicketExecutionLogs(ticket.id);
    console.log('✅ Execution logs:', logs);
    
    // Check updated ticket
    const updatedTicket = await ticketsService.getTicketById(ticket.id);
    console.log('✅ Updated ticket:', updatedTicket);
    console.log('   Final Priority:', updatedTicket?.priority);
    
    return { ticket, logs, updatedTicket };
  } catch (error) {
    console.error('❌ Error testing ticket creation:', error);
  }
}

// ============================================================================
// TEST 4: Manually trigger rule execution
// ============================================================================
async function testManualRuleExecution(ticketId) {
  try {
    const { ticketsService } = await import('./src/services/tickets.service.ts');
    await ticketsService.triggerRuleExecution(ticketId, 'on_manual');
    console.log('✅ Rule execution triggered for ticket:', ticketId);
    
    // Check logs
    const { ruleEngineService } = await import('./src/services/rule-engine.service.ts');
    const logs = await ruleEngineService.getTicketExecutionLogs(ticketId);
    console.log('✅ Execution logs:', logs);
  } catch (error) {
    console.error('❌ Error triggering rule execution:', error);
  }
}

// ============================================================================
// TEST 5: Test condition evaluation directly
// ============================================================================
async function testConditionEvaluation(ticketId, ruleId) {
  try {
    const { ruleEngineService } = await import('./src/services/rule-engine.service.ts');
    const { allocationRulesService } = await import('./src/services/allocation-rules.service.ts');
    const { ticketsService } = await import('./src/services/tickets.service.ts');
    
    // Get ticket
    const ticket = await ticketsService.getTicketById(ticketId);
    if (!ticket) {
      console.error('❌ Ticket not found');
      return;
    }
    
    // Get rule
    const rule = await allocationRulesService.getRuleById(ruleId);
    if (!rule) {
      console.error('❌ Rule not found');
      return;
    }
    
    // Evaluate rule
    const result = await ruleEngineService.evaluateRule(rule, ticket);
    console.log('✅ Rule evaluation result:', result);
    console.log('   Matched:', result.matched);
    console.log('   Matched Conditions:', result.matchedConditions);
    
    return result;
  } catch (error) {
    console.error('❌ Error evaluating condition:', error);
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Quick test
// testGetRules();

// Example 2: Test with specific rule
// testGetRuleDetails('rule-id-here');

// Example 3: Full test flow
// testCreateTicketAndTriggerRules();

// Example 4: Test manual execution
// testManualRuleExecution('ticket-id-here');

// Example 5: Test condition evaluation
// testConditionEvaluation('ticket-id-here', 'rule-id-here');

