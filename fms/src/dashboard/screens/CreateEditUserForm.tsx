import { useState, useEffect } from 'react';
import { X, Copy, Plus, AlertCircle } from 'lucide-react';
import { usersService } from '../../services/users.service';
import { executorsService } from '../../services/executors.service';
import type { UserType } from '../../types/database';

interface CreateEditUserFormProps {
  userId?: string;
  userType?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateEditUserForm({ userId, userType, onClose, onSuccess }: CreateEditUserFormProps) {
  const [formData, setFormData] = useState({
    type: (userType || 'complainant') as UserType,
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    employeeId: '',
    skills: [] as string[],
    maxTickets: 10,
    workStart: '09:00',
    workEnd: '17:00',
    telegramToken: '',
    active: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const user = await usersService.getUserById(userId!);
      if (user) {
        setFormData(prev => ({
          ...prev,
          type: user.user_type,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          department: user.department || '',
          employeeId: user.employee_id || '',
          active: user.active
        }));

        if (user.user_type === 'executor') {
          const executor = await executorsService.getExecutorByUserId(userId!);
          if (executor) {
            setFormData(prev => ({
              ...prev,
              skills: executor.skills || [],
              maxTickets: executor.max_tickets,
              workStart: executor.work_start,
              workEnd: executor.work_end,
              telegramToken: executor.telegram_token || ''
            }));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (userId) {
        await usersService.updateUser(userId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          employee_id: formData.employeeId,
          active: formData.active,
        });

        if (formData.type === 'executor') {
          const executor = await executorsService.getExecutorByUserId(userId);
          if (executor) {
            await executorsService.updateExecutor(executor.id, {
              skills: formData.skills,
              max_tickets: formData.maxTickets,
              work_start: formData.workStart,
              work_end: formData.workEnd,
            });
          }
        }

        setSuccessMessage('User updated successfully!');
      } else {
        if (!formData.password) {
          setError('Password is required for new users');
          setLoading(false);
          return;
        }

        const newUser = await usersService.createUser({
          email: formData.email,
          password: formData.password,
          user_type: formData.type,
          name: formData.name,
          phone: formData.phone,
          department: formData.department,
          employee_id: formData.employeeId,
          active: formData.active,
        });

        if (formData.type === 'executor') {
          await executorsService.createExecutor({
            user_id: newUser.id,
            skills: formData.skills,
            max_tickets: formData.maxTickets,
            work_start: formData.workStart,
            work_end: formData.workEnd,
          });
        }

        setSuccessMessage('User created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      let errorMessage = 'Failed to save user';
      
      // Extract more detailed error information
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      }
      
      // Add more context for common errors
      if (errorMessage.includes('RLS') || errorMessage.includes('row-level security') || errorMessage.includes('permission denied')) {
        errorMessage += '. This might be a permissions issue. Please check your RLS policies.';
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        errorMessage += '. A user with this email already exists.';
      } else if (errorMessage.includes('foreign key') || errorMessage.includes('tenant')) {
        errorMessage += '. There might be an issue with tenant assignment.';
      }
      
      console.error('Error in CreateEditUserForm:', {
        error: err,
        errorMessage,
        errorDetails: err?.details || err?.hint || err?.code,
        formData: {
          ...formData,
          password: formData.password ? '***' : undefined
        },
        stack: err?.stack
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {userId
              ? `Edit ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}`
              : `Create New ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}`
            }
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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

          {successMessage && (
            <div className="p-3 bg-success/10 border border-success text-success rounded-card">
              {successMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">User Type</label>
            <div className="grid grid-cols-3 gap-3">
              {['complainant', 'executor', 'admin'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type as UserType })}
                  disabled={!!userId}
                  className={`px-4 py-3 rounded-card border-2 text-sm font-medium transition-colors ${
                    formData.type === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  } ${!!userId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                placeholder="john@company.com"
                disabled={!!userId}
              />
            </div>
          </div>

          {!userId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <input
                type="password"
                required={!userId}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
              >
                <option value="">Select Department</option>
                <option>IT</option>
                <option>HR</option>
                <option>Finance</option>
                <option>Marketing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
            <input
              type="text"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
              placeholder="EMP-001"
            />
          </div>

          {formData.type === 'executor' && (
            <>
              <div className="border-t border-gray-300 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Executor Settings</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.skills.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center">
                        {skill}
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            skills: formData.skills.filter((_, i) => i !== index)
                          })}
                          className="ml-2 text-primary hover:text-primary/70"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add skill..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          if (input.value.trim()) {
                            setFormData({
                              ...formData,
                              skills: [...formData.skills, input.value.trim()]
                            });
                            input.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Tickets</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formData.maxTickets}
                      onChange={(e) => setFormData({ ...formData, maxTickets: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Start</label>
                    <input
                      type="time"
                      value={formData.workStart}
                      onChange={(e) => setFormData({ ...formData, workStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work End</label>
                    <input
                      type="time"
                      value={formData.workEnd}
                      onChange={(e) => setFormData({ ...formData, workEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Telegram Setup</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telegram Token</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.telegramToken}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-card bg-gray-50"
                      placeholder="Token will be generated"
                    />
                    <button
                      type="button"
                      className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90"
                    >
                      Generate
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Bot Link:</span>
                  <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-sm">
                    t.me/FacilityBot?start=ABC123
                  </code>
                  <button type="button" className="p-2 text-gray-700 hover:bg-gray-100 rounded">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center pt-4">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded mr-2"
            />
            <label className="text-sm font-medium text-gray-700">Active</label>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-300">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-card hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-card hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : userId ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
