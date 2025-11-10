/**
 * Supabase Edge Function: create-ticket
 *
 * This function proxies ticket creation so automation flows can use
 * the same rule-engine path as the frontend.
 *
 * Expected request body:
 * {
 *   "issue": "Leaking tap reported...",
 *   "location": "2nd floor bathroom",
 *   "category": "Plumbing",
 *   "priority": "medium",
 *   "tenantId": "uuid",
 *   "complainantId": "uuid",
 *   "type": "Maintenance",
 *   "building": "Tower A",
 *   "floor": "2",
 *   "room": "201"
 * }
 *
 * The function uses the Supabase service role key to invoke the existing
 * ticket creation RPC (create_ticket_from_automation) and then executes
 * the rule engine in the Edge context so allocation, priority, and SLA
 * rules run just like the web app flow.
 *
 * Response: JSON { success: boolean, ticket_id?, ticket_number?, error? }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';

interface CreateTicketRequest {
  issue: string;
  location: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tenantId: string;
  complainantId?: string;
  chatId?: string;
  type?: string;
  building?: string;
  floor?: string;
  room?: string;
}

type RuleTriggerEvent = 'on_create' | 'on_update' | 'on_manual' | 'on_status_change';
type RuleType = 'priority' | 'sla' | 'allocation';
type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'between'
  | 'is_null'
  | 'is_not_null'
  | 'regex'
  | 'starts_with'
  | 'ends_with';
type ActionType =
  | 'assign_executor'
  | 'set_priority'
  | 'set_due_date'
  | 'escalate'
  | 'notify'
  | 'set_status';

interface RpcResponse {
  success: boolean;
  ticket_id?: string;
  ticket_number?: string;
  error?: string;
}

interface TicketRecord {
  id: string;
  tenant_id: string | null;
  ticket_number?: string | null;
  title?: string | null;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  type: string;
  location: string;
  due_date?: string | null;
  sla_due_date?: string | null;
  complainant_id?: string | null;
  executor_profile_id?: string | null;
  executor_id?: string | null;
  created_at?: string;
  updated_at?: string;
  complainant?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  [key: string]: unknown;
}

interface RuleCondition {
  id: string;
  rule_id: string;
  field_path: string;
  operator: ConditionOperator;
  value: string[];
  sequence: number;
  group_id?: string | null;
  logical_operator?: 'AND' | 'OR' | null;
}

interface RuleAction {
  id: string;
  rule_id: string;
  action_type: ActionType;
  action_params: Record<string, unknown> | null;
  step_order: number;
  trigger_after_minutes?: number | null;
  action_condition?: string | null;
}

interface RuleRecord {
  id: string;
  tenant_id: string | null;
  rule_name: string;
  rule_type: RuleType;
  priority_order: number;
  trigger_event: RuleTriggerEvent;
  is_active: boolean;
  stop_on_match?: boolean | null;
  max_executions?: number | null;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    const body = (await req.json()) as CreateTicketRequest;

    if (!body.issue || !body.category || !body.priority || !body.location || !body.tenantId || !body.chatId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: issue, category, priority, location, tenantId, chatId',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fall back to rule default priority if invalid input – the RPC will validate again.
    const result = await supabase.rpc('create_ticket_from_automation', {
      p_issue: body.issue,
      p_location: body.location,
      p_category: body.category,
      p_priority: body.priority,
      p_user_name: '',
      p_chat_id: body.chatId,
      p_tenant_id: body.tenantId,
      p_type: body.type ?? 'Maintenance',
      p_building: body.building ?? null,
      p_floor: body.floor ?? null,
      p_room: body.room ?? null,
    });

    if (result.error) {
      console.error('[create-ticket] RPC error', result.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const rpcData = result.data as RpcResponse;
    if (!rpcData?.success || !rpcData.ticket_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: rpcData?.error ?? 'Ticket creation RPC failed.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    // Ensure category_id is aligned with category name
    if (body.category) {
      await upsertTicketCategoryId(supabase, rpcData.ticket_id, body.tenantId, body.category);
    }

    const processResult = await processTicket(supabase, rpcData.ticket_id, 'on_create');

    if (!processResult.success) {
      console.error('[create-ticket] Rule engine failed', processResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: processResult.error || 'Ticket created but rule engine failed',
          ticket_id: rpcData.ticket_id,
          ticket_number: rpcData.ticket_number,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    let detailedTicket: TicketRecord | null = null;
    try {
      detailedTicket = await fetchTicket(supabase, rpcData.ticket_id);
    } catch (fetchError) {
      console.error('[create-ticket] Failed to fetch ticket for response payload', fetchError);
    }

    const formattedTicket = detailedTicket
      ? {
          ...((): Record<string, unknown> => {
            const executorProfile = (detailedTicket as any)?.executor_profile ?? null;
            const executorUser = executorProfile?.user ?? null;
            const complainant = (detailedTicket as any)?.complainant ?? null;
            const slaValue =
              detailedTicket?.due_date ??
              detailedTicket?.sla_due_date ??
              (detailedTicket as any)?.sla_due_date ??
              null;
            return {
              sla: slaValue,
              allocated_to:
                detailedTicket.executor_profile_id ??
                detailedTicket.executor_id ??
                executorProfile?.id ??
                null,
              allocated_to_name: executorUser?.full_name ?? executorProfile?.full_name ?? null,
              allocated_to_chat_id:
                executorUser?.telegram_chat_id ?? executorProfile?.telegram_chat_id ?? null,
              complainant_name: complainant?.full_name ?? null,
              complainant_email: complainant?.email ?? null,
              complainant_phone: complainant?.phone ?? null,
            };
          })(),
          ticket_id: detailedTicket.id,
          ticket_number: detailedTicket.ticket_number ?? rpcData.ticket_number ?? null,
          title: detailedTicket.title ?? null,
          description: detailedTicket.description ?? detailedTicket.title ?? null,
          category: detailedTicket.category,
          status: detailedTicket.status,
          priority: detailedTicket.priority,
          created_at: detailedTicket.created_at ?? null,
          updated_at: detailedTicket.updated_at ?? null,
          complainant_id: detailedTicket.complainant_id ?? null,
          tenant_id: detailedTicket.tenant_id ?? null,
        }
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id: rpcData.ticket_id,
        ticket_number: rpcData.ticket_number,
        ticket: formattedTicket,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error) {
    console.error('[create-ticket] Unexpected error', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});


/* -------------------------------------------------------------------------- */
/*                               Rule Engine Core                             */
/* -------------------------------------------------------------------------- */

interface ProcessResult {
  success: boolean;
  error?: string;
}

async function processTicket(
  supabase: SupabaseClient,
  ticketId: string,
  triggerEvent: RuleTriggerEvent,
): Promise<ProcessResult> {
  try {
    const ticket = await fetchTicket(supabase, ticketId);
    if (!ticket) {
      return { success: false, error: `Ticket ${ticketId} not found` };
    }

    const tenantId = ticket.tenant_id;
    const rules = await fetchActiveRules(supabase, tenantId, triggerEvent);
    if (!rules.length) {
      return { success: true };
    }

    const grouped = groupRulesByType(rules);
    const executionOrder: RuleType[] = ['priority', 'sla', 'allocation'];

    for (const type of executionOrder) {
      const rulesForType = grouped.get(type);
      if (!rulesForType?.length) {
        continue;
      }

      const sorted = rulesForType.sort((a, b) => a.priority_order - b.priority_order);

      for (const rule of sorted) {
        try {
          const matchedInfo = await evaluateRule(rule, ticket);

          if (!matchedInfo.matched) {
            await logRuleExecution(supabase, rule.id, ticketId, 'skipped', {
              reason: 'Conditions not matched',
            });
            continue;
          }

          const actionsExecuted = await executeActions(
            supabase,
            rule,
            ticket,
            matchedInfo.matchedConditions,
          );

          await logRuleExecution(
            supabase,
            rule.id,
            ticketId,
            'success',
            {
              matchedConditions: matchedInfo.matchedConditions,
              actionsExecuted,
            },
          );

          if (rule.stop_on_match) {
            break;
          }
        } catch (ruleError) {
          await logRuleExecution(
            supabase,
            rule.id,
            ticketId,
            'failed',
            {},
            undefined,
            ruleError instanceof Error ? ruleError.message : String(ruleError),
          );
          console.error('[create-ticket] Rule processing error', {
            ruleId: rule.id,
            ticketId,
            error: ruleError,
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[create-ticket] processTicket error', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function upsertTicketCategoryId(
  supabase: SupabaseClient,
  ticketId: string,
  tenantId: string,
  categoryName: string,
): Promise<void> {
  try {
    const { data: category, error } = await supabase
      .from('categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', categoryName)
      .maybeSingle();

    if (error) {
      console.error('[create-ticket] Failed to resolve category_id', error);
      return;
    }

    if (!category?.id) {
      console.warn('[create-ticket] Category not found for ticket', { tenantId, categoryName });
      return;
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update({ category_id: category.id })
      .eq('id', ticketId);

    if (updateError) {
      console.error('[create-ticket] Failed to update ticket category_id', updateError);
    }
  } catch (err) {
    console.error('[create-ticket] Unexpected error updating category_id', err);
  }
}

async function fetchTicket(supabase: SupabaseClient, ticketId: string): Promise<TicketRecord | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(
      `
        *,
        complainant:users!tickets_complainant_id_fkey(*),
        executor_profile:executor_profiles!tickets_executor_profile_id_fkey(*, user:users!executor_profiles_user_id_fkey(*))
      `,
    )
    .eq('id', ticketId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data as TicketRecord | null;
}

async function fetchActiveRules(
  supabase: SupabaseClient,
  tenantId: string | null,
  triggerEvent: RuleTriggerEvent,
): Promise<RuleRecord[]> {
  const { data, error } = await supabase
    .from('rules')
    .select(
      `
        *,
        conditions:conditions(*),
        actions:actions(*)
      `,
    )
    .eq('trigger_event', triggerEvent)
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((rule: RuleRecord) => {
      if (tenantId === null) return true;
      return rule.tenant_id === tenantId;
    })
    .map((rule: RuleRecord) => ({
      ...rule,
      conditions: (rule.conditions || []).sort((a, b) => a.sequence - b.sequence),
      actions: (rule.actions || []).sort((a, b) => a.step_order - b.step_order),
    }));
}

function groupRulesByType(rules: RuleRecord[]): Map<RuleType, RuleRecord[]> {
  const map = new Map<RuleType, RuleRecord[]>();
  for (const rule of rules) {
    const list = map.get(rule.rule_type) ?? [];
    list.push(rule);
    map.set(rule.rule_type, list);
  }
  return map;
}

async function evaluateRule(rule: RuleRecord, ticket: TicketRecord): Promise<{
  matched: boolean;
  matchedConditions: Record<string, { condition: RuleCondition; result: boolean }>;
}> {
  if (!rule.conditions?.length) {
    return { matched: true, matchedConditions: {} };
  }

  const matchedConditions: Record<string, { condition: RuleCondition; result: boolean }> = {};
  let previousResult: boolean | null = null;

  const grouped = groupConditions(rule.conditions);

  for (const [, conditions] of Object.entries(grouped)) {
    let groupResult: boolean | null = null;

    for (const condition of conditions) {
      const result = await evaluateCondition(condition, ticket);
      matchedConditions[condition.id] = { condition, result };

      if (groupResult === null) {
        groupResult = result;
      } else {
        const logicalOp = condition.logical_operator || 'AND';
        groupResult = logicalOp === 'AND' ? groupResult && result : groupResult || result;
      }
    }

    if (previousResult === null) {
      previousResult = groupResult ?? false;
    } else {
      previousResult = previousResult && (groupResult ?? false);
    }
  }

  return { matched: previousResult ?? false, matchedConditions };
}

function groupConditions(conditions: RuleCondition[]): Record<string, RuleCondition[]> {
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

  for (const condition of ungrouped) {
    groups[condition.id] = [condition];
  }

  return groups;
}

async function evaluateCondition(condition: RuleCondition, ticket: TicketRecord): Promise<boolean> {
  const value = resolveFieldPath(condition.field_path, ticket);
  return evaluateOperator(condition.operator, value, condition.value);
}

function resolveFieldPath(fieldPath: string, source: any): unknown {
  const parts = fieldPath.split('.');
  let cursor: unknown = source;

  for (const part of parts) {
    if (cursor == null) return null;
    if (typeof cursor !== 'object') return null;

    if (part.includes('[') && part.includes(']')) {
      const indexMatch = part.match(/\[(\d+)\]/);
      const index = indexMatch ? Number(indexMatch[1]) : 0;
      const key = part.split('[')[0];
      cursor = (cursor as Record<string, unknown>)[key];
      if (Array.isArray(cursor)) {
        cursor = cursor[index];
      } else {
        return null;
      }
    } else {
      cursor = (cursor as Record<string, unknown>)[part];
    }
  }

  return cursor;
}

function evaluateOperator(operator: ConditionOperator, fieldValue: unknown, values: string[]): boolean {
  if (operator === 'is_null') {
    return fieldValue === null || fieldValue === undefined || fieldValue === '';
  }
  if (operator === 'is_not_null') {
    return !(fieldValue === null || fieldValue === undefined || fieldValue === '');
  }
  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }

  const fieldStr = String(fieldValue).toLowerCase();
  const conditionStrs = values.map((v) => String(v).toLowerCase());

  switch (operator) {
    case 'equals':
    case 'in':
      return conditionStrs.includes(fieldStr);
    case 'not_equals':
    case 'not_in':
      return !conditionStrs.includes(fieldStr);
    case 'contains':
      return conditionStrs.some((cv) => fieldStr.includes(cv));
    case 'not_contains':
      return !conditionStrs.some((cv) => fieldStr.includes(cv));
    case 'starts_with':
      return conditionStrs.some((cv) => fieldStr.startsWith(cv));
    case 'ends_with':
      return conditionStrs.some((cv) => fieldStr.endsWith(cv));
    case 'greater_than':
      return comparison(fieldValue, values, (a, b) => a > b);
    case 'less_than':
      return comparison(fieldValue, values, (a, b) => a < b);
    case 'greater_than_or_equal':
      return comparison(fieldValue, values, (a, b) => a >= b);
    case 'less_than_or_equal':
      return comparison(fieldValue, values, (a, b) => a <= b);
    case 'between':
      if (values.length < 2) return false;
      const [min, max] = values;
      const num = Number(fieldValue);
      return !Number.isNaN(num) && num >= Number(min) && num <= Number(max);
    case 'regex':
      return conditionStrs.some((cv) => {
        try {
          const regex = new RegExp(cv, 'i');
          return regex.test(fieldStr);
        } catch {
          return false;
        }
      });
    default:
      return false;
  }
}

function comparison(fieldValue: unknown, values: string[], comparator: (a: number, b: number) => boolean): boolean {
  const fieldNum = Number(fieldValue);
  if (Number.isNaN(fieldNum)) return false;

  return values.some((value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    return comparator(fieldNum, num);
  });
}

async function executeActions(
  supabase: SupabaseClient,
  rule: RuleRecord,
  ticket: TicketRecord,
  matchedConditions: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const actionsExecuted: Record<string, unknown>[] = [];

  for (const action of rule.actions || []) {
    try {
      const params = action.action_params || {};
      switch (action.action_type) {
        case 'assign_executor':
          await executeAssignExecutor(supabase, ticket, params);
          actionsExecuted.push({ action: 'assign_executor', params });
          break;
        case 'set_priority':
          await executeSetPriority(supabase, ticket, params);
          actionsExecuted.push({ action: 'set_priority', params });
          break;
        case 'set_due_date':
          await executeSetDueDate(supabase, ticket, params);
          actionsExecuted.push({ action: 'set_due_date', params });
          break;
        case 'set_status':
          await executeSetStatus(supabase, ticket, params);
          actionsExecuted.push({ action: 'set_status', params });
          break;
        case 'escalate':
        case 'notify':
          console.info('[create-ticket] Action not implemented in edge function', action.action_type);
          actionsExecuted.push({ action: action.action_type, skipped: true });
          break;
        default:
          console.warn('[create-ticket] Unknown action type', action.action_type);
      }
    } catch (error) {
      console.error('[create-ticket] Action execution failed', {
        actionType: action.action_type,
        ruleId: rule.id,
        ticketId: ticket.id,
        error,
      });
      throw error;
    }
  }

  return actionsExecuted;
}

async function executeAssignExecutor(
  supabase: SupabaseClient,
  ticket: TicketRecord,
  params: Record<string, unknown>,
): Promise<void> {
  const strategy = (params.strategy as string) || 'load_balance';

  if (!ticket.tenant_id) return;

  const { data: executorsData, error } = await supabase
    .from('executor_profiles')
    .select(
      `
        id,
        tenant_id,
        user_id,
        category_id,
        skills,
        max_concurrent_tickets,
        availability_status,
        assigned_tickets_count,
        open_tickets_count,
        user:users!executor_profiles_user_id_fkey(id, is_active),
        category:categories!executor_profiles_category_id_fkey(id, name)
      `,
    )
    .eq('tenant_id', ticket.tenant_id);

  if (error) {
    throw error;
  }

  const availableExecutors = (executorsData || []).filter((executor: any) => {
    if (!executor.user?.is_active) return false;
    if (executor.availability_status !== 'available') return false;

    const max = executor.max_concurrent_tickets ?? 10;
    const assigned = executor.assigned_tickets_count ?? 0;
    return assigned < max;
  });

  let filteredExecutors = availableExecutors;

  const ticketCategoryId = (ticket as any).category_id || null;
  const ticketCategoryName = ticket.category ? String(ticket.category).toLowerCase() : null;

  if (strategy === 'specific_executor' && typeof params.executor_id === 'string') {
    const specific = availableExecutors.find((executor: any) => executor.id === params.executor_id);
    filteredExecutors = specific ? [specific] : [];
  } else {
    const requiredSkillIds = new Set<string>();
    const requestedSkillIds = Array.isArray(params.skill_ids)
      ? params.skill_ids.map((value) => String(value).toLowerCase())
      : [];
    requestedSkillIds.forEach((skill) => requiredSkillIds.add(skill));

    if (ticketCategoryId) {
      requiredSkillIds.add(String(ticketCategoryId).toLowerCase());
    }
    if (ticketCategoryName) {
      requiredSkillIds.add(ticketCategoryName);
    }

    if (requiredSkillIds.size > 0) {
      filteredExecutors = availableExecutors.filter((executor: any) => {
        const executorSkills = Array.isArray(executor.skills)
          ? executor.skills.map((value: any) => String(value).toLowerCase())
          : [];

        if (executor.category_id) {
          executorSkills.push(String(executor.category_id).toLowerCase());
        }

        if (executor.category?.name) {
          executorSkills.push(String(executor.category.name).toLowerCase());
        }

        return executorSkills.some((skill: string) => requiredSkillIds.has(skill));
      });
    }
  }

  if (!filteredExecutors.length) {
    console.warn('[create-ticket] No executors found with matching skills', {
      ticketId: ticket.id,
      strategy,
      ticketCategoryId,
      ticketCategoryName,
      requestedSkillIds: params.skill_ids ?? [],
    });
    return;
  }

  const executorIds = filteredExecutors
    .map((executor: any) => executor.id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

  const loadMap = new Map<string, number>();

  if (executorIds.length) {
    const { data: activeTickets, error: loadError } = await supabase
      .from('tickets')
      .select('executor_profile_id, status')
      .in('executor_profile_id', executorIds)
      .in('status', ['open', 'in-progress']);

    if (loadError) {
      console.error('[create-ticket] Failed to fetch executor ticket load', loadError);
    } else {
      for (const ticketRow of activeTickets || []) {
        const executorId = ticketRow.executor_profile_id;
        if (executorId) {
          loadMap.set(executorId, (loadMap.get(executorId) ?? 0) + 1);
        }
      }
    }
  }

  const ranked = filteredExecutors
    .map((executor: any) => ({
      executor,
      load:
        loadMap.get(executor.id) ??
        (typeof executor.assigned_tickets_count === 'number'
          ? executor.assigned_tickets_count
          : null) ??
        (typeof executor.open_tickets_count === 'number'
          ? executor.open_tickets_count
          : null) ??
        0,
      tieBreaker: Math.random(),
    }))
    .sort((a, b) => {
      const loadDiff = a.load - b.load;
      if (loadDiff !== 0) {
        return loadDiff;
      }
      return a.tieBreaker - b.tieBreaker;
    });
  const selected = ranked[0]?.executor;

  if (!selected) {
    console.warn('[create-ticket] Unable to determine executor for ticket', { ticketId: ticket.id, strategy });
    return;
  }

  console.info('[create-ticket] assignExecutor:selected', {
    ticketId: ticket.id,
    strategy,
    executorProfileId: selected.id,
    executorUserId: selected.user_id ?? null,
    categoryId: selected.category_id ?? null,
    categoryName: selected.category?.name ?? null,
  });

  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      executor_profile_id: selected.id,
      executor_id: selected.user_id ?? null,
    })
    .eq('id', ticket.id);

  if (updateError) {
    throw updateError;
  }

  const newAssignedCount = ((selected.assigned_tickets_count as number | undefined) ?? 0) + 1;
  const newOpenCount = ((selected.open_tickets_count as number | undefined) ?? 0) + 1;

  const { error: loadUpdateError } = await supabase
    .from('executor_profiles')
    .update({
      assigned_tickets_count: newAssignedCount,
      open_tickets_count: newOpenCount,
    })
    .eq('id', selected.id);

  if (loadUpdateError) {
    console.error('[create-ticket] Failed to update executor load counters', {
      executorProfileId: selected.id,
      error: loadUpdateError,
    });
  } else {
    selected.assigned_tickets_count = newAssignedCount;
    selected.open_tickets_count = newOpenCount;
  }

  ticket.executor_profile_id = selected.id;
  ticket.executor_id = selected.user_id ?? null;
}

async function executeSetPriority(
  supabase: SupabaseClient,
  ticket: TicketRecord,
  params: Record<string, unknown>,
): Promise<void> {
  const priority = params.priority;
  if (!priority || typeof priority !== 'string') return;

  const { error } = await supabase
    .from('tickets')
    .update({ priority })
    .eq('id', ticket.id);

  if (error) throw error;
  ticket.priority = priority;
}

async function executeSetStatus(
  supabase: SupabaseClient,
  ticket: TicketRecord,
  params: Record<string, unknown>,
): Promise<void> {
  const status = params.status;
  if (!status || typeof status !== 'string') return;

  const update: Record<string, unknown> = { status };
  if (status === 'resolved' || status === 'closed') {
    update.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('tickets')
    .update(update)
    .eq('id', ticket.id);

  if (error) throw error;
  ticket.status = status;
}

async function executeSetDueDate(
  supabase: SupabaseClient,
  ticket: TicketRecord,
  params: Record<string, unknown>,
): Promise<void> {
  if (!params.value || typeof params.value !== 'number') return;
  const calculation = (params.calculation as string) || 'hours_from_now';

  const now = new Date();
  let dueDate = new Date(now);

  switch (calculation) {
    case 'hours_from_now':
      dueDate = new Date(now.getTime() + params.value * 60 * 60 * 1000);
      break;
    case 'days_from_now':
      dueDate = new Date(now.getTime() + params.value * 24 * 60 * 60 * 1000);
      break;
    case 'business_hours_from_now':
      dueDate = new Date(now.getTime() + params.value * 60 * 60 * 1000);
      break;
    default:
      dueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  const dueDateISO = dueDate.toISOString();

  const { error } = await supabase
    .from('tickets')
    .update({ sla_due_date: dueDateISO })
    .eq('id', ticket.id);

  if (error) throw error;
  (ticket as any).sla_due_date = dueDateISO;
}

async function logRuleExecution(
  supabase: SupabaseClient,
  ruleId: string,
  ticketId: string,
  status: 'success' | 'failed' | 'skipped',
  data: Record<string, unknown>,
  executionTimeMs?: number,
  errorMessage?: string,
): Promise<void> {
  const { error } = await supabase.from('rule_execution_logs').insert({
    rule_id: ruleId,
    ticket_id: ticketId,
    execution_status: status,
    matched_conditions: data.matchedConditions ?? null,
    actions_executed: data.actionsExecuted ?? null,
    execution_time_ms: executionTimeMs ?? null,
    error_message: errorMessage ?? null,
  });

  if (error) {
    console.error('[create-ticket] Failed to log rule execution', error);
  }
}

