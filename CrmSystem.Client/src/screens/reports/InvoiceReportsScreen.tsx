import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Receipt, Download, ArrowLeft, CheckCircle2,
  DollarSign, Clock, AlertTriangle, CreditCard,
  FileText, FileSpreadsheet, RefreshCw, Search,
  Sparkles, Filter, ChevronRight, BarChart3,
  PieChart as PieIcon, Table as TableIcon, ExternalLink,
  ArrowUpRight
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#3b82f6', '#8b5cf6', '#06b6d4'];

// ─── PDF Generator for Invoices ───────────────────────────────────────────────
function exportInvoicePDF(invoices: any[], stats: any, dateRange: string, scope: string) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `invoices_revenue_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const totalCollected = stats?.totalCollected ?? 0;
  const totalPending = stats?.totalPending ?? 0;
  const totalOverdue = stats?.totalOverdue ?? 0;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoices & Revenue Intelligence Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; INVOICE REPORT</h1>
              <p class="pdf-sub">Cash Collections, Receivables Aging & Inflow Analytics</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
              <div><strong>Scope:</strong> ${scope.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Cash Collected</div>
              <div class="pdf-stat-value" style="color: #10b981;">$${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="pdf-stat-sub">Realized revenue inflow</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Pending Receivables</div>
              <div class="pdf-stat-value" style="color: #f59e0b;">$${totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="pdf-stat-sub">Unpaid invoices in window</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Overdue Aging Amount</div>
              <div class="pdf-stat-value" style="color: #ef4444;">$${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div class="pdf-stat-sub">Requires active collections</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Invoices Issued</div>
              <div class="pdf-stat-value">${invoices.length}</div>
              <div class="pdf-stat-sub">Total billing records</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #064e3b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Financial & Collections Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #064e3b; line-height: 1.4;">
              <li><strong>Revenue Inflow:</strong> Realized <strong>$${totalCollected.toLocaleString()}</strong> in settled payments over this reporting window.</li>
              <li><strong>Receivables Alert:</strong> <strong>$${totalOverdue.toLocaleString()}</strong> is overdue. Trigger dunning reminder notices immediately.</li>
              <li><strong>Collection Health:</strong> Maintain automated invoice emailing on due dates to keep DSO (Days Sales Outstanding) below 30 days.</li>
            </ul>
          </div>

          ${invoices.length > 0 ? `
            <div class="pdf-section-title">Invoice Records Ledger (${invoices.length} Total Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Total Amount ($)</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Issued Date</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.slice(0, 50).map((inv, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${inv.invoiceNumber || `INV-${inv.invoiceId}`}</strong></td>
                    <td>${inv.customerName || '—'}</td>
                    <td><strong>$${(inv.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                    <td>${inv.status || 'Draft'}</td>
                    <td>${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                    <td>${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}</td>
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

export const InvoiceReportsScreen: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState<'revenue' | 'directory'>('revenue');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [invoiceReport, setInvoiceReport] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      q.append('scope', dataScope);

      const [reportData, invoicesData] = await Promise.all([
        api.get<any>(`/api/reports/invoices?${q.toString()}`),
        api.get<any>('/api/invoices')
      ]);

      setInvoiceReport(reportData);
      const list = Array.isArray(invoicesData)
        ? invoicesData
        : (Array.isArray(invoicesData?.data) ? invoicesData.data : (Array.isArray(invoicesData?.items) ? invoicesData.items : []));
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load invoice reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, dataScope]);

  const monthlyInflow = useMemo(() => invoiceReport?.monthlyInflow ?? [], [invoiceReport]);

  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    return invoices.filter(inv => {
      const matchesSearch =
        !searchTerm ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || (inv.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (!invoices || !invoices.length) {
      alert('No invoice records available to export.');
      return;
    }
    const headers = ['InvoiceId', 'InvoiceNumber', 'Customer', 'TotalAmount', 'Status', 'DueDate', 'CreatedAt'];
    const rows = invoices.map(i => [
      i.invoiceId,
      `"${i.invoiceNumber || `INV-${i.invoiceId}`}"`,
      `"${(i.customerName || '').replace(/"/g, '""')}"`,
      i.totalAmount || 0,
      `"${i.status || 'Draft'}"`,
      `"${i.dueDate ? i.dueDate.slice(0, 10) : ''}"`,
      `"${i.createdAt ? i.createdAt.slice(0, 10) : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPDF = () => {
    exportInvoicePDF(invoices, invoiceReport, activePreset, dataScope);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/invoices')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Invoices
              </button>
              <span className="clean-badge clean-badge-primary">
                Revenue Intelligence
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleExportPDF} className="clean-btn-primary" title="Export PDF Executive Summary">
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
              Invoices & Revenue Intelligence Report
            </h1>
            <p className="clean-report-desc">
              Cash collections, receivables aging velocity, invoice settlement tracking, and monthly revenue inflow.
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
                    My Invoices
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
          {/* Collected */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Cash Collected</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <DollarSign size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#10b981' }}>
              ${(invoiceReport?.totalCollected ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">Settled</span>
              <span>Cash in bank</span>
            </div>
          </div>

          {/* Pending */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Pending Receivables</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#f59e0b' }}>
              ${(invoiceReport?.totalPending ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b' }}>Open A/R</span>
              <span>Awaiting payment</span>
            </div>
          </div>

          {/* Overdue */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Overdue Invoices</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <AlertTriangle size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#ef4444' }}>
              ${(invoiceReport?.totalOverdue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(239,68,68,0.14)', color: '#ef4444' }}>Overdue</span>
              <span>Past payment SLA</span>
            </div>
          </div>

          {/* Invoices Count */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Invoices Issued</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                <CreditCard size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{invoices.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Billing</span>
              <span>Invoiced accounts</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="clean-tab-nav">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`clean-tab-item ${activeTab === 'revenue' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Monthly Cash Inflow & Collections
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Invoice Directory Ledger ({invoices.length})
          </button>
        </div>

        {/* TAB 1: REVENUE INFLOW */}
        {activeTab === 'revenue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Monthly Cash Inflow Velocity</h3>
                  <p className="clean-card-sub">Settled and collected payments timeline</p>
                </div>
              </div>
              <div style={{ height: 300, padding: '1rem' }}>
                {monthlyInflow.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    No cash inflow recorded in window
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyInflow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="invInflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                      <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `$${v / 1000}k`} />
                      <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Collected']} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fill="url(#invInflowGrad)"
                        name="Cash Inflow"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive Cash Flow Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    💵 Realized Collections
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    You have collected <strong>${(invoiceReport?.totalCollected ?? 0).toLocaleString()}</strong> in cleared payments.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#f59e0b', marginBottom: 4, fontSize: '0.82rem' }}>
                    ⏳ Outstanding Pipeline
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>${(invoiceReport?.totalPending ?? 0).toLocaleString()}</strong> is currently pending client payment.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#ef4444', marginBottom: 4, fontSize: '0.82rem' }}>
                    ⚠️ Overdue Risk
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>${(invoiceReport?.totalOverdue ?? 0).toLocaleString()}</strong> is overdue. Send automated payment reminders to avoid default.
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
                    placeholder="Search invoice #, customer..."
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
                  <option value="paid">Paid</option>
                  <option value="sent">Sent / Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} records
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
                    <th>Invoice #</th>
                    <th>Customer Name</th>
                    <th>Total Amount ($)</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Issued Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No invoice records match your query
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => (
                      <tr key={inv.invoiceId}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {inv.invoiceNumber || `INV-${inv.invoiceId}`}
                          </strong>
                        </td>
                        <td>{inv.customerName || '—'}</td>
                        <td>
                          <strong style={{ color: inv.status === 'Paid' ? '#10b981' : 'var(--text-primary)', fontSize: '0.85rem' }}>
                            ${Number(inv.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: inv.status === 'Paid' ? 'rgba(16,185,129,0.12)' : inv.status === 'Overdue' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                              color: inv.status === 'Paid' ? '#10b981' : inv.status === 'Overdue' ? '#ef4444' : '#f59e0b',
                              fontSize: '0.72rem'
                            }}
                          >
                            {inv.status || 'Draft'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate('/invoices')}
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
