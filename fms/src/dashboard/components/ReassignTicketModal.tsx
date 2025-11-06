import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import type { TicketWithRelations, ExecutorProfileWithUser } from '../../types/database';

interface ReassignTicketModalProps {
  ticket: TicketWithRelations;
  executors: ExecutorProfileWithUser[];
  onClose: () => void;
  onReassign: (ticketId: string, executorProfileId: string, comment?: string) => Promise<void>;
}

export default function ReassignTicketModal({ ticket, executors, onClose, onReassign }: ReassignTicketModalProps) {
  const [selectedExecutor, setSelectedExecutor] = useState<string>(
    ticket.executor_profile_id || ticket.executor_profile?.id || ticket.executor_id || ''
  );
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExecutor) {
      alert('Please select an executor');
      return;
    }

    try {
      setLoading(true);
      await onReassign(ticket.id, selectedExecutor, comment || undefined);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to reassign ticket');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Reassign Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticket
            </label>
            <div className="text-sm text-gray-900">
              {ticket.ticket_number || ticket.id.substring(0, 8)} - {ticket.title}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Assignee
            </label>
            <div className="text-sm text-gray-600">
              {ticket.executor_profile?.user?.full_name || ticket.executor_profile?.user?.name || ticket.executor?.user?.full_name || 'Unassigned'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Assignee *
            </label>
            <select
              value={selectedExecutor}
              onChange={(e) => setSelectedExecutor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              required
            >
              <option value="">Select Executor</option>
              {executors.map(exec => (
                <option key={exec.id} value={exec.id}>
                  {exec.user?.full_name || exec.user?.name || 'Unknown'} {exec.user?.email && `(${exec.user.email})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment about this reassignment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selectedExecutor}
            >
              <Save size={16} />
              {loading ? 'Reassigning...' : 'Reassign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

