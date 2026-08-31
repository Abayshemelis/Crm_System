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
  Trophy, DollarSign, Target, Award,
  Users, Activity, CheckSquare, TrendingUp
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import { formatCurrencyGlobal } from '../../context/SystemProfileContext';
import './cleanReports.css';

const PALETTE = ['#eab308', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
const fmt$ = (v: number) => formatCurrencyGlobal(v, undefined, 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const TeamPerformanceReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'sales' | 'leads' | 'opportunities' | 'revenue' | 'activities'>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview',      label: 'Overview' },
    { id: 'sales',         label: 'Sales' },
    { id: 'leads',         label: 'Leads' },
    { id: 'opportunities', label: 'Opportunities' },
    { id: 'revenue',       label: 'Revenue' },
    { id: 'activities',    label: 'Activities' },
  ];

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/team?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load team performance reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
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
      label: 'Active Sales Reps',
      value: data ? fmtNum(data.totalReps) : '0',
      sub: 'Evaluating team performance',
      icon: <Users size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'Total Team Revenue',
      value: data ? fmt$(data.totalTeamRevenue) : '$0',
      sub: 'Closed-won deals value',
      icon: <DollarSign size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Total Deals Won',
      value: data ? fmtNum(data.totalDealsWon) : '0',
      sub: 'Successfully closed opportunities',
      icon: <Award size={18} />,
      color: '#eab308',
      deltaUp: true,
    },
    {
      label: 'Overall Win Rate',
      value: data ? `${Number(data.overallWinRate || 0).toFixed(1)}%` : '0.0%',
      sub: 'Team closure efficiency',
      icon: <Target size={18} />,
      color: '#8b5cf6',
    },
  ];

  // Master Leaderboard Columns
  const columns: ColumnDef<any>[] = [
    {
      key: 'repName',
      header: 'Sales Representative',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.repName}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{r.email}</div>
        </div>
      ),
    },
    {
      key: 'revenueWon',
      header: 'Revenue Won',
      align: 'right',
      render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.revenueWon)}</strong>,
    },
    {
      key: 'dealsWon',
      header: 'Deals Won / Total',
      align: 'center',
      render: (r) => (
        <span className="clean-badge clean-badge-success">
          {r.dealsWon} / {r.oppsHandled} Deals
        </span>
      ),
    },
    {
      key: 'winRate',
      header: 'Win Rate %',
      align: 'center',
      render: (r) => <strong>{Number(r.winRate || 0).toFixed(1)}%</strong>,
    },
    {
      key: 'leadsHandled',
      header: 'Leads (Conv %)',
      align: 'center',
      render: (r) => (
        <span>
          {r.leadsConverted}/{r.leadsHandled} ({Number(r.leadConversionRate || 0).toFixed(0)}%)
        </span>
      ),
    },
    {
      key: 'openPipelineValue',
      header: 'Open Pipeline',
      align: 'right',
      render: (r) => <span style={{ color: '#38bdf8' }}>{fmt$(r.openPipelineValue)}</span>,
    },
    {
      key: 'activitiesCompleted',
      header: 'Touchpoints',
      align: 'center',
      render: (r) => <span>{r.activitiesCompleted}</span>,
    },
  ];

  // Sales Closing Columns
  const salesColumns: ColumnDef<any>[] = [
    { key: 'repName', header: 'Representative', width: '25%' },
    { key: 'dealsWon', header: 'Won Deals', align: 'center', render: (r) => <span className="clean-badge clean-badge-success">{r.dealsWon}</span> },
    { key: 'dealsLost', header: 'Lost Deals', align: 'center', render: (r) => <span className="clean-badge clean-badge-danger">{r.dealsLost}</span> },
    { key: 'winRate', header: 'Closing Win Rate %', align: 'center', render: (r) => <strong>{Number(r.winRate || 0).toFixed(1)}%</strong> },
    { key: 'revenueWon', header: 'Total Realized Revenue', align: 'right', render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.revenueWon)}</strong> },
    {
      key: 'avgDeal',
      header: 'Avg Won Deal Size',
      align: 'right',
      render: (r) => <span>{r.dealsWon > 0 ? fmt$(r.revenueWon / r.dealsWon) : '$0'}</span>
    },
  ];

  // Lead Conversion Columns
  const leadColumns: ColumnDef<any>[] = [
    { key: 'repName', header: 'Representative', width: '30%' },
    { key: 'leadsHandled', header: 'Leads Assigned', align: 'center', render: (r) => <span>{r.leadsHandled}</span> },
    { key: 'leadsConverted', header: 'Leads Converted', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.leadsConverted}</span> },
    { key: 'leadConversionRate', header: 'Conversion Rate %', align: 'center', render: (r) => <strong>{Number(r.leadConversionRate || 0).toFixed(1)}%</strong> },
    { key: 'avgTouchpoints', header: 'Avg Touchpoints / Lead', align: 'center', render: (r) => <span>{r.avgTouchpointsPerLead}</span> },
  ];

  // Pipeline Columns
  const oppColumns: ColumnDef<any>[] = [
    { key: 'repName', header: 'Representative', width: '30%' },
    { key: 'oppsHandled', header: 'Total Opportunities', align: 'center', render: (r) => <span>{r.oppsHandled}</span> },
    { key: 'openPipelineValue', header: 'Active Open Pipeline', align: 'right', render: (r) => <strong style={{ color: '#38bdf8' }}>{fmt$(r.openPipelineValue)}</strong> },
    { key: 'revenueWon', header: 'Closed Won Value', align: 'right', render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.revenueWon)}</strong> },
  ];

  // Activities & SLA Columns
  const activityColumns: ColumnDef<any>[] = [
    { key: 'repName', header: 'Representative', width: '30%' },
    { key: 'activitiesCompleted', header: 'Client Touchpoints', align: 'center', render: (r) => <span className="clean-badge clean-badge-warning">{r.activitiesCompleted}</span> },
    { key: 'tasksCompleted', header: 'Tasks Completed', align: 'center', render: (r) => <span className="clean-badge clean-badge-success">{r.tasksCompleted}</span> },
    { key: 'tasksOverdue', header: 'Overdue Backlog', align: 'center', render: (r) => <span className={`clean-badge ${r.tasksOverdue > 0 ? 'clean-badge-danger' : 'clean-badge-secondary'}`}>{r.tasksOverdue}</span> },
  ];

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Sales Reps', value: fmtNum(data.totalReps), sub: 'Team Members' },
      { label: 'Total Revenue', value: fmt$(data.totalTeamRevenue), sub: 'Won Deals' },
      { label: 'Deals Won', value: fmtNum(data.totalDealsWon), sub: 'Total Won' },
      { label: 'Overall Win Rate', value: `${Number(data.overallWinRate || 0).toFixed(1)}%`, sub: 'Conversion' },
    ];
    const insights = [
      `Total team generated ${fmt$(data.totalTeamRevenue)} in closed-won deals across ${data.totalDealsWon} opportunities.`,
      `Overall closure efficiency win rate is operating at ${Number(data.overallWinRate || 0).toFixed(1)}%.`,
      `Top revenue producer is ${data.reps?.[0]?.repName ?? 'N/A'} with ${fmt$(data.reps?.[0]?.revenueWon ?? 0)}.`,
    ];
    exportExecutivePDF(
      data.reps || [],
      'Sales Team Performance & Rep Productivity Report',
      'Individual rep productivity, revenue generation, win rates, and activity SLA metrics',
      stats,
      insights,
      'crm_team_performance_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.reps) return;
    exportCSV(data.reps, 'team_performance_leaderboard');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="team"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Team Performance Reports"
          description="Sales representative leaderboards, individual quota pacing, win rates, touchpoint velocity, and revenue contribution."
          badge="Leaderboard"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchTeamData}
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
                title="Revenue Generated by Representative"
                subtitle="Closed-won deal revenue leaderboard"
                badge="Top Producers"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.reps || data.reps.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.reps || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="repName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="revenueWon" name="Revenue Generated" radius={[6, 6, 0, 0]}>
                      {(data?.reps || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Win Rate & Deal Closure Efficiency"
                subtitle="Closed-deal conversion percentage per sales rep"
                badge="Win Rate %"
                badgeColor="#eab308"
                loading={loading}
                empty={!data?.reps || data.reps.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.reps || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="repName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${Number(v).toFixed(1)}%`} />} />
                    <Bar dataKey="winRate" name="Win Rate %" fill="#eab308" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Sales Representative Performance Leaderboard"
              subtitle="Comprehensive metrics: leads handled, conversion %, closed deals, revenue won, open pipeline, and SLA execution"
              columns={columns}
              data={data?.reps || []}
              loading={loading}
              searchable
              searchPlaceholder="Search sales rep, email, role..."
              emptyMessage="No team members found matching the selected filters."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: SALES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'sales' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Won vs Lost Deals by Representative"
                subtitle="Comparison of won and lost opportunity counts per rep"
                badge="Deals Outcome"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.reps || data.reps.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.reps || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="repName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Deals`} />} />
                    <Bar dataKey="dealsWon" name="Deals Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dealsLost" name="Deals Lost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Sales Closing Performance"
              subtitle="Breakdown of deals won, deals lost, win rate %, and average won deal size per representative"
              columns={salesColumns}
              data={data?.reps || []}
              loading={loading}
              emptyMessage="No sales closing data available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: LEADS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'leads' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Leads Handled vs Converted"
                subtitle="Lead volume assigned compared to successfully converted accounts"
                badge="Lead Conversion"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.reps || data.reps.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.reps || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="repName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Leads`} />} />
                    <Bar dataKey="leadsHandled" name="Leads Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="leadsConverted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Lead Management & Conversion Leaderboard"
              subtitle="Summary of lead handling, conversion rates, and engagement touchpoint density per representative"
              columns={leadColumns}
              data={data?.reps || []}
              loading={loading}
              emptyMessage="No lead conversion data available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: OPPORTUNITIES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'opportunities' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Active Open Pipeline Managed"
                subtitle="Capital valuation of active open opportunities currently managed by each rep"
                badge="Pipeline Capital"
                badgeColor="#8b5cf6"
                loading={loading}
                empty={!data?.reps || data.reps.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.reps || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="repName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="openPipelineValue" name="Open Pipeline" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Pipeline Capital Management Leaderboard"
              subtitle="Volume of opportunities handled, active pipeline valuation, and closed won deal value"
              columns={oppColumns}
              data={data?.reps || []}
              loading={loading}
              emptyMessage="No opportunity management data available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: REVENUE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'revenue' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Team Revenue Contribution Share"
                subtitle="Percentage share of total team revenue closed by each representative"
                badge="Revenue Share"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.reps || data.reps.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.reps || []}
                      dataKey="revenueWon"
                      nameKey="repName"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data?.reps || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Revenue Contribution Leaderboard"
              subtitle="All representatives ranked by realized closed won deal revenue"
              columns={columns}
              data={data?.reps || []}
              loading={loading}
              emptyMessage="No revenue records available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 6: ACTIVITIES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'activities' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Client Touchpoints Completed"
                subtitle="Total customer calls, emails, meetings, and touchpoints logged"
                badge="Touchpoints"
                badgeColor="#f59e0b"
                loading={loading}
                empty={!data?.reps || data.reps.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.reps || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="repName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Touchpoints`} />} />
                    <Bar dataKey="activitiesCompleted" name="Touchpoints" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Representative Activity & Task Execution Output"
              subtitle="Productivity breakdown of communication touchpoints, resolved tasks, and overdue items"
              columns={activityColumns}
              data={data?.reps || []}
              loading={loading}
              emptyMessage="No activity output records available."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default TeamPerformanceReportsScreen;
