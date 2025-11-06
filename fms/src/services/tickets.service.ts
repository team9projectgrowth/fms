import { supabase } from '../lib/supabase';
import type {
  Ticket,
  TicketWithRelations,
  CreateTicketInput,
  UpdateTicketInput,
  TicketFilters,
  RuleTriggerEvent,
  TicketActivity,
  TicketActivityType,
} from '../types/database';
import { ruleEngineService } from './rule-engine.service';

export const ticketsService = {
  async getTickets(filters?: TicketFilters, page = 1, limit = 10) {
    // First try with full joins
    let query = supabase
      .from('tickets')
      .select(`
        *,
        complainant:users!tickets_complainant_id_fkey(*),
        executor_profile:executor_profiles!tickets_executor_profile_id_fkey(*, user:users!executor_profiles_user_id_fkey(*))
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters?.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters?.executor_id) {
      query = query.eq('executor_profile_id', filters.executor_id);
    }

    if (filters?.complainant_id) {
      query = query.eq('complainant_id', filters.complainant_id);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    let { data, error, count } = await query;

    // If query fails with executor join, retry without executor join
    if (error && error.message?.includes('executor')) {
      query = supabase
        .from('tickets')
        .select(`
          *,
          complainant:users(*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters?.category && filters.category.length > 0) {
        query = query.in('category', filters.category);
      }

      if (filters?.executor_id) {
        query = query.eq('executor_profile_id', filters.executor_id);
      }

      if (filters?.complainant_id) {
        query = query.eq('complainant_id', filters.complainant_id);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      query = query.range(from, to);
      const retryResult = await query;
      data = retryResult.data;
      error = retryResult.error;
      count = retryResult.count;
    }

    if (error) throw error;

    return {
      tickets: (data || []) as TicketWithRelations[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  async getTicketById(id: string, includeDesignation = true) {
    // Try with full joins first, including designation for rule engine
    let { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        complainant:users!tickets_complainant_id_fkey(*, designation:designations!users_designation_id_fkey(id, name)),
        executor_profile:executor_profiles!tickets_executor_profile_id_fkey(*, user:users!executor_profiles_user_id_fkey(*))
      `)
      .eq('id', id)
      .maybeSingle();

    // If query fails with executor join, retry without executor join but keep designation
    if (error && error.message?.includes('executor')) {
      const retryResult = await supabase
        .from('tickets')
        .select(`
          *,
          complainant:users!tickets_complainant_id_fkey(*, designation:designations!users_designation_id_fkey(id, name))
        `)
        .eq('id', id)
        .maybeSingle();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;
    return data as TicketWithRelations | null;
  },

  async createTicket(input: CreateTicketInput, tenantId?: string) {
    // Validate all required fields
    if (!input.title || !input.title.trim()) {
      throw new Error('Title is required');
    }
    if (!input.description || !input.description.trim()) {
      throw new Error('Description is required');
    }
    if (!input.category || !input.category.trim()) {
      throw new Error('Category is required');
    }
    if (!input.priority) {
      throw new Error('Priority is required');
    }
    if (!input.type || !input.type.trim()) {
      throw new Error('Type is required');
    }
    if (!input.location || !input.location.trim()) {
      throw new Error('Location is required');
    }
    if (!input.complainant_id) {
      throw new Error('Complainant is required. Please select a complainant from the users table.');
    }

    // Validate priority value
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!validPriorities.includes(input.priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    // Get current user's tenant_id if not provided
    let ticketTenantId = tenantId;
    if (!ticketTenantId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .maybeSingle();
        ticketTenantId = userData?.tenant_id || undefined;
      }
    }

    // Verify complainant exists in users table
    const { data: complainantData, error: complainantError } = await supabase
      .from('users')
      .select('id, tenant_id, role, email, full_name')
      .eq('id', input.complainant_id)
      .maybeSingle();

    if (complainantError) {
      throw new Error(`Error validating complainant: ${complainantError.message}`);
    }

    if (!complainantData) {
      throw new Error('Invalid complainant. Please select a valid user from the users table.');
    }

    // Verify complainant is in the same tenant (if tenant_id is set)
    if (ticketTenantId && complainantData.tenant_id !== ticketTenantId) {
      throw new Error('Complainant must belong to the same tenant.');
    }

    // Validate executor if provided
    if (input.executor_id) {
      const { data: executorData, error: executorError } = await supabase
        .from('executor_profiles')
        .select('id, tenant_id')
        .eq('id', input.executor_id)
        .maybeSingle();

      if (executorError) {
        throw new Error(`Error validating executor: ${executorError.message}`);
      }

      if (!executorData) {
        throw new Error('Invalid executor. Please select a valid executor.');
      }

      // Verify executor is in the same tenant (if tenant_id is set)
      if (ticketTenantId && executorData.tenant_id !== ticketTenantId) {
        throw new Error('Executor must belong to the same tenant.');
      }
    }

    // Prepare insert data with all required fields
    // Note: ticket_number is NOT included - it will be auto-generated by the database trigger
    // Format: FMS-{first 3 chars of tenant name}-{progressive unique number}
    const insertData: any = {
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      priority: input.priority,
      type: input.type.trim(),
      status: 'open', // Set default status to 'open' for new tickets
      location: input.location.trim(),
      complainant_id: input.complainant_id,
      tenant_id: ticketTenantId,
      // ticket_number is omitted - trigger will auto-generate it
    };

    // Add optional fields only if provided
    if (input.building && input.building.trim()) {
      insertData.building = input.building.trim();
    }
    if (input.floor && input.floor.trim()) {
      insertData.floor = input.floor.trim();
    }
    if (input.room && input.room.trim()) {
      insertData.room = input.room.trim();
    }
    
    // If executor_id is provided, use it as executor_profile_id
    if (input.executor_id) {
      insertData.executor_profile_id = input.executor_id;
    }

    // Insert ticket
    const { data, error } = await supabase
      .from('tickets')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      throw new Error(`Failed to create ticket: ${error.message}`);
    }

    if (!data) {
      throw new Error('Ticket creation failed: No data returned');
    }

    // Process rules for ticket creation (non-blocking)
    if (data) {
      try {
        await ruleEngineService.processTicket(data.id, 'on_create');
      } catch (ruleError) {
        console.error('Error processing rules for ticket creation:', ruleError);
        // Don't fail ticket creation if rule processing fails
      }
    }

    return data as Ticket;
  },

  async updateTicket(id: string, input: UpdateTicketInput) {
    // Get current ticket to detect changes
    const currentTicket = await this.getTicketById(id);
    const statusChanged = currentTicket && input.status && currentTicket.status !== input.status;
    const priorityChanged = currentTicket && input.priority && currentTicket.priority !== input.priority;
    const slaChanged = currentTicket && input.due_date !== undefined && currentTicket.due_date !== input.due_date;

    const { data, error } = await supabase
      .from('tickets')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log activities separately to avoid duplicates
    // Note: updateStatus and updatePriority are called directly from UI, so they log their own activities
    // Here we only log if updateTicket is called directly (not through updateStatus/updatePriority)
    if (data && statusChanged && input.status && currentTicket) {
      try {
        await this.createTicketActivity(
          id,
          'status_change',
          `Status changed from ${currentTicket.status} to ${input.status}`,
          {
            old_status: currentTicket.status,
            new_status: input.status,
          }
        );
      } catch (activityError) {
        console.error('Error logging status change activity:', activityError);
      }
    }

    if (data && priorityChanged && input.priority && currentTicket) {
      try {
        await this.createTicketActivity(
          id,
          'priority_change',
          `Priority changed from ${currentTicket.priority} to ${input.priority}`,
          {
            old_priority: currentTicket.priority,
            new_priority: input.priority,
          }
        );
      } catch (activityError) {
        console.error('Error logging priority change activity:', activityError);
      }
    }

    // Log SLA change activity if due_date changed
    if (data && slaChanged && currentTicket) {
      try {
        await this.logSLAChange(id, currentTicket.due_date, input.due_date || null);
      } catch (activityError) {
        console.error('Error logging SLA change activity:', activityError);
      }
    }

    // Process rules for ticket update
    if (data) {
      try {
        // Determine trigger event
        let triggerEvent: RuleTriggerEvent = 'on_update';
        if (statusChanged) {
          triggerEvent = 'on_status_change';
        }

        await ruleEngineService.processTicket(data.id, triggerEvent);
      } catch (ruleError) {
        console.error('Error processing rules for ticket update:', ruleError);
        // Don't fail ticket update if rule processing fails
      }
    }

    return data as Ticket;
  },

  async deleteTicket(id: string) {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async assignExecutor(ticketId: string, executorProfileId: string) {
    // Get current ticket to detect changes
    const currentTicket = await this.getTicketById(ticketId);
    const executorChanged = currentTicket && (currentTicket.executor_profile_id !== executorProfileId || currentTicket.executor_id !== executorProfileId);

    const { data, error } = await supabase
      .from('tickets')
      .update({ executor_profile_id: executorProfileId, status: 'in-progress' })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    // Log reassignment activity if executor changed
    if (data && executorChanged) {
      try {
        await this.createTicketActivity(
          ticketId,
          'reassignment',
          `Ticket assigned to executor ${executorProfileId}`,
          {
            old_executor_id: currentTicket.executor_profile_id || currentTicket.executor_id,
            new_executor_id: executorProfileId,
          }
        );
      } catch (activityError) {
        console.error('Error logging reassignment activity:', activityError);
        // Don't fail assignment if activity logging fails
      }
    }

    // Process rules for ticket update (status change)
    if (data) {
      try {
        await ruleEngineService.processTicket(data.id, 'on_status_change');
      } catch (ruleError) {
        console.error('Error processing rules for executor assignment:', ruleError);
        // Don't fail assignment if rule processing fails
      }
    }

    return data as Ticket;
  },

  async updateStatus(ticketId: string, status: string, skipActivityLog = false) {
    // Get current ticket status to detect status changes
    const currentTicket = await this.getTicketById(ticketId);
    const statusChanged = currentTicket && currentTicket.status !== status;

    const updates: any = { status };
    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    // Log status change activity if status changed
    if (data && statusChanged && currentTicket) {
      try {
        await this.createTicketActivity(
          ticketId,
          'status_change',
          `Status changed from ${currentTicket.status} to ${status}`,
          {
            old_status: currentTicket.status,
            new_status: status,
          }
        );
      } catch (activityError) {
        console.error('Error logging status change activity:', activityError);
        // Don't fail status update if activity logging fails
      }
    }

    // Process rules for status change
    if (data && statusChanged) {
      try {
        await ruleEngineService.processTicket(data.id, 'on_status_change');
      } catch (ruleError) {
        console.error('Error processing rules for status update:', ruleError);
        // Don't fail status update if rule processing fails
      }
    }

    return data as Ticket;
  },

  /**
   * Update ticket priority
   */
  async updatePriority(ticketId: string, priority: TicketPriority) {
    // Get current ticket priority to detect changes
    const currentTicket = await this.getTicketById(ticketId);
    const priorityChanged = currentTicket && currentTicket.priority !== priority;

    const { data, error } = await supabase
      .from('tickets')
      .update({ priority })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    // Log priority change activity if priority changed
    if (data && priorityChanged && currentTicket) {
      try {
        await this.createTicketActivity(
          ticketId,
          'priority_change',
          `Priority changed from ${currentTicket.priority} to ${priority}`,
          {
            old_priority: currentTicket.priority,
            new_priority: priority,
          }
        );
      } catch (activityError) {
        console.error('Error logging priority change activity:', activityError);
        // Don't fail priority update if activity logging fails
      }
    }

    // Process rules for priority change
    if (data && priorityChanged) {
      try {
        await ruleEngineService.processTicket(data.id, 'on_update');
      } catch (ruleError) {
        console.error('Error processing rules for priority update:', ruleError);
        // Don't fail priority update if rule processing fails
      }
    }

    return data as Ticket;
  },

  /**
   * Detect and log SLA changes
   */
  async logSLAChange(ticketId: string, oldDueDate: string | null | undefined, newDueDate: string | null | undefined) {
    if (oldDueDate !== newDueDate) {
      try {
        await this.createTicketActivity(
          ticketId,
          'sla_change',
          `SLA changed from ${oldDueDate || 'none'} to ${newDueDate || 'none'}`,
          {
            old_due_date: oldDueDate,
            new_due_date: newDueDate,
          }
        );
      } catch (activityError) {
        console.error('Error logging SLA change activity:', activityError);
        // Don't fail if activity logging fails
      }
    }
  },

  /**
   * Manually trigger rule processing for a ticket
   */
  async triggerRuleExecution(ticketId: string, triggerEvent: RuleTriggerEvent = 'on_manual'): Promise<void> {
    await ruleEngineService.processTicket(ticketId, triggerEvent);
  },

  /**
   * Get tickets for a specific tenant with enhanced filtering
   */
  async getTicketsForTenant(tenantId: string, filters?: TicketFilters, page = 1, limit = 50) {
    let query = supabase
      .from('tickets')
      .select(`
        *,
        complainant:users!tickets_complainant_id_fkey(*),
        executor_profile:executor_profiles!tickets_executor_profile_id_fkey(*, user:users!executor_profiles_user_id_fkey(*))
      `, { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters?.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters?.executor_id) {
      query = query.eq('executor_profile_id', filters.executor_id);
    }

    if (filters?.complainant_id) {
      query = query.eq('complainant_id', filters.complainant_id);
    }

    if (filters?.created_from) {
      query = query.gte('created_at', filters.created_from);
    }

    if (filters?.created_to) {
      query = query.lte('created_at', filters.created_to);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting
    const sortBy = filters?.sort_by || 'created_at';
    const sortOrder = filters?.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Enhance tickets with computed fields and last activity
    const enhancedTickets = await Promise.all(
      (data || []).map(async (ticket) => {
        const enhanced = ticket as TicketWithRelations;
        
        // Get last activity comment
        const lastActivity = await this.getLastActivity(ticket.id);
        enhanced.last_activity_comment = lastActivity?.comment;

        // Calculate open days (for open/in-progress tickets)
        if (ticket.status === 'open' || ticket.status === 'in-progress') {
          const createdDate = new Date(ticket.created_at);
          const now = new Date();
          enhanced.open_days = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Calculate SLA status
        if (ticket.due_date) {
          const dueDate = new Date(ticket.due_date);
          const now = new Date();
          const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          if (hoursRemaining < 0) {
            enhanced.sla_status = 'breached';
          } else if (hoursRemaining < 24) {
            enhanced.sla_status = 'at_risk';
          } else {
            enhanced.sla_status = 'on_track';
          }
        }

        return enhanced;
      })
    );

    return {
      tickets: enhancedTickets,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  /**
   * Get last activity comment for a ticket
   */
  async getLastActivity(ticketId: string): Promise<TicketActivity | null> {
    const { data, error } = await supabase
      .from('ticket_activities')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as TicketActivity | null;
  },

  /**
   * Get all activities for a ticket
   */
  async getTicketActivities(ticketId: string): Promise<TicketActivity[]> {
    const { data, error } = await supabase
      .from('ticket_activities')
      .select(`
        *,
        created_by_user:users(*)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as TicketActivity[];
  },

  /**
   * Create a ticket activity (comment/query)
   */
  async createTicketActivity(
    ticketId: string,
    activityType: TicketActivityType,
    comment: string,
    metadata?: Record<string, any>
  ): Promise<TicketActivity> {
    // Validate inputs
    if (!ticketId || !ticketId.trim()) {
      throw new Error('Ticket ID is required');
    }
    if (!activityType) {
      throw new Error('Activity type is required and cannot be null or undefined');
    }
    if (typeof activityType !== 'string') {
      throw new Error(`Activity type must be a string, got: ${typeof activityType}`);
    }
    if (!activityType.trim()) {
      throw new Error('Activity type is required and cannot be empty');
    }
    if (!comment || !comment.trim()) {
      throw new Error('Comment is required');
    }

    // Validate activity type
    const validActivityTypes = ['reassignment', 'priority_change', 'sla_change', 'admin_comment', 'complainant_comment', 'executor_update', 'status_change'];
    const trimmedActivityType = activityType.trim();
    if (!validActivityTypes.includes(trimmedActivityType)) {
      throw new Error(`Invalid activity type "${trimmedActivityType}". Must be one of: ${validActivityTypes.join(', ')}`);
    }

    // Get ticket to get tenant_id
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    // Get user role from users table to determine activity type
    const { data: userData } = await supabase
      .from('users')
      .select('role, id')
      .eq('id', authUser.id)
      .maybeSingle();

    const userRole = userData?.role || 'complainant';

    // Determine activity type based on user role if a generic type is passed
    // Use the already validated and trimmed activity type
    let finalActivityType = trimmedActivityType;
    
    // If activity type is already specific (reassignment, priority_change, sla_change, status_change), use as is
    if (['reassignment', 'priority_change', 'sla_change', 'status_change'].includes(finalActivityType)) {
      // Already specific, use as is
    } else if (finalActivityType === 'admin_comment' || finalActivityType === 'complainant_comment' || finalActivityType === 'executor_update') {
      // Already specific, use as is
    } else {
      // Auto-determine based on user role for comments
      if (userRole === 'admin' || userRole === 'tenant_admin') {
        finalActivityType = 'admin_comment';
      } else if (userRole === 'executor') {
        finalActivityType = 'executor_update';
      } else {
        // Default to complainant_comment for complainants or unknown roles
        finalActivityType = 'complainant_comment';
      }
    }

    // Final validation - ensure finalActivityType is not null or empty
    if (!finalActivityType || typeof finalActivityType !== 'string' || !finalActivityType.trim()) {
      console.error('Invalid finalActivityType:', {
        finalActivityType,
        type: typeof finalActivityType,
        originalActivityType: activityType,
        trimmedActivityType,
        userRole,
      });
      throw new Error(`Activity type cannot be null or empty. Got: ${finalActivityType}`);
    }

    // Trim one more time to be safe
    const safeActivityType = finalActivityType.trim();

    const insertData: any = {
      ticket_id: ticketId,
      tenant_id: ticket.tenant_id || null,
      activity_type: safeActivityType, // Using activity_type after migration
      comment: comment.trim(),
      created_by: authUser.id,
      metadata: metadata || {},
    };

    // Debug log to verify data
    console.log('Creating ticket activity with data:', {
      ticket_id: insertData.ticket_id,
      activity_type: insertData.activity_type,
      activity_type_type: typeof insertData.activity_type,
      activity_type_length: insertData.activity_type?.length,
      comment: insertData.comment ? 'present' : 'missing',
      created_by: insertData.created_by ? 'present' : 'missing',
      originalActivityType: activityType,
      finalActivityType: finalActivityType,
      userRole: userRole,
    });

    // Insert activity
    const { data, error } = await supabase
      .from('ticket_activities')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket activity:', error);
      console.error('Insert data was:', insertData);
      throw new Error(`Failed to create ticket activity: ${error.message}`);
    }

    if (!data) {
      throw new Error('Ticket activity creation failed: No data returned');
    }

    // Update ticket's updated_at (non-blocking)
    try {
      await supabase
        .from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);
    } catch (updateError) {
      console.error('Error updating ticket updated_at:', updateError);
      // Don't fail activity creation if update fails
    }

    return data as TicketActivity;
  },

  /**
   * Reassign ticket to a different executor
   */
  async reassignTicket(ticketId: string, executorProfileId: string, comment?: string): Promise<Ticket> {
    // Get current ticket
    const currentTicket = await this.getTicketById(ticketId);
    if (!currentTicket) throw new Error('Ticket not found');

    // Update ticket (assignExecutor will log the reassignment activity)
    const updatedTicket = await this.assignExecutor(ticketId, executorProfileId);

    // Update the reassignment activity comment if provided
    // Note: assignExecutor already logs the reassignment, so we don't need to log again
    // If a custom comment is provided, we could update the existing activity, but for now
    // we'll just use the default message from assignExecutor

    return updatedTicket;
  },
};
