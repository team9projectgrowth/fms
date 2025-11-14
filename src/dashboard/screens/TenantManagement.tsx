import { useState, useEffect } from 'react';
import { Building, Mail, Phone, MapPin, User, Save, AlertCircle, CheckCircle, Webhook } from 'lucide-react';
import { tenantsService } from '../../services/tenants.service';
import { authService } from '../../services/auth.service';
import type { Tenant, UpdateTenantInput } from '../../types/database';

interface TenantManagementProps {
  onNavigate: (page: string) => void;
}

export default function TenantManagement({ onNavigate }: TenantManagementProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contactPerson: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    maxUsers: 10,
    automationWebhookUrl: '',
  });

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated. Please log in again.');
      }

      if (!currentUser.tenant_id) {
        throw new Error(`Tenant ID not found in user profile. User ID: ${currentUser.id}, Role: ${currentUser.role}. Please contact your administrator.`);
      }

      console.log('Attempting to load tenant:', currentUser.tenant_id);
      const tenantData = await tenantsService.getTenantById(currentUser.tenant_id);
      
      if (!tenantData) {
        throw new Error(`Tenant not found for ID: ${currentUser.tenant_id}. This may be an RLS policy issue, the tenant may not exist, or you may not have permission to access it.`);
      }
      
      setTenant(tenantData);
      setFormData({
        name: tenantData.name,
        email: tenantData.email,
        phone: tenantData.phone || '',
        contactPerson: tenantData.contact_person || '',
        address: tenantData.address || '',
        city: tenantData.city || '',
        state: tenantData.state || '',
        country: tenantData.country || '',
        postalCode: tenantData.postal_code || '',
        maxUsers: tenantData.max_users,
        automationWebhookUrl: tenantData.automation_webhook_url || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load tenant information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser?.tenant_id) {
        throw new Error('Tenant ID not found');
      }

      // Validate webhook URL format if provided
      if (formData.automationWebhookUrl && formData.automationWebhookUrl.trim()) {
        try {
          new URL(formData.automationWebhookUrl.trim());
        } catch {
          throw new Error('Invalid webhook URL format. Please enter a valid URL (e.g., https://example.com/webhook)');
        }
      }

      const updates: UpdateTenantInput = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        contact_person: formData.contactPerson || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        postal_code: formData.postalCode || undefined,
        max_users: formData.maxUsers,
        automation_webhook_url: formData.automationWebhookUrl.trim() || undefined,
      };

      const updatedTenant = await tenantsService.updateTenant(currentUser.tenant_id, updates);
      setTenant(updatedTenant);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update tenant information');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'maxUsers' ? parseInt(value) || 0 : value,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tenant information...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tenant Management</h1>
        <p className="text-gray-600">Manage your organization's settings and information</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="text-red-500 mr-3 mt-0.5" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="text-green-500 mr-3 mt-0.5" size={20} />
          <p className="text-green-700 text-sm">Tenant information updated successfully!</p>
        </div>
      )}

      <div className="bg-white rounded-card shadow-sm p-6">
        {tenant && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Subscription Information</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Status: </span>
                <span className={`font-medium ${
                  tenant.subscription_status === 'active' ? 'text-green-600' :
                  tenant.subscription_status === 'trial' ? 'text-blue-600' :
                  'text-red-600'
                }`}>
                  {tenant.subscription_status.toUpperCase()}
                </span>
              </div>
              {tenant.subscription_start_date && (
                <div>
                  <span className="text-blue-700">Start Date: </span>
                  <span className="font-medium">{new Date(tenant.subscription_start_date).toLocaleDateString()}</span>
                </div>
              )}
              {tenant.subscription_end_date && (
                <div>
                  <span className="text-blue-700">End Date: </span>
                  <span className="font-medium">{new Date(tenant.subscription_end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-blue-600 mt-2">Subscription details are managed by system administrators</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                  placeholder="Your Organization Name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                  placeholder="contact@organization.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="contactPerson" className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Person
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                  placeholder="123 Main Street"
                />
              </div>
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="New York"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-semibold text-gray-700 mb-2">
                State/Province
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="NY"
              />
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-gray-700 mb-2">
                Country
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="United States"
              />
            </div>

            <div>
              <label htmlFor="postalCode" className="block text-sm font-semibold text-gray-700 mb-2">
                Postal/ZIP Code
              </label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="10001"
              />
            </div>

            <div>
              <label htmlFor="maxUsers" className="block text-sm font-semibold text-gray-700 mb-2">
                Maximum Users
              </label>
              <input
                type="number"
                id="maxUsers"
                name="maxUsers"
                value={formData.maxUsers}
                onChange={handleChange}
                min={1}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                placeholder="10"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum number of users allowed for this tenant</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Integration</h3>
            <div className="md:col-span-2">
              <label htmlFor="automationWebhookUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                Automation Webhook URL
              </label>
              <div className="relative">
                <Webhook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="url"
                  id="automationWebhookUrl"
                  name="automationWebhookUrl"
                  value={formData.automationWebhookUrl}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none transition-colors"
                  placeholder="https://example.com/automation/webhook"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Webhook URL for automation layer to receive ticket updates. Leave empty to disable webhook notifications.
                {formData.automationWebhookUrl && (
                  <span className="block mt-1 text-green-600">
                    ✓ Webhook configured
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => onNavigate('tenant-admin-dashboard')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? 'Saving...' : 'Save Changes'}
              {!saving && <Save className="ml-2" size={20} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

