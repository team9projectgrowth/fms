import { useState, useEffect } from 'react';
import { Edit, BarChart3 } from 'lucide-react';
import { configService } from '../../services/config.service';
import { useTenant } from '../../hooks/useTenant';
import type { Priority } from '../../types/database';

export default function ConfigPriorityLevels() {
  const { activeTenantId } = useTenant();
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriorities();
  }, [activeTenantId]);

  async function loadPriorities() {
    try {
      setLoading(true);
      const data = await configService.getAllPriorities(activeTenantId || undefined);
      setPriorities(data);
    } catch (error) {
      console.error('Failed to load priorities:', error);
    } finally {
      setLoading(false);
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">PRIORITY LEVELS</h1>

      <div className="space-y-4">
        {priorities.map((priority) => (
          <div key={priority.id} className="bg-white rounded-card shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <div className="text-4xl mr-4">{priority.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900 mr-3">{priority.name}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
                      Level {priority.level}
                    </span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      priority.active ? 'bg-success/10 text-success' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {priority.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Name</div>
                      <div className="text-sm font-medium text-gray-900">{priority.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Color</div>
                      <div className="flex items-center">
                        {priority.color ? (
                          <>
                            <div className="w-6 h-6 rounded mr-2" style={{ backgroundColor: priority.color }}></div>
                            <span className="text-xs text-gray-700">{priority.color}</span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">No color</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Resolution SLA</div>
                      <div className="text-sm font-medium text-gray-900">
                        {priority.sla_hours ? `${priority.sla_hours} hrs` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center pt-3 border-t border-gray-200">
                    <BarChart3 size={16} className="text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500">
                      Priority Level {priority.level}
                    </span>
                  </div>
                </div>
              </div>

              <button className="p-2 text-gray-700 hover:bg-gray-100 rounded ml-4">
                <Edit size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
