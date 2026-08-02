import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, User, Shield, Check, X, Search, Users, UserCheck, ShieldCheck, Briefcase, RefreshCw } from 'lucide-react';
import { RoleBadge } from '../components/ui/RoleBadge';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../lib/toast';
import './screens.css';

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId: number;
  roles: string[];
  isActive: boolean;
}

interface RoleItem {
  id: number;
  name: string;
}

export const UsersScreen: React.FC = () => {
  const { isManagerOrAboveSelected, selectedRole } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Create user modal state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState<number | null>(null);

  // Edit role state
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingRoleIds, setEditingRoleIds] = useState<number[]>([]);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get<UserItem[]>('/api/users');
      setUsers(data ?? []);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await api.get<RoleItem[]>('/api/users/roles');
      const filteredRoles = (data ?? []).filter(role => {
        if (selectedRole === 'Admin') return role.name === 'Manager' || role.name === 'SalesRep';
        if (selectedRole === 'Manager') return role.name === 'SalesRep';
        return false;
      });
      setRoles(filteredRoles);
    } catch {
      // non-critical
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || !newUserRoleId) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    try {
      await api.post('/api/users', {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        roleId: newUserRoleId
      });
      await loadUsers();
      setShowCreateForm(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRoleId(null);
      showToast('User account created successfully!', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to create user account.', 'error');
    }
  };

  const handleUpdateRole = async (userId: number) => {
    if (!editingRoleIds.length) {
      showToast('Select at least one role.', 'error');
      return;
    }

    const canAssignManager = selectedRole === 'Admin';
    const requestedRoles = roles.filter(role => editingRoleIds.includes(role.id));
    const containsProtectedRole = requestedRoles.some(role => role.name === 'Manager' || role.name === 'Admin');

    if (!canAssignManager && containsProtectedRole) {
      showToast('Only Admins can assign Manager or Admin roles.', 'error');
      return;
    }

    try {
      await api.put(`/api/users/${userId}/roles`, { roleIds: editingRoleIds });
      await loadUsers();
      setEditingUserId(null);
      setEditingRoleIds([]);
      showToast('User roles updated successfully!', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to update user roles.', 'error');
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await api.put(`/api/users/${userId}/status`, { isActive: !currentStatus });
      await loadUsers();
      showToast(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully.`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to update user status.', 'error');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user? All associated records will be reassigned.')) return;
    try {
      await api.delete(`/api/users/${userId}`);
      await loadUsers();
      showToast('User account deleted successfully.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to delete user account.', 'error');
    }
  };

  // KPI Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const adminManagerCount = users.filter(u => u.role === 'Admin' || u.role === 'Manager' || (u.roles && u.roles.some(r => r === 'Admin' || r === 'Manager'))).length;
  const salesRepCount = users.filter(u => u.role === 'SalesRep' || (u.roles && u.roles.includes('SalesRep'))).length;

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search
      const term = search.toLowerCase().trim();
      const matchesSearch = !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term);

      // Status
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);

      // Role
      const userRoleList = u.roles && u.roles.length ? u.roles : [u.role];
      const matchesRole = roleFilter === 'all' || userRoleList.map(r => r.toLowerCase()).includes(roleFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarGradient = (id: number) => {
    const gradients = [
      'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    ];
    return gradients[id % gradients.length];
  };

  return (
    <Layout>
      {/* Header */}
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title">
          <h1>User Management</h1>
          <p>Control CRM user access, assign roles, and manage active accounts.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={() => loadUsers()} title="Refresh Users">
            <RefreshCw size={16} />
          </Button>
          {isManagerOrAboveSelected && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus size={16} style={{ marginRight: 6 }} /> Add New User
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Accounts</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>{totalUsers}</h2>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <Users size={22} />
            </div>
          </div>
        </Card>

        <Card className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Users</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#10b981' }}>{activeUsers}</h2>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <UserCheck size={22} />
            </div>
          </div>
        </Card>

        <Card className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admins & Managers</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#8b5cf6' }}>{adminManagerCount}</h2>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <ShieldCheck size={22} />
            </div>
          </div>
        </Card>

        <Card className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sales Reps</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: '#3b82f6' }}>{salesRepCount}</h2>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Briefcase size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar Controls */}
      <div className="filters-bar customer-filters animate-fade-in" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={16} className="filter-icon" />
          <input
            className="filter-input"
            placeholder="Search users by name, email, role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Pill Filters */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-highlight)' }}>
          {(['all', 'active', 'inactive'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: statusFilter === st ? 'var(--accent-primary)' : 'transparent',
                color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Role Select Filter */}
        <select
          className="filter-select"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="all">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="SalesRep">SalesRep</option>
        </select>
      </div>

      {/* Users Card List */}
      <Card className="glass-panel p-6">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem auto' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading CRM users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <User size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>No users match your criteria</p>
            <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>Try clearing your search or filter options.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="user-row-card animate-fade-in"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-highlight)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* User Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px', flex: '1 1 220px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: getAvatarGradient(user.id),
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                  }}>
                    {getInitials(user.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ fontWeight: 700, margin: 0, fontSize: '0.98rem', color: 'var(--text-primary)' }}>{user.name}</h4>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.1rem 0 0 0', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
                  </div>
                </div>

                {/* Roles */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 180px' }}>
                  {editingUserId === user.id && isManagerOrAboveSelected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: 'var(--bg-primary)', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-primary)' }}>
                      {roles.map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={editingRoleIds.includes(role.id)}
                            onChange={e => {
                              const checked = e.target.checked;
                              setEditingRoleIds(prev => checked ? Array.from(new Set([...prev, role.id])) : prev.filter(id => id !== role.id));
                            }}
                          />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{role.name}</span>
                        </label>
                      ))}
                      <Button size="sm" onClick={() => handleUpdateRole(user.id)} title="Save Roles">
                        <Check size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingUserId(null); setEditingRoleIds([]); }}>
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    user.roles && user.roles.length > 0 ? (
                      user.roles.map(r => <RoleBadge key={r} role={r} />)
                    ) : (
                      <RoleBadge role={user.role} />
                    )
                  )}
                </div>

                {/* Status Indicator */}
                <div style={{ minWidth: '100px', textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: user.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: user.isActive ? '#10b981' : '#ef4444',
                      border: `1px solid ${user.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: user.isActive ? '#10b981' : '#ef4444' }} />
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Actions */}
                {isManagerOrAboveSelected && (
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {(selectedRole === 'Admin' || user.role !== 'Manager') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const selectedIds = (user.roles && user.roles.length > 0)
                            ? roles.filter(r => user.roles.includes(r.name)).map(r => r.id)
                            : (user.roleId ? [user.roleId] : []);
                          setEditingUserId(user.id);
                          setEditingRoleIds(selectedIds);
                        }}
                        title="Edit User Roles"
                      >
                        <Shield size={15} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(user.id, user.isActive)}
                      title={user.isActive ? 'Deactivate User' : 'Activate User'}
                      style={{ color: user.isActive ? '#ef4444' : '#10b981' }}
                    >
                      {user.isActive ? <X size={15} /> : <Check size={15} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      title="Delete User"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create User Modal Dialog */}
      {showCreateForm && isManagerOrAboveSelected && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setShowCreateForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px' }}>
            <Card
              className="glass-panel animate-fade-in"
              style={{ padding: '1.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Create User Account</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>Assign login credentials and access roles.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <Input
                  label="Full Name"
                  placeholder="e.g. Sarah Jenkins"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="sarah@company.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Initial account password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                />
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>System Role</label>
                  <select
                    className="input-field"
                    value={newUserRoleId ?? ''}
                    onChange={e => setNewUserRoleId(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select a system role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button onClick={handleCreateUser}>Create Account</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
};

