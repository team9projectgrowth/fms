import { Save, AlertTriangle, Info } from 'lucide-react';

export default function ConfigSLASettings() {
  const priorities = [
    { level: 'Critical', firstResponse: '15', resolution: '2', escalation: '1', reminder1: '10', reminderInterval: '15' },
    { level: 'High', firstResponse: '30', resolution: '4', escalation: '2', reminder1: '20', reminderInterval: '30' },
    { level: 'Medium', firstResponse: '60', resolution: '8', escalation: '4', reminder1: '45', reminderInterval: '60' },
    { level: 'Low', firstResponse: '120', resolution: '24', escalation: '12', reminder1: '90', reminderInterval: '120' }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">SLA SETTINGS</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-card p-4 mb-6">
        <div className="flex items-start">
          <Info size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-blue-900 mb-1">Module Inactive</div>
            <div className="text-sm text-blue-800">
              The SLA Settings module is currently inactive. SLA is now managed through Priority Levels configuration, where each priority has a simple due time (hours) mapping. 
              Please navigate to <strong>Priority Levels</strong> to configure SLA settings.
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">SLA Times by Priority</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">First Response (min)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Resolution (hrs)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Escalation (hrs)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">1st Reminder (min)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Interval (min)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {priorities.map((priority) => (
                <tr key={priority.level} className="border-b border-gray-200">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{priority.level}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={priority.firstResponse}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={priority.resolution}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={priority.escalation}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={priority.reminder1}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      defaultValue={priority.reminderInterval}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 flex items-center">
                      <Save size={14} className="mr-1" />
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Global Settings</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary border-gray-300 rounded mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">Use Business Hours</div>
              <div className="text-xs text-gray-500">SLA calculations will only count business hours</div>
            </div>
          </label>

          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary border-gray-300 rounded mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">Pause on Holidays</div>
              <div className="text-xs text-gray-500">SLA timer will pause on configured holidays</div>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">SLA Warning Threshold</label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                defaultValue="75"
                className="w-24 px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
              />
              <span className="text-sm text-gray-500">% of time elapsed</span>
            </div>
          </div>

          <div className="flex items-start p-3 bg-warning/10 border border-warning rounded-card">
            <AlertTriangle size={16} className="text-warning mr-2 mt-0.5" />
            <div className="text-sm text-gray-700">
              Changes to SLA settings will only affect new tickets. Existing tickets will continue using their original SLA values.
            </div>
          </div>

          <button className="px-6 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center">
            <Save size={16} className="mr-2" />
            Save Global Settings
          </button>
        </div>
      </div>
    </div>
  );
}
