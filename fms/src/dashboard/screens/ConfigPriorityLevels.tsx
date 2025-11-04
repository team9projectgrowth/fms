import { Edit, BarChart3 } from 'lucide-react';

export default function ConfigPriorityLevels() {
  const priorities = [
    { id: '1', icon: '🔴', color: '#FF3333', name: 'Critical', displayName: 'Critical', level: 1, keywords: 'urgent, emergency, critical', sla: '2hrs', tickets: 45, active: true },
    { id: '2', icon: '🟠', color: '#FFAA00', name: 'High', displayName: 'High Priority', level: 2, keywords: 'high, important, asap', sla: '4hrs', tickets: 78, active: true },
    { id: '3', icon: '🟡', color: '#FFD700', name: 'Medium', displayName: 'Medium Priority', level: 3, keywords: 'medium, normal', sla: '8hrs', tickets: 123, active: true },
    { id: '4', icon: '🟢', color: '#00CC66', name: 'Low', displayName: 'Low Priority', level: 4, keywords: 'low, minor, routine', sla: '24hrs', tickets: 89, active: true }
  ];

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
                    <h3 className="text-xl font-bold text-gray-900 mr-3">{priority.displayName}</h3>
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
                      <div className="text-xs text-gray-500 mb-1">Internal Name</div>
                      <div className="text-sm font-medium text-gray-900">{priority.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Color</div>
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded mr-2" style={{ backgroundColor: priority.color }}></div>
                        <span className="text-xs text-gray-700">{priority.color}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Resolution SLA</div>
                      <div className="text-sm font-medium text-gray-900">{priority.sla}</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">AI Keywords</div>
                    <div className="text-sm text-gray-700">{priority.keywords}</div>
                  </div>

                  <div className="flex items-center pt-3 border-t border-gray-200">
                    <BarChart3 size={16} className="text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500">
                      {priority.tickets} tickets in last 30 days
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
