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
  FileText, CheckCircle2, Clock, AlertTriangle,
  DollarSign, FileSignature, TrendingUp, Calendar, Users
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem, ReportSummaryBanner } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import { formatCurrencyGlobal } from '../../context/SystemProfileContext';
import './cleanReports.css';

const PALETTE = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#ef4444'];
const fmt$ = (v: number) => formatCurrencyGlobal(v, undefined, 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const ContractReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'status' | 'value' | 'expiring' | 'performance'>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview',    label: 'Overview' },
    { id: 'status',      label: 'Status' },
    { id: 'value',       label: 'Value' },
    { id: 'expiring',    label: 'Expiring Soon' },
    { id: 'performance', label: 'Performance' },
  ];

  const fetchContractData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (statusFilter) q.append('status', statusFilter);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/contracts?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load contract reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractData();
  }, [startDate, endDate, scope, statusFilter]);

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
      label: 'Total Contracts',
      value: data ? fmtNum(data.totalCount) : '0',
      sub: 'All created legal agreements',
      icon: <FileText size={18} />,
      color: '#a855f7',
    },
    {
      label: 'Active / Signed',
      value: data ? fmtNum(data.signedContracts) : '0',
      sub: `Valued at ${fmt$(data?.activeValue ?? 0)}`,
      icon: <CheckCircle2 size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Pending Signature',
      value: data ? fmtNum(data.pendingContracts) : '0',
      sub: `Valued at ${fmt$(data?.pendingValue ?? 0)}`,
      icon: <Clock size={18} />,
      color: '#f59e0b',
    },
    {
      label: 'Expiring in 30 Days',
      value: data ? fmtNum(data.expiringCount) : '0',
      sub: 'Requires renewal / extension',
      icon: <AlertTriangle size={18} />,
      color: '#ef4444',
    },
    {
      label: 'Total Contract Value',
      value: data ? fmt$(data.totalContractValue) : '$0',
      sub: 'Aggregate legal commitment',
      icon: <DollarSign size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'Signing Execution Rate',
      value: data ? `${Number(data.signingRate || 0).toFixed(1)}%` : '0.0%',
      sub: 'Signed vs total agreements',
      icon: <FileSignature size={18} />,
      color: '#ec4899',
    },
  ];

  // Standard Contracts Table Columns
  const columns: ColumnDef<any>[] = [
    {
      key: 'title',
      header: 'Contract Title',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.title}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{r.contractNumber}</div>
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (r) => (
        <div>
          <span>{r.customerName}</span>
          {r.ownerName && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Rep: {r.ownerName}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (r) => {
        const s = (r.status || '').toLowerCase();
        const isSign = s.includes('signed') || s.includes('active');
        const isExp = s.includes('expired');
        const isPend = s.includes('pending') || s.includes('partially');
        return (
          <span
            className="clean-badge"
            style={{
              background: isSign ? 'rgba(16,185,129,0.15)' : isExp ? 'rgba(239,68,68,0.15)' : isPend ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.15)',
              color: isSign ? '#10b981' : isExp ? '#ef4444' : isPend ? '#f59e0b' : '#94a3b8',
              borderColor: isSign ? 'rgba(16,185,129,0.3)' : isExp ? 'rgba(239,68,68,0.3)' : undefined,
            }}
          >
            {r.status}
          </span>
        );
      },
    },
    {
      key: 'contractValue',
      header: 'Contract Value',
      align: 'right',
      render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.contractValue ?? r.value)}</strong>,
    },
    {
      key: 'startDate',
      header: 'Start Date',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'endDate',
      header: 'End Date',
      render: (r) => (
        <span style={{ fontSize: '0.8rem', color: r.isExpiring ? '#ef4444' : undefined, fontWeight: r.isExpiring ? 700 : 400 }}>
          {r.endDate ? new Date(r.endDate).toLocaleDateString() : '—'}
          {r.isExpiring && ' ⚠️'}
        </span>
      ),
    },
  ];

  // Status Summary Columns
  const statusSummaryColumns: ColumnDef<any>[] = [
    { key: 'status', header: 'Contract Status', width: '35%' },
    { key: 'count', header: 'Agreements Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.count}</span> },
    {
      key: 'percentage',
      header: 'Portfolio Share',
      align: 'center',
      render: (r) => <strong>{data?.totalCount > 0 ? `${Math.round((r.count / data.totalCount) * 100)}%` : '0%'}</strong>
    },
    { key: 'value', header: 'Total Value', align: 'right', render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.value)}</strong> },
  ];

  // Rep Performance Columns
  const repColumns: ColumnDef<any>[] = [
    { key: 'repName', header: 'Sales Representative', width: '30%' },
    { key: 'totalContracts', header: 'Total Contracts', align: 'center', render: (r) => <span>{r.totalContracts}</span> },
    { key: 'signedContracts', header: 'Signed Contracts', align: 'center', render: (r) => <span className="clean-badge clean-badge-success">{r.signedContracts}</span> },
    { key: 'totalValue', header: 'Total Portfolio Value', align: 'right', render: (r) => <span>{fmt$(r.totalValue)}</span> },
    { key: 'activeValue', header: 'Active Signed Value', align: 'right', render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.activeValue)}</strong> },
  ];

  // Sub-tab filtered datasets
  const valueItems = useMemo(() => {
    if (!data?.items) return [];
    return [...data.items].sort((a, b) => (b.contractValue ?? b.value ?? 0) - (a.contractValue ?? a.value ?? 0));
  }, [data]);

  const expiringItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((c: any) => c.isExpiring || (c.endDate && new Date(c.endDate).getTime() - new Date().getTime() <= 30 * 86400000 && new Date(c.endDate).getTime() >= new Date().getTime()));
  }, [data]);

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Contracts', value: fmtNum(data.totalCount), sub: 'Active database' },
      { label: 'Signed Active', value: fmtNum(data.signedContracts), sub: fmt$(data.activeValue) },
      { label: 'Expiring Soon', value: fmtNum(data.expiringCount), sub: 'Next 30 Days' },
      { label: 'Signing Rate', value: `${Number(data.signingRate || 0).toFixed(1)}%`, sub: 'Execution' },
    ];
    const insights = [
      `Total contract portfolio represents ${fmt$(data.totalContractValue)} across ${data.totalCount} agreements.`,
      `Active signed contracts total ${data.signedContracts} accounts (${fmt$(data.activeValue)} in active value).`,
      `${data.expiringCount} agreements are due to expire within the next 30 days and require account manager review.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Contract & Agreement Analytics Report',
      'Contract status lifecycle, valuation distribution, expiration risks, and execution rates',
      stats,
      insights,
      'crm_contracts_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'contract_report_records');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="contracts"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Contract Reports"
          description="Agreement lifecycle analytics, active contract values, expiration timelines, and signing performance."
          badge="Agreements"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchContractData}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          loading={loading}
        />

        {/* ── 3. Summary Banner ────────────────────────────────────────────────── */}
        <ReportSummaryBanner 
          items={[
            kpis[0], // Total Contracts
            kpis[1], // Active / Signed
            kpis[3], // Expiring in 30 Days
            kpis[4], // Total Contract Value
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
                title="Contracts by Status"
                subtitle="Volume distribution across execution stages"
                badge="Lifecycle Status"
                badgeColor="#a855f7"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStatus || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="status" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Contracts`} />} />
                    <Bar dataKey="count" name="Contracts" radius={[6, 6, 0, 0]}>
                      {(data?.byStatus || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Contract Value by Status"
                subtitle="Financial commitment grouped by lifecycle status"
                badge="Capital Value"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byStatus || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="status" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="value" name="Total Value" radius={[6, 6, 0, 0]}>
                      {(data?.byStatus || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Contract Agreements Ledger"
              subtitle="Complete registry of customer contracts, execution status, contract values, and expiration dates"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search contract title, number, customer..."
              emptyMessage="No contract records found matching the selected filters."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: STATUS BREAKDOWN */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'status' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Contracts Status Distribution"
                subtitle="Share of agreements by legal lifecycle stage"
                badge="Status Share"
                badgeColor="#a855f7"
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
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data?.byStatus || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Contracts`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Capital Value by Status"
                subtitle="Financial commitments locked per status tier"
                badge="Value Share"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byStatus || []}
                      dataKey="value"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data?.byStatus || []).map((_: any, idx: number) => (
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
              title="Contract Lifecycle Status Summary"
              subtitle="Breakdown of volume, portfolio share %, and financial commitment per status"
              columns={statusSummaryColumns}
              data={data?.byStatus || []}
              loading={loading}
              emptyMessage="No status breakdown available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: VALUE ANALYSIS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'value' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Monthly Contract Commitment Creation"
                subtitle="Total agreement valuation signed and executed by month"
                badge="Monthly Capital"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byMonth || data.byMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.byMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ctrValGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Area type="monotone" dataKey="value" name="Contract Value" stroke="#10b981" fillOpacity={1} fill="url(#ctrValGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Monthly Contracts Created"
                subtitle="Count of agreements drafted and executed per month"
                badge="Agreement Volume"
                badgeColor="#a855f7"
                loading={loading}
                empty={!data?.byMonth || data.byMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Contracts`} />} />
                    <Bar dataKey="count" name="Contracts Created" fill="#a855f7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="High-Value Contract Agreements"
              subtitle="Agreements ranked in descending order of financial valuation"
              columns={columns}
              data={valueItems}
              loading={loading}
              searchable
              searchPlaceholder="Search high-value agreements..."
              emptyMessage="No contract records found."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: EXPIRING SOON */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'expiring' && (
          <>
            <div className="clean-card" style={{ marginBottom: '20px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={18} /> Contract Renewal & Expiration Warning
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    There are <strong>{data?.expiringCount ?? 0}</strong> customer contracts scheduled to expire within the next 30 days. Proactively initiate renewal discussions.
                  </p>
                </div>
                <span className="clean-badge clean-badge-danger" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  {data?.expiringCount ?? 0} Expiring Agreements
                </span>
              </div>
            </div>

            <ReportDataTable
              title="Expiring Agreements Action Ledger"
              subtitle="Agreements approaching maturity within the next 30 to 60 days requiring account manager renewal"
              columns={columns}
              data={expiringItems}
              loading={loading}
              searchable
              searchPlaceholder="Search expiring contracts..."
              emptyMessage="No contracts expiring in the immediate window."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: PERFORMANCE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'performance' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Signed Contract Value by Representative"
                subtitle="Active revenue commitments closed per sales rep"
                badge="Rep Signed Value"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byRep || data.byRep.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byRep || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="repName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="activeValue" name="Active Signed Value" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Contracts Executed per Representative"
                subtitle="Signed contracts count compared to total created agreements"
                badge="Execution Volume"
                badgeColor="#a855f7"
                loading={loading}
                empty={!data?.byRep || data.byRep.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byRep || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="repName" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Contracts`} />} />
                    <Bar dataKey="signedContracts" name="Signed Contracts" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalContracts" name="Total Contracts" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Sales Representative Contract Execution Leaderboard"
              subtitle="Breakdown of contract creation, signature execution, and signed portfolio value per sales representative"
              columns={repColumns}
              data={data?.byRep || []}
              loading={loading}
              emptyMessage="No representative performance data available."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default ContractReportsScreen;
