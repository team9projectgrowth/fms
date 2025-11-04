import { useState } from 'react';
import { Plus, Edit, GripVertical, X, AlertCircle } from 'lucide-react';

export default function ConfigAllocationRules() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categories: [] as string[],
    priorities: [] as string[],
    types: [] as string[],
    executors: [] as string[],
    strategy: '',
    priorityOrder: 1,
    active: true
  });

  const rules = [
    {
      id: '1',
      name: 'Critical HVAC Issues',
      conditions: { category: 'HVAC', priority: 'Critical', type: 'Any' },
      executors: ['Mike Johnson', 'Robert Lee'],
      strategy: 'Least Loaded',
      active: true,
      matched: 12
    },
    {
      id: '2',
      name: 'IT Support Requests',
      conditions: { category: 'IT Support', priority: 'Any', type: 'Any' },
      executors: ['Sarah Wilson', 'Tom Brown'],
      strategy: 'Round Robin',
      active: true,
      matched: 45
    }
  ];

  const categories = ['HVAC', 'Electrical', 'Plumbing', 'Furniture', 'IT Support', 'Cleaning', 'Security'];
  const priorities = ['Critical', 'High', 'Medium', 'Low'];
  const types = ['Maintenance', 'Repair', 'Installation', 'Inspection', 'Emergency'];
  const executorsList = ['Mike Johnson', 'Robert Lee', 'Sarah Wilson', 'Tom Brown', 'Jane Doe'];
  const strategies = ['Round Robin', 'Least Loaded', 'Skill Based', 'Priority Based'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New rule:', formData);
    alert('Rule created successfully!');
    setShowModal(false);
    setFormData({
      name: '',
      categories: [],
      priorities: [],
      types: [],
      executors: [],
      strategy: '',
      priorityOrder: 1,
      active: true
    });
  };

  const toggleSelection = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    } else {
      return [...array, item];
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ALLOCATION RULES</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Add Rule
        </button>
      </div>

      <div className="space-y-4">
        {rules.map((rule, index) => (
          <div key={rule.id} className="bg-white rounded-card shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <button className="text-gray-400 hover:text-gray-600 mr-4 cursor-move mt-1">
                  <GripVertical size={20} />
                </button>
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">{rule.name}</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Category</div>
                      <div className="text-sm font-medium text-gray-900">{rule.conditions.category}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Priority</div>
                      <div className="text-sm font-medium text-gray-900">{rule.conditions.priority}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Type</div>
                      <div className="text-sm font-medium text-gray-900">{rule.conditions.type}</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Assigned Executors</div>
                    <div className="flex flex-wrap gap-2">
                      {rule.executors.map((executor, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {executor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm">
                    <div>
                      <span className="text-gray-500">Strategy:</span>
                      <span className="ml-2 font-medium text-gray-900">{rule.strategy}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Matched:</span>
                      <span className="ml-2 font-medium text-gray-900">{rule.matched} tickets</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={rule.active} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
                <button className="p-2 text-gray-700 hover:bg-gray-100 rounded">
                  <Edit size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-card shadow-xl max-w-3xl w-full my-8">
            <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between rounded-t-card">
              <h2 className="text-xl font-bold text-gray-900">Add Allocation Rule</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Rule Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="e.g., Critical HVAC Issues"
                />
              </div>

              <div className="border-t border-gray-300 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Conditions</h3>
                <p className="text-sm text-gray-500 mb-4">Select the criteria that tickets must match for this rule to apply</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            categories: toggleSelection(formData.categories, cat)
                          })}
                          className={`px-3 py-2 rounded-card text-sm font-medium transition-colors ${
                            formData.categories.includes(cat)
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.categories.length === 0 ? 'Any category' : `${formData.categories.length} selected`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priorities</label>
                    <div className="flex flex-wrap gap-2">
                      {priorities.map(priority => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            priorities: toggleSelection(formData.priorities, priority)
                          })}
                          className={`px-3 py-2 rounded-card text-sm font-medium transition-colors ${
                            formData.priorities.includes(priority)
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.priorities.length === 0 ? 'Any priority' : `${formData.priorities.length} selected`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Types</label>
                    <div className="flex flex-wrap gap-2">
                      {types.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            types: toggleSelection(formData.types, type)
                          })}
                          className={`px-3 py-2 rounded-card text-sm font-medium transition-colors ${
                            formData.types.includes(type)
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.types.length === 0 ? 'Any type' : `${formData.types.length} selected`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Executor Pool</h3>
                <div className="flex flex-wrap gap-2">
                  {executorsList.map(executor => (
                    <button
                      key={executor}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        executors: toggleSelection(formData.executors, executor)
                      })}
                      className={`px-3 py-2 rounded-card text-sm font-medium transition-colors ${
                        formData.executors.includes(executor)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {executor}
                    </button>
                  ))}
                </div>
                {formData.executors.length === 0 && (
                  <p className="text-xs text-danger mt-2 flex items-center">
                    <AlertCircle size={12} className="mr-1" />
                    Select at least one executor
                  </p>
                )}
              </div>

              <div className="border-t border-gray-300 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocation Strategy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Strategy <span className="text-danger">*</span>
                    </label>
                    <select
                      required
                      value={formData.strategy}
                      onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                    >
                      <option value="">Select Strategy</option>
                      {strategies.map(strategy => (
                        <option key={strategy} value={strategy}>{strategy}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.priorityOrder}
                      onChange={(e) => setFormData({ ...formData, priorityOrder: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower numbers = higher priority</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center pt-4">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Active (rule will be applied immediately)</label>
              </div>

              <div className="border-t border-gray-300 pt-6">
                <div className="bg-info/10 border border-info rounded-card p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Test Rule Preview</h4>
                  <p className="text-xs text-gray-700">
                    This rule will match tickets with:
                  </p>
                  <ul className="text-xs text-gray-700 mt-2 space-y-1 ml-4">
                    <li>• Categories: {formData.categories.length === 0 ? 'Any' : formData.categories.join(', ')}</li>
                    <li>• Priorities: {formData.priorities.length === 0 ? 'Any' : formData.priorities.join(', ')}</li>
                    <li>• Types: {formData.types.length === 0 ? 'Any' : formData.types.join(', ')}</li>
                    <li>• Will assign to: {formData.executors.length === 0 ? 'No one' : formData.executors.join(', ')}</li>
                    <li>• Using: {formData.strategy || 'No strategy selected'}</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-300">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-card hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.executors.length === 0 || !formData.strategy}
                  className="px-6 py-2 bg-primary text-white rounded-card hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
