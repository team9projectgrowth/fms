import { useState, useEffect } from 'react';
import { Plus, X, Trash2, GripVertical } from 'lucide-react';
import { executorSkillsService } from '../../services/executor-skills.service';
import { executorsService } from '../../services/executors.service';
import { categoriesService } from '../../services/categories.service';
import type { ActionType, ExecutorAssignmentStrategy, TicketPriority, TicketStatus } from '../../types/database';

interface Action {
  id: string;
  action_type: ActionType;
  action_params: Record<string, any>;
  step_order: number;
  trigger_after_minutes?: number;
  action_condition?: string;
}

interface RuleActionConfigProps {
  actions: Action[];
  onChange: (actions: Action[]) => void;
  tenantId?: string;
}

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'assign_executor', label: 'Assign Executor' },
  { value: 'set_priority', label: 'Set Priority' },
  { value: 'set_due_date', label: 'Set Due Date' },
  { value: 'escalate', label: 'Escalate' },
  { value: 'notify', label: 'Notify' },
  { value: 'set_status', label: 'Set Status' },
];

const ASSIGNMENT_STRATEGIES: { value: ExecutorAssignmentStrategy; label: string }[] = [
  { value: 'skill_match', label: 'Skill Match' },
  { value: 'load_balance', label: 'Load Balance' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'specific_executor', label: 'Specific Executor' },
];

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function RuleActionConfig({
  actions,
  onChange,
  tenantId,
}: RuleActionConfigProps) {
  const [executors, setExecutors] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [nextStepOrder, setNextStepOrder] = useState(actions.length > 0 ? Math.max(...actions.map(a => a.step_order)) + 1 : 1);

  useEffect(() => {
    if (tenantId) {
      loadExecutors();
      loadSkills();
    }
  }, [tenantId]);

  async function loadExecutors() {
    try {
      const data = await executorsService.getExecutors(tenantId);
      setExecutors(data);
    } catch (err) {
      console.error('Failed to load executors:', err);
    }
  }

  async function loadSkills() {
    try {
      const data = await executorSkillsService.getActive(tenantId);
      setSkills(data);
    } catch (err) {
      console.error('Failed to load skills:', err);
    }
  }

  function addAction() {
    const newAction: Action = {
      id: `action-${Date.now()}`,
      action_type: 'set_priority',
      action_params: {},
      step_order: nextStepOrder,
    };
    setNextStepOrder(nextStepOrder + 1);
    onChange([...actions, newAction]);
  }

  function updateAction(id: string, updates: Partial<Action>) {
    onChange(
      actions.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }

  function removeAction(id: string) {
    const updated = actions.filter((a) => a.id !== id);
    // Renumber step orders
    const renumbered = updated.map((a, index) => ({
      ...a,
      step_order: index + 1,
    }));
    onChange(renumbered);
    setNextStepOrder(renumbered.length + 1);
  }

  function updateActionParams(id: string, params: Record<string, any>) {
    const action = actions.find((a) => a.id === id);
    if (action) {
      updateAction(id, {
        action_params: { ...action.action_params, ...params },
      });
    }
  }

  function renderActionConfig(action: Action) {
    switch (action.action_type) {
      case 'assign_executor':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Assignment Strategy
              </label>
              <select
                value={action.action_params.strategy || 'skill_match'}
                onChange={(e) =>
                  updateActionParams(action.id, { strategy: e.target.value })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
              >
                {ASSIGNMENT_STRATEGIES.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
            </div>

            {action.action_params.strategy === 'specific_executor' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Executor
                </label>
                <select
                  value={action.action_params.executor_id || ''}
                  onChange={(e) =>
                    updateActionParams(action.id, { executor_id: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
                >
                  <option value="">Select Executor</option>
                  {executors.map((exec) => (
                    <option key={exec.id} value={exec.id}>
                      {exec.user?.full_name || exec.user?.name || exec.email || exec.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(action.action_params.strategy === 'skill_match') && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Required Skills (Select multiple)
                </label>
                <select
                  multiple
                  value={action.action_params.skill_ids || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    updateActionParams(action.id, { skill_ids: selected });
                  }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary min-h-[100px]"
                >
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            )}
          </div>
        );

      case 'set_priority':
        return (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={action.action_params.priority || 'medium'}
              onChange={(e) =>
                updateActionParams(action.id, { priority: e.target.value })
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
            >
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'set_due_date':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Calculation Method
              </label>
              <select
                value={action.action_params.calculation || 'hours_from_now'}
                onChange={(e) =>
                  updateActionParams(action.id, { calculation: e.target.value })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
              >
                <option value="hours_from_now">Hours from now</option>
                <option value="days_from_now">Days from now</option>
                <option value="business_hours_from_now">Business hours from now</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="number"
                min="1"
                value={action.action_params.value || 24}
                onChange={(e) =>
                  updateActionParams(action.id, { value: parseInt(e.target.value) })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        );

      case 'escalate':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Escalate To
              </label>
              <select
                value={action.action_params.escalate_to || 'manager'}
                onChange={(e) =>
                  updateActionParams(action.id, { escalate_to: e.target.value })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
              >
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Priority Level Increase (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="3"
                value={action.action_params.priority_level || 0}
                onChange={(e) =>
                  updateActionParams(action.id, { priority_level: parseInt(e.target.value) })
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
                placeholder="0"
              />
            </div>
          </div>
        );

      case 'notify':
        return (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Recipients (User IDs or emails, comma-separated)
            </label>
            <input
              type="text"
              value={Array.isArray(action.action_params.recipients) ? action.action_params.recipients.join(', ') : ''}
              onChange={(e) => {
                const recipients = e.target.value.split(',').map(r => r.trim()).filter(r => r);
                updateActionParams(action.id, { recipients });
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
              placeholder="user1@example.com, user2@example.com"
            />
          </div>
        );

      case 'set_status':
        return (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={action.action_params.status || 'open'}
              onChange={(e) =>
                updateActionParams(action.id, { status: e.target.value })
              }
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      {actions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <p>No actions defined.</p>
          <p className="text-sm mt-2">Add actions to execute when conditions match.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions
            .sort((a, b) => a.step_order - b.step_order)
            .map((action) => (
              <div
                key={action.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 mt-2">
                    <GripVertical size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">
                      Step {action.step_order}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Action Type
                        </label>
                        <select
                          value={action.action_type}
                          onChange={(e) => {
                            updateAction(action.id, {
                              action_type: e.target.value as ActionType,
                              action_params: {}, // Reset params when type changes
                            });
                          }}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
                        >
                          {ACTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Trigger After (minutes)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={action.trigger_after_minutes || 0}
                          onChange={(e) =>
                            updateAction(action.id, {
                              trigger_after_minutes: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
                          placeholder="0"
                        />
                      </div>

                      <div className="col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Action Configuration
                        </label>
                        {renderActionConfig(action)}
                      </div>

                      <div className="col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeAction(action.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Remove action"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <button
        type="button"
        onClick={addAction}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Action
      </button>
    </div>
  );
}

