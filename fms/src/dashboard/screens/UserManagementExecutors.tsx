import { Search, Edit, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { executorsService } from '../../services/executors.service';
import { useTenant } from '../../hooks/useTenant';
import type { ExecutorWithProfile } from '../../types/database';

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

export default function UserManagementExecutors({ onNavigate }: UserManagementExecutorsProps) {
  const { activeTenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [executors, setExecutors] = useState<(ExecutorWithProfile & { ticketCounts?: TicketCounts })[]>([]);
  const [filteredExecutors, setFilteredExecutors] = useState<(ExecutorWithProfile & { ticketCounts?: TicketCounts })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutors();
  }, [activeTenantId]);

  useEffect(() => {
    filterExecutors();
  }, [searchTerm, selectedSkills, selectedAvailability, executors]);

  const loadExecutors = async () => {
    try {
      setLoading(true);
      console.log('Loading executors for tenant:', activeTenantId);
      
      // Pass activeTenantId to filter executors by tenant
      const data = await executorsService.getExecutors(activeTenantId);
      
      console.log('Loaded executors:', data.length, data);
      
      // Load ticket counts for all executors
      const executorsWithCounts = await Promise.all(
        data.map(async (executor) => {
          try {
            const stats = await executorsService.getExecutorStats(executor.id);
            return {
              ...executor,
              ticketCounts: {
                total: stats.total,
                open: stats.open,
                inProgress: stats.inProgress,
                resolved: stats.resolved,
                closed: stats.closed,
              },
            };
          } catch (err) {
            console.warn(`Failed to load ticket counts for executor ${executor.id}:`, err);
            return {
              ...executor,
              ticketCounts: {
                total: 0,
                open: 0,
                inProgress: 0,
                resolved: 0,
                closed: 0,
              },
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

    if (selectedSkills.length > 0) {
      filtered = filtered.filter(executor => {
        const executorSkills = executor.skills || [];
        return selectedSkills.some(skill => 
          executorSkills.some((executorSkill: any) => 
            (typeof executorSkill === 'string' && executorSkill === skill) ||
            (typeof executorSkill === 'object' && executorSkill?.name === skill)
          )
        );
      });
    }

    if (selectedAvailability) {
      filtered = filtered.filter(executor => {
        const availability = executor.availability_status || executor.availability || '';
        return availability.toLowerCase() === selectedAvailability.toLowerCase();
      });
    }

    setFilteredExecutors(filtered);
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
    new Set(executors.flatMap(e => {
      const skills = e.skills || [];
      return skills.map((skill: any) => 
        typeof skill === 'string' ? skill : (skill?.name || skill?.label || String(skill))
      );
    }))
  );

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
        <div className="bg-white rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Availability</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                            {executorName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{executorName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{executor.user?.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(availability)} mr-2`}></div>
                          <span className="text-sm text-gray-900 capitalize">{availability}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(executor.skills || []).slice(0, 3).map((skill: any, index: number) => {
                            const skillName = typeof skill === 'string' ? skill : (skill?.name || skill?.label || 'Unknown');
                            return (
                              <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                                {skillName}
                              </span>
                            );
                          })}
                          {(!executor.skills || executor.skills.length === 0) && (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                          {executor.skills && executor.skills.length > 3 && (
                            <span className="text-xs text-gray-500">+{executor.skills.length - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 mr-2">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{currentLoad}/{maxTickets}</span>
                              <span className={`font-medium ${
                                loadPercentage > 75 ? 'text-danger' : 
                                loadPercentage > 50 ? 'text-warning' : 
                                'text-success'
                              }`}>
                                {Math.round(loadPercentage)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  loadPercentage > 75 ? 'bg-danger' :
                                  loadPercentage > 50 ? 'bg-warning' :
                                  'bg-success'
                                }`}
                                style={{ width: `${Math.min(loadPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </td>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onNavigate('edit-user', executor.user?.id || (executor as any).user_id)}
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
                              availability === 'available' ? 'text-success hover:bg-green-50' :
                              availability === 'busy' ? 'text-warning hover:bg-yellow-50' :
                              'text-gray-500 hover:bg-gray-100'
                            }`}
                            title={`Toggle availability (currently ${availability})`}
                          >
                            <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(availability)}`}></div>
                          </button>
                        </div>
                      </td>
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
