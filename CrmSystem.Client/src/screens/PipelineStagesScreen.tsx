import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

export const PipelineStagesScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();
  const [opportunityStages, setOpportunityStages] = useState<{ id: number; name: string; sortOrder: number; isWon: boolean; isLost: boolean }[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageSortOrder, setNewStageSortOrder] = useState('0');
  const [newStageIsWon, setNewStageIsWon] = useState(false);
  const [newStageIsLost, setNewStageIsLost] = useState(false);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [editingStageSortOrder, setEditingStageSortOrder] = useState('0');
  const [editingStageIsWon, setEditingStageIsWon] = useState(false);
  const [editingStageIsLost, setEditingStageIsLost] = useState(false);

  useEffect(() => {
    const loadStages = async () => {
      try {
        const stagesData = await api.get<{ id: number; name: string; sortOrder: number; isWon: boolean; isLost: boolean }[]>('/api/opportunitystages');
        setOpportunityStages(stagesData ?? []);
      } catch (error) {
        console.error('Failed to load pipeline stages:', error);
      }
    };
    loadStages();
  }, []);

  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      alert('Please enter a stage name');
      return;
    }
    if (newStageIsWon && newStageIsLost) {
      alert('A stage cannot be both Won and Lost');
      return;
    }
    try {
      await api.post('/api/opportunitystages', {
        name: newStageName.trim(),
        sortOrder: Number(newStageSortOrder),
        isWon: newStageIsWon,
        isLost: newStageIsLost
      });
      const updated = await api.get<{ id: number; name: string; sortOrder: number; isWon: boolean; isLost: boolean }[]>('/api/opportunitystages');
      setOpportunityStages(updated ?? []);
      setNewStageName('');
      setNewStageSortOrder('0');
      setNewStageIsWon(false);
      setNewStageIsLost(false);
      alert('Stage added successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to add stage. You may not have permission (Manager/Admin required).');
    }
  };

  const handleDeleteStage = async (id: number) => {
    if (!window.confirm('Delete this stage?')) return;
    try {
      await api.delete(`/api/opportunitystages/${id}`);
      setOpportunityStages(opportunityStages.filter(s => s.id !== id));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete stage');
    }
  };

  const handleStartEditStage = (id: number, name: string, sortOrder: number, isWon: boolean, isLost: boolean) => {
    setEditingStageId(id);
    setEditingStageName(name);
    setEditingStageSortOrder(String(sortOrder));
    setEditingStageIsWon(isWon);
    setEditingStageIsLost(isLost);
  };

  const handleSaveStage = async (id: number) => {
    if (!editingStageName.trim()) return;
    if (editingStageIsWon && editingStageIsLost) {
      alert('A stage cannot be both Won and Lost');
      return;
    }
    try {
      await api.put(`/api/opportunitystages/${id}`, {
        name: editingStageName.trim(),
        sortOrder: Number(editingStageSortOrder),
        isWon: editingStageIsWon,
        isLost: editingStageIsLost
      });
      setOpportunityStages(opportunityStages.map(s => s.id === id ? {
        ...s,
        name: editingStageName.trim(),
        sortOrder: Number(editingStageSortOrder),
        isWon: editingStageIsWon,
        isLost: editingStageIsLost
      } : s));
      setEditingStageId(null);
      setEditingStageName('');
      setEditingStageSortOrder('0');
      setEditingStageIsWon(false);
      setEditingStageIsLost(false);
    } catch (error: any) {
      alert(error?.message || 'Failed to update stage');
    }
  };

  const handleCancelEditStage = () => {
    setEditingStageId(null);
    setEditingStageName('');
    setEditingStageSortOrder('0');
    setEditingStageIsWon(false);
    setEditingStageIsLost(false);
  };

  return (
    <Layout>
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title">
          <h1>Pipeline Stages</h1>
          <p>Manage your opportunity pipeline stages</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="settings-section">
          {isManagerOrAbove && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-4">Add New Stage</h3>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Stage Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Qualified"
                    value={newStageName}
                    onChange={e => setNewStageName(e.target.value)}
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
                    value={newStageSortOrder}
                    onChange={e => setNewStageSortOrder(e.target.value)}
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
                    id="newWon"
                    checked={newStageIsWon}
                    onChange={e => setNewStageIsWon(e.target.checked)}
                  />
                  <label htmlFor="newWon" style={{ fontSize: '0.875rem' }}>Won Stage</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="newLost"
                    checked={newStageIsLost}
                    onChange={e => setNewStageIsLost(e.target.checked)}
                  />
                  <label htmlFor="newLost" style={{ fontSize: '0.875rem' }}>Lost Stage</label>
                </div>
              </div>
              <Button onClick={handleAddStage} style={{ marginTop: '1rem' }}>
                <Plus size={16} style={{ marginRight: 6 }} /> Add Stage
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {opportunityStages.sort((a, b) => a.sortOrder - b.sortOrder).map(stage => (
              <div
                key={stage.id}
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
                {editingStageId === stage.id ? (
                  <>
                    <Input
                      value={editingStageName}
                      onChange={e => setEditingStageName(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Input
                      type="number"
                      value={editingStageSortOrder}
                      onChange={e => setEditingStageSortOrder(e.target.value)}
                      style={{ width: '80px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={editingStageIsWon}
                        onChange={e => setEditingStageIsWon(e.target.checked)}
                      />
                      <label style={{ fontSize: '0.75rem' }}>Won</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={editingStageIsLost}
                        onChange={e => setEditingStageIsLost(e.target.checked)}
                      />
                      <label style={{ fontSize: '0.75rem' }}>Lost</label>
                    </div>
                    <Button size="sm" onClick={() => handleSaveStage(stage.id)}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={handleCancelEditStage}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1 }}>{stage.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order: {stage.sortOrder}</span>
                    {stage.isWon && <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px' }}>Won</span>}
                    {stage.isLost && <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '4px' }}>Lost</span>}
                    {isManagerOrAbove && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleStartEditStage(stage.id, stage.name, stage.sortOrder, stage.isWon, stage.isLost)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteStage(stage.id)}>
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
