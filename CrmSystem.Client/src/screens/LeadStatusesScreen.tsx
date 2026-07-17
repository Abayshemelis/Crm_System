import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

export const LeadStatusesScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();
  const [leadStatuses, setLeadStatuses] = useState<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusSortOrder, setNewStatusSortOrder] = useState('0');
  const [newStatusIsTerminal, setNewStatusIsTerminal] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editingStatusName, setEditingStatusName] = useState('');
  const [editingStatusSortOrder, setEditingStatusSortOrder] = useState('0');
  const [editingStatusIsTerminal, setEditingStatusIsTerminal] = useState(false);

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const statusesData = await api.get<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>('/api/leadstatuses');
        setLeadStatuses(statusesData ?? []);
      } catch (error) {
        console.error('Failed to load lead statuses:', error);
      }
    };
    loadStatuses();
  }, []);

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) {
      alert('Please enter a status name');
      return;
    }
    try {
      await api.post('/api/leadstatuses', {
        name: newStatusName.trim(),
        sortOrder: Number(newStatusSortOrder),
        isTerminal: newStatusIsTerminal
      });
      const updated = await api.get<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>('/api/leadstatuses');
      setLeadStatuses(updated ?? []);
      setNewStatusName('');
      setNewStatusSortOrder('0');
      setNewStatusIsTerminal(false);
      alert('Status added successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to add status. You may not have permission (Manager/Admin required).');
    }
  };

  const handleDeleteStatus = async (id: number) => {
    if (!window.confirm('Delete this status?')) return;
    try {
      await api.delete(`/api/leadstatuses/${id}`);
      setLeadStatuses(leadStatuses.filter(s => s.id !== id));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete status');
    }
  };

  const handleStartEditStatus = (id: number, name: string, sortOrder: number, isTerminal: boolean) => {
    setEditingStatusId(id);
    setEditingStatusName(name);
    setEditingStatusSortOrder(String(sortOrder));
    setEditingStatusIsTerminal(isTerminal);
  };

  const handleSaveStatus = async (id: number) => {
    if (!editingStatusName.trim()) return;
    try {
      await api.put(`/api/leadstatuses/${id}`, {
        name: editingStatusName.trim(),
        sortOrder: Number(editingStatusSortOrder),
        isTerminal: editingStatusIsTerminal
      });
      setLeadStatuses(leadStatuses.map(s => s.id === id ? {
        ...s,
        name: editingStatusName.trim(),
        sortOrder: Number(editingStatusSortOrder),
        isTerminal: editingStatusIsTerminal
      } : s));
      setEditingStatusId(null);
      setEditingStatusName('');
      setEditingStatusSortOrder('0');
      setEditingStatusIsTerminal(false);
    } catch (error: any) {
      alert(error?.message || 'Failed to update status');
    }
  };

  const handleCancelEditStatus = () => {
    setEditingStatusId(null);
    setEditingStatusName('');
    setEditingStatusSortOrder('0');
    setEditingStatusIsTerminal(false);
  };

  return (
    <Layout>
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title">
          <h1>Lead Statuses & Types</h1>
          <p>Manage your lead status categories and types</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="settings-section">
          {isManagerOrAbove && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-4">Add New Status</h3>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Status Name</label>
                  <input
                    type="text"
                    placeholder="e.g., New, Qualified, Converted"
                    value={newStatusName}
                    onChange={e => setNewStatusName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Sort Order</label>
                  <input
                    type="number"
                    value={newStatusSortOrder}
                    onChange={e => setNewStatusSortOrder(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="newTerminal"
                    checked={newStatusIsTerminal}
                    onChange={e => setNewStatusIsTerminal(e.target.checked)}
                  />
                  <label htmlFor="newTerminal" style={{ fontSize: '0.875rem' }}>Terminal Status</label>
                </div>
              </div>
              <Button onClick={handleAddStatus} style={{ marginTop: '1rem' }}>
                <Plus size={16} style={{ marginRight: 6 }} /> Add Status
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {leadStatuses.sort((a, b) => a.sortOrder - b.sortOrder).map(status => (
              <div
                key={status.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {editingStatusId === status.id ? (
                  <>
                    <Input
                      value={editingStatusName}
                      onChange={e => setEditingStatusName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Input
                      type="number"
                      value={editingStatusSortOrder}
                      onChange={e => setEditingStatusSortOrder(e.target.value)}
                      style={{ width: '80px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={editingStatusIsTerminal}
                        onChange={e => setEditingStatusIsTerminal(e.target.checked)}
                      />
                      <label style={{ fontSize: '0.75rem' }}>Terminal</label>
                    </div>
                    <Button size="sm" onClick={() => handleSaveStatus(status.id)}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={handleCancelEditStatus}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1 }}>{status.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order: {status.sortOrder}</span>
                    {status.isTerminal && <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderRadius: '4px' }}>Terminal</span>}
                    {isManagerOrAbove && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleStartEditStatus(status.id, status.name, status.sortOrder, status.isTerminal)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteStatus(status.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </Layout>
  );
};
