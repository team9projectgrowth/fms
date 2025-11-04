import { useState } from 'react';
import { ArrowLeft, User, MapPin, Calendar, MessageSquare, AlertCircle, Send } from 'lucide-react';

interface ExecutorTicketDetailProps {
  ticketId: string;
  onNavigate: (page: string) => void;
}

export default function ExecutorTicketDetail({ ticketId, onNavigate }: ExecutorTicketDetailProps) {
  const [status, setStatus] = useState('in-progress');
  const [comment, setComment] = useState('');
  const [updateText, setUpdateText] = useState('');
  const [sendToCustomer, setSendToCustomer] = useState(true);

  const ticket = {
    id: ticketId || 'TKT-1001',
    title: 'Air conditioning not working in Conference Room A',
    priority: 'high',
    status: 'in-progress',
    complainant: { name: 'John Smith', email: 'john.smith@company.com', dept: 'IT' },
    location: 'Building A, Floor 3, Room 301',
    category: 'HVAC',
    type: 'Maintenance',
    created: '2024-11-01 09:30 AM',
    updated: '2024-11-01 11:15 AM',
    slaProgress: 65,
    executor: 'Mike Johnson'
  };

  const activities = [
    { time: '11:15 AM', user: 'Mike Johnson', action: 'Status changed to In Progress', type: 'status' },
    { time: '11:00 AM', user: 'Mike Johnson', action: 'Ticket assigned', type: 'assignment' },
    { time: '09:30 AM', user: 'John Smith', action: 'Ticket created', type: 'create' }
  ];

  return (
    <div>
      <button
        onClick={() => onNavigate('executor-dashboard')}
        className="flex items-center text-gray-700 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Tickets
      </button>

      <div className="flex items-center mb-6">
        <span className="text-2xl mr-3">
          {ticket.priority === 'critical' ? '🔴' : ticket.priority === 'high' ? '🟠' : '🟡'}
        </span>
        <h1 className="text-2xl font-bold text-gray-900">{ticket.id}</h1>
        <span className="ml-4 px-3 py-1 bg-warning/10 text-warning rounded-full text-sm font-medium">
          {ticket.priority}
        </span>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-6">{ticket.title}</h2>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-card shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Ticket Details</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Priority</label>
                <div className="px-3 py-2 bg-gray-100 rounded-card">{ticket.priority}</div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex">
                <User size={16} className="mr-2 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium text-gray-900">{ticket.complainant.name}</div>
                  <div className="text-gray-500">{ticket.complainant.email}</div>
                  <div className="text-gray-500">{ticket.complainant.dept}</div>
                </div>
              </div>
              <div className="flex">
                <MapPin size={16} className="mr-2 text-gray-500 mt-0.5" />
                <div className="text-gray-700">{ticket.location}</div>
              </div>
              <div className="flex">
                <AlertCircle size={16} className="mr-2 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-gray-700">Category: {ticket.category}</div>
                  <div className="text-gray-500">Type: {ticket.type}</div>
                </div>
              </div>
              <div className="flex">
                <Calendar size={16} className="mr-2 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-gray-700">Created: {ticket.created}</div>
                  <div className="text-gray-500">Updated: {ticket.updated}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-card shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Activity Timeline</h3>
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={index} className="flex">
                  <div className="relative">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    {index < activities.length - 1 && (
                      <div className="absolute top-3 left-1.5 w-px h-8 bg-gray-300"></div>
                    )}
                  </div>
                  <div className="ml-4 pb-4">
                    <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                    <div className="text-xs text-gray-500">{activity.user} • {activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-card shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Add Update</h3>
            <textarea
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              placeholder="Enter update details..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary mb-3"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={sendToCustomer}
                  onChange={(e) => setSendToCustomer(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded mr-2"
                />
                Send to customer
              </label>
              <button className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center">
                <Send size={16} className="mr-2" />
                Post Update
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-card shadow-sm p-5 sticky top-0">
            <h3 className="font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-success text-white rounded-card hover:bg-success/90">
                Mark Resolved
              </button>
              <button className="w-full px-4 py-2 bg-danger text-white rounded-card hover:bg-danger/90">
                Escalate
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-300">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">SLA Progress</h4>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Time Remaining</span>
                  <span className={ticket.slaProgress > 75 ? 'text-danger' : 'text-success'}>
                    {ticket.slaProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      ticket.slaProgress > 75 ? 'bg-danger' : 'bg-success'
                    }`}
                    style={{ width: `${ticket.slaProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-300">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Assigned To</h4>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium mr-2">
                  MJ
                </div>
                <div className="text-sm text-gray-700">{ticket.executor}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
