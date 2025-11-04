import { Search, Edit, Eye, Send, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { executorProfilesService } from '../../services/executors.service';
import { useTenant } from '../../hooks/useTenant';
import type { ExecutorProfileWithUser } from '../../types/database';

interface UserManagementExecutorsProps {
  onNavigate: (page: string, userId?: string) => void;
}

export default function UserManagementExecutors({ onNavigate }: UserManagementExecutorsProps) {
  const { activeTenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [executors, setExecutors] = useState<ExecutorProfileWithUser[]>([]);
  const [filteredExecutors, setFilteredExecutors] = useState<ExecutorProfileWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load executors for both Tenant Admin (activeTenantId set) and Super Admin (activeTenantId null)
    loadExecutors();
  }, [activeTenantId]);

  useEffect(() => {
    filterExecutors();
  }, [searchTerm, selectedSkills, selectedAvailability, executors]);

  const loadExecutors = async () => {
    try {
      setLoading(true);
      const data = await executorProfilesService.list(activeTenantId);
      setExecutors(data);
    } catch (err) {
      console.error('Failed to load executors:', err);
      alert('Failed to load executors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterExecutors = () => {
    let filtered = executors;

    if (searchTerm) {
      filtered = filtered.filter(executor =>
        executor.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        executor.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        executor.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSkills.length > 0) {
      filtered = filtered.filter(executor => {
        const skills = executor.skills || [];
        // Handle both string arrays and object arrays
        const skillStrings = skills.map((s: any) => 
          typeof s === 'string' ? s.toLowerCase() : (s.name || s).toLowerCase()
        );
        return selectedSkills.some(skill => 
          skillStrings.includes(skill.toLowerCase())
        );
      });
    }

    if (selectedAvailability) {
      filtered = filtered.filter(executor =>
        executor.availability_status.toLowerCase() === selectedAvailability.toLowerCase()
      );
    }

    setFilteredExecutors(filtered);
  };

  const handleDelete = async (executorId: string, executorName: string) => {
    if (!confirm(`Are you sure you want to delete executor "${executorName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await executorProfilesService.delete(executorId);
      await loadExecutors();
    } catch (err) {
      console.error('Failed to delete executor:', err);
      alert('Failed to delete executor. Please try again.');
    }
  };

  const handleToggleAvailability = async (executorId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'available' ? 'busy' : 'available';
    try {
      await executorProfilesService.updateAvailability(executorId, newStatus as any);
      await loadExecutors();
    } catch (err) {
      console.error('Failed to update availability:', err);
      alert('Failed to update availability. Please try again.');
    }
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success';
      case 'busy': return 'bg-warning';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const allSkills = Array.from(
    new Set(
      executors.flatMap(e => {
        const skills = e.skills || [];
        return skills.map((s: any) => typeof s === 'string' ? s : (s.name || String(s)));
      })
    )
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading executors...</div>
      </div>
    );
  }

  if (!activeTenantId && executors.length === 0 && !loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">EXECUTORS</h1>
          <button
            onClick={() => onNavigate('create-user', 'executor')}
            className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Create Executor
          </button>
        </div>
        <div className="bg-white rounded-card shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">No executors found.</p>
          <p className="text-gray-400 text-sm mt-2">Create your first executor to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EXECUTORS</h1>
          {!activeTenantId && (
            <p className="text-sm text-gray-500 mt-1">Showing all executors (Super Admin view)</p>
          )}
        </div>
        <button
          onClick={() => onNavigate('create-user', 'executor')}
          className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Create Executor
        </button>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search executors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
            />
          </div>
          <select
            multiple
            value={selectedSkills}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              setSelectedSkills(values);
            }}
            className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
          >
            {allSkills.map(skill => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>
          <select
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
          >
            <option value="">All Availability</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {filteredExecutors.length === 0 ? (
        <div className="bg-white rounded-card shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">No executors found matching your filters.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSkills([]);
              setSelectedAvailability('');
            }}
            className="mt-4 text-primary hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {filteredExecutors.map((executor) => (
            <div key={executor.id} className="bg-white rounded-card shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
                    {executor.user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{executor.user.name}</h3>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(executor.availability_status)} mr-2`}></div>
                      <span className="text-sm text-gray-500 capitalize">{executor.availability_status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAvailability(executor.id, executor.availability_status);
                    }}
                    className={`p-2 rounded ${
                      executor.availability_status === 'available'
                        ? 'text-success hover:bg-success/10'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title="Toggle availability"
                  >
                    <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(executor.availability_status)}`}></div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('edit-user', executor.user.id);
                    }}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded"
                    title="Edit executor"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(executor.id, executor.user.name);
                    }}
                    className="p-2 text-danger hover:bg-danger/10 rounded"
                    title="Delete executor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {((executor.skills as any[]) || []).map((skill, index) => {
                    const skillName = typeof skill === 'string' ? skill : (skill.name || String(skill));
                    return (
                      <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        {skillName}
                      </span>
                    );
                  })}
                  {(!executor.skills || executor.skills.length === 0) && (
                    <span className="text-xs text-gray-400">No skills assigned</span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Current Load</span>
                  <span className="font-medium text-gray-900">
                    {executor.current_load}/{executor.max_concurrent_tickets} tickets
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (executor.current_load / executor.max_concurrent_tickets) * 100 > 75
                        ? 'bg-danger'
                        : (executor.current_load / executor.max_concurrent_tickets) * 100 > 50
                        ? 'bg-warning'
                        : 'bg-success'
                    }`}
                    style={{ width: `${(executor.current_load / executor.max_concurrent_tickets) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-500">{executor.user.email}</div>
                  {executor.employee_id && (
                    <div className="text-xs text-gray-400">
                      ID: {executor.employee_id}
                    </div>
                  )}
                </div>
                {executor.full_name && executor.full_name !== executor.user.name && (
                  <div className="text-xs text-gray-400 mt-1">
                    Full Name: {executor.full_name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
