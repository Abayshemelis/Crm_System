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
  Receipt, DollarSign, CheckCircle2, Clock,
  AlertCircle, TrendingUp, Calendar, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import './cleanReports.css';

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const fmt$ = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

export const InvoiceReportsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'status' | 'revenue' | 'outstanding' | 'overdue' | 'collection'>('overview');
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
    { id: 'revenue',     label: 'Revenue' },
    { id: 'outstanding', label: 'Outstanding' },
    { id: 'overdue',     label: 'Overdue' },
    { id: 'collection',  label: 'Collection' },
  ];

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (statusFilter) q.append('status', statusFilter);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/invoices?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load invoice reports', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
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
      label: 'Total Invoiced',
      value: data ? fmt$(data.totalInvoiced) : '$0',
      sub: `${data?.items?.length ?? 0} total invoices`,
      icon: <Receipt size={18} />,
      color: '#3b82f6',
    },
    {
      label: 'Cash Collected',
      value: data ? fmt$(data.totalCollected) : '$0',
      sub: `${data?.paidCount ?? 0} fully paid invoices`,
      icon: <CheckCircle2 size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'Outstanding Balance',
      value: data ? fmt$(data.totalOutstanding) : '$0',
      sub: `${data?.unpaidCount ?? 0} open receivables`,
      icon: <Clock size={18} />,
      color: '#f59e0b',
    },
    {
      label: 'Overdue Receivables',
      value: data ? fmt$(data.totalOverdue) : '$0',
      sub: `${data?.overdueCount ?? 0} past due invoices`,
      icon: <AlertTriangle size={18} />,
      color: '#ef4444',
    },
    {
      label: 'Collection Efficiency Rate',
      value: data ? `${Number(data.collectionRate || 0).toFixed(1)}%` : '0.0%',
      sub: 'Collected vs Billed volume',
      icon: <TrendingUp size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
  ];

  // Table Columns
  const columns: ColumnDef<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (r) => (
        <div>
          <strong style={{ color: 'var(--text-primary, #ffffff)' }}>{r.invoiceNumber}</strong>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{r.customerName}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (r) => {
        const s = (r.status || '').toLowerCase();
        const isPaid = s.includes('paid');
        const isOver = r.isOverdue || s.includes('overdue');
        const isSent = s.includes('sent') || s.includes('pending');
        return (
          <span
            className="clean-badge"
            style={{
              background: isPaid ? 'rgba(16,185,129,0.15)' : isOver ? 'rgba(239,68,68,0.15)' : isSent ? 'rgba(245,158,11,0.15)' : 'rgba(148,163,184,0.15)',
              color: isPaid ? '#10b981' : isOver ? '#ef4444' : isSent ? '#f59e0b' : '#94a3b8',
              borderColor: isPaid ? 'rgba(16,185,129,0.3)' : isOver ? 'rgba(239,68,68,0.3)' : undefined,
            }}
          >
            {r.isOverdue && !isPaid ? 'Overdue' : r.status}
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Invoiced Amount',
      align: 'right',
      render: (r) => <strong>{fmt$(r.totalAmount)}</strong>,
    },
    {
      key: 'paidAmount',
      header: 'Amount Paid',
      align: 'right',
      render: (r) => <span style={{ color: '#10b981' }}>{fmt$(r.paidAmount)}</span>,
    },
    {
      key: 'balance',
      header: 'Remaining Balance',
      align: 'right',
      render: (r) => (
        <strong style={{ color: r.balance > 0 ? (r.isOverdue ? '#ef4444' : '#f59e0b') : '#10b981' }}>
          {fmt$(r.balance)}
        </strong>
      ),
    },
    {
      key: 'issueDate',
      header: 'Issued Date',
      render: (r) => <span style={{ fontSize: '0.8rem' }}>{r.issueDate ? new Date(r.issueDate).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (r) => (
        <span style={{ fontSize: '0.8rem', color: r.isOverdue ? '#ef4444' : undefined, fontWeight: r.isOverdue ? 700 : 400 }}>
          {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}
          {r.isOverdue && ' ⚠️'}
        </span>
      ),
    },
  ];

  // Status Summary Columns
  const statusSummaryColumns: ColumnDef<any>[] = [
    { key: 'status', header: 'Invoice Status', width: '30%' },
    { key: 'count', header: 'Invoices Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.count}</span> },
    { key: 'amount', header: 'Total Invoiced Amount', align: 'right', render: (r) => <strong>{fmt$(r.amount)}</strong> },
    { key: 'paid', header: 'Total Collected', align: 'right', render: (r) => <span style={{ color: '#10b981' }}>{fmt$(r.paid)}</span> },
    { key: 'balance', header: 'Outstanding Balance', align: 'right', render: (r) => <strong style={{ color: '#f59e0b' }}>{fmt$(r.balance)}</strong> },
  ];

  // AR Aging Buckets Data for chart
  const arAgingData = useMemo(() => [
    { bucket: 'Current (0-30d)',  amount: data?.aging0to30 ?? 0 },
    { bucket: '31-60 Days',       amount: data?.aging31to60 ?? 0 },
    { bucket: '61-90 Days',       amount: data?.aging61to90 ?? 0 },
    { bucket: '90+ Days Past Due', amount: data?.aging90Plus ?? 0 },
  ], [data]);

  // Sub-tab filtered datasets
  const paidItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((i: any) => i.paidAmount > 0);
  }, [data]);

  const outstandingItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((i: any) => i.balance > 0);
  }, [data]);

  const overdueItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((i: any) => i.isOverdue || (i.status || '').toLowerCase().includes('overdue'));
  }, [data]);

  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Invoiced', value: fmt$(data.totalInvoiced), sub: 'Gross Billing' },
      { label: 'Cash Collected', value: fmt$(data.totalCollected), sub: `${Number(data.collectionRate || 0).toFixed(1)}% Collected` },
      { label: 'Outstanding Balance', value: fmt$(data.totalOutstanding), sub: 'Receivables' },
      { label: 'Overdue Amount', value: fmt$(data.totalOverdue), sub: `${data.overdueCount} Invoices` },
    ];
    const insights = [
      `Total invoiced volume stands at ${fmt$(data.totalInvoiced)} with ${fmt$(data.totalCollected)} collected in cash.`,
      `Outstanding accounts receivable total ${fmt$(data.totalOutstanding)}, with ${fmt$(data.totalOverdue)} currently past due.`,
      `Cash collection realization efficiency is operating at ${Number(data.collectionRate || 0).toFixed(1)}%.`,
    ];
    exportExecutivePDF(
      data.items || [],
      'Invoices & Accounts Receivable Report',
      'Billing volume, cash collected, accounts receivable aging, and collection efficiency',
      stats,
      insights,
      'crm_invoice_report'
    );
  };

  const handleExportCSV = () => {
    if (!data?.items) return;
    exportCSV(data.items, 'invoice_report_records');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Navigation ──────────────────────────────────────────────── */}
        <ReportsNav
          activeCategory="invoices"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(t) => setActiveSubTab(t as any)}
        />

        {/* ── 2. Header & Controls ───────────────────────────────────────── */}
        <ReportHeader
          title="Invoice Reports"
          description="Billed revenue, cash collected, outstanding balance aging, overdue receivables, and collection velocity."
          badge="Invoices & AR"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchInvoiceData}
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
                title="Invoiced Amount vs Cash Collected"
                subtitle="Monthly gross billing volume compared to cleared payment cash"
                badge="Cash Inflow"
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
                    <Bar dataKey="invoiced" name="Invoiced Amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Cash Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Accounts Receivable (AR) Aging"
                subtitle="Outstanding balance grouped by days past due"
                badge="Aging Schedule"
                badgeColor="#f59e0b"
                loading={loading}
                empty={data?.totalOutstanding === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={arAgingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="bucket" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="amount" name="Outstanding Balance" radius={[6, 6, 0, 0]}>
                      {arAgingData.map((_, idx) => (
                        <Cell key={idx} fill={['#3b82f6', '#f59e0b', '#f97316', '#ef4444'][idx]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Invoice & Receivables Ledger"
              subtitle="Detailed billing records, customer links, invoiced amounts, amounts paid, and remaining balances"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search invoice #, customer name..."
              emptyMessage="No invoice records found matching the selected filters."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: STATUS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'status' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Invoice Status Distribution"
                subtitle="Share of invoices by billing lifecycle state"
                badge="Status Share"
                badgeColor="#3b82f6"
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
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Invoices`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Billed Amount by Status"
                subtitle="Financial capital distributed across invoice statuses"
                badge="Value Share"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byStatus || data.byStatus.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data?.byStatus || []}
                      dataKey="amount"
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
              title="Invoice Status Lifecycle Summary"
              subtitle="Breakdown of volume, gross billed amount, collected cash, and remaining balance per status"
              columns={statusSummaryColumns}
              data={data?.byStatus || []}
              loading={loading}
              emptyMessage="No invoice status breakdown available."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: REVENUE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'revenue' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Monthly Cash Collection Inflow"
                subtitle="Historical monthly cash realization from paid invoices"
                badge="Revenue Velocity"
                badgeColor="#10b981"
                loading={loading}
                empty={!data?.byMonth || data.byMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data?.byMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="invRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Area type="monotone" dataKey="collected" name="Cash Collected" stroke="#10b981" fillOpacity={1} fill="url(#invRevGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Gross Billing Volume"
                subtitle="Monthly gross invoiced amounts"
                badge="Gross Billed"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data?.byMonth || data.byMonth.length === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.byMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="month" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="invoiced" name="Gross Invoiced" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Realized Cash Revenue Ledger (Paid Invoices)"
              subtitle="Invoices with cleared payments and realized revenue inflows"
              columns={columns}
              data={paidItems}
              loading={loading}
              searchable
              searchPlaceholder="Search paid invoices..."
              emptyMessage="No paid invoices recorded in period."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: OUTSTANDING */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'outstanding' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Accounts Receivable Aging Breakdown"
                subtitle="Capital locked in open invoices by maturity bucket"
                badge="AR Schedule"
                badgeColor="#f59e0b"
                loading={loading}
                empty={data?.totalOutstanding === 0}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={arAgingData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, rgba(255,255,255,0.06))" />
                    <XAxis dataKey="bucket" stroke="var(--text-muted, #94a3b8)" fontSize={11} />
                    <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Bar dataKey="amount" name="Outstanding Amount" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Outstanding vs Realized Revenue"
                subtitle="Total billed vs remaining balance"
                badge="Realization Gap"
                badgeColor="#3b82f6"
                loading={loading}
                empty={!data}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Collected Cash', value: data?.totalCollected ?? 0 },
                        { name: 'Outstanding Balance', value: data?.totalOutstanding ?? 0 }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Outstanding Accounts Receivable Ledger"
              subtitle="Open, unpaid, and partially paid invoices awaiting payment settlement"
              columns={columns}
              data={outstandingItems}
              loading={loading}
              searchable
              searchPlaceholder="Search unpaid invoices..."
              emptyMessage="No outstanding invoices pending payment."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: OVERDUE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'overdue' && (
          <>
            <div className="clean-card" style={{ marginBottom: '20px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={18} /> Overdue Invoices & Delinquent Accounts
                  </h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    There are <strong>{data?.overdueCount ?? 0}</strong> past-due invoices totaling <strong>{fmt$(data?.totalOverdue ?? 0)}</strong> in overdue receivables.
                  </p>
                </div>
                <span className="clean-badge clean-badge-danger" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  {fmt$(data?.totalOverdue ?? 0)} Overdue
                </span>
              </div>
            </div>

            <ReportDataTable
              title="Overdue Invoices Action Ledger"
              subtitle="Invoices that have exceeded their due date requiring immediate collection follow-up"
              columns={columns}
              data={overdueItems}
              loading={loading}
              searchable
              searchPlaceholder="Search overdue invoices..."
              emptyMessage="No overdue invoices recorded."
            />
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 6: COLLECTION */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'collection' && (
          <>
            <div className="clean-charts-grid">
              <ReportChartCard
                title="Collection Efficiency Trend"
                subtitle="Historical monthly cash realization compared to gross billing"
                badge="Collection Rate"
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
                    <Bar dataKey="invoiced" name="Invoiced" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Receivables Realization Ratio"
                subtitle="Overall percentage of billed cash successfully realized"
                badge="Efficiency"
                badgeColor="#10b981"
                loading={loading}
                empty={!data}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Cleared Cash', value: data?.totalCollected ?? 0 },
                        { name: 'Outstanding Balance', value: data?.totalOutstanding ?? 0 }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => fmt$(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <ReportDataTable
              title="Invoice Collection & Billing Ledger"
              subtitle="All invoices with billed amounts, collected totals, and outstanding balances"
              columns={columns}
              data={data?.items || []}
              loading={loading}
              searchable
              searchPlaceholder="Search invoices..."
              emptyMessage="No invoices found."
            />
          </>
        )}
      </div>
    </Layout>
  );
};
export default InvoiceReportsScreen;
