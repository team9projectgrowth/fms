import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { usersService } from '../../services/users.service';
import { designationsService } from '../../services/designations.service';
import { useTenant } from '../../hooks/useTenant';
import type { Designation } from '../../types/database';

interface CreateEditComplainantFormProps {
  complainantId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateEditComplainantForm({ complainantId, onClose, onSuccess }: CreateEditComplainantFormProps) {
  const { activeTenantId } = useTenant();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    employeeId: '',
    designationId: '',
    telegramChatId: '',
    telegramBotName: '',
    active: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loadingDesignations, setLoadingDesignations] = useState(false);

  useEffect(() => {
    loadDesignations();
    if (complainantId) {
      loadComplainant();
    }
  }, [complainantId, activeTenantId]);

  const loadDesignations = async () => {
    try {
      setLoadingDesignations(true);
      const data = await designationsService.getActive(activeTenantId || undefined);
      setDesignations(data);
    } catch (err) {
      console.error('Failed to load designations:', err);
    } finally {
      setLoadingDesignations(false);
    }
  };

  const loadComplainant = async () => {
    try {
      setLoading(true);
      const user = await usersService.getUserById(complainantId!);
      if (user) {
        setFormData(prev => ({
          ...prev,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          department: user.department || '',
          employeeId: user.employee_id || '',
          designationId: (user as any).designation_id || '',
          telegramChatId: (user as any).telegram_chat_id?.toString() || '',
          telegramBotName: (user as any).telegram_user_id || '',
          active: user.active
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complainant');
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
      if (complainantId) {
        await usersService.updateUser(complainantId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          employee_id: formData.employeeId,
          designation_id: formData.designationId || null,
          telegram_chat_id: formData.telegramChatId || null,
          telegram_user_id: formData.telegramBotName || null,
          active: formData.active,
        });

        setSuccessMessage('Complainant updated successfully!');
      } else {
        if (!formData.password) {
          setError('Password is required for new complainants');
          setLoading(false);
          return;
        }

        await usersService.createUser({
          email: formData.email,
          password: formData.password,
          user_type: 'complainant',
          name: formData.name,
          phone: formData.phone,
          department: formData.department,
          employee_id: formData.employeeId,
          designation_id: formData.designationId || undefined,
          telegram_chat_id: formData.telegramChatId || undefined,
          telegram_user_id: formData.telegramBotName || undefined,
          active: formData.active,
        });

        setSuccessMessage('Complainant created successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      let errorMessage = 'Failed to save complainant';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      }
      
      if (errorMessage.includes('RLS') || errorMessage.includes('row-level security') || errorMessage.includes('permission denied')) {
        errorMessage += '. This might be a permissions issue. Please check your RLS policies.';
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
        errorMessage += '. A user with this email already exists.';
      } else if (errorMessage.includes('foreign key') || errorMessage.includes('tenant')) {
        errorMessage += '. There might be an issue with tenant assignment.';
      }
      
      console.error('Error in CreateEditComplainantForm:', {
        error: err,
        errorMessage,
        errorDetails: err?.details || err?.hint || err?.code,
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
            {complainantId ? 'Edit Complainant' : 'Create New Complainant'}
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
                disabled={!!complainantId}
              />
            </div>
          </div>

          {!complainantId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <input
                type="password"
                required={!complainantId}
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

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
              <select
                value={formData.designationId}
                onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                disabled={loadingDesignations}
              >
                <option value="">Select Designation</option>
                {designations.map((designation) => (
                  <option key={designation.id} value={designation.id}>
                    {designation.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-300 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Telegram Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chat ID</label>
                <input
                  type="text"
                  value={formData.telegramChatId}
                  onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="123456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bot Name</label>
                <input
                  type="text"
                  value={formData.telegramBotName}
                  onChange={(e) => setFormData({ ...formData, telegramBotName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="MyBot"
                />
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
              {loading ? 'Saving...' : complainantId ? 'Save Changes' : 'Create Complainant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

