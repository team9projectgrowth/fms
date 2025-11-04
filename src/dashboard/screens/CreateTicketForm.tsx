import { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';

interface CreateTicketFormProps {
  onClose: () => void;
  onSubmit: (ticketData: any) => void;
}

export default function CreateTicketForm({ onClose, onSubmit }: CreateTicketFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: '',
    type: '',
    location: '',
    building: '',
    floor: '',
    room: '',
    complainant: '',
    email: '',
    phone: '',
    attachments: [] as File[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = ['HVAC', 'Electrical', 'Plumbing', 'Furniture', 'IT Support', 'Cleaning', 'Security'];
  const priorities = [
    { value: 'critical', label: 'Critical', icon: '🔴' },
    { value: 'high', label: 'High', icon: '🟠' },
    { value: 'medium', label: 'Medium', icon: '🟡' },
    { value: 'low', label: 'Low', icon: '🟢' }
  ];
  const types = ['Maintenance', 'Repair', 'Installation', 'Inspection', 'Emergency'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, attachments: Array.from(e.target.files) });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.complainant.trim()) newErrors.complainant = 'Complainant name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-card shadow-xl max-w-3xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between rounded-t-card">
          <h2 className="text-xl font-bold text-gray-900">Create New Ticket</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-card focus:outline-none focus:border-primary ${
                errors.title ? 'border-danger' : 'border-gray-300'
              }`}
              placeholder="Brief description of the issue"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-danger flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-card focus:outline-none focus:border-primary resize-none ${
                errors.description ? 'border-danger' : 'border-gray-300'
              }`}
              placeholder="Detailed description of the problem..."
            />
            {errors.description && (
              <p className="mt-1 text-xs text-danger flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category <span className="text-danger">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-card focus:outline-none focus:border-primary ${
                  errors.category ? 'border-danger' : 'border-gray-300'
                }`}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-xs text-danger">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Priority <span className="text-danger">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-card focus:outline-none focus:border-primary ${
                  errors.priority ? 'border-danger' : 'border-gray-300'
                }`}
              >
                <option value="">Select Priority</option>
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                ))}
              </select>
              {errors.priority && (
                <p className="mt-1 text-xs text-danger">{errors.priority}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Type <span className="text-danger">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-card focus:outline-none focus:border-primary ${
                  errors.type ? 'border-danger' : 'border-gray-300'
                }`}
              >
                <option value="">Select Type</option>
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-xs text-danger">{errors.type}</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-300 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-card focus:outline-none focus:border-primary ${
                    errors.location ? 'border-danger' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Building A, Floor 3, Room 301"
                />
                {errors.location && (
                  <p className="mt-1 text-xs text-danger">{errors.location}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
                <input
                  type="text"
                  name="building"
                  value={formData.building}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                <input
                  type="text"
                  name="floor"
                  value={formData.floor}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="3"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Room/Area</label>
              <input
                type="text"
                name="room"
                value={formData.room}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                placeholder="Room 301 or Conference Room A"
              />
            </div>
          </div>

          <div className="border-t border-gray-300 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Complainant Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="complainant"
                  value={formData.complainant}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-card focus:outline-none focus:border-primary ${
                    errors.complainant ? 'border-danger' : 'border-gray-300'
                  }`}
                  placeholder="John Smith"
                />
                {errors.complainant && (
                  <p className="mt-1 text-xs text-danger">{errors.complainant}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-card focus:outline-none focus:border-primary ${
                    errors.email ? 'border-danger' : 'border-gray-300'
                  }`}
                  placeholder="john@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-danger">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
                  placeholder="555-0123"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-card p-6 text-center hover:border-primary transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, PDF up to 10MB
                </p>
              </label>
              {formData.attachments.length > 0 && (
                <div className="mt-3 text-left">
                  <p className="text-xs font-medium text-gray-700 mb-1">Selected files:</p>
                  {formData.attachments.map((file, index) => (
                    <p key={index} className="text-xs text-gray-600">• {file.name}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-300">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-card hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-card hover:bg-primary/90"
            >
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
