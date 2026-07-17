import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

export const LeadSourcesScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();
  const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editingSourceName, setEditingSourceName] = useState('');

  useEffect(() => {
    const loadSources = async () => {
      try {
        const sourcesData = await api.get<{ id: number; name: string }[]>('/api/sources');
        setSources(sourcesData ?? []);
      } catch (error) {
        console.error('Failed to load sources:', error);
      }
    };
    loadSources();
  }, []);

  const handleAddSource = async () => {
    if (!newSourceName.trim()) {
      alert('Please enter a source name');
      return;
    }
    try {
      await api.post('/api/sources', { name: newSourceName.trim() });
      const updated = await api.get<{ id: number; name: string }[]>('/api/sources');
      setSources(updated ?? []);
      setNewSourceName('');
      alert('Source added successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to add source. You may not have permission (Manager/Admin required).');
    }
  };

  const handleDeleteSource = async (id: number) => {
    if (!window.confirm('Delete this source?')) return;
    try {
      await api.delete(`/api/sources/${id}`);
      setSources(sources.filter(s => s.id !== id));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete source');
    }
  };

  const handleStartEditSource = (id: number, name: string) => {
    setEditingSourceId(id);
    setEditingSourceName(name);
  };

  const handleSaveSource = async (id: number) => {
    if (!editingSourceName.trim()) return;
    try {
      await api.put(`/api/sources/${id}`, { name: editingSourceName.trim() });
      setSources(sources.map(s => s.id === id ? { ...s, name: editingSourceName.trim() } : s));
      setEditingSourceId(null);
      setEditingSourceName('');
    } catch (error: any) {
      alert(error?.message || 'Failed to update source');
    }
  };

  const handleCancelEditSource = () => {
    setEditingSourceId(null);
    setEditingSourceName('');
  };

  return (
    <Layout>
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title">
          <h1>Lead Sources</h1>
          <p>Manage your lead source categories</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="settings-section">
          {isManagerOrAbove && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-4">Add New Source</h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Input
                  placeholder="e.g., Website, Referral, LinkedIn"
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button onClick={handleAddSource}>
                  <Plus size={16} style={{ marginRight: 6 }} /> Add Source
                </Button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sources.map(source => (
              <div
                key={source.id}
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
                {editingSourceId === source.id ? (
                  <>
                    <Input
                      value={editingSourceName}
                      onChange={e => setEditingSourceName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button size="sm" onClick={() => handleSaveSource(source.id)}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={handleCancelEditSource}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1 }}>{source.name}</span>
                    {isManagerOrAbove && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleStartEditSource(source.id, source.name)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSource(source.id)}>
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
