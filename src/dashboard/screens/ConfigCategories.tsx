import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { categoriesService } from '../../services/categories.service';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'wrench',
    color: '#3B82F6',
    keywords: [] as string[],
    active: true,
    ai_available: false,
  });

  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await categoriesService.getAll();
      setCategories(data);

      const counts: Record<string, number> = {};
      for (const category of data) {
        const count = await categoriesService.getTicketCount(category.name, 30);
        counts[category.id] = count;
      }
      setTicketCounts(counts);
    } catch (error) {
      console.error('Failed to load categories:', error);
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
        keywords: category.keywords || [],
        active: category.active,
        ai_available: category.ai_available || false,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        icon: 'wrench',
        color: '#3B82F6',
        keywords: [],
        active: true,
        ai_available: false,
      });
    }
    setKeywordInput('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingCategory(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoriesService.update(editingCategory.id, formData);
      } else {
        await categoriesService.create({
          ...formData,
          sort_order: categories.length + 1,
        });
      }
      await loadCategories();
      closeModal();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Failed to save category. Please try again.');
    }
  }

  function addKeyword() {
    const keyword = keywordInput.trim().toLowerCase();
    if (keyword && !formData.keywords.includes(keyword)) {
      setFormData({ ...formData, keywords: [...formData.keywords, keyword] });
      setKeywordInput('');
    }
  }

  function removeKeyword(keyword: string) {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter(k => k !== keyword),
    });
  }

  function handleDragStart(categoryId: string) {
    setDraggedItem(categoryId);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (draggedItem === targetId) return;

    const draggedIndex = categories.findIndex(c => c.id === draggedItem);
    const targetIndex = categories.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, removed);

    setCategories(newCategories);
  }

  async function handleDragEnd() {
    if (draggedItem) {
      const categoryIds = categories.map(c => c.id);
      await categoriesService.updateSortOrder(categoryIds);
      setDraggedItem(null);
    }
  }

  function renderIcon(iconName: string, className: string = '', color?: string) {
    const Icon = (Icons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
    if (Icon) {
      return <Icon className={className} style={color ? { color } : undefined} />;
    }
    return <Icons.Wrench className={className} style={color ? { color } : undefined} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-600 mt-2">Manage ticket categories and classification</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Icons.Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div
            key={category.id}
            draggable
            onDragStart={() => handleDragStart(category.id)}
            onDragOver={(e) => handleDragOver(e, category.id)}
            onDragEnd={handleDragEnd}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-move"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${category.color}20` }}
              >
                {renderIcon(category.icon || 'wrench', 'w-6 h-6', category.color || '#3B82F6')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(category)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Icons.Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors cursor-grab">
                  <Icons.GripVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {category.name}
            </h3>
            <p className="text-sm text-slate-600 mb-4 line-clamp-2">
              {category.description || 'No description'}
            </p>

            {category.keywords && category.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {category.keywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded"
                  >
                    {keyword}
                  </span>
                ))}
                {category.keywords.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                    +{category.keywords.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    category.active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {category.active ? 'Active' : 'Inactive'}
                </span>
                {category.ai_available && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    AI
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{ticketCounts[category.id] || 0}</span> tickets
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Icon
                  </label>
                  <div className="grid grid-cols-5 gap-2 p-4 border border-slate-300 rounded-lg max-h-40 overflow-y-auto">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-3 rounded-lg transition-colors ${
                          formData.icon === icon
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {renderIcon(icon, 'w-5 h-5')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-4 border border-slate-300 rounded-lg">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`p-3 rounded-lg transition-all ${
                          formData.color === color.value
                            ? 'ring-2 ring-slate-900 ring-offset-2'
                            : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Keywords
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Add keyword..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        <Icons.X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700">Active</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.ai_available}
                    onChange={(e) => setFormData({ ...formData, ai_available: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700">AI Available</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
