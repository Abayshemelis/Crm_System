import React, { useState } from 'react';
import { CheckSquare, Square, AlertTriangle, Clock, Building2, Briefcase, ChevronDown, ChevronRight, MoreVertical, X, Calendar, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export interface TaskReadDto {
  crmTaskId: number;
  title: string;
  description?: string;
  dueDate?: string;
  crmTaskStatusId: number;
  statusName: string;
  isTerminal: boolean;
  customerId?: number;
  customerName?: string;
  opportunityId?: number;
  opportunityTitle?: string;
  leadId?: number;
  leadName?: string;
  activityId?: number;
  activitySubject?: string;
  activityTypeName?: string;
  assignedToId?: number;
  assignedToName?: string;
  createdByName: string;
  createdAt: string;
}

interface TaskListGroupProps {
  overdue: TaskReadDto[];
  dueToday: TaskReadDto[];
  upcoming: TaskReadDto[];
  completed: TaskReadDto[];
  onTaskComplete: (id: number) => void;
  onTaskClick: (task: TaskReadDto) => void;
}

function formatDue(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function TaskRow({
  task,
  onComplete,
  onClick,
  overdue,
  isCompleted,
}: {
  task: TaskReadDto;
  onComplete: (id: number) => void;
  onClick: (task: TaskReadDto) => void;
  overdue?: boolean;
  isCompleted?: boolean;
}) {
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing || isCompleted) return;

    // Prompt for optional completion note
    const note = window.prompt('Add a note about this completion (optional):');
    if (note === null) return; // User cancelled

    setCompleting(true);
    try {
      await api.patch(`/api/tasks/${task.crmTaskId}/complete`, { completionNote: note || null });
      onComplete(task.crmTaskId);
    } catch {
      setCompleting(false);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);

    const note = window.prompt('Add a note about this cancellation (optional):');
    if (note === null) return; // User cancelled

    try {
      await api.patch(`/api/tasks/${task.crmTaskId}/cancel`, { cancellationNote: note || null });
      onComplete(task.crmTaskId);
    } catch {
      // Error handling
    }
  };

  const handleReschedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onClick(task); // Open edit modal to reschedule
  };

  return (
    <div className={`task-row ${overdue ? 'task-row-overdue' : ''} ${isCompleted ? 'task-row-completed' : ''}`} onClick={() => onClick(task)}>
      {!isCompleted && !overdue && (
        <button
          type="button"
          className="task-complete-btn"
          onClick={handleComplete}
          title="Mark complete"
          disabled={completing}
        >
          {completing
            ? <CheckSquare size={16} className="task-check-done" />
            : <Square size={16} />}
        </button>
      )}
      {isCompleted && (
        <div className="task-complete-btn">
          <CheckSquare size={16} className="task-check-done" />
        </div>
      )}
      {overdue && !isCompleted && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="task-complete-btn"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            title="Actions"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="task-action-menu" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="task-action-item" onClick={handleReschedule}>
                <Calendar size={14} /> Reschedule
              </button>
              <button type="button" className="task-action-item" onClick={handleComplete}>
                <CheckSquare size={14} /> Complete
              </button>
              <button type="button" className="task-action-item task-action-cancel" onClick={handleCancel}>
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>
      )}
      <div className="task-row-body">
        <span className={`task-title ${overdue ? 'task-title-overdue' : ''} ${isCompleted ? 'task-title-completed' : ''}`}>{task.title}</span>
        <div className="task-chips">
          {task.activitySubject && (
            <span className="task-chip task-chip-activity">
              <MessageSquare size={10} /> {task.activityTypeName || 'Activity'}: {task.activitySubject}
            </span>
          )}
          {task.customerName && (
            <span className="task-chip" onClick={e => { e.stopPropagation(); navigate(`/customers/${task.customerId}`); }}>
              <Building2 size={10} /> {task.customerName}
            </span>
          )}
          {task.opportunityTitle && (
            <span className="task-chip" onClick={e => { e.stopPropagation(); navigate(`/opportunities/${task.opportunityId}`); }}>
              <Briefcase size={10} /> {task.opportunityTitle}
            </span>
          )}
        </div>
      </div>
      {task.dueDate && (
        <div className={`task-due ${overdue ? 'task-due-overdue' : ''} ${isCompleted ? 'task-due-completed' : ''}`}>
          <Clock size={11} />
          <span>{formatDue(task.dueDate)}</span>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  tasks,
  overdue,
  isCompleted,
  onComplete,
  onTaskClick,
  defaultOpen = true,
}: {
  label: string;
  tasks: TaskReadDto[];
  overdue?: boolean;
  isCompleted?: boolean;
  onComplete: (id: number) => void;
  onTaskClick: (task: TaskReadDto) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (tasks.length === 0) return null;

  return (
    <div className={`task-section ${overdue ? 'task-section-overdue' : ''} ${isCompleted ? 'task-section-completed' : ''}`}>
      <button type="button" className="task-section-header" onClick={() => setOpen(o => !o)}>
        <span className="task-section-label">
          {label}
          <span className="task-section-count">{tasks.length}</span>
        </span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="task-section-body">
          {tasks.map(t => (
            <TaskRow key={t.crmTaskId} task={t} onComplete={onComplete} onClick={onTaskClick} overdue={overdue} isCompleted={isCompleted} />
          ))}
        </div>
      )}
    </div>
  );
}

export const TaskListGroup: React.FC<TaskListGroupProps> = ({
  overdue, dueToday, upcoming, completed, onTaskComplete, onTaskClick,
}) => {
  if (!overdue.length && !dueToday.length && !upcoming.length && !completed.length) {
    return (
      <div className="timeline-empty">
        <CheckSquare size={32} className="empty-icon" />
        <p>No tasks. Create one with the button above.</p>
      </div>
    );
  }

  return (
    <div className="task-list-group">
      <Section label="Overdue" tasks={overdue} overdue onComplete={onTaskComplete} onTaskClick={onTaskClick} />
      <Section label="Due Today" tasks={dueToday} onComplete={onTaskComplete} onTaskClick={onTaskClick} />
      <Section label="Upcoming" tasks={upcoming} onComplete={onTaskComplete} onTaskClick={onTaskClick} />
      <Section label="Completed" tasks={completed} isCompleted onComplete={onTaskComplete} onTaskClick={onTaskClick} defaultOpen={false} />
    </div>
  );
};
