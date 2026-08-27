import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../components/layout/Layout';
import { api } from '../../lib/api';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie
} from 'recharts';
import {
  History, Download, ShieldAlert, Activity, CheckCircle2,
  FileText, FileSpreadsheet, RefreshCw, Search, Filter,
  ArrowUpRight, Shield, Layers, Trash2, Calendar, User,
  PlusCircle, Edit3, Lock, Eye, AlertTriangle, CheckSquare
} from 'lucide-react';
import { ReportsNav } from '../../components/reports/ReportsNav';
import { ReportHeader, calculateDateRange } from '../../components/reports/ReportHeader';
import { ReportKpiGrid, ReportKpiItem } from '../../components/reports/ReportKpiCard';
import { ReportChartCard, CustomChartTooltip } from '../../components/reports/ReportCharts';
import { ReportDataTable, ColumnDef } from '../../components/reports/ReportDataTable';
import { exportCSV } from '../../components/reports/reportExportUtils';
import './cleanReports.css';

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
  const [activeTab, setActiveTab] = useState<HistoryTab>('overview');
  const [activePreset, setActivePreset] = useState('30days');
  const initialDates = calculateDateRange('30days');
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

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
    { key: 'changedAt', header: 'Timestamp', width: '15%', render: (r) => new Date(r.changedAt).toLocaleString() },
    { key: 'changedByName', header: 'User', width: '18%', render: (r) => (
      <div>
        <strong>{r.changedByName || 'System User'}</strong>
        {r.changedByEmail && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.changedByEmail}</div>}
      </div>
    )},
    { key: 'entityTypeName', header: 'Module', width: '12%', render: (r) => <span className="clean-badge clean-badge-info">{r.entityTypeName}</span> },
    { key: 'entityId', header: 'Record ID', width: '10%', align: 'center', render: (r) => `#${r.entityId}` },
    { key: 'auditActionTypeName', header: 'Action', width: '12%', render: (r) => {
      const act = (r.auditActionTypeName || '').toLowerCase();
      const cls = act.includes('create') || act.includes('insert') ? 'clean-badge-success' : act.includes('delete') ? 'clean-badge-danger' : 'clean-badge-primary';
      return <span className={`clean-badge ${cls}`}>{r.auditActionTypeName}</span>;
    }},
    { key: 'details', header: 'Change Details', width: '33%', render: (r) => {
      if (!r.fieldName) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>Record lifecycle mutation</span>;
      return (
        <div style={{ fontSize: '12px' }}>
          <strong style={{ color: 'var(--color-text, #1e293b)' }}>{r.fieldName}: </strong>
          <span style={{ color: '#ef4444', textDecoration: 'line-through', marginRight: '6px' }}>"{r.oldValue ?? ''}"</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>&rarr; "{r.newValue ?? ''}"</span>
        </div>
      );
    }},
  ];

  // Updated Records Columns with Before / After Cards
  const updatedColumns: ColumnDef<any>[] = [
    { key: 'changedAt', header: 'Timestamp', width: '15%', render: (r) => new Date(r.changedAt).toLocaleString() },
    { key: 'changedByName', header: 'Changed By', width: '18%', render: (r) => <strong>{r.changedByName || 'System User'}</strong> },
    { key: 'entityTypeName', header: 'Module & ID', width: '15%', render: (r) => <span><strong>{r.entityTypeName}</strong> #{r.entityId}</span> },
    { key: 'fieldName', header: 'Field Modified', width: '15%', render: (r) => <span className="clean-badge clean-badge-warning">{r.fieldName || 'Attributes'}</span> },
    { key: 'oldValue', header: 'Before (Old Value)', width: '18%', render: (r) => <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>{r.oldValue || '—'}</span> },
    { key: 'newValue', header: 'After (New Value)', width: '19%', render: (r) => <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>{r.newValue || '—'}</span> },
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
            <ReportKpiGrid items={historyKpis} columns={5} />

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
      </div>
    </Layout>
  );
};
export default AuditReportsScreen;
