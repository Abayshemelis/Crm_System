import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { TaskListGroup, TaskReadDto } from '../components/tasks/TaskListGroup';
import { CalendarGrid } from '../components/tasks/CalendarGrid';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { List, Calendar, Plus, CheckSquare, Users } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { showToast } from '../lib/toast';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import './screens.css';

interface TaskGrouped { overdue: TaskReadDto[]; dueToday: TaskReadDto[]; upcoming: TaskReadDto[]; completed?: TaskReadDto[]; }
interface CalendarDay { day: number; taskCount: number; tasks: TaskReadDto[]; }
interface Lookup { id: number; name: string; }
interface TaskStatus extends Lookup { isTerminal: boolean; }
interface User extends Lookup {}

export const TasksScreen: React.FC = () => {
  const { user, isManagerOrAboveSelected } = useAuth();
  const isManager = isManagerOrAboveSelected;

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [grouped, setGrouped] = useState<TaskGrouped>({ overdue: [], dueToday: [], upcoming: [] });
  const [completedTasks, setCompletedTasks] = useState<TaskReadDto[]>([]);
  const [calDays, setCalDays] = useState<CalendarDay[]>([]);
  const [calDate, setCalDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<TaskReadDto | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | undefined>(undefined);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Lookup[]>([]);
  const [opportunities, setOpportunities] = useState<Lookup[]>([]);
  const [activities, setActivities] = useState<Lookup[]>([]);
  const [activityTypes, setActivityTypes] = useState<Lookup[]>([]);
  const [selectedRep, setSelectedRep] = useState<string>('me');

  const myId = user?.userId;

  // Ensure current user is always included in the users list
  const effectiveUsers = useMemo(() => {
    const list = [...users];
    if (myId && !list.some(u => Number(u.id) === Number(myId))) {
      list.unshift({ id: myId, name: `${user?.name || 'Me'} (Me)` });
    }
    return list;
  }, [users, myId, user?.name]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let activePromise: Promise<TaskGrouped>;
      let completedPromise: Promise<TaskReadDto[]>;

      if (selectedRep === 'all') {
        activePromise = api.get<TaskGrouped>('/api/tasks/all');
        completedPromise = api.get<TaskReadDto[]>('/api/tasks/all/completed').catch(() => []);
      } else if (selectedRep !== 'me') {
        activePromise = api.get<TaskGrouped>(`/api/tasks/assignee/${selectedRep}`);
        completedPromise = Promise.resolve([] as TaskReadDto[]);
      } else {
        activePromise = api.get<TaskGrouped>('/api/tasks/my');
        completedPromise = api.get<TaskReadDto[]>('/api/tasks/my/completed').catch(() => []);
      }

      const [active, completed] = await Promise.all([activePromise, completedPromise]);
      setGrouped({
        overdue: active?.overdue ?? [],
        dueToday: active?.dueToday ?? [],
        upcoming: active?.upcoming ?? [],
      });
      setCompletedTasks(completed && completed.length > 0 ? completed : (active?.completed ?? []));
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRep]);

  const fetchCalendar = useCallback(async () => {
    try {
      let repParam = '';
      if (selectedRep === 'all') {
        repParam = ''; // fetch all team members on calendar
      } else if (selectedRep !== 'me') {
        repParam = `&assignedToId=${selectedRep}`;
      } else if (myId) {
        repParam = `&assignedToId=${myId}`;
      }
      const res = await api.get<CalendarDay[]>(`/api/tasks/calendar?year=${calDate.year}&month=${calDate.month}${repParam}`);
      setCalDays(res || []);
    } catch { /* ignore */ }
  }, [calDate, selectedRep, myId]);

  useEffect(() => {
    api.get<{ id: number; name: string; isTerminal: boolean }[]>('/api/taskstatuses').then(res =>
      setStatuses(res.map(s => ({ id: s.id, name: s.name, isTerminal: s.isTerminal })))
    ).catch(() => {});

    api.get<any[]>('/api/users').then(res => {
      const usersData = res ?? [];
      const mapped = usersData
        .map(u => ({
          id: u.userId ?? u.UserId ?? u.Id ?? u.identityId ?? u.id,
          name: u.name ?? u.Name ?? `User ${u.userId ?? u.id ?? '?'}`
        }))
        .filter(u => u.id != null && u.id !== 0);
      setUsers(mapped);
    }).catch(() => {});

    api.get<{ data: Array<{ customerId: number; firstName: string; lastName: string }> }>('/api/customers?page=1&pageSize=100')
      .then(res => setCustomers((res.data ?? []).map(c => ({ id: c.customerId, name: `${c.firstName} ${c.lastName}` }))))
      .catch(() => {});

    api.get<any[]>('/api/opportunities')
      .then(res => setOpportunities((res ?? []).map(o => ({ id: o.opportunityId, name: o.title }))))
      .catch(() => {});

    api.get<any[]>('/api/activities')
      .then(res => setActivities((res ?? []).map(a => ({ id: a.activityId, name: a.subject }))))
      .catch(() => {});

    api.get<any[]>('/api/activitytypes')
      .then(res => {
        const mapped = (res ?? []).map(at => ({ id: at.id ?? at.Id, name: at.name ?? at.Name }));
        setActivityTypes(mapped);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (view === 'calendar') fetchCalendar(); }, [view, fetchCalendar]);

  const handleTaskComplete = (id: number) => {
    setGrouped(g => ({
      overdue: g.overdue.filter(t => t.crmTaskId !== id),
      dueToday: g.dueToday.filter(t => t.crmTaskId !== id),
      upcoming: g.upcoming.filter(t => t.crmTaskId !== id),
    }));
  };

  const handleTaskSaved = (_task: TaskReadDto) => {
    setShowModal(false);
    setEditTask(null);
    setPrefillDate(undefined);
    fetchTasks();
    if (view === 'calendar') fetchCalendar();
  };

  const handleTaskDeleted = (id: number) => {
    setGrouped(g => ({
      overdue: g.overdue.filter(t => t.crmTaskId !== id),
      dueToday: g.dueToday.filter(t => t.crmTaskId !== id),
      upcoming: g.upcoming.filter(t => t.crmTaskId !== id),
    }));
    setShowModal(false);
    setEditTask(null);
    if (view === 'calendar') fetchCalendar();
  };

  const handleTaskClick = (task: TaskReadDto) => {
    setPrefillDate(undefined);
    setEditTask(task);
    setShowModal(true);
  };

  const handleNewTask = (isoDate: string) => {
    setEditTask(null);
    setPrefillDate(isoDate);
    setShowModal(true);
  };

  const handleTaskDrop = async (taskId: number, newDateStr: string) => {
    try {
      await api.patch(`/api/tasks/${taskId}/reschedule`, { dueDate: newDateStr });
      showToast('Task rescheduled successfully.', 'success');
      fetchTasks();
      if (view === 'calendar') fetchCalendar();
    } catch (err: any) {
      showToast(err.message || 'Failed to reschedule task', 'error');
    }
  };

  return (
    <Layout>
      <div className="tasks-screen">
        <div className="tasks-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="tasks-header-title">
              {isManager && selectedRep === 'all' ? 'Team Tasks' : isManager && selectedRep !== 'me' ? 'Representative Tasks' : 'My Tasks'}
            </h1>
          </div>

          {isManager && (
            <div className="rep-selector" style={{ minWidth: '220px' }}>
              <SearchableSelect
                value={selectedRep}
                options={[
                  { value: 'me', label: 'My Tasks (Assigned to Me)' },
                  { value: 'all', label: 'All Tasks (Entire Team)' },
                  ...users.map(u => ({ value: String(u.id), label: `${u.name}'s Tasks` }))
                ]}
                onChange={val => setSelectedRep(String(val))}
              />
            </div>
          )}

          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              <List size={14} /> List
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${view === 'calendar' ? 'active' : ''}`}
              onClick={() => setView('calendar')}
            >
              <Calendar size={14} /> Calendar
            </button>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => { setEditTask(null); setPrefillDate(undefined); setShowModal(true); }}
          >
            <Plus size={15} /> New Task
          </button>
        </div>

        <Card>
          {loading ? (
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rect" height={52} style={{ borderRadius: '8px', animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
          ) : view === 'list' ? (
            <TaskListGroup
              overdue={grouped.overdue}
              dueToday={grouped.dueToday}
              upcoming={grouped.upcoming}
              completed={completedTasks}
              onTaskComplete={handleTaskComplete}
              onTaskClick={handleTaskClick}
              onTaskDelete={handleTaskDeleted}
            />
          ) : (
            <CalendarGrid
              year={calDate.year}
              month={calDate.month}
              days={calDays}
              onNavigate={(y, m) => setCalDate({ year: y, month: m })}
              onTaskClick={handleTaskClick}
              onNewTask={handleNewTask}
              onTaskDrop={handleTaskDrop}
            />
          )}
        </Card>
      </div>

      {showModal && (
        <TaskFormModal
          task={editTask}
          prefillDueDate={prefillDate}
          currentUserId={myId ?? 0}
          users={effectiveUsers}
          customers={customers}
          opportunities={opportunities}
          activities={activities}
          activityTypes={activityTypes}
          statuses={statuses}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
          onClose={() => { setShowModal(false); setEditTask(null); setPrefillDate(undefined); }}
        />
      )}
    </Layout>
  );
};
