import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { TaskListGroup, TaskReadDto } from '../components/tasks/TaskListGroup';
import { CalendarGrid } from '../components/tasks/CalendarGrid';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { List, Calendar, Plus, User } from 'lucide-react';
import './screens.css';

interface TaskGrouped { overdue: TaskReadDto[]; dueToday: TaskReadDto[]; upcoming: TaskReadDto[]; }
interface CalendarDay { day: number; taskCount: number; tasks: TaskReadDto[]; }
interface Lookup { id: number; name: string; }
interface TaskStatus extends Lookup { isTerminal: boolean; }
interface User extends Lookup {}

export const TasksScreen: React.FC = () => {
  const { user, isManagerOrAboveSelected } = useAuth();
  const isManager = isManagerOrAboveSelected;

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [grouped, setGrouped] = useState<TaskGrouped>({ overdue: [], dueToday: [], upcoming: [] });
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

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const repId = (isManager && selectedRep !== 'me') ? selectedRep : 'me';
      if (repId === 'me') {
        const res = await api.get<TaskGrouped>('/api/tasks/my');
        setGrouped(res);
      } else {
        const res = await api.get<TaskGrouped>(`/api/tasks/assignee/${repId}`);
        setGrouped(res);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [selectedRep, isManager]);

  const fetchCalendar = useCallback(async () => {
    try {
      const repId = (isManager && selectedRep !== 'me') ? `&assignedToId=${selectedRep}` : '';
      const res = await api.get<CalendarDay[]>(`/api/tasks/calendar?year=${calDate.year}&month=${calDate.month}${repId}`);
      setCalDays(res);
    } catch { /* ignore */ }
  }, [calDate, selectedRep, isManager]);

  useEffect(() => {
    api.get<{ id: number; name: string; isTerminal: boolean }[]>('/api/taskstatuses').then(res =>
      setStatuses(res.map(s => ({ id: s.id, name: s.name, isTerminal: s.isTerminal })))
    ).catch(() => {});

    api.get<any[]>('/api/users').then(res => {
      const usersData = res ?? [];
      setUsers(usersData.map(u => ({ id: u.Id || u.identityId || u.id, name: u.name })));
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
        console.log('Activity types API response:', res);
        const mapped = (res ?? []).map(at => ({ id: at.id ?? at.Id, name: at.name ?? at.Name }));
        console.log('Activity types mapped:', mapped);
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

  return (
    <Layout>
      <div className="tasks-screen">
        <div className="tasks-header">
          <h1 className="tasks-header-title">My Tasks</h1>

          {isManager && users.length > 0 && (
            <div className="rep-selector">
              <User size={14} />
              <select
                className="filter-select"
                value={selectedRep}
                onChange={e => setSelectedRep(e.target.value)}
              >
                <option value="me">My Tasks</option>
                {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
              </select>
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

          <button type="button" className="btn-primary" onClick={() => { setEditTask(null); setPrefillDate(undefined); setShowModal(true); }}>
            <Plus size={14} /> New Task
          </button>
        </div>

        <Card>
          {loading ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tasks…</div>
          ) : view === 'list' ? (
            <TaskListGroup
              overdue={grouped.overdue}
              dueToday={grouped.dueToday}
              upcoming={grouped.upcoming}
              completed={[]}
              onTaskComplete={handleTaskComplete}
              onTaskClick={handleTaskClick}
            />
          ) : (
            <CalendarGrid
              year={calDate.year}
              month={calDate.month}
              days={calDays}
              onNavigate={(y, m) => setCalDate({ year: y, month: m })}
              onTaskClick={handleTaskClick}
              onNewTask={handleNewTask}
            />
          )}
        </Card>
      </div>

      {showModal && (
        <TaskFormModal
          task={editTask}
          prefillDueDate={prefillDate}
          currentUserId={myId ?? 0}
          users={users.length > 0 ? users : (myId ? [{ id: myId, name: user?.name ?? 'Me' }] : [])}
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
