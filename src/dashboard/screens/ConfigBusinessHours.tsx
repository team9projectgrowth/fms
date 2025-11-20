import { useState, useEffect } from 'react';
import { Save, Plus, X, Calendar } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { businessHoursService, type Holiday } from '../../services/business-hours.service';

interface WorkingDay {
  day: string;
  working: boolean;
  start: string;
  end: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ConfigBusinessHours() {
  const { activeTenantId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [days, setDays] = useState<WorkingDay[]>([
    { day: 'Monday', working: true, start: '09:00', end: '17:00' },
    { day: 'Tuesday', working: true, start: '09:00', end: '17:00' },
    { day: 'Wednesday', working: true, start: '09:00', end: '17:00' },
    { day: 'Thursday', working: true, start: '09:00', end: '17:00' },
    { day: 'Friday', working: true, start: '09:00', end: '17:00' },
    { day: 'Saturday', working: false, start: '09:00', end: '17:00' },
    { day: 'Sunday', working: false, start: '09:00', end: '17:00' }
  ]);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [timezone, setTimezone] = useState('UTC+05:30 (IST)');
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

  // Load business hours and holidays from API
  useEffect(() => {
    if (activeTenantId) {
      loadData();
    } else {
      // No tenant selected - show message and stop loading
      setLoading(false);
      setError('Please select a tenant to manage business hours.');
    }
  }, [activeTenantId]);

  async function loadData() {
    if (!activeTenantId) return;

    setLoading(true);
    setError(null);
    try {
      // Load business hours
      const businessHours = await businessHoursService.getAll(activeTenantId);
      
      if (businessHours.length > 0) {
        // Map database data to component state
        const daysMap = new Map(businessHours.map(bh => [bh.day_of_week, bh]));
        const updatedDays = DAYS_OF_WEEK.map(day => {
          const bh = daysMap.get(day);
          if (bh) {
            return {
              day,
              working: bh.is_working_day,
              start: bh.start_time || '09:00',
              end: bh.end_time || '17:00'
            };
          }
          return {
            day,
            working: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day),
            start: '09:00',
            end: '17:00'
          };
        });
        setDays(updatedDays);
        
        // Set timezone from first record (all should have same timezone)
        if (businessHours[0].timezone) {
          setTimezone(businessHours[0].timezone);
        }
      }

      // Load holidays
      const loadedHolidays = await businessHoursService.getAllHolidays(activeTenantId);
      setHolidays(loadedHolidays);
    } catch (err: any) {
      console.error('Failed to load business hours:', err);
      setError(err?.message || 'Failed to load business hours. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleWorkingDayChange = (index: number, field: keyof WorkingDay, value: boolean | string) => {
    const updatedDays = [...days];
    updatedDays[index] = { ...updatedDays[index], [field]: value };
    
    // If unchecking working, clear times; if checking, set default times if empty
    if (field === 'working') {
      if (!value) {
        updatedDays[index].start = '';
        updatedDays[index].end = '';
      } else if (!updatedDays[index].start && !updatedDays[index].end) {
        updatedDays[index].start = '09:00';
        updatedDays[index].end = '17:00';
      }
    }
    
    setDays(updatedDays);
  };

  const handleSaveWorkingHours = async () => {
    if (!activeTenantId) {
      setError('Tenant ID is required. Please select a tenant.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await businessHoursService.upsertWorkingHours(
        activeTenantId,
        days.map(day => ({
          day_of_week: day.day,
          is_working_day: day.working,
          start_time: day.working ? day.start : null,
          end_time: day.working ? day.end : null,
        })),
        timezone
      );

      setSuccessMessage('Working hours saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving working hours:', err);
      setError(err?.message || 'Failed to save working hours. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!activeTenantId) {
      setError('Tenant ID is required. Please select a tenant.');
      return;
    }

    if (!newHoliday.date || !newHoliday.name.trim()) {
      setError('Please fill in both date and name for the holiday.');
      return;
    }

    setError(null);
    try {
      const holiday = await businessHoursService.createHoliday(activeTenantId, {
        date: newHoliday.date,
        name: newHoliday.name.trim()
      });

      setHolidays([...holidays, holiday]);
      setNewHoliday({ date: '', name: '' });
      setShowAddHoliday(false);
      setSuccessMessage('Holiday added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error adding holiday:', err);
      setError(err?.message || 'Failed to add holiday. Please try again.');
    }
  };

  const handleRemoveHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return;
    }

    setError(null);
    try {
      await businessHoursService.deleteHoliday(id);
      setHolidays(holidays.filter(h => h.id !== id));
      setSuccessMessage('Holiday removed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error removing holiday:', err);
      setError(err?.message || 'Failed to remove holiday. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading business hours...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">BUSINESS HOURS</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-card text-red-700 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-card text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Working Hours</h2>
          <div className="flex items-center">
            <label className="text-sm text-gray-700 mr-2">Timezone:</label>
            <select 
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
            >
              <option value="UTC-05:00 (EST)">UTC-05:00 (EST)</option>
              <option value="UTC-08:00 (PST)">UTC-08:00 (PST)</option>
              <option value="UTC+00:00 (GMT)">UTC+00:00 (GMT)</option>
              <option value="UTC+05:30 (IST)">UTC+05:30 (IST)</option>
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
              {days.map((day, index) => (
                <tr key={day.day} className="border-b border-gray-200">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{day.day}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={day.working}
                      onChange={(e) => handleWorkingDayChange(index, 'working', e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={day.start}
                      onChange={(e) => handleWorkingDayChange(index, 'start', e.target.value)}
                      disabled={!day.working}
                      className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={day.end}
                      onChange={(e) => handleWorkingDayChange(index, 'end', e.target.value)}
                      disabled={!day.working}
                      className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button 
          onClick={handleSaveWorkingHours}
          disabled={saving || !activeTenantId}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Working Hours'}
        </button>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Holidays</h2>
          <button 
            onClick={() => setShowAddHoliday(!showAddHoliday)}
            disabled={!activeTenantId}
            className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center text-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus size={14} className="mr-1" />
            Add Holiday
          </button>
        </div>

        {showAddHoliday && (
          <div className="mb-4 p-4 border border-gray-200 rounded-card bg-gray-50">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  placeholder="e.g., Independence Day"
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddHoliday}
                className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 text-sm transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddHoliday(false);
                  setNewHoliday({ date: '', name: '' });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-card hover:bg-gray-300 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {holidays.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No holidays added yet. Click "Add Holiday" to add one.
            </div>
          ) : (
            holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-card hover:bg-gray-50">
                <div className="flex items-center">
                  <Calendar size={16} className="text-gray-500 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{holiday.name}</div>
                    <div className="text-xs text-gray-500">{holiday.date}</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveHoliday(holiday.id)}
                  className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                  title="Remove holiday"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
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
