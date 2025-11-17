import { Save, Plus, X, Calendar } from 'lucide-react';

export default function ConfigBusinessHours() {
  const days = [
    { day: 'Monday', working: true, start: '09:00', end: '17:00' },
    { day: 'Tuesday', working: true, start: '09:00', end: '17:00' },
    { day: 'Wednesday', working: true, start: '09:00', end: '17:00' },
    { day: 'Thursday', working: true, start: '09:00', end: '17:00' },
    { day: 'Friday', working: true, start: '09:00', end: '17:00' },
    { day: 'Saturday', working: false, start: '', end: '' },
    { day: 'Sunday', working: false, start: '', end: '' }
  ];

  const holidays = [
    { id: '1', date: '2024-12-25', name: 'Christmas Day' },
    { id: '2', date: '2025-01-01', name: 'New Year Day' },
    { id: '3', date: '2025-07-04', name: 'Independence Day' }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">BUSINESS HOURS</h1>

      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Working Hours</h2>
          <div className="flex items-center">
            <label className="text-sm text-gray-700 mr-2">Timezone:</label>
            <select className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary">
              <option>UTC-05:00 (EST)</option>
              <option>UTC-08:00 (PST)</option>
              <option>UTC+00:00 (GMT)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Day</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Working</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Start Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">End Time</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.day} className="border-b border-gray-200">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{day.day}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      defaultChecked={day.working}
                      className="w-4 h-4 text-primary border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      defaultValue={day.start}
                      disabled={!day.working}
                      className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      defaultValue={day.end}
                      disabled={!day.working}
                      className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button className="mt-4 px-6 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center">
          <Save size={16} className="mr-2" />
          Save Working Hours
        </button>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Holidays</h2>
          <button className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center text-sm">
            <Plus size={14} className="mr-1" />
            Add Holiday
          </button>
        </div>

        <div className="space-y-2">
          {holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-card hover:bg-gray-50">
              <div className="flex items-center">
                <Calendar size={16} className="text-gray-500 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{holiday.name}</div>
                  <div className="text-xs text-gray-500">{holiday.date}</div>
                </div>
              </div>
              <button className="p-1 text-danger hover:bg-danger/10 rounded">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">SLA Calculation Preview</h2>
        <div className="p-4 bg-gray-100 rounded-card">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <div className="text-gray-500 mb-1">Test Scenario</div>
              <div className="font-medium text-gray-900">Ticket created: Friday, 4:00 PM</div>
              <div className="font-medium text-gray-900">Resolution SLA: 8 hours</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Calculation</div>
              <div className="text-gray-700">Friday 4:00 PM → 5:00 PM (1hr)</div>
              <div className="text-gray-700">Saturday-Sunday: Skipped</div>
              <div className="text-gray-700">Monday 9:00 AM → 4:00 PM (7hrs)</div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-300">
            <span className="text-gray-500">Final Due Date:</span>
            <span className="ml-2 font-bold text-primary">Monday, 4:00 PM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
