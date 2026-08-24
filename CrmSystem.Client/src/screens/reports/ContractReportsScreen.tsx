import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  FileText, Download, ArrowLeft, CheckCircle2,
  DollarSign, Clock, ShieldCheck, AlertCircle,
  FileSpreadsheet, RefreshCw, Search, Sparkles,
  BarChart3, PieChart as PieIcon, Table as TableIcon,
  ExternalLink, ArrowUpRight
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4'];

// ─── PDF Generator for Contracts ──────────────────────────────────────────────
function exportContractPDF(contracts: any[], stats: any, dateRange: string, scope: string) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `contracts_portfolio_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const totalValue = stats?.totalContractValue ?? 0;
  const formattedVal = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Contracts & E-Signatures Portfolio Report - CRM</title>
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
            background: #10b981;
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
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          }
          .pdf-btn-primary:hover { background: #059669; }
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
          .pdf-brand { font-size: 20px; font-weight: 800; color: #064e3b; margin: 0 0 4px 0; }
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
            background: #ecfdf5;
            border-left: 4px solid #10b981;
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; CONTRACT REPORT</h1>
              <p class="pdf-sub">Portfolio Value, Legal E-Signatures & Execution Compliance</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
              <div><strong>Scope:</strong> ${scope.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Contract Value</div>
              <div class="pdf-stat-value">${formattedVal}</div>
              <div class="pdf-stat-sub">Executed portfolio volume</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Signed & Active</div>
              <div class="pdf-stat-value">${stats?.signedContracts ?? 0}</div>
              <div class="pdf-stat-sub">Legally binding agreements</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Pending Signatures</div>
              <div class="pdf-stat-value">${stats?.pendingContracts ?? 0}</div>
              <div class="pdf-stat-sub">Out for client execution</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Signing Completion Rate</div>
              <div class="pdf-stat-value">${stats?.signingRate ? `${stats.signingRate.toFixed(1)}%` : '—'}</div>
              <div class="pdf-stat-sub">Proposal-to-execution ratio</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #064e3b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Legal & Contract Governance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #064e3b; line-height: 1.4;">
              <li><strong>Portfolio Execution:</strong> <strong>${formattedVal}</strong> committed revenue across active contracts.</li>
              <li><strong>Pending Closure:</strong> <strong>${stats?.pendingContracts ?? 0}</strong> contracts awaiting e-signature. Issue automated reminder notifications after 48h of dispatch.</li>
              <li><strong>Billing Invoicing:</strong> Transition signed contracts directly into milestone invoices to minimize collection cycles.</li>
            </ul>
          </div>

          ${contracts.length > 0 ? `
            <div class="pdf-section-title">Contract Records Ledger (${contracts.length} Total Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Contract Title</th>
                  <th>Contract #</th>
                  <th>Customer</th>
                  <th>Value ($)</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                ${contracts.slice(0, 50).map((c, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${c.title}</strong></td>
                    <td>${c.contractNumber || '—'}</td>
                    <td>${c.customerName || '—'}</td>
                    <td><strong>$${(c.contractValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                    <td>${c.status || 'Draft'}</td>
                    <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

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

export const ContractReportsScreen: React.FC = () => {
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

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'directory'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [contractReport, setContractReport] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      q.append('scope', dataScope);

      const [reportData, contractsData] = await Promise.all([
        api.get<any>(`/api/reports/contracts?${q.toString()}`),
        api.get<any>('/api/contracts')
      ]);

      setContractReport(reportData);
      const list = Array.isArray(contractsData)
        ? contractsData
        : (Array.isArray(contractsData?.data) ? contractsData.data : (Array.isArray(contractsData?.items) ? contractsData.items : []));
      setContracts(list);
    } catch (err) {
      console.error('Failed to load contract reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, dataScope]);

  const statusDistribution = useMemo(() => {
    if (!contractReport?.byStatus) return [];
    return contractReport.byStatus.map((s: any, idx: number) => ({
      name: s.status,
      count: s.count,
      value: s.value,
      color: PALETTE[idx % PALETTE.length]
    }));
  }, [contractReport]);

  const filteredContracts = useMemo(() => {
    if (!Array.isArray(contracts)) return [];
    return contracts.filter(c => {
      const matchesSearch =
        !searchTerm ||
        (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.contractNumber && c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.customerName && c.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || (c.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (!contracts || !contracts.length) {
      alert('No contract records available to export.');
      return;
    }
    const headers = ['ContractId', 'Title', 'ContractNumber', 'Customer', 'ContractValue', 'Status', 'CreatedAt'];
    const rows = contracts.map(c => [
      c.contractId,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${c.contractNumber || ''}"`,
      `"${(c.customerName || '').replace(/"/g, '""')}"`,
      c.contractValue || 0,
      `"${c.status || 'Draft'}"`,
      `"${c.createdAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contracts_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPDF = () => {
    exportContractPDF(contracts, contractReport, activePreset, dataScope);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/contracts')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Contracts
              </button>
              <span className="clean-badge clean-badge-primary">
                Contract Intelligence
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
              Contracts & E-Signatures Portfolio Report
            </h1>
            <p className="clean-report-desc">
              Legal agreements portfolio valuation, digital signature execution progress, and contract lifecycle status.
            </p>
          </div>

          {/* Controls toolbar */}
          <div className="clean-toolbar">
            <div className="clean-toolbar-group">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Scope:</span>
              {isManagerOrAbove && (
                <div className="clean-segmented">
                  <button
                    className={`clean-segmented-btn ${dataScope === 'personal' ? 'active' : ''}`}
                    onClick={() => setDataScope('personal')}
                  >
                    My Contracts
                  </button>
                  <button
                    className={`clean-segmented-btn ${dataScope === 'team' ? 'active' : ''}`}
                    onClick={() => setDataScope('team')}
                  >
                    All Company
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

        {/* 4 Clean Metric Cards */}
        <div className="clean-stat-grid">
          {/* Total Value */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Contract Value</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <DollarSign size={17} />
              </div>
            </div>
            <div className="clean-stat-value">
              ${(contractReport?.totalContractValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">Portfolio</span>
              <span>Executed volume</span>
            </div>
          </div>

          {/* Signed & Active */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Signed & Active</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{contractReport?.signedContracts ?? 0}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Active</span>
              <span>Legally binding contracts</span>
            </div>
          </div>

          {/* Pending Signatures */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Pending Execution</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{contractReport?.pendingContracts ?? 0}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b' }}>Out for Sign</span>
              <span>Awaiting client signature</span>
            </div>
          </div>

          {/* Signing Rate */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Signing Completion Rate</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                <ShieldCheck size={17} />
              </div>
            </div>
            <div className="clean-stat-value">
              {contractReport?.signingRate ? `${contractReport.signingRate.toFixed(1)}%` : '—'}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Efficiency</span>
              <span>Contract close velocity</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="clean-tab-nav">
          <button
            onClick={() => setActiveTab('overview')}
            className={`clean-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Contract Status Distribution & Analytics
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Contracts Directory Ledger ({contracts.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="clean-chart-grid">
              {/* Status Donut */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Contracts by Status</h3>
                    <p className="clean-card-sub">Distribution of agreements by execution milestone</p>
                  </div>
                </div>
                <div style={{ height: 280, padding: '1rem' }}>
                  {statusDistribution.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      No contract status data
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          label={(entry: any) => `${entry.name || ''}: ${entry.value ?? entry.count ?? 0}`}
                        >
                          {statusDistribution.map((entry: any, idx: number) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Status Valuation Bar */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Committed Value by Status</h3>
                    <p className="clean-card-sub">Dollar volume grouped by signing state</p>
                  </div>
                </div>
                <div style={{ height: 280, padding: '1rem' }}>
                  {statusDistribution.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      No valuation data recorded
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `$${v / 1000}k`} />
                        <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Value']} />
                        <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                          {statusDistribution.map((entry: any, idx: number) => (
                            <Cell key={`bar-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive Contract Governance Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    📑 Portfolio Health
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    You have <strong>{contractReport?.signedContracts ?? 0}</strong> active contracts totaling <strong>${(contractReport?.totalContractValue ?? 0).toLocaleString()}</strong>.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#f59e0b', marginBottom: 4, fontSize: '0.82rem' }}>
                    ✍️ Signature Follow-ups
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{contractReport?.pendingContracts ?? 0}</strong> contracts are currently pending signature. Automate signing link delivery via email to accelerate closure.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#6366f1', marginBottom: 4, fontSize: '0.82rem' }}>
                    🧾 Billing Alignment
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Immediately generate milestone billing invoices once agreements are legally signed to prevent delayed accounts receivable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECTORY LEDGER */}
        {activeTab === 'directory' && (
          <div className="clean-card">
            <div className="clean-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 240, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search contract, number, customer..."
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
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="signed">Signed / Active</option>
                  <option value="sent">Sent / Pending</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredContracts.length}</strong> of {contracts.length} records
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
                    <th>Contract Title</th>
                    <th>Contract #</th>
                    <th>Customer Name</th>
                    <th>Contract Value ($)</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No contract records match your query
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map(c => (
                      <tr key={c.contractId}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {c.title}
                          </strong>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {c.contractNumber || '—'}
                          </span>
                        </td>
                        <td>{c.customerName || '—'}</td>
                        <td>
                          <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>
                            ${Number(c.contractValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: c.status === 'Signed' || c.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                              color: c.status === 'Signed' || c.status === 'Active' ? '#10b981' : '#f59e0b',
                              fontSize: '0.72rem'
                            }}
                          >
                            {c.status || 'Draft'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate('/contracts')}
                            className="clean-back-btn"
                            style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                          >
                            View <ExternalLink size={11} />
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
