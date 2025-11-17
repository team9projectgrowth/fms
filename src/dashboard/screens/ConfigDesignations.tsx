import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle, Power, PowerOff } from 'lucide-react';
import { designationsService } from '../../services/designations.service';
import { useTenant } from '../../hooks/useTenant';
import type { Designation } from '../../types/database';

export default function ConfigDesignations() {
  const { activeTenantId } = useTenant();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  });

  useEffect(() => {
    loadDesignations();
  }, [activeTenantId]);

  async function loadDesignations() {
    try {
      setLoading(true);
      setError(null);
      
      if (!activeTenantId) {
        setError('Please select a tenant to manage designations.');
        setLoading(false);
        return;
      }

      const data = await designationsService.getAll(activeTenantId);
      setDesignations(data);
    } catch (err) {
      console.error('Failed to load designations:', err);
      setError('Failed to load designations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(designation?: Designation) {
    if (designation) {
      setEditingDesignation(designation);
      setFormData({
        name: designation.name,
        description: designation.description || '',
        active: designation.active !== false,
      });
    } else {
      setEditingDesignation(null);
      setFormData({
        name: '',
        description: '',
        active: true,
      });
    }
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingDesignation(null);
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

      if (editingDesignation) {
        await designationsService.update(editingDesignation.id, formData);
      } else {
        await designationsService.create(formData, activeTenantId);
      }
      await loadDesignations();
      closeModal();
    } catch (err: any) {
      console.error('Failed to save designation:', err);
      setError(err?.message || 'Failed to save designation. Please try again.');
    }
  }

  async function handleDelete(designationId: string) {
    if (!confirm('Are you sure you want to delete this designation? This action cannot be undone.')) {
      return;
    }

    try {
      await designationsService.delete(designationId);
      await loadDesignations();
    } catch (err) {
      console.error('Failed to delete designation:', err);
      alert('Failed to delete designation. Please try again.');
    }
  }

  async function handleToggleActive(designationId: string, currentStatus: boolean) {
    try {
      await designationsService.update(designationId, { active: !currentStatus });
      await loadDesignations();
    } catch (err) {
      console.error('Failed to toggle designation status:', err);
      alert('Failed to update designation status. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading designations...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designations</h1>
          <p className="text-gray-600 mt-1">Manage complainant designations for your tenant</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={!activeTenantId}
          className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} className="mr-2" />
          Create Designation
        </button>
      </div>

      {!activeTenantId && (
        <div className="bg-warning/10 border border-warning text-warning rounded-card p-4 mb-6">
          Please select a tenant to manage designations.
        </div>
      )}

      {error && !showModal && (
        <div className="bg-danger/10 border border-danger text-danger rounded-card p-4 mb-6 flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-card shadow-sm">
        {designations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No designations found.</p>
            <p className="text-sm mt-2">Create your first designation to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-300">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-300">
                {designations.map((designation) => (
                  <tr key={designation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{designation.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {designation.description || <span className="text-gray-400">No description</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          designation.active
                            ? 'bg-success/10 text-success'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {designation.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleActive(designation.id, designation.active)}
                          className="text-gray-600 hover:text-primary"
                          title={designation.active ? 'Deactivate' : 'Activate'}
                        >
                          {designation.active ? (
                            <PowerOff size={18} />
                          ) : (
                            <Power size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => openModal(designation)}
                          className="text-gray-600 hover:text-primary"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(designation.id)}
                          className="text-danger hover:text-danger/80"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-card shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-300">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDesignation ? 'Edit Designation' : 'Create Designation'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-danger/10 border border-danger text-danger rounded-card p-3 flex items-center">
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
                  placeholder="e.g., Manager, Director, Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="Optional description for this designation"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-300">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-card hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90"
                >
                  {editingDesignation ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

