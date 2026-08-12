import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { TaskReadDto } from './TaskListGroup';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchableSelect } from '../ui/SearchableSelect';

interface Lookup { id: number; name: string; }

interface TaskFormModalProps {
  task?: TaskReadDto | null;
  prefillDueDate?: string;
  customerId?: number;
  opportunityId?: number;
  leadId?: number;
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
  task, prefillDueDate, customerId, opportunityId, leadId, currentUserId,
  users, customers = [], opportunities = [], activities = [], activityTypes = [], statuses,
  onSaved, onDeleted, onClose,
}) => {
  const isEditing = !!task;
  const defaultStatus = statuses.find(s => !s.isTerminal)?.id ?? 0;
  const userOptions = users.length > 0 ? users : [{ id: currentUserId, name: 'Me' }];

  // Fallback activity types if not provided or invalid
  const fallbackActivityTypes = [
    { id: 1, name: 'Call' },
    { id: 2, name: 'Email' },
    { id: 3, name: 'Meeting' },
    { id: 4, name: 'Note' },
    { id: 5, name: 'Demo' },
    { id: 6, name: 'Follow-Up' }
  ];
  const validActivityTypes = activityTypes.filter(at => at && at.id != null && !isNaN(Number(at.id)) && Number(at.id) > 0);
  const effectiveActivityTypes = validActivityTypes.length > 0 ? validActivityTypes : fallbackActivityTypes;

  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 16) : (prefillDueDate ? `${prefillDueDate}T09:00` : ''),
    crmTaskStatusId: String(task?.crmTaskStatusId ?? defaultStatus),
    assignedToId: String(task?.assignedToId ?? currentUserId),
    customerId: String(task?.customerId ?? customerId ?? ''),
    opportunityId: String(task?.opportunityId ?? opportunityId ?? ''),
    leadId: String(task?.leadId ?? leadId ?? ''),
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
    e.stopPropagation();
    if (isEditing && pastDateWarning) {
      if (!window.confirm('Set due date to a past date? The task will appear as Overdue.')) return;
    }
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      let activityId = Number(form.activityId) || null;

      // If creating a new activity, create it first
      if (activityMode === 'create') {
        const activityTypeIdValue = String(newActivity.activityTypeId ?? '').trim();
        const subjectTrimmed = (newActivity.subject ?? '').trim();
        const activityTypeIdNum = parseInt(activityTypeIdValue, 10);

        console.log('DEBUG: Creating activity', { activityTypeIdValue, activityTypeIdNum, subjectTrimmed, effectiveActivityTypes });

        if (!activityTypeIdValue || isNaN(activityTypeIdNum) || activityTypeIdNum < 0 || !subjectTrimmed) {
          const errs: Record<string, string> = {};
          if (!activityTypeIdValue || isNaN(activityTypeIdNum) || activityTypeIdNum < 0) {
            errs.activityTypeId = 'Activity type is required';
          }
          if (!subjectTrimmed) {
            errs.subject = 'Subject is required';
          }
          setErrors(errs);
          setSaving(false);
          return;
        }
        const activityPayload = {
          activityTypeId: activityTypeIdNum,
          subject: subjectTrimmed,
          description: newActivity.description.trim() || null,
          activityDate: newActivity.activityDate ? new Date(newActivity.activityDate).toISOString() : new Date().toISOString(),
          durationMinutes: 0,
          customerId: Number(form.customerId) || null,
          opportunityId: Number(form.opportunityId) || null,
          leadId: Number(form.leadId) || null,
        };
        console.log('DEBUG: Activity payload', activityPayload);
        const createdActivity = await api.post<any>('/api/activities', activityPayload);
        console.log('DEBUG: Activity created', createdActivity);
        activityId = createdActivity.activityId;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        crmTaskStatusId: Number(form.crmTaskStatusId),
        assignedToId: Number(form.assignedToId) || null,
        customerId: form.customerId ? Number(form.customerId) : null,
        opportunityId: form.opportunityId ? Number(form.opportunityId) : null,
        leadId: form.leadId ? Number(form.leadId) : null,
        activityId: activityId,
      };
      let saved: TaskReadDto;
      if (isEditing) {
        saved = await api.put<TaskReadDto>(`/api/tasks/${task!.crmTaskId}`, payload);
      } else {
        saved = await api.post<TaskReadDto>('/api/tasks', payload);
      }
      onSaved(saved);
    } catch (err: any) {
      console.error('Save error:', err);
      setErrors({ submit: err?.response?.data?.message || err?.message || 'Save failed. Please try again.' });
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
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
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
              <SearchableSelect
                value={form.assignedToId}
                options={userOptions.map((u, index) => ({
                  value: String(u.id),
                  label: u.name
                }))}
                onChange={val => setForm(f => ({ ...f, assignedToId: String(val) }))}
              />
            </div>

            {isEditing && statuses.length > 0 && (
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Status</label>
                <SearchableSelect
                  value={form.crmTaskStatusId}
                  options={statuses.map((s, index) => ({
                    value: String(s.id),
                    label: s.name
                  }))}
                  onChange={val => setForm(f => ({ ...f, crmTaskStatusId: String(val) }))}
                />
              </div>
            )}

            {(customers.length > 0 || opportunities.length > 0) && (
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: '0.5rem' }}>
                {customers.length > 0 && (
                  <div className="form-field">
                    <label>Link Customer</label>
                    <SearchableSelect
                      value={form.customerId}
                      options={[
                        { value: '', label: 'None' },
                        ...customers.map((c, index) => ({
                          value: String(c.id),
                          label: c.name
                        }))
                      ]}
                      onChange={val => setForm(f => ({ ...f, customerId: String(val) }))}
                      placeholder="None"
                    />
                  </div>
                )}
                {opportunities.length > 0 && (
                  <div className="form-field">
                    <label>Link Opportunity</label>
                    <SearchableSelect
                      value={form.opportunityId}
                      options={[
                        { value: '', label: 'None' },
                        ...opportunities.map((o, index) => ({
                          value: String(o.id),
                          label: o.name
                        }))
                      ]}
                      onChange={val => setForm(f => ({ ...f, opportunityId: String(val) }))}
                      placeholder="None"
                    />
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
                <SearchableSelect
                  value={form.activityId}
                  options={[
                    { value: '', label: 'Select an activity...' },
                    ...activities.map((a, index) => ({
                      value: String(a.id),
                      label: a.name
                    }))
                  ]}
                  onChange={val => setForm(f => ({ ...f, activityId: String(val) }))}
                  placeholder="Select an activity..."
                />
              )}

              {activityMode === 'link' && activities.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent activities available</div>
              )}

              {activityMode === 'create' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  <div className="form-field">
                    <label>Activity Type *</label>
                    <SearchableSelect
                      value={newActivity.activityTypeId}
                      options={[
                        { value: '', label: 'Select type...' },
                        ...effectiveActivityTypes.map((at, index) => ({
                          value: at.id != null && at.id !== undefined ? String(at.id) : String(index),
                          label: at.name
                        }))
                      ]}
                      onChange={val => {
                        setNewActivity(a => ({ ...a, activityTypeId: String(val) }));
                        if (errors.activityTypeId) setErrors(e => ({ ...e, activityTypeId: '' }));
                      }}
                      placeholder="Select type..."
                    />
                    {errors.activityTypeId && <span className="form-error">{errors.activityTypeId}</span>}
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
                      onChange={e => {
                        setNewActivity(a => ({ ...a, subject: e.target.value }));
                        if (errors.subject) setErrors(e => ({ ...e, subject: '' }));
                      }}
                    />
                    {errors.subject && <span className="form-error">{errors.subject}</span>}
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

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%', padding: '1rem 0 0', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <button 
                type="submit" 
                className="btn btn-primary btn-md"
                disabled={saving || deleting}
                onClick={(e) => {
                  console.log('Submit button clicked directly');
                  e.preventDefault();
                  handleSubmit(e as any);
                }}
              >
                {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
