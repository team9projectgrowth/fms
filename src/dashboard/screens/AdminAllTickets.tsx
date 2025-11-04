import { useState } from 'react';
import { Plus, Download, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import CreateTicketForm from './CreateTicketForm';

interface AdminAllTicketsProps {
  onNavigate: (page: string, ticketId?: string) => void;
}

export default function AdminAllTickets({ onNavigate }: AdminAllTicketsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const tickets = [
    { id: 'TKT-1001', title: 'AC not working', complainant: 'John Smith', executor: 'Mike Johnson', status: 'open', priority: 'high', category: 'HVAC' },
    { id: 'TKT-1002', title: 'Broken chair', complainant: 'Sarah Lee', executor: 'Tom Brown', status: 'in-progress', priority: 'low', category: 'Furniture' },
    { id: 'TKT-1003', title: 'Water leakage', complainant: 'Mike Davis', executor: 'Mike Johnson', status: 'open', priority: 'critical', category: 'Plumbing' },
    { id: 'TKT-1004', title: 'Printer issue', complainant: 'Emily Chen', executor: 'Sarah Wilson', status: 'resolved', priority: 'medium', category: 'IT' },
    { id: 'TKT-1005', title: 'Light not working', complainant: 'David Kim', executor: 'Tom Brown', status: 'in-progress', priority: 'low', category: 'Electrical' },
  ];

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const handleCreateTicket = (ticketData: any) => {
    console.log('New ticket created:', ticketData);
    alert('Ticket created successfully!\n\nIn a production environment, this would:\n1. Save to Supabase database\n2. Auto-assign based on allocation rules\n3. Send notifications to executor\n4. Calculate SLA deadlines');
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <select
              multiple
              className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
            >
              <option>Open</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Closed</option>
            </select>
          </div>
          <div>
            <select
              multiple
              className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
            >
              <option>🔴 Critical</option>
              <option>🟠 High</option>
              <option>🟡 Medium</option>
              <option>🟢 Low</option>
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
            {tickets.map((ticket, index) => (
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
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.id}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{ticket.title}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{ticket.complainant}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{ticket.executor}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ticket.status === 'open' ? 'bg-info/10 text-info' :
                    ticket.status === 'in-progress' ? 'bg-warning/10 text-warning' :
                    'bg-success/10 text-success'
                  }`}>
                    {ticket.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="flex items-center">
                    <span className="mr-1">{getPriorityIcon(ticket.priority)}</span>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{ticket.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-500">
          Showing 1-5 of 127 tickets
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-card hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          {[1, 2, 3, 4, 5].map(page => (
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
          ))}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-3 py-2 border border-gray-300 rounded-card hover:bg-gray-50"
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
