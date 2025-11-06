import { supabase } from '../lib/supabase';
import type {
  Rule,
  RuleWithDetails,
  RuleCondition,
  RuleAction,
  RuleTriggerEvent,
  Ticket,
  TicketWithRelations,
  ConditionOperator,
  ActionType,
  ExecutionStatus,
  ExecutorAssignmentStrategy,
  AssignExecutorActionConfig,
  SetPriorityActionConfig,
  SetDueDateActionConfig,
  EscalateActionConfig,
  NotifyActionConfig,
  SetStatusActionConfig,
} from '../types/database';
import { allocationRulesService } from './allocation-rules.service';
import { ticketsService } from './tickets.service';
import { executorsService } from './executors.service';
import { authService } from './auth.service';

/**
 * Rule Engine Service
 * Handles condition evaluation, action execution, and rule processing for tickets
 */
export const ruleEngineService = {
  /**
   * Process a ticket through applicable rules
   */
  async processTicket(ticketId: string, triggerEvent: RuleTriggerEvent): Promise<void> {
    const startTime = Date.now();

    // Get ticket with relations
    const ticket = await ticketsService.getTicketById(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    // Get tenant_id from ticket
    const tenantId = ticket.tenant_id || null;

    // Get applicable rules for this tenant and trigger event
    const rules = await allocationRulesService.getActiveRules(tenantId, triggerEvent);

    // Sort by priority_order (lower = higher priority)
    const sortedRules = rules.sort((a, b) => a.priority_order - b.priority_order);

    // Process each rule
    for (const rule of sortedRules) {
      try {
        // Get full rule details with conditions and actions
        const ruleDetails = await allocationRulesService.getRuleById(rule.id);
        if (!ruleDetails) continue;

        // Check if rule has reached max executions for this ticket
        if (rule.max_executions) {
          const executionCount = await this.getRuleExecutionCount(rule.id, ticketId);
          if (executionCount >= rule.max_executions) {
            await this.logRuleExecution(rule.id, ticketId, 'skipped', {
              reason: 'Max executions reached',
            });
            continue;
          }
        }

        // Evaluate conditions
        const conditionResult = await this.evaluateRule(ruleDetails, ticket);

        if (conditionResult.matched) {
          // Execute actions
          await this.executeActions(ruleDetails, ticket, conditionResult.matchedConditions);

          // Log successful execution
          const executionTime = Date.now() - startTime;
          await this.logRuleExecution(
            rule.id,
            ticketId,
            'success',
            {
              matchedConditions: conditionResult.matchedConditions,
            },
            executionTime
          );

          // Stop processing if rule has stop_on_match enabled
          if (rule.stop_on_match) {
            break;
          }
        } else {
          // Log skipped execution
          await this.logRuleExecution(rule.id, ticketId, 'skipped', {
            reason: 'Conditions not matched',
          });
        }
      } catch (error) {
        // Log failed execution
        const executionTime = Date.now() - startTime;
        await this.logRuleExecution(
          rule.id,
          ticketId,
          'failed',
          {},
          executionTime,
          error instanceof Error ? error.message : 'Unknown error'
        );
        console.error(`Error processing rule ${rule.id} for ticket ${ticketId}:`, error);
      }
    }
  },

  /**
   * Evaluate if a rule matches a ticket based on its conditions
   */
  async evaluateRule(
    rule: RuleWithDetails,
    ticket: Ticket | TicketWithRelations
  ): Promise<{ matched: boolean; matchedConditions: Record<string, any> }> {
    if (!rule.conditions || rule.conditions.length === 0) {
      // No conditions means rule always matches
      return { matched: true, matchedConditions: {} };
    }

    const matchedConditions: Record<string, any> = {};
    let previousResult: boolean | null = null;
    let currentLogicalOp: 'AND' | 'OR' | null = null;

    // Group conditions by group_id for AND/OR logic
    const conditionsByGroup = this.groupConditions(rule.conditions);

    // Evaluate each group
    for (const [groupKey, conditions] of Object.entries(conditionsByGroup)) {
      let groupResult: boolean | null = null;

      for (const condition of conditions) {
        const conditionResult = await this.evaluateCondition(condition, ticket);
        matchedConditions[condition.id] = {
          condition,
          result: conditionResult,
        };

        if (groupResult === null) {
          groupResult = conditionResult;
        } else {
          // Apply logical operator
          const logicalOp = condition.logical_operator || 'AND';
          if (logicalOp === 'AND') {
            groupResult = groupResult && conditionResult;
          } else {
            groupResult = groupResult || conditionResult;
          }
        }
      }

      // Combine group results
      if (previousResult === null) {
        previousResult = groupResult || false;
      } else {
        // Between groups, default to AND logic
        previousResult = previousResult && (groupResult || false);
      }
    }

    return {
      matched: previousResult || false,
      matchedConditions,
    };
  },

  /**
   * Group conditions by group_id for AND/OR logic
   */
  groupConditions(conditions: RuleCondition[]): Record<string, RuleCondition[]> {
    const groups: Record<string, RuleCondition[]> = {};
    const ungrouped: RuleCondition[] = [];

    for (const condition of conditions) {
      if (condition.group_id) {
        if (!groups[condition.group_id]) {
          groups[condition.group_id] = [];
        }
        groups[condition.group_id].push(condition);
      } else {
        ungrouped.push(condition);
      }
    }

    // Add ungrouped conditions as individual groups
    for (const condition of ungrouped) {
      groups[condition.id] = [condition];
    }

    return groups;
  },

  /**
   * Evaluate a single condition against a ticket
   */
  async evaluateCondition(condition: RuleCondition, ticket: Ticket | TicketWithRelations): Promise<boolean> {
    // Resolve field path (e.g., 'complainant.department')
    const fieldValue = this.resolveFieldPath(condition.field_path, ticket);

    // Evaluate based on operator
    return this.evaluateOperator(condition.operator, fieldValue, condition.value);
  },

  /**
   * Resolve a field path to a value from the ticket
   * Supports nested paths like:
   * - 'complainant.department'
   * - 'complainant.designation.name'
   * - 'complainant.designation_id'
   * - 'complainant.email'
   * - 'priority'
   * - 'category'
   */
  resolveFieldPath(fieldPath: string, ticket: Ticket | TicketWithRelations): any {
    const parts = fieldPath.split('.');
    let value: any = ticket;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      
      // Handle array access (e.g., value[0])
      if (part.includes('[') && part.includes(']')) {
        const index = parseInt(part.match(/\[(\d+)\]/)?.[1] || '0');
        const arrayKey = part.split('[')[0];
        value = value[arrayKey]?.[index];
      } else {
        value = value[part];
      }
    }

    return value;
  },

  /**
   * Evaluate an operator on a field value
   */
  evaluateOperator(operator: ConditionOperator, fieldValue: any, conditionValues: string[]): boolean {
    if (operator === 'is_null') {
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    }

    if (operator === 'is_not_null') {
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    }

    // For null checks, if field is null and operator is not null-related, return false
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    const fieldStr = String(fieldValue).toLowerCase();
    const conditionStrs = conditionValues.map((v) => String(v).toLowerCase());

    switch (operator) {
      case 'equals':
        return conditionStrs.includes(fieldStr);

      case 'not_equals':
        return !conditionStrs.includes(fieldStr);

      case 'contains':
        return conditionStrs.some((cv) => fieldStr.includes(cv));

      case 'not_contains':
        return !conditionStrs.some((cv) => fieldStr.includes(cv));

      case 'in':
        return conditionStrs.includes(fieldStr);

      case 'not_in':
        return !conditionStrs.includes(fieldStr);

      case 'starts_with':
        return conditionStrs.some((cv) => fieldStr.startsWith(cv));

      case 'ends_with':
        return conditionStrs.some((cv) => fieldStr.endsWith(cv));

      case 'greater_than':
        return conditionValues.some((cv) => {
          const numValue = Number(fieldValue);
          const numCondition = Number(cv);
          return !isNaN(numValue) && !isNaN(numCondition) && numValue > numCondition;
        });

      case 'less_than':
        return conditionValues.some((cv) => {
          const numValue = Number(fieldValue);
          const numCondition = Number(cv);
          return !isNaN(numValue) && !isNaN(numCondition) && numValue < numCondition;
        });

      case 'greater_than_or_equal':
        return conditionValues.some((cv) => {
          const numValue = Number(fieldValue);
          const numCondition = Number(cv);
          return !isNaN(numValue) && !isNaN(numCondition) && numValue >= numCondition;
        });

      case 'less_than_or_equal':
        return conditionValues.some((cv) => {
          const numValue = Number(fieldValue);
          const numCondition = Number(cv);
          return !isNaN(numValue) && !isNaN(numCondition) && numValue <= numCondition;
        });

      case 'between':
        if (conditionValues.length >= 2) {
          const numValue = Number(fieldValue);
          const numMin = Number(conditionValues[0]);
          const numMax = Number(conditionValues[1]);
          return (
            !isNaN(numValue) &&
            !isNaN(numMin) &&
            !isNaN(numMax) &&
            numValue >= numMin &&
            numValue <= numMax
          );
        }
        return false;

      case 'regex':
        try {
          return conditionValues.some((cv) => {
            const regex = new RegExp(cv, 'i');
            return regex.test(fieldStr);
          });
        } catch (e) {
          console.error('Invalid regex pattern:', conditionValues);
          return false;
        }

      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  },

  /**
   * Execute actions for a matched rule
   */
  async executeActions(
    rule: RuleWithDetails,
    ticket: Ticket | TicketWithRelations,
    matchedConditions: Record<string, any>
  ): Promise<void> {
    if (!rule.actions || rule.actions.length === 0) {
      return;
    }

    // Sort actions by step_order
    const sortedActions = [...rule.actions].sort((a, b) => a.step_order - b.step_order);

    for (const action of sortedActions) {
      try {
        // Check optional action condition
        if (action.action_condition) {
          // Simple condition check - can be enhanced later
          const conditionMet = await this.evaluateActionCondition(action.action_condition, ticket);
          if (!conditionMet) {
            continue;
          }
        }

        // Execute action based on type
        await this.executeAction(action, ticket, matchedConditions);
      } catch (error) {
        console.error(`Error executing action ${action.id}:`, error);
        throw error;
      }
    }
  },

  /**
   * Execute a single action
   */
  async executeAction(
    action: RuleAction,
    ticket: Ticket | TicketWithRelations,
    matchedConditions: Record<string, any>
  ): Promise<void> {
    const config = action.action_params;

    switch (action.action_type) {
      case 'assign_executor':
        await this.assignExecutor(action, ticket, config as AssignExecutorActionConfig);
        break;

      case 'set_priority':
        await this.setPriority(ticket.id, config as SetPriorityActionConfig);
        break;

      case 'set_due_date':
        await this.setDueDate(ticket.id, config as SetDueDateActionConfig);
        break;

      case 'escalate':
        await this.escalate(ticket.id, config as EscalateActionConfig);
        break;

      case 'notify':
        await this.notify(ticket.id, config as NotifyActionConfig);
        break;

      case 'set_status':
        await this.setStatus(ticket.id, config as SetStatusActionConfig);
        break;

      default:
        console.warn(`Unknown action type: ${action.action_type}`);
    }
  },

  /**
   * Assign executor to ticket
   */
  async assignExecutor(
    action: RuleAction,
    ticket: Ticket | TicketWithRelations,
    config: AssignExecutorActionConfig
  ): Promise<void> {
    let executorId: string | null = null;

    switch (config.strategy) {
      case 'specific_executor':
        if (config.executor_id) {
          executorId = config.executor_id;
        }
        break;

      case 'skill_match':
        // Find executor with matching skills
        const ticketTenantId = ticket.tenant_id || null;
        const executors = await executorsService.getExecutors(ticketTenantId);
        const matchingExecutors = executors.filter((exec) => {
          if (!exec.user?.is_active) return false;
          if (exec.availability_status !== 'available') return false;
          if (exec.assigned_tickets_count >= (exec.max_concurrent_tickets || 10)) return false;

          // Check if executor has required skills
          if (config.skill_ids && config.skill_ids.length > 0) {
            // This would need to check executor_skills junction table
            // For now, simplified check
            return true;
          }
          return true;
        });

        if (matchingExecutors.length > 0) {
          // Select executor with lowest load
          const selected = matchingExecutors.sort(
            (a, b) => a.assigned_tickets_count - b.assigned_tickets_count
          )[0];
          executorId = selected.id;
        }
        break;

      case 'load_balance':
        // Find executor with lowest load
        const allExecutors = await executorsService.getExecutors(ticket.tenant_id || null);
        const availableExecutors = allExecutors.filter((exec) => {
          if (!exec.user?.is_active) return false;
          if (exec.availability_status !== 'available') return false;
          return exec.assigned_tickets_count < (exec.max_concurrent_tickets || 10);
        });

        if (availableExecutors.length > 0) {
          const selected = availableExecutors.sort(
            (a, b) => a.assigned_tickets_count - b.assigned_tickets_count
          )[0];
          executorId = selected.id;
        }
        break;

      case 'round_robin':
        // Simple round-robin (can be enhanced with state tracking)
        const roundRobinExecutors = await executorsService.getExecutors(ticket.tenant_id || null);
        const rrAvailable = roundRobinExecutors.filter((exec) => {
          if (!exec.user?.is_active) return false;
          if (exec.availability_status !== 'available') return false;
          return exec.assigned_tickets_count < (exec.max_concurrent_tickets || 10);
        });

        if (rrAvailable.length > 0) {
          // Select first available (can be enhanced with round-robin state)
          executorId = rrAvailable[0].id;
        }
        break;
    }

    if (executorId) {
      await ticketsService.assignExecutor(ticket.id, executorId);
    }
  },

  /**
   * Set ticket priority
   */
  async setPriority(ticketId: string, config: SetPriorityActionConfig): Promise<void> {
    await ticketsService.updateTicket(ticketId, { priority: config.priority });
  },

  /**
   * Set ticket due date
   */
  async setDueDate(ticketId: string, config: SetDueDateActionConfig): Promise<void> {
    let dueDate: Date;

    const now = new Date();

    switch (config.calculation) {
      case 'hours_from_now':
        dueDate = new Date(now.getTime() + config.value * 60 * 60 * 1000);
        break;

      case 'days_from_now':
        dueDate = new Date(now.getTime() + config.value * 24 * 60 * 60 * 1000);
        break;

      case 'business_hours_from_now':
        // Simple implementation - can be enhanced with business hours logic
        dueDate = new Date(now.getTime() + config.value * 60 * 60 * 1000);
        break;

      default:
        dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default 1 day
    }

    await ticketsService.updateTicket(ticketId, {
      due_date: dueDate.toISOString(),
    });
  },

  /**
   * Escalate ticket
   */
  async escalate(ticketId: string, config: EscalateActionConfig): Promise<void> {
    // Get current ticket
    const ticket = await ticketsService.getTicketById(ticketId);
    if (!ticket) return;

    // Increase priority if configured
    if (config.priority_level) {
      const priorities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
      const currentIndex = priorities.indexOf(ticket.priority);
      const newIndex = Math.min(currentIndex + config.priority_level, priorities.length - 1);
      await ticketsService.updateTicket(ticketId, { priority: priorities[newIndex] });
    }

    // TODO: Implement escalation notification to manager/admin
    console.log(`Escalating ticket ${ticketId} to ${config.escalate_to}`);
  },

  /**
   * Notify users
   */
  async notify(ticketId: string, config: NotifyActionConfig): Promise<void> {
    // TODO: Implement notification system
    console.log(`Notifying recipients for ticket ${ticketId}:`, config.recipients);
  },

  /**
   * Set ticket status
   */
  async setStatus(ticketId: string, config: SetStatusActionConfig): Promise<void> {
    await ticketsService.updateStatus(ticketId, config.status);
  },

  /**
   * Evaluate action condition (simplified - can be enhanced)
   */
  async evaluateActionCondition(condition: string, ticket: Ticket | TicketWithRelations): Promise<boolean> {
    // Simple implementation - can be enhanced with full condition evaluation
    // For now, just return true
    return true;
  },

  /**
   * Get rule execution count for a ticket
   */
  async getRuleExecutionCount(ruleId: string, ticketId: string): Promise<number> {
    const { count, error } = await supabase
      .from('rule_execution_logs')
      .select('*', { count: 'exact', head: true })
      .eq('rule_id', ruleId)
      .eq('ticket_id', ticketId)
      .eq('execution_status', 'success');

    if (error) {
      console.error('Error getting execution count:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Log rule execution
   */
  async logRuleExecution(
    ruleId: string,
    ticketId: string,
    status: ExecutionStatus,
    data: Record<string, any> = {},
    executionTimeMs?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase.from('rule_execution_logs').insert({
        rule_id: ruleId,
        ticket_id: ticketId,
        execution_status: status,
        matched_conditions: data.matchedConditions || null,
        actions_executed: data.actionsExecuted || null,
        error_message: errorMessage || null,
        execution_time_ms: executionTimeMs || null,
      });
    } catch (error) {
      console.error('Error logging rule execution:', error);
      // Don't throw - logging failures shouldn't break rule execution
    }
  },

  /**
   * Get execution logs for a rule
   */
  async getExecutionLogs(ruleId: string, limit = 100): Promise<any[]> {
    const { data, error } = await supabase
      .from('rule_execution_logs')
      .select('*')
      .eq('rule_id', ruleId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get execution logs for a ticket
   */
  async getTicketExecutionLogs(ticketId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('rule_execution_logs')
      .select('*, rule:rules(rule_name)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

