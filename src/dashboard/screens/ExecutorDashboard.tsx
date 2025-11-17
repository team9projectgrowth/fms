import { useState } from 'react';
import { Clock, MapPin, User, ChevronRight } from 'lucide-react';

interface ExecutorDashboardProps {
  onNavigate: (page: string, ticketId?: string) => void;
}

export default function ExecutorDashboard({ onNavigate }: ExecutorDashboardProps) {
  const [activeTab, setActiveTab] = useState('all');

  const tickets = [
    {
      id: 'TKT-1001',
      title: 'Air conditioning not working in Conference Room A',
      complainant: 'John Smith',
      location: 'Building A, Floor 3, Room 301',
      priority: 'high',
      status: 'open',
      slaTime: '2h 15m',
      slaStatus: 'warning',
      created: '2 hours ago'
    },
    {
      id: 'TKT-1002',
      title: 'Broken chair needs replacement',
      complainant: 'Sarah Johnson',
      location: 'Building B, Floor 2, Workstation 45',
      priority: 'low',
      status: 'in-progress',
      slaTime: '1d 4h',
      slaStatus: 'ok',
      created: '5 hours ago'
    },
    {
      id: 'TKT-1003',
      title: 'Water leakage in restroom',
      complainant: 'Mike Davis',
      location: 'Building A, Floor 1, Restroom M',
      priority: 'critical',
      status: 'open',
      slaTime: '45m',
      slaStatus: 'danger',
      created: '30 minutes ago'
    },
    {
      id: 'TKT-1004',
      title: 'Printer not responding',
      complainant: 'Emily Chen',
      location: 'Building C, Floor 4, Print Room',
      priority: 'medium',
      status: 'in-progress',
      slaTime: '6h 20m',
      slaStatus: 'ok',
      created: '1 day ago'
    }
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

  const getSLAColor = (status: string) => {
    switch (status) {
      case 'danger': return 'text-danger';
      case 'warning': return 'text-warning';
      default: return 'text-success';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return ticket.status === 'open';
    if (activeTab === 'in-progress') return ticket.status === 'in-progress';
    if (activeTab === 'resolved') return ticket.status === 'resolved';
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">ASSIGNED TICKETS</h1>
          <span className="ml-3 px-3 py-1 bg-primary text-white rounded-full text-sm font-medium">
            {tickets.length}
          </span>
        </div>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-gray-300">
        {[
          { id: 'all', label: 'All' },
          { id: 'open', label: 'Open' },
          { id: 'in-progress', label: 'In Progress' },
          { id: 'resolved', label: 'Resolved' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredTickets.map(ticket => (
          <div
            key={ticket.id}
            onClick={() => onNavigate('executor-ticket', ticket.id)}
            className="bg-white rounded-card shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-xl mr-2">{getPriorityIcon(ticket.priority)}</span>
                  <span className="font-bold text-gray-900">{ticket.id}</span>
                  <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                    ticket.status === 'open' ? 'bg-info/10 text-info' :
                    ticket.status === 'in-progress' ? 'bg-warning/10 text-warning' :
                    'bg-success/10 text-success'
                  }`}>
                    {ticket.status.replace('-', ' ')}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  {ticket.title}
                </h3>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <User size={16} className="mr-2" />
                    {ticket.complainant}
                  </div>
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-2" />
                    {ticket.location}
                  </div>
                  <div className="flex items-center">
                    <Clock size={16} className="mr-2" />
                    {ticket.created}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end ml-4">
                <div className={`text-sm font-bold ${getSLAColor(ticket.slaStatus)} mb-2`}>
                  SLA: {ticket.slaTime}
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
