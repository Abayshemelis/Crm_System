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
  Layers, DollarSign, Target, TrendingUp,
  Award, XCircle, CheckCircle2, Calendar, Filter
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem, ReportSummaryBanner } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import { formatCurrencyGlobal } from '../../context/SystemProfileContext';
import './cleanReports.css';

const PALETTE = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444'];
const fmt$ = (v: number) => formatCurrencyGlobal(v, undefined, 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const OpportunityReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'value' | 'stage' | 'winloss' | 'conversion'>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'value',      label: 'Value' },
    { id: 'stage',      label: 'Stage' },
    { id: 'winloss',    label: 'Win/Loss' },
    { id: 'conversion', label: 'Conversion' },
  ];

  const fetchOppData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/pipeline?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load opportunity reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOppData();
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
      label: 'Total Opportunities',
      value: data ? fmtNum(data.dealCount) : '0',
      sub: 'All registered opportunities',
      icon: <Layers size={18} />,
      color: '#ec4899',
    },
    {
      label: 'Open Opportunities',
      value: data ? fmtNum(data.openDealsCount) : '0',
      sub: 'In active negotiation',
      icon: <TrendingUp size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'Won Opportunities',
      value: data ? fmtNum(data.wonDealsCount) : '0',
      sub: `Valued at ${fmt$(data?.wonValue ?? 0)}`,
      icon: <Award size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Lost Opportunities',
      value: data ? fmtNum(data.lostDealsCount) : '0',
      sub: `Valued at ${fmt$(data?.lostValue ?? 0)}`,
      icon: <XCircle size={18} />,
      color: '#ef4444',
    },
    {
      label: 'Total Opportunity Value',
      value: data ? fmt$(data.totalPipelineValue) : '$0',
      sub: 'Aggregate deal valuation',
      icon: <DollarSign size={18} />,
      color: '#8b5cf6',
    },
    {
      label: 'Average Opportunity Value',
      value: data ? fmt$(data.averageDealValue) : '$0',
      sub: 'Mean deal size',
      icon: <Target size={18} />,
      color: '#f59e0b',
    },
  ];

  // Standard Opportunities Columns
  const columns: ColumnDef<any>[] = [
    {
      key: 'title',
      header: 'Opportunity Title',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.title}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
            {r.customerName} {r.companyName && r.companyName !== '—' ? `(${r.companyName})` : ''}
          </div>
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
            background: r.isWon ? 'rgba(16,185,129,0.15)' : r.isLost ? 'rgba(239,68,68,0.15)' : 'rgba(236,72,153,0.12)',
            color: r.isWon ? '#10b981' : r.isLost ? '#ef4444' : '#f472b6',
            borderColor: r.isWon ? 'rgba(16,185,129,0.3)' : r.isLost ? 'rgba(239,68,68,0.3)' : 'rgba(236,72,153,0.25)',
          }}
        >
          {r.stageName}
        </span>
      ),
    },
    {
      key: 'estimatedValue',
      header: 'Estimated Value',
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
    {
      key: 'createdAt',
      header: 'Created Date',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</span>,
    },
  ];

  // Stage Breakdown Columns
  const stageColumns: ColumnDef<any>[] = [
    { key: 'stageName', header: 'Pipeline Stage', width: '30%' },
    {
      key: 'dealCount',
      header: 'Opportunities Count',
      align: 'center',
      render: (r) => <span className="clean-badge clean-badge-primary">{r.dealCount} Deals</span>
    },
    {
      key: 'percentage',
      header: 'Value Share',
      align: 'center',
      render: (r) => <strong>{r.percentage}%</strong>
    },
    {
      key: 'totalValue',
      header: 'Stage Valuation',
      align: 'right',
      render: (r) => <strong style={{ color: '#8b5cf6' }}>{fmt$(r.totalValue)}</strong>
    },
    {
      key: 'averageValue',
      header: 'Average Deal Size',
      align: 'right',
      render: (r) => <span>{fmt$(r.averageValue)}</span>
    },
  ];

  // Win / Loss Columns
  const winLossColumns: ColumnDef<any>[] = [
    {
      key: 'title',
      header: 'Opportunity Title',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.title}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{r.customerName}</div>
        </div>
      ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      align: 'center',
      render: (r) => (
        <span
          className="clean-badge"
          style={{
            background: r.isWon ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: r.isWon ? '#10b981' : '#ef4444',
            borderColor: r.isWon ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
            fontWeight: 700
          }}
        >
          {r.isWon ? 'WON' : 'LOST'}
        </span>
      ),
    },
    {
      key: 'estimatedValue',
      header: 'Realized / Lost Value',
      align: 'right',
      render: (r) => (
        <strong style={{ color: r.isWon ? '#10b981' : '#ef4444' }}>
          {fmt$(r.estimatedValue)}
        </strong>
      ),
    },
    {
      key: 'ownerName',
      header: 'Deal Owner',
      render: (r) => <span>{r.ownerName}</span>,
    },
    {
      key: 'actualCloseDate',
      header: 'Closed Date',
      render: (r) => <span>{r.actualCloseDate ? new Date(r.actualCloseDate).toLocaleDateString() : (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—')}</span>,
    },
  ];

  // Sub-tab filtered datasets
  const valueItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0));
  }, [data]);

  const winLossItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((o: any) => o.isWon || o.isLost);
  }, [data]);

  const conversionItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => {
      if (!a.expectedCloseDate) return 1;
      if (!b.expectedCloseDate) return -1;
      return new Date(a.expectedCloseDate).getTime() - new Date(b.expectedCloseDate).getTime();
    });
  }, [data]);

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Opportunities', value: fmtNum(data.dealCount), sub: 'Active CRM DB' },
      { label: 'Won Deals', value: fmtNum(data.wonDealsCount), sub: fmt$(data.wonValue) },
      { label: 'Total Value', value: fmt$(data.totalPipelineValue), sub: 'Portfolio Valuation' },
      { label: 'Win Rate', value: `${Number(data.winRate || 0).toFixed(1)}%`, sub: 'Closed Deals' },
    ];
    const insights = [
      `Recorded ${data.dealCount} total opportunities with a cumulative portfolio value of ${fmt$(data.totalPipelineValue)}.`,
      `Achieved a closed-deal win rate of ${Number(data.winRate || 0).toFixed(1)}%, generating ${fmt$(data.wonValue)} in revenue.`,
      `Average deal size across all active opportunities is ${fmt$(data.averageDealValue)}.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Opportunity Analytics & Performance Report',
      'Opportunity volume, deal valuation, stage transitions, and won/loss ratios',
      stats,
      insights,
      'crm_opportunity_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'opportunity_report_records');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="opportunities"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Opportunity Reports"
          description="Opportunity tracking, stage valuation distribution, won vs lost analysis, and deal trends."
          badge="Opportunities"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchOppData}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          loading={loading}
        />

        {/* ── 3. Summary Banner ────────────────────────────────────────────────── */}
        <ReportSummaryBanner 
          items={[
            kpis[0], // Total Opportunities
            kpis[1], // Open Opportunities
            kpis[2], // Won Opportunities
            kpis[4], // Total Opportunity Value
          ]} 
          loading={loading} 
        />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'overview' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Opportunities by Stage"
                subtitle="Deal count per sales stage"
                badge="Stage Breakdown"
                badgeColor="#ec4899"
                loading={loading}
                empty={!data?.byStage || data.byStage.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStage || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="stageName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Deals`} />} />
                    <Bar dataKey="dealCount" name="Deal Count" radius={[6, 6, 0, 0]}>
                      {(data?.byStage || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Opportunity Value by Stage"
                subtitle="Financial capital distribution across stages"
                badge="Valuation"
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
                    <Bar dataKey="totalValue" name="Stage Value" radius={[6, 6, 0, 0]}>
                      {(data?.byStage || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Opportunities Management Ledger"
              subtitle="Comprehensive opportunity details, customer links, stage valuation, and expected close dates"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search opportunity title, customer..."
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
                title="Opportunity Value Distribution by Stage"
                subtitle="Capital valuation concentrated across active pipeline stages"
                badge="Capital Value"
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
                    <Bar dataKey="totalValue" name="Total Stage Value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Average Deal Size by Stage"
                subtitle="Mean opportunity size per sales stage"
                badge="Average Deal"
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
              title="High-Value Deals & Capital Ranking"
              subtitle="Opportunities ranked by estimated deal valuation"
              columns={columns}
              data={valueItems}
              loading={loading}
              searchable
              searchPlaceholder="Search high-value deals..."
              emptyMessage="No high-value opportunity records found."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: STAGE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'stage' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Opportunity Stage Distribution"
                subtitle="Deal count share across pipeline stages"
                badge="Stage Share"
                badgeColor="#ec4899"
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
                title="Stage Capital Valuation Share"
                subtitle="Capital valuation distributed across pipeline stages"
                badge="Value Share"
                badgeColor="#3b82f6"
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
              title="Pipeline Stages Summary & Performance"
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
                title="Won vs Lost Deals Trend"
                subtitle="Historical closed deal volume comparison by month"
                badge="Win / Loss"
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

              <ReportChartCard
                title="Monthly Win Rate %"
                subtitle="Percentage of closed deals successfully won"
                badge="Win Rate"
                badgeColor="#eab308"
                loading={loading}
                empty={!data?.winLossByMonth || data.winLossByMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.winLossByMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="winRateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${Number(v).toFixed(1)}%`} />} />
                    <Area type="monotone" dataKey="winRate" name="Win Rate %" stroke="#10b981" fillOpacity={1} fill="url(#winRateGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Closed Deals Outcome Ledger (Won vs Lost)"
              subtitle="Complete historical record of closed opportunities and realized revenues"
              columns={winLossColumns}
              data={winLossItems}
              loading={loading}
              searchable
              searchPlaceholder="Search closed deals..."
              emptyMessage="No closed (won/lost) deals recorded."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: CONVERSION & CLOSING TIMELINE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'conversion' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Forecasted Revenue by Expected Close Month"
                subtitle="Expected closing pipeline value over upcoming months"
                badge="Forecast"
                badgeColor="#8b5cf6"
                loading={loading}
                empty={!data?.forecastByMonth || data.forecastByMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.forecastByMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Area type="monotone" dataKey="totalValue" name="Expected Value" stroke="#8b5cf6" fillOpacity={1} fill="url(#forecastGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Weighted Expected Inflow"
                subtitle="Probability-weighted revenue calculation"
                badge="Weighted Pipeline"
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
                    <Bar dataKey="weightedValue" name="Weighted Expected Value" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Pipeline Closing Timeline & Velocity"
              subtitle="Opportunities sorted by expected close date for revenue forecasting"
              columns={columns}
              data={conversionItems}
              loading={loading}
              searchable
              searchPlaceholder="Search timeline opportunities..."
              emptyMessage="No opportunities scheduled for closing."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default OpportunityReportsScreen;
