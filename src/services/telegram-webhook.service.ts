import { supabase } from '../lib/supabase';
import { ticketsService } from './tickets.service';
import { usersService } from './users.service';
import type {
  TelegramTicketInput,
  CreateTicketInput,
  Ticket,
  TicketWithRelations,
} from '../types/database';

/**
 * Telegram Webhook Service
 * Handles incoming webhook requests from automation layer (MCP)
 * Automation layer has already validated user and parsed message
 */
export const telegramWebhookService = {
  /**
   * Receive ticket creation request from automation layer
   * @param data - Structured ticket data from automation layer
   * @returns Created ticket with relations
   */
  async receiveTicketFromAutomation(data: TelegramTicketInput): Promise<TicketWithRelations> {
    // Validate required fields
    if (!data.issue || !data.issue.trim()) {
      throw new Error('Issue is required');
    }
    if (!data.location || !data.location.trim()) {
      throw new Error('Location is required');
    }
    if (!data.category || !data.category.trim()) {
      throw new Error('Category is required');
    }
    if (!data.priority) {
      throw new Error('Priority is required');
    }
    if (!data.name || !data.name.trim()) {
      throw new Error('Name is required');
    }
    if (!data.chat_id) {
      throw new Error('Chat ID is required');
    }
    if (!data.tenant_id) {
      throw new Error('Tenant ID is required');
    }

    // Validate priority value
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (!validPriorities.includes(data.priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    // Find user by telegram_chat_id or telegram_user_id
    // Automation layer has already validated the user, so they should exist
    let user = null;
    
    // Try to find by chat_id first
    if (data.chat_id) {
      const { data: usersByChatId, error: chatIdError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_chat_id', data.chat_id)
        .eq('tenant_id', data.tenant_id)
        .maybeSingle();

      if (chatIdError) {
        console.error('Error finding user by chat_id:', chatIdError);
      } else if (usersByChatId) {
        user = usersByChatId;
      }
    }

    // If not found by chat_id, try telegram_user_id (if provided)
    if (!user && data.chat_id) {
      // Sometimes chat_id might be stored as telegram_user_id
      const { data: usersByUserId, error: userIdError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_user_id', data.chat_id)
        .eq('tenant_id', data.tenant_id)
        .maybeSingle();

      if (userIdError) {
        console.error('Error finding user by telegram_user_id:', userIdError);
      } else if (usersByUserId) {
        user = usersByUserId;
      }
    }

    if (!user) {
      throw new Error(
        `User not found with chat_id: ${data.chat_id} in tenant: ${data.tenant_id}. ` +
        'Please ensure the user exists in the system and has the correct telegram_chat_id set.'
      );
    }

    // Verify user is active
    if (!user.is_active) {
      throw new Error('User is not active and cannot create tickets');
    }

    // Verify user belongs to the tenant
    if (user.tenant_id !== data.tenant_id) {
      throw new Error('User does not belong to the specified tenant');
    }

    // Map TelegramTicketInput to CreateTicketInput
    const ticketInput: CreateTicketInput = {
      title: data.issue.trim(),
      description: data.issue.trim(), // Use issue as both title and description
      category: data.category.trim(),
      priority: data.priority,
      type: data.type?.trim() || 'Maintenance', // Default type if not provided
      location: data.location.trim(),
      complainant_id: user.id, // Use found user's ID
      building: data.building?.trim(),
      floor: data.floor?.trim(),
      room: data.room?.trim(),
    };

    // Create ticket (this will trigger rule engine processing)
    const ticket = await ticketsService.createTicket(ticketInput, data.tenant_id);

    // Fetch the created ticket with relations for return
    const ticketWithRelations = await ticketsService.getTicketById(ticket.id);

    if (!ticketWithRelations) {
      throw new Error('Failed to fetch created ticket');
    }

    return ticketWithRelations;
  },
};

