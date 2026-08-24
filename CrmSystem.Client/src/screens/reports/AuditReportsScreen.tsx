import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { api } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import {
  History, Download, ArrowLeft, ShieldAlert,
  Activity, CheckCircle2, FileText, FileSpreadsheet,
  RefreshCw, Search, Sparkles, Filter, ExternalLink,
  Table as TableIcon, BarChart3, ArrowUpRight,
  Shield, Layers, Trash2, Calendar
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// PDF Generator for Audit Logs
function exportAuditPDF(logs: any[], dateRange: string) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `system_audit_history_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const creates = logs.filter(l => (l.action || l.auditActionTypeName || '').toLowerCase().includes('create') || (l.action || l.auditActionTypeName || '').toLowerCase().includes('insert')).length;
  const updates = logs.filter(l => (l.action || l.auditActionTypeName || '').toLowerCase().includes('update') || (l.action || l.auditActionTypeName || '').toLowerCase().includes('modify')).length;
  const deletes = logs.filter(l => (l.action || l.auditActionTypeName || '').toLowerCase().includes('delete')).length;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>System History & Security Audit Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; SYSTEM HISTORY REPORT</h1>
              <p class="pdf-sub">Database Mutation Logs, User Activity & Security Compliance Trail</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Mutation Events</div>
              <div class="pdf-stat-value">${logs.length}</div>
              <div class="pdf-stat-sub">Logged database changes</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Creations & Inserts</div>
              <div class="pdf-stat-value" style="color: #10b981;">${creates}</div>
              <div class="pdf-stat-sub">New records created</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Updates & Edits</div>
              <div class="pdf-stat-value" style="color: #3b82f6;">${updates}</div>
              <div class="pdf-stat-sub">Field modifications</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Deletions</div>
              <div class="pdf-stat-value" style="color: #ef4444;">${deletes}</div>
              <div class="pdf-stat-sub">Purged entity records</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e1b4b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Security & Audit Compliance Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>Integrity Trail:</strong> <strong>${logs.length}</strong> total mutation events recorded. All database modifications are tamper-evident.</li>
              <li><strong>Deletion Monitoring:</strong> <strong>${deletes}</strong> record deletions captured. Review deletion reasons during weekly security audits.</li>
              <li><strong>User Attribution:</strong> Every event is tied to an authenticated sales rep identity and timestamp.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Audit Ledger Records (${logs.length} Total Records)</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Target Entity</th>
                <th>Action Type</th>
                <th>Changed By</th>
                <th>Email Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${logs.slice(0, 100).map((l, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${l.entityTypeName || l.entityName || l.entity || 'Entity'} (#${l.entityId || '—'})</strong></td>
                  <td>${l.auditActionTypeName || l.action || 'Mutation'}</td>
                  <td>${l.changedByName || 'System User'}</td>
                  <td>${l.changedByEmail || '—'}</td>
                  <td>${l.changedAt ? new Date(l.changedAt).toLocaleString() : '—'}</td>
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

export const AuditReportsScreen: React.FC = () => {
  const navigate = useNavigate();

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

  const [activePreset, setActivePreset] = useState('30 Days');
  const [activeTab, setActiveTab] = useState<'analytics' | 'directory'>('analytics');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = () => {
    setLoading(true);
    api.get<any>('/api/audit-logs?pageSize=1000')
      .then(res => {
        const list = Array.isArray(res)
          ? res
          : (Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : []));
        setLogs(list);
      })
      .catch(err => {
        console.error('Failed to load audit logs', err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const createCount = useMemo(() =>
    logs.filter(l => (l.action || l.auditActionTypeName || '').toLowerCase().includes('create') || (l.action || l.auditActionTypeName || '').toLowerCase().includes('insert')).length,
    [logs]
  );

  const updateCount = useMemo(() =>
    logs.filter(l => (l.action || l.auditActionTypeName || '').toLowerCase().includes('update') || (l.action || l.auditActionTypeName || '').toLowerCase().includes('modify')).length,
    [logs]
  );

  const deleteCount = useMemo(() =>
    logs.filter(l => (l.action || l.auditActionTypeName || '').toLowerCase().includes('delete')).length,
    [logs]
  );

  const actionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      const act = l.auditActionTypeName || l.action || 'Other';
      counts[act] = (counts[act] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count], idx) => ({
      name,
      count,
      color: PALETTE[idx % PALETTE.length]
    }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    return logs.filter(l => {
      const q = searchTerm.toLowerCase();
      const entity = (l.entityTypeName || l.entityName || l.entity || '').toLowerCase();
      const action = (l.action || l.auditActionTypeName || '').toLowerCase();
      const userName = (l.changedByName || '').toLowerCase();
      const userEmail = (l.changedByEmail || '').toLowerCase();

      const matchesSearch = !searchTerm || entity.includes(q) || action.includes(q) || userName.includes(q) || userEmail.includes(q);

      const matchesAction =
        actionFilter === 'all' ||
        (actionFilter === 'create' && (action.includes('create') || action.includes('insert'))) ||
        (actionFilter === 'update' && (action.includes('update') || action.includes('modify'))) ||
        (actionFilter === 'delete' && action.includes('delete'));

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['AuditId', 'EntityName', 'EntityId', 'Action', 'ChangedByName', 'ChangedByEmail', 'Timestamp'];
    const rows = logs.map(l => [
      l.auditLogId || l.id,
      `"${l.entityTypeName || l.entityName || ''}"`,
      l.entityId || '',
      `"${l.auditActionTypeName || l.action || ''}"`,
      `"${(l.changedByName || '').replace(/"/g, '""')}"`,
      `"${l.changedByEmail || ''}"`,
      `"${l.changedAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `system_history_audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
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
              <button onClick={() => navigate('/audit-logs')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Audit Logs
              </button>
              <span className="clean-badge clean-badge-primary">
                System History & Security Audit
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => exportAuditPDF(logs, activePreset)} className="clean-btn-primary" title="Export PDF Executive Report">
                <FileText size={15} /> Export PDF
              </button>
              <button onClick={handleExportCSV} className="clean-btn-secondary" title="Download CSV Dataset">
                <FileSpreadsheet size={15} /> Export CSV
              </button>
              <button onClick={fetchLogs} className="clean-btn-secondary" style={{ padding: '6px 10px' }} title="Refresh Audit Log Data">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="clean-title-group">
            <h1 className="clean-report-title">
              System Audit Trail & Mutation Intelligence Report
            </h1>
            <p className="clean-report-desc">
              Immutable history of database mutations, user actions, security trail compliance, and deletion metrics.
            </p>
          </div>

          {/* Period presets toolbar */}
          <div className="clean-toolbar">
            <div className="clean-toolbar-group">
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Period:</span>
              <div className="clean-preset-group">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    className={`clean-preset-btn ${activePreset === p.label ? 'active' : ''}`}
                    onClick={() => setActivePreset(p.label)}
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
          {/* Total Events */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Mutation Events</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                <History size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{logs.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Audit Log</span>
              <span>Logged database changes</span>
            </div>
          </div>

          {/* Create Events */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Insert / Create Actions</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#10b981' }}>{createCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">Inserts</span>
              <span>New records added</span>
            </div>
          </div>

          {/* Update Events */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Updates & Field Edits</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <Activity size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#3b82f6' }}>{updateCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Updates</span>
              <span>State & field edits</span>
            </div>
          </div>

          {/* Deletions */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Deletions / Purged</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <Trash2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#ef4444' }}>{deleteCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(239,68,68,0.14)', color: '#ef4444' }}>Deletions</span>
              <span>Removed entity records</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="clean-tab-nav">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`clean-tab-item ${activeTab === 'analytics' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Action Type Distribution & Compliance
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Audit History Ledger ({logs.length})
          </button>
        </div>

        {/* TAB 1: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Activity Breakdown by Action Type</h3>
                  <p className="clean-card-sub">Distribution of Creates, Updates, Deletions, and Reassignments</p>
                </div>
              </div>
              <div style={{ height: 280, padding: '1rem' }}>
                {actionDistribution.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    No audit action data recorded
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={actionDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                      <Tooltip formatter={(val: any) => [`${val} Events`, 'Count']} />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                        {actionDistribution.map((entry, idx) => (
                          <Cell key={`bar-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive Security & Compliance Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#6366f1', marginBottom: 4, fontSize: '0.82rem' }}>
                    🛡️ Tamper-Evident Trail
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Your system has logged <strong>{logs.length}</strong> total changes. Every modification preserves original values and authenticated user identity.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#ef4444', marginBottom: 4, fontSize: '0.82rem' }}>
                    ⚠️ Deletion Governance
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{deleteCount}</strong> records were deleted. Administrators can review deleted payloads directly in the log inspector.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    👥 User Accountability
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Filter by sales rep or user in the System History dashboard to inspect individual productivity and data modifications.
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
                    placeholder="Search entity, action, user..."
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
                  value={actionFilter}
                  onChange={e => setActionFilter(e.target.value)}
                  style={{
                    padding: '7px 10px',
                    background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem'
                  }}
                >
                  <option value="all">All Action Types</option>
                  <option value="create">Creations / Inserts</option>
                  <option value="update">Updates / Edits</option>
                  <option value="delete">Deletions</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredLogs.length}</strong> of {logs.length} records
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
                    <th>Target Entity</th>
                    <th>Action Type</th>
                    <th>Changed By User</th>
                    <th>Email Address</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No audit records match your query
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((l, i) => (
                      <tr key={l.auditLogId || i}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {l.entityTypeName || l.entityName || l.entity || 'Entity'} {l.entityId ? `(#${l.entityId})` : ''}
                          </strong>
                        </td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: (l.action || l.auditActionTypeName || '').toLowerCase().includes('delete')
                                ? 'rgba(239,68,68,0.12)'
                                : (l.action || l.auditActionTypeName || '').toLowerCase().includes('create')
                                ? 'rgba(16,185,129,0.12)'
                                : 'rgba(59,130,246,0.12)',
                              color: (l.action || l.auditActionTypeName || '').toLowerCase().includes('delete')
                                ? '#ef4444'
                                : (l.action || l.auditActionTypeName || '').toLowerCase().includes('create')
                                ? '#10b981'
                                : '#3b82f6',
                              fontSize: '0.72rem'
                            }}
                          >
                            {l.auditActionTypeName || l.action || 'Mutation'}
                          </span>
                        </td>
                        <td>{l.changedByName || 'System User'}</td>
                        <td>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {l.changedByEmail || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {l.changedAt ? new Date(l.changedAt).toLocaleString() : '—'}
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
