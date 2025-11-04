import { useState, useEffect } from 'react';
import { Building, Search, CheckCircle, XCircle, Power, Edit, Eye, Filter, Ban, X, Save } from 'lucide-react';
import { tenantsService } from '../../services/tenants.service';
import { authService } from '../../services/auth.service';
import type { Tenant, UpdateTenantInput } from '../../types/database';

interface SuperAdminTenantManagementProps {
  onNavigate: (page: string) => void;
}

export default function SuperAdminTenantManagement({ onNavigate }: SuperAdminTenantManagementProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSubscriptionStatus, setSelectedSubscriptionStatus] = useState<string>('all');
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<string>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    contact_person: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    subscription_status: 'trial' as 'trial' | 'active' | 'inactive' | 'expired',
    max_users: 10,
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await tenantsService.getTenants();
      setTenants(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tenantId: string) => {
    try {
      setProcessingIds(new Set([...processingIds, tenantId]));
      setError(null);
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      await tenantsService.approveTenant(tenantId, currentUser.id);
      setSuccess('Tenant approved successfully');
      await loadTenants();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to approve tenant');
    } finally {
      setProcessingIds(new Set([...processingIds].filter(id => id !== tenantId)));
    }
  };

  const handleReject = async (tenantId: string) => {
    try {
      setProcessingIds(new Set([...processingIds, tenantId]));
      setError(null);
      
      await tenantsService.rejectTenant(tenantId);
      setSuccess('Tenant rejected');
      await loadTenants();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reject tenant');
    } finally {
      setProcessingIds(new Set([...processingIds].filter(id => id !== tenantId)));
    }
  };

  const handleToggleActive = async (tenantId: string, currentActive: boolean) => {
    try {
      setProcessingIds(new Set([...processingIds, tenantId]));
      setError(null);
      
      await tenantsService.toggleActive(tenantId, !currentActive);
      setSuccess(`Tenant ${!currentActive ? 'activated' : 'deactivated'} successfully`);
      await loadTenants();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update tenant status');
    } finally {
      setProcessingIds(new Set([...processingIds].filter(id => id !== tenantId)));
    }
  };

  const handleDelete = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingIds(new Set([...processingIds, tenantId]));
      setError(null);
      
      await tenantsService.deleteTenant(tenantId);
      setSuccess('Tenant deleted successfully');
      await loadTenants();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete tenant');
    } finally {
      setProcessingIds(new Set([...processingIds].filter(id => id !== tenantId)));
    }
  };

  const handleEditClick = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      contact_person: tenant.contact_person || '',
      address: tenant.address || '',
      city: tenant.city || '',
      state: tenant.state || '',
      country: tenant.country || '',
      postal_code: tenant.postal_code || '',
      subscription_status: tenant.subscription_status,
      max_users: tenant.max_users,
    });
  };

  const handleEditSave = async () => {
    if (!editingTenant) return;

    try {
      setProcessingIds(new Set([...processingIds, editingTenant.id]));
      setError(null);

      const updates: UpdateTenantInput = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || undefined,
        contact_person: editFormData.contact_person || undefined,
        address: editFormData.address || undefined,
        city: editFormData.city || undefined,
        state: editFormData.state || undefined,
        country: editFormData.country || undefined,
        postal_code: editFormData.postal_code || undefined,
        subscription_status: editFormData.subscription_status,
        max_users: editFormData.max_users,
      };

      await tenantsService.updateTenant(editingTenant.id, updates);
      setSuccess('Tenant updated successfully');
      setEditingTenant(null);
      await loadTenants();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update tenant');
    } finally {
      setProcessingIds(new Set([...processingIds].filter(id => id !== editingTenant.id)));
    }
  };

  const handleEditCancel = () => {
    setEditingTenant(null);
    setEditFormData({
      name: '',
      email: '',
      phone: '',
      contact_person: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      subscription_status: 'trial',
      max_users: 10,
    });
  };

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = !searchTerm || 
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tenant.contact_person && tenant.contact_person.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesActiveStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && tenant.active) ||
      (selectedStatus === 'inactive' && !tenant.active);

    const matchesSubscription = selectedSubscriptionStatus === 'all' || 
      tenant.subscription_status === selectedSubscriptionStatus;

    const matchesApproval = selectedApprovalStatus === 'all' ||
      (selectedApprovalStatus === 'approved' && tenant.approved) ||
      (selectedApprovalStatus === 'pending' && !tenant.approved);

    return matchesSearch && matchesActiveStatus && matchesSubscription && matchesApproval;
  });

  const stats = {
    total: tenants.length,
    approved: tenants.filter(t => t.approved).length,
    pending: tenants.filter(t => !t.approved).length,
    active: tenants.filter(t => t.active).length,
    inactive: tenants.filter(t => !t.active).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tenant Management</h1>
        <p className="text-gray-600">Manage all tenants and approve registration requests</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <XCircle className="text-red-500 mr-3 mt-0.5" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircle className="text-green-500 mr-3 mt-0.5" size={20} />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-card shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Tenants</div>
        </div>
        <div className="bg-blue-50 rounded-card shadow-sm p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          <div className="text-sm text-blue-600">Pending Approval</div>
        </div>
        <div className="bg-green-50 rounded-card shadow-sm p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-green-600">Approved</div>
        </div>
        <div className="bg-purple-50 rounded-card shadow-sm p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{stats.active}</div>
          <div className="text-sm text-purple-600">Active</div>
        </div>
        <div className="bg-gray-50 rounded-card shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          <div className="text-sm text-gray-600">Inactive</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-card shadow-sm p-4 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div>
            <select
              value={selectedApprovalStatus}
              onChange={(e) => setSelectedApprovalStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Approval Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <select
              value={selectedSubscriptionStatus}
              onChange={(e) => setSelectedSubscriptionStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Subscriptions</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Max Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No tenants found
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Building className="text-gray-400 mr-3" size={20} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-xs text-gray-500">{tenant.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {tenant.phone || 'N/A'}
                      </div>
                      {tenant.contact_person && (
                        <div className="text-xs text-gray-500">{tenant.contact_person}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        tenant.subscription_status === 'active' ? 'bg-green-100 text-green-800' :
                        tenant.subscription_status === 'trial' ? 'bg-blue-100 text-blue-800' :
                        tenant.subscription_status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tenant.subscription_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {tenant.approved ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full w-fit ${
                            tenant.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tenant.active ? 'Active' : 'Inactive'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full w-fit bg-orange-100 text-orange-800">
                            Pending Approval
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {tenant.max_users}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {!tenant.approved && (
                          <>
                            <button
                              onClick={() => handleApprove(tenant.id)}
                              disabled={processingIds.has(tenant.id)}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckCircle size={20} />
                            </button>
                            <button
                              onClick={() => handleReject(tenant.id)}
                              disabled={processingIds.has(tenant.id)}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Reject"
                            >
                              <Ban size={20} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleToggleActive(tenant.id, tenant.active)}
                          disabled={processingIds.has(tenant.id)}
                          className={`hover:opacity-70 disabled:opacity-50 ${
                            tenant.active ? 'text-orange-600' : 'text-green-600'
                          }`}
                          title={tenant.active ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={20} />
                        </button>
                        <button
                          onClick={() => handleEditClick(tenant)}
                          disabled={processingIds.has(tenant.id)}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          title="Edit"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.id)}
                          disabled={processingIds.has(tenant.id)}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Tenant</h2>
              <button
                onClick={handleEditCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={editFormData.contact_person}
                      onChange={(e) => setEditFormData({...editFormData, contact_person: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={editFormData.state}
                      onChange={(e) => setEditFormData({...editFormData, state: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={editFormData.country}
                      onChange={(e) => setEditFormData({...editFormData, country: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={editFormData.postal_code}
                      onChange={(e) => setEditFormData({...editFormData, postal_code: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subscription Status
                    </label>
                    <select
                      value={editFormData.subscription_status}
                      onChange={(e) => setEditFormData({...editFormData, subscription_status: e.target.value as any})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Users
                    </label>
                    <input
                      type="number"
                      value={editFormData.max_users}
                      onChange={(e) => setEditFormData({...editFormData, max_users: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-4">
              <button
                onClick={handleEditCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={processingIds.has(editingTenant.id)}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save size={20} className="mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

