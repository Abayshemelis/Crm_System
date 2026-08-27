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
  CreditCard, DollarSign, CheckCircle2, Clock,
  RotateCcw, TrendingUp, Calendar, ShieldCheck, AlertCircle
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import './cleanReports.css';

const PALETTE = ['#14b8a6', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];
const fmt$ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const PaymentReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'collection' | 'outstanding' | 'methods' | 'trends'>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview',    label: 'Overview' },
    { id: 'collection',  label: 'Collection' },
    { id: 'outstanding', label: 'Outstanding' },
    { id: 'methods',     label: 'Methods' },
    { id: 'trends',      label: 'Trends' },
  ];

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (methodFilter) q.append('method', methodFilter);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/payments?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load payment reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [startDate, endDate, scope, methodFilter]);

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
      label: 'Total Collected',
      value: data ? fmt$(data.totalCollected) : '$0',
      sub: `${data?.completedCount ?? 0} cleared payments`,
      icon: <DollarSign size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Pending Inflow',
      value: data ? fmt$(data.totalPending) : '$0',
      sub: `${data?.pendingCount ?? 0} in clearing/verification`,
      icon: <Clock size={18} />,
      color: '#f59e0b',
    },
    {
      label: 'Total Transactions',
      value: data ? fmtNum(data.totalTransactions) : '0',
      sub: 'All recorded payments',
      icon: <CreditCard size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'Average Payment Size',
      value: data ? fmt$(data.averagePayment) : '$0',
      sub: 'Mean cleared transaction',
      icon: <TrendingUp size={18} />,
      color: '#14b8a6',
    },
    {
      label: 'Outstanding Receivables',
      value: data ? fmt$(data.totalReceivable) : '$0',
      sub: 'Pending invoice balances',
      icon: <AlertCircle size={18} />,
      color: '#ef4444',
    },
  ];

  // Columns for standard payments table
  const columns: ColumnDef<any>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment / Ref #',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.paymentNumber || `PAY-${r.paymentId}`}</strong>
          {r.transactionReference && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Ref: {r.transactionReference}</div>
          )}
        </div>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer / Company',
      render: (r) => (
        <div>
          <span>{r.customerName}</span>
          {r.companyName && r.companyName !== '—' && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.companyName}</div>
          )}
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      align: 'center',
      render: (r) => (
        <span className="clean-badge clean-badge-primary">
          {r.paymentMethod}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (r) => {
        const isPaid = (r.status || '').toLowerCase().includes('paid') || (r.status || '').toLowerCase().includes('complete');
        const isPending = (r.status || '').toLowerCase().includes('pending');
        const isRefund = (r.status || '').toLowerCase().includes('refund');
        return (
          <span
            className="clean-badge"
            style={{
              background: isPaid ? 'rgba(16,185,129,0.15)' : isRefund ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
              color: isPaid ? '#10b981' : isRefund ? '#ef4444' : '#f59e0b',
              borderColor: isPaid ? 'rgba(16,185,129,0.3)' : undefined,
            }}
          >
            {r.status}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.amount)}</strong>,
    },
    {
      key: 'invoiceNumber',
      header: 'Linked Invoice',
      render: (r) => <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{r.invoiceNumber || '—'}</span>,
    },
    {
      key: 'paymentDate',
      header: 'Payment Date',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '—'}</span>,
    },
  ];

  // Method Breakdown Columns
  const methodColumns: ColumnDef<any>[] = [
    { key: 'method', header: 'Payment Method', width: '30%' },
    { key: 'count', header: 'Transactions Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.count}</span> },
    { key: 'percentage', header: 'Share %', align: 'center', render: (r) => <strong>{r.percentage}%</strong> },
    { key: 'collectedAmount', header: 'Cleared Cash Amount', align: 'right', render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.collectedAmount)}</strong> },
    { key: 'totalAmount', header: 'Total Gross Volume', align: 'right', render: (r) => <span>{fmt$(r.totalAmount)}</span> },
  ];

  // Filtered dataset for sub-tabs
  const clearedItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((p: any) => (p.status || '').toLowerCase().includes('paid') || (p.status || '').toLowerCase().includes('complete'));
  }, [data]);

  const pendingItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((p: any) => (p.status || '').toLowerCase().includes('pending') || (p.status || '').toLowerCase().includes('process'));
  }, [data]);

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Cleared Cash', value: fmt$(data.totalCollected), sub: 'Realized Revenue' },
      { label: 'Pending Processing', value: fmt$(data.totalPending), sub: `${data.pendingCount} Payments` },
      { label: 'Total Transactions', value: fmtNum(data.totalTransactions), sub: 'Cleared & Pending' },
      { label: 'Average Payment', value: fmt$(data.averagePayment), sub: 'Mean Value' },
    ];
    const insights = [
      `Recorded ${fmt$(data.totalCollected)} in total cleared cash collections across ${data.completedCount} transactions.`,
      `There are currently ${fmt$(data.totalPending)} in pending payments awaiting settlement.`,
      `Outstanding invoice receivables total ${fmt$(data.totalReceivable)}.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Payments & Cash Flow Analytics Report',
      'Realized cash inflow, payment gateway methods, transaction counts, and settlement velocity',
      stats,
      insights,
      'crm_payments_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'payment_report_records');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="payments"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Payment Reports"
          description="Realized cash revenue, settlement methods, collection volume velocity, and receivables reconciliation."
          badge="Cash Inflow"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchPaymentData}
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
                title="Monthly Cash Collection Inflow"
                subtitle="Cleared cash revenue collections compared to pending inflows"
                badge="Inflow Velocity"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byMonth || data.byMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.byMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="payInflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Area type="monotone" dataKey="collected" name="Cleared Cash" stroke="#10b981" fillOpacity={1} fill="url(#payInflowGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Payment Methods Distribution"
                subtitle="Transaction volume share across payment channels"
                badge="Gateways"
                badgeColor="#14b8a6"
                loading={loading}
                empty={!data?.byMethod || data.byMethod.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byMethod || []}
                      dataKey="totalAmount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data?.byMethod || []).map((_: any, idx: number) => (
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
              title="Payment Transactions Ledger"
              subtitle="Detailed record of all cash receipts, customer links, payment channels, and settlement dates"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search payment #, ref, customer..."
              emptyMessage="No payment records found matching the selected filters."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: COLLECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'collection' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Cleared Payments by Month"
                subtitle="Monthly volume of successfully cleared cash receipts"
                badge="Cleared Cash"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byMonth || data.byMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="collected" name="Cleared Cash" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Cleared vs Pending Transaction Volume"
                subtitle="Transaction count comparison"
                badge="Volume"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Cleared Payments', count: data?.completedCount ?? 0 },
                        { name: 'Pending Payments', count: data?.pendingCount ?? 0 },
                        { name: 'Refunds / Other', count: (data?.refundedCount ?? 0) + (data?.failedCount ?? 0) }
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
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Transactions`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Cleared Cash Collections Ledger"
              subtitle="All fully settled and cleared cash transactions"
              columns={columns}
              data={clearedItems}
              loading={loading}
              searchable
              searchPlaceholder="Search cleared payments..."
              emptyMessage="No cleared payments recorded."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: OUTSTANDING & PENDING */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'outstanding' && (
          <>
            <div className="clean-card" style={{ marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={18} /> Pending Payments & Receivables
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    Total outstanding invoice receivables amount to <strong>{fmt$(data?.totalReceivable ?? 0)}</strong>, with <strong>{fmt$(data?.totalPending ?? 0)}</strong> in pending bank clearances.
                  </p>
                </div>
                <span className="clean-badge clean-badge-warning" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  {fmt$(data?.totalPending ?? 0)} Pending
                </span>
              </div>
            </div>

            <ReportDataTable
              title="Pending Payment Settlements Ledger"
              subtitle="Payments awaiting bank clearing, merchant verification, or reconciliation"
              columns={columns}
              data={pendingItems}
              loading={loading}
              searchable
              searchPlaceholder="Search pending payments..."
              emptyMessage="No pending payments in verification."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: METHODS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'methods' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Gross Capital by Payment Method"
                subtitle="Total payment volume processed per gateway / channel"
                badge="Gateway Share"
                badgeColor="#14b8a6"
                loading={loading}
                empty={!data?.byMethod || data.byMethod.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byMethod || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="method" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="totalAmount" name="Gross Volume" radius={[6, 6, 0, 0]}>
                      {(data?.byMethod || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Transaction Count by Channel"
                subtitle="Number of transactions executed per method"
                badge="Volume"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byMethod || data.byMethod.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byMethod || []}
                      dataKey="count"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {(data?.byMethod || []).map((_: any, idx: number) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Transactions`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Payment Gateway & Methods Breakdown"
              subtitle="Summary of transaction counts, cleared cash amounts, and total gross volume per channel"
              columns={methodColumns}
              data={data?.byMethod || []}
              loading={loading}
              emptyMessage="No payment method data available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: TRENDS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'trends' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Monthly Cash Collection Trend"
                subtitle="Historical monthly cash realization"
                badge="Inflow Trend"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byMonth || data.byMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.byMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="payTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Area type="monotone" dataKey="collected" name="Cleared Cash" stroke="#14b8a6" fillOpacity={1} fill="url(#payTrendGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Monthly Transaction Volume"
                subtitle="Number of processed payments by month"
                badge="Transactions"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byMonth || data.byMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Transactions`} />} />
                    <Bar dataKey="count" name="Transaction Count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="All Payment Transactions"
              subtitle="Complete historical ledger of all payment receipts"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search all payments..."
              emptyMessage="No payment records found."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default PaymentReportsScreen;
