import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Building2, Users, Globe, Briefcase, TrendingUp, Layers,
  ExternalLink, Search, Phone, Mail, Award, DollarSign,
  CheckCircle, ArrowUpRight, FileText
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem, ReportSummaryBanner } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV, exportExecutivePDF } from '../../components/reports/reportExportUtils';
import { formatCurrencyGlobal } from '../../context/SystemProfileContext';
import './cleanReports.css';

const PALETTE = ['#2563eb', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'];
const fmt$ = (v: number) => formatCurrencyGlobal(v, undefined, 0);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

type CompanySubTab = 'overview' | 'industries' | 'size' | 'revenue' | 'directory';

export const CompanyReportsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isManagerOrAbove } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<CompanySubTab>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [scope, setScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const subTabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'industries', label: 'Industries' },
    { id: 'size',       label: 'Organization Size' },
    { id: 'revenue',    label: 'Revenue & Pipeline' },
    { id: 'directory',  label: 'Company Directory' },
  ];

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate) q.append('endDate', endDate);
      if (industryFilter && industryFilter !== 'All') q.append('industry', industryFilter);
      if (sizeFilter && sizeFilter !== 'All') q.append('companySize', sizeFilter);
      if (searchTerm) q.append('search', searchTerm);
      q.append('scope', scope);

      const res = await api.get<any>(`/api/reports/companies?${q.toString()}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load company report data', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [startDate, endDate, scope, industryFilter, sizeFilter]);

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

  // KPI Items
  const kpis: ReportKpiItem[] = [
    {
      label: 'Total Organizations',
      value: data ? fmtNum(data.totalCompanies) : '0',
      sub: `${data?.newCompanies ?? 0} registered in period`,
      icon: <Building2 size={18} />,
      color: '#2563eb',
      delta: data?.newCompanies > 0 ? `+${data.newCompanies}` : undefined,
      deltaUp: true,
    },
    {
      label: 'Attached Stakeholders',
      value: data ? fmtNum(data.totalContacts) : '0',
      sub: `${data?.avgContactsPerCompany ?? 0} contacts / organization`,
      icon: <Users size={18} />,
      color: '#10b981',
      deltaUp: true,
    },
    {
      label: 'B2B Revenue Closed',
      value: data ? fmt$(data.totalWonRevenue) : '$0',
      sub: 'Won enterprise opportunities',
      icon: <Award size={18} />,
      color: '#8b5cf6',
      deltaUp: true,
    },
    {
      label: 'Open B2B Pipeline',
      value: data ? fmt$(data.totalPipelineValue) : '$0',
      sub: 'Active open deals valuation',
      icon: <TrendingUp size={18} />,
      color: '#ec4899',
    },
    {
      label: 'Digital Presence',
      value: data ? `${data.totalCompanies > 0 ? Math.round((data.withWebsite / data.totalCompanies) * 100) : 0}%` : '0%',
      sub: `${data?.withWebsite ?? 0} verified corporate websites`,
      icon: <Globe size={18} />,
      color: '#06b6d4',
    },
  ];

  // Table Columns for Directory Ledger
  const companyColumns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Company Name',
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
            }}
          >
            <Building2 size={16} />
          </div>
          <div>
            <strong style={{ color: 'var(--text-primary, #ffffff)', fontSize: '0.88rem' }}>{r.name}</strong>
            {r.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>{r.email}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'industry',
      header: 'Industry Sector',
      render: (r) => (
        <span className="clean-badge clean-badge-primary">
          {r.industry || 'General'}
        </span>
      ),
    },
    {
      key: 'companySize',
      header: 'Size Tier',
      render: (r) => (
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)' }}>
          {r.companySize || '—'}
        </span>
      ),
    },
    {
      key: 'website',
      header: 'Website Domain',
      render: (r) => (
        r.website ? (
          <a
            href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
            target="_blank"
            rel="noreferrer"
            style={{
              color: '#38bdf8',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.82rem'
            }}
          >
            <Globe size={12} /> {r.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        ) : (
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>—</span>
        )
      ),
    },
    {
      key: 'contactCount',
      header: 'Contacts',
      align: 'center',
      render: (r) => (
        <span className="clean-badge clean-badge-info">
          {r.contactCount || 0} Contacts
        </span>
      ),
    },
    {
      key: 'revenueWon',
      header: 'Won Revenue',
      align: 'right',
      render: (r) => (
        <strong style={{ color: '#10b981', fontSize: '0.88rem' }}>
          {fmt$(r.revenueWon)}
        </strong>
      ),
    },
    {
      key: 'pipelineValue',
      header: 'Open Pipeline',
      align: 'right',
      render: (r) => (
        <span style={{ color: '#ec4899', fontWeight: 600, fontSize: '0.84rem' }}>
          {fmt$(r.pipelineValue)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => navigate(`/companies/${r.companyId}`)}
          className="clean-btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          Profile <ExternalLink size={12} />
        </button>
      ),
    },
  ];

  // Industry table columns
  const industryColumns: ColumnDef<any>[] = [
    { key: 'name', header: 'Industry Sector', width: '35%' },
    { key: 'count', header: 'Organizations Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-primary">{r.count}</span> },
    { key: 'percentage', header: 'Sector Share', align: 'center', render: (r) => <strong>{r.percentage}%</strong> },
    { key: 'contactsCount', header: 'Attached Contacts', align: 'center', render: (r) => <span>{r.contactsCount}</span> },
    { key: 'wonRevenue', header: 'Closed Won Revenue', align: 'right', render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.wonRevenue)}</strong> },
    { key: 'pipelineValue', header: 'Active Pipeline', align: 'right', render: (r) => <span style={{ color: '#ec4899' }}>{fmt$(r.pipelineValue)}</span> },
  ];

  // Size table columns
  const sizeColumns: ColumnDef<any>[] = [
    { key: 'name', header: 'Organization Size Tier', width: '40%' },
    { key: 'count', header: 'Account Count', align: 'center', render: (r) => <span className="clean-badge clean-badge-info">{r.count}</span> },
    { key: 'percentage', header: 'Portfolio Share', align: 'center', render: (r) => <strong>{r.percentage}%</strong> },
    { key: 'wonRevenue', header: 'Realized Revenue', align: 'right', render: (r) => <strong style={{ color: '#10b981' }}>{fmt$(r.wonRevenue)}</strong> },
  ];

  // Unique industries for filter dropdown
  const uniqueIndustries = useMemo(() => {
    if (!data?.industryBreakdown) return [];
    return data.industryBreakdown.map((i: any) => i.name).filter(Boolean);
  }, [data]);

  // Unique sizes for filter dropdown
  const uniqueSizes = useMemo(() => {
    if (!data?.sizeBreakdown) return [];
    return data.sizeBreakdown.map((s: any) => s.name).filter(Boolean);
  }, [data]);

  // Filtered dataset for subtabs
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let list = [...data.items];

    if (industryFilter && industryFilter !== 'All') {
      list = list.filter(c => c.industry === industryFilter);
    }

    if (sizeFilter && sizeFilter !== 'All') {
      list = list.filter(c => c.companySize === sizeFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.industry && c.industry.toLowerCase().includes(term)) ||
        (c.website && c.website.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term))
      );
    }

    return list;
  }, [data, industryFilter, sizeFilter, searchTerm]);

  // Export handlers
  const handleExportPDF = () => {
    if (!data) return;
    const stats = [
      { label: 'Total Organizations', value: fmtNum(data.totalCompanies), sub: 'Active B2B Portfolio' },
      { label: 'Attached Contacts', value: fmtNum(data.totalContacts), sub: `${data.avgContactsPerCompany} / Org` },
      { label: 'Won B2B Revenue', value: fmt$(data.totalWonRevenue), sub: 'Realized Closed Deals' },
      { label: 'Open Pipeline', value: fmt$(data.totalPipelineValue), sub: 'Active Opportunities' },
    ];
    const insights = [
      `Total of ${fmtNum(data.totalCompanies)} corporate accounts tracked across ${data.industryBreakdown?.length || 0} industry verticals.`,
      `Stakeholder density averages ${data.avgContactsPerCompany} contacts per organization with ${fmtNum(data.totalContacts)} total customer contacts.`,
      `Closed B2B revenue stands at ${fmt$(data.totalWonRevenue)} with an active open pipeline valuation of ${fmt$(data.totalPipelineValue)}.`,
      `${data.withWebsite} of ${data.totalCompanies} accounts have verified website profiles.`
    ];
    exportExecutivePDF(
      filteredItems,
      'Company Accounts & B2B Portfolio Report',
      'Corporate account diversification, stakeholder contact density, and enterprise deal valuation',
      stats,
      insights,
      'crm_company_portfolio_report'
    );
  };

  const handleExportCSV = () => {
    if (!filteredItems || !filteredItems.length) return;
    const csvRows = filteredItems.map((c, i) => ({
      '#': i + 1,
      'Company ID': c.companyId,
      'Company Name': c.name,
      'Industry Sector': c.industry || 'General',
      'Company Size': c.companySize || '—',
      'Website': c.website || '—',
      'Phone': c.phone || '—',
      'Email': c.email || '—',
      'Assigned Rep': c.assignedRepName || 'Unassigned',
      'Attached Contacts': c.contactCount || 0,
      'Open Deals Count': c.openDealsCount || 0,
      'Pipeline Value ($)': c.pipelineValue || 0,
      'Won Deals Count': c.wonDealsCount || 0,
      'Won Revenue ($)': c.revenueWon || 0,
      'Total Contracts': c.totalContracts || 0,
      'Contract Value ($)': c.contractValue || 0,
      'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
    }));
    exportCSV(csvRows, `company_portfolio_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* ── 1. Master Reports Navigation ──────────────────────────────── */}
        <ReportsNav
          activeCategory="companies"
          subTabs={subTabs}
          activeSubTab={activeSubTab}
          onSubTabChange={(id) => setActiveSubTab(id as CompanySubTab)}
        />

        {/* ── 2. Header & Live Date/Scope Controls ───────────────────────── */}
        <ReportHeader
          title="Company Accounts & B2B Report"
          description="Industry vertical diversification, corporate stakeholder contact density, and enterprise deal pipeline valuation."
          badge="B2B Enterprise"
          startDate={startDate}
          endDate={endDate}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          scope={scope}
          onScopeChange={setScope}
          onRefresh={fetchCompanyData}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          loading={loading}
        />

        {/* ── 3. Executive KPI Summary ──────────────────────────────────────── */}
        <ReportSummaryBanner 
          items={[
            kpis[0], // Total Organizations
            kpis[1], // Attached Stakeholders
            kpis[2], // B2B Revenue Closed
            kpis[3], // Open B2B Pipeline
          ]} 
          loading={loading} 
        />

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'overview' && (
          <>
            <div className="clean-charts-grid">
              {/* Industry Bar Chart */}
              <ReportChartCard
                title="Accounts by Industry Sector"
                subtitle="Top business verticals represented across your client base"
                badge="Market Verticals"
                badgeColor="#2563eb"
                icon={<Briefcase size={16} />}
                loading={loading}
                empty={!data?.industryBreakdown || data.industryBreakdown.length === 0}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.industryBreakdown?.slice(0, 8) || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} allowDecimals={false} />
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Organizations`} />} />
                    <Bar dataKey="count" name="Companies" radius={[6, 6, 0, 0]}>
                      {(data?.industryBreakdown || []).map((_: any, idx: number) => (
                        <Cell key={`ind-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ReportChartCard>

              {/* Organization Size Donut */}
              <ReportChartCard
                title="Organization Scale & Size Tiers"
                subtitle="Headcount tiers and company scale distribution"
                badge="Scale Tiers"
                badgeColor="#10b981"
                icon={<Layers size={16} />}
                loading={loading}
                empty={!data?.sizeBreakdown || data.sizeBreakdown.length === 0}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data?.sizeBreakdown || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {(data?.sizeBreakdown || []).map((_: any, idx: number) => (
                        <Cell key={`sz-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip formatter={(v: number) => `${v} Organizations`} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            {/* Strategic Guidance Guidance Cards */}
            <div className="clean-card" style={{ marginBottom: '24px' }}>
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Executive B2B Strategic Guidance</h3>
                  <p className="clean-card-subtitle">Actionable intelligence derived from company portfolio analytics</p>
                </div>
              </div>
              <div className="clean-guidance-grid" style={{ padding: '0 16px 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: '10px', padding: '16px' }}>
                  <strong style={{ display: 'block', color: '#2563eb', marginBottom: '6px', fontSize: '13px' }}>
                    🏢 Stakeholder Depth & Champions
                  </strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                    Your accounts average <strong>{data?.avgContactsPerCompany ?? 0}</strong> contacts per organization. Aim for 2+ key champions on major accounts to mitigate single point attrition risk.
                  </p>
                </div>

                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '10px', padding: '16px' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: '6px', fontSize: '13px' }}>
                    📈 Vertical Focus & Industry Campaign
                  </strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                    <strong>{data?.industryBreakdown?.[0]?.name || 'Top sector'}</strong> represents your primary market segment. Target industry-specific product workflows to accelerate deal velocity.
                  </p>
                </div>

                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px', padding: '16px' }}>
                  <strong style={{ display: 'block', color: '#f59e0b', marginBottom: '6px', fontSize: '13px' }}>
                    🌐 Digital Profile Enrichment
                  </strong>
                  <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                    <strong>{data?.withWebsite ?? 0}</strong> of {data?.totalCompanies ?? 0} accounts have verified corporate websites. Enrich missing domain URLs to automate email verification and firmographics.
                  </p>
                </div>
              </div>
            </div>

            {/* Key Accounts Cards Grid */}
            <div className="clean-card" style={{ marginBottom: '24px' }}>
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Top Corporate Accounts by Revenue & Contacts</h3>
                  <p className="clean-card-subtitle">Organizations ranked by realized closed deal revenue and stakeholder contacts</p>
                </div>
                <span className="clean-badge clean-badge-primary">
                  {data?.topAccounts?.length || 0} Key Accounts
                </span>
              </div>
              <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {(data?.topAccounts || []).slice(0, 8).map((c: any, idx: number) => (
                  <div
                    key={c.companyId}
                    style={{
                      background: 'var(--color-bg, #f8fafc)',
                      border: '1px solid var(--color-border, #e2e8f0)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>
                          #{idx + 1} CORPORATE ACCOUNT
                        </span>
                        <span className="clean-badge clean-badge-primary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {c.contactCount} Contacts
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--color-text, #0f172a)' }}>
                        {c.name}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                        <div>Sector: <strong style={{ color: 'var(--color-text, #1e293b)' }}>{c.industry}</strong></div>
                        {c.companySize && <div>Size: {c.companySize}</div>}
                        {c.website && (
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <a
                              href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#2563eb', textDecoration: 'none' }}
                            >
                              {c.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Won Revenue</div>
                        <strong style={{ fontSize: '13px', color: '#10b981' }}>{fmt$(c.revenueWon)}</strong>
                      </div>
                      <button
                        onClick={() => navigate(`/companies/${c.companyId}`)}
                        className="clean-btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        Profile <ExternalLink size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: INDUSTRIES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'industries' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Industry Sector Breakdown & Valuation</h3>
                <p className="clean-card-subtitle">Market sectors, organization volume, realized revenue, and open pipeline value</p>
              </div>
              <span className="clean-badge clean-badge-primary">
                {data?.industryBreakdown?.length || 0} Verticals
              </span>
            </div>
            <ReportDataTable
              columns={industryColumns}
              data={data?.industryBreakdown || []}
              loading={loading}
              emptyMessage="No industry sector data available for the selected range."
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: SIZE TIERS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'size' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Organization Scale & Size Tiers</h3>
                <p className="clean-card-subtitle">Headcount tiers, account volume, and revenue contribution</p>
              </div>
              <span className="clean-badge clean-badge-info">
                {data?.sizeBreakdown?.length || 0} Size Tiers
              </span>
            </div>
            <ReportDataTable
              columns={sizeColumns}
              data={data?.sizeBreakdown || []}
              loading={loading}
              emptyMessage="No company size tier data available."
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: REVENUE & PIPELINE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'revenue' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Corporate Revenue & Pipeline Valuation</h3>
                <p className="clean-card-subtitle">Accounts ranked by realized closed won deal revenue and active deal pipeline</p>
              </div>
              <span className="clean-badge clean-badge-success">
                {data?.items?.length || 0} Enterprise Accounts
              </span>
            </div>
            <ReportDataTable
              columns={companyColumns}
              data={[...(data?.items || [])].sort((a, b) => (b.revenueWon || 0) - (a.revenueWon || 0))}
              loading={loading}
              searchable
              searchPlaceholder="Search company, sector, website..."
              emptyMessage="No revenue records found for companies in this range."
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: DIRECTORY LEDGER */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeSubTab === 'directory' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Corporate Directory Ledger</h3>
                <p className="clean-card-subtitle">Complete searchable, filterable database of enterprise organizations</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #e2e8f0)',
                    background: 'var(--color-bg, #f8fafc)',
                    color: 'var(--color-text, #1e293b)',
                    fontSize: '12px'
                  }}
                >
                  <option value="All">All Industries</option>
                  {uniqueIndustries.map((ind: string) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>

                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border, #e2e8f0)',
                    background: 'var(--color-bg, #f8fafc)',
                    color: 'var(--color-text, #1e293b)',
                    fontSize: '12px'
                  }}
                >
                  <option value="All">All Size Tiers</option>
                  {uniqueSizes.map((sz: string) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>
            </div>
            <ReportDataTable
              columns={companyColumns}
              data={filteredItems}
              loading={loading}
              searchable
              searchPlaceholder="Search company, industry, domain, email..."
              emptyMessage="No corporate records found matching the query."
            />
          </div>
        )}
      </div>
    </Layout>
  );
};
export default CompanyReportsScreen;
