export type UserType = 'admin' | 'executor' | 'complainant' | 'tenant_admin';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type ExecutorAvailability = 'available' | 'busy' | 'offline';

export interface User {
  id: string;
  email: string;
  user_type: UserType;
  name: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  tenant_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
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
  executor_id: string;
  tenant_id?: string;
  // Add other profile fields as needed
  created_at: string;
  updated_at: string;
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
  complainant_id?: string;
  complainant_name?: string;
  complainant_email?: string;
  complainant_phone?: string;
  executor_id?: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  due_date?: string;
}

export interface TicketWithRelations extends Ticket {
  complainant?: User;
  executor?: ExecutorWithUser;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  keywords?: string[];
  ai_available?: boolean;
  sort_order?: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Priority {
  id: string;
  name: string;
  level: number;
  sla_hours?: number;
  color?: string;
  active: boolean;
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
  active?: boolean;
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
  complainant_id?: string;
  complainant_name?: string;
  complainant_email?: string;
  complainant_phone?: string;
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
}
