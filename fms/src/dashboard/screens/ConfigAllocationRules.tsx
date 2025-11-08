import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, X, AlertCircle, Power, PowerOff, Eye, GripVertical } from 'lucide-react';
import { allocationRulesService } from '../../services/allocation-rules.service';
import { ruleEngineService } from '../../services/rule-engine.service';
import { useTenant } from '../../hooks/useTenant';
import type { Rule, RuleWithDetails, RuleTriggerEvent, RuleType, ExecutionStatus } from '../../types/database';
import RuleConditionBuilder from '../components/RuleConditionBuilder';
import RuleActionConfig from '../components/RuleActionConfig';

const TRIGGER_EVENTS: { value: RuleTriggerEvent; label: string }[] = [
  { value: 'on_create', label: 'On Ticket Creation' },
  { value: 'on_update', label: 'On Ticket Update' },
  { value: 'on_status_change', label: 'On Status Change' },
  { value: 'on_manual', label: 'Manual Trigger' },
];

const RULE_TYPES: { value: RuleType; label: string; description: string }[] = [
  { value: 'priority', label: 'Priority', description: 'Rules for setting ticket priority' },
  { value: 'sla', label: 'SLA', description: 'Rules for SLA management and due dates' },
  { value: 'allocation', label: 'Allocation', description: 'Rules for executor assignment' },
];

export default function ConfigAllocationRules() {
  const { activeTenantId } = useTenant();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleWithDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedRuleForLogs, setSelectedRuleForLogs] = useState<string | null>(null);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [filterRuleType, setFilterRuleType] = useState<'all' | RuleType>('all');

  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'allocation' as RuleType,
    priority_order: 999,
    trigger_event: 'on_create' as RuleTriggerEvent,
    is_active: true,
    stop_on_match: false,
    max_executions: undefined as number | undefined,
  });

  const [conditions, setConditions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  useEffect(() => {
    loadRules();
  }, [activeTenantId]);

  useEffect(() => {
    if (selectedRuleForLogs) {
      loadExecutionLogs(selectedRuleForLogs);
    }
  }, [selectedRuleForLogs]);

  async function loadRules() {
    try {
      setLoading(true);
      setError(null);

      if (!activeTenantId) {
        setError('Please select a tenant to manage allocation rules.');
        setLoading(false);
        return;
      }

      const data = await allocationRulesService.getRules(activeTenantId);
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
      setError('Failed to load rules. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const typedRules = useMemo(() => {
    return rules
      .filter((rule) => filterRuleType === 'all' || rule.rule_type === filterRuleType)
      .sort((a, b) => a.priority_order - b.priority_order);
  }, [rules, filterRuleType]);

  async function loadExecutionLogs(ruleId: string) {
    try {
      const logs = await ruleEngineService.getExecutionLogs(ruleId, 50);
      setExecutionLogs(logs);
    } catch (err) {
      console.error('Failed to load execution logs:', err);
    }
  }

  function openModal(rule?: Rule) {
    if (rule) {
      // Load full rule details
      allocationRulesService.getRuleById(rule.id).then((ruleDetails) => {
        if (ruleDetails) {
          setEditingRule(ruleDetails);
          setFormData({
            rule_name: ruleDetails.rule_name,
            rule_type: ruleDetails.rule_type,
            priority_order: ruleDetails.priority_order,
            trigger_event: ruleDetails.trigger_event,
            is_active: ruleDetails.is_active,
            stop_on_match: ruleDetails.stop_on_match || false,
            max_executions: ruleDetails.max_executions,
          });
          // Add temporary IDs for conditions/actions that don't have them (for UI state management)
          setConditions((ruleDetails.conditions || []).map((c: any, idx: number) => ({
            ...c,
            id: c.id || `condition-${idx}`,
          })));
          setActions((ruleDetails.actions || []).map((a: any, idx: number) => ({
            ...a,
            id: a.id || `action-${idx}`,
          })));
          setShowModal(true);
        }
      });
    } else {
      setEditingRule(null);
      setFormData({
        rule_name: '',
        rule_type: 'allocation',
        priority_order: 999,
        trigger_event: 'on_create',
        is_active: true,
        stop_on_match: false,
        max_executions: undefined,
      });
      setConditions([]);
      setActions([]);
      setShowModal(true);
    }
    setError(null);
    setSuccessMessage(null);
  }

  function closeModal() {
    setShowModal(false);
    setEditingRule(null);
    setError(null);
    setSuccessMessage(null);
    setConditions([]);
    setActions([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      if (!activeTenantId) {
        setError('Tenant ID is required. Please select a tenant.');
        return;
      }

      if (editingRule) {
        // Update existing rule
        await allocationRulesService.updateRule(editingRule.id, {
          rule_name: formData.rule_name,
          rule_type: formData.rule_type,
          priority_order: formData.priority_order,
          trigger_event: formData.trigger_event,
          is_active: formData.is_active,
          stop_on_match: formData.stop_on_match,
          max_executions: formData.max_executions,
        });

        // Update conditions and actions
        // Delete existing conditions
        await allocationRulesService.deleteAllConditions(editingRule.id);
        // Delete existing actions
        await allocationRulesService.deleteAllActions(editingRule.id);

        // Create new conditions
        for (const condition of conditions) {
          await allocationRulesService.createCondition({
            rule_id: editingRule.id,
            field_path: condition.field_path,
            operator: condition.operator,
            value: condition.value,
            sequence: condition.sequence,
            group_id: condition.group_id,
            logical_operator: condition.logical_operator,
          });
        }

        // Create new actions
        for (const action of actions) {
          await allocationRulesService.createAction({
            rule_id: editingRule.id,
            action_type: action.action_type,
            action_params: action.action_params,
            step_order: action.step_order,
            trigger_after_minutes: action.trigger_after_minutes,
            action_condition: action.action_condition,
          });
        }

        setSuccessMessage('Rule updated successfully!');
        setTimeout(() => {
          closeModal();
          loadRules();
        }, 1500);
    } else {
        // Create new rule
        await allocationRulesService.createRule({
          tenant_id: activeTenantId,
          rule_name: formData.rule_name,
          rule_type: formData.rule_type,
          priority_order: formData.priority_order,
          trigger_event: formData.trigger_event,
          is_active: formData.is_active,
          stop_on_match: formData.stop_on_match,
          max_executions: formData.max_executions,
          conditions: conditions.map((c) => ({
            field_path: c.field_path,
            operator: c.operator,
            value: c.value,
            sequence: c.sequence,
            group_id: c.group_id,
            logical_operator: c.logical_operator,
          })),
          actions: actions.map((a) => ({
            action_type: a.action_type,
            action_params: a.action_params,
            step_order: a.step_order,
            trigger_after_minutes: a.trigger_after_minutes,
            action_condition: a.action_condition,
          })),
        });

        setSuccessMessage('Rule created successfully!');
        setTimeout(() => {
          closeModal();
          loadRules();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Failed to save rule:', err);
      setError(err?.message || 'Failed to save rule. Please try again.');
    }
  }

  async function handleDelete(ruleId: string) {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return;
    }

    try {
      await allocationRulesService.deleteRule(ruleId);
      await loadRules();
    } catch (err: any) {
      console.error('Failed to delete rule:', err);
      alert('Failed to delete rule. Please try again.');
    }
  }

  async function handleToggleActive(ruleId: string, currentStatus: boolean) {
    try {
      await allocationRulesService.toggleRuleActive(ruleId, !currentStatus);
      await loadRules();
    } catch (err: any) {
      console.error('Failed to toggle rule status:', err);
      alert('Failed to update rule status. Please try again.');
    }
  }

  function getStatusBadge(status: ExecutionStatus) {
    const styles = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      skipped: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  }

  function openLogsModal(ruleId: string) {
    setSelectedRuleForLogs(ruleId);
    setShowLogsModal(true);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
    <div>
          <h1 className="text-2xl font-bold text-gray-900">Allocation Rules</h1>
          <p className="text-gray-600 mt-1">Configure automatic ticket allocation and prioritization rules</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Filter by rule type</label>
            <select
              value={filterRuleType}
              onChange={(e) => setFilterRuleType(e.target.value as 'all' | RuleType)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              disabled={!activeTenantId}
            >
              <option value="all">All types</option>
              {RULE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => openModal()}
            disabled={!activeTenantId}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus size={20} />
            Create Rule
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
          {successMessage}
                  </div>
      )}

      {activeTenantId && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-semibold mb-1">Rule execution policy</p>
          <p>
            Rules execute in three passes—Priority, SLA, and Allocation. Within each pass, rules follow their own{' '}
            <code>priority_order</code>. Selecting “Stop on Match” only prevents additional rules of the same type from
            running; other rule types will still process.
          </p>
        </div>
      )}

      {!activeTenantId ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center">
          <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600">Please select a tenant to manage allocation rules.</p>
                    </div>
      ) : typedRules.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">
            {filterRuleType === 'all'
              ? 'No rules found.'
              : `No rules found for ${RULE_TYPES.find((t) => t.value === filterRuleType)?.label} type.`}
          </p>
          {filterRuleType !== 'all' && (
            <button
              onClick={() => setFilterRuleType('all')}
              className="mt-3 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10"
            >
              Clear filter
            </button>
          )}
          {filterRuleType === 'all' && <p className="text-sm mt-2">Create your first rule to get started.</p>}
                    </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rule Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Trigger</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Conditions</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {typedRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <GripVertical size={16} className="text-gray-400" />
                      {rule.priority_order}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{rule.rule_name}</div>
                    {rule.stop_on_match && (
                      <div className="text-xs text-orange-600 mt-1">
                        Stops further rules of this type on match
                      </div>
                    )}
                    {rule.max_executions && (
                      <div className="text-xs text-gray-500 mt-1">
                        Max executions: {rule.max_executions}
                  </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {RULE_TYPES.find((t) => t.value === rule.rule_type)?.label || rule.rule_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {TRIGGER_EVENTS.find((e) => e.value === rule.trigger_event)?.label || rule.trigger_event}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {/* Will show count of conditions */}
                    <button
                      onClick={() => openModal(rule)}
                      className="text-primary hover:underline"
                    >
                      View conditions
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {/* Will show count of actions */}
                    <button
                      onClick={() => openModal(rule)}
                      className="text-primary hover:underline"
                    >
                      View actions
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {rule.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(rule.id, rule.is_active)}
                        className="p-1 text-gray-600 hover:text-primary"
                        title={rule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {rule.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button
                        onClick={() => openLogsModal(rule.id)}
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="View execution logs"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openModal(rule)}
                        className="p-1 text-gray-600 hover:text-primary"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="p-1 text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
      )}

      {/* Create/Edit Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingRule ? 'Edit Rule' : 'Create Rule'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                  {successMessage}
                </div>
              )}

              {/* Basic Rule Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Type *
                  </label>
                  <select
                    value={formData.rule_type}
                    onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as RuleType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    required
                  >
                    {RULE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Order *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.priority_order}
                    onChange={(e) => setFormData({ ...formData, priority_order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lower number = higher priority within the selected rule type
                  </p>
                </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trigger Event *
                    </label>
                    <select
                    value={formData.trigger_event}
                    onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value as RuleTriggerEvent })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                  >
                    {TRIGGER_EVENTS.map((event) => (
                      <option key={event.value} value={event.value}>
                        {event.label}
                      </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Executions (Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                    value={formData.max_executions || ''}
                    onChange={(e) => setFormData({ ...formData, max_executions: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>

                <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                    checked={formData.stop_on_match}
                    onChange={(e) => setFormData({ ...formData, stop_on_match: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Stop on Match (within this type)</span>
                </label>
              </div>

              {/* Conditions Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Conditions</h3>
                <RuleConditionBuilder
                  conditions={conditions}
                  onChange={setConditions}
                  tenantId={activeTenantId || undefined}
                />
              </div>

              {/* Actions Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <RuleActionConfig
                  actions={actions}
                  onChange={setActions}
                  tenantId={activeTenantId || undefined}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execution Logs Modal */}
      {showLogsModal && selectedRuleForLogs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Execution Logs</h2>
              <button
                onClick={() => {
                  setShowLogsModal(false);
                  setSelectedRuleForLogs(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {executionLogs.length === 0 ? (
                <p className="text-gray-500">No execution logs found.</p>
              ) : (
                <div className="space-y-4">
                  {executionLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            Ticket: {log.ticket_id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                        {getStatusBadge(log.execution_status)}
                      </div>
                      {log.execution_time_ms && (
                        <div className="text-sm text-gray-600 mb-2">
                          Execution time: {log.execution_time_ms}ms
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-sm text-red-600 mb-2">
                          Error: {log.error_message}
                        </div>
                      )}
                      {log.matched_conditions && (
                        <div className="text-sm text-gray-600">
                          <strong>Matched Conditions:</strong>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                            {JSON.stringify(log.matched_conditions, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.actions_executed && (
                        <div className="text-sm text-gray-600 mt-2">
                          <strong>Actions Executed:</strong>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto">
                            {JSON.stringify(log.actions_executed, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
