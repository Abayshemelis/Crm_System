import React, { useState, useEffect, useMemo } from 'react';
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
  Users, UserCheck, TrendingUp, Download, RefreshCw,
  ArrowLeft, Calendar, FileText, CheckCircle2, ShieldCheck,
  Building2, Phone, Mail, Award, DollarSign, Search,
  Sparkles, Filter, ExternalLink, ChevronRight, Layers,
  BarChart3, PieChart as PieIcon, Table as TableIcon, ArrowUpRight,
  FileSpreadsheet
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

// ─── PDF Report Generator for Customers ────────────────────────────────────────
function exportCustomerPDF(customers: any[], overview: any, dateRange: string, scope: string) {
  if (!customers) return;

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `customer_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const corporateCount = customers.filter(c => Boolean(c.companyName)).length;
  const individualCount = customers.length - corporateCount;
  const corporatePct = customers.length > 0 ? ((corporateCount / customers.length) * 100).toFixed(1) : '0';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Customer Analytics & Portfolio Report - CRM</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pdf-action-bar {
            position: fixed;
            top: 15px;
            right: 15px;
            display: flex;
            gap: 10px;
            z-index: 9999;
            background: rgba(15, 23, 42, 0.9);
            padding: 8px 14px;
            border-radius: 30px;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          }
          .pdf-btn-primary {
            background: #6366f1;
            color: white;
            border: none;
            padding: 7px 16px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
          }
          .pdf-btn-primary:hover { background: #4f46e5; }
          .pdf-btn-secondary {
            background: rgba(255,255,255,0.15);
            color: white;
            border: none;
            padding: 7px 14px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
          }
          @media print {
            .pdf-action-bar { display: none !important; }
          }
          .pdf-container { padding: 10px; background: #fff; }
          .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .pdf-brand { font-size: 20px; font-weight: 800; color: #1e1b4b; margin: 0 0 4px 0; }
          .pdf-sub { font-size: 11px; color: #64748b; margin: 0; }
          .pdf-meta { text-align: right; font-size: 10px; color: #64748b; }
          .pdf-stat-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 18px;
          }
          .pdf-stat-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
          }
          .pdf-stat-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .pdf-stat-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
          .pdf-stat-sub { font-size: 9.5px; color: #94a3b8; }
          .pdf-section-title {
            font-size: 13px;
            font-weight: 800;
            color: #1e293b;
            margin: 16px 0 8px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .pdf-insights-box {
            background: #f1f5f9;
            border-left: 4px solid #6366f1;
            padding: 10px 14px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 18px;
          }
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin-top: 8px;
          }
          .pdf-table th {
            background: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 7px 10px;
            font-weight: 700;
            border-bottom: 1px solid #cbd5e1;
            text-transform: uppercase;
            font-size: 9px;
          }
          .pdf-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
          }
          .pdf-table tr:nth-child(even) td { background: #fafafa; }
          .pdf-footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="pdf-action-bar">
          <button class="pdf-btn-primary" id="download-btn">📥 Download PDF</button>
          <button class="pdf-btn-secondary" onclick="window.print()">🖨️ Print</button>
          <button class="pdf-btn-secondary" onclick="window.close()">✕ Close</button>
        </div>

        <div class="pdf-container" id="pdf-content">
          <div class="pdf-header">
            <div>
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; CUSTOMER REPORT</h1>
              <p class="pdf-sub">Client Portfolio Composition, Acquisition Velocity & Directory Roster</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Reporting Window:</strong> ${dateRange}</div>
              <div><strong>Data Scope:</strong> ${scope.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Customer Accounts</div>
              <div class="pdf-stat-value">${overview?.totalCustomers ?? customers.length}</div>
              <div class="pdf-stat-sub">Active CRM database volume</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">New Customers (Period)</div>
              <div class="pdf-stat-value">${overview?.newCustomers ?? 0}</div>
              <div class="pdf-stat-sub">Newly onboarded accounts</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Corporate Accounts (B2B)</div>
              <div class="pdf-stat-value">${corporateCount}</div>
              <div class="pdf-stat-sub">${corporatePct}% of portfolio</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Individual Clients</div>
              <div class="pdf-stat-value">${individualCount}</div>
              <div class="pdf-stat-sub">Direct decision makers</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Strategic Portfolio Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>B2B Penetration:</strong> Corporate clients make up <strong>${corporatePct}%</strong> of total accounts. Maintain dedicated relationship managers for multi-contact accounts.</li>
              <li><strong>Acquisition Velocity:</strong> Recorded <strong>${overview?.newCustomers ?? 0}</strong> client additions during this reporting window.</li>
              <li><strong>Retention SLA:</strong> Enforce 30-day proactive touchpoint schedules to preserve client health and accelerate upsell opportunities.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Customer Directory Ledger (${customers.length} Total Records)</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Classification</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Acquisition Source</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              ${customers.map((c, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${c.firstName || ''} ${c.lastName || ''}</strong></td>
                  <td>${c.companyName ? `Corporate (${c.companyName})` : 'Individual Client'}</td>
                  <td>${c.email || '—'}</td>
                  <td>${c.phone || '—'}</td>
                  <td>${c.sourceName || 'Direct'}</td>
                  <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="pdf-footer">
            <span>CRM Enterprise System &bull; Confidential Executive Report</span>
            <span>System Generated &bull; Page 1</span>
          </div>
        </div>

        <script>
          function triggerDownload() {
            var element = document.getElementById('pdf-content');
            var opt = {
              margin:       [8, 8, 8, 8],
              filename:     '${filename}',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2, useCORS: true },
              jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            if (window.html2pdf) {
              window.html2pdf().set(opt).from(element).save();
            } else {
              window.print();
            }
          }

          document.getElementById('download-btn').addEventListener('click', triggerDownload);
          window.onload = function() {
            setTimeout(triggerDownload, 600);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export const CustomerReportsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isManagerOrAbove } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const m30   = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0];
  const m90   = new Date(Date.now() - 90 * 86400_000).toISOString().split('T')[0];
  const m365  = new Date(Date.now() - 365 * 86400_000).toISOString().split('T')[0];

  const PRESETS = [
    { label: '30 Days', start: m30, end: today },
    { label: '90 Days', start: m90, end: today },
    { label: '1 Year', start: m365, end: today },
    { label: 'All Time', start: '', end: '' },
  ];

  const [startDate, setStartDate] = useState(m30);
  const [endDate, setEndDate] = useState(today);
  const [activePreset, setActivePreset] = useState('30 Days');
  const [dataScope, setDataScope] = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [loading, setLoading] = useState(true);

  // Active view tab inside customer report
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'companies' | 'directory'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'corporate' | 'individual'>('all');

  const [overview, setOverview] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      q.append('scope', dataScope);

      const [ovData, custRes] = await Promise.all([
        api.get<any>(`/api/reports/overview?${q.toString()}`),
        api.get<any>('/api/customers?page=1&pageSize=1000')
      ]);

      setOverview(ovData);
      const list = Array.isArray(custRes)
        ? custRes
        : (Array.isArray(custRes?.data) ? custRes.data : (Array.isArray(custRes?.items) ? custRes.items : []));
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load customer report data', err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, dataScope]);

  // Account type breakdown
  const accountTypeBreakdown = useMemo(() => {
    if (!Array.isArray(customers) || customers.length === 0) {
      return [{ name: 'Corporate B2B', count: 0, color: '#6366f1' }, { name: 'Individual', count: 0, color: '#3b82f6' }];
    }
    const corporate = customers.filter(c => Boolean(c.companyName)).length;
    const individual = customers.length - corporate;
    return [
      { name: 'Corporate B2B', count: corporate, color: '#6366f1' },
      { name: 'Individual Client', count: individual, color: '#3b82f6' }
    ];
  }, [customers]);

  // Acquisition source breakdown
  const sourceBreakdown = useMemo(() => {
    if (!Array.isArray(customers) || customers.length === 0) {
      return [];
    }
    const counts: Record<string, number> = {};
    customers.forEach(c => {
      const src = c.sourceName || 'Direct / Organic';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [customers]);

  // Acquisition Timeline (group by month)
  const acquisitionTimeline = useMemo(() => {
    if (!Array.isArray(customers) || customers.length === 0) {
      return [];
    }
    const monthlyMap: Record<string, number> = {};
    customers.forEach(c => {
      if (c.createdAt) {
        const month = c.createdAt.slice(0, 7); // YYYY-MM
        monthlyMap[month] = (monthlyMap[month] || 0) + 1;
      }
    });

    return Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month,
        newCustomers: count
      }));
  }, [customers]);

  // Top Companies with attached customer count
  const topCompaniesList = useMemo(() => {
    if (!Array.isArray(customers) || customers.length === 0) {
      return [];
    }
    const compMap: Record<string, { companyName: string; contacts: any[]; count: number }> = {};
    customers.forEach(c => {
      if (c.companyName) {
        if (!compMap[c.companyName]) {
          compMap[c.companyName] = { companyName: c.companyName, contacts: [], count: 0 };
        }
        compMap[c.companyName].contacts.push(c);
        compMap[c.companyName].count += 1;
      }
    });
    return Object.values(compMap).sort((a, b) => b.count - a.count);
  }, [customers]);

  // Filtered customer directory
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    return customers.filter(c => {
      const matchesSearch =
        !searchTerm ||
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.sourceName && c.sourceName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'corporate' && Boolean(c.companyName)) ||
        (typeFilter === 'individual' && !c.companyName);

      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, typeFilter]);

  // Reliable CSV Export
  const handleExportCSV = () => {
    if (!customers || !customers.length) {
      alert('No customer records available to export.');
      return;
    }
    const headers = ['CustomerId', 'FirstName', 'LastName', 'Email', 'Phone', 'JobTitle', 'Company', 'Source', 'CreatedAt'];
    const rows = customers.map(c => [
      c.customerId,
      `"${(c.firstName || '').replace(/"/g, '""')}"`,
      `"${(c.lastName || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.jobTitle || '').replace(/"/g, '""')}"`,
      `"${(c.companyName || '').replace(/"/g, '""')}"`,
      `"${(c.sourceName || '').replace(/"/g, '""')}"`,
      `"${c.createdAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customer_portfolio_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // PDF Export
  const handleExportPDF = () => {
    if (!customers || !customers.length) {
      alert('No customer records available to export.');
      return;
    }
    exportCustomerPDF(customers, overview, activePreset, dataScope);
  };

  const corporateCount = useMemo(() => customers.filter(c => Boolean(c.companyName)).length, [customers]);
  const corporatePct = useMemo(() => customers.length > 0 ? (corporateCount / customers.length) * 100 : 0, [corporateCount, customers]);

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Top Header & Breadcrumbs */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/customers')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Customers
              </button>
              <span className="clean-badge clean-badge-primary">
                Customer Intelligence
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleExportPDF} className="clean-btn-primary" title="Export PDF Executive Report">
                <FileText size={15} /> Export PDF
              </button>
              <button onClick={handleExportCSV} className="clean-btn-secondary" title="Download CSV Dataset">
                <FileSpreadsheet size={15} /> Export CSV
              </button>
              <button onClick={fetchData} className="clean-btn-secondary" style={{ padding: '6px 10px' }} title="Refresh Report Data">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="clean-title-group">
            <h1 className="clean-report-title">
              Customer Growth & Portfolio Analytics
            </h1>
            <p className="clean-report-desc">
              Comprehensive analysis of client acquisition velocity, corporate B2B penetration, and directory records.
            </p>
          </div>

          {/* Organized Filter Controls Toolbar */}
          <div className="clean-toolbar">
            <div className="clean-toolbar-group">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Scope:</span>
              {isManagerOrAbove && (
                <div className="clean-segmented">
                  <button
                    className={`clean-segmented-btn ${dataScope === 'personal' ? 'active' : ''}`}
                    onClick={() => setDataScope('personal')}
                  >
                    My Portfolio
                  </button>
                  <button
                    className={`clean-segmented-btn ${dataScope === 'team' ? 'active' : ''}`}
                    onClick={() => setDataScope('team')}
                  >
                    Entire Company
                  </button>
                </div>
              )}
            </div>

            <div className="clean-toolbar-group">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Period:</span>
              <div className="clean-preset-group">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    className={`clean-preset-btn ${activePreset === p.label ? 'active' : ''}`}
                    onClick={() => {
                      setActivePreset(p.label);
                      setStartDate(p.start);
                      setEndDate(p.end);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Clean 4-Metric Grid */}
        <div className="clean-stat-grid">
          {/* Total Customers */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Client Accounts</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                <Users size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{overview?.totalCustomers ?? customers.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Active</span>
              <span>CRM database records</span>
            </div>
          </div>

          {/* New Customers */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">New Customers (Period)</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <TrendingUp size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{overview?.newCustomers ?? 0}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">
                <ArrowUpRight size={11} /> Inflow
              </span>
              <span>Onboarded during period</span>
            </div>
          </div>

          {/* Corporate B2B */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Corporate Accounts (B2B)</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <Building2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{corporateCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">{corporatePct.toFixed(0)}%</span>
              <span>Share of total portfolio</span>
            </div>
          </div>

          {/* Direct Individual */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Direct Contacts</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <UserCheck size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{customers.length - corporateCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b' }}>
                {(100 - corporatePct).toFixed(0)}%
              </span>
              <span>Direct decision makers</span>
            </div>
          </div>
        </div>

        {/* Scrollable Clean Tab Navigation */}
        <div className="clean-tab-nav">
          <button
            onClick={() => setActiveTab('overview')}
            className={`clean-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Growth & Analytics
          </button>
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`clean-tab-item ${activeTab === 'breakdown' ? 'active' : ''}`}
          >
            <PieIcon size={15} /> Segmentation & Sources
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`clean-tab-item ${activeTab === 'companies' ? 'active' : ''}`}
          >
            <Building2 size={15} /> Top B2B Client Accounts ({topCompaniesList.length})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Complete Client Ledger ({customers.length})
          </button>
        </div>

        {/* TAB 1: GROWTH & TIMELINE ANALYTICS */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Timeline Chart Card */}
            <div className="clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Customer Acquisition Velocity Timeline</h3>
                  <p className="clean-card-sub">Monthly volume of newly converted and registered customer accounts</p>
                </div>
                <span className="clean-badge clean-badge-primary">Monthly Trend</span>
              </div>
              <div style={{ height: 300, padding: '1rem' }}>
                {acquisitionTimeline.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    No timeline data recorded for this window
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={acquisitionTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cleanCustGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                      <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                      <Tooltip formatter={(val: any) => [`${val} Clients`, 'New Customers']} />
                      <Area
                        type="monotone"
                        dataKey="newCustomers"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#cleanCustGrad)"
                        name="New Customers"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Strategic Insights Cards */}
            <div className="clean-card" style={{ background: 'var(--bg-secondary)' }}>
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive Portfolio Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#6366f1', marginBottom: 4, fontSize: '0.82rem' }}>
                    🏢 B2B Enterprise Penetration
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{corporatePct.toFixed(0)}%</strong> of your client roster consists of corporate business accounts. Enterprise accounts generate higher contract expansion opportunities.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    📈 Acquisition Velocity
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Over the reporting period, <strong>{overview?.newCustomers ?? 0}</strong> new clients have joined your CRM. Maintain 30-day touchpoint SLAs to maximize client retention.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#f59e0b', marginBottom: 4, fontSize: '0.82rem' }}>
                    🎯 Expansion Strategy
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Schedule periodic follow-up review tasks for key accounts and review open invoices to ensure zero churn on high-value corporate relationships.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SEGMENTATION & SOURCES */}
        {activeTab === 'breakdown' && (
          <div className="clean-chart-grid">
            {/* Account Classification */}
            <div className="clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Account Classification Distribution</h3>
                  <p className="clean-card-sub">Ratio between corporate B2B entities and direct individual clients</p>
                </div>
              </div>
              <div style={{ height: 280, padding: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountTypeBreakdown}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      label={(entry: any) => `${entry.name || ''}: ${entry.value ?? entry.count ?? 0}`}
                    >
                      {accountTypeBreakdown.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Acquisition Channels */}
            <div className="clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Customer Acquisition Channels</h3>
                  <p className="clean-card-sub">Marketing channels and lead sources that generated paying clients</p>
                </div>
              </div>
              <div style={{ height: 280, padding: '1rem' }}>
                {sourceBreakdown.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    No acquisition sources mapped yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourceBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                      <XAxis dataKey="source" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                      <Tooltip formatter={(val: any) => [`${val} Clients`, 'Acquired']} />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                        {sourceBreakdown.map((_, idx) => (
                          <Cell key={`src-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TOP B2B ACCOUNTS */}
        {activeTab === 'companies' && (
          <div className="clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Top Corporate Accounts by Contact Density</h3>
                <p className="clean-card-sub">Organizations with active client contacts registered in your CRM</p>
              </div>
              <span className="clean-badge clean-badge-primary">
                {topCompaniesList.length} Organizations
              </span>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {topCompaniesList.length === 0 ? (
                <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '3rem', color: 'var(--text-muted)' }}>
                  No corporate client accounts created yet
                </div>
              ) : (
                topCompaniesList.map((comp, idx) => (
                  <div
                    key={comp.companyName}
                    style={{
                      background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1' }}>
                          #{idx + 1} CORPORATE ACCOUNT
                        </span>
                        <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                          {comp.count} Contacts
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {comp.companyName}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {comp.contacts.slice(0, 3).map(contact => (
                          <div key={contact.customerId} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <UserCheck size={12} style={{ color: '#10b981' }} />
                            <span>{contact.firstName} {contact.lastName}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setSearchTerm(comp.companyName);
                          setActiveTab('directory');
                        }}
                        className="clean-back-btn"
                        style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        View Records <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: COMPLETE CLIENT DIRECTORY LEDGER */}
        {activeTab === 'directory' && (
          <div className="clean-card">
            {/* Search & Filter Toolbar */}
            <div className="clean-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 240, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search customer, email, company, source..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as any)}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="all">All Account Types</option>
                  <option value="corporate">Corporate B2B Only</option>
                  <option value="individual">Individual Clients Only</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredCustomers.length}</strong> of {customers.length} records
                </span>
                <button
                  onClick={handleExportCSV}
                  className="clean-btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  <Download size={12} /> Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Account Classification</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Acquisition Channel</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No customer records match your filter query
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(c => (
                      <tr key={c.customerId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                flexShrink: 0
                              }}
                            >
                              {c.firstName?.[0] || 'C'}{c.lastName?.[0] || ''}
                            </div>
                            <div>
                              <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.85rem' }}>
                                {c.firstName} {c.lastName}
                              </strong>
                              {c.jobTitle && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.jobTitle}</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          {c.companyName ? (
                            <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Building2 size={11} /> {c.companyName}
                            </span>
                          ) : (
                            <span className="clean-badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: '0.72rem' }}>
                              Individual
                            </span>
                          )}
                        </td>
                        <td>
                          {c.email ? (
                            <a href={`mailto:${c.email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}>
                              <Mail size={12} style={{ color: 'var(--text-muted)' }} /> {c.email}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {c.phone ? (
                            <a href={`tel:${c.phone}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}>
                              <Phone size={12} style={{ color: 'var(--text-muted)' }} /> {c.phone}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className="clean-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.72rem' }}>
                            {c.sourceName || 'Direct'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/customers/${c.customerId}`)}
                            className="clean-back-btn"
                            style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                          >
                            Profile <ExternalLink size={11} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
