import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { showToast } from '../../lib/toast';
import { api } from '../../lib/api';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie
} from 'recharts';
import {
  History, Download, ShieldAlert, Activity, CheckCircle2,
  FileText, FileSpreadsheet, RefreshCw, Search, Filter,
  ArrowUpRight, Shield, Layers, Trash2, Calendar, User,
  PlusCircle, Edit3, Lock, Eye, AlertTriangle, CheckSquare,
  X, Copy, Check, ExternalLink, Code2, Sparkles, Clock, ArrowRight
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem, ReportSummaryBanner } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV } from '../../components/reports/reportExportUtils';
import './cleanReports.css';
import '../screens.css';

const PALETTE = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v || 0);

type HistoryTab = 'overview' | 'users' | 'created' | 'updated' | 'deleted' | 'security' | 'trail';

// Standalone PDF Generator for System History
function exportAuditPDF(logs: any[], dateRange: string, activeTabName: string) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `crm_system_history_${activeTabName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;

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
        <title>System History & Audit Trail Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; SYSTEM HISTORY (${activeTabName.toUpperCase()})</h1>
              <p class="pdf-sub">Database Audit Trail, Record Lifecycle & Security Logs</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Events</div>
              <div class="pdf-stat-value">${logs.length}</div>
              <div class="pdf-stat-sub">Logged events</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Creations</div>
              <div class="pdf-stat-value" style="color: #10b981;">${creates}</div>
              <div class="pdf-stat-sub">New records</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Updates</div>
              <div class="pdf-stat-value" style="color: #3b82f6;">${updates}</div>
              <div class="pdf-stat-sub">Modifications</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Deletions</div>
              <div class="pdf-stat-value" style="color: #ef4444;">${deletes}</div>
              <div class="pdf-stat-sub">Deleted records</div>
            </div>
          </div>

          <table class="pdf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>User</th>
                <th>Module</th>
                <th>Record ID</th>
                <th>Action</th>
                <th>Change Details</th>
              </tr>
            </thead>
            <tbody>
              ${logs.slice(0, 100).map((l, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${l.changedAt ? new Date(l.changedAt).toLocaleString() : '—'}</td>
                  <td><strong>${l.changedByName || 'System'}</strong></td>
                  <td>${l.entityTypeName || 'Record'}</td>
                  <td>#${l.entityId || '—'}</td>
                  <td>${l.auditActionTypeName || 'Modified'}</td>
                  <td>${l.fieldName ? `${l.fieldName}: "${l.oldValue ?? ''}" → "${l.newValue ?? ''}"` : 'Record operation'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="pdf-footer">
            <span>CRM System &bull; System History Audit Report</span>
            <span>Page 1</span>
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
          window.onload = function() { setTimeout(triggerDownload, 600); };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export const AuditReportsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HistoryTab>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Selected Log for details modal & view mode
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [inspectTab, setInspectTab] = useState<'diff' | 'json'>('diff');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');

  const fetchLogsAndStats = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) {
        q.append('startDate', startDate);
        q.append('fromDate', startDate);
      }
      if (endDate) {
        q.append('endDate', endDate);
        q.append('toDate', endDate);
      }
      q.append('pageSize', '2000');

      try {
        const res = await api.get<any>(`/api/reports/system-history?${q.toString()}`);
        if (res && Array.isArray(res.items)) {
          setLogs(res.items);
          setStats(res);
          return;
        }
      } catch (e) {
        console.warn('Fallback to audit-logs endpoint', e);
      }

      const [logsRes, statsRes] = await Promise.all([
        api.get<any>(`/api/audit-logs?${q.toString()}`),
        api.get<any>(`/api/audit-logs/stats?${q.toString()}`)
      ]);

      const items = Array.isArray(logsRes)
        ? logsRes
        : (Array.isArray(logsRes?.items) ? logsRes.items : []);
      setLogs(items);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load system history', err);
      setLogs([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndStats();
  }, [startDate, endDate]);

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

  // Sub-tabs configuration
  const historyTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'User Activity' },
    { id: 'created', label: 'Created Records' },
    { id: 'updated', label: 'Updated Records' },
    { id: 'deleted', label: 'Deleted Records' },
    { id: 'security', label: 'Login / Security' },
    { id: 'trail', label: 'Audit Trail' },
  ];

  // Distinct modules and users for filter dropdowns
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => { if (l.entityTypeName) set.add(l.entityTypeName); });
    return ['All', ...Array.from(set)];
  }, [logs]);

  const availableUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => { if (l.changedByName) set.add(l.changedByName); });
    return ['All', ...Array.from(set)];
  }, [logs]);

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Tab-specific filters
      const actionName = (log.auditActionTypeName || log.action || '').toLowerCase();
      const entityName = (log.entityTypeName || log.entity || '').toLowerCase();

      if (activeTab === 'created') {
        if (!actionName.includes('create') && !actionName.includes('insert')) return false;
      } else if (activeTab === 'updated') {
        if (!actionName.includes('update') && !actionName.includes('modify')) return false;
      } else if (activeTab === 'deleted') {
        if (!actionName.includes('delete')) return false;
      } else if (activeTab === 'security') {
        if (!entityName.includes('auth') && !actionName.includes('login') && !actionName.includes('security')) return false;
      }

      // User filter
      if (userFilter !== 'All' && log.changedByName !== userFilter) return false;

      // Module filter
      if (moduleFilter !== 'All' && log.entityTypeName !== moduleFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          (log.entityTypeName && log.entityTypeName.toLowerCase().includes(term)) ||
          (log.changedByName && log.changedByName.toLowerCase().includes(term)) ||
          (log.fieldName && log.fieldName.toLowerCase().includes(term)) ||
          (log.oldValue && String(log.oldValue).toLowerCase().includes(term)) ||
          (log.newValue && String(log.newValue).toLowerCase().includes(term)) ||
          (String(log.entityId).includes(term));
        if (!match) return false;
      }

      return true;
    });
  }, [logs, activeTab, userFilter, moduleFilter, searchTerm]);

  // Summary Metrics
  const totalEvents = stats?.totalEvents ?? logs.length;
  const createdCount = stats?.createdCount ?? logs.filter(l => (l.auditActionTypeName || '').toLowerCase().includes('create') || (l.auditActionTypeName || '').toLowerCase().includes('insert')).length;
  const updatedCount = stats?.updatedCount ?? logs.filter(l => (l.auditActionTypeName || '').toLowerCase().includes('update') || (l.auditActionTypeName || '').toLowerCase().includes('modify')).length;
  const deletedCount = stats?.deletedCount ?? logs.filter(l => (l.auditActionTypeName || '').toLowerCase().includes('delete')).length;
  const securityCount = stats?.loginCount ?? logs.filter(l => (l.entityTypeName || '').toLowerCase().includes('auth') || (l.auditActionTypeName || '').toLowerCase().includes('login')).length;

  const historyKpis: ReportKpiItem[] = [
    { label: 'Total System Events', value: fmtNum(totalEvents), sub: 'Logged mutations & actions', icon: <History size={18} />, color: '#6366f1' },
    { label: 'Created Records', value: fmtNum(createdCount), sub: 'New database entries', icon: <PlusCircle size={18} />, color: '#10b981', deltaUp: true },
    { label: 'Updated Records', value: fmtNum(updatedCount), sub: 'Field modifications', icon: <Edit3 size={18} />, color: '#3b82f6' },
    { label: 'Deleted Records', value: fmtNum(deletedCount), sub: 'Purged / archived records', icon: <Trash2 size={18} />, color: '#ef4444' },
    { label: 'Login / Security Events', value: fmtNum(securityCount), sub: 'Auth verifications', icon: <Lock size={18} />, color: '#f59e0b' },
  ];

  // User breakdown list
  const userActivityList = useMemo(() => {
    const userMap: Record<string, { name: string; email: string; count: number; lastActive: string; creates: number; updates: number; deletes: number }> = {};
    logs.forEach(l => {
      const key = l.changedByName || 'System User';
      if (!userMap[key]) {
        userMap[key] = { name: key, email: l.changedByEmail || '—', count: 0, lastActive: l.changedAt, creates: 0, updates: 0, deletes: 0 };
      }
      userMap[key].count++;
      const act = (l.auditActionTypeName || '').toLowerCase();
      if (act.includes('create') || act.includes('insert')) userMap[key].creates++;
      else if (act.includes('update') || act.includes('modify')) userMap[key].updates++;
      else if (act.includes('delete')) userMap[key].deletes++;

      if (new Date(l.changedAt) > new Date(userMap[key].lastActive)) {
        userMap[key].lastActive = l.changedAt;
      }
    });
    return Object.values(userMap).sort((a, b) => b.count - a.count);
  }, [logs]);

  // Master Table Columns
  const trailColumns: ColumnDef<any>[] = [
    { key: 'changedAt', header: 'Timestamp', width: '14%', render: (r) => new Date(r.changedAt).toLocaleString() },
    { key: 'changedByName', header: 'User', width: '16%', render: (r) => (
      <div>
        <strong>{r.changedByName || 'System User'}</strong>
        {r.changedByEmail && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.changedByEmail}</div>}
      </div>
    )},
    { key: 'entityTypeName', header: 'Module', width: '11%', render: (r) => <span className="clean-badge clean-badge-info">{r.entityTypeName}</span> },
    { key: 'entityId', header: 'Record ID', width: '9%', align: 'center', render: (r) => `#${r.entityId}` },
    { key: 'auditActionTypeName', header: 'Action', width: '11%', render: (r) => {
      const act = (r.auditActionTypeName || '').toLowerCase();
      const cls = act.includes('create') || act.includes('insert') ? 'clean-badge-success' : act.includes('delete') ? 'clean-badge-danger' : 'clean-badge-primary';
      return <span className={`clean-badge ${cls}`}>{r.auditActionTypeName}</span>;
    }},
    { key: 'details', header: 'Change Details', width: '27%', render: (r) => {
      if (!r.fieldName) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>{r.oldValue || r.newValue || 'Record lifecycle mutation'}</span>;
      return (
        <div style={{ fontSize: '12px' }}>
          <strong style={{ color: 'var(--color-text, #1e293b)' }}>{r.fieldName}: </strong>
          <span style={{ color: '#ef4444', textDecoration: 'line-through', marginRight: '6px' }}>"{r.oldValue ?? ''}"</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>&rarr; "{r.newValue ?? ''}"</span>
        </div>
      );
    }},
    { key: 'actions', header: 'Action', width: '12%', align: 'right', render: (r) => (
      <button
        type="button"
        onClick={() => {
          setSelectedLog(r);
          setInspectTab('diff');
        }}
        className="crm-audit-inspect-btn"
      >
        <Eye size={12} />
        <span>Inspect</span>
      </button>
    )},
  ];

  // Updated Records Columns with Before / After Cards
  const updatedColumns: ColumnDef<any>[] = [
    { key: 'changedAt', header: 'Timestamp', width: '14%', render: (r) => new Date(r.changedAt).toLocaleString() },
    { key: 'changedByName', header: 'Changed By', width: '16%', render: (r) => <strong>{r.changedByName || 'System User'}</strong> },
    { key: 'entityTypeName', header: 'Module & ID', width: '14%', render: (r) => <span><strong>{r.entityTypeName}</strong> #{r.entityId}</span> },
    { key: 'fieldName', header: 'Field Modified', width: '14%', render: (r) => <span className="clean-badge clean-badge-warning">{r.fieldName || 'Attributes'}</span> },
    { key: 'oldValue', header: 'Before (Old Value)', width: '15%', render: (r) => <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>{r.oldValue || '—'}</span> },
    { key: 'newValue', header: 'After (New Value)', width: '15%', render: (r) => <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{r.newValue || '—'}</span> },
    { key: 'actions', header: 'Action', width: '12%', align: 'right', render: (r) => (
      <button
        type="button"
        onClick={() => {
          setSelectedLog(r);
          setInspectTab('diff');
        }}
        className="crm-audit-inspect-btn"
      >
        <Eye size={12} />
        <span>Inspect</span>
      </button>
    )},
  ];

  const handleExportPDF = () => {
    exportAuditPDF(filteredLogs, `${startDate} to ${endDate}`, activeTab);
  };

  const handleExportCSV = () => {
    const csvData = filteredLogs.map((l, idx) => ({
      '#': idx + 1,
      'Timestamp': l.changedAt ? new Date(l.changedAt).toISOString() : '',
      'User': l.changedByName || 'System User',
      'User Email': l.changedByEmail || '',
      'Module': l.entityTypeName || '',
      'Record ID': l.entityId || '',
      'Action': l.auditActionTypeName || '',
      'Field Changed': l.fieldName || '',
      'Old Value': l.oldValue || '',
      'New Value': l.newValue || ''
    }));
    exportCSV(csvData, `crm_audit_${activeTab}_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <Layout>
      <div className="clean-reports-container">
        {/* Reports Navigation Bar with System History active */}
        <ReportsNav
          activeCategory="system-history"
          subTabs={historyTabs}
          activeSubTab={activeTab}
          onSubTabChange={(id) => setActiveTab(id as HistoryTab)}
        />

        {/* Header & Date Controls */}
        <ReportHeader
          title="System History & Audit Trail"
          subtitle="Comprehensive tamper-evident record of database creations, updates (before/after values), deletions, and user actions."
          activePreset={activePreset}
          startDate={startDate}
          endDate={endDate}
          onPresetChange={handlePresetChange}
          onRefresh={fetchLogsAndStats}
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          loading={loading}
        />

        {/* Filter Toolbar for Audit Records */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          background: 'var(--color-surface, #ffffff)',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid var(--color-border, #e2e8f0)',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by user, module, field, or value..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #e2e8f0)',
                background: 'var(--color-bg, #f8fafc)',
                color: 'var(--color-text, #1e293b)',
                fontSize: '13px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Module:</span>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #e2e8f0)',
                background: 'var(--color-bg, #f8fafc)',
                color: 'var(--color-text, #1e293b)',
                fontSize: '13px'
              }}
            >
              {availableModules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>User:</span>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #e2e8f0)',
                background: 'var(--color-bg, #f8fafc)',
                color: 'var(--color-text, #1e293b)',
                fontSize: '13px'
              }}
            >
              {availableUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {(searchTerm || moduleFilter !== 'All' || userFilter !== 'All') && (
            <button
              onClick={() => { setSearchTerm(''); setModuleFilter('All'); setUserFilter('All'); }}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            <ReportSummaryBanner 
              items={[
                historyKpis[0], // Total System Events
                historyKpis[1], // Created Records
                historyKpis[2], // Updated Records
                historyKpis[4], // Login / Security Events
              ]} 
              loading={loading} 
            />

            <div className="clean-charts-grid">
              <ReportChartCard
                title="System Activity Timeline"
                subtitle="Daily volume of database mutations and logs"
                badge="Activity Velocity"
                icon={<Activity size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats?.timeline || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="auditGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <YAxis stroke="#94a3b8" tickLine={false} style={{ fontSize: '11px' }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area type="monotone" dataKey="count" name="Audit Events" stroke="#6366f1" strokeWidth={2} fill="url(#auditGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ReportChartCard>

              <ReportChartCard
                title="Activity by Module"
                subtitle="Distribution of actions across CRM entities"
                badge="Modules"
                icon={<Layers size={16} />}
              >
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats?.byModule || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="module"
                    >
                      {(stats?.byModule || []).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ReportChartCard>
            </div>

            <div className="clean-table-card clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Recent System History Logs</h3>
                  <p className="clean-card-subtitle">Showing latest logged operations matching current filters</p>
                </div>
              </div>
              <ReportDataTable columns={trailColumns} data={filteredLogs.slice(0, 50)} loading={loading} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: USER ACTIVITY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {userActivityList.map((user, idx) => (
                <div key={user.name} className="clean-card" style={{ padding: '16px', borderLeft: `4px solid ${PALETTE[idx % PALETTE.length]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700 }}>{user.name}</h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{user.email}</span>
                    </div>
                    <span className="clean-badge clean-badge-primary">{user.count} actions</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#475569', marginTop: '12px' }}>
                    <div><strong>{user.creates}</strong> creates</div>
                    <div><strong>{user.updates}</strong> updates</div>
                    <div><strong>{user.deletes}</strong> deletes</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                    Last active: {new Date(user.lastActive).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="clean-table-card clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">User Actions Detail</h3>
                  <p className="clean-card-subtitle">Activity ledger filtered by selected user</p>
                </div>
              </div>
              <ReportDataTable columns={trailColumns} data={filteredLogs} loading={loading} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: CREATED RECORDS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'created' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Created Records Log</h3>
                <p className="clean-card-subtitle">All records created across Customers, Leads, Deals, Invoices, Payments, Contracts & Tasks</p>
              </div>
              <span className="clean-badge clean-badge-success">{filteredLogs.length} Records Created</span>
            </div>
            <ReportDataTable columns={trailColumns} data={filteredLogs} loading={loading} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: UPDATED RECORDS (BEFORE -> AFTER VALUES) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'updated' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Updated Records & Field Value Changes</h3>
                <p className="clean-card-subtitle">Precise Before vs. After value comparison for all modified record attributes</p>
              </div>
              <span className="clean-badge clean-badge-primary">{filteredLogs.length} Field Updates</span>
            </div>
            <ReportDataTable columns={updatedColumns} data={filteredLogs} loading={loading} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: DELETED RECORDS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'deleted' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Deleted Records & Archive Log</h3>
                <p className="clean-card-subtitle">Permanent record of entity deletions and removals with responsible user attribution</p>
              </div>
              <span className="clean-badge clean-badge-danger">{filteredLogs.length} Deletions</span>
            </div>
            <ReportDataTable columns={trailColumns} data={filteredLogs} loading={loading} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: LOGIN / SECURITY */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'security' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Authentication & Security Audit Trail</h3>
                <p className="clean-card-subtitle">User logins, security updates, password changes, and access modifications</p>
              </div>
              <span className="clean-badge clean-badge-warning">{filteredLogs.length} Security Events</span>
            </div>
            <ReportDataTable columns={trailColumns} data={filteredLogs} loading={loading} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 7: AUDIT TRAIL */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'trail' && (
          <div className="clean-table-card clean-card">
            <div className="clean-card-header">
              <div>
                <h3 className="clean-card-title">Complete Master Audit Trail</h3>
                <p className="clean-card-subtitle">Full searchable, filterable database mutation ledger with full attribution</p>
              </div>
              <span className="clean-badge clean-badge-info">{filteredLogs.length} Total Trail Events</span>
            </div>
            <ReportDataTable columns={trailColumns} data={filteredLogs} loading={loading} />
          </div>
        )}

        {/* ── 8. State-of-the-Art System History Inspection Modal ────────── */}
        {selectedLog && (() => {
          const actionName = selectedLog.auditActionTypeName || selectedLog.action || 'Action';
          const act = actionName.toLowerCase();
          const actionBadge = {
            bg: act.includes('create') || act.includes('insert') ? 'rgba(16,185,129,0.15)' : act.includes('delete') ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
            color: act.includes('create') || act.includes('insert') ? '#10b981' : act.includes('delete') ? '#ef4444' : '#6366f1',
            border: act.includes('create') || act.includes('insert') ? 'rgba(16,185,129,0.3)' : act.includes('delete') ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)',
            label: actionName
          };

          const entityUrl = (() => {
            const t = (selectedLog.entityTypeName || selectedLog.entity || '').toLowerCase();
            const id = selectedLog.entityId;
            if (t.includes('customer')) return `/customers/${id}`;
            if (t.includes('lead')) return `/leads/${id}`;
            if (t.includes('company') || t.includes('organization')) return `/companies/${id}`;
            if (t.includes('opp') || t.includes('deal')) return `/opportunities/${id}`;
            if (t.includes('contract')) return `/contracts`;
            if (t.includes('invoice')) return `/invoices`;
            if (t.includes('payment')) return `/payments`;
            if (t.includes('task')) return `/tasks`;
            return null;
          })();

          return (
            <div className="crm-modal-overlay">
              <div className="crm-modal-container" style={{ maxWidth: '680px' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      background: actionBadge.bg,
                      color: actionBadge.color,
                      padding: '0.55rem',
                      borderRadius: '10px',
                      border: `1px solid ${actionBadge.border}`,
                      display: 'flex'
                    }}>
                      <History size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          System History Inspection
                        </h3>
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          fontWeight: 700
                        }}>
                          #{selectedLog.auditLogId || selectedLog.id || selectedLog.entityId}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Audit trail record verification
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 4-Box Metadata Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.2rem' }}>
                  {/* Actor / User */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={11} /> Actor / User
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.88rem' }}>
                      {selectedLog.changedByName || selectedLog.userName || 'System Actor'}
                    </div>
                    {selectedLog.changedByEmail && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedLog.changedByEmail}
                      </div>
                    )}
                  </div>

                  {/* Target Entity */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Layers size={11} /> Target Module
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.88rem' }}>
                      {selectedLog.entityTypeName || selectedLog.entity || 'Entity'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>
                      Record #{selectedLog.entityId}
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Activity size={11} /> Action Type
                    </div>
                    <div style={{ marginTop: '0.35rem' }}>
                      <span
                        className="clean-badge"
                        style={{
                          background: actionBadge.bg,
                          color: actionBadge.color,
                          border: `1px solid ${actionBadge.border}`,
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {actionBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> Timestamp
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                      {new Date(selectedLog.changedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* View Switcher: Visual Diff vs JSON Payload */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setInspectTab('diff')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: inspectTab === 'diff' ? '1px solid #6366f1' : '1px solid transparent',
                      background: inspectTab === 'diff' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      color: inspectTab === 'diff' ? '#818cf8' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: inspectTab === 'diff' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Sparkles size={13} /> Visual Diff &amp; Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectTab('json')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: inspectTab === 'json' ? '1px solid #6366f1' : '1px solid transparent',
                      background: inspectTab === 'json' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      color: inspectTab === 'json' ? '#818cf8' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: inspectTab === 'json' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Code2 size={13} /> Raw JSON Payload
                  </button>
                </div>

                {/* TAB 1: VISUAL DIFF VIEW */}
                {inspectTab === 'diff' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {act.includes('delete') ? (
                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Trash2 size={15} /> Deleted Entity State Snapshot
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word', fontFamily: 'monospace' }}>
                          {selectedLog.oldValue || 'Record was deleted from system without attributes snapshot.'}
                        </div>
                      </div>
                    ) : selectedLog.fieldName ? (
                      <div className="crm-audit-diff-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Edit3 size={13} style={{ color: '#6366f1' }} />
                            <span>Field: <span style={{ color: '#818cf8' }}>{selectedLog.fieldName}</span></span>
                          </div>
                          <span className="clean-badge clean-badge-warning" style={{ fontSize: '0.68rem' }}>Field Mutation</span>
                        </div>

                        <div className="crm-audit-diff-values">
                          <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3, fontWeight: 700 }}>
                              Previous (Before)
                            </div>
                            <div className="crm-audit-val-box old">
                              {selectedLog.oldValue !== null && selectedLog.oldValue !== '' ? selectedLog.oldValue : <em style={{ opacity: 0.5 }}>ø (empty)</em>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <ArrowRight size={16} />
                          </div>

                          <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3, fontWeight: 700 }}>
                              New (After)
                            </div>
                            <div className="crm-audit-val-box new">
                              {selectedLog.newValue !== null && selectedLog.newValue !== '' ? selectedLog.newValue : <em style={{ opacity: 0.5 }}>ø (empty)</em>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : act.includes('create') ? (
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PlusCircle size={15} /> Entity Record Created
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          New <strong>{selectedLog.entityTypeName || selectedLog.entity}</strong> initialized with identifier <strong>#{selectedLog.entityId}</strong> by <strong>{selectedLog.changedByName || 'System'}</strong>.
                        </div>
                        {selectedLog.newValue && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                            {selectedLog.newValue}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Transaction Details
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {selectedLog.oldValue || selectedLog.newValue || `Operation ${actionName} completed on ${selectedLog.entityTypeName || selectedLog.entity} #${selectedLog.entityId}`}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: RAW JSON PAYLOAD VIEW */}
                {inspectTab === 'json' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Audit Log Object
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                          setCopiedJson(true);
                          showToast('Audit JSON payload copied to clipboard', 'success');
                          setTimeout(() => setCopiedJson(false), 2000);
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: copiedJson ? '#10b981' : 'var(--text-secondary)',
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {copiedJson ? <Check size={11} /> : <Copy size={11} />}
                        {copiedJson ? 'Copied' : 'Copy JSON'}
                      </button>
                    </div>
                    <div className="crm-audit-json-box">
                      {JSON.stringify(selectedLog, null, 2)}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const idToCopy = selectedLog.auditLogId || selectedLog.id || selectedLog.entityId;
                      navigator.clipboard.writeText(String(idToCopy));
                      setCopiedId(true);
                      showToast(`Audit ID #${idToCopy} copied`, 'success');
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: copiedId ? '#10b981' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {copiedId ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId ? 'Copied ID' : 'Copy Audit ID'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {entityUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setSelectedLog(null);
                          navigate(entityUrl);
                        }}
                        style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <ExternalLink size={13} /> View {selectedLog.entityTypeName || selectedLog.entity}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setSelectedLog(null)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Close Inspection
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </Layout>
  );
};
export default AuditReportsScreen;
