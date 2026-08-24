import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { api } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Building2, Users, Download, ArrowLeft, Globe,
  Briefcase, TrendingUp, Layers, FileText, FileSpreadsheet,
  RefreshCw, ExternalLink, Search, Sparkles, Filter, ChevronRight,
  BarChart3, PieChart as PieIcon, Table as TableIcon, Phone, Mail,
  CheckCircle2, ArrowUpRight
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

// ─── PDF Report Generator for Companies ───────────────────────────────────────
function exportCompanyPDF(companies: any[]) {
  if (!companies || !companies.length) return;

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `company_portfolio_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const totalContacts = companies.reduce((sum, c) => sum + (c.contactCount || 0), 0);
  const withWebsite = companies.filter(c => Boolean(c.website)).length;
  const avgContacts = companies.length > 0 ? (totalContacts / companies.length).toFixed(1) : '0';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Company Accounts & B2B Portfolio Report - CRM</title>
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
            background: #3b82f6;
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
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
          }
          .pdf-btn-primary:hover { background: #2563eb; }
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
          .pdf-btn-secondary:hover { background: rgba(255,255,255,0.25); }
          @media print { .pdf-action-bar { display: none !important; } }
          .pdf-container { padding: 10px; background: #fff; }
          .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .pdf-brand { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px 0; }
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
          .pdf-insights-box {
            background: #f1f5f9;
            border-left: 4px solid #3b82f6;
            padding: 10px 14px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 18px;
          }
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
          .pdf-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 8px; }
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
          .pdf-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; COMPANY REPORT</h1>
              <p class="pdf-sub">B2B Corporate Account Segmentation & Stakeholder Contact Depth</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Total Accounts:</strong> ${companies.length}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Organizations</div>
              <div class="pdf-stat-value">${companies.length}</div>
              <div class="pdf-stat-sub">Active corporate accounts</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Attached Contacts</div>
              <div class="pdf-stat-value">${totalContacts}</div>
              <div class="pdf-stat-sub">Team members registered</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Digital Presence</div>
              <div class="pdf-stat-value">${withWebsite}</div>
              <div class="pdf-stat-sub">Verified website accounts</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Avg Contacts / Org</div>
              <div class="pdf-stat-value">${avgContacts}</div>
              <div class="pdf-stat-sub">Account stakeholder depth</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Strategic Corporate Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>Stakeholder Density:</strong> Average of <strong>${avgContacts}</strong> contacts per organization. Target multi-stakeholder mapping (2+ contacts) on high-value accounts to prevent single-point attrition.</li>
              <li><strong>Sector Diversification:</strong> Track industry distribution to identify high-converting verticals and focus enterprise sales campaigns.</li>
              <li><strong>Account Hygiene:</strong> <strong>${withWebsite}</strong> out of ${companies.length} organizations have verified websites. Ensure complete digital profiles for all active accounts.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Corporate Directory Ledger (${companies.length} Accounts)</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Company Name</th>
                <th>Industry Sector</th>
                <th>Company Size</th>
                <th>Website</th>
                <th>Phone</th>
                <th>Contacts</th>
              </tr>
            </thead>
            <tbody>
              ${companies.map((c, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${c.name}</strong></td>
                  <td>${c.industry || 'General'}</td>
                  <td>${c.companySize || '—'}</td>
                  <td>${c.website || '—'}</td>
                  <td>${c.phone || '—'}</td>
                  <td><strong>${c.contactCount || 0}</strong></td>
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

export const CompanyReportsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'distribution' | 'top_accounts' | 'directory'>('distribution');
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');

  const fetchCompanies = () => {
    setLoading(true);
    api.get<any>('/api/companies?page=1&pageSize=1000')
      .then(res => {
        const list = Array.isArray(res)
          ? res
          : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.items) ? res.items : []));
        setCompanies(list);
      })
      .catch(err => {
        console.error('Failed to load company report data', err);
        setCompanies([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const totalContacts = useMemo(() => {
    if (!Array.isArray(companies)) return 0;
    return companies.reduce((sum, c) => sum + (c.contactCount || 0), 0);
  }, [companies]);

  const withWebsite = useMemo(() => {
    if (!Array.isArray(companies)) return 0;
    return companies.filter(c => Boolean(c.website)).length;
  }, [companies]);

  const industryBreakdown = useMemo(() => {
    if (!Array.isArray(companies) || companies.length === 0) {
      return [{ name: 'No Data', count: 0 }];
    }
    const counts: Record<string, number> = {};
    companies.forEach(c => {
      const ind = c.industry?.trim() || 'Uncategorized';
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [companies]);

  const sizeBreakdown = useMemo(() => {
    if (!Array.isArray(companies) || companies.length === 0) {
      return [{ name: 'Not Specified', count: 0 }];
    }
    const counts: Record<string, number> = {};
    companies.forEach(c => {
      const size = c.companySize?.trim() || 'Not Specified';
      counts[size] = (counts[size] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [companies]);

  const uniqueIndustries = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    const set = new Set<string>();
    companies.forEach(c => {
      if (c.industry) set.add(c.industry);
    });
    return Array.from(set);
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (!Array.isArray(companies)) return [];
    return companies.filter(c => {
      const matchesSearch =
        !searchTerm ||
        (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.industry && c.industry.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.companySize && c.companySize.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.website && c.website.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesIndustry = industryFilter === 'all' || c.industry === industryFilter;
      const matchesSize = sizeFilter === 'all' || c.companySize === sizeFilter;

      return matchesSearch && matchesIndustry && matchesSize;
    });
  }, [companies, searchTerm, industryFilter, sizeFilter]);

  // Robust CSV Export
  const handleExportCSV = () => {
    if (!companies || !companies.length) {
      alert('No company records available to export.');
      return;
    }
    const headers = ['CompanyId', 'Name', 'Industry', 'CompanySize', 'Website', 'Phone', 'Email', 'ContactCount'];
    const rows = companies.map(c => [
      c.companyId,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.industry || '').replace(/"/g, '""')}"`,
      `"${(c.companySize || '').replace(/"/g, '""')}"`,
      `"${(c.website || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      c.contactCount || 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `company_portfolio_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPDF = () => {
    if (!companies || !companies.length) {
      alert('No company records available to export.');
      return;
    }
    exportCompanyPDF(companies);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header & Controls */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/companies')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Companies
              </button>
              <span className="clean-badge clean-badge-primary">
                B2B Enterprise Intelligence
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportPDF}
                className="clean-btn-primary"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                title="Export PDF Executive Summary"
              >
                <FileText size={15} /> Export PDF
              </button>
              <button onClick={handleExportCSV} className="clean-btn-secondary" title="Download CSV Dataset">
                <FileSpreadsheet size={15} /> Export CSV
              </button>
              <button onClick={fetchCompanies} className="clean-btn-secondary" style={{ padding: '6px 10px' }} title="Refresh Data">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="clean-title-group">
            <h1 className="clean-report-title">
              Company Accounts & B2B Portfolio Report
            </h1>
            <p className="clean-report-desc">
              Industry vertical diversification, organization size distribution, and key corporate account density.
            </p>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="clean-stat-grid">
          {/* Total Companies */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Organizations</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <Building2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{companies.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Active</span>
              <span>B2B enterprise accounts</span>
            </div>
          </div>

          {/* Industries */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Market Sectors</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <Layers size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{industryBreakdown.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">Tracked</span>
              <span>Industry verticals</span>
            </div>
          </div>

          {/* Digital Presence */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Digital Presence</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                <Globe size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{withWebsite}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">
                {companies.length > 0 ? ((withWebsite / companies.length) * 100).toFixed(0) : 0}%
              </span>
              <span>Verified websites</span>
            </div>
          </div>

          {/* Attached Contacts */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Attached Contacts</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Users size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{totalContacts}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b' }}>
                {companies.length > 0 ? (totalContacts / companies.length).toFixed(1) : 0} / org
              </span>
              <span>Team stakeholder depth</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="clean-tab-nav">
          <button
            onClick={() => setActiveTab('distribution')}
            className={`clean-tab-item ${activeTab === 'distribution' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Industry & Size Distribution
          </button>
          <button
            onClick={() => setActiveTab('top_accounts')}
            className={`clean-tab-item ${activeTab === 'top_accounts' ? 'active' : ''}`}
          >
            <Building2 size={15} /> Key Accounts by Contact Density
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Corporate Directory Ledger ({companies.length})
          </button>
        </div>

        {/* TAB 1: DISTRIBUTION */}
        {activeTab === 'distribution' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="clean-chart-grid">
              {/* Industry Bar Chart */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Accounts by Industry Sector</h3>
                    <p className="clean-card-sub">Top business verticals represented across your client base</p>
                  </div>
                </div>
                <div style={{ height: 280, padding: '1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={industryBreakdown.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                      <Tooltip formatter={(val: any) => [`${val} Organizations`, 'Count']} />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                        {industryBreakdown.map((_, idx) => (
                          <Cell key={`ind-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Company Size Donut */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Organization Size Tiers</h3>
                    <p className="clean-card-sub">Headcount scale and enterprise tier distribution</p>
                  </div>
                </div>
                <div style={{ height: 280, padding: '1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sizeBreakdown}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        label={(entry: any) => `${entry.name || ''}: ${entry.value ?? entry.count ?? 0}`}
                      >
                        {sizeBreakdown.map((_, idx) => (
                          <Cell key={`sz-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive B2B Strategic Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#3b82f6', marginBottom: 4, fontSize: '0.82rem' }}>
                    🏢 Stakeholder Depth
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Your accounts average <strong>{companies.length > 0 ? (totalContacts / companies.length).toFixed(1) : 0}</strong> contacts per organization. Aim for 2+ key champions on major accounts to build resilience.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    📈 Vertical Focus
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{industryBreakdown[0]?.name || 'Top sector'}</strong> represents your largest customer segment. Develop tailored case studies for this vertical to accelerate new deals.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#f59e0b', marginBottom: 4, fontSize: '0.82rem' }}>
                    🌐 Digital Profile Completion
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{withWebsite}</strong> of {companies.length} organizations have verified websites. Enrich missing records with corporate domains to power automated enrichment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TOP ACCOUNTS */}
        {activeTab === 'top_accounts' && (
          <div className="clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Key Accounts by Team Size & Stakeholders</h3>
                <p className="clean-card-sub">Organizations ranked by number of associated customer contacts</p>
              </div>
              <span className="clean-badge clean-badge-primary">
                {companies.length} Organizations
              </span>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {companies.length === 0 ? (
                <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '3rem', color: 'var(--text-muted)' }}>
                  No corporate accounts created yet
                </div>
              ) : (
                [...companies]
                  .sort((a, b) => (b.contactCount || 0) - (a.contactCount || 0))
                  .slice(0, 12)
                  .map((c, idx) => (
                    <div
                      key={c.companyId}
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
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3b82f6' }}>
                            #{idx + 1} CORPORATE ACCOUNT
                          </span>
                          <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            {c.contactCount || 0} Contacts
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {c.name}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <div>Industry: <strong style={{ color: 'var(--text-primary)' }}>{c.industry || 'General'}</strong></div>
                          {c.companySize && <div>Size: {c.companySize}</div>}
                          {c.website && (
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent, #6366f1)', textDecoration: 'none' }}>
                                {c.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => navigate(`/companies/${c.companyId}`)}
                          className="clean-back-btn"
                          style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                          Profile <ExternalLink size={11} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DIRECTORY LEDGER */}
        {activeTab === 'directory' && (
          <div className="clean-card">
            <div className="clean-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 240, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search company, industry, domain..."
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
                  value={industryFilter}
                  onChange={e => setIndustryFilter(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="all">All Industries</option>
                  {uniqueIndustries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredCompanies.length}</strong> of {companies.length} records
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

            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Industry Sector</th>
                    <th>Size Tier</th>
                    <th>Website Domain</th>
                    <th>Contacts</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No corporate accounts match your query
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map(c => (
                      <tr key={c.companyId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                flexShrink: 0
                              }}
                            >
                              <Building2 size={15} />
                            </div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{c.name}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.72rem' }}>
                            {c.industry || 'General'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {c.companySize || '—'}
                        </td>
                        <td>
                          {c.website ? (
                            <a
                              href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--accent, #6366f1)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}
                            >
                              <Globe size={12} style={{ color: 'var(--text-muted)' }} /> {c.website}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{c.contactCount || 0}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/companies/${c.companyId}`)}
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
