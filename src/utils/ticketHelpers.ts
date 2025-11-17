import type { Ticket, TicketWithRelations, TicketStatus, TicketPriority } from '../types/database';

/**
 * Calculate open days for a ticket
 */
export function calculateOpenDays(ticket: Ticket | TicketWithRelations): number {
  if (ticket.status !== 'open' && ticket.status !== 'in-progress') {
    return 0;
  }

  const createdDate = new Date(ticket.created_at);
  const now = new Date();
  const diffTime = now.getTime() - createdDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate SLA status from due_date
 */
export function calculateSLAStatus(ticket: Ticket | TicketWithRelations): 'on_track' | 'at_risk' | 'breached' | null {
  const dueDateValue = ticket.due_date || (ticket as any).sla_due_date;
  if (!dueDateValue) return null;

  const dueDate = new Date(dueDateValue);
  const now = new Date();
  const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining < 0) {
    return 'breached';
  } else if (hoursRemaining < 24) {
    return 'at_risk';
  } else {
    return 'on_track';
  }
}

/**
 * Format SLA for display
 */
export function formatSLA(ticket: Ticket | TicketWithRelations): string {
  const dueDateValue = ticket.due_date || (ticket as any).sla_due_date;
  if (!dueDateValue) return 'No SLA';

  const dueDate = new Date(dueDateValue);
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();

  if (diffTime < 0) {
    const hoursOverdue = Math.abs(Math.floor(diffTime / (1000 * 60 * 60)));
    if (hoursOverdue < 24) {
      return `${hoursOverdue}h overdue`;
    } else {
      const daysOverdue = Math.floor(hoursOverdue / 24);
      return `${daysOverdue}d overdue`;
    }
  } else {
    const hoursRemaining = Math.floor(diffTime / (1000 * 60 * 60));
    if (hoursRemaining < 24) {
      return `${hoursRemaining}h remaining`;
    } else {
      const daysRemaining = Math.floor(hoursRemaining / 24);
      return `${daysRemaining}d remaining`;
    }
  }
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'resolved':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get priority badge color
 */
export function getPriorityBadgeColor(priority: TicketPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get SLA badge color
 */
export function getSLABadgeColor(status: 'on_track' | 'at_risk' | 'breached'): string {
  switch (status) {
    case 'on_track':
      return 'bg-green-100 text-green-800';
    case 'at_risk':
      return 'bg-yellow-100 text-yellow-800';
    case 'breached':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format status label for display
 */
export function formatStatusLabel(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in-progress':
      return 'In Progress';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

/**
 * Format priority label for display
 */
export function formatPriorityLabel(priority: TicketPriority): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

