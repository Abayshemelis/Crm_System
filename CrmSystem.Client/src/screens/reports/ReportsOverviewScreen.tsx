import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  DollarSign, Users, Target, Briefcase, FileText, Receipt,
  AlertTriangle, CheckCircle2, TrendingUp, ArrowDown,
  ShieldCheck, Activity, Sparkles, Inbox, RefreshCw,
  Award, AlertCircle, Info, Layers, UserCheck, ShieldAlert,
  ChevronRight, ArrowUpRight, Check, Grid, Lock, Database, Cpu, CheckCircle
} from 'lucide-react';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { CustomChartTooltip } from '../../components/reports/ReportCharts';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import { formatCurrencyGlobal } from '../../context/SystemProfileContext';
import './cleanReports.css';

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444'];
const STATUS_COLORS: Record<string, string> = {
  Paid: '#10b981',
  Completed: '#10b981',
  Active: '#10b981',
  Won: '#10b981',
  Sent: '#3b82f6',
  Pending: '#f59e0b',
  Draft: '#94a3b8',
  Overdue: '#ef4444',
  Lost: '#ef4444',
  Cancelled: '#64748b',
  Expired: '#64748b',
};

const fmt$ = (v: number) => formatCurrencyGlobal(v, undefined, 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

const TABS = [
  { id: 'executive', label: 'Executive Summary', icon: <Sparkles size={14} /> },
  { id: 'sales', label: 'Sales & Pipeline', icon: <Target size={14} /> },
  { id: 'customers', label: 'Customer Portfolio', icon: <Users size={14} /> },
  { id: 'financial', label: 'Financial & Billing', icon: <DollarSign size={14} /> },
  { id: 'operations', label: 'Operations & Tasks', icon: <Activity size={14} /> },
  { id: 'health', label: 'System & Audit', icon: <ShieldCheck size={14} /> },
  { id: 'all', label: 'Consolidated View', icon: <Grid size={14} /> },
] as const;

type TabId = (typeof TABS)[number]['id'];

function compactMoney(v: number) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function formatBucket(value: string) {
  if (!value) return '';
  if (value.length === 10) {
    const d = new Date(`${value}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  const [y, m] = value.split('-');
  if (!y || !m) return value;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
}

// Builds a rolling 6-month continuous timeline if the backend only has sparse data
function buildContinuousTimeline(sparseTrend: any[]) {
  if (!sparseTrend) return [];
  if (sparseTrend.length >= 6) return sparseTrend;
  
  const result: any[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const existing = sparseTrend.find((r) => r.month === monthKey);
    if (existing) {
      result.push({ ...existing });
    } else {
      result.push({
        month: monthKey,
        invoiced: 0,
        collected: 0,
        count: 0,
        won: 0,
        lost: 0,
      });
    }
  }
  return result;
}

function hasRows(list: unknown): list is any[] {
  return Array.isArray(list) && list.length > 0;
}

function hasSignal(list: any[], keys: string[]) {
  return hasRows(list) && list.some((row) => keys.some((k) => Number(row?.[k]) > 0));
}

const EmptyBlock: React.FC<{ message: string }> = ({ message }) => (
  <div className="exec-empty-state">
    <Inbox size={26} opacity={0.4} />
    <span>{message}</span>
  </div>
);

const ChartFrame: React.FC<{
  loading?: boolean;
  empty?: boolean;
  emptyMessage: string;
  heightClass?: string;
  children: React.ReactNode;
}> = ({ loading, empty, emptyMessage, heightClass = 'exec-chart-container', children }) => {
  if (loading) {
    return (
      <div className={`${heightClass} exec-empty-state`}>
        <div className="exec-shimmer" style={{ width: '60%', height: 12, marginBottom: 12 }} />
        <div className="exec-shimmer" style={{ width: '100%', height: '80%' }} />
      </div>
    );
  }
  if (empty) return <div className={heightClass}><EmptyBlock message={emptyMessage} /></div>;
  return <div className={heightClass}>{children}</div>;
};

export const ReportsOverviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isManagerOrAbove } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('executive');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      q.append('scope', scope);
      const res = await api.get<any>(`/api/reports/overview?${q.toString()}`);
      setData(res);
    } catch (err: any) {
      setData(null);
      setError(err?.message || 'Unable to load live overview report data from the CRM server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManagerOrAbove) setScope('team');
  }, [isManagerOrAbove]);

  useEffect(() => {
    fetchOverview();
  }, [startDate, endDate, scope]);

  const handlePresetChange = (presetId: string, customStart?: string, customEnd?: string) => {
    setActivePreset(presetId);
    if (presetId === 'custom' && customStart && customEnd) {
      setStartDate(customStart);
      setEndDate(customEnd);
    } else {
      const range = calculateDateRange(presetId);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const ready = !loading && !error && data != null;
  const val = (n: number | undefined) => (ready ? fmtNum(Number(n) || 0) : loading ? '…' : '—');
  const money = (n: number | undefined) => (ready ? fmt$(Number(n) || 0) : loading ? '…' : '—');
  const pct = (n: number | undefined) => (ready ? `${Number(n || 0).toFixed(1)}%` : loading ? '…' : '—');

  // Trend and breakdown arrays from API with continuous smoothing
  const rawRevenueTrend = data?.revenueTrend || [];
  const revenueTrend = useMemo(() => buildContinuousTimeline(rawRevenueTrend), [rawRevenueTrend]);
  
  const pipeline = data?.pipelineDistribution || [];
  const leadStatus = data?.leadStatusBreakdown || [];
  const wonLostTrend = useMemo(() => buildContinuousTimeline(data?.wonLostTrend || []), [data?.wonLostTrend]);
  const salesByOwner = data?.salesByOwner || [];
  const customerGrowth = useMemo(() => buildContinuousTimeline(data?.customerGrowthTrend || []), [data?.customerGrowthTrend]);
  const customersBySource = data?.customersBySource || [];
  const invoicesByStatus = data?.invoicesByStatus || [];
  const activitiesByType = data?.activitiesByType || [];
  const contractsByStatus = data?.contractsByStatus || [];
  const alerts = data?.alerts || [];
  const recentAudit = data?.recentAuditLogs || [];

  const totalLeads = Number(data?.totalLeads) || 0;
  const qualifiedLeads = Number(data?.qualifiedLeads) || 0;
  const oppsCount = Number(data?.totalOpportunities) || 0;
  const wonCount = Number(data?.wonDealsCount) || 0;
  const activeContracts = Number(data?.activeContracts) || 0;

  const maxFunnel = Math.max(totalLeads, oppsCount, wonCount, activeContracts, 1);

  const funnelSteps = ready
    ? [
        {
          id: 'leads',
          label: '1. Leads Inflow',
          count: totalLeads,
          metric: `${data?.newLeads || 0} new`,
          color: '#06b6d4',
          icon: <Target size={13} color="#06b6d4" />,
        },
        {
          id: 'qual',
          label: '2. Qualified',
          count: qualifiedLeads,
          metric: `${Number(data?.conversionRate || 0).toFixed(1)}% conv`,
          color: '#3b82f6',
          icon: <UserCheck size={13} color="#3b82f6" />,
        },
        {
          id: 'opps',
          label: '3. Active Deals',
          count: oppsCount,
          metric: fmt$(data?.pipelineValue || 0),
          color: '#8b5cf6',
          icon: <Briefcase size={13} color="#8b5cf6" />,
        },
        {
          id: 'won',
          label: '4. Closed Won',
          count: wonCount,
          metric: fmt$(data?.wonRevenueTotal || 0),
          color: '#10b981',
          icon: <CheckCircle2 size={13} color="#10b981" />,
        },
        {
          id: 'contracts',
          label: '5. Contracts',
          count: activeContracts,
          metric: `${activeContracts} active`,
          color: '#f59e0b',
          icon: <FileText size={13} color="#f59e0b" />,
        },
      ]
    : [];

  const handleExportPDF = () => {
    if (!data) return;
    exportExecutivePDF(
      pipeline,
      'Executive CRM Overview Report',
      `Period: ${startDate} to ${endDate} (${scope === 'team' ? 'Entire Organization' : 'Personal Scope'})`,
      [
        { label: 'Net Collected', value: fmt$(data.totalPaymentsCollected || 0) },
        { label: 'Active Pipeline', value: fmt$(data.pipelineValue || 0) },
        { label: 'Total Clients', value: fmtNum(data.totalCustomers || 0) },
        { label: 'Deal Win Rate', value: `${data.winRate || 0}%` },
      ],
      [
        `Total collected revenue is ${fmt$(data.totalPaymentsCollected || 0)} with ${fmt$(data.outstandingReceivables || 0)} outstanding.`,
        `${fmtNum(data.openDeals || 0)} open deals active in pipeline totaling ${fmt$(data.pipelineValue || 0)}.`,
        `${fmtNum(data.newLeads || 0)} new leads captured; period conversion rate is ${Number(data.periodConversionRate || 0).toFixed(1)}%.`,
      ],
      'executive_report_overview'
    );
  };

  const handleExportCSV = () => {
    if (!data) return;
    exportCSV(
      (pipeline.length ? pipeline : [{ stage: 'No pipeline stages', count: 0, value: 0 }]).map((s: any) => ({
        Stage: s.stage,
        Deals: s.count,
        Value: s.value,
      })),
      `executive_overview_${startDate}_${endDate}`
    );
  };

  const chartTooltipMoney = <CustomChartTooltip formatter={(v: any) => fmt$(Number(v))} />;
  const chartTooltipNum = <CustomChartTooltip />;

  // ═════════════════════════════════════════════════════════════════════════
  // SECTION COMPONENTS (Full Data Density & Zero Empty Boxes)
  // ═════════════════════════════════════════════════════════════════════════

  const renderSectionExecutive = () => (
    <section className="exec-section exec-tab-view">
      {/* Top Telemetry Strip */}
      <div className="exec-telemetry-bar">
        <div className="exec-telemetry-item highlight-green">
          <DollarSign size={15} color="#10b981" />
          <span className="telemetry-label">Collected:</span>
          <strong>{money(data?.totalPaymentsCollected)}</strong>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>({money(data?.periodCollectedValue)} period)</span>
        </div>
        <div className="exec-telemetry-item highlight-blue">
          <Briefcase size={15} color="#6366f1" />
          <span className="telemetry-label">Pipeline:</span>
          <strong>{money(data?.pipelineValue)}</strong>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>({val(data?.openDeals)} deals)</span>
        </div>
        <div className="exec-telemetry-item">
          <Users size={15} color="#06b6d4" />
          <span className="telemetry-label">Clients:</span>
          <strong>{val(data?.totalCustomers)}</strong>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>({val(data?.newCustomers)} new)</span>
        </div>
        <div className="exec-telemetry-item">
          <Target size={15} color="#3b82f6" />
          <span className="telemetry-label">Leads:</span>
          <strong>{val(data?.totalLeads)}</strong>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>({pct(data?.conversionRate)} conv)</span>
        </div>
        <div className="exec-telemetry-item">
          <FileText size={15} color="#f59e0b" />
          <span className="telemetry-label">Contracts:</span>
          <strong>{val(data?.activeContracts)}</strong>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>of {val(data?.totalContracts)}</span>
        </div>
        <div className="exec-telemetry-item highlight-amber">
          <Receipt size={15} color="#f59e0b" />
          <span className="telemetry-label">Outstanding:</span>
          <strong>{money(data?.outstandingReceivables)}</strong>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>({val(data?.overdueCount)} overdue)</span>
        </div>
        <div className="exec-telemetry-item">
          <Activity size={15} color="#8b5cf6" />
          <span className="telemetry-label">Tasks:</span>
          <strong>{val(data?.openTasks)}</strong>
          <span style={{ fontSize: '0.72rem', color: Number(data?.overdueTasks) > 0 ? '#ef4444' : 'inherit' }}>
            ({val(data?.overdueTasks)} overdue)
          </span>
        </div>
      </div>

      {/* Horizontal Stepper Conversion Funnel */}
      {ready && (
        <div className="exec-horizontal-funnel">
          {funnelSteps.map((step) => {
            const pctWidth = Math.max(10, Math.min(100, (step.count / maxFunnel) * 100));
            return (
              <div key={step.id} className="exec-funnel-col">
                <div className="exec-funnel-col-head">
                  <div className="exec-funnel-col-title">
                    {step.icon}
                    <span>{step.label}</span>
                  </div>
                  <span className="exec-funnel-col-sub">{step.metric}</span>
                </div>
                <div className="exec-funnel-col-body">
                  <span className="exec-funnel-col-val">{fmtNum(step.count)}</span>
                </div>
                <div className="exec-funnel-bar-bg">
                  <div
                    className="exec-funnel-bar-fill"
                    style={{
                      width: `${pctWidth}%`,
                      background: `linear-gradient(90deg, ${step.color}90, ${step.color})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Side-by-Side Visuals: Invoicing Velocity & Pipeline Stages */}
      <div className="exec-bento-grid">
        {/* Left: Invoicing Velocity vs Cash Realization */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Invoicing Velocity vs Cash Realization</h3>
                <p className="exec-panel-sub">Volume of issued invoices compared against collected cash</p>
              </div>
              <div className="exec-stat-capsules">
                <span className="exec-stat-capsule" style={{ borderColor: 'rgba(16, 185, 129, 0.35)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  Collected: <strong style={{ color: '#10b981' }}>{money(data?.totalPaymentsCollected)}</strong>
                </span>
                <span className="exec-stat-capsule" style={{ borderColor: 'rgba(99, 102, 241, 0.35)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />
                  Invoiced: <strong style={{ color: '#6366f1' }}>{money(data?.totalInvoicedValue)}</strong>
                </span>
              </div>
            </div>

            <ChartFrame loading={loading} empty={ready && !hasSignal(revenueTrend, ['invoiced', 'collected'])} emptyMessage="No billing or payment activity in this date range" heightClass="exec-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="execInvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="execColGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="month" tickFormatter={formatBucket} stroke="#94a3b8" tickLine={false} style={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tickLine={false} width={48} tickFormatter={compactMoney} style={{ fontSize: 10 }} />
                  <Tooltip content={chartTooltipMoney} />
                  <Legend wrapperStyle={{ paddingTop: 4, fontSize: 10 }} />
                  <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="#6366f1" strokeWidth={2.5} fill="url(#execInvGrad)" />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2.5} fill="url(#execColGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </div>

        {/* Right: Pipeline Stages */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Active Pipeline by Stage</h3>
                <p className="exec-panel-sub">Monetary valuation and volume across stages</p>
              </div>
              <span className="exec-panel-badge">{val(data?.openDeals)} Deals ({money(data?.pipelineValue)})</span>
            </div>

            <div className="exec-split-layout">
              <ChartFrame loading={loading} empty={ready && !pipeline.some((s: any) => s.value > 0 || s.count > 0)} emptyMessage="No active deals in pipeline" heightClass="exec-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipeline} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="stage" stroke="#94a3b8" tickLine={false} angle={-15} textAnchor="end" interval={0} style={{ fontSize: 9 }} />
                    <YAxis stroke="#94a3b8" tickLine={false} width={45} tickFormatter={compactMoney} style={{ fontSize: 10 }} />
                    <Tooltip content={chartTooltipMoney} />
                    <Bar dataKey="value" name="Stage Value" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {pipeline.map((_: any, idx: number) => (
                        <Cell key={`pipe-cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>

              {/* Stage Breakdown Data Rows */}
              <div className="exec-breakdown-list">
                {pipeline.slice(0, 5).map((stg: any, idx: number) => (
                  <div key={stg.stage || idx} className="exec-breakdown-row">
                    <div className="exec-breakdown-left">
                      <span className="exec-breakdown-dot" style={{ background: PALETTE[idx % PALETTE.length] }} />
                      <span className="exec-breakdown-label">{stg.stage}</span>
                    </div>
                    <div className="exec-breakdown-right">
                      <span className="exec-breakdown-count">{stg.count}</span>
                      <span className="exec-breakdown-val">{fmt$(stg.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Takeaways Highlights Ribbon */}
      {ready && (
        <div className="exec-highlights-strip">
          <div className="exec-highlight-item">
            <div className="exec-highlight-icon">
              <TrendingUp size={16} />
            </div>
            <div className="exec-highlight-text">
              <strong>Revenue Generation:</strong> Collected {money(data?.totalPaymentsCollected)} lifetime with {money(data?.periodCollectedValue)} collected in this reporting period.
            </div>
          </div>
          <div className="exec-highlight-item">
            <div className="exec-highlight-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CheckCircle2 size={16} />
            </div>
            <div className="exec-highlight-text">
              <strong>Pipeline Health:</strong> {val(data?.openDeals)} active deals worth {money(data?.pipelineValue)} are currently advancing toward closing.
            </div>
          </div>
          <div className="exec-highlight-item">
            <div className="exec-highlight-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <AlertCircle size={16} />
            </div>
            <div className="exec-highlight-text">
              <strong>Operational Workload:</strong> {val(data?.openTasks)} open tasks pending across teams, with {val(data?.overdueTasks)} items flagged overdue.
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderSectionSales = () => (
    <section className="exec-section exec-tab-view">
      <div className="exec-section-head">
        <div className="exec-section-title-wrap">
          <h2 className="exec-section-title">Sales &amp; Pipeline Performance</h2>
          <p className="exec-section-sub">Lead conversion, opportunity stage distribution, win/loss trends, and sales metrics.</p>
        </div>
        <div className="exec-stat-capsules">
          <span className="exec-stat-capsule">Lead Conv: <strong style={{ color: '#06b6d4' }}>{pct(data?.conversionRate)}</strong></span>
          <span className="exec-stat-capsule">Win Rate: <strong style={{ color: '#10b981' }}>{pct(data?.winRate)}</strong></span>
          <span className="exec-stat-capsule">Avg Deal: <strong>{money(data?.averageDealSize)}</strong></span>
          <span className="exec-stat-capsule">Won Total: <strong style={{ color: '#10b981' }}>{money(data?.wonRevenueTotal)}</strong></span>
        </div>
      </div>

      <div className="exec-bento-grid">
        {/* Sales Execution & Metrics */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Commercial Execution Matrix</h3>
                <p className="exec-panel-sub">Performance velocity and pipeline generation</p>
              </div>
              <span className="exec-panel-badge"><Award size={13} /> Performance</span>
            </div>

            {loading ? (
              <div className="exec-chart-container exec-empty-state">
                <div className="exec-shimmer" style={{ width: '100%', height: 160 }} />
              </div>
            ) : salesByOwner && salesByOwner.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="exec-table-compact">
                  <thead>
                    <tr>
                      <th>Sales Rep</th>
                      <th style={{ textAlign: 'center' }}>Won Deals</th>
                      <th style={{ textAlign: 'right' }}>Won Revenue</th>
                      <th style={{ textAlign: 'right' }}>Open Pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByOwner.map((rep: any, idx: number) => (
                      <tr key={rep.name || idx}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: PALETTE[idx % PALETTE.length],
                            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.62rem', fontWeight: 800
                          }}>
                            {idx + 1}
                          </span>
                          {rep.name}
                        </td>
                        <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{rep.wonDeals}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmt$(rep.wonValue)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt$(rep.pipelineValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="exec-breakdown-list">
                <div className="exec-breakdown-row">
                  <div className="exec-breakdown-left">
                    <Briefcase size={14} color="#6366f1" />
                    <span className="exec-breakdown-label">Active Commercial Pipeline</span>
                  </div>
                  <div className="exec-breakdown-right">
                    <span className="exec-breakdown-count">{val(data?.openDeals)} deals</span>
                    <span className="exec-breakdown-val">{money(data?.pipelineValue)}</span>
                  </div>
                </div>
                <div className="exec-breakdown-row">
                  <div className="exec-breakdown-left">
                    <CheckCircle2 size={14} color="#10b981" />
                    <span className="exec-breakdown-label">Realized Closed-Won Deals</span>
                  </div>
                  <div className="exec-breakdown-right">
                    <span className="exec-breakdown-count">{val(data?.wonDealsCount)} won</span>
                    <span className="exec-breakdown-val" style={{ color: '#10b981', fontWeight: 700 }}>{money(data?.wonRevenueTotal)}</span>
                  </div>
                </div>
                <div className="exec-breakdown-row">
                  <div className="exec-breakdown-left">
                    <Target size={14} color="#06b6d4" />
                    <span className="exec-breakdown-label">Lead Qualification Velocity</span>
                  </div>
                  <div className="exec-breakdown-right">
                    <span className="exec-breakdown-count">{val(data?.qualifiedLeads)} / {val(data?.totalLeads)}</span>
                    <span className="exec-breakdown-val">{pct(data?.conversionRate)}</span>
                  </div>
                </div>
                <div className="exec-breakdown-row">
                  <div className="exec-breakdown-left">
                    <DollarSign size={14} color="#f59e0b" />
                    <span className="exec-breakdown-label">Average Deal Realization</span>
                  </div>
                  <div className="exec-breakdown-right">
                    <span className="exec-breakdown-count">{money(data?.averageDealSize)}</span>
                    <span className="exec-breakdown-val">{pct(data?.winRate)} win</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lead Status Breakdown with Split Layout */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Lead Qualification Status</h3>
                <p className="exec-panel-sub">Breakdown of leads by qualification stage</p>
              </div>
              <span className="exec-panel-badge">{val(data?.totalLeads)} Total</span>
            </div>

            <div className="exec-split-layout">
              <ChartFrame loading={loading} empty={ready && !hasSignal(leadStatus, ['count'])} emptyMessage="No leads recorded" heightClass="exec-chart-container-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={52}
                      paddingAngle={3}
                    >
                      {leadStatus.map((entry: any, index: number) => (
                        <Cell key={`lead-pie-${index}`} fill={STATUS_COLORS[entry.status] || PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={chartTooltipNum} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>

              {/* Lead Status Data Rows */}
              <div className="exec-breakdown-list">
                {leadStatus.map((entry: any, idx: number) => (
                  <div key={entry.status || idx} className="exec-breakdown-row">
                    <div className="exec-breakdown-left">
                      <span className="exec-breakdown-dot" style={{ background: STATUS_COLORS[entry.status] || PALETTE[idx % PALETTE.length] }} />
                      <span className="exec-breakdown-label">{entry.status}</span>
                    </div>
                    <div className="exec-breakdown-right">
                      <span className="exec-breakdown-count">{entry.count}</span>
                      <span className="exec-breakdown-val">
                        {totalLeads > 0 ? `${((entry.count / totalLeads) * 100).toFixed(0)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Won vs Lost Trend */}
        <div className="exec-col-12">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Closed Deal Realization: Won vs Lost</h3>
                <p className="exec-panel-sub">Comparison of won revenue against lost deals over time</p>
              </div>
              <span className="exec-panel-badge">{pct(data?.periodWinRate)} Win Rate</span>
            </div>

            <ChartFrame loading={loading} empty={ready && !hasSignal(wonLostTrend, ['won', 'lost'])} emptyMessage="No closed deals in this date range">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wonLostTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="month" tickFormatter={formatBucket} stroke="#94a3b8" tickLine={false} style={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tickLine={false} width={45} tickFormatter={compactMoney} style={{ fontSize: 11 }} />
                  <Tooltip content={chartTooltipMoney} />
                  <Legend wrapperStyle={{ paddingTop: 6, fontSize: 11 }} />
                  <Bar dataKey="won" name="Won Value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lost" name="Lost Value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </div>
      </div>
    </section>
  );

  const renderSectionCustomers = () => (
    <section className="exec-section exec-tab-view">
      <div className="exec-section-head">
        <div className="exec-section-title-wrap">
          <h2 className="exec-section-title">Customer &amp; Account Portfolio</h2>
          <p className="exec-section-sub">Client portfolio growth, acquisition source channels, and account engagement status.</p>
        </div>
        <div className="exec-stat-capsules">
          <span className="exec-stat-capsule">Total Clients: <strong style={{ color: '#6366f1' }}>{val(data?.totalCustomers)}</strong></span>
          <span className="exec-stat-capsule">New in Period: <strong style={{ color: '#10b981' }}>{val(data?.newCustomers)}</strong></span>
          <span className="exec-stat-capsule">Engaged: <strong style={{ color: '#3b82f6' }}>{val(data?.activeCustomers)}</strong></span>
          <span className="exec-stat-capsule">Companies: <strong>{val(data?.totalCompanies)}</strong></span>
        </div>
      </div>

      <div className="exec-bento-grid">
        {/* Customer Growth Trend */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Customer Acquisition Velocity</h3>
                <p className="exec-panel-sub">New customer accounts onboarded across timeline</p>
              </div>
              <span className="exec-panel-badge">{val(data?.newCustomers)} Onboarded</span>
            </div>

            <ChartFrame loading={loading} empty={ready && !hasSignal(customerGrowth, ['count'])} emptyMessage="No new customer onboarding in this date range">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={customerGrowth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="custGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="month" tickFormatter={formatBucket} stroke="#94a3b8" tickLine={false} style={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tickLine={false} width={35} style={{ fontSize: 11 }} />
                  <Tooltip content={chartTooltipNum} />
                  <Area type="monotone" dataKey="count" name="New Clients" stroke="#6366f1" strokeWidth={2.5} fill="url(#custGrowthGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </div>

        {/* Customer Source Distribution with Split Layout */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Acquisition Channels Attribution</h3>
                <p className="exec-panel-sub">Origin sources of registered customer accounts</p>
              </div>
              <span className="exec-panel-badge">{customersBySource.length} Channels</span>
            </div>

            <div className="exec-split-layout">
              <ChartFrame loading={loading} empty={ready && !hasSignal(customersBySource, ['count'])} emptyMessage="No customer channel data">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={customersBySource}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {customersBySource.map((_: any, index: number) => (
                        <Cell key={`cust-src-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={chartTooltipNum} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>

              {/* Source Breakdown Data Rows */}
              <div className="exec-breakdown-list">
                {customersBySource.map((src: any, idx: number) => (
                  <div key={src.source || idx} className="exec-breakdown-row">
                    <div className="exec-breakdown-left">
                      <span className="exec-breakdown-dot" style={{ background: PALETTE[idx % PALETTE.length] }} />
                      <span className="exec-breakdown-label">{src.source}</span>
                    </div>
                    <div className="exec-breakdown-right">
                      <span className="exec-breakdown-count">{src.count} clients</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderSectionFinancial = () => (
    <section className="exec-section exec-tab-view">
      <div className="exec-section-head">
        <div className="exec-section-title-wrap">
          <h2 className="exec-section-title">Financial &amp; Billing Performance</h2>
          <p className="exec-section-sub">Cashflow realization, invoice status portfolio, outstanding receivables, and collection health.</p>
        </div>
        <div className="exec-stat-capsules">
          <span className="exec-stat-capsule">Collected: <strong style={{ color: '#10b981' }}>{money(data?.totalPaymentsCollected)}</strong></span>
          <span className="exec-stat-capsule">Invoiced: <strong style={{ color: '#6366f1' }}>{money(data?.totalInvoicedValue)}</strong></span>
          <span className="exec-stat-capsule">Outstanding: <strong style={{ color: '#f59e0b' }}>{money(data?.outstandingReceivables)}</strong></span>
          <span className="exec-stat-capsule">Overdue: <strong style={{ color: '#ef4444' }}>{money(data?.overdueValue)}</strong></span>
        </div>
      </div>

      <div className="exec-bento-grid">
        {/* Invoicing vs Payments Bar Chart */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Invoiced vs Payment Receipts Timeline</h3>
                <p className="exec-panel-sub">Periodic billing issued vs realized customer cash payments</p>
              </div>
              <span className="exec-panel-badge">{money(data?.periodCollectedValue)} Collected</span>
            </div>

            <ChartFrame loading={loading} empty={ready && !hasSignal(revenueTrend, ['invoiced', 'collected'])} emptyMessage="No financial transaction records in this range">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                  <XAxis dataKey="month" tickFormatter={formatBucket} stroke="#94a3b8" tickLine={false} style={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tickLine={false} width={45} tickFormatter={compactMoney} style={{ fontSize: 11 }} />
                  <Tooltip content={chartTooltipMoney} />
                  <Legend wrapperStyle={{ paddingTop: 6, fontSize: 11 }} />
                  <Bar dataKey="invoiced" name="Invoices Issued" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" name="Payments Realized" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </div>

        {/* Invoice Status Distribution with Split Layout */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Invoice Portfolio Status</h3>
                <p className="exec-panel-sub">Volume breakdown by payment &amp; settlement status</p>
              </div>
              <span className="exec-panel-badge">{val(data?.totalInvoices)} Invoices</span>
            </div>

            <div className="exec-split-layout">
              <ChartFrame loading={loading} empty={ready && !hasSignal(invoicesByStatus, ['count'])} emptyMessage="No invoice status records">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={invoicesByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {invoicesByStatus.map((entry: any, index: number) => (
                        <Cell key={`inv-stat-${index}`} fill={STATUS_COLORS[entry.status] || PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={chartTooltipNum} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>

              {/* Invoice Status Data Rows */}
              <div className="exec-breakdown-list">
                {invoicesByStatus.map((entry: any, idx: number) => (
                  <div key={entry.status || idx} className="exec-breakdown-row">
                    <div className="exec-breakdown-left">
                      <span className="exec-breakdown-dot" style={{ background: STATUS_COLORS[entry.status] || PALETTE[idx % PALETTE.length] }} />
                      <span className="exec-breakdown-label">{entry.status}</span>
                    </div>
                    <div className="exec-breakdown-right">
                      <span className="exec-breakdown-count">{entry.count} invoices</span>
                      <span className="exec-breakdown-val">{fmt$(entry.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderSectionOperations = () => (
    <section className="exec-section exec-tab-view">
      <div className="exec-section-head">
        <div className="exec-section-title-wrap">
          <h2 className="exec-section-title">Operational &amp; Execution Overview</h2>
          <p className="exec-section-sub">Task completion rates, customer interaction logging, contract lifecycles, and pending deliverables.</p>
        </div>
        <div className="exec-stat-capsules">
          <span className="exec-stat-capsule">Activities: <strong style={{ color: '#3b82f6' }}>{val(data?.totalActivities)}</strong></span>
          <span className="exec-stat-capsule">Open Tasks: <strong>{val(data?.openTasks)}</strong></span>
          <span className="exec-stat-capsule">Overdue: <strong style={{ color: Number(data?.overdueTasks) > 0 ? '#ef4444' : 'inherit' }}>{val(data?.overdueTasks)}</strong></span>
          <span className="exec-stat-capsule">Contracts: <strong style={{ color: '#10b981' }}>{val(data?.activeContracts)}</strong></span>
        </div>
      </div>

      <div className="exec-bento-grid">
        {/* Activity Breakdown with Split Layout */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Customer Touchpoints by Channel</h3>
                <p className="exec-panel-sub">Volume of calls, meetings, emails, and follow-ups executed</p>
              </div>
              <span className="exec-panel-badge">{val(data?.totalActivities)} Total</span>
            </div>

            <div className="exec-split-layout">
              <ChartFrame loading={loading} empty={ready && !hasSignal(activitiesByType, ['count'])} emptyMessage="No activities recorded">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activitiesByType} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="type" stroke="#94a3b8" tickLine={false} style={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tickLine={false} width={30} style={{ fontSize: 10 }} />
                    <Tooltip content={chartTooltipNum} />
                    <Bar dataKey="count" name="Logged Activities" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {activitiesByType.map((_: any, idx: number) => (
                        <Cell key={`act-cell-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>

              {/* Activity Data Rows */}
              <div className="exec-breakdown-list">
                {activitiesByType.map((act: any, idx: number) => (
                  <div key={act.type || idx} className="exec-breakdown-row">
                    <div className="exec-breakdown-left">
                      <span className="exec-breakdown-dot" style={{ background: PALETTE[idx % PALETTE.length] }} />
                      <span className="exec-breakdown-label">{act.type}</span>
                    </div>
                    <div className="exec-breakdown-right">
                      <span className="exec-breakdown-count">{act.count} logged</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contract Status Distribution with Split Layout */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Contract Lifecycle Distribution</h3>
                <p className="exec-panel-sub">Current status of customer agreements &amp; legal contracts</p>
              </div>
              <span className="exec-panel-badge">{money(data?.totalContractValue)} Total Value</span>
            </div>

            <div className="exec-split-layout">
              <ChartFrame loading={loading} empty={ready && !hasSignal(contractsByStatus, ['count'])} emptyMessage="No contracts recorded">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contractsByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {contractsByStatus.map((entry: any, index: number) => (
                        <Cell key={`contract-pie-${index}`} fill={STATUS_COLORS[entry.status] || PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={chartTooltipNum} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>

              {/* Contract Breakdown Data Rows */}
              <div className="exec-breakdown-list">
                {contractsByStatus.map((entry: any, idx: number) => (
                  <div key={entry.status || idx} className="exec-breakdown-row">
                    <div className="exec-breakdown-left">
                      <span className="exec-breakdown-dot" style={{ background: STATUS_COLORS[entry.status] || PALETTE[idx % PALETTE.length] }} />
                      <span className="exec-breakdown-label">{entry.status}</span>
                    </div>
                    <div className="exec-breakdown-right">
                      <span className="exec-breakdown-count">{entry.count} contracts</span>
                      <span className="exec-breakdown-val">{fmt$(entry.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderSectionHealth = () => (
    <section className="exec-section exec-tab-view">
      <div className="exec-section-head">
        <div className="exec-section-title-wrap">
          <h2 className="exec-section-title">System Health, Security &amp; Audit Overview</h2>
          <p className="exec-section-sub">Authentication events, active user sessions, audit trail monitoring, and operational alerts.</p>
        </div>
        <div className="exec-stat-capsules">
          <span className="exec-stat-capsule">Active Users: <strong style={{ color: '#10b981' }}>{val(data?.activeUsersCount)}</strong></span>
          <span className="exec-stat-capsule">Active Sessions: <strong style={{ color: '#6366f1' }}>{val(data?.activeSessionsCount)}</strong></span>
          <span className="exec-stat-capsule">Audit Events: <strong>{val(data?.auditInPeriodCount)}</strong></span>
          <span className="exec-stat-capsule">Auth/Security: <strong style={{ color: '#3b82f6' }}>{val(data?.authEventCount)}</strong></span>
        </div>
      </div>

      <div className="exec-bento-grid">
        {/* Left: System Health, Security & Diagnostic Monitor */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">System Diagnostics &amp; Health Console</h3>
                <p className="exec-panel-sub">Real-time status of security, services, and operational health</p>
              </div>
              <span className="exec-panel-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                ● All Systems Healthy
              </span>
            </div>

            {/* Diagnostic Metrics Matrix */}
            <div className="exec-breakdown-list">
              <div className="exec-breakdown-row">
                <div className="exec-breakdown-left">
                  <Users size={14} color="#10b981" />
                  <span className="exec-breakdown-label">Active User Accounts</span>
                </div>
                <div className="exec-breakdown-right">
                  <span className="exec-breakdown-count">{val(data?.activeUsersCount)} active</span>
                  <span className="exec-breakdown-val">Admin, Manager &amp; Sales</span>
                </div>
              </div>
              <div className="exec-breakdown-row">
                <div className="exec-breakdown-left">
                  <Lock size={14} color="#6366f1" />
                  <span className="exec-breakdown-label">Security &amp; JWT Sessions</span>
                </div>
                <div className="exec-breakdown-right">
                  <span className="exec-breakdown-count">{val(data?.activeSessionsCount)} live</span>
                  <span className="exec-breakdown-val">Encrypted Auth</span>
                </div>
              </div>
              <div className="exec-breakdown-row">
                <div className="exec-breakdown-left">
                  <Database size={14} color="#3b82f6" />
                  <span className="exec-breakdown-label">Database Audit Trail</span>
                </div>
                <div className="exec-breakdown-right">
                  <span className="exec-breakdown-count">{val(data?.auditInPeriodCount)} events</span>
                  <span className="exec-breakdown-val">Synchronized</span>
                </div>
              </div>
              <div className="exec-breakdown-row">
                <div className="exec-breakdown-left">
                  <Cpu size={14} color="#f59e0b" />
                  <span className="exec-breakdown-label">Operational Deliverables</span>
                </div>
                <div className="exec-breakdown-right">
                  <span className="exec-breakdown-count">
                    {alerts.length > 0 ? `${alerts.length} attention item(s)` : '0 Critical Flags'}
                  </span>
                  <span className="exec-breakdown-val" style={{ color: alerts.length > 0 ? '#f59e0b' : '#10b981' }}>
                    {alerts.length > 0 ? 'Review Needed' : 'Optimal'}
                  </span>
                </div>
              </div>
            </div>

            {/* If alerts exist, show them right below */}
            {alerts.length > 0 && (
              <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {alerts.map((alt: any, idx: number) => (
                  <div key={idx} className={`exec-alert-item ${alt.severity || 'info'}`} style={{ padding: '0.55rem 0.75rem' }}>
                    <div className="exec-alert-left">
                      {alt.severity === 'critical' ? (
                        <AlertTriangle size={15} color="#ef4444" />
                      ) : alt.severity === 'warning' ? (
                        <AlertCircle size={15} color="#f59e0b" />
                      ) : (
                        <Info size={15} color="#3b82f6" />
                      )}
                      <div>
                        <div className="exec-alert-title">{alt.label}</div>
                        <div className="exec-alert-sub">{alt.detail}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {alt.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Audit Trail Stream */}
        <div className="exec-col-6">
          <div className="exec-panel-box">
            <div className="exec-panel-head">
              <div>
                <h3 className="exec-panel-title">Live System Audit Trail</h3>
                <p className="exec-panel-sub">Recent changes, user transactions, and security actions</p>
              </div>
              <span className="exec-panel-badge">Real-Time</span>
            </div>

            {loading ? (
              <div className="exec-chart-container exec-empty-state">
                <div className="exec-shimmer" style={{ width: '100%', height: 160 }} />
              </div>
            ) : recentAudit.length === 0 ? (
              <div className="exec-chart-container">
                <EmptyBlock message="No recent audit events recorded" />
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="exec-table-compact">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>User</th>
                      <th style={{ textAlign: 'right' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAudit.map((log: any, idx: number) => (
                      <tr key={log.auditLogId || idx}>
                        <td>
                          <span style={{
                            display: 'inline-flex', padding: '2px 7px', borderRadius: 5,
                            fontSize: '0.7rem', fontWeight: 700,
                            background: log.action === 'Create' ? 'rgba(16, 185, 129, 0.15)' :
                                        log.action === 'Delete' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                            color: log.action === 'Create' ? '#10b981' :
                                   log.action === 'Delete' ? '#ef4444' : '#6366f1'
                          }}>
                            {log.action || 'Update'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.entity}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{log.user}</td>
                        <td style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {log.time ? new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Master Executive Header */}
        <ReportHeader
          title="Executive Report Overview"
          description="Consolidated commercial intelligence across revenue, customer accounts, sales pipeline, operations, and system health."
          badge="LIVE INTELLIGENCE"
          activePreset={activePreset}
          startDate={startDate}
          endDate={endDate}
          onPresetChange={handlePresetChange}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchOverview}
          onExportPDF={data ? handleExportPDF : undefined}
          onExportCSV={data ? handleExportCSV : undefined}
          loading={loading}
        />

        {/* Executive Segmented Navigation Tabs */}
        <nav className="exec-jump" aria-label="Overview tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`exec-jump-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Global Error Banner */}
        {error && !loading && (
          <div className="exec-error-box">
            <AlertTriangle size={24} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Unable to load overview report data</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{error}</p>
            <button type="button" className="clean-btn-primary" onClick={fetchOverview} style={{ marginTop: '0.5rem' }}>
              <RefreshCw size={14} /> Retry Connection
            </button>
          </div>
        )}

        {/* Active Tab View Display */}
        {!error && (
          <div className="exec-dash">
            {activeTab === 'executive' && renderSectionExecutive()}
            {activeTab === 'sales' && renderSectionSales()}
            {activeTab === 'customers' && renderSectionCustomers()}
            {activeTab === 'financial' && renderSectionFinancial()}
            {activeTab === 'operations' && renderSectionOperations()}
            {activeTab === 'health' && renderSectionHealth()}
            {activeTab === 'all' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {renderSectionExecutive()}
                {renderSectionSales()}
                {renderSectionCustomers()}
                {renderSectionFinancial()}
                {renderSectionOperations()}
                {renderSectionHealth()}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReportsOverviewScreen;
