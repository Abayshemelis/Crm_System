import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  CheckSquare, CheckCircle2, Clock, AlertTriangle,
  Calendar, Users, TrendingUp, AlertCircle
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import './cleanReports.css';

const PALETTE = ['#f97316', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const TaskReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'status' | 'overdue' | 'duetoday' | 'team'>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'status',   label: 'Status' },
    { id: 'overdue',  label: 'Overdue' },
    { id: 'duetoday', label: 'Due Today' },
    { id: 'team',     label: 'Team Performance' },
  ];

  const fetchTaskData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/tasks?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load task reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskData();
  }, [startDate, endDate, scope]);

  const handlePresetChange = (presetId: string, customStart?: string, customEnd?: string) => {
    setActivePreset(presetId);
    if (presetId === 'custom' && customStart && customEnd) {
      setStartDate(customStart);
      setEndDate(customEnd);
    } else {
      const { start, end } = calculateDateRange(presetId);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const kpis: ReportKpiItem[] = [
    {
      label: 'Total Tasks',
      value: data ? fmtNum(data.total) : '0',
      sub: 'All CRM action items',
      icon: <CheckSquare size={18} />,
      color: '#f97316',
    },
    {
      label: 'Completed Tasks',
      value: data ? fmtNum(data.completed) : '0',
      sub: 'Successfully resolved',
      icon: <CheckCircle2 size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Overdue Tasks',
      value: data ? fmtNum(data.overdue) : '0',
      sub: 'DueDate passed & not completed',
      icon: <AlertTriangle size={18} />,
      color: '#ef4444',
    },
    {
      label: 'Tasks Due Today',
      value: data ? fmtNum(data.dueToday) : '0',
      sub: 'Scheduled for current day',
      icon: <Calendar size={18} />,
      color: '#f59e0b',
    },
    {
      label: 'Completion Rate',
      value: data ? `${Number(data.completionRate || 0).toFixed(1)}%` : '0.0%',
      sub: 'Completed / Total tasks × 100',
      icon: <TrendingUp size={18} />,
      color: '#3b82f6',
    },
  ];

  // Standard Task Columns
  const columns: ColumnDef<any>[] = [
    {
      key: 'title',
      header: 'Task Title & Description',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.title}</strong>
          {r.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'related',
      header: 'Related Account / Lead',
      render: (r) => (
        <span style={{ fontSize: '0.8rem' }}>
          {r.customerName ? `Customer: ${r.customerName}` : r.leadName ? `Lead: ${r.leadName}` : r.opportunityTitle ? `Deal: ${r.opportunityTitle}` : '—'}
        </span>
      ),
    },
    {
      key: 'assignedToName',
      header: 'Assignee',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.assignedToName}</span>,
    },
    {
      key: 'statusName',
      header: 'Status',
      align: 'center',
      render: (r) => (
        <span
          className="clean-badge"
          style={{
            background: r.isTerminal ? 'rgba(16,185,129,0.15)' : r.isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.12)',
            color: r.isTerminal ? '#10b981' : r.isOverdue ? '#ef4444' : '#fb923c',
            borderColor: r.isTerminal ? 'rgba(16,185,129,0.3)' : r.isOverdue ? 'rgba(239,68,68,0.3)' : undefined,
          }}
        >
          {r.statusName}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (r) => (
        <span style={{ fontSize: '0.8rem', color: r.isOverdue ? '#ef4444' : r.isDueToday ? '#f59e0b' : undefined, fontWeight: r.isOverdue || r.isDueToday ? 700 : 400 }}>
          {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}
          {r.isOverdue && ' ⚠️'}
          {r.isDueToday && ' 🔔'}
        </span>
      ),
    },
  ];

  // Status Summary Columns
  const statusColumns: ColumnDef<any>[] = [
    { key: 'status', header: 'Task Status', width: '40%' },
    { key: 'count', header: 'Tasks Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.count}</span> },
    {
      key: 'percentage',
      header: 'Share %',
      align: 'center',
      render: (r) => <strong>{data?.total > 0 ? `${Math.round((r.count / data.total) * 100)}%` : '0%'}</strong>
    },
  ];

  // Team Columns
  const teamColumns: ColumnDef<any>[] = [
    { key: 'assignee', header: 'Sales Representative', width: '30%' },
    { key: 'total', header: 'Total Assigned Tasks', align: 'center', render: (r) => <span>{r.total}</span> },
    { key: 'completed', header: 'Completed Tasks', align: 'center', render: (r) => <span className="clean-badge clean-badge-success">{r.completed}</span> },
    { key: 'overdue', header: 'Overdue Backlog', align: 'center', render: (r) => <span className={`clean-badge ${r.overdue > 0 ? 'clean-badge-danger' : 'clean-badge-secondary'}`}>{r.overdue}</span> },
    {
      key: 'slaRate',
      header: 'Task Completion Rate %',
      align: 'center',
      render: (r) => <strong>{r.total > 0 ? `${Math.round((r.completed / r.total) * 100)}%` : '0%'}</strong>
    },
  ];

  // Sub-tab filtered datasets
  const overdueItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((t: any) => t.isOverdue);
  }, [data]);

  const dueTodayItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((t: any) => t.isDueToday);
  }, [data]);

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Tasks', value: fmtNum(data.total), sub: 'Action items' },
      { label: 'Completed', value: fmtNum(data.completed), sub: 'Resolved' },
      { label: 'Overdue', value: fmtNum(data.overdue), sub: 'Action Required' },
      { label: 'Completion Rate', value: `${Number(data.completionRate || 0).toFixed(1)}%`, sub: 'Efficiency' },
    ];
    const insights = [
      `Overall task completion rate is ${Number(data.completionRate || 0).toFixed(1)}% across ${data.total} recorded CRM action items.`,
      `There are currently ${data.overdue} overdue tasks requiring follow-up action.`,
      `${data.dueToday} tasks are scheduled for completion today.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Task Execution & Operational SLA Report',
      'Task status progression, overdue items, assignee breakdown, and resolution rate',
      stats,
      insights,
      'crm_tasks_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'task_report_records');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="tasks"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Task Reports"
          description="Operational action items, resolution rates, assignee accountability, and overdue tracking."
          badge="Tasks & SLAs"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchTaskData}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          loading={loading}
        />

        {/* ── 3. KPI Grid ────────────────────────────────────────────────── */}
        <ReportKpiGrid items={kpis} loading={loading} />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'overview' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Tasks by Assignee"
                subtitle="Action item workload distribution across sales reps"
                badge="Workload"
                badgeColor="#f97316"
                loading={loading}
                empty={!data?.byAssignee || data.byAssignee.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byAssignee || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="assignee" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Tasks`} />} />
                    <Bar dataKey="total" name="Assigned Tasks" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Tasks Status Distribution"
                subtitle="Current state of all task items in period"
                badge="Status Distribution"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byStatus || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={48}
                      paddingAngle={3}
                    >
                      {(data?.byStatus || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Tasks`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Task Operations Ledger"
              subtitle="Complete record of tasks, accounts, assignees, due dates, and completion status"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search task title, account, assignee..."
              emptyMessage="No task records found matching the selected filters."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: STATUS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'status' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Tasks by Status State"
                subtitle="Share of tasks across completion lifecycle stages"
                badge="Status Share"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byStatus || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={48}
                      paddingAngle={3}
                    >
                      {(data?.byStatus || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Tasks`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Task Volume by Status"
                subtitle="Count of tasks per status"
                badge="Volume"
                badgeColor="#f97316"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStatus || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="status" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Tasks`} />} />
                    <Bar dataKey="count" name="Tasks" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Task Status Breakdown"
              subtitle="Summary of task counts and portfolio share % across statuses"
              columns={statusColumns}
              data={data?.byStatus || []}
              loading={loading}
              emptyMessage="No task status data available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: OVERDUE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'overdue' && (
          <>
            <div className="clean-card" style={{ marginBottom: '20px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={18} /> Overdue Tasks Requiring Resolution
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    There are <strong>{data?.overdue ?? 0}</strong> tasks with past due dates that remain unresolved.
                  </p>
                </div>
                <span className="clean-badge clean-badge-danger" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  {data?.overdue ?? 0} Overdue Items
                </span>
              </div>
            </div>

            <ReportDataTable
              title="Overdue Tasks Action Ledger"
              subtitle="Tasks where the scheduled due date has passed without completion"
              columns={columns}
              data={overdueItems}
              loading={loading}
              searchable
              searchPlaceholder="Search overdue tasks..."
              emptyMessage="No overdue tasks found."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: DUE TODAY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'duetoday' && (
          <>
            <div className="clean-card" style={{ marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={18} /> Tasks Scheduled for Today
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    You have <strong>{data?.dueToday ?? 0}</strong> action items scheduled for completion today.
                  </p>
                </div>
                <span className="clean-badge clean-badge-warning" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  {data?.dueToday ?? 0} Due Today
                </span>
              </div>
            </div>

            <ReportDataTable
              title="Tasks Due Today Ledger"
              subtitle="All action items scheduled for today's resolution"
              columns={columns}
              data={dueTodayItems}
              loading={loading}
              searchable
              searchPlaceholder="Search today's tasks..."
              emptyMessage="No tasks scheduled for today."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: TEAM PERFORMANCE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'team' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Task Workload & Resolution by Assignee"
                subtitle="Completed vs overdue tasks per team member"
                badge="Team SLA"
                badgeColor="#f97316"
                loading={loading}
                empty={!data?.byAssignee || data.byAssignee.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byAssignee || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="assignee" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Tasks`} />} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Team Task Execution & SLA Performance"
              subtitle="Breakdown of assigned tasks, completions, overdue backlogs, and resolution rates per sales rep"
              columns={teamColumns}
              data={data?.byAssignee || []}
              loading={loading}
              emptyMessage="No assignee task data available."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default TaskReportsScreen;
