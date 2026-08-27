import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Activity, Phone, Mail, Calendar, MessageSquare,
  Clock, CheckCircle2, TrendingUp, Users
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import './cleanReports.css';

const PALETTE = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4'];
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const ActivityReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'types' | 'trends' | 'team'>('overview');
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
    { id: 'types',    label: 'Types' },
    { id: 'trends',   label: 'Trends' },
    { id: 'team',     label: 'Team Activity' },
  ];

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/activities?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load activity reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
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
      label: 'Total Activities',
      value: data ? fmtNum(data.totalActivities) : '0',
      sub: 'All logged touchpoints',
      icon: <Activity size={18} />,
      color: '#f59e0b',
    },
    {
      label: 'Completed Touchpoints',
      value: data ? fmtNum(data.completedActivities) : '0',
      sub: 'Executed client contacts',
      icon: <CheckCircle2 size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Upcoming Scheduled',
      value: data ? fmtNum(data.upcomingActivities) : '0',
      sub: 'Future calendar engagements',
      icon: <Calendar size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'Active Activity Types',
      value: data ? fmtNum(data.byType?.length || 0) : '0',
      sub: 'Calls, emails, meetings, notes',
      icon: <MessageSquare size={18} />,
      color: '#8b5cf6',
    },
    {
      label: 'Contributing Team Members',
      value: data ? fmtNum(data.byUser?.length || 0) : '0',
      sub: 'Sales reps logging client actions',
      icon: <Users size={18} />,
      color: '#06b6d4',
    },
  ];

  // Table Columns
  const columns: ColumnDef<any>[] = [
    {
      key: 'subject',
      header: 'Subject & Description',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.subject}</strong>
          {r.description && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      align: 'center',
      render: (r) => (
        <span className="clean-badge clean-badge-primary">
          {r.type}
        </span>
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
      key: 'createdByName',
      header: 'Logged By',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.createdByName}</span>,
    },
    {
      key: 'durationMinutes',
      header: 'Duration',
      align: 'center',
      render: (r) => <span>{r.durationMinutes ? `${r.durationMinutes} min` : '—'}</span>,
    },
    {
      key: 'activityDate',
      header: 'Activity Date',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.activityDate ? new Date(r.activityDate).toLocaleDateString() : '—'}</span>,
    },
  ];

  // Type Breakdown Columns
  const typeColumns: ColumnDef<any>[] = [
    { key: 'type', header: 'Activity Type', width: '30%' },
    { key: 'count', header: 'Touchpoints Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.count}</span> },
    { key: 'percentage', header: 'Share %', align: 'center', render: (r) => <strong>{r.percentage}%</strong> },
    { key: 'duration', header: 'Total Minutes', align: 'center', render: (r) => <span>{r.duration || 0} min</span> },
    {
      key: 'avgDuration',
      header: 'Avg Duration',
      align: 'center',
      render: (r) => <span>{r.count > 0 ? `${Math.round((r.duration || 0) / r.count)} min` : '—'}</span>
    },
  ];

  // User Breakdown Columns
  const userColumns: ColumnDef<any>[] = [
    { key: 'userName', header: 'Team Member', width: '35%' },
    { key: 'count', header: 'Activities Completed', align: 'center', render: (r) => <span className="clean-badge clean-badge-success">{r.count}</span> },
    { key: 'totalMinutes', header: 'Total Engagement Time', align: 'center', render: (r) => <span>{r.totalMinutes || 0} min</span> },
    {
      key: 'avgMinutes',
      header: 'Avg Engagement Time',
      align: 'center',
      render: (r) => <span>{r.count > 0 ? `${Math.round((r.totalMinutes || 0) / r.count)} min / touchpoint` : '—'}</span>
    },
  ];

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Activities', value: fmtNum(data.totalActivities), sub: 'Logged touchpoints' },
      { label: 'Completed', value: fmtNum(data.completedActivities), sub: 'Client contacts' },
      { label: 'Upcoming', value: fmtNum(data.upcomingActivities), sub: 'Scheduled' },
      { label: 'Activity Types', value: fmtNum(data.byType?.length || 0), sub: 'Channels' },
    ];
    const insights = [
      `Recorded ${data.totalActivities} customer touchpoints, with ${data.completedActivities} completed and ${data.upcomingActivities} upcoming.`,
      `Most frequent activity type is ${data.byType?.[0]?.type ?? 'general touchpoints'} accounting for ${data.byType?.[0]?.percentage ?? 0}% of all engagements.`,
      `${data.byUser?.length ?? 0} team members logged client communications in the selected period.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Sales Activity & Engagement Report',
      'Communication touchpoints, activity channels, rep engagement volume, and timeline trends',
      stats,
      insights,
      'crm_activities_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'activity_report_records');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="activities"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Activity Reports"
          description="Customer interactions, calls, emails, meetings, touchpoint velocity, and rep activity SLAs."
          badge="Touchpoints"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchActivityData}
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
                title="Activities by Type"
                subtitle="Volume distribution of touchpoints by engagement channel"
                badge="Type Breakdown"
                badgeColor="#f59e0b"
                loading={loading}
                empty={!data?.byType || data.byType.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byType || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="type" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Touchpoints`} />} />
                    <Bar dataKey="count" name="Touchpoints" radius={[6, 6, 0, 0]}>
                      {(data?.byType || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Completed vs Scheduled Touchpoints"
                subtitle="Completion status of logged customer communications"
                badge="Status"
                badgeColor="#10b981"
                loading={loading}
                empty={!data}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed Touchpoints', count: data?.completedActivities ?? 0 },
                        { name: 'Upcoming Scheduled', count: data?.upcomingActivities ?? 0 }
                      ]}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#3b82f6" />
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Activities`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Activity Operations Ledger"
              subtitle="Detailed record of all customer meetings, calls, emails, notes, and touchpoints"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search activity subject, account, rep..."
              emptyMessage="No activity records found matching the selected filters."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: TYPES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'types' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Activity Types Share"
                subtitle="Engagement channel share of total communications"
                badge="Channel Share"
                badgeColor="#f59e0b"
                loading={loading}
                empty={!data?.byType || data.byType.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byType || []}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data?.byType || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Touchpoints`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Total Engagement Minutes by Type"
                subtitle="Time investment per activity channel"
                badge="Time Invested"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byType || data.byType.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byType || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="type" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Minutes`} />} />
                    <Bar dataKey="duration" name="Duration (min)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Activity Types Breakdown"
              subtitle="Summary of touchpoint volume, share %, total duration, and average engagement time per channel"
              columns={typeColumns}
              data={data?.byType || []}
              loading={loading}
              emptyMessage="No activity types data available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: TRENDS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'trends' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Daily Activity Timeline Velocity"
                subtitle="Timeline of touchpoints logged across the selected date range"
                badge="Velocity"
                badgeColor="#f59e0b"
                loading={loading}
                empty={!data?.trend || data.trend.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="actTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="date" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Touchpoints`} />} />
                    <Area type="monotone" dataKey="count" name="Touchpoints" stroke="#f59e0b" fillOpacity={1} fill="url(#actTrendGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Chronological Activities Ledger"
              subtitle="All client touchpoints sorted chronologically by activity date"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search activities..."
              emptyMessage="No activity records found."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: TEAM ACTIVITY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'team' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Activity Volume by Team Member"
                subtitle="Touchpoints logged per sales representative"
                badge="Rep Activity"
                badgeColor="#f59e0b"
                loading={loading}
                empty={!data?.byUser || data.byUser.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byUser || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="userName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Touchpoints`} />} />
                    <Bar dataKey="count" name="Touchpoints" radius={[6, 6, 0, 0]}>
                      {(data?.byUser || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Engagement Minutes by Team Member"
                subtitle="Total communication time spent per representative"
                badge="Time Invested"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byUser || data.byUser.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byUser || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="userName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Minutes`} />} />
                    <Bar dataKey="totalMinutes" name="Total Minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Team Member Engagement Leaderboard"
              subtitle="Productivity ranking of sales reps based on client touchpoint volume and engagement duration"
              columns={userColumns}
              data={data?.byUser || []}
              loading={loading}
              emptyMessage="No team activity records available."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default ActivityReportsScreen;
