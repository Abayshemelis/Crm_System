import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import {
  UserCircle, Trophy, Crown, ArrowLeft, Download,
  TrendingUp, Award, DollarSign, Target, FileText,
  FileSpreadsheet, RefreshCw, Search, Sparkles, Filter,
  ExternalLink, Table as TableIcon, BarChart3, ArrowUpRight
} from 'lucide-react';
import { ReportSummaryBanner } from '../../components/reports/ReportKpiCard';
import './cleanReports.css';

const PALETTE = ['#f59e0b', '#10b981', '#6366f1', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

// ─── PDF Generator for User / Rep Reports ─────────────────────────────────────
function exportRepPDF(reps: any[], totalRevenue: number, totalDeals: number, dateRange: string) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `sales_rep_leaderboard_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const topRep = reps.length > 0 ? reps[0] : null;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sales Rep Performance Leaderboard Report - CRM</title>
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
            background: #f59e0b;
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
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
          }
          .pdf-btn-primary:hover { background: #d97706; }
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
          .pdf-brand { font-size: 20px; font-weight: 800; color: #78350f; margin: 0 0 4px 0; }
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
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; TEAM LEADERBOARD REPORT</h1>
              <p class="pdf-sub">Sales Rep Deal Wins, Won Revenue Production & Win Rates</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Closed Revenue</div>
              <div class="pdf-stat-value" style="color: #10b981;">$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="pdf-stat-sub">Team closed won production</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Won Deals</div>
              <div class="pdf-stat-value">${totalDeals}</div>
              <div class="pdf-stat-sub">Executed customer deals</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Top Producing Rep</div>
              <div class="pdf-stat-value" style="font-size: 15px;">${topRep?.repName || '—'}</div>
              <div class="pdf-stat-sub">$${(topRep?.revenueWon || 0).toLocaleString()} Won</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Active Sales Reps</div>
              <div class="pdf-stat-value">${reps.length}</div>
              <div class="pdf-stat-sub">Tracked team members</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #78350f; margin-bottom: 4px; text-transform: uppercase;">
              Executive Sales Leadership Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #451a03; line-height: 1.4;">
              <li><strong>Top Performance:</strong> <strong>${topRep?.repName || 'Leading rep'}</strong> leads the quota board with <strong>$${(topRep?.revenueWon || 0).toLocaleString()}</strong> in closed revenue.</li>
              <li><strong>Quota Enablement:</strong> Facilitate peer coaching on deal objection handling and proposal scoping for emerging sales reps.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Sales Rep Rankings Ledger</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Sales Representative</th>
                <th>Deals Won</th>
                <th>Revenue Won ($)</th>
                <th>Win Rate (%)</th>
                <th>Assigned Leads</th>
              </tr>
            </thead>
            <tbody>
              ${reps.map((r, i) => `
                <tr>
                  <td><strong>#${i + 1}</strong></td>
                  <td><strong>${r.repName}</strong></td>
                  <td>${r.dealsWon || 0}</td>
                  <td style="color: #10b981; font-weight: 700;">$${(r.revenueWon || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td>${r.winRate ? `${r.winRate.toFixed(1)}%` : '—'}</td>
                  <td>${r.leadsCount || 0}</td>
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

export const UserReportsScreen: React.FC = () => {
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [repPerf, setRepPerf] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      q.append('scope', 'company');

      const res = await api.get<any>(`/api/reports/team?${q.toString()}`);
      const list = Array.isArray(res) ? res : (res?.reps ?? []);
      setRepPerf(list);
    } catch (err) {
      console.error('Failed to load user reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const totalWonRevenue = useMemo(() => repPerf.reduce((sum, r) => sum + (r.revenueWon || 0), 0), [repPerf]);
  const totalWonDeals = useMemo(() => repPerf.reduce((sum, r) => sum + (r.dealsWon || 0), 0), [repPerf]);
  const topRep = useMemo(() => repPerf.length > 0 ? repPerf[0] : null, [repPerf]);

  const filteredReps = useMemo(() => {
    if (!searchTerm) return repPerf;
    return repPerf.filter(r => (r.repName || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [repPerf, searchTerm]);

  const handleExportCSV = () => {
    if (!repPerf.length) return;
    const headers = ['Rank', 'SalesRep', 'DealsWon', 'RevenueWon', 'WinRate', 'AssignedLeads'];
    const rows = repPerf.map((r, i) => [
      i + 1,
      `"${r.repName || ''}"`,
      r.dealsWon || 0,
      r.revenueWon || 0,
      r.winRate ? `${r.winRate.toFixed(1)}%` : '',
      r.leadsCount || 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_leaderboard_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/users')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Users
              </button>
              <span className="clean-badge clean-badge-primary">
                Team Leaderboard
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => exportRepPDF(repPerf, totalWonRevenue, totalWonDeals, activePreset)} className="clean-btn-primary" title="Export PDF Executive Report">
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
              Sales Rep Performance & Team Leaderboard Report
            </h1>
            <p className="clean-report-desc">
              Individual quota attainment, closed won revenue production, deal velocity, and prospect assignment.
            </p>
          </div>

          {/* Period presets */}
          <div className="clean-toolbar">
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

        {/* 4 Clean Metric Cards */}
        <ReportSummaryBanner
          items={[
            {
              label: 'Total Closed Revenue',
              value: `$${totalWonRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              sub: 'Team total closed production',
              icon: <DollarSign size={17} />,
              color: '#10b981',
              deltaUp: true
            },
            {
              label: 'Closed Won Deals',
              value: totalWonDeals,
              sub: 'Successfully closed',
              icon: <Award size={17} />,
              color: '#f59e0b'
            },
            {
              label: 'Top Producing Rep',
              value: topRep?.repName || '—',
              sub: 'Leaderboard #1',
              icon: <Crown size={17} />,
              color: '#eab308'
            },
            {
              label: 'Active Team Reps',
              value: repPerf.length,
              sub: 'Contributing reps',
              icon: <UserCircle size={17} />,
              color: '#6366f1'
            }
          ]}
          loading={loading}
        />

        {/* Chart */}
        <div className="clean-card">
          <div className="clean-card-header">
            <div>
              <h3 className="clean-card-title">Closed Won Revenue by Sales Representative</h3>
              <p className="clean-card-sub">Individual contribution ranking</p>
            </div>
          </div>
          <div style={{ height: 280, padding: '1rem' }}>
            {repPerf.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No rep sales recorded in this window
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={repPerf} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                  <XAxis dataKey="repName" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue Won']} />
                  <Bar dataKey="revenueWon" radius={[5, 5, 0, 0]}>
                    {repPerf.map((_, idx) => (
                      <Cell key={`rep-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Directory Ledger Table */}
        <div className="clean-card">
          <div className="clean-card-header">
            <div style={{ position: 'relative', width: 280 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search sales rep..."
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong>{filteredReps.length}</strong> of {repPerf.length} sales reps
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
                  <th>Leaderboard Rank</th>
                  <th>Sales Representative</th>
                  <th>Deals Won</th>
                  <th>Revenue Won ($)</th>
                  <th>Win Rate (%)</th>
                  <th>Assigned Leads</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReps.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No sales rep records found
                    </td>
                  </tr>
                ) : (
                  filteredReps.map((r, i) => (
                    <tr key={r.repId || i}>
                      <td>
                        <span
                          className="clean-badge"
                          style={{
                            background: i === 0 ? 'rgba(234,179,8,0.15)' : i === 1 ? 'rgba(148,163,184,0.15)' : 'rgba(99,102,241,0.15)',
                            color: i === 0 ? '#eab308' : i === 1 ? '#94a3b8' : '#818cf8',
                            fontSize: '0.75rem',
                            fontWeight: 800
                          }}
                        >
                          #{i + 1}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {r.repName}
                        </strong>
                      </td>
                      <td><strong>{r.dealsWon || 0}</strong></td>
                      <td>
                        <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>
                          ${Number(r.revenueWon || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.72rem' }}>
                          {r.winRate ? `${r.winRate.toFixed(1)}%` : '—'}
                        </span>
                      </td>
                      <td>{r.leadsCount || 0}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => navigate('/users')}
                          className="clean-back-btn"
                          style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                        >
                          User <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};
