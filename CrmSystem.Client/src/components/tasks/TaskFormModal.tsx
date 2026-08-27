import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle, CheckCircle2, User, Building, DollarSign } from 'lucide-react';
import { api } from '../../lib/api';
import { TaskReadDto } from './TaskListGroup';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SearchableSelect } from '../ui/SearchableSelect';
import { showToast } from '../../lib/toast';
import { confirmAction } from '../../lib/confirm';
import { validateName, validateMaxLength } from '../../lib/validators';
import './TaskFormModal.css';

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

// Helper to generate ISO local datetime string: YYYY-MM-DDTHH:mm
function formatLocalDateTime(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  task, prefillDueDate, customerId, opportunityId, leadId, currentUserId,
  users, customers = [], opportunities = [], activities = [], activityTypes = [], statuses,
  onSaved, onDeleted, onClose,
}) => {
  const isEditing = !!task;

  // Active status fallback
  const defaultStatus = statuses.find(s => !s.isTerminal)?.id ?? 0;
  const userOptions = users.length > 0 ? users : [{ id: currentUserId, name: 'Me' }];

  // Fallback activity types
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

  // Initial Due Date resolution
  const getInitialDueDate = (): string => {
    if (task?.dueDate) {
      return task.dueDate.slice(0, 16);
    }
    if (prefillDueDate) {
      // If prefill is e.g. "2026-08-25", set to 10:00 AM
      return `${prefillDueDate}T10:00`;
    }
    // Default to next hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return formatLocalDateTime(now);
  };

  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    dueDate: getInitialDueDate(),
    crmTaskStatusId: String(task?.crmTaskStatusId ?? (defaultStatus || '1')),
    assignedToId: String(task?.assignedToId ?? currentUserId),
    customerId: String(task?.customerId ?? customerId ?? ''),
    opportunityId: String(task?.opportunityId ?? opportunityId ?? ''),
    leadId: String(task?.leadId ?? leadId ?? ''),
    activityId: String(task?.activityId ?? ''),
  });

  const [activityMode, setActivityMode] = useState<'none' | 'link' | 'create'>('none');
  const [newActivity, setNewActivity] = useState({
    activityTypeId: effectiveActivityTypes[0]?.id ? String(effectiveActivityTypes[0].id) : '1',
    subject: '',
    description: '',
    activityDate: formatLocalDateTime(new Date()),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync status id when statuses load
  useEffect(() => {
    if (task) return;
    if ((form.crmTaskStatusId === '0' || form.crmTaskStatusId === '') && defaultStatus !== 0) {
      setForm(f => ({ ...f, crmTaskStatusId: String(defaultStatus) }));
    }
  }, [task, defaultStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quick Date Preset Handlers
  const applyDatePreset = (type: 'plus1h' | 'today5pm' | 'tomorrow9am' | 'in2days' | 'nextweek') => {
    const d = new Date();
    if (type === 'plus1h') {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    } else if (type === 'today5pm') {
      d.setHours(17, 0, 0, 0);
    } else if (type === 'tomorrow9am') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (type === 'in2days') {
      d.setDate(d.getDate() + 2);
      d.setHours(10, 0, 0, 0);
    } else if (type === 'nextweek') {
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
    }
    const val = formatLocalDateTime(d);
    setForm(f => ({ ...f, dueDate: val }));
    if (errors.dueDate) {
      setErrors(e => ({ ...e, dueDate: '' }));
    }
  };

  const isDateInPast = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d < new Date();
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    
    const titleErr = validateName(form.title, 'Task title', 2, 150);
    if (titleErr) errs.title = titleErr;

    if (!form.dueDate || !form.dueDate.trim()) {
      errs.dueDate = 'Due date and time are required';
    } else {
      const d = new Date(form.dueDate);
      if (isNaN(d.getTime())) {
        errs.dueDate = 'Invalid date format';
      }
    }

    const descErr = validateMaxLength(form.description, 1000, 'Description');
    if (descErr) errs.description = descErr;

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstError = Object.values(errs)[0];
      showToast(firstError, 'error');
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      let activityId = Number(form.activityId) || null;

      // Handle activity creation if requested
      if (activityMode === 'create') {
        const actTypeId = parseInt(String(newActivity.activityTypeId || '1'), 10);
        const actSubject = newActivity.subject.trim();

        if (!actSubject) {
          setErrors({ subject: 'Activity subject is required' });
          setSaving(false);
          showToast('Activity subject is required', 'error');
          return;
        }

        const activityPayload = {
          activityTypeId: isNaN(actTypeId) || actTypeId <= 0 ? 1 : actTypeId,
          subject: actSubject,
          description: newActivity.description.trim() || null,
          activityDate: newActivity.activityDate
            ? new Date(newActivity.activityDate).toISOString()
            : new Date().toISOString(),
          durationMinutes: 0,
          customerId: Number(form.customerId) || null,
          opportunityId: Number(form.opportunityId) || null,
          leadId: Number(form.leadId) || null,
        };

        const createdActivity = await api.post<any>('/api/activities', activityPayload);
        if (createdActivity && createdActivity.activityId) {
          activityId = createdActivity.activityId;
        }
      }

      // Resolve valid status ID
      let resolvedStatusId = Number(form.crmTaskStatusId);
      if (!resolvedStatusId || isNaN(resolvedStatusId) || resolvedStatusId <= 0) {
        resolvedStatusId = defaultStatus || 1;
      }

      // Build task payload
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        crmTaskStatusId: resolvedStatusId,
        assignedToId: Number(form.assignedToId) || currentUserId || null,
        customerId: form.customerId ? Number(form.customerId) : null,
        opportunityId: form.opportunityId ? Number(form.opportunityId) : null,
        leadId: form.leadId ? Number(form.leadId) : null,
        activityId: activityId,
      };

      let saved: TaskReadDto;
      if (isEditing && task) {
        saved = await api.put<TaskReadDto>(`/api/tasks/${task.crmTaskId}`, payload);
        showToast('Task updated successfully!', 'success');
      } else {
        saved = await api.post<TaskReadDto>('/api/tasks', payload);
        showToast('Task created successfully!', 'success');
      }

      onSaved(saved);
    } catch (err: any) {
      console.error('Task Save error:', err);
      const msg = err?.message || 'Failed to save task. Please try again.';
      setErrors({ submit: msg });
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDeleted) return;
    if (!await confirmAction('Are you sure you want to delete this task?')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/tasks/${task.crmTaskId}`);
      showToast('Task deleted successfully', 'success');
      onDeleted(task.crmTaskId);
    } catch (err: any) {
      const msg = err?.message || 'Failed to delete task.';
      setErrors({ submit: msg });
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const pastDate = isDateInPast(form.dueDate);

  return (
    <div className="modal-overlay task-modal-overlay" onClick={onClose}>
      <div className="modal-content task-form-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header task-modal-header">
          <div className="task-modal-title-wrap">
            <Calendar className="task-header-icon" size={20} />
            <div>
              <h3 className="task-modal-title">{isEditing ? 'Edit Task' : 'Create New Task'}</h3>
              <p className="task-modal-subtitle">
                {isEditing ? 'Update task details, deadline & assignees' : 'Schedule a follow-up, meeting or deal milestone'}
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal" type="button">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="task-form-body">
          {/* Error Banner */}
          {errors.submit && (
            <div className="task-error-banner">
              <AlertCircle size={16} />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Title */}
          <div className="form-field tfm-full">
            <label className="tfm-label">
              <span>Task Title <span className="req-star">*</span></span>
              <span className="char-counter">{form.title.length}/150</span>
            </label>
            <Input
              placeholder="e.g., Send revised quote & schedule review call"
              maxLength={150}
              value={form.title}
              error={errors.title}
              autoFocus={!isEditing}
              onChange={e => {
                setForm(f => ({ ...f, title: e.target.value }));
                if (errors.title) setErrors(err => ({ ...err, title: '' }));
              }}
            />
          </div>

          {/* Due Date & Time Section with Quick Presets */}
          <div className="form-field tfm-full tfm-date-container">
            <label className="tfm-label">
              <span>Due Date &amp; Time <span className="req-star">*</span></span>
              {pastDate && (
                <span className="tfm-past-badge">
                  <AlertCircle size={12} /> Past deadline (will mark overdue)
                </span>
              )}
            </label>

            <div className="tfm-date-input-wrap">
              <input
                type="datetime-local"
                className={`input-field tfm-date-input ${errors.dueDate ? 'input-error' : ''}`}
                value={form.dueDate}
                onChange={e => {
                  setForm(f => ({ ...f, dueDate: e.target.value }));
                  if (errors.dueDate) setErrors(err => ({ ...err, dueDate: '' }));
                }}
              />
            </div>
            {errors.dueDate && <span className="input-error-text">{errors.dueDate}</span>}

            {/* Quick Date Preset Chips */}
            <div className="tfm-presets-row">
              <span className="tfm-presets-label">Quick Set:</span>
              <button type="button" className="tfm-preset-chip" onClick={() => applyDatePreset('plus1h')}>
                +1 Hour
              </button>
              <button type="button" className="tfm-preset-chip" onClick={() => applyDatePreset('today5pm')}>
                Today 5 PM
              </button>
              <button type="button" className="tfm-preset-chip" onClick={() => applyDatePreset('tomorrow9am')}>
                Tomorrow 9 AM
              </button>
              <button type="button" className="tfm-preset-chip" onClick={() => applyDatePreset('in2days')}>
                In 2 Days
              </button>
              <button type="button" className="tfm-preset-chip" onClick={() => applyDatePreset('nextweek')}>
                Next Week
              </button>
            </div>
          </div>

          {/* Assigned To + Status (Responsive Grid) */}
          <div className="tfm-row">
            <div className="form-field">
              <label className="tfm-label">
                <span>Assigned To</span>
              </label>
              <SearchableSelect
                value={form.assignedToId}
                options={userOptions.map(u => ({ value: String(u.id), label: u.name }))}
                onChange={val => setForm(f => ({ ...f, assignedToId: String(val) }))}
              />
            </div>

            {isEditing && statuses.length > 0 && (
              <div className="form-field">
                <label className="tfm-label">
                  <span>Status</span>
                </label>
                <SearchableSelect
                  value={form.crmTaskStatusId}
                  options={statuses.map(s => ({ value: String(s.id), label: s.name }))}
                  onChange={val => setForm(f => ({ ...f, crmTaskStatusId: String(val) }))}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-field tfm-full">
            <label className="tfm-label">
              <span>Task Details &amp; Notes</span>
            </label>
            <textarea
              className="form-textarea tfm-textarea"
              rows={3}
              placeholder="Add instructions, client agenda items or notes for this task…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Link Customer / Opportunity */}
          {(customers.length > 0 || opportunities.length > 0) && (
            <div className="tfm-row">
              {customers.length > 0 && (
                <div className="form-field">
                  <label className="tfm-label">
                    <span>Link Customer</span>
                  </label>
                  <SearchableSelect
                    value={form.customerId}
                    options={[
                      { value: '', label: 'None (Unlinked)' },
                      ...customers.map(c => ({ value: String(c.id), label: c.name }))
                    ]}
                    onChange={val => setForm(f => ({ ...f, customerId: String(val) }))}
                    placeholder="None"
                  />
                </div>
              )}

              {opportunities.length > 0 && (
                <div className="form-field">
                  <label className="tfm-label">
                    <span>Link Deal / Pipeline</span>
                  </label>
                  <SearchableSelect
                    value={form.opportunityId}
                    options={[
                      { value: '', label: 'None (Unlinked)' },
                      ...opportunities.map(o => ({ value: String(o.id), label: o.name }))
                    ]}
                    onChange={val => setForm(f => ({ ...f, opportunityId: String(val) }))}
                    placeholder="None"
                  />
                </div>
              )}
            </div>
          )}

          {/* Activity Log Section */}
          <div className="form-field tfm-full tfm-activity-section">
            <label className="tfm-label">
              <span>Activity Log <span className="tfm-optional-text">(Optional)</span></span>
            </label>

            <div className="tfm-radio-group">
              <label className={`tfm-radio-label ${activityMode === 'none' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="activityMode"
                  value="none"
                  checked={activityMode === 'none'}
                  onChange={() => setActivityMode('none')}
                />
                <span>No activity log</span>
              </label>
              <label className={`tfm-radio-label ${activityMode === 'link' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="activityMode"
                  value="link"
                  checked={activityMode === 'link'}
                  onChange={() => setActivityMode('link')}
                />
                <span>Link existing</span>
              </label>
              <label className={`tfm-radio-label ${activityMode === 'create' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="activityMode"
                  value="create"
                  checked={activityMode === 'create'}
                  onChange={() => setActivityMode('create')}
                />
                <span>Log new activity</span>
              </label>
            </div>

            {activityMode === 'link' && activities.length > 0 && (
              <div className="tfm-activity-input-wrap">
                <SearchableSelect
                  value={form.activityId}
                  options={[
                    { value: '', label: 'Select recent activity...' },
                    ...activities.map(a => ({ value: String(a.id), label: a.name }))
                  ]}
                  onChange={val => setForm(f => ({ ...f, activityId: String(val) }))}
                  placeholder="Select activity..."
                />
              </div>
            )}

            {activityMode === 'link' && activities.length === 0 && (
              <div className="tfm-muted-box">No recent activities available to link</div>
            )}

            {activityMode === 'create' && (
              <div className="tfm-activity-create-box">
                <div className="tfm-row">
                  <div className="form-field">
                    <label className="tfm-label">
                      <span>Activity Type <span className="req-star">*</span></span>
                    </label>
                    <SearchableSelect
                      value={newActivity.activityTypeId}
                      options={effectiveActivityTypes.map((at, idx) => ({
                        value: at.id != null ? String(at.id) : String(idx + 1),
                        label: at.name
                      }))}
                      onChange={val => {
                        setNewActivity(a => ({ ...a, activityTypeId: String(val) }));
                        if (errors.activityTypeId) setErrors(e => ({ ...e, activityTypeId: '' }));
                      }}
                      placeholder="Select type..."
                    />
                  </div>

                  <div className="form-field">
                    <label className="tfm-label">
                      <span>Activity Timestamp</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="input-field tfm-date-input"
                      value={newActivity.activityDate}
                      onChange={e => setNewActivity(a => ({ ...a, activityDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-field tfm-full">
                  <label className="tfm-label">
                    <span>Subject <span className="req-star">*</span></span>
                  </label>
                  <Input
                    placeholder="e.g., Client initial discovery call"
                    value={newActivity.subject}
                    error={errors.subject}
                    onChange={e => {
                      setNewActivity(a => ({ ...a, subject: e.target.value }));
                      if (errors.subject) setErrors(e => ({ ...e, subject: '' }));
                    }}
                  />
                </div>

                <div className="form-field tfm-full">
                  <label className="tfm-label">
                    <span>Activity Notes</span>
                  </label>
                  <textarea
                    className="form-textarea tfm-textarea"
                    rows={2}
                    placeholder="Key discussion points, outcome notes..."
                    value={newActivity.description}
                    onChange={e => setNewActivity(a => ({ ...a, description: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Modal Footer inside Form */}
          <div className="tfm-footer">
            {isEditing && onDeleted && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="tfm-delete-btn"
              >
                {deleting ? 'Deleting…' : 'Delete Task'}
              </Button>
            )}

            <div className="tfm-footer-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={saving || deleting}
              >
                Cancel
              </Button>

              <button
                type="submit"
                className="btn btn-primary tfm-submit-btn"
                disabled={saving || deleting}
              >
                {saving ? (
                  <span className="tfm-loading-text">
                    <span className="tfm-spinner" /> Saving…
                  </span>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Create Task'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
