import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle, Power, PowerOff } from 'lucide-react';
import { prioritiesService } from '../../services/priorities.service';
import { useTenant } from '../../hooks/useTenant';
import type { Priority } from '../../types/database';

const COLOR_OPTIONS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Green', value: '#10B981' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Slate', value: '#64748B' },
];

export default function ConfigPriorityLevels() {
  const { activeTenantId } = useTenant();
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    is_active: true,
  });

  useEffect(() => {
    loadPriorities();
  }, [activeTenantId]);

  async function loadPriorities() {
    try {
      setLoading(true);
      setError(null);
      
      if (!activeTenantId) {
        setError('Please select a tenant to manage priorities.');
        setLoading(false);
        return;
      }

      const data = await prioritiesService.getAll(activeTenantId);
      setPriorities(data);

      // Load ticket counts for each priority
      const counts: Record<string, number> = {};
      for (const priority of data) {
        try {
          const count = await prioritiesService.getTicketCount(priority.id, activeTenantId, 30);
          counts[priority.id] = count;
        } catch (err) {
          console.error(`Failed to load ticket count for priority ${priority.id}:`, err);
          counts[priority.id] = 0;
        }
      }
      setTicketCounts(counts);
    } catch (err) {
      console.error('Failed to load priorities:', err);
      setError('Failed to load priorities. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(priority?: Priority) {
    if (priority) {
      setEditingPriority(priority);
      setFormData({
        name: priority.name,
        color: priority.color || '#3B82F6',
        is_active: priority.is_active !== false,
      });
    } else {
      setEditingPriority(null);
      setFormData({
        name: '',
        color: '#3B82F6',
        is_active: true,
      });
    }
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingPriority(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    try {
      if (!activeTenantId) {
        setError('Tenant ID is required. Please select a tenant.');
        return;
      }

      if (editingPriority) {
        // Don't send level_order when updating (keep existing value)
        const { level_order, ...updateData } = formData as any;
        await prioritiesService.update(editingPriority.id, updateData);
      } else {
        // level_order will be auto-calculated in the service
        await prioritiesService.create(formData, activeTenantId);
      }
      await loadPriorities();
      closeModal();
    } catch (err: any) {
      console.error('Failed to save priority:', err);
      setError(err?.message || 'Failed to save priority. Please try again.');
    }
  }

  async function handleDelete(priorityId: string) {
    if (!confirm('Are you sure you want to delete this priority? This action cannot be undone.')) {
      return;
    }

    try {
      await prioritiesService.delete(priorityId);
      await loadPriorities();
    } catch (err) {
      console.error('Failed to delete priority:', err);
      alert('Failed to delete priority. Please try again.');
    }
  }

  async function handleToggleActive(priorityId: string, currentStatus: boolean) {
    try {
      await prioritiesService.update(priorityId, { is_active: !currentStatus });
      await loadPriorities();
    } catch (err) {
      console.error('Failed to toggle priority status:', err);
      alert('Failed to update priority status. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading priorities...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Priority Levels</h1>
          <p className="text-gray-600 mt-1">Manage priority levels for tickets in your tenant</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={!activeTenantId}
          className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} className="mr-2" />
          Create Priority
        </button>
      </div>

      {!activeTenantId && (
        <div className="bg-warning/10 border border-warning text-warning rounded-card p-4 mb-6">
          Please select a tenant to manage priorities.
        </div>
      )}

      {error && !showModal && (
        <div className="bg-danger/10 border border-danger text-danger rounded-card p-4 mb-6 flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {priorities.length === 0 ? (
        <div className="bg-white rounded-card shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No priorities found</p>
          <button
            onClick={() => openModal()}
            disabled={!activeTenantId}
            className="text-primary hover:underline disabled:opacity-50"
          >
            Create your first priority
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Color</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {priorities.map((priority) => (
                <tr key={priority.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: priority.color || '#3B82F6' }}
                      ></div>
                      <div className="text-sm font-medium text-gray-900">{priority.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: priority.color || '#3B82F6' }}
                      ></div>
                      <span className="ml-2 text-xs text-gray-600">{priority.color || '#3B82F6'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        priority.is_active !== false
                          ? 'bg-success/10 text-success'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {priority.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {ticketCounts[priority.id] || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(priority.id, priority.is_active !== false)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title={priority.is_active !== false ? 'Disable' : 'Enable'}
                      >
                        {priority.is_active !== false ? (
                          <PowerOff size={16} />
                        ) : (
                          <Power size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => openModal(priority)}
                        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(priority.id)}
                        className="p-2 text-danger hover:bg-danger/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPriority ? 'Edit Priority' : 'Create Priority'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-danger/10 border border-danger text-danger rounded-card flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="Priority name (e.g., Critical, High, Medium, Low)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-3 gap-2 p-4 border border-gray-300 rounded-card">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-3 rounded-lg transition-all ${
                        formData.color === color.value
                          ? 'ring-2 ring-primary ring-offset-2'
                          : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center pt-4">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-300">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-card hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-card hover:bg-primary/90"
                >
                  {editingPriority ? 'Update Priority' : 'Create Priority'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
