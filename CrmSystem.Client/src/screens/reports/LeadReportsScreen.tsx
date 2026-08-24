import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import {
  Target, TrendingUp, Download, ArrowLeft,
  CheckCircle2, AlertCircle, Clock, Award, ShieldAlert,
  Search, Sparkles, Filter, ChevronRight, BarChart3,
  PieChart as PieIcon, Table as TableIcon, FileText,
  FileSpreadsheet, RefreshCw, ExternalLink, Mail, Phone,
  Flame, ArrowUpRight
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4'];

// ─── PDF Report Generator for Leads ───────────────────────────────────────────
function exportLeadPDF(leads: any[], funnel: any, priorities: any[], sla: any, dateRange: string, scope: string) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `lead_conversion_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const totalLeads = funnel?.total ?? leads.length;
  const converted = funnel?.converted ?? 0;
  const convRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lead Funnel, Sources & SLA Intelligence Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; LEAD REPORT</h1>
              <p class="pdf-sub">Funnel Velocity, Marketing Attribution & SLA Response Analysis</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
              <div><strong>Scope:</strong> ${scope.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Leads Inbound</div>
              <div class="pdf-stat-value">${totalLeads}</div>
              <div class="pdf-stat-sub">Prospect pipeline volume</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Conversion Rate</div>
              <div class="pdf-stat-value">${convRate}%</div>
              <div class="pdf-stat-sub">${converted} leads converted</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Qualified Leads</div>
              <div class="pdf-stat-value">${funnel?.qualified ?? 0}</div>
              <div class="pdf-stat-sub">High intent ready for proposal</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">SLA Follow-up Rate</div>
              <div class="pdf-stat-value">${sla?.scheduledPercentage ? `${sla.scheduledPercentage.toFixed(0)}%` : '—'}</div>
              <div class="pdf-stat-sub">Response compliance rate</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #78350f; margin-bottom: 4px; text-transform: uppercase;">
              Executive Sales Funnel Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #451a03; line-height: 1.4;">
              <li><strong>Funnel Efficiency:</strong> <strong>${convRate}%</strong> overall conversion rate across all marketing channels.</li>
              <li><strong>Response SLA:</strong> Maintain under 1-hour first response time on Urgent/High priority leads to maximize qualification velocity.</li>
              <li><strong>Source Attribution:</strong> Double down ad spend on top-converting channels and streamline lead qualification routing.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Lead Priority Tiers</div>
          <table class="pdf-table" style="margin-bottom: 18px;">
            <thead>
              <tr>
                <th>Priority Tier</th>
                <th>Avg Score</th>
                <th>Total Inbound</th>
                <th>In Progress</th>
                <th>Converted</th>
                <th>Disqualified</th>
              </tr>
            </thead>
            <tbody>
              ${priorities.map(p => `
                <tr>
                  <td><strong>${p.priority} Priority</strong></td>
                  <td>${p.avgScore?.toFixed(0) || '0'} / 100</td>
                  <td>${p.total}</td>
                  <td>${p.active}</td>
                  <td style="color: #10b981; font-weight: 700;">${p.converted}</td>
                  <td style="color: #ef4444;">${p.lost}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${leads.length > 0 ? `
            <div class="pdf-section-title">Lead Ledger Sample (${leads.length} Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lead Name</th>
                  <th>Company</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                ${leads.slice(0, 50).map((l, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${l.firstName || ''} ${l.lastName || ''}</strong></td>
                    <td>${l.companyName || '—'}</td>
                    <td>${l.priority || 'Medium'}</td>
                    <td>${l.statusName || 'New'}</td>
                    <td>${l.sourceName || 'Direct'}</td>
                    <td>${l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}</td>
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

// ─── Custom Tooltip & Tick for Lead Conversion Stages Chart ──────────────────
const CustomFunnelTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'var(--bg-secondary, #0f172a)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
          borderRadius: '7px',
          padding: '6px 10px',
          boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
          minWidth: '120px',
          color: 'var(--text-primary, #ffffff)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px'
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: data.color,
              display: 'inline-block',
              flexShrink: 0
            }}
          />
          <strong style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {data.fullName || data.name}
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Leads:</span>
          <span style={{ fontWeight: 600, color: data.color }}>
            {(data.count ?? 0).toLocaleString()}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.72rem' }}>
              ({data.pct})
            </span>
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomXAxisTick = (props: any) => {
  const { x, y, payload, isMobile } = props;
  const val: string = payload?.value || '';

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={isMobile ? 8 : 10}
        textAnchor="middle"
        fill="var(--text-secondary, #94a3b8)"
        fontSize={isMobile ? 9.5 : 11.5}
        fontWeight={500}
        letterSpacing={isMobile ? '-0.01em' : 'normal'}
      >
        {val}
      </text>
    </g>
  );
};

export const LeadReportsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isManagerOrAbove } = useAuth();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [activeTab, setActiveTab] = useState<'funnel' | 'matrix' | 'directory'>('funnel');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [funnel, setFunnel] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [sla, setSla] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      q.append('scope', dataScope);

      const [funnelData, srcData, priData, slaData, leadsRes] = await Promise.all([
        api.get<any>(`/api/reports/funnel?${q.toString()}`),
        api.get<any[]>(`/api/reports/lead-source?${q.toString()}`),
        api.get<any[]>(`/api/reports/lead-priority?${q.toString()}`),
        api.get<any>(`/api/reports/followup-sla?${q.toString()}`),
        api.get<any>('/api/leads?page=1&pageSize=1000')
      ]);

      setFunnel(funnelData);
      setSources(srcData ?? []);
      setPriorities(priData ?? []);
      setSla(slaData);

      const list = Array.isArray(leadsRes)
        ? leadsRes
        : (Array.isArray(leadsRes?.data) ? leadsRes.data : (Array.isArray(leadsRes?.items) ? leadsRes.items : []));
      setLeads(list);
    } catch (err) {
      console.error('Failed to load lead reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, dataScope]);

  const funnelStages = useMemo(() => {
    if (!funnel) return [];
    const total = funnel.total || 0;
    return [
      {
        name: 'Inbound',
        fullName: 'Total Inbound Leads',
        count: total,
        color: '#f59e0b',
        pct: '100%',
        desc: 'All captured inbound leads'
      },
      {
        name: 'Contacted',
        fullName: 'Active / Contacted',
        count: funnel.active || 0,
        color: '#3b82f6',
        pct: total > 0 ? `${((funnel.active / total) * 100).toFixed(1)}%` : '0%',
        desc: 'Prospects in discovery & active contact'
      },
      {
        name: 'Qualified',
        fullName: 'Sales Qualified (SQL)',
        count: funnel.qualified || 0,
        color: '#8b5cf6',
        pct: total > 0 ? `${((funnel.qualified / total) * 100).toFixed(1)}%` : '0%',
        desc: 'Budget and criteria verified'
      },
      {
        name: 'Converted',
        fullName: 'Deal Converted (Won)',
        count: funnel.converted || 0,
        color: '#10b981',
        pct: total > 0 ? `${((funnel.converted / total) * 100).toFixed(1)}%` : '0%',
        desc: 'Successfully converted to opportunities'
      },
      {
        name: 'Lost',
        fullName: 'Disqualified / Lost',
        count: funnel.lost || 0,
        color: '#ef4444',
        pct: total > 0 ? `${((funnel.lost / total) * 100).toFixed(1)}%` : '0%',
        desc: 'Unresponsive or criteria mismatch'
      },
    ];
  }, [funnel]);

  const convRate = useMemo(() => {
    if (!funnel || !funnel.total) return 0;
    return (funnel.converted / funnel.total) * 100;
  }, [funnel]);

  const filteredLeads = useMemo(() => {
    if (!Array.isArray(leads)) return [];
    return leads.filter(l => {
      const matchesSearch =
        !searchTerm ||
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.companyName && l.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.sourceName && l.sourceName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPriority = priorityFilter === 'all' || (l.priority || '').toLowerCase() === priorityFilter.toLowerCase();

      return matchesSearch && matchesPriority;
    });
  }, [leads, searchTerm, priorityFilter]);

  // Robust CSV Export
  const handleExportCSV = () => {
    if (!leads || !leads.length) {
      alert('No lead records available to export.');
      return;
    }
    const headers = ['LeadId', 'FirstName', 'LastName', 'Email', 'Phone', 'Company', 'Priority', 'Status', 'Source', 'CreatedAt'];
    const rows = leads.map(l => [
      l.leadId,
      `"${(l.firstName || '').replace(/"/g, '""')}"`,
      `"${(l.lastName || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.phone || '').replace(/"/g, '""')}"`,
      `"${(l.companyName || '').replace(/"/g, '""')}"`,
      `"${l.priority || 'Medium'}"`,
      `"${l.statusName || 'New'}"`,
      `"${(l.sourceName || '').replace(/"/g, '""')}"`,
      `"${l.createdAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lead_pipeline_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPDF = () => {
    exportLeadPDF(leads, funnel, priorities, sla, activePreset, dataScope);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/leads')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Leads
              </button>
              <span className="clean-badge clean-badge-primary" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }}>
                Lead Intelligence
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportPDF}
                className="clean-btn-primary"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
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
              Lead Funnel, Sources & SLA Intelligence
            </h1>
            <p className="clean-report-desc">
              Prospect qualification velocity, marketing channel attribution, and follow-up response compliance.
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
                    My Leads
                  </button>
                  <button
                    className={`clean-segmented-btn ${dataScope === 'team' ? 'active' : ''}`}
                    onClick={() => setDataScope('team')}
                  >
                    All Team
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
          {/* Total Leads */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Leads Inbound</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Target size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{funnel?.total ?? leads.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b' }}>Pipeline</span>
              <span>Prospect volume</span>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Conversion Rate</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <TrendingUp size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{convRate.toFixed(1)}%</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">
                <ArrowUpRight size={11} /> {funnel?.converted ?? 0} Won
              </span>
              <span>Lead-to-deal conversion</span>
            </div>
          </div>

          {/* Qualified Leads */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Qualified Leads</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                <Award size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{funnel?.qualified ?? 0}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Sales Ready</span>
              <span>High conversion intent</span>
            </div>
          </div>

          {/* SLA Scheduled */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">SLA Scheduled Coverage</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(236,72,153,0.12)', color: '#ec4899' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{sla?.scheduledPercentage ? `${sla.scheduledPercentage.toFixed(0)}%` : '—'}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(236,72,153,0.14)', color: '#ec4899' }}>SLA Target</span>
              <span>Active booked follow-ups</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="clean-tab-nav">
          <button
            onClick={() => setActiveTab('funnel')}
            className={`clean-tab-item ${activeTab === 'funnel' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Funnel & Marketing Attribution
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`clean-tab-item ${activeTab === 'matrix' ? 'active' : ''}`}
          >
            <Award size={15} /> Priority & SLA Health Matrix
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Leads Directory Ledger ({leads.length})
          </button>
        </div>

        {/* TAB 1: FUNNEL & ATTRIBUTION */}
        {activeTab === 'funnel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="clean-chart-grid">
              {/* Funnel Bar Chart */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Lead Conversion Stages</h3>
                    <p className="clean-card-sub">Inbound pipeline progression through qualification gates</p>
                  </div>
                </div>
                <div style={{ height: isMobile ? 320 : 350, padding: isMobile ? '0.75rem 0.25rem 0.25rem 0' : '1.25rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelStages}
                      margin={{
                        top: isMobile ? 24 : 32,
                        right: isMobile ? 8 : 20,
                        left: isMobile ? -26 : -10,
                        bottom: isMobile ? 8 : 20
                      }}
                      barCategoryGap={isMobile ? '14%' : '24%'}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.08} vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--text-muted)"
                        fontSize={isMobile ? 10 : 12}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border-color, rgba(255,255,255,0.1))' }}
                        tick={<CustomXAxisTick isMobile={isMobile} />}
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="var(--text-muted)"
                        fontSize={isMobile ? 9.5 : 11}
                        tickLine={false}
                        axisLine={false}
                        width={isMobile ? 24 : 32}
                        tick={{ fill: 'var(--text-muted)', fontSize: isMobile ? 9.5 : 11 }}
                      />
                      <Tooltip
                        content={<CustomFunnelTooltip />}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={isMobile ? 36 : 48}>
                        <LabelList
                          dataKey="count"
                          position="top"
                          offset={6}
                          style={{
                            fill: 'var(--text-primary, #ffffff)',
                            fontSize: isMobile ? 11 : 13,
                            fontWeight: 600
                          }}
                        />
                        {funnelStages.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Marketing Attribution Donut */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Marketing Channels & Attribution</h3>
                    <p className="clean-card-sub">Inbound lead distribution by origin channel</p>
                  </div>
                </div>
                <div style={{ height: isMobile ? 260 : 280, padding: isMobile ? '0.75rem 0.25rem' : '1rem' }}>
                  {sources.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      No attribution channels recorded
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sources}
                          dataKey="count"
                          nameKey="source"
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 42 : 55}
                          outerRadius={isMobile ? 68 : 85}
                          paddingAngle={4}
                          label={isMobile ? false : ((entry: any) => `${entry.name || entry.source || ''}: ${entry.value ?? entry.count ?? 0}`)}
                        >
                          {sources.map((_, idx) => (
                            <Cell key={`src-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Sales Funnel Strategy & Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#f59e0b', marginBottom: 4, fontSize: '0.82rem' }}>
                    🎯 Funnel Efficiency
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Your current lead-to-deal conversion rate stands at <strong>{convRate.toFixed(1)}%</strong>. Focus sales follow-up efforts on high-scoring prospects.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    ⏱️ Response SLA Velocity
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{sla?.scheduledPercentage ? `${sla.scheduledPercentage.toFixed(0)}%` : '—'}</strong> of active leads have scheduled follow-up touchpoints. Faster response correlates with 3x higher win rates.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#6366f1', marginBottom: 4, fontSize: '0.82rem' }}>
                    📈 Inbound Channel Focus
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Optimize campaigns toward the highest-performing inbound channel and automate initial inquiry qualification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRIORITY & SLA MATRIX */}
        {activeTab === 'matrix' && (
          <div className="clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Lead Priority Tier & SLA Health Matrix</h3>
                <p className="clean-card-sub">Progression, lead scoring, and outcome breakdown by priority level</p>
              </div>
            </div>

            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Priority Tier</th>
                    <th>Average Score</th>
                    <th>Total Inbound</th>
                    <th>Active In Progress</th>
                    <th>Converted</th>
                    <th>Disqualified</th>
                  </tr>
                </thead>
                <tbody>
                  {priorities.map(p => (
                    <tr key={p.priority}>
                      <td>
                        <strong style={{ color: p.priority === 'Urgent' ? '#ef4444' : p.priority === 'High' ? '#f59e0b' : 'var(--text-primary)' }}>
                          {p.priority} Priority
                        </strong>
                      </td>
                      <td>
                        <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.75rem' }}>
                          {p.avgScore?.toFixed(0) || 0} / 100
                        </span>
                      </td>
                      <td><strong>{p.total}</strong></td>
                      <td>{p.active}</td>
                      <td><span style={{ color: '#10b981', fontWeight: 700 }}>{p.converted}</span></td>
                      <td><span style={{ color: '#ef4444' }}>{p.lost}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    placeholder="Search lead, email, company, source..."
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
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredLeads.length}</strong> of {leads.length} records
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
                    <th>Lead Name</th>
                    <th>Company Name</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Acquisition Source</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No lead records match your query
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map(l => (
                      <tr key={l.leadId}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {l.firstName} {l.lastName}
                          </strong>
                        </td>
                        <td>{l.companyName || '—'}</td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: l.priority === 'Urgent' ? 'rgba(239,68,68,0.15)' : l.priority === 'High' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                              color: l.priority === 'Urgent' ? '#ef4444' : l.priority === 'High' ? '#f59e0b' : '#818cf8',
                              fontSize: '0.72rem'
                            }}
                          >
                            {l.priority || 'Medium'}
                          </span>
                        </td>
                        <td>
                          <span className="clean-badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', fontSize: '0.72rem' }}>
                            {l.statusName || 'New'}
                          </span>
                        </td>
                        <td>
                          {l.email ? (
                            <a href={`mailto:${l.email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}>
                              <Mail size={12} style={{ color: 'var(--text-muted)' }} /> {l.email}
                            </a>
                          ) : '—'}
                        </td>
                        <td>
                          {l.phone ? (
                            <a href={`tel:${l.phone}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}>
                              <Phone size={12} style={{ color: 'var(--text-muted)' }} /> {l.phone}
                            </a>
                          ) : '—'}
                        </td>
                        <td>
                          <span className="clean-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', fontSize: '0.72rem' }}>
                            {l.sourceName || 'Direct'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/leads/${l.leadId}`)}
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
