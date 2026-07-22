import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { TaskReadDto } from './TaskListGroup';

interface CalendarDayDto {
  day: number;
  taskCount: number;
  tasks: TaskReadDto[];
}

type CalViewMode = 'month' | 'week' | 'day';

interface CalendarGridProps {
  year: number;
  month: number; // 1-indexed
  days: CalendarDayDto[];
  onNavigate: (year: number, month: number) => void;
  onTaskClick: (task: TaskReadDto) => void;
  onNewTask?: (date: string) => void; // ISO date string for pre-filled due date
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const toISO = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year, month, days, onNavigate, onTaskClick, onNewTask
}) => {
  const [viewMode, setViewMode] = useState<CalViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [popover, setPopover] = useState<{ day: number; tasks: TaskReadDto[] } | null>(null);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === d;

  const dayMap = useMemo(() => new Map(days.map(d => [d.day, d])), [days]);

  // Derive week start based on selectedDay or today
  const focusedDay = selectedDay ?? (today.getMonth() + 1 === month && today.getFullYear() === year ? today.getDate() : 1);

  // Week containing focusedDay
  const weekDays = useMemo(() => {
    const date = new Date(year, month - 1, focusedDay);
    const dow = date.getDay(); // 0=Sun
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(year, month - 1, focusedDay - dow + i);
      return {
        date: d,
        dayNum: d.getDate(),
        inMonth: d.getMonth() + 1 === month && d.getFullYear() === year,
        isToday: d.toDateString() === today.toDateString(),
      };
    });
  }, [year, month, focusedDay]);

  // Navigation
  const navPrev = () => {
    if (viewMode === 'month') {
      const d = new Date(year, month - 2, 1);
      onNavigate(d.getFullYear(), d.getMonth() + 1);
    } else if (viewMode === 'week') {
      const d = new Date(year, month - 1, focusedDay - 7);
      setSelectedDay(d.getDate());
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) {
        onNavigate(d.getFullYear(), d.getMonth() + 1);
      }
    } else {
      const d = new Date(year, month - 1, focusedDay - 1);
      setSelectedDay(d.getDate());
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) {
        onNavigate(d.getFullYear(), d.getMonth() + 1);
      }
    }
  };

  const navNext = () => {
    if (viewMode === 'month') {
      const d = new Date(year, month, 1);
      onNavigate(d.getFullYear(), d.getMonth() + 1);
    } else if (viewMode === 'week') {
      const d = new Date(year, month - 1, focusedDay + 7);
      setSelectedDay(d.getDate());
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) {
        onNavigate(d.getFullYear(), d.getMonth() + 1);
      }
    } else {
      const d = new Date(year, month - 1, focusedDay + 1);
      setSelectedDay(d.getDate());
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) {
        onNavigate(d.getFullYear(), d.getMonth() + 1);
      }
    }
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedDay(now.getDate());
    onNavigate(now.getFullYear(), now.getMonth() + 1);
  };

  // Title for the header
  const headerTitle = useMemo(() => {
    if (viewMode === 'month') return `${MONTHS[month - 1]} ${year}`;
    if (viewMode === 'week') {
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      if (start.getMonth() === end.getMonth()) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    }
    // day view
    const d = new Date(year, month - 1, focusedDay);
    return `${WEEKDAYS_FULL[d.getDay()]}, ${MONTHS[month - 1]} ${focusedDay}, ${year}`;
  }, [viewMode, year, month, weekDays, focusedDay]);

  // Close popover on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopover(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Month View ──────────────────────────────────────────────────────────────
  const renderMonth = () => {
    const firstDow = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
      <div className="cal-grid">
        {WEEKDAYS.map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="cal-cell cal-cell-empty" />;
          const data = dayMap.get(day);
          const count = data?.taskCount ?? 0;
          const tasks = data?.tasks ?? [];
          return (
            <div
              key={day}
              className={`cal-cell${isToday(day) ? ' cal-cell-today' : ''}${selectedDay === day ? ' cal-cell-selected' : ''}${count > 0 ? ' cal-cell-has-tasks' : ''}`}
              onClick={() => {
                setSelectedDay(day);
                if (count > 0) setPopover({ day, tasks });
              }}
            >
              <span className="cal-day-num">{day}</span>
              {count > 0 && (
                <div className="cal-task-pills">
                  {tasks.slice(0, 3).map(t => (
                    <div
                      key={t.crmTaskId}
                      className="cal-task-pill"
                      title={t.title}
                      onClick={e => { e.stopPropagation(); onTaskClick(t); }}
                    >
                      {t.title}
                    </div>
                  ))}
                  {tasks.length > 3 && (
                    <div className="cal-task-more">+{tasks.length - 3} more</div>
                  )}
                </div>
              )}
              {onNewTask && (
                <button
                  type="button"
                  className="cal-add-btn"
                  onClick={e => { e.stopPropagation(); onNewTask(toISO(year, month, day)); }}
                  title="Add task"
                >
                  <Plus size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Week View ──────────────────────────────────────────────────────────────
  const renderWeek = () => (
    <div className="cal-week-grid">
      {weekDays.map(({ date, dayNum, inMonth, isToday: isT }) => {
        const data = inMonth ? dayMap.get(dayNum) : null;
        const tasks = data?.tasks ?? [];
        const isSel = inMonth && selectedDay === dayNum;
        return (
          <div
            key={dayNum + date.getMonth()}
            className={`cal-week-col${isT ? ' cal-cell-today' : ''}${isSel ? ' cal-cell-selected' : ''}`}
            onClick={() => inMonth && setSelectedDay(dayNum)}
          >
            <div className="cal-week-col-header">
              <span className="cal-week-dow">{WEEKDAYS[date.getDay()]}</span>
              <span className={`cal-week-day-num${isT ? ' today-num' : ''}${!inMonth ? ' out-month' : ''}`}>
                {dayNum}
              </span>
            </div>
            <div className="cal-week-col-body">
              {tasks.length === 0 && (
                <span className="cal-week-empty">No tasks</span>
              )}
              {tasks.map(t => (
                <div
                  key={t.crmTaskId}
                  className="cal-week-task-row"
                  onClick={e => { e.stopPropagation(); onTaskClick(t); }}
                  title={t.title}
                >
                  <span className="cal-week-task-title">{t.title}</span>
                  {t.assignedToName && (
                    <span className="cal-week-task-meta">{t.assignedToName}</span>
                  )}
                </div>
              ))}
              {onNewTask && inMonth && (
                <button
                  type="button"
                  className="cal-week-add-btn"
                  onClick={e => { e.stopPropagation(); onNewTask(toISO(date.getFullYear(), date.getMonth() + 1, dayNum)); }}
                >
                  <Plus size={11} /> Add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Day View ───────────────────────────────────────────────────────────────
  const renderDay = () => {
    const data = dayMap.get(focusedDay);
    const tasks = data?.tasks ?? [];
    return (
      <div className="cal-day-view">
        <div className="cal-day-banner">
          <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''} on this day</span>
          {onNewTask && (
            <button
              type="button"
              className="cal-day-add-btn"
              onClick={() => onNewTask(toISO(year, month, focusedDay))}
            >
              <Plus size={13} /> Add Task
            </button>
          )}
        </div>
        {tasks.length === 0 ? (
          <div className="cal-day-empty">
            <p>No tasks scheduled for this day.</p>
            {onNewTask && (
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: '1rem' }}
                onClick={() => onNewTask(toISO(year, month, focusedDay))}
              >
                <Plus size={14} /> Create a Task
              </button>
            )}
          </div>
        ) : (
          <div className="cal-day-task-list">
            {tasks.map(t => (
              <div
                key={t.crmTaskId}
                className="cal-day-task-card"
                onClick={() => onTaskClick(t)}
              >
                <div className="cal-day-task-main">
                  <span className="cal-day-task-title">{t.title}</span>
                  {t.statusName && (
                    <span className={`cal-day-task-status${t.isTerminal ? ' terminal' : ''}`}>
                      {t.statusName}
                    </span>
                  )}
                </div>
                <div className="cal-day-task-meta">
                  {t.customerName && <span>👤 {t.customerName}</span>}
                  {t.opportunityTitle && <span>💼 {t.opportunityTitle}</span>}
                  {t.assignedToName && <span>🧑 {t.assignedToName}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cal-container">
      {/* ── Header ── */}
      <div className="cal-header">
        <div className="cal-nav">
          <button type="button" className="cal-nav-btn" onClick={navPrev} aria-label="Previous">
            <ChevronLeft size={16} />
          </button>
          <span className="cal-title">{headerTitle}</span>
          <button type="button" className="cal-nav-btn" onClick={navNext} aria-label="Next">
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button type="button" className="cal-today-btn" onClick={goToToday}>
            Today
          </button>
          <div className="view-toggle">
            {(['month', 'week', 'day'] as CalViewMode[]).map(m => (
              <button
                key={m}
                type="button"
                className={`view-toggle-btn${viewMode === m ? ' active' : ''}`}
                onClick={() => setViewMode(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="cal-body">
        {viewMode === 'month' && renderMonth()}
        {viewMode === 'week' && renderWeek()}
        {viewMode === 'day' && renderDay()}
      </div>

      {/* ── Month-view popover (when clicking a day number, not a pill) ── */}
      {popover && viewMode === 'month' && (
        <div className="calendar-popover-overlay" onClick={() => setPopover(null)}>
          <div className="calendar-popover" onClick={e => e.stopPropagation()}>
            <div className="calendar-popover-header">
              <span>{MONTHS[month - 1]} {popover.day}</span>
              <button type="button" className="icon-btn" onClick={() => setPopover(null)}>
                <X size={14} />
              </button>
            </div>
            <div className="calendar-popover-body">
              {popover.tasks.map(t => (
                <div
                  key={t.crmTaskId}
                  className="calendar-task-row"
                  onClick={() => { onTaskClick(t); setPopover(null); }}
                >
                  <span className="calendar-task-title">{t.title}</span>
                  {t.customerName && <span className="calendar-task-meta">{t.customerName}</span>}
                </div>
              ))}
            </div>
            {onNewTask && (
              <button
                type="button"
                className="cal-day-add-btn"
                style={{ width: '100%', marginTop: 'var(--space-3)', justifyContent: 'center' }}
                onClick={() => { onNewTask(toISO(year, month, popover.day)); setPopover(null); }}
              >
                <Plus size={13} /> Add Task on this day
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
