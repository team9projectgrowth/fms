import { useState, useMemo, useEffect } from 'react';
import { Plus, Download, Search, Filter, ChevronLeft, ChevronRight, Columns3 } from 'lucide-react';
import CreateTicketForm from './CreateTicketForm';

interface AdminAllTicketsProps {
  onNavigate: (page: string, ticketId?: string) => void;
}

type TicketColumnKey = 'select' | 'id' | 'title' | 'complainant' | 'executor' | 'status' | 'priority' | 'category';

interface TicketColumnConfig {
  key: TicketColumnKey;
  label: string;
  optional?: boolean;
}

const ADMIN_TICKET_COLUMNS_KEY = 'adminTicketsColumnVisibility.v1';

export default function AdminAllTickets({ onNavigate }: AdminAllTicketsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<TicketColumnKey, boolean>>({
    select: true,
    id: true,
    title: true,
    complainant: true,
    executor: true,
    status: true,
    priority: true,
    category: true,
  });

  useEffect(() => {
    loadColumnPreferences();
  }, []);

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

  const columnsConfig = useMemo<TicketColumnConfig[]>(
    () => [
      { key: 'select', label: 'Select', optional: false },
      { key: 'id', label: 'ID', optional: false },
      { key: 'title', label: 'Title', optional: false },
      { key: 'complainant', label: 'Complainant', optional: true },
      { key: 'executor', label: 'Executor', optional: true },
      { key: 'status', label: 'Status', optional: false },
      { key: 'priority', label: 'Priority', optional: true },
      { key: 'category', label: 'Category', optional: true },
    ],
    [],
  );

  const visibleColumns = useMemo(
    () => columnsConfig.filter((column) => columnVisibility[column.key]),
    [columnsConfig, columnVisibility],
  );

  const toggleColumn = (key: TicketColumnKey) => {
    setColumnVisibility((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(ADMIN_TICKET_COLUMNS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to persist admin ticket column preferences', err);
      }
      return updated;
    });
  };

  const loadColumnPreferences = () => {
    try {
      const raw = localStorage.getItem(ADMIN_TICKET_COLUMNS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setColumnVisibility((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (err) {
      console.warn('Failed to load admin ticket column preferences', err);
    }
  };

  const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportTickets = () => {
    try {
      setExporting(true);
      if (!tickets.length) {
        alert('No tickets available to export.');
        return;
      }

      const headers = ['Ticket ID', 'Title', 'Complainant', 'Executor', 'Status', 'Priority', 'Category'];
      const rows = tickets.map((ticket) => [
        escapeCsvValue(ticket.id),
        escapeCsvValue(ticket.title),
        escapeCsvValue(ticket.complainant),
        escapeCsvValue(ticket.executor),
        escapeCsvValue(ticket.status),
        escapeCsvValue(ticket.priority),
        escapeCsvValue(ticket.category),
      ]);

      const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const filename = `admin-tickets-${new Date().toISOString().split('T')[0]}.csv`;
      downloadCsv(csv, filename);
    } catch (err) {
      console.error('Failed to export tickets:', err);
      alert('Failed to export tickets. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ALL TICKETS</h1>
        <div className="flex space-x-3">
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker((prev) => !prev)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-card hover:bg-gray-50 flex items-center text-sm"
            >
              <Columns3 size={16} className="mr-2" />
              Columns
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-card shadow-lg z-20 p-3 space-y-2">
                <div className="text-sm font-semibold text-gray-700 mb-2">Toggle Columns</div>
                {columnsConfig.map((column) => (
                  <label key={column.key} className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="mr-2 rounded text-primary focus:ring-primary"
                      checked={columnVisibility[column.key]}
                      onChange={() => toggleColumn(column.key)}
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
            onClick={handleExportTickets}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-gray-300 rounded-card hover:bg-gray-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} className="mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
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
              {visibleColumns.map((column) => {
                switch (column.key) {
                  case 'select':
                    return (
                      <th key="select" className="px-4 py-3 text-left">
                        <input type="checkbox" className="w-4 h-4 text-primary border-gray-300 rounded" />
                      </th>
                    );
                  case 'id':
                    return (
                      <th key="id" className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        ID
                      </th>
                    );
                  case 'title':
                    return (
                      <th key="title" className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Title
                      </th>
                    );
                  case 'complainant':
                    return (
                      <th key="complainant" className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Complainant
                      </th>
                    );
                  case 'executor':
                    return (
                      <th key="executor" className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Executor
                      </th>
                    );
                  case 'status':
                    return (
                      <th key="status" className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                    );
                  case 'priority':
                    return (
                      <th key="priority" className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Priority
                      </th>
                    );
                  case 'category':
                    return (
                      <th key="category" className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Category
                      </th>
                    );
                  default:
                    return null;
                }
              })}
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                onClick={() => onNavigate('executor-ticket', ticket.id)}
                className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
              >
                {columnVisibility.select && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-primary border-gray-300 rounded"
                    />
                  </td>
                )}
                {columnVisibility.id && (
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.id}</td>
                )}
                {columnVisibility.title && (
                  <td className="px-4 py-3 text-sm text-gray-700">{ticket.title}</td>
                )}
                {columnVisibility.complainant && (
                  <td className="px-4 py-3 text-sm text-gray-700">{ticket.complainant}</td>
                )}
                {columnVisibility.executor && (
                  <td className="px-4 py-3 text-sm text-gray-700">{ticket.executor}</td>
                )}
                {columnVisibility.status && (
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'open'
                          ? 'bg-info/10 text-info'
                          : ticket.status === 'in-progress'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                )}
                {columnVisibility.priority && (
                  <td className="px-4 py-3 text-sm">
                    <span className="flex items-center">
                      <span className="mr-1">{getPriorityIcon(ticket.priority)}</span>
                      {ticket.priority}
                    </span>
                  </td>
                )}
                {columnVisibility.category && (
                  <td className="px-4 py-3 text-sm text-gray-700">{ticket.category}</td>
                )}
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
