import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  Users, UserCheck, UserX, TrendingUp, Building2,
  Phone, Mail, Calendar, Activity, DollarSign
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem, ReportSummaryBanner } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import { formatCurrencyGlobal } from '../../context/SystemProfileContext';
import './cleanReports.css';

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#6366f1'];
const fmt$ = (v: number) => formatCurrencyGlobal(v, undefined, 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);

export const CustomerReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'growth' | 'status' | 'sources' | 'activity'>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'growth',   label: 'Growth' },
    { id: 'status',   label: 'Status' },
    { id: 'sources',  label: 'Sources' },
    { id: 'activity', label: 'Activity' },
  ];

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (sourceFilter) q.append('sourceId', sourceFilter);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/customers?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load customer reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [startDate, endDate, scope, sourceFilter]);

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
      label: 'Total Customers',
      value: data ? fmtNum(data.totalCustomers) : '0',
      sub: 'All registered accounts',
      icon: <Users size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'New Customers',
      value: data ? fmtNum(data.newCustomers) : '0',
      sub: 'Acquired in selected period',
      icon: <TrendingUp size={18} />,
      color: '#10b981',
      delta: data?.growthRate > 0 ? `+${data.growthRate}%` : undefined,
      deltaUp: true,
    },
    {
      label: 'Active Accounts',
      value: data ? fmtNum(data.activeCustomers) : '0',
      sub: 'With transactions / recent contact',
      icon: <UserCheck size={18} />,
      color: '#6366f1',
    },
    {
      label: 'Inactive Accounts',
      value: data ? fmtNum(data.inactiveCustomers) : '0',
      sub: 'No recent activity recorded',
      icon: <UserX size={18} />,
      color: '#94a3b8',
    },
    {
      label: 'Corporate Accounts (B2B)',
      value: data ? fmtNum(data.corporateCount) : '0',
      sub: `${data?.totalCustomers > 0 ? Math.round((data.corporateCount / data.totalCustomers) * 100) : 0}% of portfolio`,
      icon: <Building2 size={18} />,
      color: '#8b5cf6',
    },
  ];

  // Customer table columns
  const customerColumns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.name}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{r.email}</div>
        </div>
      ),
    },
    {
      key: 'companyName',
      header: 'Company',
      render: (r) => (
        <span style={{ color: r.companyName !== '—' ? 'var(--text-primary, #ffffff)' : 'var(--text-muted, #94a3b8)' }}>
          {r.companyName}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (r) => (
        <span className={`clean-badge ${r.status === 'Active' ? 'clean-badge-success' : 'clean-badge-primary'}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: 'sourceName',
      header: 'Source',
      render: (r) => <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{r.sourceName}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.lastActivity ? new Date(r.lastActivity).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right',
      render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.revenue)}</strong>,
    },
  ];

  const sourceOptions = (data?.bySource || []).map((s: any) => ({
    value: s.source,
    label: `${s.source} (${s.count})`,
  }));

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Customers', value: fmtNum(data.totalCustomers), sub: 'Active database' },
      { label: 'New in Period', value: fmtNum(data.newCustomers), sub: `+${data.growthRate}% growth` },
      { label: 'Corporate Accounts', value: fmtNum(data.corporateCount), sub: 'B2B Client Portfolio' },
    ];
    const insights = [
      `Total customer portfolio comprises ${fmtNum(data.totalCustomers)} accounts (${data.corporateCount} Corporate accounts, ${data.individualCount} Individual accounts).`,
      `Recorded ${data.newCustomers} new customer acquisitions during this reporting window.`,
      `Top acquisition channels are driven by ${(data.bySource || []).slice(0, 2).map((s: any) => `${s.source} (${s.count})`).join(', ')}.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Customer Portfolio Report',
      'Client acquisition, retention status, source attribution, and revenue ledger',
      stats,
      insights,
      'crm_customer_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'customer_report_records');
  };

  // Filtered items based on sub-tab
  const displayedItems = useMemo(() => {
    if (!data?.items) return [];
    if (activeSubTab === 'status') {
      return [...data.items].sort((a, b) => a.status.localeCompare(b.status));
    }
    if (activeSubTab === 'sources') {
      return [...data.items].sort((a, b) => a.sourceName.localeCompare(b.sourceName));
    }
    return data.items;
  }, [data, activeSubTab]);

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="customers"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Customer Reports"
          description="Client portfolio analytics, acquisition velocity over time, source breakdown, and account revenue ledger."
          badge="Portfolio"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          sourceOptions={sourceOptions}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchCustomerData}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          loading={loading}
        />

        {/* ── 3. Summary Banner ────────────────────────────────────────────────── */}
        <ReportSummaryBanner 
          items={[
            kpis[0], // Total Customers
            kpis[1], // New Customers
            kpis[2], // Active Accounts
            kpis[4], // Corporate Accounts
          ]} 
          loading={loading} 
        />

        {/* ── 4. Dynamic Sub-tab Views ───────────────────────────────────── */}
        {(activeSubTab === 'overview' || activeSubTab === 'growth') && (
          <div className="clean-charts-grid">
            <ReportChartCard
              title="Customer Growth Velocity"
              subtitle="Customer acquisition count across selected period"
              badge="Acquisition Velocity"
              loading={loading}
              empty={!data?.growthOverTime || data.growthOverTime.length === 0}
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.growthOverTime || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                  <XAxis dataKey="date" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                  <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                  <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Customers`} />} />
                  <Area type="monotone" dataKey="count" name="New Customers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorGrowth)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ReportChartCard>

            <ReportChartCard
              title="Customers by Acquisition Source"
              subtitle="Channel attribution and source distribution"
              badge="Acquisition Channel"
              badgeColor="#10b981"
              loading={loading}
              empty={!data?.bySource || data.bySource.length === 0}
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.bySource || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                  <XAxis dataKey="source" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                  <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                  <Tooltip content={<CustomChartTooltip formatter={(v: number, n: string) => n === 'Revenue' ? fmt$(v) : `${v} Accounts`} />} />
                  <Bar dataKey="count" name="Customer Count" radius={[6, 6, 0, 0]}>
                    {(data?.bySource || []).map((_: any, idx: number) => (
                      <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ReportChartCard>
          </div>
        )}

        {(activeSubTab === 'status' || activeSubTab === 'sources' || activeSubTab === 'activity') && (
          <div className="clean-charts-grid">
            <ReportChartCard
              title={activeSubTab === 'status' ? 'Customer Account Status Distribution' : activeSubTab === 'sources' ? 'Acquisition Source Volume & Value' : 'Customer Activity Health'}
              subtitle="Visual segmentation breakdown from live CRM records"
              loading={loading}
              empty={!data?.bySource || data.bySource.length === 0}
            >
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={activeSubTab === 'status' ? (data?.byStatus || []) : (data?.bySource || [])}
                    dataKey="count"
                    nameKey={activeSubTab === 'status' ? 'status' : 'source'}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={50}
                    paddingAngle={3}
                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {(data?.bySource || []).map((_: any, idx: number) => (
                      <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Accounts`} />} />
                </PieChart>
              </ResponsiveContainer>
            </ReportChartCard>
          </div>
        )}

        {/* ── 5. Detailed Table ──────────────────────────────────────────── */}
        <ReportDataTable
          title="Customer Directory Ledger"
          subtitle="Detailed customer accounts, acquisition channels, created dates, and calculated lifetime revenue"
          columns={customerColumns}
          data={displayedItems}
          loading={loading}
          searchable
          searchPlaceholder="Search customer name, email, company..."
          emptyMessage="No customer records found matching the selected filters."
        />
      </div>
    </Layout>
  );
};
