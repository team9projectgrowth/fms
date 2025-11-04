import { Search, Edit, Eye, Send, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { executorsService } from '../../services/executors.service';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState('');
  const [executors, setExecutors] = useState<(ExecutorWithProfile & { ticketCounts?: TicketCounts })[]>([]);
  const [filteredExecutors, setFilteredExecutors] = useState<(ExecutorWithProfile & { ticketCounts?: TicketCounts })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutors();
  }, []);

  useEffect(() => {
    filterExecutors();
  }, [searchTerm, selectedSkills, selectedAvailability, executors]);

  const loadExecutors = async () => {
    try {
      setLoading(true);
      const data = await executorsService.getExecutors();
      
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
    } catch (err) {
      console.error('Failed to load executors:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterExecutors = () => {
    let filtered = executors;

    if (searchTerm) {
      filtered = filtered.filter(executor =>
        executor.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        executor.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSkills.length > 0) {
      filtered = filtered.filter(executor =>
        selectedSkills.some(skill => executor.skills?.includes(skill))
      );
    }

    if (selectedAvailability) {
      filtered = filtered.filter(executor =>
        executor.availability.toLowerCase() === selectedAvailability.toLowerCase()
      );
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
    new Set(executors.flatMap(e => e.skills || []))
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
                      <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(executor.availability)} mr-2`}></div>
                      <span className="text-sm text-gray-500 capitalize">{executor.availability}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onNavigate('edit-user', executor.user.id)}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <Edit size={16} />
                  </button>
                  <button className="p-2 text-gray-700 hover:bg-gray-100 rounded">
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {(executor.skills || []).map((skill, index) => (
                    <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                  {(!executor.skills || executor.skills.length === 0) && (
                    <span className="text-xs text-gray-400">No skills assigned</span>
                  )}
                </div>
              </div>

              {/* Ticket Counts */}
              {executor.ticketCounts && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Ticket Statistics</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium text-gray-900">{executor.ticketCounts.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Open:</span>
                      <span className="font-medium text-danger">{executor.ticketCounts.open}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Progress:</span>
                      <span className="font-medium text-warning">{executor.ticketCounts.inProgress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resolved:</span>
                      <span className="font-medium text-success">{executor.ticketCounts.resolved}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Current Load</span>
                  <span className="font-medium text-gray-900">
                    {executor.current_load}/{executor.max_tickets} tickets
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (executor.current_load / executor.max_tickets) * 100 > 75
                        ? 'bg-danger'
                        : (executor.current_load / executor.max_tickets) * 100 > 50
                        ? 'bg-warning'
                        : 'bg-success'
                    }`}
                    style={{ width: `${(executor.current_load / executor.max_tickets) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-gray-500">{executor.user.email}</div>
                  <div className="flex items-center">
                    <Send size={14} className={`mr-1 ${executor.telegram_connected ? 'text-success' : 'text-gray-400'}`} />
                    <span className={executor.telegram_connected ? 'text-success' : 'text-gray-400'}>
                      Telegram
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
