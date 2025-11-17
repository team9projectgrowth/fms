import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Plus, Edit, Trash2, X, AlertCircle, Power, PowerOff } from 'lucide-react';
import { categoriesService } from '../../services/categories.service';
import { useTenant } from '../../hooks/useTenant';
import type { Category } from '../../types/database';

const ICON_OPTIONS = [
  'wind', 'zap', 'droplet', 'armchair', 'monitor', 'sparkles', 'shield',
  'wrench', 'hammer', 'paintbrush', 'lightbulb', 'wifi', 'settings',
  'tool', 'package', 'clipboard', 'bell', 'lock', 'key', 'camera'
];

const COLOR_OPTIONS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Slate', value: '#64748B' },
];

export default function ConfigCategories() {
  const { activeTenantId } = useTenant();
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'wrench',
    color: '#3B82F6',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, [activeTenantId]);

  async function loadCategories() {
    try {
      setLoading(true);
      setError(null);
      
      if (!activeTenantId) {
        setError('Please select a tenant to manage categories.');
        setLoading(false);
        return;
      }

      const data = await categoriesService.getAll(activeTenantId);
      setCategories(data);

      // Load ticket counts for each category
      const counts: Record<string, number> = {};
      for (const category of data) {
        try {
          const count = await categoriesService.getTicketCount(category.id, activeTenantId, 30);
          counts[category.id] = count;
        } catch (err) {
          console.error(`Failed to load ticket count for category ${category.id}:`, err);
          counts[category.id] = 0;
        }
      }
      setTicketCounts(counts);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function openModal(category?: Category) {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        icon: category.icon || 'wrench',
        color: category.color || '#3B82F6',
        is_active: category.is_active !== false,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        icon: 'wrench',
        color: '#3B82F6',
        is_active: true,
      });
    }
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingCategory(null);
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

      if (editingCategory) {
        await categoriesService.update(editingCategory.id, formData);
      } else {
        await categoriesService.create(formData, activeTenantId);
      }
      await loadCategories();
      closeModal();
    } catch (err: any) {
      console.error('Failed to save category:', err);
      setError(err?.message || 'Failed to save category. Please try again.');
    }
  }

  async function handleDelete(categoryId: string) {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await categoriesService.delete(categoryId);
      await loadCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert('Failed to delete category. Please try again.');
    }
  }

  async function handleToggleActive(categoryId: string, currentStatus: boolean) {
    try {
      await categoriesService.update(categoryId, { is_active: !currentStatus });
      await loadCategories();
    } catch (err) {
      console.error('Failed to toggle category status:', err);
      alert('Failed to update category status. Please try again.');
    }
  }

  function renderIcon(iconName: string, className: string = '', color?: string) {
    const IconComponent = (Icons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
    if (IconComponent) {
      return <IconComponent className={className} style={color ? { color } : undefined} />;
    }
    return <Icons.Wrench className={className} style={color ? { color } : undefined} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading categories...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">Manage ticket categories for your tenant</p>
        </div>
        <button
          onClick={() => openModal()}
          disabled={!activeTenantId}
          className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} className="mr-2" />
          Create Category
        </button>
      </div>

      {!activeTenantId && (
        <div className="bg-warning/10 border border-warning text-warning rounded-card p-4 mb-6">
          Please select a tenant to manage categories.
        </div>
      )}

      {error && !showModal && (
        <div className="bg-danger/10 border border-danger text-danger rounded-card p-4 mb-6 flex items-center">
          <AlertCircle size={16} className="mr-2" />
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="bg-white rounded-card shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No categories found</p>
          <button
            onClick={() => openModal()}
            disabled={!activeTenantId}
            className="text-primary hover:underline disabled:opacity-50"
          >
            Create your first category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Icon</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Color</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tickets</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className="p-2 rounded-lg inline-flex items-center justify-center"
                      style={{ backgroundColor: `${category.color || '#3B82F6'}20` }}
                    >
                      {renderIcon(category.icon || 'wrench', 'w-5 h-5', category.color || '#3B82F6')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{category.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {category.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      ></div>
                      <span className="ml-2 text-xs text-gray-600">{category.color || '#3B82F6'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        category.is_active !== false
                          ? 'bg-success/10 text-success'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">
                      {ticketCounts[category.id] || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(category.id, category.is_active !== false)}
                        className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title={category.is_active !== false ? 'Disable' : 'Enable'}
                      >
                        {category.is_active !== false ? (
                          <PowerOff size={16} />
                        ) : (
                          <Power size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => openModal(category)}
                        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
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
                {editingCategory ? 'Edit Category' : 'Create Category'}
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
                  placeholder="Category name"
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
                  placeholder="Category description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <div className="grid grid-cols-5 gap-2 p-4 border border-gray-300 rounded-card max-h-40 overflow-y-auto">
                    {ICON_OPTIONS.map((icon) => {
                      const IconComponent = (Icons as any)[icon.charAt(0).toUpperCase() + icon.slice(1)] || Icons.Wrench;
                      return (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          className={`p-3 rounded-lg transition-colors ${
                            formData.icon === icon
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
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
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
