import { useState, useEffect } from 'react';
import { Plus, X, Trash2, GripVertical } from 'lucide-react';
import { categoriesService } from '../../services/categories.service';
import { designationsService } from '../../services/designations.service';
import { supabase } from '../../lib/supabase';
import type { ConditionOperator } from '../../types/database';

interface Condition {
  id: string;
  field_path: string;
  operator: ConditionOperator;
  value: string[];
  sequence: number;
  group_id?: string;
  logical_operator?: 'AND' | 'OR';
}

interface RuleConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  tenantId?: string;
}

const FIELD_PATHS = [
  { value: 'priority', label: 'Priority' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'status', label: 'Status' },
  { value: 'location', label: 'Location' },
  { value: 'complainant.email', label: 'Complainant Email' },
  { value: 'complainant.department', label: 'Complainant Department' },
  { value: 'complainant.designation.name', label: 'Complainant Designation' },
  { value: 'complainant.designation_id', label: 'Complainant Designation ID' },
];

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'in', label: 'In' },
  { value: 'not_in', label: 'Not In' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_than_or_equal', label: 'Greater Than Or Equal' },
  { value: 'less_than_or_equal', label: 'Less Than Or Equal' },
  { value: 'is_null', label: 'Is Null' },
  { value: 'is_not_null', label: 'Is Not Null' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
];

const PRIORITY_VALUES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_VALUES = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const TICKET_TYPE_VALUES = [
  { value: 'Repair', label: 'Repair' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Installation', label: 'Installation' },
  { value: 'Inspection', label: 'Inspection' },
  { value: 'Other', label: 'Other' },
];

export default function RuleConditionBuilder({
  conditions,
  onChange,
  tenantId,
}: RuleConditionBuilderProps) {
  const [nextSequence, setNextSequence] = useState(conditions.length > 0 ? Math.max(...conditions.map(c => c.sequence)) + 1 : 1);
  const [categories, setCategories] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    if (tenantId) {
      loadCategories();
      loadDesignations();
      loadDepartments();
    }
  }, [tenantId]);

  async function loadCategories() {
    try {
      const data = await categoriesService.getActive(tenantId);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  async function loadDesignations() {
    try {
      const data = await designationsService.getActive(tenantId || undefined);
      setDesignations(data);
    } catch (err) {
      console.error('Failed to load designations:', err);
    }
  }

  async function loadDepartments() {
    try {
      // Get unique departments from users
      const { data, error } = await supabase
        .from('users')
        .select('department')
        .not('department', 'is', null)
        .neq('department', '');
      
      if (!error && data) {
        const uniqueDepts = Array.from(new Set(data.map(u => u.department).filter(Boolean)));
        setDepartments(uniqueDepts);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  }

  function getValueOptions(fieldPath: string) {
    switch (fieldPath) {
      case 'priority':
        return PRIORITY_VALUES;
      case 'status':
        return STATUS_VALUES;
      case 'category':
        return categories.map(cat => ({ value: cat.name, label: cat.name }));
      case 'type':
        return TICKET_TYPE_VALUES;
      case 'complainant.designation.name':
        return designations.map(des => ({ value: des.name, label: des.name }));
      case 'complainant.designation_id':
        return designations.map(des => ({ value: des.id, label: des.name }));
      case 'complainant.department':
        return departments.map(dept => ({ value: dept, label: dept }));
      default:
        return null; // No dropdown for this field - use text input
    }
  }

  function isFieldWithDropdown(fieldPath: string): boolean {
    return [
      'priority',
      'status',
      'category',
      'type',
      'complainant.designation.name',
      'complainant.designation_id',
      'complainant.department'
    ].includes(fieldPath);
  }

  function addCondition() {
    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      field_path: 'priority',
      operator: 'equals',
      value: [],
      sequence: nextSequence,
    };
    setNextSequence(nextSequence + 1);
    onChange([...conditions, newCondition]);
  }

  function updateCondition(id: string, updates: Partial<Condition>) {
    onChange(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }

  function removeCondition(id: string) {
    const updated = conditions.filter((c) => c.id !== id);
    // Renumber sequences
    const renumbered = updated.map((c, index) => ({
      ...c,
      sequence: index + 1,
    }));
    onChange(renumbered);
    setNextSequence(renumbered.length + 1);
  }

  function addValue(conditionId: string, newValue: string) {
    if (!newValue.trim()) return;
    const condition = conditions.find((c) => c.id === conditionId);
    if (condition) {
      updateCondition(conditionId, {
        value: [...condition.value, newValue.trim()],
      });
    }
  }

  function removeValue(conditionId: string, valueIndex: number) {
    const condition = conditions.find((c) => c.id === conditionId);
    if (condition) {
      updateCondition(conditionId, {
        value: condition.value.filter((_, i) => i !== valueIndex),
      });
    }
  }

  const operatorsRequiringValues = ['is_null', 'is_not_null'];

  return (
    <div className="space-y-4">
      {conditions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <p>No conditions defined.</p>
          <p className="text-sm mt-2">Rules without conditions will always match.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div
              key={condition.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2 mt-2">
                  <GripVertical size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-500 font-medium">
                    {index + 1}
                  </span>
                  {index > 0 && (
                    <select
                      value={condition.logical_operator || 'AND'}
                      onChange={(e) =>
                        updateCondition(condition.id, {
                          logical_operator: e.target.value as 'AND' | 'OR',
                        })
                      }
                      className="text-xs px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Field
                    </label>
                    <select
                      value={condition.field_path}
                      onChange={(e) => {
                        // Clear values when field changes to avoid invalid values
                        updateCondition(condition.id, {
                          field_path: e.target.value,
                          value: [],
                        });
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
                    >
                      {FIELD_PATHS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Operator
                    </label>
                    <select
                      value={condition.operator}
                      onChange={(e) =>
                        updateCondition(condition.id, {
                          operator: e.target.value as ConditionOperator,
                          value: operatorsRequiringValues.includes(e.target.value) ? [] : condition.value,
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Value{condition.operator === 'in' || condition.operator === 'not_in' ? ' (multiple)' : ''}
                    </label>
                    {operatorsRequiringValues.includes(condition.operator) ? (
                      <div className="text-xs text-gray-500 py-2">No value needed</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {condition.value.map((val, valIndex) => {
                            const options = getValueOptions(condition.field_path);
                            const option = options?.find(opt => opt.value === val);
                            const displayValue = option ? option.label : val;
                            return (
                              <span
                                key={valIndex}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                              >
                                {displayValue}
                                <button
                                  type="button"
                                  onClick={() => removeValue(condition.id, valIndex)}
                                  className="hover:text-red-600"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        {isFieldWithDropdown(condition.field_path) && getValueOptions(condition.field_path) ? (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                addValue(condition.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
                          >
                            <option value="">Select {condition.field_path.split('.').pop()}</option>
                            {getValueOptions(condition.field_path)?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter value and press Enter"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addValue(condition.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-primary"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => removeCondition(condition.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Remove condition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addCondition}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Condition
      </button>

      {conditions.length > 0 && (
        <div className="text-xs text-gray-500 mt-2">
          <p>💡 Tip: Use AND/OR operators to combine conditions. First condition has no operator.</p>
          <p>💡 Designation field paths: Use "complainant.designation.name" for designation name or "complainant.designation_id" for ID.</p>
        </div>
      )}
    </div>
  );
}

