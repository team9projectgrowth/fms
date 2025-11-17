import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle, Power, PowerOff } from 'lucide-react';
import { executorSkillsService, type ExecutorSkill } from '../../services/executor-skills.service';
import { categoriesService } from '../../services/categories.service';
import { useTenant } from '../../hooks/useTenant';
import type { Category } from '../../types/database';

export default function ConfigExecutorSkills() {
  const { activeTenantId } = useTenant();
  const [skills, setSkills] = useState<ExecutorSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<ExecutorSkill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
    loadSkills();
  }, [activeTenantId]);

  async function loadCategories() {
    try {
      setLoadingCategories(true);
      const data = await categoriesService.getActive(activeTenantId || undefined);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadSkills() {
    try {
      setLoading(true);
      setError(null);
      
      if (!activeTenantId) {
        setError('Please select a tenant to manage executor skills.');
        setLoading(false);
        return;
      }

      const data = await executorSkillsService.getAll(activeTenantId);
      setSkills(data);
    } catch (err) {
      console.error('Failed to load executor skills:', err);
      setError('Failed to load executor skills. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(skill?: ExecutorSkill) {
    if (skill) {
      setEditingSkill(skill);
      setFormData({
        name: skill.name,
        description: skill.description || '',
        category: skill.category || '',
        is_active: skill.is_active !== false,
      });
    } else {
      setEditingSkill(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        is_active: true,
      });
    }
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingSkill(null);
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

      if (editingSkill) {
        await executorSkillsService.update(editingSkill.id, formData);
      } else {
        await executorSkillsService.create(formData, activeTenantId);
      }
      await loadSkills();
      closeModal();
    } catch (err: any) {
      console.error('Failed to save executor skill:', err);
      setError(err?.message || 'Failed to save executor skill. Please try again.');
    }
  }

  async function handleDelete(skillId: string) {
    if (!confirm('Are you sure you want to delete this executor skill? This action cannot be undone.')) {
      return;
    }

    try {
      await executorSkillsService.delete(skillId);
      await loadSkills();
    } catch (err) {
      console.error('Failed to delete executor skill:', err);
      alert('Failed to delete executor skill. Please try again.');
    }
  }

  async function handleToggleActive(skillId: string, currentStatus: boolean) {
    try {
      await executorSkillsService.update(skillId, { is_active: !currentStatus });
      await loadSkills();
    } catch (err) {
      console.error('Failed to toggle executor skill status:', err);
      alert('Failed to update executor skill status. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading executor skills...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executor Skills</h1>
          <p className="text-gray-600 mt-1">Manage executor skills for your tenant</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={!activeTenantId}
          className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} className="mr-2" />
          Create Skill
        </button>
      </div>

      {!activeTenantId && (
        <div className="bg-warning/10 border border-warning text-warning rounded-card p-4 mb-6">
          Please select a tenant to manage executor skills.
        </div>
      )}

      {error && !showModal && (
        <div className="bg-danger/10 border border-danger text-danger rounded-card p-4 mb-6 flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {skills.length === 0 ? (
        <div className="bg-white rounded-card shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No executor skills found</p>
          <button
            onClick={() => openModal()}
            disabled={!activeTenantId}
            className="text-primary hover:underline disabled:opacity-50"
          >
            Create your first executor skill
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {skills.map((skill) => (
                <tr key={skill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{skill.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {skill.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {skill.category ? (
                        categories.find(c => c.id === skill.category)?.name || '-'
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        skill.is_active !== false
                          ? 'bg-success/10 text-success'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {skill.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(skill.id, skill.is_active !== false)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title={skill.is_active !== false ? 'Disable' : 'Enable'}
                      >
                        {skill.is_active !== false ? (
                          <PowerOff size={16} />
                        ) : (
                          <Power size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => openModal(skill)}
                        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(skill.id)}
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
                {editingSkill ? 'Edit Executor Skill' : 'Create Executor Skill'}
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
                  placeholder="Skill name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="Skill description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category (Optional)
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  disabled={loadingCategories}
                >
                  <option value="">Select Category (Optional)</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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
                  {editingSkill ? 'Update Skill' : 'Create Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

