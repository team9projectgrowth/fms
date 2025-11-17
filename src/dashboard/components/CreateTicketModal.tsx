import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import type { Category, User, ExecutorProfileWithUser, TicketPriority } from '../../types/database';
import { supabase } from '../../lib/supabase';

interface CreateTicketModalProps {
  categories: Category[];
  complainants: User[];
  executors: ExecutorProfileWithUser[];
  onClose: () => void;
  onSubmit: (ticketData: any) => void;
}

export default function CreateTicketModal({ categories, complainants, executors, onClose, onSubmit }: CreateTicketModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as TicketPriority,
    type: '',
    location: '',
    building: '',
    floor: '',
    room: '',
    complainant_id: '', // Can be selected from dropdown
    complainant_email: '', // Can be entered manually
    executor_profile_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);

  const priorities: { value: TicketPriority; label: string }[] = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const types = ['Maintenance', 'Repair', 'Installation', 'Inspection', 'Emergency', 'Request'];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    
    // If complainant_id is selected, clear email and found user
    if (name === 'complainant_id' && value) {
      setFormData({ ...formData, [name]: value, complainant_email: '' });
      setFoundUser(null);
    } 
    // If email is entered, clear complainant_id and found user
    else if (name === 'complainant_email') {
      setFormData({ ...formData, [name]: value, complainant_id: '' });
      setFoundUser(null);
    } 
    else {
      setFormData({ ...formData, [name]: value });
    }
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  }

  async function handleEmailLookup() {
    if (!formData.complainant_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.complainant_email)) {
      setErrors({ ...errors, complainant_email: 'Please enter a valid email address' });
      return;
    }

    try {
      setSearchingUser(true);
      setErrors({ ...errors, complainant_email: '' });

      // Search for user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, tenant_id, role')
        .eq('email', formData.complainant_email.trim().toLowerCase())
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!userData) {
        setErrors({ ...errors, complainant_email: 'User not found. Please create the user in the Users section first.' });
        return;
      }

      // Check if user is a complainant or can be a complainant
      if (userData.role !== 'complainant' && userData.role !== 'tenant_admin' && userData.role !== 'admin') {
        setErrors({ ...errors, complainant_email: 'This user is not a complainant. Please select a different user.' });
        return;
      }

      // Set the complainant_id and store found user info
      setFormData({ ...formData, complainant_id: userData.id, complainant_email: formData.complainant_email });
      setFoundUser(userData as User);
      setErrors({ ...errors, complainant_email: '' });
    } catch (err: any) {
      setErrors({ ...errors, complainant_email: err?.message || 'Error searching for user. Please try again.' });
    } finally {
      setSearchingUser(false);
    }
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    
    // Validate complainant - either ID or email must be provided
    if (!formData.complainant_id && !formData.complainant_email.trim()) {
      newErrors.complainant_id = 'Please select a complainant from the list or enter an email address.';
    }
    
    // If email is provided, validate format
    if (formData.complainant_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.complainant_email)) {
      newErrors.complainant_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      
      let finalComplainantId = formData.complainant_id;

      // If email is provided but no ID, look up the user
      if (!finalComplainantId && formData.complainant_email) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, full_name, tenant_id, role')
          .eq('email', formData.complainant_email.trim().toLowerCase())
          .maybeSingle();

        if (userError) {
          throw new Error('Error searching for user: ' + userError.message);
        }

        if (!userData) {
          setErrors({ ...errors, complainant_email: 'User not found. Please create the user in the Users section first.' });
          setLoading(false);
          return;
        }

        // Check if user is a complainant or can be a complainant
        if (userData.role !== 'complainant' && userData.role !== 'tenant_admin' && userData.role !== 'admin') {
          setErrors({ ...errors, complainant_email: 'This user is not a complainant. Please select a different user.' });
          setLoading(false);
          return;
        }

        finalComplainantId = userData.id;
      }

      // Verify we have a complainant_id
      if (!finalComplainantId) {
        setErrors({ ...errors, complainant_id: 'Please select a complainant from the list or enter a valid email address.' });
        setLoading(false);
        return;
      }

      await onSubmit({
        ...formData,
        complainant_id: finalComplainantId,
      });
    } catch (err: any) {
      alert(err?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Create New Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                  errors.title ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter ticket title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.title}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.category}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe the issue in detail"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority *
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                  errors.priority ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.priority}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                  errors.type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Type</option>
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.type}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Building A, Floor 3"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.location}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building
              </label>
              <input
                type="text"
                name="building"
                value={formData.building}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="Building"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor
              </label>
              <input
                type="text"
                name="floor"
                value={formData.floor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="Floor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room
              </label>
              <input
                type="text"
                name="room"
                value={formData.room}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                placeholder="Room"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Complainant *
              </label>
              <select
                name="complainant_id"
                value={formData.complainant_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                  errors.complainant_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Complainant from List</option>
                {complainants.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.full_name || comp.email} {comp.email && `(${comp.email})`}
                  </option>
                ))}
              </select>
              {errors.complainant_id && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.complainant_id}
                </p>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Enter Email Address *
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  name="complainant_email"
                  value={formData.complainant_email}
                  onChange={handleChange}
                  onBlur={handleEmailLookup}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:border-primary ${
                    errors.complainant_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="complainant@example.com"
                  disabled={!!formData.complainant_id || searchingUser}
                />
                <button
                  type="button"
                  onClick={handleEmailLookup}
                  disabled={!formData.complainant_email || !!formData.complainant_id || searchingUser}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {searchingUser ? 'Searching...' : 'Search'}
                </button>
              </div>
              {errors.complainant_email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.complainant_email}
                </p>
              )}
              {formData.complainant_id && (foundUser || complainants.find(c => c.id === formData.complainant_id)) && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ User found: {foundUser?.full_name || complainants.find(c => c.id === formData.complainant_id)?.full_name || formData.complainant_email}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter email to search for a user. If not found, create them in the Users section first.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign To (Optional)
              </label>
              <select
                name="executor_profile_id"
                value={formData.executor_profile_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Unassigned</option>
                {executors.map(exec => (
                  <option key={exec.id} value={exec.id}>
                    {exec.user?.full_name || exec.user?.name || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <Save size={16} />
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

