import {
  Search,
  Edit,
  Plus,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
  Columns3,
  Star,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { executorsService } from '../../services/executors.service';
import { categoriesService } from '../../services/categories.service';
import { executorSkillsService, type ExecutorSkill } from '../../services/executor-skills.service';
import { useTenant } from '../../hooks/useTenant';
import type { ExecutorWithProfile, Category } from '../../types/database';
import { userOnboardingService } from '../../services/user-onboarding.service';

interface UserManagementExecutorsProps {
  onNavigate: (page: string, userId?: string) => void;
}

interface TicketCounts {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

type SortField = 'name' | 'email' | 'availability' | 'load' | 'tickets';
type SortDirection = 'asc' | 'desc';

type ExecutorColumnKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'department'
  | 'employeeCode'
  | 'status'
  | 'chatId'
  | 'botName'
  | 'availability'
  | 'category'
  | 'skills'
  | 'load'
  | 'tickets'
  | 'actions';

interface ColumnConfig {
  key: ExecutorColumnKey;
  label: string;
  optional?: boolean;
}

const COLUMN_STORAGE_KEY = 'executorColumnVisibility.v1';

export default function UserManagementExecutors({ onNavigate }: UserManagementExecutorsProps) {
  const { activeTenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSkillsFilter, setShowSkillsFilter] = useState(false);
  const [executors, setExecutors] = useState<(ExecutorWithProfile & { ticketCounts?: TicketCounts; skillDetails?: ExecutorSkill[] })[]>([]);
  const [filteredExecutors, setFilteredExecutors] = useState<(ExecutorWithProfile & { ticketCounts?: TicketCounts; skillDetails?: ExecutorSkill[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skillsCatalog, setSkillsCatalog] = useState<ExecutorSkill[]>([]);
  const skillsFilterRef = useRef<HTMLDivElement>(null);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<ExecutorColumnKey, boolean>>({
    name: true,
    email: true,
    phone: true,
    department: false,
    employeeCode: false,
    status: true,
    chatId: false,
    botName: false,
    availability: true,
    category: true,
    skills: true,
    load: true,
    tickets: true,
    actions: true,
  });

  useEffect(() => {
    loadCategories();
    loadSkillsCatalog();
    loadExecutors();
    loadColumnPreferences();
  }, [activeTenantId]);

  useEffect(() => {
    filterExecutors();
  }, [searchTerm, selectedSkills, selectedCategory, selectedAvailability, sortField, sortDirection, executors]);

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getActive(activeTenantId || undefined);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadSkillsCatalog = async () => {
    try {
      const data = await executorSkillsService.getActive(activeTenantId || undefined);
      setSkillsCatalog(data);
    } catch (err) {
      console.error('Failed to load executor skills:', err);
    }
  };

  const loadColumnPreferences = () => {
    try {
      const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setColumnVisibility((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (err) {
      console.warn('Failed to load executor column preferences', err);
    }
  };

  const persistColumnPreferences = (visibility: Record<ExecutorColumnKey, boolean>) => {
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibility));
    } catch (err) {
      console.warn('Failed to persist executor column preferences', err);
    }
  };

  const toggleColumnVisibility = (key: ExecutorColumnKey) => {
    setColumnVisibility((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      persistColumnPreferences(updated);
      return updated;
    });
  };

  const columnsConfig = useMemo<ColumnConfig[]>(
    () => [
      { key: 'name', label: 'Name', optional: false },
      { key: 'email', label: 'Email', optional: true },
      { key: 'phone', label: 'Phone', optional: true },
      { key: 'department', label: 'Department', optional: true },
      { key: 'employeeCode', label: 'Employee Code', optional: true },
      { key: 'status', label: 'Status', optional: false },
      { key: 'chatId', label: 'Chat ID', optional: true },
      { key: 'botName', label: 'Bot Name', optional: true },
      { key: 'availability', label: 'Availability', optional: false },
      { key: 'category', label: 'Category', optional: true },
      { key: 'skills', label: 'Skills', optional: true },
      { key: 'load', label: 'Load', optional: true },
      { key: 'tickets', label: 'Tickets', optional: true },
      { key: 'actions', label: 'Actions', optional: false },
    ],
    [],
  );

  const visibleColumns = useMemo(
    () => columnsConfig.filter((column) => columnVisibility[column.key]),
    [columnsConfig, columnVisibility],
  );

  // Close skills filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skillsFilterRef.current && !skillsFilterRef.current.contains(event.target as Node)) {
        setShowSkillsFilter(false);
      }
    };

    if (showSkillsFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSkillsFilter]);

  const loadExecutors = async () => {
    try {
      setLoading(true);
      console.log('Loading executors for tenant:', activeTenantId);
      
      // Pass activeTenantId to filter executors by tenant
      const data = await executorsService.getExecutors(activeTenantId);
      
      console.log('Loaded executors:', data.length, data);

      let skillsReference = skillsCatalog;
      if (skillsReference.length === 0) {
        try {
          skillsReference = await executorSkillsService.getActive(activeTenantId || undefined);
          setSkillsCatalog(skillsReference);
        } catch (err) {
          console.warn('Failed to refresh skills catalog:', err);
          skillsReference = [];
        }
      }
      
      // Load ticket counts and map skills for all executors
      const executorsWithCounts = await Promise.all(
        data.map(async (executor) => {
          try {
            const stats = await executorsService.getExecutorStats(executor.id);
            const skillIds = Array.isArray((executor as any).skills) ? (executor as any).skills : [];
            const skillDetails = skillIds
              .map((skillId: string) => skillsReference.find(skill => skill.id === skillId))
              .filter((skill): skill is ExecutorSkill => Boolean(skill));
            
            return {
              ...executor,
              ticketCounts: {
                total: stats.total,
                open: stats.open,
                inProgress: stats.inProgress,
                resolved: stats.resolved,
                closed: stats.closed,
              },
              skillDetails,
            };
          } catch (err) {
            console.warn(`Failed to load data for executor ${executor.id}:`, err);
            return {
              ...executor,
              ticketCounts: {
                total: 0,
                open: 0,
                inProgress: 0,
                resolved: 0,
                closed: 0,
              },
              skillDetails: [],
            };
          }
        })
      );
      
      setExecutors(executorsWithCounts);
      console.log('Set executors with counts:', executorsWithCounts.length);
    } catch (err) {
      console.error('Failed to load executors:', err);
      alert('Failed to load executors: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const filterExecutors = () => {
    let filtered = executors;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(executor => {
        const userName = executor.user?.full_name || executor.user?.name || '';
        const userEmail = executor.user?.email || '';
        const executorName = executor.full_name || '';
        const searchLower = searchTerm.toLowerCase();
        return userName.toLowerCase().includes(searchLower) ||
               userEmail.toLowerCase().includes(searchLower) ||
               executorName.toLowerCase().includes(searchLower);
      });
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(executor => {
        const categoryId = (executor as any).category_id;
        return categoryId === selectedCategory;
      });
    }

    // Apply skills filter
    if (selectedSkills.length > 0) {
      filtered = filtered.filter(executor => {
        const executorSkillIds = Array.isArray((executor as any).skills) ? (executor as any).skills : [];
        return selectedSkills.some(skillId => executorSkillIds.includes(skillId));
      });
    }

    // Apply availability filter
    if (selectedAvailability) {
      filtered = filtered.filter(executor => {
        const availability = executor.availability_status || executor.availability || '';
        return availability.toLowerCase() === selectedAvailability.toLowerCase();
      });
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = (a.user?.full_name || a.user?.name || a.full_name || '').toLowerCase();
          bValue = (b.user?.full_name || b.user?.name || b.full_name || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.user?.email || '').toLowerCase();
          bValue = (b.user?.email || '').toLowerCase();
          break;
        case 'availability':
          aValue = (a.availability_status || a.availability || '').toLowerCase();
          bValue = (b.availability_status || b.availability || '').toLowerCase();
          break;
        case 'load':
          const aCurrentLoad = (a as any).assigned_tickets_count || a.current_load || 0;
          const aMaxTickets = (a as any).max_concurrent_tickets || a.max_tickets || 10;
          const bCurrentLoad = (b as any).assigned_tickets_count || b.current_load || 0;
          const bMaxTickets = (b as any).max_concurrent_tickets || b.max_tickets || 10;
          aValue = aMaxTickets > 0 ? (aCurrentLoad / aMaxTickets) * 100 : 0;
          bValue = bMaxTickets > 0 ? (bCurrentLoad / bMaxTickets) * 100 : 0;
          break;
        case 'tickets':
          aValue = a.ticketCounts?.total || 0;
          bValue = b.ticketCounts?.total || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredExecutors(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSkills([]);
    setSelectedCategory('');
    setSelectedAvailability('');
  };

  const hasActiveFilters = searchTerm || selectedSkills.length > 0 || selectedCategory || selectedAvailability;

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success';
      case 'busy': return 'bg-warning';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const handleResendInvite = async (userId?: string | null) => {
    if (!userId) {
      alert('Unable to resend invite: user id not found.');
      return;
    }
    try {
      setResendingUserId(userId);
      await userOnboardingService.resendOnboarding(userId);
      alert('Onboarding invite resent. Check notifications for status updates.');
      await loadExecutors();
    } catch (err) {
      console.error('Failed to resend onboarding invite:', err);
      alert(err instanceof Error ? err.message : 'Failed to resend onboarding invite. Please try again.');
    } finally {
      setResendingUserId(null);
    }
  };

  const handleSetAsDefault = async (executorId: string) => {
    try {
      const executor = executors.find(e => e.id === executorId);
      if (!executor) {
        alert('Executor not found');
        return;
      }

      // Get the executor profile ID (executor.id is the profile ID)
      const profileId = executorId;
      
      // Check if already default
      const isCurrentlyDefault = (executor as any).is_default_executor === true;
      
      if (isCurrentlyDefault) {
        // Unset as default
        await executorsService.updateExecutor(profileId, {
          is_default_executor: false,
        });
        alert('Default executor removed');
      } else {
        // Set as default (trigger will unset others)
        await executorsService.updateExecutor(profileId, {
          is_default_executor: true,
        });
        alert('Default executor updated successfully');
      }

      // Reload executors to reflect the change
      await loadExecutors();
    } catch (error) {
      console.error('Error setting default executor:', error);
      alert('Failed to set default executor: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading executors...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">EXECUTORS</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker((prev) => !prev)}
              className="px-3 py-2 border border-gray-300 rounded-card hover:bg-gray-100 flex items-center text-sm"
            >
              <Columns3 size={16} className="mr-2" />
              Columns
            </button>
            {showColumnPicker && (
              <div
                ref={columnPickerRef}
                className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-card shadow-lg z-30 p-3 space-y-2"
              >
                <div className="text-sm font-semibold text-gray-700 mb-2">Toggle Columns</div>
                {columnsConfig.map((column) => (
                  <label key={column.key} className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="mr-2 rounded text-primary focus:ring-primary"
                      checked={columnVisibility[column.key]}
                      onChange={() => toggleColumnVisibility(column.key)}
                      disabled={!column.optional && columnVisibility[column.key]}
                    />
                    <span className={column.optional ? '' : 'font-medium'}>
                      {column.label}
                      {!column.optional && <span className="text-xs text-gray-400 ml-1">(required)</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigate('create-executor')}
            className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Create Executor
          </button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center">
            <Filter size={18} className="mr-2" />
            Search & Filters
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline flex items-center"
            >
              <X size={14} className="mr-1" />
              Clear All
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 gap-4 md:gap-0">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          {/* Skills Filter */}
          <div className="relative w-full md:w-48" ref={skillsFilterRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
            <button
              onClick={() => setShowSkillsFilter(!showSkillsFilter)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-card focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-left flex items-center justify-between bg-white"
            >
              <span className="text-gray-700">
                {selectedSkills.length > 0
                  ? `${selectedSkills.length} skill${selectedSkills.length > 1 ? 's' : ''} selected`
                  : 'All Skills'}
              </span>
              <ArrowUpDown size={16} className="text-gray-500" />
            </button>

            {showSkillsFilter && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-card shadow-lg max-h-60 overflow-y-auto">
                <div className="p-3">
                  {skillsCatalog.length > 0 ? (
                    skillsCatalog.map((skill) => (
                      <label key={skill.id} className="flex items-center py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSkills.includes(skill.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSkills([...selectedSkills, skill.id]);
                            } else {
                              setSelectedSkills(selectedSkills.filter((id) => id !== skill.id));
                            }
                          }}
                          className="mr-3 rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                          {skill.name}
                          {skill.category && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({categories.find((c) => c.id === skill.category)?.name || 'Uncategorized'})
                            </span>
                          )}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="py-2 text-sm text-gray-500 text-center">No skills available</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedSkills.length > 0 || selectedCategory || selectedAvailability) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {selectedCategory && (
                <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Category: {categories.find(c => c.id === selectedCategory)?.name || selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedAvailability && (
                <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  Availability: {selectedAvailability}
                  <button
                    onClick={() => setSelectedAvailability('')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedSkills.map(skillId => {
                const skill = skillsCatalog.find(s => s.id === skillId);
                return skill ? (
                  <span key={skillId} className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                    {skill.name}
                    <button
                      onClick={() => setSelectedSkills(selectedSkills.filter(id => id !== skillId))}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredExecutors.length}</span> of{' '}
          <span className="font-semibold text-gray-900">{executors.length}</span> executors
          {hasActiveFilters && (
            <span className="ml-2 text-primary">(filtered)</span>
          )}
        </div>
      </div>

      {filteredExecutors.length === 0 ? (
        <div className="bg-white rounded-card shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">No executors found matching your filters.</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-primary hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {visibleColumns.map((column) => {
                    switch (column.key) {
                      case 'name':
                        return (
                          <th
                            key="name"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Name</span>
                              {sortField === 'name' ? (
                                sortDirection === 'asc' ? (
                                  <ChevronUp size={14} className="text-primary" />
                                ) : (
                                  <ChevronDown size={14} className="text-primary" />
                                )
                              ) : (
                                <ArrowUpDown size={14} className="text-gray-400" />
                              )}
                            </div>
                          </th>
                        );
                      case 'email':
                        return (
                          <th
                            key="email"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('email')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Email</span>
                              {sortField === 'email' ? (
                                sortDirection === 'asc' ? (
                                  <ChevronUp size={14} className="text-primary" />
                                ) : (
                                  <ChevronDown size={14} className="text-primary" />
                                )
                              ) : (
                                <ArrowUpDown size={14} className="text-gray-400" />
                              )}
                            </div>
                          </th>
                        );
                      case 'phone':
                        return (
                          <th key="phone" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                        );
                      case 'department':
                        return (
                          <th key="department" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Department
                          </th>
                        );
                      case 'employeeCode':
                        return (
                          <th key="employeeCode" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Employee Code
                          </th>
                        );
                      case 'status':
                        return (
                          <th key="status" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        );
                      case 'chatId':
                        return (
                          <th key="chatId" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Chat ID
                          </th>
                        );
                      case 'botName':
                        return (
                          <th key="botName" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bot Name
                          </th>
                        );
                      case 'availability':
                        return (
                          <th
                            key="availability"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('availability')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Availability</span>
                              {sortField === 'availability' ? (
                                sortDirection === 'asc' ? (
                                  <ChevronUp size={14} className="text-primary" />
                                ) : (
                                  <ChevronDown size={14} className="text-primary" />
                                )
                              ) : (
                                <ArrowUpDown size={14} className="text-gray-400" />
                              )}
                            </div>
                          </th>
                        );
                      case 'category':
                        return (
                          <th key="category" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                        );
                      case 'skills':
                        return (
                          <th key="skills" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Skills
                          </th>
                        );
                      case 'load':
                        return (
                          <th
                            key="load"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('load')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Load</span>
                              {sortField === 'load' ? (
                                sortDirection === 'asc' ? (
                                  <ChevronUp size={14} className="text-primary" />
                                ) : (
                                  <ChevronDown size={14} className="text-primary" />
                                )
                              ) : (
                                <ArrowUpDown size={14} className="text-gray-400" />
                              )}
                            </div>
                          </th>
                        );
                      case 'tickets':
                        return (
                          <th
                            key="tickets"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSort('tickets')}
                          >
                            <div className="flex items-center space-x-1">
                              <span>Tickets</span>
                              {sortField === 'tickets' ? (
                                sortDirection === 'asc' ? (
                                  <ChevronUp size={14} className="text-primary" />
                                ) : (
                                  <ChevronDown size={14} className="text-primary" />
                                )
                              ) : (
                                <ArrowUpDown size={14} className="text-gray-400" />
                              )}
                            </div>
                          </th>
                        );
                      case 'actions':
                        return (
                          <th key="actions" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        );
                      default:
                        return null;
                    }
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExecutors.map((executor) => {
                  const executorName = executor.user?.full_name || executor.user?.name || executor.full_name || 'Unknown';
                  const availability = executor.availability_status || executor.availability || 'offline';
                  const currentLoad = (executor as any).assigned_tickets_count || executor.current_load || 0;
                  const maxTickets = (executor as any).max_concurrent_tickets || executor.max_tickets || 10;
                  const loadPercentage = maxTickets > 0 ? (currentLoad / maxTickets) * 100 : 0;

                  return (
                    <tr key={executor.id} className="hover:bg-gray-50 transition-colors">
                      {columnVisibility.name && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                              {executorName.split(' ').map((n) => n[0]).join('').toUpperCase()}
                            </div>
                            <div className="text-sm font-medium text-gray-900">{executorName}</div>
                          </div>
                        </td>
                      )}
                      {columnVisibility.email && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{executor.user?.email || 'N/A'}</div>
                        </td>
                      )}
                      {columnVisibility.phone && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{executor.user?.phone || executor.phone || 'N/A'}</div>
                        </td>
                      )}
                      {columnVisibility.department && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{executor.user?.department || 'N/A'}</div>
                        </td>
                      )}
                      {columnVisibility.employeeCode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{executor.user?.emp_code || executor.employee_id || 'N/A'}</div>
                        </td>
                      )}
                      {columnVisibility.status && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              executor.user?.is_active !== false ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {executor.user?.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      )}
                      {columnVisibility.chatId && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{executor.user?.telegram_chat_id || '-'}</div>
                        </td>
                      )}
                      {columnVisibility.botName && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{executor.user?.telegram_user_id || '-'}</div>
                        </td>
                      )}
                      {columnVisibility.availability && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(availability)} mr-2`}></div>
                            <span className="text-sm text-gray-900 capitalize">{availability}</span>
                          </div>
                        </td>
                      )}
                      {columnVisibility.category && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {executor.category ? (
                            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                              {(executor as any).category?.name || 'N/A'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </td>
                      )}
                      {columnVisibility.skills && (
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(executor.skillDetails || []).slice(0, 3).map((skill: ExecutorSkill) => (
                              <span key={skill.id} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                                {skill.name}
                              </span>
                            ))}
                            {(!executor.skillDetails || executor.skillDetails.length === 0) && (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                            {executor.skillDetails && executor.skillDetails.length > 3 && (
                              <span className="text-xs text-gray-500">+{executor.skillDetails.length - 3} more</span>
                            )}
                          </div>
                        </td>
                      )}
                      {columnVisibility.load && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 mr-2">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>
                                  {currentLoad}/{maxTickets}
                                </span>
                                <span
                                  className={`font-medium ${
                                    loadPercentage > 75 ? 'text-danger' : loadPercentage > 50 ? 'text-warning' : 'text-success'
                                  }`}
                                >
                                  {Math.round(loadPercentage)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    loadPercentage > 75 ? 'bg-danger' : loadPercentage > 50 ? 'bg-warning' : 'bg-success'
                                  }`}
                                  style={{ width: `${Math.min(loadPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      {columnVisibility.tickets && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {executor.ticketCounts ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <div className="font-medium text-gray-900">{executor.ticketCounts.total}</div>
                                  <div className="text-xs text-gray-500">Total</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-danger">{executor.ticketCounts.open}</div>
                                  <div className="text-xs text-gray-500">Open</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-warning">{executor.ticketCounts.inProgress}</div>
                                  <div className="text-xs text-gray-500">Active</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-success">{executor.ticketCounts.resolved}</div>
                                  <div className="text-xs text-gray-500">Done</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Loading...</span>
                          )}
                        </td>
                      )}
                      {columnVisibility.actions && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const user = executor.user;
                              const onboardingStatus = (user?.bot_onboarding_status ?? 'not_required') as string;
                              const shouldShowResend = ['pending', 'invited', 'awaiting_chat', 'failed'].includes(onboardingStatus);
                              return shouldShowResend && user;
                            })() && (
                              <button
                                onClick={() => handleResendInvite(executor.user?.id ?? (executor as any).user_id)}
                                disabled={resendingUserId === (executor.user?.id ?? (executor as any).user_id)}
                                className="px-2 py-1 text-xs text-primary hover:text-primary/80 border border-primary rounded-card disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {resendingUserId === (executor.user?.id ?? (executor as any).user_id)
                                  ? 'Resending...'
                                  : 'Resend Invite'}
                              </button>
                            )}
                            <button
                              onClick={() => handleSetAsDefault(executor.id)}
                              className={`p-2 rounded transition-colors ${
                                (executor as any).is_default_executor
                                  ? 'text-primary hover:bg-primary/10'
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                              title={
                                (executor as any).is_default_executor
                                  ? 'Default executor (click to remove)'
                                  : 'Set as default executor for unassigned tickets'
                              }
                            >
                              <Star
                                size={16}
                                className={(
                                  executor as any
                                ).is_default_executor ? 'fill-current' : ''}
                              />
                            </button>
                            <button
                              onClick={() => onNavigate('edit-executor', executor.id)}
                              className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this executor?')) {
                                  try {
                                    await executorsService.deleteExecutor(executor.id);
                                    await loadExecutors();
                                  } catch (err) {
                                    alert('Failed to delete executor: ' + (err instanceof Error ? err.message : 'Unknown error'));
                                  }
                                }
                              }}
                              className="p-2 text-danger hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const newStatus = availability === 'available' ? 'busy' : availability === 'busy' ? 'offline' : 'available';
                                  await executorsService.updateAvailability(executor.id, newStatus as any);
                                  await loadExecutors();
                                } catch (err) {
                                  alert('Failed to update availability: ' + (err instanceof Error ? err.message : 'Unknown error'));
                                }
                              }}
                              className={`p-2 rounded transition-colors ${
                                availability === 'available'
                                  ? 'text-success hover:bg-green-50'
                                  : availability === 'busy'
                                  ? 'text-warning hover:bg-yellow-50'
                                  : 'text-gray-500 hover:bg-gray-100'
                              }`}
                              title={`Toggle availability (currently ${availability})`}
                            >
                              <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(availability)}`}></div>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
