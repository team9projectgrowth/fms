import { useState, useEffect } from 'react';
import {
  Building,
  Search,
  CheckCircle,
  XCircle,
  Power,
  Edit,
  Eye,
  Filter,
  Ban,
  X,
  Save,
  User,
  Mail,
  Lock,
} from 'lucide-react';
import { tenantsService } from '../../services/tenants.service';
import { authService } from '../../services/auth.service';
import type { Tenant, UpdateTenantInput, User as TenantUser } from '../../types/database';

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
  const [showCreateTenantModal, setShowCreateTenantModal] = useState(false);
  const [createTenantForm, setCreateTenantForm] = useState({
    tenantName: '',
    tenantEmail: '',
    phone: '',
    contact_person: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    subscription_status: 'trial' as 'trial' | 'active' | 'inactive' | 'expired',
    max_users: 10,
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [createTenantError, setCreateTenantError] = useState<string | null>(null);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedTenantForReset, setSelectedTenantForReset] = useState<Tenant | null>(null);
  const [tenantAdmins, setTenantAdmins] = useState<TenantUser[]>([]);
  const [selectedTenantAdminId, setSelectedTenantAdminId] = useState<string>('');
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [editTenantAdmin, setEditTenantAdmin] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
  });
  const [originalTenantAdmin, setOriginalTenantAdmin] = useState({
    name: '',
    email: '',
  });
  const [editTenantAdminLoading, setEditTenantAdminLoading] = useState(false);
  const [editTenantAdminError, setEditTenantAdminError] = useState<string | null>(null);

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

  const handleEditClick = async (tenant: Tenant) => {
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
    setEditTenantAdmin({
      id: '',
      name: '',
      email: '',
      password: '',
    });
    setOriginalTenantAdmin({
      name: '',
      email: '',
    });
    setEditTenantAdminError(null);
    setEditTenantAdminLoading(true);

    try {
      const admins = await tenantsService.getTenantAdminUsers(tenant.id);
      if (admins.length > 0) {
        const admin = admins[0];
        const adminName = (admin.full_name || (admin as any).name || '').toString();
        const adminEmail = admin.email || '';
        setEditTenantAdmin({
          id: admin.id,
          name: adminName,
          email: adminEmail,
          password: '',
        });
        setOriginalTenantAdmin({
          name: adminName,
          email: adminEmail,
        });
      } else {
        setEditTenantAdminError('No tenant admin found for this tenant.');
      }
    } catch (err: any) {
      setEditTenantAdminError(err.message || 'Failed to load tenant admin details.');
    } finally {
      setEditTenantAdminLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingTenant) return;

    try {
      setProcessingIds(new Set([...processingIds, editingTenant.id]));
      setError(null);
      setEditTenantAdminError(null);

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

       if (editTenantAdmin.id) {
        const adminUpdates: { name?: string; email?: string } = {};
        const trimmedAdminName = editTenantAdmin.name.trim();
        const trimmedAdminEmail = editTenantAdmin.email.trim();

        if (trimmedAdminName && trimmedAdminName !== originalTenantAdmin.name) {
          adminUpdates.name = trimmedAdminName;
        }
        if (trimmedAdminEmail && trimmedAdminEmail !== originalTenantAdmin.email) {
          adminUpdates.email = trimmedAdminEmail;
        }

        if (Object.keys(adminUpdates).length > 0) {
          await tenantsService.updateTenantAdminUser(editTenantAdmin.id, adminUpdates);
        }

        if (editTenantAdmin.password.trim()) {
          await tenantsService.resetTenantAdminPassword(
            editingTenant.id,
            editTenantAdmin.id,
            editTenantAdmin.password.trim()
          );
        }
      }

      setSuccess('Tenant updated successfully');
      setEditingTenant(null);
      setEditTenantAdmin({
        id: '',
        name: '',
        email: '',
        password: '',
      });
      setOriginalTenantAdmin({
        name: '',
        email: '',
      });
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
    setEditTenantAdmin({
      id: '',
      name: '',
      email: '',
      password: '',
    });
    setOriginalTenantAdmin({
      name: '',
      email: '',
    });
    setEditTenantAdminError(null);
    setEditTenantAdminLoading(false);
  };

  const handleOpenCreateTenantModal = () => {
    setCreateTenantForm({
      tenantName: '',
      tenantEmail: '',
      phone: '',
      contact_person: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      subscription_status: 'trial',
      max_users: 10,
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    });
    setCreateTenantError(null);
    setShowCreateTenantModal(true);
  };

  const handleOpenResetPasswordModal = async (tenant: Tenant) => {
    setResetPasswordError(null);
    setResetPasswordForm({ password: '', confirmPassword: '' });
    setTenantAdmins([]);
    setSelectedTenantAdminId('');
    setSelectedTenantForReset(tenant);
    setShowResetPasswordModal(true);

    try {
      const admins = await tenantsService.getTenantAdminUsers(tenant.id);
      setTenantAdmins(admins);
      if (admins.length === 1) {
        setSelectedTenantAdminId(admins[0].id);
      }
    } catch (err: any) {
      setResetPasswordError(err.message || 'Failed to load tenant admins.');
    }
  };

  const handleCloseResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setSelectedTenantForReset(null);
    setTenantAdmins([]);
    setSelectedTenantAdminId('');
    setResetPasswordForm({ password: '', confirmPassword: '' });
    setResetPasswordError(null);
    setResettingPassword(false);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedTenantForReset) {
      setResetPasswordError('No tenant selected.');
      return;
    }

    if (!selectedTenantAdminId) {
      setResetPasswordError('Please select a tenant admin account.');
      return;
    }

    if (!resetPasswordForm.password.trim() || !resetPasswordForm.confirmPassword.trim()) {
      setResetPasswordError('Please enter and confirm the new password.');
      return;
    }

    if (resetPasswordForm.password.length < 8) {
      setResetPasswordError('Password must be at least 8 characters.');
      return;
    }

    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      setResetPasswordError('Passwords do not match.');
      return;
    }

    try {
      setResettingPassword(true);
      setResetPasswordError(null);

      await tenantsService.resetTenantAdminPassword(
        selectedTenantForReset.id,
        selectedTenantAdminId,
        resetPasswordForm.password
      );

      setSuccess('Tenant admin password reset successfully');
      handleCloseResetPasswordModal();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setResetPasswordError(err.message || 'Failed to reset tenant admin password.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCloseCreateTenantModal = () => {
    setShowCreateTenantModal(false);
    setCreateTenantError(null);
    setCreatingTenant(false);
  };

  const handleCreateTenantSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!createTenantForm.tenantName.trim() || !createTenantForm.tenantEmail.trim()) {
      setCreateTenantError('Please provide tenant name and email.');
      return;
    }

    if (!createTenantForm.adminName.trim() || !createTenantForm.adminEmail.trim() || !createTenantForm.adminPassword.trim()) {
      setCreateTenantError('Please provide tenant admin name, email, and password.');
      return;
    }

    if (createTenantForm.adminPassword.length < 8) {
      setCreateTenantError('Admin password must be at least 8 characters.');
      return;
    }

    try {
      setCreatingTenant(true);
      setCreateTenantError(null);

      await tenantsService.createTenant(
        {
          name: createTenantForm.tenantName.trim(),
          email: createTenantForm.tenantEmail.trim(),
          phone: createTenantForm.phone.trim() || undefined,
          contact_person: createTenantForm.contact_person.trim() || undefined,
          address: createTenantForm.address.trim() || undefined,
          city: createTenantForm.city.trim() || undefined,
          state: createTenantForm.state.trim() || undefined,
          country: createTenantForm.country.trim() || undefined,
          postal_code: createTenantForm.postal_code.trim() || undefined,
          subscription_status: createTenantForm.subscription_status,
          max_users: createTenantForm.max_users,
        },
        createTenantForm.adminEmail.trim(),
        createTenantForm.adminPassword,
        createTenantForm.adminName.trim()
      );

      setSuccess('Tenant created successfully');
      setShowCreateTenantModal(false);
      setTimeout(() => setSuccess(null), 3000);
      await loadTenants();
    } catch (err: any) {
      setCreateTenantError(err.message || 'Failed to create tenant.');
    } finally {
      setCreatingTenant(false);
    }
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
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tenant Management</h1>
        <p className="text-gray-600">Manage all tenants and approve registration requests</p>
        </div>
        <button
          onClick={handleOpenCreateTenantModal}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Building size={18} className="mr-2" />
          Create Tenant
        </button>
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
                          onClick={() => handleOpenResetPasswordModal(tenant)}
                          disabled={processingIds.has(tenant.id) || resettingPassword}
                          className="text-amber-600 hover:text-amber-800 disabled:opacity-50"
                          title="Reset Tenant Admin Password"
                        >
                          <Lock size={20} />
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
              <div className="border-t border-gray-200 pt-6 mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Tenant Admin</h3>
                  {editTenantAdminLoading && (
                    <span className="text-sm text-gray-500">Loading admin details...</span>
                  )}
                </div>

                {editTenantAdminError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {editTenantAdminError}
                  </div>
                )}

                {!editTenantAdminLoading && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                          <input
                            type="text"
                            value={editTenantAdmin.name}
                            onChange={(e) => setEditTenantAdmin({ ...editTenantAdmin, name: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Tenant admin name"
                            disabled={!editTenantAdmin.id}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                          <input
                            type="email"
                            value={editTenantAdmin.email}
                            onChange={(e) => setEditTenantAdmin({ ...editTenantAdmin, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="admin@example.com"
                            disabled={!editTenantAdmin.id}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                          type="password"
                          value={editTenantAdmin.password}
                          onChange={(e) => setEditTenantAdmin({ ...editTenantAdmin, password: e.target.value })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Leave blank to keep current password"
                          disabled={!editTenantAdmin.id}
                          minLength={editTenantAdmin.password ? 8 : undefined}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Provide a new password to reset the tenant admin credentials. Leave empty to keep the current password.
                      </p>
                    </div>
                  </div>
                )}
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

      {/* Create Tenant Modal */}
      {showCreateTenantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create Tenant</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Provide tenant details and initial admin credentials
                </p>
              </div>
              <button
                onClick={handleCloseCreateTenantModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateTenantSubmit} className="p-6 space-y-5 pb-8">
              {createTenantError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {createTenantError}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tenant Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name *
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={createTenantForm.tenantName}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, tenantName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Acme Corp"
                      disabled={creatingTenant}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={createTenantForm.tenantEmail}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, tenantEmail: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="tenant@example.com"
                      disabled={creatingTenant}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={createTenantForm.contact_person}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, contact_person: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={creatingTenant}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={createTenantForm.phone}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={creatingTenant}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={createTenantForm.address}
                    onChange={(e) => setCreateTenantForm({ ...createTenantForm, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={creatingTenant}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={createTenantForm.city}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={creatingTenant}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={createTenantForm.state}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={creatingTenant}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={createTenantForm.country}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, country: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={creatingTenant}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={createTenantForm.postal_code}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, postal_code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={creatingTenant}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subscription Status
                    </label>
                    <select
                      value={createTenantForm.subscription_status}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, subscription_status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={creatingTenant}
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
                      min={1}
                      value={createTenantForm.max_users}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, max_users: Math.max(1, Number.parseInt(e.target.value, 10) || 1) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={creatingTenant}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tenant Admin</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                      value={createTenantForm.adminName}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, adminName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Jane Doe"
                      disabled={creatingTenant}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                      value={createTenantForm.adminEmail}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, adminEmail: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus-border-transparent"
                    placeholder="admin@example.com"
                      disabled={creatingTenant}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                      value={createTenantForm.adminPassword}
                      onChange={(e) => setCreateTenantForm({ ...createTenantForm, adminPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter a secure password"
                      disabled={creatingTenant}
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters. Share securely with the tenant admin.
                </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseCreateTenantModal}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={creatingTenant}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={creatingTenant}
                >
                  {creatingTenant ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Tenant Admin Password Modal */}
      {showResetPasswordModal && selectedTenantForReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Reset Tenant Admin Password</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedTenantForReset.name}
                </p>
              </div>
              <button
                onClick={handleCloseResetPasswordModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              {resetPasswordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {resetPasswordError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant Admin Account
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    value={selectedTenantAdminId}
                    onChange={(e) => setSelectedTenantAdminId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={resettingPassword || tenantAdmins.length === 0}
                    required
                  >
                    <option value="" disabled>
                      {tenantAdmins.length === 0 ? 'No tenant admins found' : 'Select tenant admin'}
                    </option>
                    {tenantAdmins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.full_name || admin.email} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={resetPasswordForm.password}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter new password"
                    disabled={resettingPassword}
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 8 characters. Share securely with the tenant admin.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={resetPasswordForm.confirmPassword}
                    onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Re-enter new password"
                    disabled={resettingPassword}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseResetPasswordModal}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  disabled={resettingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={resettingPassword || tenantAdmins.length === 0}
                >
                  {resettingPassword ? 'Updating...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

