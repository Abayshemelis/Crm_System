import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, User, Shield, Check, X } from 'lucide-react';
import { RoleBadge } from '../components/ui/RoleBadge';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId: number;
  roles: string[];
  isActive: boolean;
}

interface Role {
  id: number;
  name: string;
}

export const UsersScreen: React.FC = () => {
  const { isManagerOrAboveSelected, selectedRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user form state
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
    try {
      const data = await api.get<User[]>('/api/users');
      setUsers(data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await api.get<Role[]>('/api/users/roles');
      // Filter roles based on current user's role
      // Admin can see Manager and SalesRep
      // Manager can only see SalesRep
      const filteredRoles = (data ?? []).filter(role => {
        if (selectedRole === 'Admin') return role.name === 'Manager' || role.name === 'SalesRep';
        if (selectedRole === 'Manager') return role.name === 'SalesRep';
        return false;
      });
      setRoles(filteredRoles);
    } catch {
      // ignore
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || !newUserRoleId) {
      alert('Please fill in all fields');
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
      alert('User created successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to create user');
    }
  };

  const handleUpdateRole = async (userId: number) => {
    if (!editingRoleIds.length) {
      alert('Select at least one role');
      return;
    }

    const canAssignManager = selectedRole === 'Admin';
    const requestedRoles = roles.filter(role => editingRoleIds.includes(role.id));
    const containsProtectedRole = requestedRoles.some(role => role.name === 'Manager' || role.name === 'Admin');

    if (!canAssignManager && containsProtectedRole) {
      alert('Only admins can assign Manager or Admin roles.');
      return;
    }

    try {
      await api.put(`/api/users/${userId}/roles`, { roleIds: editingRoleIds });
      await loadUsers();
      setEditingUserId(null);
      setEditingRoleIds([]);
      alert('Role updated successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await api.put(`/api/users/${userId}/status`, { isActive: !currentStatus });
      await loadUsers();
    } catch (error: any) {
      alert(error?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/api/users/${userId}`);
      await loadUsers();
      alert('User deleted successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to delete user');
    }
  };

  // getRoleBadgeColor removed in favor of RoleBadge component

  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">User Management</h1>
          <p className="screen-subtitle">Manage CRM users and roles.</p>
        </div>
        {isManagerOrAboveSelected && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus size={16} style={{ marginRight: 6 }} /> Add User
          </Button>
        )}
      </div>

      {showCreateForm && isManagerOrAboveSelected && (
        <Card className="p-6 mt-6">
          <h3 className="text-xl font-semibold mb-4">Create New User</h3>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Input
              label="Name"
              placeholder="Full name"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              value={newUserEmail}
              onChange={e => setNewUserEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Password"
              value={newUserPassword}
              onChange={e => setNewUserPassword(e.target.value)}
            />
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Role</label>
              <select
                value={newUserRoleId ?? ''}
                onChange={e => setNewUserRoleId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Select role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button onClick={handleCreateUser}>Create User</Button>
            <Button variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="p-6 mt-6">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No users found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {users.map(user => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={20} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, margin: 0 }}>{user.name}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>{user.email}</p>
                </div>
                {editingUserId === user.id && isManagerOrAboveSelected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {roles.map(role => (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input
                            type="checkbox"
                            checked={editingRoleIds.includes(role.id)}
                            onChange={e => {
                              const checked = e.target.checked;
                              setEditingRoleIds(prev => checked ? Array.from(new Set([...prev, role.id])) : prev.filter(id => id !== role.id));
                            }}
                          />
                          <span style={{ fontSize: '0.85rem' }}>{role.name}</span>
                        </label>
                      ))}
                    </div>
                    <Button size="sm" onClick={() => handleUpdateRole(user.id)}>
                      <Check size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingUserId(null); setEditingRoleIds([]); }}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map(r => (
                        <RoleBadge key={r} role={r} />
                      ))
                    ) : (
                      <RoleBadge role={user.role} />
                    )}
                  </div>
                )}
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    background: user.isActive ? '#dcfce7' : '#fee2e2',
                    color: user.isActive ? '#16a34a' : '#dc2626'
                  }}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                {isManagerOrAboveSelected && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {/* Only Admin can edit Manager roles */}
                    {(selectedRole === 'Admin' || user.role !== 'Manager') && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        const selectedIds = (user.roles && user.roles.length > 0)
                          ? roles.filter(r => user.roles.includes(r.name)).map(r => r.id)
                          : (user.roleId ? [user.roleId] : []);
                        setEditingUserId(user.id);
                        setEditingRoleIds(selectedIds);
                      }} title="Edit Role">
                        <Shield size={14} />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(user.id, user.isActive)} title={user.isActive ? 'Deactivate' : 'Activate'}>
                      {user.isActive ? <X size={14} /> : <Check size={14} />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user.id)} title="Delete">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </Layout>
  );
};
