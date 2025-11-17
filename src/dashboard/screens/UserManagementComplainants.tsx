import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Download, Upload, Search, Edit, Trash2, Columns3 } from 'lucide-react';
import { usersService } from '../../services/users.service';
import { designationsService } from '../../services/designations.service';
import { useTenant } from '../../hooks/useTenant';
import type { User, Designation } from '../../types/database';
import { userOnboardingService } from '../../services/user-onboarding.service';

interface UserManagementComplainantsProps {
  onNavigate: (page: string, userId?: string) => void;
}

type ComplainantColumnKey =
  | 'select'
  | 'name'
  | 'email'
  | 'department'
  | 'designation'
  | 'phone'
  | 'chatId'
  | 'botName'
  | 'status'
  | 'actions';

interface ColumnConfig {
  key: ComplainantColumnKey;
  label: string;
  optional?: boolean;
}

const COLUMN_STORAGE_KEY = 'complainantColumnVisibility.v1';

export default function UserManagementComplainants({ onNavigate }: UserManagementComplainantsProps) {
  const { activeTenantId } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<ComplainantColumnKey, boolean>>({
    select: true,
    name: true,
    email: true,
    department: false,
    designation: false,
    phone: false,
    chatId: false,
    botName: false,
    status: true,
    actions: true,
  });

  useEffect(() => {
    loadUsers();
    loadDesignations();
    loadColumnPreferences();
  }, [activeTenantId]);

  // Close column picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setShowColumnPicker(false);
      }
    };

    if (showColumnPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnPicker]);

  const loadColumnPreferences = () => {
    try {
      const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setColumnVisibility((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (err) {
      console.warn('Failed to load complainant column preferences', err);
    }
  };

  const persistColumnPreferences = (visibility: Record<ComplainantColumnKey, boolean>) => {
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibility));
    } catch (err) {
      console.warn('Failed to persist complainant column preferences', err);
    }
  };

  const toggleColumnVisibility = (key: ComplainantColumnKey) => {
    setColumnVisibility((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      persistColumnPreferences(updated);
      return updated;
    });
  };

  const columnsConfig = useMemo<ColumnConfig[]>(
    () => [
      { key: 'select', label: 'Select', optional: false },
      { key: 'name', label: 'Name', optional: false },
      { key: 'email', label: 'Email', optional: true },
      { key: 'department', label: 'Department', optional: true },
      { key: 'designation', label: 'Designation', optional: true },
      { key: 'phone', label: 'Phone', optional: true },
      { key: 'chatId', label: 'Chat ID', optional: true },
      { key: 'botName', label: 'Bot Name', optional: true },
      { key: 'status', label: 'Status', optional: false },
      { key: 'actions', label: 'Actions', optional: false },
    ],
    [],
  );

  const visibleColumns = useMemo(
    () => columnsConfig.filter((column) => columnVisibility[column.key]),
    [columnsConfig, columnVisibility],
  );

  const loadDesignations = async () => {
    try {
      const data = await designationsService.getAll(activeTenantId || undefined);
      setDesignations(data);
    } catch (err) {
      console.error('Failed to load designations:', err);
    }
  };

  const getDesignationName = (designationId?: string) => {
    if (!designationId) return '-';
    const designation = designations.find(d => d.id === designationId);
    return designation?.name || '-';
  };

  useEffect(() => {
    filterUsers();
  }, [searchTerm, selectedDepartment, selectedStatus, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersService.getUsers('complainant', activeTenantId || undefined);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter(user => user.department === selectedDepartment);
    }

    if (selectedStatus) {
      const isActive = selectedStatus === 'Active';
      filtered = filtered.filter(user => user.active === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Deactivate this complainant? The user can be reactivated later.')) return;

    try {
      await usersService.toggleActive(userId, false);
      alert('User deactivated successfully.');
      await loadUsers();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
      alert('Failed to deactivate user');
    }
  };

  const handleToggleActive = async (userId: string, active: boolean) => {
    try {
      await usersService.toggleActive(userId, !active);
      await loadUsers();
    } catch (err) {
      console.error('Failed to toggle user status:', err);
      alert('Failed to update user status');
    }
  };

  const handleResendInvite = async (userId: string) => {
    try {
      setResendingUserId(userId);
      await userOnboardingService.resendOnboarding(userId);
      alert('Onboarding invite resent. Check notifications for status updates.');
      await loadUsers();
    } catch (err) {
      console.error('Failed to resend onboarding invite:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to resend onboarding invite. Please try again.',
      );
    } finally {
      setResendingUserId(null);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleDeactivateSelected = async () => {
    if (selectedUsers.length === 0) return;
    if (!confirm(`Deactivate ${selectedUsers.length} selected users?`)) return;

    try {
      await Promise.all(
        selectedUsers.map(userId => usersService.toggleActive(userId, false))
      );
      setSelectedUsers([]);
      await loadUsers();
    } catch (err) {
      console.error('Failed to deactivate users:', err);
      alert('Failed to deactivate users');
    }
  };

  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">COMPLAINANTS</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker((prev) => !prev)}
              className="px-3 py-2 border border-gray-300 rounded-card hover:bg-gray-100 flex items-center text-sm"
            >
              <Columns3 size={16} className="mr-2" />
              Columns
            </button>
            {showColumnPicker && (
              <div
                ref={columnPickerRef}
                className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-card shadow-lg z-30 p-3 space-y-2"
              >
                <div className="text-sm font-semibold text-gray-700 mb-2">Toggle Columns</div>
                {columnsConfig.map((column) => (
                  <label key={column.key} className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="mr-2 rounded text-primary focus:ring-primary"
                      checked={columnVisibility[column.key]}
                      onChange={() => toggleColumnVisibility(column.key)}
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
            onClick={() => onNavigate('create-complainant')}
            className="px-4 py-2 bg-primary text-white rounded-card hover:bg-primary/90 flex items-center"
          >
            <Plus size={16} className="mr-2" />
            Create User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-card focus:outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-2 text-sm border border-gray-300 rounded-card hover:bg-gray-50 flex items-center">
            <Download size={14} className="mr-1" />
            Export CSV
          </button>
          <button className="px-3 py-2 text-sm border border-gray-300 rounded-card hover:bg-gray-50 flex items-center">
            <Upload size={14} className="mr-1" />
            Bulk Upload
          </button>
          <button
            onClick={handleDeactivateSelected}
            disabled={selectedUsers.length === 0}
            className="px-3 py-2 text-sm border border-danger text-danger rounded-card hover:bg-danger/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deactivate Selected ({selectedUsers.length})
          </button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-card shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">No complainants found</p>
          <button
            onClick={() => onNavigate('create-complainant')}
            className="mt-4 text-primary hover:underline"
          >
            Create your first complainant
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.key} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {column.key === 'select' ? (
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-primary border-gray-300 rounded"
                      />
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                  {columnVisibility.select && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 text-primary border-gray-300 rounded"
                      />
                    </td>
                  )}
                  {columnVisibility.name && (
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                  )}
                  {columnVisibility.email && (
                    <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                  )}
                  {columnVisibility.department && (
                    <td className="px-4 py-3 text-sm text-gray-700">{user.department || '-'}</td>
                  )}
                  {columnVisibility.designation && (
                    <td className="px-4 py-3 text-sm text-gray-700">{getDesignationName((user as any).designation_id)}</td>
                  )}
                  {columnVisibility.phone && (
                    <td className="px-4 py-3 text-sm text-gray-700">{user.phone || '-'}</td>
                  )}
                  {columnVisibility.chatId && (
                    <td className="px-4 py-3 text-sm text-gray-700">{(user as any).telegram_chat_id || '-'}</td>
                  )}
                  {columnVisibility.botName && (
                    <td className="px-4 py-3 text-sm text-gray-700">{(user as any).telegram_user_id || '-'}</td>
                  )}
                  {columnVisibility.status && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(user.id, user.active)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.active ? 'bg-success/10 text-success' : 'bg-gray-300 text-gray-700'
                        }`}
                      >
                        {user.active ? 'active' : 'inactive'}
                      </button>
                    </td>
                  )}
                  {columnVisibility.actions && (
                    <td className="px-4 py-3 space-x-3 whitespace-nowrap">
                      {(() => {
                        const onboardingStatus = ((user as any).bot_onboarding_status ?? 'not_required') as string;
                        const shouldShowResend = ['pending', 'invited', 'awaiting_chat', 'failed'].includes(onboardingStatus);
                        return shouldShowResend;
                      })() && (
                        <button
                          onClick={() => handleResendInvite(user.id)}
                          disabled={resendingUserId === user.id}
                          className="text-sm text-primary hover:text-primary/80 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed mr-3"
                        >
                          {resendingUserId === user.id ? 'Resending...' : 'Resend Invite'}
                        </button>
                      )}
                      <button
                        onClick={() => onNavigate('edit-complainant', user.id)}
                        className="text-sm text-primary hover:text-primary/80 inline-flex items-center mr-3"
                      >
                        <Edit size={14} className="mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeactivateUser(user.id)}
                        className="text-sm text-danger hover:text-danger/80 inline-flex items-center"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Deactivate
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
