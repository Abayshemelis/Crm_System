import React, { useState } from 'react';
import { Phone, Mail, Users, FileText, Monitor, RefreshCw, Calendar, Clock, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../lib/api';

interface ActivityType { id: number; name: string; icon?: string; }
interface ActivityReadDto {
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
  createdById: number;
  createdByName: string;
  createdAt: string;
}

interface TimelineListProps {
  activities: ActivityReadDto[];
  activityTypes: ActivityType[];
  customerId?: number;
  opportunityId?: number;
  currentUserId?: number;
  isAdmin?: boolean;
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
  const Comp = (iconName && ICON_MAP[iconName]) || FileText;
  return <Comp size={16} className="timeline-type-icon" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export const TimelineList: React.FC<TimelineListProps> = ({
  activities, activityTypes, customerId, opportunityId,
  currentUserId, isAdmin, onActivityLogged, onActivityDeleted
}) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    activityTypeId: '',
    subject: '',
    description: '',
    activityDate: new Date().toISOString().slice(0, 16),
    durationMinutes: '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (Object.keys(errs).length) { setErrors(errs); return; }
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
      };
      const created = await api.post<ActivityReadDto>('/api/activities', payload);
      onActivityLogged(created);
      setForm({ activityTypeId: '', subject: '', description: '', activityDate: new Date().toISOString().slice(0, 16), durationMinutes: '0' });
      setComposerOpen(false);
      setErrors({});
    } catch {
      setErrors({ submit: 'Failed to log activity. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this activity?')) return;
    try {
      await api.delete(`/api/activities/${id}`);
      onActivityDeleted(id);
    } catch { /* ignore */ }
  };

  return (
    <div className="timeline-container">
      {/* Quick Log Composer */}
      <div className="timeline-composer-header">
        <button
          type="button"
          className="btn-outline-sm"
          onClick={() => setComposerOpen(o => !o)}
        >
          {composerOpen ? <ChevronUp size={14} /> : <Plus size={14} />}
          {composerOpen ? 'Cancel' : 'Log Activity'}
        </button>
      </div>

      {composerOpen && (
        <form className="quick-log-form" onSubmit={handleLog}>
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
                placeholder="e.g. Discovery call with John"
                maxLength={150}
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
              {errors.subject && <span className="form-error">{errors.subject}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Description</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Optional notes…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
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

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="timeline-empty">
          <Calendar size={32} className="empty-icon" />
          <p>No activities yet. Log the first one above.</p>
        </div>
      ) : (
        <div className="timeline-list">
          {activities.map(act => (
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
                  title="Delete"
                  onClick={() => handleDelete(act.activityId)}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
