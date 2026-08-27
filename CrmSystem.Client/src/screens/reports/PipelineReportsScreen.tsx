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
  Kanban, DollarSign, Target, TrendingUp,
  Award, Clock, CheckCircle2, XCircle, Layers
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import './cleanReports.css';

const PALETTE = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
const fmt$ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const PipelineReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'value' | 'stages' | 'winloss' | 'forecast'>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'value',    label: 'Value' },
    { id: 'stages',   label: 'Stages' },
    { id: 'winloss',  label: 'Win/Loss' },
    { id: 'forecast', label: 'Forecast' },
  ];

  const fetchPipelineData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (stageFilter) q.append('stageId', stageFilter);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/pipeline?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load pipeline reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, [startDate, endDate, scope, stageFilter]);

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

  // KPIs
  const kpis: ReportKpiItem[] = [
    {
      label: 'Total Pipeline Value',
      value: data ? fmt$(data.totalPipelineValue) : '$0',
      sub: `${data?.dealCount ?? 0} total deals`,
      icon: <DollarSign size={18} />,
      color: '#8b5cf6',
    },
    {
      label: 'Open Pipeline',
      value: data ? fmt$(data.openPipelineValue) : '$0',
      sub: `${data?.openDealsCount ?? 0} active open deals`,
      icon: <Kanban size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'Closed-Won Value',
      value: data ? fmt$(data.wonValue) : '$0',
      sub: `${data?.wonDealsCount ?? 0} closed-won deals`,
      icon: <Award size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Closed-Lost Value',
      value: data ? fmt$(data.lostValue) : '$0',
      sub: `${data?.lostDealsCount ?? 0} lost opportunities`,
      icon: <XCircle size={18} />,
      color: '#ef4444',
    },
    {
      label: 'Overall Win Rate',
      value: data ? `${Number(data.winRate || 0).toFixed(1)}%` : '0.0%',
      sub: 'Won / (Won + Lost) × 100',
      icon: <Target size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
  ];

  // Standard Opportunities Columns
  const oppColumns: ColumnDef<any>[] = [
    {
      key: 'title',
      header: 'Deal Title',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.title}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{r.customerName} {r.companyName !== '—' ? `(${r.companyName})` : ''}</div>
        </div>
      ),
    },
    {
      key: 'stageName',
      header: 'Stage',
      align: 'center',
      render: (r) => (
        <span
          className="clean-badge"
          style={{
            background: r.isWon ? 'rgba(16,185,129,0.15)' : r.isLost ? 'rgba(239,68,68,0.15)' : 'rgba(139,92,246,0.12)',
            color: r.isWon ? '#10b981' : r.isLost ? '#ef4444' : '#a78bfa',
            borderColor: r.isWon ? 'rgba(16,185,129,0.3)' : r.isLost ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.25)',
          }}
        >
          {r.stageName}
        </span>
      ),
    },
    {
      key: 'estimatedValue',
      header: 'Deal Value',
      align: 'right',
      render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.estimatedValue)}</strong>,
    },
    {
      key: 'ownerName',
      header: 'Deal Owner',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.ownerName}</span>,
    },
    {
      key: 'expectedCloseDate',
      header: 'Expected Close',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.expectedCloseDate ? new Date(r.expectedCloseDate).toLocaleDateString() : '—'}</span>,
    },
  ];

  // Stage Breakdown Columns
  const stageColumns: ColumnDef<any>[] = [
    { key: 'stageName', header: 'Pipeline Stage', width: '30%' },
    { key: 'dealCount', header: 'Deals Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.dealCount}</span> },
    { key: 'percentage', header: 'Value Share %', align: 'center', render: (r) => <strong>{r.percentage}%</strong> },
    { key: 'totalValue', header: 'Stage Capital Valuation', align: 'right', render: (r) => <strong style={{ color: '#8b5cf6' }}>{fmt$(r.totalValue)}</strong> },
    { key: 'averageValue', header: 'Average Deal Size', align: 'right', render: (r) => <span>{fmt$(r.averageValue)}</span> },
  ];

  // Forecast Columns
  const forecastColumns: ColumnDef<any>[] = [
    { key: 'month', header: 'Expected Closing Month', width: '30%' },
    { key: 'dealCount', header: 'Scheduled Deals', align: 'center', render: (r) => <span className="clean-badge clean-badge-info">{r.dealCount} Deals</span> },
    { key: 'totalValue', header: 'Gross Pipeline Capital', align: 'right', render: (r) => <span>{fmt$(r.totalValue)}</span> },
    { key: 'weightedValue', header: 'Weighted Expected Inflow', align: 'right', render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.weightedValue)}</strong> },
  ];

  // Filtered dataset for sub-tabs
  const valueItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0));
  }, [data]);

  const winLossItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((o: any) => o.isWon || o.isLost);
  }, [data]);

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Pipeline', value: fmt$(data.totalPipelineValue), sub: `${data.dealCount} Deals` },
      { label: 'Open Deals', value: fmt$(data.openPipelineValue), sub: `${data.openDealsCount} Active` },
      { label: 'Won Revenue', value: fmt$(data.wonValue), sub: `${data.wonDealsCount} Closed` },
      { label: 'Win Rate', value: `${Number(data.winRate || 0).toFixed(1)}%`, sub: 'Conversion' },
    ];
    const insights = [
      `Total pipeline portfolio represents ${fmt$(data.totalPipelineValue)} across ${data.dealCount} opportunities.`,
      `Active open opportunities account for ${fmt$(data.openPipelineValue)} in current pipeline velocity.`,
      `Closed-deal win rate is operating at ${Number(data.winRate || 0).toFixed(1)}%, realizing ${fmt$(data.wonValue)} in closed revenue.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Sales Pipeline Analytics & Conversion Report',
      'Stage progression, capital valuation, win/loss conversion, and weighted revenue forecast',
      stats,
      insights,
      'crm_pipeline_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'pipeline_report_records');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="pipeline"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Pipeline Reports"
          description="Stage conversion progression, deal valuation distribution, win/loss ratios, and revenue forecasting."
          badge="Pipeline Velocity"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchPipelineData}
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
                title="Pipeline Stage Valuation"
                subtitle="Capital valuation concentrated across active pipeline stages"
                badge="Stage Valuation"
                badgeColor="#8b5cf6"
                loading={loading}
                empty={!data?.byStage || data.byStage.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStage || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="stageName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="totalValue" name="Total Value" radius={[6, 6, 0, 0]}>
                      {(data?.byStage || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Deal Count by Stage"
                subtitle="Number of active opportunities per pipeline stage"
                badge="Deal Volume"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byStage || data.byStage.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byStage || []}
                      dataKey="dealCount"
                      nameKey="stageName"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={50}
                      paddingAngle={3}
                    >
                      {(data?.byStage || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Deals`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Pipeline Opportunities Ledger"
              subtitle="Detailed record of all deals, associated accounts, current stages, valuation, and expected close dates"
              columns={oppColumns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search deal title, customer, owner..."
              emptyMessage="No opportunities found matching the selected filters."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: VALUE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'value' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Capital Valuation by Stage"
                subtitle="Concentration of deal capital per pipeline stage"
                badge="Capital"
                badgeColor="#8b5cf6"
                loading={loading}
                empty={!data?.byStage || data.byStage.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStage || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="stageName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="totalValue" name="Stage Valuation" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Average Deal Size by Stage"
                subtitle="Mean opportunity size per sales stage"
                badge="Mean Size"
                badgeColor="#f59e0b"
                loading={loading}
                empty={!data?.byStage || data.byStage.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStage || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="stageName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="averageValue" name="Average Deal Size" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Deals Ranked by Valuation"
              subtitle="Pipeline opportunities sorted in descending order of financial capital value"
              columns={oppColumns}
              data={valueItems}
              loading={loading}
              searchable
              searchPlaceholder="Search high-value deals..."
              emptyMessage="No deals found."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: STAGES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'stages' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Deals Distribution by Stage"
                subtitle="Share of active deals per pipeline stage"
                badge="Stage Share"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byStage || data.byStage.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byStage || []}
                      dataKey="dealCount"
                      nameKey="stageName"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data?.byStage || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Deals`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Capital Share by Stage"
                subtitle="Percentage of pipeline capital locked in each stage"
                badge="Value Share"
                badgeColor="#8b5cf6"
                loading={loading}
                empty={!data?.byStage || data.byStage.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byStage || []}
                      dataKey="totalValue"
                      nameKey="stageName"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data?.byStage || []).map((_: any, idx: number) => (
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
              title="Pipeline Stages Summary"
              subtitle="Breakdown of volume, portfolio share %, total value, and average deal size per stage"
              columns={stageColumns}
              data={data?.byStage || []}
              loading={loading}
              emptyMessage="No stage breakdown available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: WIN / LOSS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'winloss' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Monthly Win Rate %"
                subtitle="Historical closed deal win/loss conversion performance"
                badge="Win Rate"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.winLossByMonth || data.winLossByMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.winLossByMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="winRateGradPip" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${Number(v).toFixed(1)}%`} />} />
                    <Area type="monotone" dataKey="winRate" name="Win Rate %" stroke="#10b981" fillOpacity={1} fill="url(#winRateGradPip)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Won vs Lost Closed Deals"
                subtitle="Volume of closed won and lost deals by month"
                badge="Outcome"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.winLossByMonth || data.winLossByMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.winLossByMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Deals`} />} />
                    <Bar dataKey="won" name="Won Deals" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lost" name="Lost Deals" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Closed Opportunities (Won vs Lost)"
              subtitle="All closed deals and realized revenues"
              columns={oppColumns}
              data={winLossItems}
              loading={loading}
              searchable
              searchPlaceholder="Search closed deals..."
              emptyMessage="No closed deals recorded."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: FORECAST */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'forecast' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Weighted Revenue Forecast by Month"
                subtitle="Probability-weighted revenue calculation based on active open deals"
                badge="Forecast"
                badgeColor="#8b5cf6"
                loading={loading}
                empty={!data?.forecastByMonth || data.forecastByMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.forecastByMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecastPipGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Area type="monotone" dataKey="weightedValue" name="Weighted Pipeline" stroke="#8b5cf6" fillOpacity={1} fill="url(#forecastPipGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Gross Pipeline by Target Close Month"
                subtitle="Total opportunity value expected to close per month"
                badge="Gross Pipeline"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.forecastByMonth || data.forecastByMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.forecastByMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="totalValue" name="Gross Value" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Monthly Revenue Forecast Schedule"
              subtitle="Breakdown of scheduled deals, gross valuation, and weighted expected inflows"
              columns={forecastColumns}
              data={data?.forecastByMonth || []}
              loading={loading}
              emptyMessage="No forecast data available."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default PipelineReportsScreen;
