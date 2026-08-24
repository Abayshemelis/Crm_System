import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import {
  Kanban, TrendingUp, Download, ArrowLeft,
  DollarSign, Clock, CheckCircle2, Award,
  FileText, FileSpreadsheet, RefreshCw, Search,
  Sparkles, Filter, ChevronRight, BarChart3,
  PieChart as PieIcon, Table as TableIcon, ExternalLink,
  ArrowUpRight, AlertCircle
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

// ─── PDF Report Generator for Pipeline ────────────────────────────────────────
function exportPipelinePDF(
  opportunities: any[],
  pipelineData: any[],
  winRate: number,
  avgDays: number,
  totalValue: number,
  dateRange: string,
  scope: string
) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `pipeline_valuation_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const formattedTotalValue = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Pipeline Valuation & Sales Velocity Report - CRM</title>
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
          .pdf-insights-box {
            background: #f1f5f9;
            border-left: 4px solid #6366f1;
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; PIPELINE REPORT</h1>
              <p class="pdf-sub">Deal Progression, Stage Valuations & Win-Rate Trajectory</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
              <div><strong>Scope:</strong> ${scope.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Pipeline Value</div>
              <div class="pdf-stat-value">${formattedTotalValue}</div>
              <div class="pdf-stat-sub">Active in-flight valuation</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Overall Win Rate</div>
              <div class="pdf-stat-value">${winRate.toFixed(1)}%</div>
              <div class="pdf-stat-sub">Historical closing ratio</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Active Deals</div>
              <div class="pdf-stat-value">${opportunities.length}</div>
              <div class="pdf-stat-sub">Open opportunities</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Avg Sales Cycle</div>
              <div class="pdf-stat-value">${avgDays.toFixed(0)} Days</div>
              <div class="pdf-stat-sub">Creation-to-close velocity</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Pipeline Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>Portfolio Depth:</strong> <strong>${formattedTotalValue}</strong> in active pipeline across <strong>${opportunities.length}</strong> opportunities.</li>
              <li><strong>Closing Velocity:</strong> Average sales velocity is <strong>${avgDays.toFixed(0)} days</strong>. Flag deals lingering over 45 days for manager deal review.</li>
              <li><strong>Win Rate:</strong> Current win rate is <strong>${winRate.toFixed(1)}%</strong>. Maintain rigorous discovery qualifications in initial stages.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Valuation by Pipeline Stage</div>
          <table class="pdf-table" style="margin-bottom: 18px;">
            <thead>
              <tr>
                <th>Pipeline Stage</th>
                <th>Deals Count</th>
                <th>Total Stage Valuation ($)</th>
                <th>Share (%)</th>
              </tr>
            </thead>
            <tbody>
              ${pipelineData.map(p => `
                <tr>
                  <td><strong>${p.stageName || p.name}</strong></td>
                  <td>${p.count || 0} Deals</td>
                  <td><strong>$${(p.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                  <td>${totalValue > 0 ? (((p.value || 0) / totalValue) * 100).toFixed(1) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${opportunities.length > 0 ? `
            <div class="pdf-section-title">Opportunities Ledger (${opportunities.length} Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Opportunity Title</th>
                  <th>Customer / Company</th>
                  <th>Stage</th>
                  <th>Est. Value ($)</th>
                  <th>Close Date</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                ${opportunities.slice(0, 50).map((o, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${o.title}</strong></td>
                    <td>${o.customerName || (o.customerFirstName ? `${o.customerFirstName} ${o.customerLastName}` : '—')} ${o.companyName ? `(${o.companyName})` : ''}</td>
                    <td>${o.stageName || 'Deal'}</td>
                    <td><strong>$${(o.estimatedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></td>
                    <td>${o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : '—'}</td>
                    <td>${o.ownerName || '—'}</td>
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

export const PipelineReportsScreen: React.FC = () => {
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

  // Tabs & Filter
  const [activeTab, setActiveTab] = useState<'stages' | 'velocity' | 'directory'>('stages');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [winRateData, setWinRateData] = useState<any[]>([]);
  const [timeData, setTimeData] = useState<any[]>([]);
  const [overallWinRate, setOverallWinRate] = useState<number>(0);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      q.append('scope', dataScope);

      const [pipe, win, time, oppsRes] = await Promise.all([
        api.get<any[]>(`/api/reports/pipeline-by-stage?${q.toString()}`),
        api.get<any>(`/api/reports/win-rate?${q.toString()}`),
        api.get<any[]>(`/api/reports/time-per-stage?${q.toString()}`),
        api.get<any>('/api/opportunities')
      ]);

      setPipelineData(pipe ?? []);
      setWinRateData(win?.byMonth ?? []);
      setOverallWinRate(win?.overallWinRate ?? 0);
      setTimeData(time ?? []);

      const list = Array.isArray(oppsRes)
        ? oppsRes
        : (Array.isArray(oppsRes?.data) ? oppsRes.data : (Array.isArray(oppsRes?.items) ? oppsRes.items : []));
      setOpportunities(list);
    } catch (err) {
      console.error('Failed to load pipeline reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, dataScope]);

  const totalPipeValue = useMemo(() => pipelineData.reduce((sum, d) => sum + (d.value || 0), 0), [pipelineData]);
  const avgCycleDays = useMemo(() => {
    if (!timeData.length) return 0;
    return timeData.reduce((sum, d) => sum + (d.averageDays || 0), 0);
  }, [timeData]);

  const uniqueStages = useMemo(() => {
    const set = new Set<string>();
    pipelineData.forEach(d => {
      if (d.stageName) set.add(d.stageName);
    });
    return Array.from(set);
  }, [pipelineData]);

  const filteredOpportunities = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    return opportunities.filter(o => {
      const customerName = `${o.customerFirstName || ''} ${o.customerLastName || ''} ${o.customerName || ''}`;
      const matchesSearch =
        !searchTerm ||
        (o.title && o.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.companyName && o.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.ownerName && o.ownerName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStage = stageFilter === 'all' || (o.stageName || '').toLowerCase() === stageFilter.toLowerCase();

      return matchesSearch && matchesStage;
    });
  }, [opportunities, searchTerm, stageFilter]);

  // Robust CSV Export
  const handleExportCSV = () => {
    if (!opportunities || !opportunities.length) {
      alert('No opportunity records available to export.');
      return;
    }
    const headers = ['OpportunityId', 'Title', 'Customer', 'Company', 'Stage', 'EstimatedValue', 'ExpectedCloseDate', 'Owner'];
    const rows = opportunities.map(o => [
      o.opportunityId,
      `"${(o.title || '').replace(/"/g, '""')}"`,
      `"${((o.customerName || `${o.customerFirstName || ''} ${o.customerLastName || ''}`).trim()).replace(/"/g, '""')}"`,
      `"${(o.companyName || '').replace(/"/g, '""')}"`,
      `"${o.stageName || 'Deal'}"`,
      o.estimatedValue || 0,
      `"${o.expectedCloseDate ? o.expectedCloseDate.slice(0, 10) : ''}"`,
      `"${(o.ownerName || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pipeline_opportunities_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPDF = () => {
    exportPipelinePDF(opportunities, pipelineData, overallWinRate, avgCycleDays, totalPipeValue, activePreset, dataScope);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/pipeline')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Pipeline
              </button>
              <span className="clean-badge clean-badge-primary">
                Pipeline Intelligence
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportPDF}
                className="clean-btn-primary"
                title="Export PDF Executive Report"
              >
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
              Pipeline Valuation & Sales Velocity Report
            </h1>
            <p className="clean-report-desc">
              Active deal progression across pipeline stages, historical win-rate velocity, and sales cycle efficiency.
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
                    My Deals
                  </button>
                  <button
                    className={`clean-segmented-btn ${dataScope === 'team' ? 'active' : ''}`}
                    onClick={() => setDataScope('team')}
                  >
                    All Pipeline
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
              <span className="clean-stat-label">Total Pipeline Valuation</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                <DollarSign size={17} />
              </div>
            </div>
            <div className="clean-stat-value">
              ${totalPipeValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">In Flight</span>
              <span>Active pipeline valuation</span>
            </div>
          </div>

          {/* Active Deals */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Active Opportunities</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <Kanban size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{opportunities.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Deals</span>
              <span>Across all active stages</span>
            </div>
          </div>

          {/* Win Rate */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Overall Win Rate</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <Award size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{overallWinRate.toFixed(1)}%</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">
                <ArrowUpRight size={11} /> Closing Ratio
              </span>
              <span>Won vs Lost outcomes</span>
            </div>
          </div>

          {/* Avg Duration */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Avg Sales Velocity</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{avgCycleDays.toFixed(0)} Days</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b' }}>Duration</span>
              <span>Full deal cycle speed</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="clean-tab-nav">
          <button
            onClick={() => setActiveTab('stages')}
            className={`clean-tab-item ${activeTab === 'stages' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Stage Valuations & Win Trends
          </button>
          <button
            onClick={() => setActiveTab('velocity')}
            className={`clean-tab-item ${activeTab === 'velocity' ? 'active' : ''}`}
          >
            <Clock size={15} /> Sales Velocity & Bottlenecks
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Opportunities Directory Ledger ({opportunities.length})
          </button>
        </div>

        {/* TAB 1: STAGE VALUATIONS & WIN TRENDS */}
        {activeTab === 'stages' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="clean-chart-grid">
              {/* Stage Valuation Bar Chart */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Deal Valuation by Stage</h3>
                    <p className="clean-card-sub">Distribution of total active dollar volume</p>
                  </div>
                </div>
                <div style={{ height: 280, padding: '1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                      <XAxis dataKey="stageName" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `$${v / 1000}k`} />
                      <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Valuation']} />
                      <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                        {pipelineData.map((_, idx) => (
                          <Cell key={`bar-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Win Rate Trend Area Chart */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Historical Win-Rate Velocity</h3>
                    <p className="clean-card-sub">Monthly percentage of closed deals won</p>
                  </div>
                </div>
                <div style={{ height: 280, padding: '1rem' }}>
                  {winRateData.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      No win-rate trajectory data recorded
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={winRateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                        <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} unit="%" />
                        <Tooltip formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Win Rate']} />
                        <Area
                          type="monotone"
                          dataKey="winRate"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fill="url(#winGrad)"
                          name="Win Rate"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive Pipeline Strategy & Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#6366f1', marginBottom: 4, fontSize: '0.82rem' }}>
                    💰 Pipeline Coverage Ratio
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Total active pipeline is <strong>${totalPipeValue.toLocaleString()}</strong> across {opportunities.length} opportunities. Aim for 3.5x pipeline coverage relative to your monthly quota.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    🏆 Closing Conversion Target
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Your current win rate is <strong>{overallWinRate.toFixed(1)}%</strong>. High-value proposal reviews and executive sponsorship typically boost final stage win rates by 15%.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#f59e0b', marginBottom: 4, fontSize: '0.82rem' }}>
                    ⚡ Sales Cycle Efficiency
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Deals take an average of <strong>{avgCycleDays.toFixed(0)} days</strong> to close. Audit stalled opportunities that have exceeded 45 days in discovery or quotation stages.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VELOCITY & STAGE DURATION */}
        {activeTab === 'velocity' && (
          <div className="clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Average Duration per Pipeline Stage</h3>
                <p className="clean-card-sub">Days spent by opportunities before advancing to the next milestone</p>
              </div>
            </div>
            <div style={{ height: 300, padding: '1rem' }}>
              {timeData.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  No stage dwell duration data recorded
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                    <XAxis dataKey="stageName" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} unit="d" />
                    <Tooltip formatter={(val: any) => [`${Number(val).toFixed(1)} Days`, 'Avg Duration']} />
                    <Bar dataKey="averageDays" fill="#f59e0b" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
                    placeholder="Search deal, customer, company, owner..."
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
                  value={stageFilter}
                  onChange={e => setStageFilter(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="all">All Stages</option>
                  {uniqueStages.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredOpportunities.length}</strong> of {opportunities.length} records
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
                    <th>Opportunity Title</th>
                    <th>Customer / Company</th>
                    <th>Pipeline Stage</th>
                    <th>Est. Value ($)</th>
                    <th>Target Close Date</th>
                    <th>Deal Owner</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No opportunity records match your query
                      </td>
                    </tr>
                  ) : (
                    filteredOpportunities.map(o => (
                      <tr key={o.opportunityId}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {o.title}
                          </strong>
                        </td>
                        <td>
                          <div>
                            <span style={{ color: 'var(--text-primary)' }}>
                              {o.customerName || (o.customerFirstName ? `${o.customerFirstName} ${o.customerLastName}` : '—')}
                            </span>
                            {o.companyName && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                                {o.companyName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.72rem' }}>
                            {o.stageName || 'Deal'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>
                            ${Number(o.estimatedValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </strong>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {o.expectedCloseDate ? new Date(o.expectedCloseDate).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {o.ownerName || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/opportunities/${o.opportunityId}`)}
                            className="clean-back-btn"
                            style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                          >
                            Deal <ExternalLink size={11} />
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
