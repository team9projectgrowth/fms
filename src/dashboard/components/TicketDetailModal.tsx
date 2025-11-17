import { useState, useEffect } from 'react';
import { X, Edit, Save, MessageSquare, User, MapPin, Calendar, Clock, AlertCircle } from 'lucide-react';
import { ticketsService } from '../../services/tickets.service';
import { categoriesService } from '../../services/categories.service';
import type { TicketWithRelations, TicketActivity, TicketStatus, TicketPriority } from '../../types/database';
import {
  getStatusBadgeColor,
  getPriorityBadgeColor,
  getSLABadgeColor,
  formatStatusLabel,
  formatPriorityLabel,
  formatSLA,
  calculateSLAStatus,
  calculateOpenDays,
} from '../../utils/ticketHelpers';

interface TicketDetailModalProps {
  ticket: TicketWithRelations;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TicketDetailModal({ ticket: initialTicket, onClose, onUpdate }: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<TicketWithRelations>(initialTicket);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  // Activity type will be determined automatically by createTicketActivity based on user role
  const [categories, setCategories] = useState<any[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
  });

  useEffect(() => {
    loadTicketDetails();
    loadCategories();
  }, [initialTicket.id]);

  async function loadTicketDetails() {
    try {
      setLoading(true);
      const [ticketData, activitiesData] = await Promise.all([
        ticketsService.getTicketById(initialTicket.id, true),
        ticketsService.getTicketActivities(initialTicket.id),
      ]);

      if (ticketData) {
        setTicket(ticketData as TicketWithRelations);
        setEditForm({
          title: ticketData.title,
          description: ticketData.description,
          status: ticketData.status,
          priority: ticketData.priority,
          category: ticketData.category,
        });
      }
      
      // Ensure activities is an array
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      
      console.log('Loaded activities:', activitiesData);
    } catch (err) {
      console.error('Failed to load ticket details:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const data = await categoriesService.getActive(ticket.tenant_id || undefined);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function handleUpdate() {
    try {
      const oldStatus = ticket.status;
      const oldPriority = ticket.priority;
      
      await ticketsService.updateTicket(ticket.id, {
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        priority: editForm.priority,
        category: editForm.category,
      });

      // Activity logging is now handled by updateTicket function
      // No need to log here as updateTicket will detect and log status_change, priority_change, and sla_change

      await loadTicketDetails();
      setEditing(false);
      onUpdate();
    } catch (err: any) {
      alert(err?.message || 'Failed to update ticket');
    }
  }

  async function handleQuickStatusChange(newStatus: TicketStatus) {
    try {
      // Use updateStatus which logs the activity
      await ticketsService.updateStatus(ticket.id, newStatus);
      await loadTicketDetails();
      onUpdate();
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    }
  }

  async function handleQuickPriorityChange(newPriority: TicketPriority) {
    try {
      // Use updatePriority which logs the activity
      await ticketsService.updatePriority(ticket.id, newPriority);
      await loadTicketDetails();
      onUpdate();
    } catch (err: any) {
      alert(err?.message || 'Failed to update priority');
    }
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;

    try {
      // Activity type will be determined automatically by createTicketActivity based on user role
      // For admin/tenant_admin: admin_comment
      // For executor: executor_update
      // For complainant: complainant_comment
      // We pass a generic type and let the service determine the correct type
      await ticketsService.createTicketActivity(
        ticket.id,
        'admin_comment', // Will be adjusted by service based on user role
        newComment
      );

      setNewComment('');
      await loadTicketDetails();
      onUpdate();
    } catch (err: any) {
      alert(err?.message || 'Failed to add comment');
    }
  }

  const slaStatus = calculateSLAStatus(ticket);
  const openDays = calculateOpenDays(ticket);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-gray-500">Loading ticket details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {ticket.ticket_number || ticket.id.substring(0, 8)}
            </h2>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(ticket.status)}`}>
              {formatStatusLabel(ticket.status)}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadgeColor(ticket.priority)}`}>
              {formatPriorityLabel(ticket.priority)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (editing) {
                  handleUpdate();
                } else {
                  setEditing(true);
                }
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              {editing ? <Save size={16} /> : <Edit size={16} />}
              {editing ? 'Save' : 'Edit'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Ticket Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              {editing ? (
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                />
              ) : (
                <div className="text-gray-900 font-medium">{ticket.title}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              {editing ? (
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-900">{ticket.category}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              {editing ? (
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as TicketStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">{formatStatusLabel(ticket.status)}</span>
                  <select
                    value={ticket.status}
                    onChange={(e) => handleQuickStatusChange(e.target.value as TicketStatus)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              {editing ? (
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TicketPriority })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">{formatPriorityLabel(ticket.priority)}</span>
                  <select
                    value={ticket.priority}
                    onChange={(e) => handleQuickPriorityChange(e.target.value as TicketPriority)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            {editing ? (
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            ) : (
              <div className="text-gray-900 whitespace-pre-wrap">{ticket.description}</div>
            )}
          </div>

          {/* Ticket Metadata */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Complainant</label>
              <div className="text-sm text-gray-900">
                {ticket.complainant?.full_name || ticket.complainant?.email || '-'}
              </div>
              {ticket.complainant?.email && (
                <div className="text-xs text-gray-500">{ticket.complainant.email}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Allocated To</label>
              <div className="text-sm text-gray-900">
                {ticket.executor_profile?.user?.full_name || ticket.executor_profile?.user?.name || ticket.executor?.user?.full_name || '-'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <div className="text-sm text-gray-900">{ticket.location}</div>
              {ticket.building && (
                <div className="text-xs text-gray-500">{ticket.building} {ticket.floor && `- Floor ${ticket.floor}`} {ticket.room && `- Room ${ticket.room}`}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created</label>
              <div className="text-sm text-gray-900">{new Date(ticket.created_at).toLocaleString()}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Last Updated</label>
              <div className="text-sm text-gray-900">{new Date(ticket.updated_at).toLocaleString()}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">SLA</label>
              {slaStatus ? (
                <div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSLABadgeColor(slaStatus)}`}>
                    {formatSLA(ticket)}
                  </span>
                  {(ticket.due_date || (ticket as any).sla_due_date) && (
                    <div className="text-xs text-gray-500 mt-1">
                      Due:{' '}
                      {new Date(ticket.due_date || (ticket as any).sla_due_date).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No SLA</div>
              )}
            </div>

            {openDays > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Open Days</label>
                <div className="text-sm text-gray-900">{openDays} days</div>
              </div>
            )}
          </div>

          {/* Activity History */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity History</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {activities.map((activity) => (
                <div key={activity.id} className="border-l-2 border-gray-200 pl-4 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{activity.activity_type}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </div>
                    {activity.created_by_user && (
                      <span className="text-xs text-gray-500">
                        by {activity.created_by_user.full_name || activity.created_by_user.email}
                      </span>
                    )}
                  </div>
                  {activity.comment && (
                    <div className="text-sm text-gray-700 mt-1">{activity.comment}</div>
                  )}
                </div>
              ))}
              {activities.length === 0 && (
                <div className="text-sm text-gray-500">No activities recorded</div>
              )}
            </div>
          </div>

          {/* Add Comment/Query */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Comment/Query</h3>
            <div className="space-y-3">
              {/* Activity type is determined automatically based on user role */}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Enter your comment or query..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <MessageSquare size={16} />
                Add Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

