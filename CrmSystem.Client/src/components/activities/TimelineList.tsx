import React, { useState, useMemo } from 'react';
import {
  Phone, Mail, Users, FileText, Monitor, RefreshCw, Calendar, Clock,
  Trash2, Plus, ChevronDown, ChevronUp, Search, Filter, Layers, ListFilter
} from 'lucide-react';
import { api } from '../../lib/api';
import { confirmAction } from '../../lib/confirm';

interface ActivityType {
  id: number;
  name: string;
  icon?: string;
}

export interface ActivityReadDto {
  activityId: number;
  activityTypeId: number;
  activityTypeName: string;
  activityTypeIcon?: string;
  subject: string;
  description?: string;
  activityDate: string;
  durationMinutes: number;
  customerId?: number;
  customerName?: string;
  opportunityId?: number;
  opportunityTitle?: string;
  leadId?: number;
  leadName?: string;
  createdById: number;
  createdByName: string;
  createdAt: string;
}

interface TimelineListProps {
  activities: ActivityReadDto[];
  activityTypes: ActivityType[];
  customerId?: number;
  opportunityId?: number;
  leadId?: number;
  currentUserId?: number;
  isAdmin?: boolean;
  readOnly?: boolean;
  maxHeight?: number | string;
  initialItemLimit?: number;
  onActivityLogged: (activity: ActivityReadDto) => void;
  onActivityDeleted: (id: number) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  phone: Phone,
  mail: Mail,
  users: Users,
  'file-text': FileText,
  monitor: Monitor,
  repeat: RefreshCw,
};

function ActivityIcon({ iconName }: { iconName?: string }) {
  const Comp = (iconName && ICON_MAP[iconName.toLowerCase()]) || FileText;
  return <Comp size={15} className="timeline-type-icon" />;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const TimelineList: React.FC<TimelineListProps> = ({
  activities,
  activityTypes,
  customerId,
  opportunityId,
  leadId,
  currentUserId,
  isAdmin,
  readOnly = false,
  maxHeight = 480,
  initialItemLimit = 5,
  onActivityLogged,
  onActivityDeleted
}) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<number | 'ALL'>('ALL');

  const [form, setForm] = useState({
    activityTypeId: '',
    subject: '',
    description: '',
    activityDate: new Date().toISOString().slice(0, 16),
    durationMinutes: '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Sort most recent first
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const dateA = new Date(a.activityDate || a.createdAt).getTime();
      const dateB = new Date(b.activityDate || b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [activities]);

  // 2. Filter by search & activity type
  const filteredActivities = useMemo(() => {
    return sortedActivities.filter(act => {
      if (typeFilter !== 'ALL' && act.activityTypeId !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = act.subject?.toLowerCase().includes(q);
        const matchDesc = act.description?.toLowerCase().includes(q);
        const matchCreator = act.createdByName?.toLowerCase().includes(q);
        const matchType = act.activityTypeName?.toLowerCase().includes(q);
        if (!matchSubject && !matchDesc && !matchCreator && !matchType) {
          return false;
        }
      }
      return true;
    });
  }, [sortedActivities, typeFilter, searchQuery]);

  // 3. Slice for initial limited view vs view all
  const displayedActivities = useMemo(() => {
    if (showAll || searchQuery.trim() || typeFilter !== 'ALL') {
      return filteredActivities;
    }
    return filteredActivities.slice(0, initialItemLimit);
  }, [filteredActivities, showAll, searchQuery, typeFilter, initialItemLimit]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.activityTypeId) errs.activityTypeId = 'Type required';
    if (!form.subject.trim()) errs.subject = 'Subject required';
    if (form.subject.length > 150) errs.subject = 'Max 150 characters';
    const date = new Date(form.activityDate);
    if (isNaN(date.getTime())) errs.activityDate = 'Invalid date';
    return errs;
  };

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        activityTypeId: Number(form.activityTypeId),
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        activityDate: new Date(form.activityDate).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 0,
        customerId: customerId ?? null,
        opportunityId: opportunityId ?? null,
        leadId: leadId ?? null,
      };
      const created = await api.post<ActivityReadDto>('/api/activities', payload);
      onActivityLogged(created);
      setForm({
        activityTypeId: '',
        subject: '',
        description: '',
        activityDate: new Date().toISOString().slice(0, 16),
        durationMinutes: '0'
      });
      setComposerOpen(false);
      setErrors({});
    } catch {
      setErrors({ submit: 'Failed to log activity. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await confirmAction('Delete this activity?')) return;
    try {
      await api.delete(`/api/activities/${id}`);
      onActivityDeleted(id);
    } catch {
      /* ignore */
    }
  };

  const hasMoreItems = filteredActivities.length > initialItemLimit && !showAll && !searchQuery.trim() && typeFilter === 'ALL';

  return (
    <div className="timeline-container" style={{ width: '100%', boxSizing: 'border-box' }}>
      
      {/* ── TOOLBAR: Quick Action, Search & Filter Controls ───────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        {/* Left Side: Filter & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1, minWidth: '240px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.38rem 0.65rem 0.38rem 1.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            />
          </div>

          {/* Type Filter Dropdown */}
          {activityTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              style={{
                padding: '0.38rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Types ({activities.length})</option>
              {activityTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({activities.filter(a => a.activityTypeId === t.id).length})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right Side: Log Activity & View All Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activities.length > initialItemLimit && (
            <button
              type="button"
              className="btn-outline-sm"
              onClick={() => setShowAll(prev => !prev)}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', fontWeight: 600 }}
            >
              {showAll ? 'Show Recent (5)' : `View All (${filteredActivities.length})`}
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              className="btn-outline-sm"
              onClick={() => setComposerOpen(o => !o)}
              style={{
                background: composerOpen ? 'var(--bg-tertiary)' : 'transparent',
                borderColor: composerOpen ? 'var(--accent-primary)' : 'var(--border-color)',
                color: composerOpen ? 'var(--accent-primary)' : 'var(--text-primary)'
              }}
            >
              {composerOpen ? <ChevronUp size={14} /> : <Plus size={14} />}
              {composerOpen ? 'Cancel' : 'Log Activity'}
            </button>
          )}
        </div>
      </div>

      {/* Quick Log Form */}
      {!readOnly && composerOpen && (
        <form className="quick-log-form animate-fade-in" onSubmit={handleLog} style={{ marginBottom: '1rem' }}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                className="filter-select"
                value={form.activityTypeId}
                onChange={e => setForm(f => ({ ...f, activityTypeId: e.target.value }))}
              >
                <option value="">Select type…</option>
                {activityTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {errors.activityTypeId && <span className="form-error">{errors.activityTypeId}</span>}
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">
                Subject * <span className="char-counter">{form.subject.length}/150</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. Follow-up call regarding contract terms"
                maxLength={150}
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
              {errors.subject && <span className="form-error">{errors.subject}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Description / Notes</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Optional notes or discussion summary…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date &amp; Time *</label>
              <input
                type="datetime-local"
                className="input-field"
                value={form.activityDate}
                onChange={e => setForm(f => ({ ...f, activityDate: e.target.value }))}
              />
              {errors.activityDate && <span className="form-error">{errors.activityDate}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Duration (min)</label>
              <input
                type="number"
                min={0}
                className="input-field"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
              />
            </div>
          </div>
          {errors.submit && <span className="form-error">{errors.submit}</span>}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Log Activity'}
            </button>
          </div>
        </form>
      )}

      {/* ── TIMELINE SCROLLABLE CONTAINER ─────────────────────────────────── */}
      {filteredActivities.length === 0 ? (
        <div className="timeline-empty" style={{ padding: '2.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
          <Calendar size={32} className="empty-icon" style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
          <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-secondary)' }}>
            {searchQuery.trim() || typeFilter !== 'ALL'
              ? 'No activities match the search filter.'
              : (readOnly ? 'No activities recorded.' : 'No activities yet. Log the first one above.')}
          </p>
        </div>
      ) : (
        <div
          className="timeline-scroll-container custom-scrollbar"
          style={{
            maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
            overflowY: 'auto',
            paddingRight: '6px',
            overscrollBehavior: 'contain'
          }}
        >
          <div className="timeline-list">
            {displayedActivities.map(act => (
              <div key={act.activityId} className="timeline-row">
                <div className="timeline-icon-col">
                  <ActivityIcon iconName={act.activityTypeIcon} />
                </div>
                <div className="timeline-body">
                  <div className="timeline-header-row">
                    <span className="timeline-type-badge">{act.activityTypeName}</span>
                    <span className="timeline-subject">{act.subject}</span>
                  </div>
                  {act.description && (
                    <p className="timeline-description">{act.description}</p>
                  )}
                  <div className="timeline-meta">
                    <Clock size={11} />
                    <span>{formatDate(act.activityDate)}</span>
                    {act.durationMinutes > 0 && <span>· {act.durationMinutes} min</span>}
                    <span>· {act.createdByName}</span>
                  </div>
                </div>
                {(isAdmin || act.createdById === currentUserId) && (
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Delete activity"
                    onClick={() => handleDelete(act.activityId)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Bottom "View All" Prompt when in limited view */}
          {hasMoreItems && (
            <div style={{
              textAlign: 'center',
              padding: '0.85rem 0 0.25rem 0',
              borderTop: '1px dashed var(--border-color)',
              marginTop: '0.5rem'
            }}>
              <button
                type="button"
                className="btn-outline-sm"
                onClick={() => setShowAll(true)}
                style={{ fontSize: '0.8rem', fontWeight: 600 }}
              >
                View All {filteredActivities.length} Activities (Scrollable)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineList;
