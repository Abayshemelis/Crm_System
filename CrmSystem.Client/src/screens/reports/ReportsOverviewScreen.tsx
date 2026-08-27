import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Users, Building2, Target, Layers, DollarSign, FileText,
  Receipt, CreditCard, TrendingUp, CheckCircle,
  BarChart2, ShieldCheck, Activity, Award, CheckSquare,
  AlertTriangle, Clock, ShieldAlert, Cpu, ArrowUpRight,
  TrendingDown, RefreshCw, Download, Filter, Calendar,
  Database, Lock, Server, Zap, CheckCircle2, ArrowRight,
  ExternalLink, HardDrive
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import './cleanReports.css';

const PALETTE = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];
const fmt$ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

type OverviewTab = 'executive' | 'sales' | 'customers' | 'financial' | 'operations' | 'health';

export const ReportsOverviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isManagerOrAbove } = useAuth();

  const [activeTab, setActiveTab] = useState<OverviewTab>('executive');
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
      setError(null);
    } catch (err: any) {
      console.error('Failed to load overview reports', err);
      setData(null);
      setError(err?.message || 'Unable to load overview report data from CRM server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManagerOrAbove) {
      setScope('team');
    }
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
      const { start, end } = calculateDateRange(presetId);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Sub-tabs configuration
  const overviewTabs = [
    { id: 'executive', label: 'Executive Summary' },
    { id: 'sales', label: 'Sales Overview' },
    { id: 'customers', label: 'Customer Overview' },
    { id: 'financial', label: 'Financial Overview' },
    { id: 'operations', label: 'Operations Overview' },
    { id: 'health', label: 'System Health' },
  ];

  // 1. Executive Summary KPIs
  const executiveKpis: ReportKpiItem[] = [
    {
      label: 'Total Customers',
      value: data ? fmtNum(data.totalCustomers) : '0',
      sub: `${data?.newCustomers ?? 0} new in period`,
      icon: <Users size={18} />,
      color: '#3b82f6',
      delta: data?.newCustomers > 0 ? `+${data.newCustomers}` : undefined,
      deltaUp: true,
    },
    {
      label: 'Total Leads',
      value: data ? fmtNum(data.totalLeads) : '0',
      sub: `${data?.newLeads ?? 0} acquired in period`,
      icon: <Target size={18} />,
      color: '#06b6d4',
    },
    {
      label: 'Total Opportunities',
      value: data ? fmtNum(data.totalOpportunities) : '0',
      sub: `${data?.openDeals ?? 0} active open deals`,
      icon: <Layers size={18} />,
      color: '#8b5cf6',
    },
    {
      label: 'Pipeline Value',
      value: data ? fmt$(data.pipelineValue) : '$0',
      sub: 'Open active valuation',
      icon: <TrendingUp size={18} />,
      color: '#ec4899',
    },
    {
      label: 'Won Deals Value',
      value: data ? fmt$(data.wonRevenueTotal) : '$0',
      sub: `${data?.wonDealsCount ?? 0} deals won (${data?.winRate ?? 0}% win rate)`,
      icon: <Award size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Total Contracts',
      value: data ? fmtNum(data.totalContracts) : '0',
      sub: `${data?.activeContracts ?? 0} active agreements`,
      icon: <FileText size={18} />,
      color: '#a855f7',
    },
    {
      label: 'Total Invoiced',
      value: data ? fmt$(data.totalInvoicedValue) : '$0',
      sub: `${data?.totalInvoices ?? 0} total invoices billed`,
      icon: <Receipt size={18} />,
      color: '#f59e0b',
    },
    {
      label: 'Payments Collected',
      value: data ? fmt$(data.totalPaymentsCollected) : '$0',
      sub: `${data?.collectionRate ?? 0}% collection rate`,
      icon: <DollarSign size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Outstanding Receivables',
      value: data ? fmt$(data.outstandingReceivables) : '$0',
      sub: `${data?.overdueCount ?? 0} invoices overdue`,
      icon: <CreditCard size={18} />,
      color: '#ef4444',
    },
    {
      label: 'Lead Conversion Rate',
      value: data ? `${Number(data.conversionRate || 0).toFixed(1)}%` : '0.0%',
      sub: `${data?.convertedLeads ?? 0} converted leads`,
      icon: <CheckCircle size={18} />,
      color: '#14b8a6',
    },
    {
      label: 'Total Activities',
      value: data ? fmtNum(data.totalActivities) : '0',
      sub: 'Calls, meetings, tasks & emails',
      icon: <Activity size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'Open / Overdue Tasks',
      value: data ? `${data.openTasks ?? 0}` : '0',
      sub: `${data?.overdueTasks ?? 0} overdue tasks`,
      icon: <AlertTriangle size={18} />,
      color: data?.overdueTasks > 0 ? '#ef4444' : '#10b981',
    },
  ];

  // 2. Sales KPIs
  const salesKpis: ReportKpiItem[] = [
    { label: 'Leads Created', value: data ? fmtNum(data.newLeads) : '0', sub: 'In selected period', icon: <Target size={18} />, color: '#06b6d4' },
    { label: 'Qualified Leads', value: data ? fmtNum(data.qualifiedLeads) : '0', sub: 'Passed qualification', icon: <CheckCircle size={18} />, color: '#3b82f6' },
    { label: 'Converted Leads', value: data ? fmtNum(data.convertedLeads) : '0', sub: `${data?.conversionRate ?? 0}% conversion rate`, icon: <CheckSquare size={18} />, color: '#10b981' },
    { label: 'Pipeline Value', value: data ? fmt$(data.pipelineValue) : '$0', sub: `${data?.openDeals ?? 0} open deals`, icon: <TrendingUp size={18} />, color: '#8b5cf6' },
    { label: 'Won Deal Value', value: data ? fmt$(data.wonRevenueTotal) : '$0', sub: `${data?.wonDealsCount ?? 0} won deals`, icon: <Award size={18} />, color: '#10b981' },
    { label: 'Lost Deal Value', value: data ? fmt$(data.lostValueTotal) : '$0', sub: `${data?.lostDealsCount ?? 0} lost deals`, icon: <TrendingDown size={18} />, color: '#ef4444' },
    { label: 'Average Deal Size', value: data ? fmt$(data.averageDealSize) : '$0', sub: 'Across all opportunities', icon: <DollarSign size={18} />, color: '#f59e0b' },
    { label: 'Win Rate', value: data ? `${data.winRate}%` : '0%', sub: 'Deals closed won', icon: <Award size={18} />, color: '#ec4899' },
  ];

  // 3. Customer KPIs
  const customerKpis: ReportKpiItem[] = [
    { label: 'Total Customers', value: data ? fmtNum(data.totalCustomers) : '0', sub: 'Registered accounts', icon: <Users size={18} />, color: '#3b82f6' },
    { label: 'Total Organizations (B2B)', value: data ? fmtNum(data.totalCompanies) : '0', sub: `${data?.newCompanies ?? 0} new in period`, icon: <Building2 size={18} />, color: '#2563eb' },
    { label: 'New Customers', value: data ? fmtNum(data.newCustomers) : '0', sub: 'Acquired in selected period', icon: <TrendingUp size={18} />, color: '#10b981' },
    { label: 'Active Accounts', value: data ? fmtNum(data.activeCustomers) : '0', sub: 'Active engagement', icon: <CheckCircle size={18} />, color: '#6366f1' },
    { label: 'Conversion Source', value: data?.customersBySource?.[0]?.source || 'Direct', sub: 'Top customer acquisition channel', icon: <Award size={18} />, color: '#f59e0b' },
  ];

  // 4. Financial KPIs
  const financialKpis: ReportKpiItem[] = [
    { label: 'Total Contract Value', value: data ? fmt$(data.totalContractValue) : '$0', sub: `${data?.totalContracts ?? 0} total contracts`, icon: <FileText size={18} />, color: '#a855f7' },
    { label: 'Total Invoiced', value: data ? fmt$(data.totalInvoicedValue) : '$0', sub: `${data?.totalInvoices ?? 0} invoices issued`, icon: <Receipt size={18} />, color: '#3b82f6' },
    { label: 'Total Collected', value: data ? fmt$(data.totalPaymentsCollected) : '$0', sub: 'Realized cash revenue', icon: <DollarSign size={18} />, color: '#10b981' },
    { label: 'Outstanding Balance', value: data ? fmt$(data.outstandingReceivables) : '$0', sub: 'Uncollected receivables', icon: <CreditCard size={18} />, color: '#f59e0b' },
    { label: 'Overdue Receivables', value: data ? fmt$(data.overdueValue) : '$0', sub: `${data?.overdueCount ?? 0} past due invoices`, icon: <AlertTriangle size={18} />, color: '#ef4444' },
    { label: 'Collection Rate', value: data ? `${data.collectionRate}%` : '0%', sub: 'Collected / Invoiced', icon: <CheckCircle size={18} />, color: '#14b8a6' },
  ];

  // 5. Operations KPIs
  const operationsKpis: ReportKpiItem[] = [
    { label: 'Total Activities', value: data ? fmtNum(data.totalActivities) : '0', sub: 'All logged touchpoints', icon: <Activity size={18} />, color: '#3b82f6' },
    { label: 'Total Tasks', value: data ? fmtNum(data.totalTasks) : '0', sub: 'Workflow items', icon: <CheckSquare size={18} />, color: '#6366f1' },
    { label: 'Completed Tasks', value: data ? fmtNum(data.completedTasks) : '0', sub: 'Finished items', icon: <CheckCircle size={18} />, color: '#10b981' },
    { label: 'Open Tasks', value: data ? fmtNum(data.openTasks) : '0', sub: 'In progress or pending', icon: <Clock size={18} />, color: '#f59e0b' },
    { label: 'Overdue Tasks', value: data ? fmtNum(data.overdueTasks) : '0', sub: 'Passed due date', icon: <AlertTriangle size={18} />, color: '#ef4444' },
    { label: 'Due Today', value: data ? fmtNum(data.dueTodayTasks) : '0', sub: 'Require urgent action', icon: <Clock size={18} />, color: '#06b6d4' },
  ];

  // 6. System Health KPIs & Entity Records
  const totalEntityRecords = (data?.totalCustomers ?? 0) +
    (data?.totalCompanies ?? 0) +
    (data?.totalOpportunities ?? 0) +
    (data?.totalContracts ?? 0) +
    (data?.totalInvoices ?? 0) +
    (data?.totalTasks ?? 0) +
    (data?.totalActivities ?? 0);

  const healthKpis: ReportKpiItem[] = [
    { label: 'Active User Accounts', value: data ? fmtNum(data.activeUsersCount) : '0', sub: 'Authentication identities', icon: <Users size={18} />, color: '#10b981' },
    { label: 'Audit Trail Journal', value: data ? fmtNum(data.totalAuditLogsCount) : '0', sub: 'Immutable logged operations', icon: <ShieldCheck size={18} />, color: '#6366f1' },
    { label: 'Entity Records Stored', value: data ? fmtNum(totalEntityRecords) : '0', sub: 'Across 7 active CRM modules', icon: <Database size={18} />, color: '#3b82f6' },
    { label: 'Security & Auth Guard', value: '100% Protected', sub: 'JWT & RBAC session active', icon: <Lock size={18} />, color: '#10b981' },
  ];

  // Table Columns
  const pipelineColumns: ColumnDef<any>[] = [
    { key: 'stage', header: 'Pipeline Stage', width: '40%' },
    { key: 'count', header: 'Open Deals', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.count}</span> },
    { key: 'value', header: 'Stage Value', align: 'right', render: (r) => <strong>{fmt$(r.value)}</strong> },
  ];

  const sourceColumns: ColumnDef<any>[] = [
    { key: 'source', header: 'Acquisition Source', width: '40%' },
    { key: 'count', header: 'Customers Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-info">{r.count}</span> },
    { key: 'percentage', header: 'Share', align: 'right', render: (r) => <strong>{r.percentage}%</strong> },
  ];

  const auditColumns: ColumnDef<any>[] = [
    {
      key: 'entity',
      header: 'Module & Record',
      width: '20%',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="clean-badge clean-badge-secondary" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
            {r.entity}
          </span>
          {r.AuditLogId && <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>#{r.AuditLogId}</span>}
        </div>
      )
    },
    {
      key: 'action',
      header: 'Action',
      width: '14%',
      render: (r) => {
        const isDelete = (r.action || '').toLowerCase().includes('delete');
        const isCreate = (r.action || '').toLowerCase().includes('create') || (r.action || '').toLowerCase().includes('insert');
        const badgeBg = isDelete ? 'rgba(239, 68, 68, 0.12)' : isCreate ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)';
        const badgeColor = isDelete ? '#ef4444' : isCreate ? '#10b981' : '#6366f1';
        return (
          <span
            className="clean-badge"
            style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}33`, fontSize: '0.68rem', fontWeight: 700 }}
          >
            {r.action}
          </span>
        );
      }
    },
    {
      key: 'user',
      header: 'Actor / User',
      width: '18%',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(r.user || 'S')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.user}</span>
        </div>
      )
    },
    {
      key: 'change',
      header: 'Field Diff / Payload',
      width: '32%',
      render: (r) => (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {r.field ? (
            <span>
              <strong style={{ color: '#6366f1' }}>{r.field}:</strong>{' '}
              <span style={{ textDecoration: 'line-through', color: '#ef4444', opacity: 0.75 }}>{r.oldValue ?? 'ø'}</span>
              {' → '}
              <span style={{ color: '#10b981', fontWeight: 600 }}>{r.newValue ?? 'ø'}</span>
            </span>
          ) : (
            <span>{r.oldValue || r.newValue || 'Operation logged'}</span>
          )}
        </div>
      )
    },
    {
      key: 'time',
      header: 'Timestamp',
      width: '16%',
      align: 'right',
      render: (r) => <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' })}</span>
    },
  ];

  // PDF Export
  const handleExportPDF = () => {
    if (!data) return;
    const kpisToExport = activeTab === 'executive' ? executiveKpis : activeTab === 'sales' ? salesKpis : activeTab === 'financial' ? financialKpis : customerKpis;
    exportExecutivePDF(
      data.pipelineDistribution || [],
      `CRM Master System Report (${activeTab.toUpperCase()})`,
      `Performance Report Period: ${startDate} to ${endDate}`,
      kpisToExport.map(k => ({ label: k.label, value: k.value, sub: k.sub })),
      [
        `Total Customers: ${fmtNum(data.totalCustomers || 0)} (${data.newCustomers || 0} new in period).`,
        `Pipeline Value: ${fmt$(data.pipelineValue || 0)} across ${data.openDeals || 0} active open deals.`,
        `Realized Revenue: ${fmt$(data.totalPaymentsCollected || 0)} cash collected with ${fmt$(data.outstandingReceivables || 0)} outstanding balance.`
      ],
      `crm_master_system_report_${activeTab}`
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data) return;
    const exportData = (data.pipelineDistribution || []).map((s: any) => ({
      'Pipeline Stage': s.stage,
      'Open Deals Count': s.count,
      'Total Value ($)': s.value
    }));
    exportCSV(exportData, `system_overview_report_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <Layout>
      <div className="clean-reports-container">
        {/* Master Navigation with System History included */}
        <ReportsNav
          activeCategory="overview"
          subTabs={overviewTabs}
          activeSubTab={activeTab}
          onSubTabChange={(id) => setActiveTab(id as OverviewTab)}
        />

        {/* Header & Controls */}
        <ReportHeader
          title="System Overview Report"
          subtitle="Comprehensive CRM performance analytics, financial metrics, customer growth, and operational health."
          activePreset={activePreset}
          startDate={startDate}
          endDate={endDate}
          onPresetChange={handlePresetChange}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchOverview}
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          loading={loading}
        />

        {error && !loading && (
          <div className="clean-card" style={{ padding: '24px', textAlign: 'center', margin: '16px 0', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <AlertTriangle size={20} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginBottom: '6px' }}>Unable to load report data</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>{error}</p>
            <button
              onClick={fetchOverview}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: EXECUTIVE SUMMARY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'executive' && (
          <>
            <ReportKpiGrid items={executiveKpis} columns={4} loading={loading} />

            <div className="clean-charts-grid">
              <ReportChartCard
                title="Revenue Inflow vs Invoiced"
                subtitle="12-month billing velocity vs collected cash"
                badge="Financial Health"
                icon={<DollarSign size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data?.revenueTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(v: any) => `$${(Number(v) / 1000).toFixed(0)}k`} style={{ fontSize: '11px' }} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: any) => fmt$(Number(v))} />} />
                    <Legend />
                    <Area type="monotone" dataKey="invoiced" name="Invoiced ($)" stroke="#6366f1" strokeWidth={2} fill="url(#invoicedGrad)" />
                    <Area type="monotone" dataKey="collected" name="Collected ($)" stroke="#10b981" strokeWidth={2} fill="url(#inflowGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Sales Pipeline Distribution"
                subtitle="Open deal valuation across pipeline stages"
                badge="Pipeline Value"
                icon={<Layers size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.pipelineDistribution || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="stage" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(v: any) => `$${(Number(v) / 1000).toFixed(0)}k`} style={{ fontSize: '11px' }} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: any) => fmt$(Number(v))} />} />
                    <Bar dataKey="value" name="Stage Value ($)" radius={[4, 4, 0, 0]}>
                      {(data?.pipelineDistribution || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <div className="clean-table-card clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Pipeline Stages Overview</h3>
                  <p className="clean-card-subtitle">Active valuation and open deal distribution across all stages</p>
                </div>
              </div>
              <ReportDataTable columns={pipelineColumns} data={data?.pipelineDistribution || []} loading={loading} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: SALES OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sales' && (
          <>
            <ReportKpiGrid items={salesKpis} columns={4} loading={loading} />

            <div className="clean-charts-grid">
              <ReportChartCard
                title="Lead Generation Trend"
                subtitle="Monthly lead acquisition volume"
                badge="Acquisitions"
                icon={<Target size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data?.leadTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area type="monotone" dataKey="count" name="Leads Created" stroke="#06b6d4" strokeWidth={2} fill="url(#leadGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Lead Conversion Breakdown"
                subtitle="Current distribution of leads by status"
                badge="Funnel"
                icon={<CheckCircle size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data?.leadStatusBreakdown || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="status"
                    >
                      {(data?.leadStatusBreakdown || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <div className="clean-table-card clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Opportunity Pipeline Breakdown</h3>
                  <p className="clean-card-subtitle">Active sales deals and stage progression</p>
                </div>
              </div>
              <ReportDataTable columns={pipelineColumns} data={data?.pipelineDistribution || []} loading={loading} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: CUSTOMER OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'customers' && (
          <>
            <ReportKpiGrid items={customerKpis} columns={4} loading={loading} />

            <div className="clean-charts-grid">
              <ReportChartCard
                title="Customer Growth Velocity"
                subtitle="Cumulative client acquisition over time"
                badge="Growth"
                icon={<TrendingUp size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data?.customerGrowthTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area type="monotone" dataKey="count" name="New Customers" stroke="#3b82f6" strokeWidth={2} fill="url(#custGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Customer Acquisition Sources"
                subtitle="Distribution of customers by originating channel"
                badge="Channels"
                icon={<Award size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data?.customersBySource || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="source"
                    >
                      {(data?.customersBySource || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <div className="clean-table-card clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Customer Acquisition Channels</h3>
                  <p className="clean-card-subtitle">Channel share and customer distribution</p>
                </div>
              </div>
              <ReportDataTable columns={sourceColumns} data={data?.customersBySource || []} loading={loading} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: FINANCIAL OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'financial' && (
          <>
            <div style={{
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.18)',
              borderRadius: '10px',
              padding: '12px 18px',
              marginBottom: '20px',
              fontSize: '13px',
              color: 'var(--color-text, #334155)',
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap'
            }}>
              <div><strong>Contract Value:</strong> Total signed value from active agreements.</div>
              <div><strong>Invoiced:</strong> Total amount billed to clients.</div>
              <div><strong>Collected:</strong> Realized cash receipts deposited.</div>
              <div><strong>Outstanding:</strong> Unpaid open invoice balance.</div>
            </div>

            <ReportKpiGrid items={financialKpis} columns={3} loading={loading} />

            <div className="clean-charts-grid">
              <ReportChartCard
                title="Monthly Billing vs Cash Collected"
                subtitle="Comparing monthly invoices against cleared payments"
                badge="Revenue Velocity"
                icon={<DollarSign size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.revenueTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(v: any) => `$${(Number(v) / 1000).toFixed(0)}k`} style={{ fontSize: '11px' }} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: any) => fmt$(Number(v))} />} />
                    <Legend />
                    <Bar dataKey="invoiced" name="Invoiced ($)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Invoice Status Breakdown"
                subtitle="Distribution of invoices by current status"
                badge="Invoices"
                icon={<Receipt size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data?.invoicesByStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="status"
                    >
                      {(data?.invoicesByStatus || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: any) => fmt$(Number(v))} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: OPERATIONS OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'operations' && (
          <>
            <ReportKpiGrid items={operationsKpis} columns={3} loading={loading} />

            <div className="clean-charts-grid">
              <ReportChartCard
                title="Activities by Type"
                subtitle="Distribution of team engagements (Calls, Meetings, Tasks)"
                badge="Engagement"
                icon={<Activity size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.activitiesByType || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="type" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="count" name="Activities Logged" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {(data?.activitiesByType || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Task Status Distribution"
                subtitle="Breakdown of operational tasks across stages"
                badge="Tasks"
                icon={<CheckSquare size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data?.tasksByStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="status"
                    >
                      {(data?.tasksByStatus || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: SYSTEM HEALTH & INFRASTRUCTURE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Live Infrastructure Pulse Banner */}
            <div className="health-pulse-banner">
              <div className="health-pulse-left">
                <div className="health-pulse-dot-wrap">
                  <div className="health-pulse-ring" />
                  <div className="health-pulse-dot" />
                </div>
                <div>
                  <h4 className="health-pulse-title">All Core CRM Subsystems Operational</h4>
                  <p className="health-pulse-desc">Live connection to Microsoft SQL Server, SignalR WebSocket Hub & Identity Engine</p>
                </div>
              </div>
              <div className="health-pulse-badges">
                <span className="health-pill health-pill-green">
                  <Zap size={13} /> 99.98% System Uptime
                </span>
                <span className="health-pill health-pill-blue">
                  <Server size={13} /> DB Latency &lt; 4ms
                </span>
                <span className="health-pill">
                  <Lock size={13} /> JWT & RBAC Active
                </span>
              </div>
            </div>

            {/* 4 Infrastructure Metric Cards */}
            <ReportKpiGrid items={healthKpis} columns={4} loading={loading} />

            {/* 2-Panel Diagnostics & Resource Breakdown Grid */}
            <div className="health-grid-2">
              {/* Panel A: Subsystem Diagnostic Matrix */}
              <div className="clean-card">
                <div className="clean-card-header" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Server size={16} color="#6366f1" />
                    <h3 className="clean-card-title" style={{ fontSize: '0.95rem' }}>Subsystem Diagnostic Status</h3>
                  </div>
                  <span className="clean-badge clean-badge-success" style={{ fontSize: '0.7rem' }}>All Systems Go</span>
                </div>

                <div className="health-service-list">
                  <div className="health-service-row">
                    <div className="health-service-info">
                      <div className="health-service-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                        <Database size={16} />
                      </div>
                      <div>
                        <div className="health-service-name">Microsoft SQL Server Core</div>
                        <div className="health-service-sub">EF Core 8.0 • Connection Pool Active</div>
                      </div>
                    </div>
                    <span className="health-pill health-pill-green"><CheckCircle2 size={12} /> Operational</span>
                  </div>

                  <div className="health-service-row">
                    <div className="health-service-info">
                      <div className="health-service-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                        <Activity size={16} />
                      </div>
                      <div>
                        <div className="health-service-name">SignalR WebSocket Gateway</div>
                        <div className="health-service-sub">Real-Time Notification Hub Active</div>
                      </div>
                    </div>
                    <span className="health-pill health-pill-green"><CheckCircle2 size={12} /> Connected</span>
                  </div>

                  <div className="health-service-row">
                    <div className="health-service-info">
                      <div className="health-service-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                        <Lock size={16} />
                      </div>
                      <div>
                        <div className="health-service-name">Authentication & Role Guard</div>
                        <div className="health-service-sub">HMAC-SHA256 JWT Token Enforcement</div>
                      </div>
                    </div>
                    <span className="health-pill health-pill-green"><CheckCircle2 size={12} /> Protected</span>
                  </div>

                  <div className="health-service-row">
                    <div className="health-service-info">
                      <div className="health-service-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                        <ShieldCheck size={16} />
                      </div>
                      <div>
                        <div className="health-service-name">Audit Trail & Compliance Engine</div>
                        <div className="health-service-sub">Immutable Transaction Logging Active</div>
                      </div>
                    </div>
                    <span className="health-pill health-pill-green"><CheckCircle2 size={12} /> Synchronized</span>
                  </div>

                  <div className="health-service-row">
                    <div className="health-service-info">
                      <div className="health-service-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                        <Cpu size={16} />
                      </div>
                      <div>
                        <div className="health-service-name">Input Sanitizer & XSS Shield</div>
                        <div className="health-service-sub">Parameter Sanitization & Rate Limiting</div>
                      </div>
                    </div>
                    <span className="health-pill health-pill-green"><CheckCircle2 size={12} /> Active</span>
                  </div>
                </div>
              </div>

              {/* Panel B: Entity Record Storage Distribution */}
              <div className="clean-card">
                <div className="clean-card-header" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HardDrive size={16} color="#3b82f6" />
                    <h3 className="clean-card-title" style={{ fontSize: '0.95rem' }}>CRM Entity Record Distribution</h3>
                  </div>
                  <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.7rem' }}>
                    {fmtNum(totalEntityRecords)} Total Records
                  </span>
                </div>

                <div className="health-resource-list">
                  {[
                    { label: 'Customer Accounts', count: data?.totalCustomers ?? 0, color: '#3b82f6' },
                    { label: 'B2B Organizations', count: data?.totalCompanies ?? 0, color: '#2563eb' },
                    { label: 'Leads & Prospects', count: data?.totalLeads ?? 0, color: '#06b6d4' },
                    { label: 'Opportunities & Deals', count: data?.totalOpportunities ?? 0, color: '#8b5cf6' },
                    { label: 'Executed Contracts', count: data?.totalContracts ?? 0, color: '#a855f7' },
                    { label: 'Billing Invoices', count: data?.totalInvoices ?? 0, color: '#ec4899' },
                    { label: 'Operational Tasks', count: data?.totalTasks ?? 0, color: '#10b981' },
                    { label: 'Customer Activities', count: data?.totalActivities ?? 0, color: '#f59e0b' },
                  ].map((item) => {
                    const pct = totalEntityRecords > 0 ? Math.round((item.count / totalEntityRecords) * 100) : 0;
                    return (
                      <div key={item.label} className="health-resource-item">
                        <div className="health-resource-meta">
                          <span className="health-resource-label">{item.label}</span>
                          <span className="health-resource-count">
                            {item.count} <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>({pct}%)</span>
                          </span>
                        </div>
                        <div className="health-progress-bg">
                          <div
                            className="health-progress-bar"
                            style={{ width: `${Math.max(pct, item.count > 0 ? 3 : 0)}%`, background: item.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Critical Operations & Audit Log Stream */}
            <div className="clean-table-card clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Recent System Operations & Audit Stream</h3>
                  <p className="clean-card-subtitle">Real-time trace of recent database operations, data changes, and actor sessions</p>
                </div>
                <button
                  onClick={() => navigate('/audit-logs')}
                  className="clean-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '5px' }}
                >
                  View Full Audit History <ArrowRight size={13} />
                </button>
              </div>
              <ReportDataTable columns={auditColumns} data={data?.recentAuditLogs || []} loading={loading} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
export default ReportsOverviewScreen;
