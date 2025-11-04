import { useState } from 'react';
import { Plus, Download, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import CreateTicketForm from './CreateTicketForm';
import { useTickets } from '../../hooks/useTickets';
import type { TicketFilters } from '../../types/database';

interface AdminAllTicketsProps {
  onNavigate: (page: string, ticketId?: string) => void;
}

export default function AdminAllTickets({ onNavigate }: AdminAllTicketsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const limit = 10;

  const filters: TicketFilters = {
    status: selectedStatus.length > 0 ? selectedStatus as any : undefined,
    priority: selectedPriority.length > 0 ? selectedPriority as any : undefined,
    search: searchTerm || undefined,
  };

  const { tickets, total, totalPages, loading, createTicket, fetchTickets } = useTickets(filters, currentPage, limit);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      await createTicket({
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority as any,
        type: ticketData.type,
        location: ticketData.location,
        building: ticketData.building,
        floor: ticketData.floor,
        room: ticketData.room,
        complainant_name: ticketData.complainant,
        complainant_email: ticketData.email,
        complainant_phone: ticketData.phone,
      });
      setShowCreateForm(false);
      await fetchTickets();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Failed to create ticket. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ALL TICKETS</h1>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-card hover:bg-gray-50 flex items-center">
            <Download size={16} className="mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Create
          </button>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <select
              multiple
              value={selectedStatus}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedStatus(values);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <select
              multiple
              value={selectedPriority}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedPriority(values);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
            >
              <option value="critical">🔴 Critical</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        </div>
        <button className="mt-3 text-sm text-primary hover:text-primary/80 flex items-center">
          <Filter size={14} className="mr-1" />
          More Filters
        </button>
      </div>

      <div className="bg-white rounded-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox" className="w-4 h-4 text-primary border-gray-300 rounded" />
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Complainant</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Executor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading tickets...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => onNavigate('executor-ticket', ticket.id)}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-primary border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.ticket_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{ticket.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {ticket.complainant?.name || ticket.complainant_name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {ticket.executor_profile?.user?.name || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      ticket.status === 'open' ? 'bg-info/10 text-info' :
                      ticket.status === 'in-progress' ? 'bg-warning/10 text-warning' :
                      ticket.status === 'resolved' ? 'bg-success/10 text-success' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="flex items-center capitalize">
                      <span className="mr-1">{getPriorityIcon(ticket.priority)}</span>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{ticket.category}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-500">
          Showing {(currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, total)} of {total} tickets
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-2 border border-gray-300 rounded-card hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
            if (page > totalPages) return null;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-card ${
                  currentPage === page
                    ? 'bg-primary text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || loading}
            className="px-3 py-2 border border-gray-300 rounded-card hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {showCreateForm && (
        <CreateTicketForm
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateTicket}
        />
      )}
    </div>
  );
}
