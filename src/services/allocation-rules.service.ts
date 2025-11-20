import { supabase } from '../lib/supabase';
import type {
  Rule,
  RuleWithDetails,
  RuleCondition,
  RuleAction,
  CreateRuleInput,
  UpdateRuleInput,
  CreateRuleConditionInput,
  CreateRuleActionInput,
  RuleTriggerEvent,
} from '../types/database';
import { authService } from './auth.service';

export const allocationRulesService = {
  /**
   * Get all rules for a tenant
   */
  async getRules(tenantId?: string | null): Promise<Rule[]> {
    let query = supabase
      .from('rules')
      .select('*')
      .order('priority_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Filter by tenant if provided
    if (tenantId !== undefined) {
      if (tenantId === null) {
        // Super admin - show all rules
        // No filter needed
      } else {
        query = query.eq('tenant_id', tenantId);
      }
    } else {
      // For tenant admins, automatically filter by their tenant
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
        query = query.eq('tenant_id', currentUser.tenant_id);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get active rules for a tenant and trigger event
   */
  async getActiveRules(tenantId?: string | null, triggerEvent?: RuleTriggerEvent): Promise<Rule[]> {
    let query = supabase
      .from('rules')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true });

    if (triggerEvent) {
      query = query.eq('trigger_event', triggerEvent);
    }

    // Filter by tenant if provided
    if (tenantId !== undefined) {
      if (tenantId === null) {
        // Super admin - show all rules
        // No filter needed
      } else {
        query = query.eq('tenant_id', tenantId);
      }
    } else {
      // For tenant admins, automatically filter by their tenant
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
        query = query.eq('tenant_id', currentUser.tenant_id);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a rule by ID with conditions and actions
   */
  async getRuleById(id: string): Promise<RuleWithDetails | null> {
    const { data: rule, error: ruleError } = await supabase
      .from('rules')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (ruleError) throw ruleError;
    if (!rule) return null;

    // Get conditions
    const { data: conditions, error: conditionsError } = await supabase
      .from('conditions')
      .select('*')
      .eq('rule_id', id)
      .order('sequence', { ascending: true });

    if (conditionsError) throw conditionsError;

    // Get actions
    const { data: actions, error: actionsError } = await supabase
      .from('actions')
      .select('*')
      .eq('rule_id', id)
      .order('step_order', { ascending: true });

    if (actionsError) throw actionsError;

    return {
      ...rule,
      conditions: conditions || [],
      actions: actions || [],
    };
  },

  /**
   * Create a new rule with conditions and actions
   */
  async createRule(input: CreateRuleInput): Promise<RuleWithDetails> {
    // Get current user's tenant_id if not provided
    let ruleTenantId = input.tenant_id;
    if (!ruleTenantId) {
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.role === 'tenant_admin' && currentUser.tenant_id) {
        ruleTenantId = currentUser.tenant_id;
      } else if (currentUser?.role !== 'admin') {
        throw new Error('Tenant ID is required for non-admin users');
      }
    }

    // Create the rule
    const { data: rule, error: ruleError } = await supabase
      .from('rules')
      .insert({
        tenant_id: ruleTenantId,
        rule_name: input.rule_name,
        rule_type: input.rule_type,
        priority_order: input.priority_order,
        trigger_event: input.trigger_event,
        is_active: input.is_active ?? true,
        stop_on_match: input.stop_on_match ?? false,
        max_executions: input.max_executions,
      })
      .select()
      .single();

    if (ruleError) throw ruleError;
    if (!rule) throw new Error('Failed to create rule');

    // Create conditions if provided
    const conditions: RuleCondition[] = [];
    if (input.conditions && input.conditions.length > 0) {
      const conditionsToInsert = input.conditions.map((cond) => ({
        tenant_id: ruleTenantId!,
        rule_id: rule.id,
        field_path: cond.field_path,
        operator: cond.operator,
        value: cond.value,
        sequence: cond.sequence,
        group_id: cond.group_id,
        logical_operator: cond.logical_operator,
      }));

      const { data: createdConditions, error: conditionsError } = await supabase
        .from('conditions')
        .insert(conditionsToInsert)
        .select();

      if (conditionsError) throw conditionsError;
      if (createdConditions) conditions.push(...createdConditions);
    }

    // Create actions if provided
    const actions: RuleAction[] = [];
    if (input.actions && input.actions.length > 0) {
      const actionsToInsert = input.actions.map((action) => ({
        tenant_id: ruleTenantId!,
        rule_id: rule.id,
        action_type: action.action_type,
        action_params: action.action_params,
        step_order: action.step_order,
        trigger_after_minutes: action.trigger_after_minutes,
        action_condition: action.action_condition,
      }));

      const { data: createdActions, error: actionsError } = await supabase
        .from('actions')
        .insert(actionsToInsert)
        .select();

      if (actionsError) throw actionsError;
      if (createdActions) actions.push(...createdActions);
    }

    return {
      ...rule,
      conditions,
      actions,
    };
  },

  /**
   * Update a rule
   */
  async updateRule(id: string, updates: UpdateRuleInput): Promise<Rule> {
    const { data, error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Rule not found');
    return data;
  },

  /**
   * Delete a rule (cascades to conditions and actions)
   */
  async deleteRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Toggle rule active status
   */
  async toggleRuleActive(id: string, isActive: boolean): Promise<Rule> {
    return this.updateRule(id, { is_active: isActive });
  },

  /**
   * Update rule priority order
   */
  async updatePriorityOrder(ruleIds: string[]): Promise<void> {
    // Update priority_order for each rule based on its position in the array
    const updates = ruleIds.map((ruleId, index) => ({
      id: ruleId,
      priority_order: index + 1,
    }));

    for (const update of updates) {
      await this.updateRule(update.id, { priority_order: update.priority_order });
    }
  },

  // ============================================================================
  // Condition Management
  // ============================================================================

  /**
   * Get conditions for a rule
   */
  async getConditions(ruleId: string): Promise<RuleCondition[]> {
    const { data, error } = await supabase
      .from('conditions')
      .select('*')
      .eq('rule_id', ruleId)
      .order('sequence', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create a condition
   */
  async createCondition(input: CreateRuleConditionInput, tenantId?: string | null): Promise<RuleCondition> {
    // Determine tenant ID
    let effectiveTenantId = tenantId;

    if (!effectiveTenantId) {
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.tenant_id) {
        effectiveTenantId = currentUser.tenant_id;
      } else if (currentUser?.role !== 'admin') {
        throw new Error('Tenant ID is required for non-admin users');
      }
    }

    if (!effectiveTenantId) {
      throw new Error('Please select a tenant before creating conditions.');
    }

    const { data, error } = await supabase
      .from('conditions')
      .insert({
        tenant_id: effectiveTenantId,
        rule_id: input.rule_id,
        field_path: input.field_path,
        operator: input.operator,
        value: input.value,
        sequence: input.sequence,
        group_id: input.group_id,
        logical_operator: input.logical_operator,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create condition');
    return data;
  },

  /**
   * Update a condition
   */
  async updateCondition(id: string, updates: Partial<Omit<RuleCondition, 'id' | 'tenant_id' | 'rule_id'>>): Promise<RuleCondition> {
    const { data, error } = await supabase
      .from('conditions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Condition not found');
    return data;
  },

  /**
   * Delete a condition
   */
  async deleteCondition(id: string): Promise<void> {
    const { error } = await supabase
      .from('conditions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete all conditions for a rule
   */
  async deleteAllConditions(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('conditions')
      .delete()
      .eq('rule_id', ruleId);

    if (error) throw error;
  },

  // ============================================================================
  // Action Management
  // ============================================================================

  /**
   * Get actions for a rule
   */
  async getActions(ruleId: string): Promise<RuleAction[]> {
    const { data, error } = await supabase
      .from('actions')
      .select('*')
      .eq('rule_id', ruleId)
      .order('step_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Create an action
   */
  async createAction(input: CreateRuleActionInput, tenantId?: string | null): Promise<RuleAction> {
    // Determine tenant ID
    let effectiveTenantId = tenantId;

    if (!effectiveTenantId) {
      const currentUser = await authService.getCurrentUser();
      if (currentUser?.tenant_id) {
        effectiveTenantId = currentUser.tenant_id;
      } else if (currentUser?.role !== 'admin') {
        throw new Error('Tenant ID is required for non-admin users');
      }
    }

    if (!effectiveTenantId) {
      throw new Error('Please select a tenant before creating actions.');
    }

    const { data, error } = await supabase
      .from('actions')
      .insert({
        tenant_id: effectiveTenantId,
        rule_id: input.rule_id,
        action_type: input.action_type,
        action_params: input.action_params,
        step_order: input.step_order,
        trigger_after_minutes: input.trigger_after_minutes,
        action_condition: input.action_condition,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create action');
    return data;
  },

  /**
   * Update an action
   */
  async updateAction(id: string, updates: Partial<Omit<RuleAction, 'id' | 'tenant_id' | 'rule_id'>>): Promise<RuleAction> {
    const { data, error } = await supabase
      .from('actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Action not found');
    return data;
  },

  /**
   * Delete an action
   */
  async deleteAction(id: string): Promise<void> {
    const { error } = await supabase
      .from('actions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete all actions for a rule
   */
  async deleteAllActions(ruleId: string): Promise<void> {
    const { error } = await supabase
      .from('actions')
      .delete()
      .eq('rule_id', ruleId);

    if (error) throw error;
  },
};

