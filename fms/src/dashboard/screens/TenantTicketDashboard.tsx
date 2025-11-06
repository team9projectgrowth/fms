import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, 
  Plus, Download, Edit, Trash2, RefreshCw, X, Eye, ArrowUpDown 
} from 'lucide-react';
import { ticketsService } from '../../services/tickets.service';
import { executorsService } from '../../services/executors.service';
import { categoriesService } from '../../services/categories.service';
import { usersService } from '../../services/users.service';
import { useTenant } from '../../hooks/useTenant';
import { supabase } from '../../lib/supabase';
import type { 
  TicketWithRelations, 
  TicketFilters, 
  TicketStatus, 
  TicketPriority,
  ExecutorProfileWithUser,
  Category,
  User,
} from '../../types/database';
import {
  getStatusBadgeColor,
  getPriorityBadgeColor,
  getSLABadgeColor,
  formatStatusLabel,
  formatPriorityLabel,
  formatSLA,
  truncateText,
  calculateOpenDays,
  calculateSLAStatus,
} from '../../utils/ticketHelpers';
import TicketDetailModal from '../components/TicketDetailModal';
import ReassignTicketModal from '../components/ReassignTicketModal';
import CreateTicketModal from '../components/CreateTicketModal';

type SortField = 'ticket_number' | 'title' | 'status' | 'priority' | 'created_at' | 'updated_at' | 'category' | 'open_days';
type SortDirection = 'asc' | 'desc';

export default function TenantTicketDashboard() {
  const { activeTenantId } = useTenant();
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedExecutor, setSelectedExecutor] = useState<string>('');
  const [selectedComplainant, setSelectedComplainant] = useState<string>('');
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Detail view
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [ticketToReassign, setTicketToReassign] = useState<TicketWithRelations | null>(null);

  // Dropdown options
  const [executors, setExecutors] = useState<ExecutorProfileWithUser[]>([]);
  const [complainants, setComplainants] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (activeTenantId) {
      loadTickets();
      loadDropdownOptions();
    }
  }, [activeTenantId, currentPage, sortField, sortDirection]);

  useEffect(() => {
    if (activeTenantId) {
      // Debounce search
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        loadTickets();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, selectedStatus, selectedPriority, selectedCategory, selectedExecutor, selectedComplainant, createdFrom, createdTo]);

  async function loadDropdownOptions() {
    if (!activeTenantId) return;

    try {
      // Load executors from database
      const executorsData = await executorsService.getExecutors(activeTenantId);
      setExecutors(executorsData);

      // Load complainants from database
      const complainantsData = await usersService.getUsers(activeTenantId);
      const filteredComplainants = complainantsData.filter(u => u.role === 'complainant');
      setComplainants(filteredComplainants);

      // Load categories from database
      const categoriesData = await categoriesService.getActive(activeTenantId);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load dropdown options:', err);
    }
  }

  async function loadTickets() {
    if (!activeTenantId) {
      setError('Please select a tenant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const filters: TicketFilters = {
        status: selectedStatus.length > 0 ? selectedStatus : undefined,
        priority: selectedPriority.length > 0 ? selectedPriority : undefined,
        category: selectedCategory.length > 0 ? selectedCategory : undefined,
        executor_id: selectedExecutor || undefined,
        complainant_id: selectedComplainant || undefined,
        search: searchTerm || undefined,
        created_from: createdFrom || undefined,
        created_to: createdTo || undefined,
        sort_by: sortField,
        sort_order: sortDirection,
        tenant_id: activeTenantId,
      };

      const result = await ticketsService.getTicketsForTenant(activeTenantId, filters, currentPage, limit);
      setTickets(result.tickets);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
      setError(err?.message || 'Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadDropdownOptions() {
    if (!activeTenantId) return;

    try {
      // Load executors from database
      const executorsData = await executorsService.getExecutors(activeTenantId);
      setExecutors(executorsData);

      // Load complainants from database
      const complainantsData = await usersService.getUsers(activeTenantId);
      const filteredComplainants = complainantsData.filter(u => u.role === 'complainant');
      setComplainants(filteredComplainants);

      // Load categories from database
      const categoriesData = await categoriesService.getActive(activeTenantId);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load dropdown options:', err);
    }
  }

  async function loadTickets() {
    if (!activeTenantId) {
      setError('Please select a tenant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const filters: TicketFilters = {
        status: selectedStatus.length > 0 ? selectedStatus : undefined,
        priority: selectedPriority.length > 0 ? selectedPriority : undefined,
        category: selectedCategory.length > 0 ? selectedCategory : undefined,
        executor_id: selectedExecutor || undefined,
        complainant_id: selectedComplainant || undefined,
        search: searchTerm || undefined,
        created_from: createdFrom || undefined,
        created_to: createdTo || undefined,
        sort_by: sortField,
        sort_order: sortDirection,
        tenant_id: activeTenantId,
      };

      const result = await ticketsService.getTicketsForTenant(activeTenantId, filters, currentPage, limit);
      setTickets(result.tickets);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
      setError(err?.message || 'Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} className="text-primary" />
      : <ChevronDown size={14} className="text-primary" />;
  }

  function handleTicketClick(ticket: TicketWithRelations) {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
  }

  function handleReassign(ticket: TicketWithRelations) {
    setTicketToReassign(ticket);
    setShowReassignModal(true);
  }

  async function handleReassignSubmit(ticketId: string, executorProfileId: string, comment?: string) {
    try {
      await ticketsService.reassignTicket(ticketId, executorProfileId, comment);
      await loadTickets();
      setShowReassignModal(false);
      setTicketToReassign(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to reassign ticket');
    }
  }

  async function handleDelete(ticketId: string) {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }

    try {
      await ticketsService.deleteTicket(ticketId);
      await loadTickets();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete ticket');
    }
  }

  async function handleCreateTicket(ticketData: any) {
    try {
      // Validate complainant_id is provided
      if (!ticketData.complainant_id) {
        alert('Please select a complainant from the list or enter a valid email address.');
        return;
      }
      
      // Create ticket in database - only pass complainant_id, not email/name/phone
      // The ticketsService.createTicket will validate that the complainant exists in the users table
      const createInput = {
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority as TicketPriority,
        type: ticketData.type,
        location: ticketData.location,
        building: ticketData.building || undefined,
        floor: ticketData.floor || undefined,
        room: ticketData.room || undefined,
        complainant_id: ticketData.complainant_id, // Required - references users table
        executor_id: ticketData.executor_profile_id || undefined, // Will be converted to executor_profile_id in service
      };

      const createdTicket = await ticketsService.createTicket(createInput, activeTenantId);
      
      // Get complainant name for activity log (try from list first, then fetch if needed)
      let complainantName = 'Unknown';
      const selectedComplainant = complainants.find(c => c.id === ticketData.complainant_id);
      if (selectedComplainant) {
        complainantName = selectedComplainant.full_name || selectedComplainant.email || 'Unknown';
      } else {
        // If not in list, fetch from database
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', ticketData.complainant_id)
            .maybeSingle();
          if (userData) {
            complainantName = userData.full_name || userData.email || 'Unknown';
          }
        } catch (err) {
          // If fetch fails, just use ID
          complainantName = ticketData.complainant_id;
        }
      }
      
      // Log creation activity (non-blocking - don't fail ticket creation if this fails)
      try {
        await ticketsService.createTicketActivity(
          createdTicket.id,
          'admin_comment', // Will be adjusted by service based on user role
          `Ticket created manually by admin for ${complainantName}`
        );
      } catch (activityError: any) {
        console.error('Error creating ticket activity:', activityError);
        // Don't fail ticket creation if activity logging fails
        // Just show a warning
        console.warn('Ticket created successfully but activity log failed:', activityError.message);
      }

      setShowCreateModal(false);
      await loadTickets();
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      alert(err?.message || 'Failed to create ticket');
    }
  }

  function clearFilters() {
    setSearchTerm('');
    setSelectedStatus([]);
    setSelectedPriority([]);
    setSelectedCategory([]);
    setSelectedExecutor('');
    setSelectedComplainant('');
    setCreatedFrom('');
    setCreatedTo('');
    setCurrentPage(1);
  }

  if (!activeTenantId) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">
          <p>Please select a tenant to view tickets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ticket Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage and track all tickets for your tenant</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
            title="Create Ticket"
          >
            <Plus size={16} />
            Create Ticket
          </button>
          <button
            onClick={loadTickets}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            title="Refresh"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            title="Export"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by ticket number, title, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <select
              value={selectedStatus.length > 0 ? selectedStatus[0] : ''}
              onChange={(e) => {
                const value = e.target.value as TicketStatus;
                if (value) {
                  setSelectedStatus([value]);
                } else {
                  setSelectedStatus([]);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <select
              value={selectedPriority.length > 0 ? selectedPriority[0] : ''}
              onChange={(e) => {
                const value = e.target.value as TicketPriority;
                if (value) {
                  setSelectedPriority([value]);
                } else {
                  setSelectedPriority([]);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Filter size={14} />
            {showFilters ? 'Hide' : 'Show'} Advanced Filters
          </button>
          {(selectedStatus.length > 0 || selectedPriority.length > 0 || selectedCategory.length > 0 || selectedExecutor || selectedComplainant || createdFrom || createdTo) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                multiple
                value={selectedCategory}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedCategory(values);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                size={3}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              <select
                value={selectedExecutor}
                onChange={(e) => setSelectedExecutor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">All Executors</option>
                {executors.map(exec => (
                  <option key={exec.id} value={exec.id}>
                    {exec.user?.full_name || exec.user?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complainant</label>
              <select
                value={selectedComplainant}
                onChange={(e) => setSelectedComplainant(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">All Complainants</option>
                {complainants.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.full_name || comp.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created From</label>
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created To</label>
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Tickets Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No tickets found.</p>
          <p className="text-sm mt-2">Try adjusting your filters or create a new ticket.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ticket_number')}>
                      <div className="flex items-center gap-1">
                        Ticket ID
                        {getSortIcon('ticket_number')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('title')}>
                      <div className="flex items-center gap-1">
                        Title
                        {getSortIcon('title')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('priority')}>
                      <div className="flex items-center gap-1">
                        Priority
                        {getSortIcon('priority')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('created_at')}>
                      <div className="flex items-center gap-1">
                        Created
                        {getSortIcon('created_at')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Allocated To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Complainant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SLA</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('updated_at')}>
                      <div className="flex items-center gap-1">
                        Last Update
                        {getSortIcon('updated_at')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Comment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('open_days')}>
                      <div className="flex items-center gap-1">
                        Open Days
                        {getSortIcon('open_days')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => {
                    const slaStatus = calculateSLAStatus(ticket);
                    const openDays = calculateOpenDays(ticket);
                    return (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleTicketClick(ticket)}
                            className="text-primary hover:underline font-medium"
                          >
                            {ticket.ticket_number || ticket.id.substring(0, 8)}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs">
                          {truncateText(ticket.title, 50)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          {truncateText(ticket.description, 50)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(ticket.status)}`}>
                            {formatStatusLabel(ticket.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadgeColor(ticket.priority)}`}>
                            {formatPriorityLabel(ticket.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ticket.executor_profile?.user?.full_name || ticket.executor_profile?.user?.name || ticket.executor?.user?.full_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ticket.complainant?.full_name || ticket.complainant?.email || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {ticket.category}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {slaStatus ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSLABadgeColor(slaStatus)}`}>
                              {formatSLA(ticket)}
                            </span>
                          ) : (
                            <span className="text-gray-500">No SLA</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(ticket.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          {ticket.last_activity_comment ? truncateText(ticket.last_activity_comment, 40) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {openDays > 0 ? `${openDays}d` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTicketClick(ticket)}
                              className="p-1 text-gray-600 hover:text-blue-600"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleReassign(ticket)}
                              className="p-1 text-gray-600 hover:text-primary"
                              title="Reassign"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(ticket.id)}
                              className="p-1 text-gray-600 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * limit, total)}</span> of{' '}
                <span className="font-medium">{total}</span> tickets
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTicket(null);
          }}
          onUpdate={loadTickets}
        />
      )}

      {/* Reassign Modal */}
      {showReassignModal && ticketToReassign && (
        <ReassignTicketModal
          ticket={ticketToReassign}
          executors={executors}
          onClose={() => {
            setShowReassignModal(false);
            setTicketToReassign(null);
          }}
          onReassign={handleReassignSubmit}
        />
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          categories={categories}
          complainants={complainants}
          executors={executors}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTicket}
        />
      )}
    </div>
  );
}

