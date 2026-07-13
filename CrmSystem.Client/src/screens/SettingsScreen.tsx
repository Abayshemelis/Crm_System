import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Palette, Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

interface ThemeSettings {
  mode: 'dark' | 'light';
  accentColor: string;
}

const PRESET_THEMES = [
  {
    name: 'Cyan Ocean',
    description: 'Modern cyan with deep navy',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f172a 100%)',
    accentColor: '#06b6d4'
  },
  {
    name: 'Purple Galaxy',
    description: 'Rich purple tones',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #1a0033 0%, #330066 50%, #1a0033 100%)',
    accentColor: '#a78bfa'
  },
  {
    name: 'Emerald Forest',
    description: 'Calm green tones',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0d2818 0%, #1a4d2e 50%, #0d2818 100%)',
    accentColor: '#10b981'
  },
  {
    name: 'Rose Gold',
    description: 'Elegant rose and gold',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #3d1a1a 0%, #5a2a2a 50%, #3d1a1a 100%)',
    accentColor: '#f87171'
  },
  {
    name: 'Slate Professional',
    description: 'Classic professional look',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    accentColor: '#3b82f6'
  },
  {
    name: 'Light Clean',
    description: 'Clean light theme',
    mode: 'light' as const,
    previewBackground: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
    accentColor: '#0284c7'
  }
];

export const SettingsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();
  const [activeTab, setActiveTab] = useState<'theme' | 'sources' | 'statuses'>('theme');
  
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const mode = localStorage.getItem('theme') as 'dark' | 'light' | null;
    return {
      mode: mode || 'dark',
      accentColor: PRESET_THEMES[0].accentColor
    };
  });
  const [customAccentColor, setCustomAccentColor] = useState(theme.accentColor);

  // Sources state
  const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editingSourceName, setEditingSourceName] = useState('');

  // LeadStatuses state
  const [leadStatuses, setLeadStatuses] = useState<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusSortOrder, setNewStatusSortOrder] = useState('0');
  const [newStatusIsTerminal, setNewStatusIsTerminal] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editingStatusName, setEditingStatusName] = useState('');
  const [editingStatusSortOrder, setEditingStatusSortOrder] = useState('0');
  const [editingStatusIsTerminal, setEditingStatusIsTerminal] = useState(false);

  useEffect(() => {
    // Load sources and lead statuses
    const loadData = async () => {
      try {
        const [sourcesData, statusesData] = await Promise.all([
          api.get<{ id: number; name: string }[]>('/api/sources'),
          api.get<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>('/api/leadstatuses')
        ]);
        setSources(sourcesData ?? []);
        setLeadStatuses(statusesData ?? []);
      } catch (error) {
        console.error('Failed to load settings data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Set the theme mode (dark/light)
    root.setAttribute('data-theme', theme.mode);
    localStorage.setItem('theme', theme.mode);

    // Update accent color CSS variables
    root.style.setProperty('--accent-primary', theme.accentColor);
    root.style.setProperty('--accent-hover', adjustColorBrightness(theme.accentColor, -20));
    root.style.setProperty('--accent-glow', `rgba(${hexToRgb(theme.accentColor)}, ${theme.mode === 'light' ? '0.3' : '0.5'})`);

    // Save to localStorage
    localStorage.setItem('crm-theme', JSON.stringify(theme));
  }, [theme]);

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return '6, 182, 212';
  };

  const handlePresetTheme = (preset: typeof PRESET_THEMES[0]) => {
    setTheme({
      mode: preset.mode,
      accentColor: preset.accentColor
    });
    setCustomAccentColor(preset.accentColor);
  };

  const handleAccentColorChange = (color: string) => {
    setCustomAccentColor(color);
    setTheme(prev => ({
      ...prev,
      accentColor: color
    }));
  };

  const handleModeChange = (mode: 'dark' | 'light') => {
    setTheme(prev => ({
      ...prev,
      mode
    }));
  };

  const resetTheme = () => {
    const defaultTheme = PRESET_THEMES[0];
    setTheme({
      mode: defaultTheme.mode,
      accentColor: defaultTheme.accentColor
    });
    setCustomAccentColor(defaultTheme.accentColor);
  };

  // Sources handlers
  const handleAddSource = async () => {
    console.log('handleAddSource called, newSourceName:', newSourceName);
    if (!newSourceName.trim()) {
      alert('Please enter a source name');
      return;
    }
    try {
      console.log('Adding source:', { name: newSourceName.trim() });
      const response = await api.post('/api/sources', { name: newSourceName.trim() });
      console.log('Source added response:', response);
      const updated = await api.get<{ id: number; name: string }[]>('/api/sources');
      setSources(updated ?? []);
      setNewSourceName('');
      alert('Source added successfully');
    } catch (error: any) {
      console.error('Failed to add source:', error);
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

  // LeadStatuses handlers
  const handleAddStatus = async () => {
    console.log('handleAddStatus called, newStatusName:', newStatusName);
    if (!newStatusName.trim()) {
      alert('Please enter a status name');
      return;
    }
    try {
      console.log('Adding status:', { 
        name: newStatusName.trim(),
        sortOrder: Number(newStatusSortOrder),
        isTerminal: newStatusIsTerminal
      });
      const response = await api.post('/api/leadstatuses', {
        name: newStatusName.trim(),
        sortOrder: Number(newStatusSortOrder),
        isTerminal: newStatusIsTerminal
      });
      console.log('Status added response:', response);
      const updated = await api.get<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>('/api/leadstatuses');
      setLeadStatuses(updated ?? []);
      setNewStatusName('');
      setNewStatusSortOrder('0');
      setNewStatusIsTerminal(false);
      alert('Status added successfully');
    } catch (error: any) {
      console.error('Failed to add status:', error);
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

  const adjustColorBrightness = (hex: string, amount: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Settings</h1>
          <p className="screen-subtitle">Customize your CRM experience.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'theme' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          Theme
        </button>
        <button
          className={`tab-btn ${activeTab === 'sources' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          Sources
        </button>
        <button
          className={`tab-btn ${activeTab === 'statuses' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('statuses')}
        >
          Statuses & Types
        </button>
      </div>

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <Card className="p-6">
          <div className="settings-section">
            <div className="flex items-center gap-3 mb-6">
              <Palette size={24} style={{ color: 'var(--accent-primary)' }} />
              <h2 className="text-xl font-semibold">Theme Customization</h2>
            </div>

            {/* Preset Themes */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Preset Themes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PRESET_THEMES.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePresetTheme(preset)}
                    style={{
                      background: preset.previewBackground,
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      border: theme.mode === preset.mode && theme.accentColor === preset.accentColor 
                        ? `2px solid ${preset.accentColor}` 
                        : '2px solid transparent',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1rem',
                      transform: theme.mode === preset.mode && theme.accentColor === preset.accentColor ? 'scale(1.05)' : 'scale(1)'
                    }}
                    className="preset-theme hover:shadow-lg"
                  >
                    <div style={{ color: 'white' }}>
                      <p className="font-semibold text-sm">{preset.name}</p>
                      <p className="text-xs opacity-80">{preset.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Theme Mode Toggle */}
            <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Theme Mode</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleModeChange('dark')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: theme.mode === 'dark' ? `2px solid ${theme.accentColor}` : '2px solid var(--border-color)',
                    background: theme.mode === 'dark' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Dark Mode
                </button>
                <button
                  onClick={() => handleModeChange('light')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: theme.mode === 'light' ? `2px solid ${theme.accentColor}` : '2px solid var(--border-color)',
                    background: theme.mode === 'light' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Light Mode
                </button>
              </div>
            </div>

            {/* Custom Accent Color */}
            <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Custom Accent Color</h3>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={customAccentColor}
                  onChange={(e) => handleAccentColorChange(e.target.value)}
                  style={{
                    width: '80px',
                    height: '80px',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer'
                  }}
                />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Accent Color</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Select the accent color used for buttons, highlights, and UI elements.
                  </p>
                  <p style={{ color: theme.accentColor, marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {customAccentColor}
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={resetTheme} className="mt-4">Reset to Default</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <Card className="p-6">
          <div className="settings-section">
            <h2 className="text-xl font-semibold mb-6">Lead Sources</h2>
            
            {isManagerOrAbove && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="New source name"
                  value={newSourceName}
                  onChange={e => {
                    console.log('Input changed:', e.target.value);
                    setNewSourceName(e.target.value);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
                <Button onClick={() => {
                  console.log('Add button clicked');
                  handleAddSource();
                }}>
                  <Plus size={16} style={{ marginRight: 6 }} /> Add
                </Button>
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
      )}

      {/* LeadStatuses Tab */}
      {activeTab === 'statuses' && (
        <Card className="p-6">
          <div className="settings-section">
            <h2 className="text-xl font-semibold mb-6">Lead Statuses</h2>
            
            {isManagerOrAbove && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Status Name</label>
                    <input
                      type="text"
                      placeholder="e.g., New Lead"
                      value={newStatusName}
                      onChange={e => {
                        console.log('Status name input changed:', e.target.value);
                        setNewStatusName(e.target.value);
                      }}
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
                <Button onClick={() => {
                  console.log('Add Status button clicked');
                  handleAddStatus();
                }} style={{ marginTop: '1rem' }}>
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
                      {status.isTerminal && <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '4px' }}>Terminal</span>}
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
      )}

      {/* Info Card */}
      <Card className="p-6 mt-6" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          ✓ Your settings are automatically saved and will persist across sessions.
        </p>
      </Card>
    </Layout>
  );
};
