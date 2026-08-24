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
  ExternalLink, ArrowUpRight, Check, User, Users
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4'];

const STATUS_COLOR_MAP: Record<string, { bg: string; color: string }> = {
  Signed: { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' },
  PartiallySigned: { bg: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' },
  PendingSignature: { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' },
  Draft: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' },
  Expired: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
  Cancelled: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }
};

// ─── PDF Generator for Contracts ──────────────────────────────────────────────
function exportContractPDF(contracts: any[], stats: any, dateRange: string, scopeLabel: string) {
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
          .pdf-stat-lbl { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #64748b; }
          .pdf-stat-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 3px; }
          .pdf-stat-val.green { color: #10b981; }
          .pdf-stat-val.blue { color: #3b82f6; }
          .pdf-stat-val.purple { color: #818cf8; }
          .pdf-stat-val.amber { color: #f59e0b; }
          .pdf-section { font-size: 13px; font-weight: 700; color: #0f172a; margin: 18px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
          th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; }
          td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8.5px; font-weight: 700; }
          .badge-signed { background: #dcfce7; color: #15803d; }
          .badge-partial { background: #e0e7ff; color: #4338ca; }
          .badge-pending { background: #fef3c7; color: #b45309; }
          .badge-draft { background: #f1f5f9; color: #475569; }
          .pdf-footer { margin-top: 25px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="pdf-action-bar">
          <button id="download-btn" class="pdf-btn-primary">Download PDF</button>
          <button onclick="window.print()" class="pdf-btn-secondary">Print</button>
        </div>

        <div id="pdf-content" class="pdf-container">
          <div class="pdf-header">
            <div>
              <h1 class="pdf-brand">Contracts &amp; E-Signature Portfolio Report</h1>
              <p class="pdf-sub">Active Agreements Valuation &amp; Complete Digital Signature Audit</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Scope:</strong> ${scopeLabel}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
              <div><strong>Generated:</strong> ${dateStr}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-lbl">Total Valuation</div>
              <div class="pdf-stat-val green">${formattedVal}</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-lbl">Signed &amp; Active</div>
              <div class="pdf-stat-val blue">${stats?.signedContracts ?? 0} ($${Number(stats?.activeValue ?? 0).toLocaleString()})</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-lbl">Partially Signed (1/2)</div>
              <div class="pdf-stat-val purple">${stats?.partiallySignedCount ?? 0} ($${Number(stats?.partiallySignedValue ?? 0).toLocaleString()})</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-lbl">Pending Signature (0/2)</div>
              <div class="pdf-stat-val amber">${stats?.pendingSignatureCount ?? 0}</div>
            </div>
          </div>

          <div class="pdf-section">Contract Records (${contracts.length} Total)</div>
          <table>
            <thead>
              <tr>
                <th>Contract Title</th>
                <th>Contract #</th>
                <th>Owner / Rep</th>
                <th>Customer Name</th>
                <th>Value</th>
                <th>Signature Status</th>
              </tr>
            </thead>
            <tbody>
              ${contracts.slice(0, 45).map(c => `
                <tr>
                  <td><strong>${c.title || 'Untitled Agreement'}</strong></td>
                  <td>${c.contractNumber || '—'}</td>
                  <td>${c.ownerName || '—'}</td>
                  <td>${c.customerName || '—'}</td>
                  <td>$${Number(c.contractValue || 0).toLocaleString()}</td>
                  <td>
                    <span class="badge ${c.category === 'Signed' ? 'badge-signed' : c.category === 'PartiallySigned' ? 'badge-partial' : c.category === 'PendingSignature' ? 'badge-pending' : 'badge-draft'}">
                      ${c.status || 'Draft'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="pdf-footer">
            <span>CRM Enterprise Legal Governance Engine</span>
            <span>Page 1 of 1</span>
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
  const { isManagerOrAboveSelected, selectedRole } = useAuth();

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
  const [dataScope, setDataScope] = useState<'personal' | 'team'>(isManagerOrAboveSelected ? 'team' : 'personal');
  const [selectedRepId, setSelectedRepId] = useState<string>('all');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Auto-sync scope when role switches
  useEffect(() => {
    if (!isManagerOrAboveSelected) {
      setDataScope('personal');
      setSelectedRepId('all');
    }
  }, [isManagerOrAboveSelected, selectedRole]);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'directory'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [contractReport, setContractReport] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);

  // Load team users for optional rep filtering
  useEffect(() => {
    if (isManagerOrAboveSelected) {
      api.get<any[]>('/api/users')
        .then(res => setUsersList(Array.isArray(res) ? res : []))
        .catch(err => console.error('Failed to load users list', err));
    }
  }, [isManagerOrAboveSelected]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      
      if (!isManagerOrAboveSelected || dataScope === 'personal') {
        q.append('scope', 'personal');
      } else {
        q.append('scope', 'company');
        if (selectedRepId && selectedRepId !== 'all') {
          q.append('repId', selectedRepId);
        }
      }

      const data = await api.get<any>(`/api/reports/contracts?${q.toString()}`);
      setContractReport(data);
      setContracts(data?.items ?? []);
    } catch (err) {
      console.error('Failed to load contract reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, dataScope, selectedRepId, isManagerOrAboveSelected, selectedRole]);

  const statusDistribution = useMemo(() => {
    if (!contractReport?.byStatus) return [];
    return contractReport.byStatus.map((s: any, idx: number) => ({
      name: s.status,
      count: s.count,
      value: s.value,
      color: PALETTE[idx % PALETTE.length]
    }));
  }, [contractReport]);

  const repBreakdown = useMemo(() => {
    if (!contractReport?.byRep) return [];
    return contractReport.byRep;
  }, [contractReport]);

  const filteredContracts = useMemo(() => {
    if (!Array.isArray(contracts)) return [];
    return contracts.filter(c => {
      const matchesSearch =
        !searchTerm ||
        (c.contractNumber && c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.customerName && c.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.ownerName && c.ownerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'signed' && c.category === 'Signed') ||
        (statusFilter === 'partially_signed' && c.category === 'PartiallySigned') ||
        (statusFilter === 'pending_signature' && c.category === 'PendingSignature') ||
        (statusFilter === 'pending' && (c.category === 'PartiallySigned' || c.category === 'PendingSignature')) ||
        (statusFilter === 'draft' && c.category === 'Draft') ||
        (statusFilter === 'expired' && c.category === 'Expired');

      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (!contracts || !contracts.length) {
      alert('No contract records available to export.');
      return;
    }
    const headers = ['Contract Number', 'Title', 'Customer', 'Owner/Rep', 'Value ($)', 'Status', 'Signature Progress', 'Start Date', 'End Date'];
    const rows = contracts.map(c => [
      `"${c.contractNumber || ''}"`,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${(c.customerName || '').replace(/"/g, '""')}"`,
      `"${(c.ownerName || 'Unassigned').replace(/"/g, '""')}"`,
      c.contractValue || 0,
      `"${c.status || 'Draft'}"`,
      `"${c.signatureProgress || '0/2 Awaiting Signatures'}"`,
      `"${c.startDate ? new Date(c.startDate).toLocaleDateString() : ''}"`,
      `"${c.endDate ? new Date(c.endDate).toLocaleDateString() : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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
    const scopeLabel = dataScope === 'personal'
      ? 'My Contracts (Personal)'
      : selectedRepId !== 'all'
        ? `Representative: ${usersList.find(u => String(u.identityId || u.userId) === selectedRepId)?.name || 'Selected Rep'}`
        : 'All Company Contracts';
    exportContractPDF(contracts, contractReport, activePreset, scopeLabel);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/contracts')} className="clean-back-btn" type="button">
                <ArrowLeft size={15} /> All Contracts
              </button>
              <span className="clean-badge clean-badge-primary">
                Contract Intelligence
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleExportPDF} className="clean-btn-primary" title="Export PDF Executive Report" type="button">
                <FileText size={15} /> Export PDF
              </button>
              <button onClick={handleExportCSV} className="clean-btn-secondary" title="Download CSV Dataset" type="button">
                <FileSpreadsheet size={15} /> Export CSV
              </button>
              <button onClick={fetchData} className="clean-btn-secondary" style={{ padding: '6px 10px' }} title="Refresh Report Data" type="button">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="clean-title-group">
            <h1 className="clean-report-title">
              Contracts &amp; E-Signatures Portfolio Report
            </h1>
            <p className="clean-report-desc">
              Legal agreements portfolio valuation, digital signature execution progress (including Partially Signed &amp; Pending Signature), and contract lifecycle status.
            </p>
          </div>

          {/* Controls toolbar */}
          <div className="clean-toolbar">
            {isManagerOrAboveSelected && (
              <div className="clean-toolbar-group">
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Scope:</span>
                <div className="clean-segmented">
                  <button
                    type="button"
                    className={`clean-segmented-btn ${dataScope === 'personal' ? 'active' : ''}`}
                    onClick={() => {
                      setDataScope('personal');
                      setSelectedRepId('all');
                    }}
                  >
                    <User size={13} style={{ marginRight: 4 }} /> My Contracts
                  </button>
                  <button
                    type="button"
                    className={`clean-segmented-btn ${dataScope === 'team' ? 'active' : ''}`}
                    onClick={() => setDataScope('team')}
                  >
                    <Users size={13} style={{ marginRight: 4 }} /> All Company
                  </button>
                </div>

                {/* Individual Representative Dropdown when in All Company view */}
                {dataScope === 'team' && usersList.length > 0 && (
                  <select
                    value={selectedRepId}
                    onChange={e => setSelectedRepId(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option value="all">Entire Organization</option>
                    {usersList.map(u => (
                      <option key={u.identityId || u.userId} value={String(u.identityId || u.userId)}>
                        {u.name || u.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="clean-toolbar-group">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Period:</span>
              <div className="clean-preset-group">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
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
              <span>{contractReport?.totalCount ?? contracts.length} total agreements</span>
            </div>
          </div>

          {/* Signed & Active */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Signed &amp; Active</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#10b981' }}>
              {contractReport?.signedContracts ?? 0}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">
                <ArrowUpRight size={11} /> ${Number(contractReport?.activeValue ?? 0).toLocaleString()}
              </span>
              <span>Legally binding</span>
            </div>
          </div>

          {/* In Signature Pipeline */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">In Signature Pipeline</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#818cf8' }}>
              {contractReport?.pendingContracts ?? 0}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(99,102,241,0.14)', color: '#818cf8' }}>
                {contractReport?.partiallySignedCount ?? 0} Partial &bull; {contractReport?.pendingSignatureCount ?? 0} Pending
              </span>
              <span>${Number(contractReport?.pendingValue ?? 0).toLocaleString()} volume</span>
            </div>
          </div>

          {/* Signing Rate */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Signing Completion Rate</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <ShieldCheck size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#3b82f6' }}>
              {contractReport?.signingRate !== undefined ? `${contractReport.signingRate.toFixed(1)}%` : '0%'}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Efficiency</span>
              <span>Execution velocity</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="clean-tab-nav">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`clean-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Contract Status Distribution &amp; Analytics
          </button>
          <button
            type="button"
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
                          label={(entry: any) => `${entry.name || ''}: ${entry.count ?? 0}`}
                        >
                          {statusDistribution.map((entry: any, idx: number) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => [`${val} Contracts`, 'Count']} />
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
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
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

            {/* Team Valuation Table */}
            {repBreakdown.length > 0 && (
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Contract Portfolio by Sales Representative</h3>
                    <p className="clean-card-sub">Agreement volume, executed revenue, and signing pipeline per team member</p>
                  </div>
                </div>
                <div className="clean-table-container">
                  <table className="clean-table">
                    <thead>
                      <tr>
                        <th>Sales Rep / Owner</th>
                        <th>Total Agreements</th>
                        <th>Total Portfolio Value</th>
                        <th>Signed &amp; Active Value</th>
                        <th>In Pipeline Value</th>
                        <th>Signed Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repBreakdown.map((r: any, idx: number) => (
                        <tr key={`rep-${idx}`}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <User size={14} style={{ color: 'var(--accent-primary)' }} />
                              <strong>{r.repName}</strong>
                            </div>
                          </td>
                          <td><strong>{r.totalContracts}</strong></td>
                          <td style={{ color: '#10b981', fontWeight: 700 }}>
                            ${Number(r.totalValue || 0).toLocaleString()}
                          </td>
                          <td style={{ color: '#10b981', fontWeight: 600 }}>
                            ${Number(r.activeValue || 0).toLocaleString()}
                          </td>
                          <td style={{ color: '#818cf8', fontWeight: 600 }}>
                            ${Number(r.pendingValue || 0).toLocaleString()} ({r.pendingContracts})
                          </td>
                          <td>
                            <span className="clean-badge clean-badge-primary">
                              {r.signedContracts} Signed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive Contract Governance Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    📑 Executed &amp; Binding
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    You have <strong>{contractReport?.signedContracts ?? 0}</strong> fully executed agreements representing <strong>${(contractReport?.activeValue ?? 0).toLocaleString()}</strong>.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#818cf8', marginBottom: 4, fontSize: '0.82rem' }}>
                    ✍️ Signature Pipeline Triage
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{contractReport?.partiallySignedCount ?? 0}</strong> agreements are partially signed (1/2) and <strong>{contractReport?.pendingSignatureCount ?? 0}</strong> are awaiting first signatures.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#3b82f6', marginBottom: 4, fontSize: '0.82rem' }}>
                    🧾 Billing Alignment
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Generate milestone billing invoices directly upon dual execution to expedite cash collection.
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
                  <option value="signed">Signed &amp; Executed / Active</option>
                  <option value="partially">Partially Signed (1/2)</option>
                  <option value="pending">Pending Signature (0/2)</option>
                  <option value="draft">Draft</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredContracts.length}</strong> of {contracts.length} records
                </span>
                <button
                  type="button"
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
                    <th>Owner / Rep</th>
                    <th>Customer Name</th>
                    <th>Contract Value ($)</th>
                    <th>Signature Status</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No contract records match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map(c => {
                      const style = STATUS_COLOR_MAP[c.category] || STATUS_COLOR_MAP.Draft;
                      return (
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
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <User size={12} style={{ color: 'var(--accent-primary)' }} />
                              {c.ownerName || c.createdByName || 'Admin'}
                            </div>
                          </td>
                          <td>
                            {c.customerId ? (
                              <span
                                onClick={() => navigate(`/customers/${c.customerId}`)}
                                style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.82rem' }}
                              >
                                {c.customerName || 'Customer'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {c.customerName || '—'}
                              </span>
                            )}
                          </td>
                          <td>
                            <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>
                              ${Number(c.contractValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td>
                            <span
                              className="clean-badge"
                              style={{
                                background: style.bg,
                                color: style.color,
                                fontSize: '0.72rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: style.color }} />
                              {c.status || 'Draft'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => navigate('/contracts')}
                              className="clean-back-btn"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                            >
                              View <ExternalLink size={11} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
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
