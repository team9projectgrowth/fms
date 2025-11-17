import { supabase } from '../lib/supabase';
import { tenantsService } from './tenants.service';
import type {
  TicketWithRelations,
  AutomationWebhookPayload,
  Tenant,
} from '../types/database';

/**
 * Automation Webhook Service
 * Sends ticket data to automation layer webhook after ticket processing
 */
export const automationWebhookService = {
  /**
   * Send ticket details to automation layer webhook
   * @param ticket - Ticket with relations
   * @param tenantId - Tenant ID (optional, will be fetched from ticket if not provided)
   * @returns Promise that resolves when webhook is sent (non-blocking)
   */
  async sendTicketToAutomation(
    ticket: TicketWithRelations,
    tenantId?: string
  ): Promise<void> {
    try {
      // Get tenant ID from ticket if not provided
      const ticketTenantId = tenantId || ticket.tenant_id;
      
      if (!ticketTenantId) {
        console.warn(
          `Cannot send webhook for ticket ${ticket.id}: No tenant ID available`
        );
        return;
      }

      // Fetch tenant to get webhook URL
      const tenant = await tenantsService.getTenantById(ticketTenantId);
      
      if (!tenant) {
        console.warn(
          `Cannot send webhook for ticket ${ticket.id}: Tenant ${ticketTenantId} not found`
        );
        return;
      }

      // Check if webhook URL is configured
      if (!tenant.automation_webhook_url || !tenant.automation_webhook_url.trim()) {
        console.info(
          `Webhook URL not configured for tenant ${ticketTenantId}. Skipping webhook notification.`
        );
        return;
      }

      // Build payload
      const payload: AutomationWebhookPayload = {
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        issue: ticket.title, // Use title as issue description
        description: ticket.description,
        location: ticket.location,
        category: ticket.category,
        priority: ticket.priority, // Final priority after rule engine processing
        status: ticket.status,
      };

      // Add SLA (due_date) if available
      const slaValue = ticket.due_date || ticket.sla_due_date || (ticket as any).sla_due_date;
      if (slaValue) {
        payload.sla = slaValue;
      }

      // Add executor information if allocated
      if (ticket.executor_profile) {
        payload.allocated_to = ticket.executor_profile.id;
        
        // Add executor name if available
        if (ticket.executor_profile.user) {
          payload.allocated_to_name = ticket.executor_profile.user.full_name;
          if (ticket.executor_profile.user.telegram_chat_id) {
            payload.allocated_to_chat_id = ticket.executor_profile.user.telegram_chat_id;
          }
        } else if (ticket.executor_profile.full_name) {
          payload.allocated_to_name = ticket.executor_profile.full_name;
        }

        if (!payload.allocated_to_chat_id && ticket.executor_profile.telegram_chat_id) {
          payload.allocated_to_chat_id = ticket.executor_profile.telegram_chat_id;
        }
      } else if (ticket.executor_id) {
        // Fallback to executor_id if executor_profile is not loaded
        payload.allocated_to = ticket.executor_id;
      }

      // Send webhook (non-blocking)
      this.sendWebhookRequest(tenant.automation_webhook_url, payload).catch((error) => {
        console.error(
          `Failed to send webhook for ticket ${ticket.id} to ${tenant.automation_webhook_url}:`,
          error
        );
        // Don't throw - webhook failures should not break ticket operations
      });
    } catch (error) {
      console.error(
        `Error preparing webhook for ticket ${ticket.id}:`,
        error
      );
      // Don't throw - webhook failures should not break ticket operations
    }
  },

  /**
   * Send HTTP POST request to webhook URL
   * @param url - Webhook URL
   * @param payload - Payload to send
   */
  async sendWebhookRequest(
    url: string,
    payload: AutomationWebhookPayload
  ): Promise<void> {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'FMS-Ticket-System/1.0',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(
            `Webhook request failed with status ${response.status}: ${errorText}`
          );
        }

        console.info(
          `Successfully sent webhook for ticket ${payload.ticket_id} to ${url}`
        );
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Webhook request timeout after 10 seconds');
        }
        throw fetchError;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw error;
      }
      throw error;
    }
  },
};

