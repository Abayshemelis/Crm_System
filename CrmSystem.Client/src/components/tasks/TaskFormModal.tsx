import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { TaskReadDto } from './TaskListGroup';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Lookup { id: number; name: string; }

interface TaskFormModalProps {
  task?: TaskReadDto | null;
  prefillDueDate?: string;   // ISO date string (YYYY-MM-DD) pre-filled from calendar
  customerId?: number;
  opportunityId?: number;
  currentUserId: number;
  users: Lookup[];
  customers?: Lookup[];
  opportunities?: Lookup[];
  activities?: Lookup[];
  activityTypes?: Lookup[];
  statuses: (Lookup & { isTerminal: boolean })[];
  onSaved: (task: TaskReadDto) => void;
  onDeleted?: (id: number) => void;
  onClose: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  task, prefillDueDate, customerId, opportunityId, currentUserId,
  users, customers = [], opportunities = [], activities = [], activityTypes = [], statuses,
  onSaved, onDeleted, onClose,
}) => {
  const isEditing = !!task;
  const defaultStatus = statuses.find(s => !s.isTerminal)?.id ?? 0;
  const userOptions = users.length > 0 ? users : [{ id: currentUserId, name: 'Me' }];

  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 16) : (prefillDueDate ? `${prefillDueDate}T09:00` : ''),
    crmTaskStatusId: String(task?.crmTaskStatusId ?? defaultStatus),
    assignedToId: String(task?.assignedToId ?? currentUserId),
    customerId: String(task?.customerId ?? customerId ?? ''),
    opportunityId: String(task?.opportunityId ?? opportunityId ?? ''),
    activityId: String(task?.activityId ?? ''),
  });
  const [activityMode, setActivityMode] = useState<'none' | 'link' | 'create'>('none');
  const [newActivity, setNewActivity] = useState({
    activityTypeId: '',
    subject: '',
    description: '',
    activityDate: new Date().toISOString().slice(0, 16),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pastDateWarning, setPastDateWarning] = useState(false);

  useEffect(() => {
    if (task) return;
    if (form.crmTaskStatusId === '0' && defaultStatus !== 0) {
      setForm(f => ({ ...f, crmTaskStatusId: String(defaultStatus) }));
    }
  }, [task, form.crmTaskStatusId, defaultStatus]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (form.title.length > 150) errs.title = 'Max 150 characters';
    if (!form.dueDate) errs.dueDate = 'Due date is required';
    if (!isEditing && form.dueDate) {
      const due = new Date(form.dueDate);
      const now = new Date();
      if (due < now) errs.dueDate = 'Due date/time cannot be in the past for new tasks';
    }
    return errs;
  };

  const handleDueDateChange = (val: string) => {
    setForm(f => ({ ...f, dueDate: val }));
    if (isEditing && val) {
      const due = new Date(val);
      const now = new Date();
      setPastDateWarning(due < now);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && pastDateWarning) {
      if (!window.confirm('Set due date to a past date? The task will appear as Overdue.')) return;
    }
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      let activityId = Number(form.activityId) || null;

      // If creating a new activity, create it first
      if (activityMode === 'create') {
        if (!newActivity.activityTypeId || !newActivity.subject) {
          setErrors({ submit: 'Activity type and subject are required when creating a new activity.' });
          setSaving(false);
          return;
        }
        const activityPayload = {
          activityTypeId: Number(newActivity.activityTypeId),
          subject: newActivity.subject.trim(),
          description: newActivity.description.trim() || null,
          activityDate: newActivity.activityDate ? new Date(newActivity.activityDate).toISOString() : new Date().toISOString(),
          durationMinutes: 0,
          customerId: Number(form.customerId) || null,
          opportunityId: Number(form.opportunityId) || null,
        };
        const createdActivity = await api.post<any>('/api/activities', activityPayload);
        activityId = createdActivity.activityId;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        crmTaskStatusId: Number(form.crmTaskStatusId),
        assignedToId: Number(form.assignedToId) || null,
        customerId: Number(form.customerId) || null,
        opportunityId: Number(form.opportunityId) || null,
        activityId: activityId,
      };
      let saved: TaskReadDto;
      if (isEditing) {
        saved = await api.put<TaskReadDto>(`/api/tasks/${task!.crmTaskId}`, payload);
      } else {
        saved = await api.post<TaskReadDto>('/api/tasks', payload);
      }
      onSaved(saved);
    } catch {
      setErrors({ submit: 'Save failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDeleted) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/tasks/${task.crmTaskId}`);
      onDeleted(task.crmTaskId);
    } catch {
      setErrors({ submit: 'Delete failed. Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Task' : 'Create New Task'}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>
                Title * <span className="char-counter">{form.title.length}/150</span>
              </label>
              <Input
                placeholder="e.g. Follow up on proposal"
                maxLength={150}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Add task details or notes…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label>Due Date & Time *</label>
              <Input
                type="datetime-local"
                value={form.dueDate}
                onChange={e => handleDueDateChange(e.target.value)}
              />
              {pastDateWarning && !errors.dueDate && (
                <span className="form-warn" style={{ color: 'var(--warning)', fontSize: '0.75rem', marginTop: '2px' }}>
                  ⚠ This date/time is in the past
                </span>
              )}
              {errors.dueDate && <span className="form-error">{errors.dueDate}</span>}
            </div>

            <div className="form-field">
              <label>Assigned To</label>
              <select
                className="form-select"
                value={form.assignedToId}
                onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}
              >
                {userOptions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {isEditing && statuses.length > 0 && (
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Status</label>
                <select
                  className="form-select"
                  value={form.crmTaskStatusId}
                  onChange={e => setForm(f => ({ ...f, crmTaskStatusId: e.target.value }))}
                >
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {(customers.length > 0 || opportunities.length > 0) && (
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: '0.5rem' }}>
                {customers.length > 0 && (
                  <div className="form-field">
                    <label>Link Customer</label>
                    <select
                      className="form-select"
                      value={form.customerId}
                      onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                    >
                      <option value="">None</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {opportunities.length > 0 && (
                  <div className="form-field">
                    <label>Link Opportunity</label>
                    <select
                      className="form-select"
                      value={form.opportunityId}
                      onChange={e => setForm(f => ({ ...f, opportunityId: e.target.value }))}
                    >
                      <option value="">None</option>
                      {opportunities.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Activity Log (Optional)</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="activityMode"
                    value="none"
                    checked={activityMode === 'none'}
                    onChange={() => setActivityMode('none')}
                  />
                  <span>No activity</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="activityMode"
                    value="link"
                    checked={activityMode === 'link'}
                    onChange={() => setActivityMode('link')}
                  />
                  <span>Link existing</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="activityMode"
                    value="create"
                    checked={activityMode === 'create'}
                    onChange={() => setActivityMode('create')}
                  />
                  <span>Create new</span>
                </label>
              </div>

              {activityMode === 'link' && activities.length > 0 && (
                <select
                  className="form-select"
                  value={form.activityId}
                  onChange={e => setForm(f => ({ ...f, activityId: e.target.value }))}
                >
                  <option value="">Select an activity...</option>
                  {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}

              {activityMode === 'link' && activities.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent activities available</div>
              )}

              {activityMode === 'create' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  <div className="form-field">
                    <label>Activity Type *</label>
                    <select
                      className="form-select"
                      value={newActivity.activityTypeId}
                      onChange={e => setNewActivity(a => ({ ...a, activityTypeId: e.target.value }))}
                    >
                      <option value="">Select type...</option>
                      {activityTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={newActivity.activityDate}
                      onChange={e => setNewActivity(a => ({ ...a, activityDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Subject *</label>
                    <Input
                      placeholder="e.g. Follow up call"
                      value={newActivity.subject}
                      onChange={e => setNewActivity(a => ({ ...a, subject: e.target.value }))}
                    />
                  </div>
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="Activity details..."
                      value={newActivity.description}
                      onChange={e => setNewActivity(a => ({ ...a, description: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {errors.submit && <div className="form-error" style={{ marginTop: '1rem', display: 'block' }}>{errors.submit}</div>}

          <div className="modal-footer" style={{ display: 'flex', justifyContent: isEditing && onDeleted ? 'space-between' : 'flex-end', gap: '0.5rem', width: '100%', padding: '1rem 0 0', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            {isEditing && onDeleted && (
              <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting || saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Trash2 size={15} /> Delete Task
              </Button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={saving || deleting}>
                {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
