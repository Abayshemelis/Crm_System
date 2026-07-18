import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Palette, Plus, Trash2, Edit2, Check, X,
  Layers, Tag, Package, Globe, List, Bell, Activity
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stage    { id: number; name: string; sortOrder: number; isWon: boolean; isLost: boolean; }
interface TagItem  { id: number; name: string; }
interface Source   { id: number; name: string; }
interface LeadStatus  { id: number; name: string; sortOrder: number; isTerminal: boolean; }
interface TaskStatus  { id: number; name: string; isTerminal: boolean; }
interface ActivityTypeItem { id: number; name: string; icon?: string; }
interface NotifType   { id: number; name: string; defaultChannel?: string; }

type MainTab = 'pipeline' | 'tags' | 'products' | 'sources' | 'statuses' | 'theme';
type StatusSubTab = 'lead' | 'task' | 'activity' | 'notification';

// ── Generic inline-edit row ────────────────────────────────────────────────────
interface RowProps {
  label: string;
  badge?: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}
const LookupRow: React.FC<RowProps> = ({ label, badge, onEdit, onDelete, canEdit }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.7rem 1rem',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
  }}>
    <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
    {badge}
    {canEdit && (
      <>
        <Button variant="ghost" size="sm" onClick={onEdit}><Edit2 size={14} /></Button>
        <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 size={14} /></Button>
      </>
    )}
  </div>
);

// ── Badge helpers ──────────────────────────────────────────────────────────────
const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, background: `${color}1a`, color, border: `1px solid ${color}44`, fontWeight: 600 }}>
    {label}
  </span>
);

// ── Section wrapper ────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '2rem' }}>
    <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
      {title}
    </h3>
    {children}
  </div>
);

// ── Hook: generic CRUD for a lookup ───────────────────────────────────────────
function useLookup<T extends { id: number; name: string }>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>(endpoint);
      const mapped = (data ?? []).map(item => {
        const id = item.id ?? item.opportunityStageId ?? item.tagId ?? item.sourceId ?? item.leadStatusId ?? item.crmTaskStatusId ?? item.activityTypeId ?? item.notificationTypeId;
        return {
          ...item,
          id
        };
      });
      setItems(mapped as T[]);
    }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

// ── Toast helper ──────────────────────────────────────────────────────────────
const toast = (message: string, type: 'success' | 'error' = 'success') =>
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));

// ═══════════════════════════════════════════════════════════════════════════════
// Main SettingsScreen
// ═══════════════════════════════════════════════════════════════════════════════
export const SettingsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>('pipeline');
  const [statusSubTab, setStatusSubTab] = useState<StatusSubTab>('lead');

  // ── Theme state (preserved from original) ──
  const PRESET_THEMES = [
    { name: 'Cyan Ocean',         mode: 'dark' as const, bg: 'linear-gradient(135deg,#0a0e27,#1a1f3a,#0f172a)', accentColor: '#06b6d4' },
    { name: 'Purple Galaxy',      mode: 'dark' as const, bg: 'linear-gradient(135deg,#1a0033,#330066,#1a0033)', accentColor: '#a78bfa' },
    { name: 'Emerald Forest',     mode: 'dark' as const, bg: 'linear-gradient(135deg,#0d2818,#1a4d2e,#0d2818)', accentColor: '#10b981' },
    { name: 'Rose Gold',          mode: 'dark' as const, bg: 'linear-gradient(135deg,#3d1a1a,#5a2a2a,#3d1a1a)', accentColor: '#f87171' },
    { name: 'Slate Professional', mode: 'dark' as const, bg: 'linear-gradient(135deg,#0f172a,#1e293b,#0f172a)', accentColor: '#3b82f6' },
    { name: 'Light Clean',        mode: 'light' as const, bg: 'linear-gradient(135deg,#f8fafc,#e2e8f0,#f1f5f9)', accentColor: '#0284c7' },
  ];
  const [theme, setTheme] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm-theme') || '{}'); } catch { return {}; }
  });
  const [customAccent, setCustomAccent] = useState(theme.accentColor || '#06b6d4');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.mode || 'dark');
    root.style.setProperty('--accent-primary', theme.accentColor || '#06b6d4');
    const hex = theme.accentColor || '#06b6d4';
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.5)`);
    localStorage.setItem('crm-theme', JSON.stringify(theme));
  }, [theme]);

  // ── Pipeline Stages ──────────────────────────────────────────────────────────
  const stages = useLookup<Stage>('/api/opportunitystages');
  const [stageForm, setStageForm] = useState({ name: '', sortOrder: '0', isWon: false, isLost: false });
  const [editingStage, setEditingStage] = useState<Stage | null>(null);

  const addStage = async () => {
    if (!stageForm.name.trim()) return toast('Stage name is required', 'error');
    if (stageForm.isWon && stageForm.isLost) return toast('A stage cannot be both Won and Lost', 'error');
    try {
      await api.post('/api/opportunitystages', { name: stageForm.name.trim(), sortOrder: Number(stageForm.sortOrder), isWon: stageForm.isWon, isLost: stageForm.isLost });
      setStageForm({ name: '', sortOrder: '0', isWon: false, isLost: false });
      stages.refresh();
      toast('Stage added');
    } catch (e: any) { toast(e?.message || 'Failed to add stage', 'error'); }
  };

  const saveStage = async () => {
    if (!editingStage) return;
    if (editingStage.isWon && editingStage.isLost) return toast('A stage cannot be both Won and Lost', 'error');
    try {
      await api.put(`/api/opportunitystages/${editingStage.id}`, { name: editingStage.name, sortOrder: editingStage.sortOrder, isWon: editingStage.isWon, isLost: editingStage.isLost });
      setEditingStage(null);
      stages.refresh();
      toast('Stage updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const deleteStage = async (id: number) => {
    if (!confirm('Delete this stage?')) return;
    try { await api.delete(`/api/opportunitystages/${id}`); stages.refresh(); toast('Stage deleted'); }
    catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Tags ─────────────────────────────────────────────────────────────────────
  const tags = useLookup<TagItem>('/api/tags');
  const [tagName, setTagName] = useState('');
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);

  const addTag = async () => {
    if (!tagName.trim()) return toast('Tag name is required', 'error');
    try {
      await api.post('/api/tags', { name: tagName.trim() });
      setTagName('');
      tags.refresh();
      toast('Tag added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveTag = async () => {
    if (!editingTag) return;
    try {
      await api.put(`/api/tags/${editingTag.id}`, { name: editingTag.name });
      setEditingTag(null);
      tags.refresh();
      toast('Tag updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const deleteTag = async (id: number) => {
    if (!confirm('Delete this tag?')) return;
    try { await api.delete(`/api/tags/${id}`); tags.refresh(); toast('Tag deleted'); }
    catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Sources ───────────────────────────────────────────────────────────────────
  const sources = useLookup<Source>('/api/sources');
  const [sourceName, setSourceName] = useState('');
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  const addSource = async () => {
    if (!sourceName.trim()) return toast('Source name is required', 'error');
    try {
      await api.post('/api/sources', { name: sourceName.trim() });
      setSourceName('');
      sources.refresh();
      toast('Source added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveSource = async () => {
    if (!editingSource) return;
    try {
      await api.put(`/api/sources/${editingSource.id}`, { name: editingSource.name });
      setEditingSource(null);
      sources.refresh();
      toast('Source updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const deleteSource = async (id: number) => {
    if (!confirm('Delete this source?')) return;
    try { await api.delete(`/api/sources/${id}`); sources.refresh(); toast('Source deleted'); }
    catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Lead Statuses ─────────────────────────────────────────────────────────────
  const leadStatuses = useLookup<LeadStatus>('/api/leadstatuses');
  const [leadStatusForm, setLeadStatusForm] = useState({ name: '', sortOrder: '0', isTerminal: false });
  const [editingLeadStatus, setEditingLeadStatus] = useState<LeadStatus | null>(null);

  const addLeadStatus = async () => {
    if (!leadStatusForm.name.trim()) return toast('Name is required', 'error');
    try {
      await api.post('/api/leadstatuses', { name: leadStatusForm.name.trim(), sortOrder: Number(leadStatusForm.sortOrder), isTerminal: leadStatusForm.isTerminal });
      setLeadStatusForm({ name: '', sortOrder: '0', isTerminal: false });
      leadStatuses.refresh();
      toast('Lead status added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveLeadStatus = async () => {
    if (!editingLeadStatus) return;
    try {
      await api.put(`/api/leadstatuses/${editingLeadStatus.id}`, { name: editingLeadStatus.name, sortOrder: editingLeadStatus.sortOrder, isTerminal: editingLeadStatus.isTerminal });
      setEditingLeadStatus(null);
      leadStatuses.refresh();
      toast('Lead status updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Task Statuses ─────────────────────────────────────────────────────────────
  const taskStatuses = useLookup<TaskStatus>('/api/taskstatuses');
  const [taskStatusForm, setTaskStatusForm] = useState({ name: '', isTerminal: false });
  const [editingTaskStatus, setEditingTaskStatus] = useState<TaskStatus | null>(null);

  const addTaskStatus = async () => {
    if (!taskStatusForm.name.trim()) return toast('Name is required', 'error');
    try {
      await api.post('/api/taskstatuses', { name: taskStatusForm.name.trim(), isTerminal: taskStatusForm.isTerminal });
      setTaskStatusForm({ name: '', isTerminal: false });
      taskStatuses.refresh();
      toast('Task status added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveTaskStatus = async () => {
    if (!editingTaskStatus) return;
    try {
      await api.put(`/api/taskstatuses/${editingTaskStatus.id}`, { name: editingTaskStatus.name, isTerminal: editingTaskStatus.isTerminal });
      setEditingTaskStatus(null);
      taskStatuses.refresh();
      toast('Task status updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Activity Types ────────────────────────────────────────────────────────────
  const activityTypes = useLookup<ActivityTypeItem>('/api/activitytypes');
  const [activityForm, setActivityForm] = useState({ name: '', icon: '' });
  const [editingActivity, setEditingActivity] = useState<ActivityTypeItem | null>(null);

  const addActivity = async () => {
    if (!activityForm.name.trim()) return toast('Name is required', 'error');
    try {
      await api.post('/api/activitytypes', { name: activityForm.name.trim(), icon: activityForm.icon.trim() || null });
      setActivityForm({ name: '', icon: '' });
      activityTypes.refresh();
      toast('Activity type added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveActivity = async () => {
    if (!editingActivity) return;
    try {
      await api.put(`/api/activitytypes/${editingActivity.id}`, { name: editingActivity.name, icon: editingActivity.icon || null });
      setEditingActivity(null);
      activityTypes.refresh();
      toast('Activity type updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Notification Types ────────────────────────────────────────────────────────
  const notifTypes = useLookup<NotifType>('/api/notificationtypes');
  const [notifForm, setNotifForm] = useState({ name: '', defaultChannel: '' });
  const [editingNotif, setEditingNotif] = useState<NotifType | null>(null);

  const addNotif = async () => {
    if (!notifForm.name.trim()) return toast('Name is required', 'error');
    try {
      await api.post('/api/notificationtypes', { name: notifForm.name.trim(), defaultChannel: notifForm.defaultChannel.trim() || null });
      setNotifForm({ name: '', defaultChannel: '' });
      notifTypes.refresh();
      toast('Notification type added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveNotif = async () => {
    if (!editingNotif) return;
    try {
      await api.put(`/api/notificationtypes/${editingNotif.id}`, { name: editingNotif.name, defaultChannel: editingNotif.defaultChannel || null });
      setEditingNotif(null);
      notifTypes.refresh();
      toast('Notification type updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Tab config ────────────────────────────────────────────────────────────────
  const TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pipeline', label: 'Pipeline Stages',   icon: <Layers size={15} /> },
    { id: 'tags',     label: 'Tags',              icon: <Tag size={15} /> },
    { id: 'products', label: 'Products',          icon: <Package size={15} /> },
    { id: 'sources',  label: 'Sources',           icon: <Globe size={15} /> },
    { id: 'statuses', label: 'Statuses & Types',  icon: <List size={15} /> },
    { id: 'theme',    label: 'Theme',             icon: <Palette size={15} /> },
  ];

  const STATUS_SUB_TABS: { id: StatusSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'lead',         label: 'Lead Statuses',      icon: <List size={13} /> },
    { id: 'task',         label: 'Task Statuses',       icon: <Check size={13} /> },
    { id: 'activity',     label: 'Activity Types',      icon: <Activity size={13} /> },
    { id: 'notification', label: 'Notification Types',  icon: <Bell size={13} /> },
  ];

  // ── Shared input style ────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.875rem',
    outline: 'none',
  };

  const checkboxRow = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );

  // ── Add row form ──────────────────────────────────────────────────────────────
  const AddForm: React.FC<{ children: React.ReactNode; onAdd: () => void; label?: string }> = ({ children, onAdd, label = 'Add' }) => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      {children}
      <Button onClick={onAdd} size="sm"><Plus size={14} style={{ marginRight: 4 }} />{label}</Button>
    </div>
  );

  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Settings</h1>
          <p className="screen-subtitle">Configuration area for Managers and Admins.</p>
        </div>
      </div>

      {/* Main tab bar */}
      <div className="tabs-bar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Pipeline Stages ─────────────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <Section title="Pipeline Stages">
              {isManagerOrAbove && (
                <AddForm onAdd={addStage}>
                  <input style={inputStyle} placeholder="Stage name" value={stageForm.name} onChange={e => setStageForm(p => ({ ...p, name: e.target.value }))} />
                  <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" placeholder="Order" value={stageForm.sortOrder} onChange={e => setStageForm(p => ({ ...p, sortOrder: e.target.value }))} />
                  {checkboxRow('Won', stageForm.isWon, v => setStageForm(p => ({ ...p, isWon: v })))}
                  {checkboxRow('Lost', stageForm.isLost, v => setStageForm(p => ({ ...p, isLost: v })))}
                </AddForm>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[...stages.items].sort((a, b) => a.sortOrder - b.sortOrder).map(s => (
                  editingStage?.id === s.id ? (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44', flexWrap: 'wrap' }}>
                      <input style={inputStyle} value={editingStage.name} onChange={e => setEditingStage(p => p ? { ...p, name: e.target.value } : p)} />
                      <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" value={editingStage.sortOrder} onChange={e => setEditingStage(p => p ? { ...p, sortOrder: Number(e.target.value) } : p)} />
                      {checkboxRow('Won', editingStage.isWon, v => setEditingStage(p => p ? { ...p, isWon: v } : p))}
                      {checkboxRow('Lost', editingStage.isLost, v => setEditingStage(p => p ? { ...p, isLost: v } : p))}
                      <Button size="sm" onClick={saveStage}><Check size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingStage(null)}><X size={14} /></Button>
                    </div>
                  ) : (
                    <LookupRow key={s.id} label={`${s.name}  ·  Order ${s.sortOrder}`}
                      badge={<>
                        {s.isWon  && <Badge label="Won"  color="#10b981" />}
                        {s.isLost && <Badge label="Lost" color="#ef4444" />}
                      </>}
                      onEdit={() => setEditingStage(s)}
                      onDelete={() => deleteStage(s.id)}
                      canEdit={isManagerOrAbove}
                    />
                  )
                ))}
              </div>
            </Section>
          </Card.Content>
        </Card>
      )}

      {/* ── Tags ──────────────────────────────────────────────────────────────── */}
      {activeTab === 'tags' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <Section title="Tags">
              {isManagerOrAbove && (
                <AddForm onAdd={addTag}>
                  <input style={inputStyle} placeholder="Tag name" value={tagName} onChange={e => setTagName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()} />
                </AddForm>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {tags.items.map(t => (
                  editingTag?.id === t.id ? (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                      <input style={inputStyle} value={editingTag.name} onChange={e => setEditingTag(p => p ? { ...p, name: e.target.value } : p)} />
                      <Button size="sm" onClick={saveTag}><Check size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)}><X size={14} /></Button>
                    </div>
                  ) : (
                    <LookupRow key={t.id} label={t.name}
                      onEdit={() => setEditingTag(t)} onDelete={() => deleteTag(t.id)} canEdit={isManagerOrAbove} />
                  )
                ))}
                {tags.items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tags yet.</p>}
              </div>
            </Section>
          </Card.Content>
        </Card>
      )}

      {/* ── Products (redirect to existing page) ──────────────────────────────── */}
      {activeTab === 'products' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Package size={48} style={{ color: 'var(--accent-primary)', margin: '0 auto 1rem', display: 'block' }} />
              <h2 style={{ marginBottom: '0.5rem' }}>Products Catalog</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Manage SKUs, categories, pricing, cost, stock quantity and status used by Opportunity line items.
              </p>
              <Button onClick={() => window.location.href = '/pipeline/products'}>
                Open Products Catalog
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* ── Sources ───────────────────────────────────────────────────────────── */}
      {activeTab === 'sources' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <Section title="Lead & Customer Sources">
              {isManagerOrAbove && (
                <AddForm onAdd={addSource}>
                  <input style={inputStyle} placeholder="e.g. Website, Referral, LinkedIn" value={sourceName} onChange={e => setSourceName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSource()} />
                </AddForm>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {sources.items.map(s => (
                  editingSource?.id === s.id ? (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                      <input style={inputStyle} value={editingSource.name} onChange={e => setEditingSource(p => p ? { ...p, name: e.target.value } : p)} />
                      <Button size="sm" onClick={saveSource}><Check size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSource(null)}><X size={14} /></Button>
                    </div>
                  ) : (
                    <LookupRow key={s.id} label={s.name}
                      onEdit={() => setEditingSource(s)} onDelete={() => deleteSource(s.id)} canEdit={isManagerOrAbove} />
                  )
                ))}
              </div>
            </Section>
          </Card.Content>
        </Card>
      )}

      {/* ── Statuses & Types ──────────────────────────────────────────────────── */}
      {activeTab === 'statuses' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            {/* Sub-tab bar */}
            <div className="tabs-bar" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              {STATUS_SUB_TABS.map(st => (
                <button key={st.id}
                  className={`tab-btn ${statusSubTab === st.id ? 'tab-active' : ''}`}
                  onClick={() => setStatusSubTab(st.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                >
                  {st.icon}{st.label}
                </button>
              ))}
            </div>

            {/* Lead Statuses */}
            {statusSubTab === 'lead' && (
              <Section title="Lead Statuses">
                {isManagerOrAbove && (
                  <AddForm onAdd={addLeadStatus}>
                    <input style={inputStyle} placeholder="e.g. New, Qualified, Converted" value={leadStatusForm.name} onChange={e => setLeadStatusForm(p => ({ ...p, name: e.target.value }))} />
                    <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" placeholder="Order" value={leadStatusForm.sortOrder} onChange={e => setLeadStatusForm(p => ({ ...p, sortOrder: e.target.value }))} />
                    {checkboxRow('Terminal', leadStatusForm.isTerminal, v => setLeadStatusForm(p => ({ ...p, isTerminal: v })))}
                  </AddForm>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[...leadStatuses.items].sort((a, b) => a.sortOrder - b.sortOrder).map(s => (
                    editingLeadStatus?.id === s.id ? (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44', flexWrap: 'wrap' }}>
                        <input style={inputStyle} value={editingLeadStatus.name} onChange={e => setEditingLeadStatus(p => p ? { ...p, name: e.target.value } : p)} />
                        <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" value={editingLeadStatus.sortOrder} onChange={e => setEditingLeadStatus(p => p ? { ...p, sortOrder: Number(e.target.value) } : p)} />
                        {checkboxRow('Terminal', editingLeadStatus.isTerminal, v => setEditingLeadStatus(p => p ? { ...p, isTerminal: v } : p))}
                        <Button size="sm" onClick={saveLeadStatus}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingLeadStatus(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <LookupRow key={s.id} label={`${s.name}  ·  Order ${s.sortOrder}`}
                        badge={s.isTerminal ? <Badge label="Terminal" color="#3b82f6" /> : undefined}
                        onEdit={() => setEditingLeadStatus(s)} onDelete={async () => { if (confirm('Delete?')) { await api.delete(`/api/leadstatuses/${s.id}`); leadStatuses.refresh(); toast('Deleted'); } }} canEdit={isManagerOrAbove} />
                    )
                  ))}
                </div>
              </Section>
            )}

            {/* Task Statuses */}
            {statusSubTab === 'task' && (
              <Section title="Task Statuses">
                {isManagerOrAbove && (
                  <AddForm onAdd={addTaskStatus}>
                    <input style={inputStyle} placeholder="e.g. Pending, In Progress, Done" value={taskStatusForm.name} onChange={e => setTaskStatusForm(p => ({ ...p, name: e.target.value }))} />
                    {checkboxRow('Terminal', taskStatusForm.isTerminal, v => setTaskStatusForm(p => ({ ...p, isTerminal: v })))}
                  </AddForm>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {taskStatuses.items.map(s => (
                    editingTaskStatus?.id === s.id ? (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                        <input style={inputStyle} value={editingTaskStatus.name} onChange={e => setEditingTaskStatus(p => p ? { ...p, name: e.target.value } : p)} />
                        {checkboxRow('Terminal', editingTaskStatus.isTerminal, v => setEditingTaskStatus(p => p ? { ...p, isTerminal: v } : p))}
                        <Button size="sm" onClick={saveTaskStatus}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingTaskStatus(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <LookupRow key={s.id} label={s.name}
                        badge={s.isTerminal ? <Badge label="Terminal" color="#3b82f6" /> : undefined}
                        onEdit={() => setEditingTaskStatus(s)} onDelete={async () => { if (confirm('Delete?')) { await api.delete(`/api/taskstatuses/${s.id}`); taskStatuses.refresh(); toast('Deleted'); } }} canEdit={isManagerOrAbove} />
                    )
                  ))}
                </div>
              </Section>
            )}

            {/* Activity Types */}
            {statusSubTab === 'activity' && (
              <Section title="Activity Types">
                {isManagerOrAbove && (
                  <AddForm onAdd={addActivity}>
                    <input style={inputStyle} placeholder="e.g. Call, Email, Meeting" value={activityForm.name} onChange={e => setActivityForm(p => ({ ...p, name: e.target.value }))} />
                    <input style={{ ...inputStyle, width: 120, flex: 'none' }} placeholder="Icon (optional)" value={activityForm.icon} onChange={e => setActivityForm(p => ({ ...p, icon: e.target.value }))} />
                  </AddForm>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {activityTypes.items.map(a => (
                    editingActivity?.id === a.id ? (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                        <input style={inputStyle} value={editingActivity.name} onChange={e => setEditingActivity(p => p ? { ...p, name: e.target.value } : p)} />
                        <input style={{ ...inputStyle, width: 120, flex: 'none' }} placeholder="Icon" value={editingActivity.icon || ''} onChange={e => setEditingActivity(p => p ? { ...p, icon: e.target.value } : p)} />
                        <Button size="sm" onClick={saveActivity}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingActivity(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <LookupRow key={a.id} label={a.name}
                        badge={a.icon ? <Badge label={a.icon} color="#a78bfa" /> : undefined}
                        onEdit={() => setEditingActivity(a)} onDelete={async () => { if (confirm('Delete?')) { await api.delete(`/api/activitytypes/${a.id}`); activityTypes.refresh(); toast('Deleted'); } }} canEdit={isManagerOrAbove} />
                    )
                  ))}
                </div>
              </Section>
            )}

            {/* Notification Types */}
            {statusSubTab === 'notification' && (
              <Section title="Notification Types">
                {isManagerOrAbove && (
                  <AddForm onAdd={addNotif}>
                    <input style={inputStyle} placeholder="e.g. TaskDue, OpportunityWon" value={notifForm.name} onChange={e => setNotifForm(p => ({ ...p, name: e.target.value }))} />
                    <input style={{ ...inputStyle, width: 140, flex: 'none' }} placeholder="Channel (InApp/Email)" value={notifForm.defaultChannel} onChange={e => setNotifForm(p => ({ ...p, defaultChannel: e.target.value }))} />
                  </AddForm>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {notifTypes.items.map(n => (
                    editingNotif?.id === n.id ? (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                        <input style={inputStyle} value={editingNotif.name} onChange={e => setEditingNotif(p => p ? { ...p, name: e.target.value } : p)} />
                        <input style={{ ...inputStyle, width: 140, flex: 'none' }} placeholder="Channel" value={editingNotif.defaultChannel || ''} onChange={e => setEditingNotif(p => p ? { ...p, defaultChannel: e.target.value } : p)} />
                        <Button size="sm" onClick={saveNotif}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingNotif(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <LookupRow key={n.id} label={n.name}
                        badge={n.defaultChannel ? <Badge label={n.defaultChannel} color="#06b6d4" /> : undefined}
                        onEdit={() => setEditingNotif(n)} onDelete={async () => { if (confirm('Delete?')) { await api.delete(`/api/notificationtypes/${n.id}`); notifTypes.refresh(); toast('Deleted'); } }} canEdit={isManagerOrAbove} />
                    )
                  ))}
                </div>
              </Section>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── Theme ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'theme' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <Section title="Preset Themes">
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                {PRESET_THEMES.map((p, i) => (
                  <div key={i} onClick={() => { setTheme({ mode: p.mode, accentColor: p.accentColor }); setCustomAccent(p.accentColor); }}
                    style={{
                      background: p.bg, cursor: 'pointer', borderRadius: 'var(--radius-lg)', padding: '1rem',
                      border: theme.accentColor === p.accentColor ? `2px solid ${p.accentColor}` : '2px solid transparent',
                      transform: theme.accentColor === p.accentColor ? 'scale(1.04)' : 'scale(1)',
                      transition: 'all 0.2s',
                    }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{p.name}</p>
                    <p style={{ color: '#fff', opacity: 0.7, fontSize: '0.75rem' }}>{p.mode} mode</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Mode">
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(['dark', 'light'] as const).map(m => (
                  <button key={m} onClick={() => setTheme((p: any) => ({ ...p, mode: m }))}
                    style={{ padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-primary)', background: theme.mode === m ? 'rgba(6,182,212,0.12)' : 'transparent', border: theme.mode === m ? `2px solid ${theme.accentColor}` : '2px solid var(--border-color)' }}>
                    {m.charAt(0).toUpperCase() + m.slice(1)} Mode
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Custom Accent Color">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="color" value={customAccent} onChange={e => { setCustomAccent(e.target.value); setTheme((p: any) => ({ ...p, accentColor: e.target.value })); }}
                  style={{ width: 64, height: 64, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }} />
                <div>
                  <p style={{ fontWeight: 600 }}>Accent Color</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Used for buttons, highlights and UI accents.</p>
                  <p style={{ color: theme.accentColor, fontFamily: 'monospace', fontSize: '0.85rem', marginTop: 4 }}>{customAccent}</p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => { setTheme({ mode: 'dark', accentColor: '#06b6d4' }); setCustomAccent('#06b6d4'); }} style={{ marginTop: '1rem' }}>
                Reset to Default
              </Button>
            </Section>
          </Card.Content>
        </Card>
      )}
    </Layout>
  );
};
