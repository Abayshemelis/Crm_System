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
  Target, CheckCircle2, AlertCircle, Clock, Zap,
  TrendingUp, ShieldAlert, Award, Search, Calendar, AlertTriangle
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import './cleanReports.css';

const PALETTE = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const LeadReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'sources' | 'status' | 'conversion' | 'score' | 'followup'>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'sources',    label: 'Sources' },
    { id: 'status',     label: 'Status' },
    { id: 'conversion', label: 'Conversion' },
    { id: 'score',      label: 'Score' },
    { id: 'followup',   label: 'Follow-Up' },
  ];

  const fetchLeadData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (sourceFilter) q.append('sourceId', sourceFilter);
      if (statusFilter) q.append('statusId', statusFilter);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/leads?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load lead reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadData();
  }, [startDate, endDate, scope, sourceFilter, statusFilter]);

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
      label: 'Total Leads',
      value: data ? fmtNum(data.totalLeads) : '0',
      sub: 'All captured prospects',
      icon: <Target size={18} />,
      color: '#06b6d4',
    },
    {
      label: 'New Leads',
      value: data ? fmtNum(data.newLeads) : '0',
      sub: 'Acquired in selected period',
      icon: <TrendingUp size={18} />,
      color: '#3b82f6',
      delta: data?.newLeads > 0 ? `+${data.newLeads}` : undefined,
      deltaUp: true,
    },
    {
      label: 'Qualified Prospects',
      value: data ? fmtNum(data.qualifiedLeads) : '0',
      sub: 'Sales-ready leads',
      icon: <CheckCircle2 size={18} />,
      color: '#10b981',
    },
    {
      label: 'Converted Customers',
      value: data ? fmtNum(data.convertedLeads) : '0',
      sub: `${data?.convertedInPeriod ?? 0} converted in period`,
      icon: <Award size={18} />,
      color: '#8b5cf6',
      deltaUp: true,
    },
    {
      label: 'Conversion Rate',
      value: data ? `${Number(data.conversionRate || 0).toFixed(1)}%` : '0.0%',
      sub: 'Converted / Total Leads × 100',
      icon: <Zap size={18} />,
      color: '#f59e0b',
      deltaUp: true,
    },
  ];

  // Standard Lead Columns
  const leadColumns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Prospect Name',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.name}</strong>
          {r.jobTitle && r.jobTitle !== '—' && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{r.jobTitle}</div>
          )}
        </div>
      ),
    },
    {
      key: 'companyName',
      header: 'Company',
      render: (r) => <span>{r.companyName}</span>,
    },
    {
      key: 'sourceName',
      header: 'Source',
      align: 'center',
      render: (r) => (
        <span className="clean-badge clean-badge-info">
          {r.sourceName}
        </span>
      ),
    },
    {
      key: 'statusName',
      header: 'Status',
      align: 'center',
      render: (r) => {
        const isConv = r.convertedCustomerId || (r.statusName || '').toLowerCase().includes('converted');
        const isQual = (r.statusName || '').toLowerCase().includes('qualif');
        return (
          <span
            className="clean-badge"
            style={{
              background: isConv ? 'rgba(16,185,129,0.15)' : isQual ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.15)',
              color: isConv ? '#10b981' : isQual ? '#3b82f6' : '#94a3b8',
              borderColor: isConv ? 'rgba(16,185,129,0.3)' : isQual ? 'rgba(59,130,246,0.3)' : undefined,
            }}
          >
            {isConv ? 'Converted' : r.statusName}
          </span>
        );
      },
    },
    {
      key: 'leadScore',
      header: 'Lead Score',
      align: 'center',
      render: (r) => (
        <span
          className="clean-badge"
          style={{
            background: r.leadScore >= 80 ? 'rgba(239,68,68,0.15)' : r.leadScore >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.15)',
            color: r.leadScore >= 80 ? '#ef4444' : r.leadScore >= 50 ? '#f59e0b' : '#94a3b8',
            fontWeight: 700
          }}
        >
          {r.leadScore}
        </span>
      ),
    },
    {
      key: 'assignedRepName',
      header: 'Assigned Rep',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.assignedRepName}</span>,
    },
    {
      key: 'createdAt',
      header: 'Captured Date',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</span>,
    },
  ];

  // Sources Columns
  const sourceColumns: ColumnDef<any>[] = [
    { key: 'source', header: 'Acquisition Source', width: '35%' },
    { key: 'count', header: 'Leads Ingested', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.count}</span> },
    { key: 'converted', header: 'Converted Customers', align: 'center', render: (r) => <span className="clean-badge clean-badge-success">{r.converted}</span> },
    { key: 'conversionRate', header: 'Conversion Rate %', align: 'center', render: (r) => <strong>{r.conversionRate}%</strong> },
  ];

  // Status Columns
  const statusColumns: ColumnDef<any>[] = [
    { key: 'status', header: 'Lead Stage', width: '40%' },
    { key: 'count', header: 'Leads Volume', align: 'center', render: (r) => <span className="clean-badge clean-badge-info">{r.count}</span> },
    { key: 'percentage', header: 'Funnel Share %', align: 'center', render: (r) => <strong>{r.percentage}%</strong> },
  ];

  // Score Tier Columns
  const scoreColumns: ColumnDef<any>[] = [
    { key: 'tier', header: 'Priority Tier', width: '40%' },
    { key: 'count', header: 'Leads Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-warning">{r.count}</span> },
    {
      key: 'share',
      header: 'Share %',
      align: 'center',
      render: (r) => <strong>{data?.totalLeads > 0 ? `${Math.round((r.count / data.totalLeads) * 100)}%` : '0%'}</strong>
    },
  ];

  // Sub-tab filtered datasets
  const convertedItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((l: any) => l.convertedCustomerId || (l.statusName || '').toLowerCase().includes('converted'));
  }, [data]);

  const sourceOptions = useMemo(() => {
    if (!data?.bySource) return [];
    return data.bySource.map((s: any) => ({ value: s.source, label: s.source }));
  }, [data]);

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Leads', value: fmtNum(data.totalLeads), sub: 'Ingested Prospects' },
      { label: 'New Leads', value: fmtNum(data.newLeads), sub: 'In Period' },
      { label: 'Converted', value: fmtNum(data.convertedLeads), sub: 'Customers' },
      { label: 'Conversion Rate', value: `${Number(data.conversionRate || 0).toFixed(1)}%`, sub: 'Efficiency' },
    ];
    const insights = [
      `Captured ${data.totalLeads} total prospects with ${data.newLeads} acquired during this reporting period.`,
      `Achieved a conversion rate of ${Number(data.conversionRate || 0).toFixed(1)}%, converting ${data.convertedLeads} prospects into paying customers.`,
      `Top performing acquisition channel is ${data.bySource?.[0]?.source ?? 'Direct'} generating ${data.bySource?.[0]?.count ?? 0} leads.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Lead Acquisition & Conversion Analytics Report',
      'Lead sources, qualification stages, conversion ratios, scoring tiers, and follow-up SLAs',
      stats,
      insights,
      'crm_lead_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'lead_report_records');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="leads"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Lead Reports"
          description="Prospect acquisition trends, qualification stages, dynamic conversion rates, scoring tiers, and follow-up SLAs."
          badge="Funnel & Conversion"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchLeadData}
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
                title="Lead Acquisition & Conversion Trend"
                subtitle="Prospect volume acquired vs converted over time"
                badge="Trend Analysis"
                badgeColor="#06b6d4"
                loading={loading}
                empty={!data?.leadTrend || data.leadTrend.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.leadTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotalLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorConvLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="date" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Leads`} />} />
                    <Area type="monotone" dataKey="total" name="Total Ingested" stroke="#06b6d4" fillOpacity={1} fill="url(#colorTotalLeads)" strokeWidth={2} />
                    <Area type="monotone" dataKey="converted" name="Converted Customers" stroke="#10b981" fillOpacity={1} fill="url(#colorConvLeads)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Leads by Status Pipeline"
                subtitle="Volume distribution across qualification stages"
                badge="Stages"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStatus || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="status" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Leads`} />} />
                    <Bar dataKey="count" name="Lead Count" radius={[6, 6, 0, 0]}>
                      {(data?.byStatus || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Lead Management Ledger"
              subtitle="Detailed list of prospect records, status, scores, acquisition channels, and assignment"
              columns={leadColumns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search lead name, company, email..."
              emptyMessage="No lead records found matching the selected filters."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: SOURCES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'sources' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Leads by Acquisition Source"
                subtitle="Share of prospects acquired through marketing and sales channels"
                badge="Sources"
                badgeColor="#06b6d4"
                loading={loading}
                empty={!data?.bySource || data.bySource.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.bySource || []}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={48}
                      paddingAngle={3}
                    >
                      {(data?.bySource || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Leads`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Acquisition Sources Summary"
              subtitle="Breakdown of leads ingested, customers converted, and conversion efficiency per channel"
              columns={sourceColumns}
              data={data?.bySource || []}
              loading={loading}
              emptyMessage="No source breakdown available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: STATUS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'status' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Leads by Funnel Stage"
                subtitle="Volume distribution across qualification pipeline stages"
                badge="Stages"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStatus || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="status" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Leads`} />} />
                    <Bar dataKey="count" name="Leads Count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Lead Stages Breakdown"
              subtitle="Volume and percentage share of leads in each stage"
              columns={statusColumns}
              data={data?.byStatus || []}
              loading={loading}
              emptyMessage="No status breakdown available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: CONVERSION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'conversion' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Conversion Velocity Over Time"
                subtitle="Historical trend of converted customers"
                badge="Conversion Velocity"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.leadTrend || data.leadTrend.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.leadTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="convTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="date" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Converted`} />} />
                    <Area type="monotone" dataKey="converted" name="Converted Customers" stroke="#10b981" fillOpacity={1} fill="url(#convTrendGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Converted Customers Ledger"
              subtitle="All leads that have successfully converted into paying client accounts"
              columns={leadColumns}
              data={convertedItems}
              loading={loading}
              searchable
              searchPlaceholder="Search converted leads..."
              emptyMessage="No converted leads found."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: SCORE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'score' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Lead Score Priority Tiers"
                subtitle="Distribution of prospects across AI priority scoring tiers"
                badge="Score Tiers"
                badgeColor="#f59e0b"
                loading={loading}
                empty={!data?.scoreTiers || data.scoreTiers.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.scoreTiers || []}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={48}
                      paddingAngle={3}
                    >
                      {(data?.scoreTiers || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Leads`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Lead Score Priority Tier Summary"
              subtitle="Breakdown of prospect volume across urgent, high, medium, and low qualification tiers"
              columns={scoreColumns}
              data={data?.scoreTiers || []}
              loading={loading}
              emptyMessage="No scoring tiers available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 6: FOLLOW-UP */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'followup' && (
          <>
            <div className="clean-card" style={{ marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={18} /> Lead Follow-Up SLA & Cadence
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    Scheduled follow-ups: <strong>{data?.followUp?.scheduledFollowUps ?? 0}</strong> | Due Today: <strong>{data?.followUp?.dueTodayFollowUps ?? 0}</strong> | Overdue: <strong>{data?.followUp?.overdueFollowUps ?? 0}</strong>
                  </p>
                </div>
                <span className="clean-badge clean-badge-warning" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  {data?.followUp?.overdueFollowUps ?? 0} Overdue Follow-ups
                </span>
              </div>
            </div>

            <ReportDataTable
              title="Prospect Follow-up Ledger"
              subtitle="All leads requiring sales engagement and follow-up activities"
              columns={leadColumns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search follow-up leads..."
              emptyMessage="No leads found."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default LeadReportsScreen;
