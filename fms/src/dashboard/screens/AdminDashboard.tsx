import { Ticket, Clock, CheckCircle, TrendingUp, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const metrics = [
    { label: 'Today Total', value: '127', icon: Ticket, color: 'bg-primary', change: '+12%' },
    { label: 'Open', value: '45', icon: Clock, color: 'bg-info', change: '+5%' },
    { label: 'In Progress', value: '38', icon: Activity, color: 'bg-warning', change: '-3%' },
    { label: 'Resolved', value: '44', icon: CheckCircle, color: 'bg-success', change: '+8%' },
    { label: 'SLA Met', value: '92%', icon: TrendingUp, color: 'bg-success', change: '+2%' }
  ];

  const recentActivity = [
    { time: '2 min ago', user: 'John Smith', action: 'created ticket TKT-1045' },
    { time: '5 min ago', user: 'Mike Johnson', action: 'resolved ticket TKT-1022' },
    { time: '12 min ago', user: 'Sarah Wilson', action: 'updated ticket TKT-1033' },
    { time: '18 min ago', user: 'Admin', action: 'created new category "Electrical"' },
    { time: '25 min ago', user: 'Tom Brown', action: 'escalated ticket TKT-1019' }
  ];

  const chartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const ticketsByCategory = [
    { name: 'HVAC', value: 35, color: '#0066FF' },
    { name: 'Electrical', value: 25, color: '#00CC66' },
    { name: 'Plumbing', value: 20, color: '#FFAA00' },
    { name: 'Furniture', value: 12, color: '#FF3333' },
    { name: 'Other', value: 8, color: '#2196F3' }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-5 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white rounded-card shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`${metric.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="text-white" size={24} />
                </div>
                <span className={`text-xs font-medium ${
                  metric.change.startsWith('+') ? 'text-success' : 'text-danger'
                }`}>
                  {metric.change}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-500">{metric.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-card shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Tickets Last 7 Days</h2>
          <div className="h-64 flex items-end justify-between space-x-2">
            {chartData.map((day, index) => {
              const height = Math.random() * 100 + 50;
              return (
                <div key={day} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-primary rounded-t" style={{ height: `${height}px` }}></div>
                  <div className="text-xs text-gray-500 mt-2">{day}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-card shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Tickets by Category</h2>
          <div className="flex items-center justify-center h-64">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                {ticketsByCategory.map((category, index) => {
                  const total = ticketsByCategory.reduce((sum, cat) => sum + cat.value, 0);
                  const percentage = (category.value / total) * 100;
                  const circumference = 2 * Math.PI * 70;
                  const offset = circumference * (1 - percentage / 100);

                  return (
                    <circle
                      key={index}
                      cx="96"
                      cy="96"
                      r="70"
                      fill="none"
                      stroke={category.color}
                      strokeWidth="24"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      className="transition-all"
                    />
                  );
                })}
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {ticketsByCategory.map((category, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                <span className="text-xs text-gray-700">{category.name} ({category.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-start pb-3 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 bg-primary rounded-full mt-1.5 mr-3"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{activity.user}</span> {activity.action}
                </p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
