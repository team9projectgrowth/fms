export type UserType = 'admin' | 'executor' | 'complainant' | 'tenant_admin';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type ExecutorAvailability = 'available' | 'busy' | 'offline';

// Rule Engine Types
export type RuleTriggerEvent = 'on_create' | 'on_update' | 'on_manual' | 'on_status_change';
export type RuleType = 'priority' | 'sla' | 'allocation';
export type ConditionOperator = 
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
export type ActionType = 
  | 'assign_executor' 
  | 'set_priority' 
  | 'set_due_date' 
  | 'escalate' 
  | 'notify' 
  | 'set_status';
export type ExecutionStatus = 'success' | 'failed' | 'skipped';
export type ExecutorAssignmentStrategy = 'skill_match' | 'load_balance' | 'round_robin' | 'specific_executor';
export type ExecutorTicketSessionType = 'update' | 'status_change';
export type ExecutorTicketSessionState = 'awaiting_input' | 'completed' | 'cancelled' | 'expired';

export type BotOnboardingStatus =
  | 'not_required'
  | 'pending'
  | 'invited'
  | 'awaiting_chat'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserType;
  phone?: string;
  department?: string;
  emp_code?: string;
  tenant_id?: string;
  manager_id?: string;
  designation_id?: string;
  is_active: boolean;
  telegram_user_id?: string;
  telegram_chat_id?: string;
  bot_onboarding_status?: BotOnboardingStatus;
  bot_onboarding_started_at?: string;
  bot_onboarding_completed_at?: string;
  bot_onboarding_error?: string;
  bot_onboarding_retry_count?: number;
  bot_deep_link?: string;
  bot_correlation_id?: string;
  created_at: string;
}

export interface Executor {
  id: string;
  user_id: string;
  skills: string[];
  max_tickets: number;
  current_load: number;
  availability: ExecutorAvailability;
  work_start: string;
  work_end: string;
  telegram_token?: string;
  telegram_connected: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExecutorWithUser extends Executor {
  user: User;
}

export interface ExecutorProfile {
  id: string;
  tenant_id: string;
  user_id?: string;
  max_concurrent_tickets?: number;
  availability_status?: ExecutorAvailability;
  skills?: string[];
  employee_id?: string;
  manager_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  telegram_user_id?: string;
  telegram_chat_id?: string;
  category_id?: string;
  assigned_tickets_count: number;
  open_tickets_count: number;
  is_default_executor?: boolean;
}

export interface ExecutorProfileWithUser extends ExecutorProfile {
  user: User;
}

export interface ExecutorWithProfile extends ExecutorWithUser {
  executor_profiles?: ExecutorProfile[];
}

// Alias for backward compatibility
export interface ExecutorWithProfileFlat extends ExecutorWithUser {
  executor_profile?: ExecutorProfile;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  type: string;
  status: TicketStatus;
  location: string;
  building?: string;
  floor?: string;
  room?: string;
  complainant_id?: string; // References users table - use complainant relation for details
  executor_id?: string;
  executor_profile_id?: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  due_date?: string;
  sla_due_date?: string;
}

export interface TicketWithRelations extends Ticket {
  complainant?: User;
  executor?: ExecutorWithUser;
  executor_profile?: ExecutorProfile;
  last_activity_comment?: string; // Computed from ticket_activities
  open_days?: number; // Computed: days since creation for open tickets
  sla_status?: 'on_track' | 'at_risk' | 'breached'; // Computed from due_date
}

export type TicketActivityType = 
  | 'reassignment' 
  | 'priority_change' 
  | 'sla_change' 
  | 'admin_comment' 
  | 'complainant_comment' 
  | 'executor_update' 
  | 'status_change';

export interface TicketActivity {
  id: string;
  ticket_id: string;
  tenant_id?: string;
  activity_type: TicketActivityType;
  comment?: string;
  created_by?: string;
  created_at: string;
  metadata?: Record<string, any>;
  created_by_user?: User; // Relation to users
  session_id?: string; // Links to executor_ticket_sessions when applicable
  telegram_message_id?: number;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
}

export interface Designation {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Priority {
  id: string;
  name: string;
  level?: number;
  level_order?: number;
  sla_hours?: number;
  color?: string;
  is_active: boolean;
  tenant_id?: string;
  created_at: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  user_type: UserType;
  name: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  designation_id?: string;
  telegram_chat_id?: string;
  telegram_user_id?: string;
  active?: boolean;
}

export interface TenantNotification {
  id: string;
  tenant_id: string;
  user_id?: string;
  triggered_by?: string;
  type: string;
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  status: 'unread' | 'read';
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

export interface CreateExecutorInput {
  user_id: string;
  skills?: string[];
  max_tickets?: number;
  work_start?: string;
  work_end?: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  type: string;
  location: string;
  building?: string;
  floor?: string;
  room?: string;
  complainant_id?: string; // Required - references users table
  executor_id?: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  category?: string;
  priority?: TicketPriority;
  type?: string;
  status?: TicketStatus;
  location?: string;
  building?: string;
  floor?: string;
  room?: string;
  executor_id?: string;
  resolved_at?: string;
  due_date?: string;
}

export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: string[];
  executor_id?: string;
  complainant_id?: string;
  search?: string;
  tenant_id?: string;
  created_from?: string; // ISO date string
  created_to?: string; // ISO date string
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
}

export interface DatabaseResponse<T> {
  data: T | null;
  error: DatabaseError | null;
}

export type SubscriptionStatus = 'trial' | 'active' | 'inactive' | 'expired';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  contact_person?: string;
  subscription_status: SubscriptionStatus;
  subscription_start_date?: string;
  subscription_end_date?: string;
  max_users: number;
  active: boolean;
  approved: boolean;
  approved_at?: string;
  approved_by?: string;
  automation_webhook_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  contact_person?: string;
  subscription_status?: SubscriptionStatus;
  subscription_start_date?: string;
  subscription_end_date?: string;
  max_users?: number;
}

export interface UpdateTenantInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  contact_person?: string;
  subscription_status?: SubscriptionStatus;
  subscription_start_date?: string;
  subscription_end_date?: string;
  max_users?: number;
  active?: boolean;
  approved?: boolean;
  automation_webhook_url?: string;
}

// ============================================================================
// Rule Engine Interfaces
// ============================================================================

export interface Rule {
  id: string;
  tenant_id: string;
  rule_name: string;
  rule_type: RuleType;
  priority_order: number;
  trigger_event: RuleTriggerEvent;
  is_active: boolean;
  stop_on_match?: boolean;
  max_executions?: number;
  executor_pool?: string[]; // Deprecated - use action config
  assignment_strategy?: string; // Deprecated - use action config
  created_at: string;
  updated_at: string;
}

export interface RuleCondition {
  id: string;
  tenant_id: string;
  rule_id: string;
  field_path: string; // e.g., 'priority', 'category', 'complainant.department'
  operator: ConditionOperator;
  value: string[]; // Array of values for flexibility
  sequence: number;
  group_id?: string; // For grouping conditions with AND/OR logic
  logical_operator?: 'AND' | 'OR'; // For grouping with previous condition
}

export interface RuleAction {
  id: string;
  tenant_id: string;
  rule_id: string;
  action_type: ActionType;
  action_params: Record<string, any>; // JSONB - flexible action configuration
  step_order: number;
  trigger_after_minutes?: number; // Time-based trigger (for escalation, reminders)
  action_condition?: string; // Optional condition for action execution
}

export interface RuleWithDetails extends Rule {
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

export interface RuleExecutionLog {
  id: string;
  rule_id: string;
  ticket_id: string;
  execution_status: ExecutionStatus;
  matched_conditions?: Record<string, any>;
  actions_executed?: Record<string, any>[];
  error_message?: string;
  execution_time_ms?: number;
  created_at: string;
}

// Action Configuration Types
export interface AssignExecutorActionConfig {
  strategy: ExecutorAssignmentStrategy;
  executor_id?: string; // For specific_executor strategy
  skill_ids?: string[]; // For skill_match strategy
}

export interface SetPriorityActionConfig {
  priority: TicketPriority;
}

export interface SetDueDateActionConfig {
  calculation: 'hours_from_now' | 'days_from_now' | 'business_hours_from_now';
  value: number;
  base_on?: 'priority' | 'category'; // Optional base for calculation
}

export interface EscalateActionConfig {
  escalate_to: 'manager' | 'admin';
  priority_level?: number; // Optional priority increase
}

export interface NotifyActionConfig {
  recipients: string[]; // User IDs or email addresses
  template?: string; // Optional notification template
}

export interface SetStatusActionConfig {
  status: TicketStatus;
}

// Input types for creating/updating rules
export interface CreateRuleInput {
  tenant_id: string;
  rule_name: string;
  rule_type: RuleType;
  priority_order: number;
  trigger_event: RuleTriggerEvent;
  is_active?: boolean;
  stop_on_match?: boolean;
  max_executions?: number;
  conditions?: Omit<RuleCondition, 'id' | 'tenant_id' | 'rule_id'>[];
  actions?: Omit<RuleAction, 'id' | 'tenant_id' | 'rule_id'>[];
}

export interface UpdateRuleInput {
  rule_name?: string;
  rule_type?: RuleType;
  priority_order?: number;
  trigger_event?: RuleTriggerEvent;
  is_active?: boolean;
  stop_on_match?: boolean;
  max_executions?: number;
}

export interface CreateRuleConditionInput {
  rule_id: string;
  field_path: string;
  operator: ConditionOperator;
  value: string[];
  sequence: number;
  group_id?: string;
  logical_operator?: 'AND' | 'OR';
}

export interface CreateRuleActionInput {
  rule_id: string;
  action_type: ActionType;
  action_params: Record<string, any>;
  step_order: number;
  trigger_after_minutes?: number;
  action_condition?: string;
}

// ============================================================================
// Telegram/Automation Layer Integration Types
// ============================================================================

/**
 * Input from automation layer when creating a ticket via Telegram
 * Automation layer has already validated user and parsed message
 */
export interface TelegramTicketInput {
  issue: string; // Description of the issue
  location: string; // Location of the issue
  category: string; // Category (already determined by automation layer)
  priority: TicketPriority; // Basic/first level priority (already determined by automation layer)
  name: string; // User's name
  designation?: string; // User's designation
  department?: string; // User's department
  chat_id: string; // Telegram chat ID
  tenant_id: string; // Tenant ID
  type?: string; // Optional ticket type (defaults if not provided)
  building?: string; // Optional building
  floor?: string; // Optional floor
  room?: string; // Optional room
}

/**
 * Payload sent to automation layer webhook after ticket processing
 */
export interface AutomationWebhookPayload {
  ticket_id: string;
  ticket_number: string;
  issue: string; // Description/title
  description?: string;
  location: string;
  category: string;
  priority: TicketPriority; // Final priority after rule engine processing
  sla?: string; // Due date in ISO format
  allocated_to?: string; // Executor ID (if allocated)
  allocated_to_name?: string; // Executor name (if allocated)
  allocated_to_chat_id?: string; // Executor chat ID (if available)
  status: TicketStatus;
}

export interface ExecutorTicketSession {
  id: string;
  ticket_id: string;
  executor_profile_id?: string | null;
  executor_user_id?: string | null;
  telegram_chat_id: string;
  telegram_message_id?: number | null;
  prompt_message_id?: number | null;
  session_type: ExecutorTicketSessionType;
  state: ExecutorTicketSessionState;
  expires_at?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}
