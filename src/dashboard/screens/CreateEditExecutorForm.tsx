import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { usersService } from '../../services/users.service';
import { executorsService } from '../../services/executors.service';
import { categoriesService } from '../../services/categories.service';
import { executorSkillsService, type ExecutorSkill } from '../../services/executor-skills.service';
import { useTenant } from '../../hooks/useTenant';
import type { Category } from '../../types/database';
import { userOnboardingService } from '../../services/user-onboarding.service';

interface CreateEditExecutorFormProps {
  executorId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateEditExecutorForm({ executorId, onClose, onSuccess }: CreateEditExecutorFormProps) {
  const { activeTenantId } = useTenant();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    employeeId: '',
    categoryId: '',
    skills: [] as string[], // Array of category IDs
    maxTickets: 10,
    workStart: '09:00',
    workEnd: '17:00',
    telegramChatId: '',
    telegramBotName: '',
    active: !!executorId
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [executorSkills, setExecutorSkills] = useState<ExecutorSkill[]>([]);
  const [allExecutorSkills, setAllExecutorSkills] = useState<ExecutorSkill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [onboardingInfo, setOnboardingInfo] = useState<{
    status?: string;
    error?: string;
    completedAt?: string;
    deepLink?: string;
  } | null>(executorId ? null : { status: 'pending' });

  useEffect(() => {
    loadCategories();
    loadExecutorSkills();
    if (executorId) {
      loadExecutor();
    }
  }, [executorId, activeTenantId]);

  useEffect(() => {
    // Filter skills based on selected category
    if (formData.categoryId) {
      const filtered = allExecutorSkills.filter(skill => 
        skill.category === formData.categoryId
      );
      setExecutorSkills(filtered);
    } else {
      // If no category selected, show all skills
      setExecutorSkills(allExecutorSkills);
    }
  }, [formData.categoryId, allExecutorSkills]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await categoriesService.getActive(activeTenantId || undefined);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadExecutorSkills = async () => {
    try {
      setLoadingSkills(true);
      const data = await executorSkillsService.getActive(activeTenantId || undefined);
      setAllExecutorSkills(data);
      // Initially show all skills, will be filtered by category when category is selected
      setExecutorSkills(data);
    } catch (err) {
      console.error('Failed to load executor skills:', err);
    } finally {
      setLoadingSkills(false);
    }
  };

  const loadExecutor = async () => {
    try {
      setLoading(true);
      const executor = await executorsService.getExecutorById(executorId!);
      if (executor && executor.user) {
        const user = executor.user;
        setFormData(prev => ({
          ...prev,
          name: user.full_name || user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          department: user.department || '',
          employeeId: user.emp_code || user.employee_id || '',
          telegramChatId: (user as any).telegram_chat_id?.toString() || '',
          telegramBotName: (user as any).telegram_user_id || '',
          active: user.is_active !== false,
        }));

        const skillIds = Array.isArray((executor as any).skills) ? (executor as any).skills : [];

        const categoryId = (executor as any).category_id || '';
        setFormData(prev => ({
          ...prev,
          categoryId: categoryId,
          skills: skillIds,
          maxTickets: (executor as any).max_concurrent_tickets || executor.max_tickets || 10,
          workStart: executor.work_start || '09:00',
          workEnd: executor.work_end || '17:00',
        }));

        setOnboardingInfo({
          status: (user as any).bot_onboarding_status,
          error: (user as any).bot_onboarding_error,
          completedAt: (user as any).bot_onboarding_completed_at,
          deepLink: (user as any).bot_deep_link,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executor');
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
      if (executorId) {
        const executor = await executorsService.getExecutorById(executorId);
        if (!executor || !executor.user) {
          throw new Error('Executor not found');
        }

        await usersService.updateUser(executor.user.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          employee_id: formData.employeeId,
          telegram_chat_id: formData.telegramChatId || null,
          telegram_user_id: formData.telegramBotName || null,
          active: formData.active,
        });

        await executorsService.updateExecutor(executorId, {
          category_id: formData.categoryId || null,
          skills: formData.skills,
          max_concurrent_tickets: formData.maxTickets,
        } as any);

        setSuccessMessage('Executor updated successfully!');
      } else {
        if (!formData.password) {
          setError('Password is required for new executors');
          setLoading(false);
          return;
        }

        const newUser = await usersService.createUser({
          email: formData.email,
          password: formData.password,
          user_type: 'executor',
          name: formData.name,
          phone: formData.phone,
          department: formData.department,
          employee_id: formData.employeeId,
          telegram_chat_id: formData.telegramChatId || undefined,
          telegram_user_id: formData.telegramBotName || undefined,
          active: formData.active,
        });

        const tenantId = (newUser as any).tenant_id;
        
        if (!tenantId) {
          throw new Error('Tenant ID is required to create an executor profile. The user was created but tenant_id is missing.');
        }
        
        try {
          await executorsService.createExecutor({
            tenant_id: tenantId,
            user_id: newUser.id,
            category_id: formData.categoryId || undefined,
            skills: formData.skills || [],
            max_concurrent_tickets: formData.maxTickets || 10,
            full_name: formData.name,
          });
        } catch (executorError) {
          console.error('Error creating executor profile:', executorError);
          throw new Error(`Failed to create executor profile: ${executorError instanceof Error ? executorError.message : 'Unknown error'}`);
        }

        let onboardingError: string | null = null;
        let onboardingSummary = 'Telegram onboarding invite queued.';
        let onboardingResultStatus: 'queued' | 'already_completed' | undefined;

        try {
          const onboardingResult = await userOnboardingService.startOnboarding(newUser.id, 'user_created');
          onboardingResultStatus = onboardingResult.status;
          if (onboardingResult.status === 'already_completed') {
            onboardingSummary = 'User already has an active Telegram chat ID on file.';
          }
        } catch (onboardingErr) {
          onboardingError = onboardingErr instanceof Error ? onboardingErr.message : 'Unknown error while triggering onboarding.';
          onboardingSummary = 'Executor created, but onboarding invite failed to dispatch. Check notifications.';
          console.error('Executor onboarding webhook failed:', onboardingErr);
        }

        setSuccessMessage(`Executor created successfully. ${onboardingSummary}`);

        const shouldCloseModal = onboardingError === null;

        if (onboardingError) {
          setError(`Onboarding webhook error: ${onboardingError}`);
          setOnboardingInfo({
            status: 'failed',
            error: onboardingError,
          });
        } else if (onboardingResultStatus === 'already_completed') {
          setOnboardingInfo({
            status: 'completed',
          });
        } else {
          setOnboardingInfo({
            status: 'invited',
          });
        }

        if (shouldCloseModal) {
          setTimeout(() => {
            onClose();
          }, 1500);
        }

        if (onSuccess) {
          onSuccess();
        }

        return;
      }

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      let errorMessage = 'Failed to save executor';
      
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
      
      console.error('Error in CreateEditExecutorForm:', {
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
            {executorId ? 'Edit Executor' : 'Create New Executor'}
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
                disabled={!!executorId}
              />
            </div>
          </div>

          {!executorId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
              <input
                type="password"
                required={!executorId}
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

          <div className="border-t border-gray-300 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Telegram Settings</h3>

          {onboardingInfo?.status && (
            <div className="mb-4 rounded-card border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Bot Onboarding Status</span>
                <span className={`ml-3 rounded-full px-2 py-1 text-xs font-semibold uppercase ${getStatusBadgeClasses(onboardingInfo.status)}`}>
                  {formatStatus(onboardingInfo.status)}
                </span>
              </div>
              {onboardingInfo.completedAt && (
                <p className="text-xs text-gray-600 mt-2">
                  Completed at {new Date(onboardingInfo.completedAt).toLocaleString()}
                </p>
              )}
              {onboardingInfo.error && (
                <p className="text-xs text-danger mt-2">
                  Last error: {onboardingInfo.error}
                </p>
              )}
              {!executorId && (
                <p className="text-xs text-gray-500 mt-2">
                  Watch the dashboard notifications for live onboarding updates.
                </p>
              )}
            </div>
          )}

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

          <div className="border-t border-gray-300 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Executor Settings</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => {
                  const newCategoryId = e.target.value;
                  // Clear skills when category changes, as they may not belong to new category
                  setFormData({ ...formData, categoryId: newCategoryId, skills: [] });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                disabled={loadingCategories}
              >
                <option value="">Select Category (Optional)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select a category to filter skills. Skills will be filtered based on the selected category.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills {formData.categoryId && `(from ${categories.find(c => c.id === formData.categoryId)?.name || 'selected category'})`}
              </label>
              <select
                multiple
                value={formData.skills}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, skills: selected });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary min-h-[120px]"
                disabled={loadingSkills || (!formData.categoryId && executorSkills.length === 0)}
              >
                {executorSkills.length === 0 ? (
                  <option value="" disabled>
                    {formData.categoryId 
                      ? `No skills found for selected category. Please create skills for this category first.`
                      : `Please select a category first to see available skills.`
                    }
                  </option>
                ) : (
                  executorSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.categoryId 
                  ? `Showing skills from selected category. Hold Ctrl/Cmd to select multiple skills.`
                  : `Select a category above to see available skills. Hold Ctrl/Cmd to select multiple skills.`
                }
              </p>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skillId) => {
                    // Try to find skill in filtered list first, then in all skills
                    const skill = executorSkills.find(s => s.id === skillId) || 
                                 allExecutorSkills.find(s => s.id === skillId);
                    return skill ? (
                      <span key={skillId} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center">
                        {skill.name}
                        {formData.categoryId && skill.category !== formData.categoryId && (
                          <span className="ml-1 text-xs text-orange-600">(different category)</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            skills: formData.skills.filter(id => id !== skillId)
                          })}
                          className="ml-2 text-primary hover:text-primary/70"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
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

        <div className="pt-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded mr-2"
              disabled={!executorId}
            />
            <label className="text-sm font-medium text-gray-700">
              Active {executorId ? '' : '(auto-enabled after Telegram setup)'}
            </label>
          </div>
          {!executorId && (
            <p className="text-xs text-gray-500 ml-6 mt-1">
              New executors stay inactive until the chatbot confirms their Telegram chat ID.
            </p>
          )}
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
              {loading ? 'Saving...' : executorId ? 'Save Changes' : 'Create Executor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatStatus(status?: string) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'invited':
      return 'Invite Sent';
    case 'awaiting_chat':
      return 'Awaiting Chat';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
}

function getStatusBadgeClasses(status?: string) {
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success';
    case 'failed':
      return 'bg-danger/10 text-danger';
    case 'awaiting_chat':
      return 'bg-warning/10 text-warning';
    case 'pending':
    case 'invited':
      return 'bg-primary/10 text-primary';
    default:
      return 'bg-gray-200 text-gray-700';
  }
}

