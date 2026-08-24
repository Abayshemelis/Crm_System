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
  CheckSquare, Download, ArrowLeft, CheckCircle2,
  Clock, AlertTriangle, Activity, Calendar,
  FileText, FileSpreadsheet, RefreshCw, Search,
  Sparkles, Filter, ChevronRight, BarChart3,
  PieChart as PieIcon, Table as TableIcon, ExternalLink,
  ArrowUpRight, Users, User
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#8b5cf6', '#06b6d4'];
const STATUS_COLORS: Record<string, string> = {
  Completed: '#10b981',
  Pending: '#3b82f6',
  'In Progress': '#6366f1',
  Overdue: '#ef4444',
  Cancelled: '#94a3b8'
};

// ─── PDF Generator for Tasks ──────────────────────────────────────────────────
function exportTaskPDF(tasks: any[], stats: any, dateRange: string, scope: string) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const filename = `tasks_activity_report_${new Date().toISOString().split('T')[0]}.pdf`;

  const totalTasks = stats?.total ?? tasks.length;
  const completed = stats?.completed ?? 0;
  const overdue = stats?.overdue ?? 0;
  const pending = stats?.pending ?? 0;
  const completionRate = stats?.completionRate ?? (totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(1) : '0');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tasks & Activity Execution Report - CRM</title>
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
            background: #ec4899;
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
            box-shadow: 0 2px 8px rgba(236, 72, 153, 0.4);
          }
          .pdf-btn-primary:hover { background: #db2777; }
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
            padding-bottom: 18px;
            border-bottom: 2px solid #e2e8f0;
            margin-bottom: 20px;
          }
          .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .brand-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
          .meta-box { text-align: right; font-size: 11px; color: #64748b; }
          .stat-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .stat-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 12px;
            border-radius: 8px;
          }
          .stat-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; }
          .stat-val { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .stat-val.green { color: #10b981; }
          .stat-val.blue { color: #3b82f6; }
          .stat-val.red { color: #ef4444; }
          .section-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 18px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background: #f1f5f9; padding: 7px 9px; text-align: left; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; }
          td { padding: 6px 9px; border-bottom: 1px solid #f1f5f9; color: #334155; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
          .badge-green { background: #dcfce7; color: #15803d; }
          .badge-blue { background: #dbeafe; color: #1d4ed8; }
          .badge-red { background: #fee2e2; color: #b91c1c; }
          .pdf-footer { margin-top: 25px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
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
              <h1 class="brand-title">CRM Tasks &amp; Team Execution Report</h1>
              <div class="brand-sub">Real-Time Operational Task Performance &amp; Activity Breakdown</div>
            </div>
            <div class="meta-box">
              <div><strong>Scope:</strong> ${scope === 'personal' ? 'Personal Tasks' : 'Entire Team'}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
              <div><strong>Generated:</strong> ${dateStr}</div>
            </div>
          </div>

          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-label">Total Tasks</div>
              <div class="stat-val">${totalTasks}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Completed</div>
              <div class="stat-val green">${completed} (${completionRate}%)</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Active / Pending</div>
              <div class="stat-val blue">${pending}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Overdue</div>
              <div class="stat-val red">${overdue}</div>
            </div>
          </div>

          <div class="section-title">Task Execution Summary (${tasks.length} Records)</div>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Related To</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.slice(0, 45).map(t => `
                <tr>
                  <td><strong>${t.title || 'Untitled Task'}</strong></td>
                  <td>${t.activityTypeName || 'Task'}</td>
                  <td>${t.assignedToName || 'Unassigned'}</td>
                  <td>
                    <span class="badge ${t.isTerminal ? 'badge-green' : t.isOverdue ? 'badge-red' : 'badge-blue'}">
                      ${t.statusName || (t.isTerminal ? 'Completed' : 'Pending')}
                    </span>
                  </td>
                  <td>${t.dueDate ? t.dueDate.slice(0, 10) : '—'}</td>
                  <td>${t.customerName || t.opportunityTitle || t.leadName || 'General'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="pdf-footer">
            <span>CRM Enterprise Platform &bull; Operational Report</span>
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

export const TaskReportsScreen: React.FC = () => {
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

  const [startDate, setStartDate] = useState(m30);
  const [endDate, setEndDate] = useState(today);
  const [activePreset, setActivePreset] = useState('30 Days');
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'overview' | 'directory'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [reportData, setReportData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      q.append('scope', 'company');

      const data = await api.get<any>(`/api/reports/tasks?${q.toString()}`);
      setReportData(data);
    } catch (err) {
      console.error('Failed to load task reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const tasks = useMemo(() => reportData?.items ?? [], [reportData]);
  const activityTypes = useMemo(() => reportData?.byType ?? [], [reportData]);
  const statusBreakdown = useMemo(() => reportData?.byStatus ?? [], [reportData]);
  const assigneeBreakdown = useMemo(() => reportData?.byAssignee ?? [], [reportData]);

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter((t: any) => {
      const matchesSearch =
        !searchTerm ||
        (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.activityTypeName && t.activityTypeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.assignedToName && t.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && t.isTerminal) ||
        (statusFilter === 'overdue' && t.isOverdue) ||
        (statusFilter === 'pending' && !t.isTerminal && !t.isOverdue);

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (!tasks || !tasks.length) {
      alert('No task records available to export.');
      return;
    }
    const headers = ['TaskId', 'Title', 'Type', 'Assignee', 'Customer', 'DueDate', 'Status', 'CreatedAt'];
    const rows = tasks.map((t: any) => [
      t.taskId,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.activityTypeName || 'Task').replace(/"/g, '""')}"`,
      `"${(t.assignedToName || 'Unassigned').replace(/"/g, '""')}"`,
      `"${(t.customerName || '').replace(/"/g, '""')}"`,
      `"${t.dueDate ? t.dueDate.slice(0, 10) : ''}"`,
      `"${t.isTerminal ? 'Completed' : t.isOverdue ? 'Overdue' : 'Pending'}"`,
      `"${t.createdAt ? t.createdAt.slice(0, 10) : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `task_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPDF = () => {
    exportTaskPDF(tasks, reportData, activePreset, 'All Company Tasks');
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/tasks')} className="clean-back-btn" type="button">
                <ArrowLeft size={15} /> All Tasks
              </button>
              <span className="clean-badge clean-badge-primary">
                Task Performance
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
              Tasks &amp; Team Activity Execution Metrics
            </h1>
            <p className="clean-report-desc">
              Live operational metrics computed directly from database tasks: completion rates, overdue backlog, channel distribution, and team output.
            </p>
          </div>

          {/* Controls toolbar */}
          <div className="clean-toolbar">
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

        {/* 4 Metric Cards */}
        <div className="clean-stat-grid">
          {/* Total Tasks */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Tasks</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(236,72,153,0.12)', color: '#ec4899' }}>
                <CheckSquare size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{reportData?.total ?? tasks.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(236,72,153,0.14)', color: '#ec4899' }}>Recorded</span>
              <span>All scheduled to-dos</span>
            </div>
          </div>

          {/* Completed */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Completed ({reportData?.completionRate ?? 0}%)</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#10b981' }}>
              {reportData?.completed ?? 0}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">
                <ArrowUpRight size={11} /> Done
              </span>
              <span>Executed tasks</span>
            </div>
          </div>

          {/* Pending / In Progress */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Active / Pending</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#3b82f6' }}>
              {reportData?.pending ?? 0}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Active</span>
              <span>In flight pipeline</span>
            </div>
          </div>

          {/* Overdue */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Overdue Tasks</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <AlertTriangle size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#ef4444' }}>
              {reportData?.overdue ?? 0}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(239,68,68,0.14)', color: '#ef4444' }}>SLA Alert</span>
              <span>Past deadline</span>
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
            <BarChart3 size={15} /> Execution &amp; Channel Breakdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Real Task Directory Ledger ({tasks.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {/* Chart 1: Tasks by Type / Channel */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Tasks by Channel / Activity</h3>
                    <p className="clean-card-sub">Calls, emails, demos, and follow-up touchpoint distribution</p>
                  </div>
                </div>
                <div style={{ height: 260, padding: '1rem' }}>
                  {activityTypes.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      No tasks found in selected timeframe
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={activityTypes} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                        <XAxis dataKey="type" stroke="var(--text-muted)" fontSize={11} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                        <Tooltip formatter={(val: any) => [`${val} Tasks`, 'Count']} />
                        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                          {activityTypes.map((_: any, idx: number) => (
                            <Cell key={`act-${idx}`} fill={PALETTE[idx % PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Status Breakdown */}
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Tasks by Status</h3>
                    <p className="clean-card-sub">Completed, in progress, pending, and overdue</p>
                  </div>
                </div>
                <div style={{ height: 260, padding: '1rem' }}>
                  {statusBreakdown.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                      No task status records found
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusBreakdown}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          innerRadius={45}
                          paddingAngle={3}
                          label={(entry: any) => `${entry.status}: ${entry.count}`}
                          labelLine={false}
                        >
                          {statusBreakdown.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || PALETTE[index % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => [`${val} Tasks`, 'Count']} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Team Distribution (if Team scope) */}
            {assigneeBreakdown.length > 0 && (
              <div className="clean-card">
                <div className="clean-card-header">
                  <div>
                    <h3 className="clean-card-title">Team Task Allocation &amp; Completion</h3>
                    <p className="clean-card-sub">Workload distribution and execution performance across representatives</p>
                  </div>
                </div>
                <div className="clean-table-container">
                  <table className="clean-table">
                    <thead>
                      <tr>
                        <th>Team Member / Rep</th>
                        <th>Total Assigned</th>
                        <th>Completed</th>
                        <th>Overdue Backlog</th>
                        <th>Completion %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assigneeBreakdown.map((a: any, idx: number) => {
                        const rate = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;
                        return (
                          <tr key={`assignee-${idx}`}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={14} style={{ color: 'var(--accent-primary)' }} />
                                <strong>{a.assignee}</strong>
                              </div>
                            </td>
                            <td><strong>{a.total}</strong></td>
                            <td style={{ color: '#10b981', fontWeight: 600 }}>{a.completed}</td>
                            <td style={{ color: a.overdue > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: a.overdue > 0 ? 600 : 400 }}>
                              {a.overdue}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${rate}%`, height: '100%', background: rate >= 75 ? '#10b981' : rate >= 40 ? '#3b82f6' : '#f59e0b' }} />
                                </div>
                                <span style={{ fontSize: '0.78rem' }}>{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive Action &amp; Performance Summary</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    ✅ Completed Execution
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{reportData?.completed ?? 0}</strong> tasks ({reportData?.completionRate ?? 0}%) have been resolved and closed successfully.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#ef4444', marginBottom: 4, fontSize: '0.82rem' }}>
                    ⚠️ SLA Backlog Attention
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{reportData?.overdue ?? 0}</strong> tasks require attention because their due dates have passed.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#6366f1', marginBottom: 4, fontSize: '0.82rem' }}>
                    📌 Active To-Do Queue
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{reportData?.pending ?? 0}</strong> upcoming milestones and prospect touches currently active.
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
                    placeholder="Search task title, rep, customer..."
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
                  <option value="completed">Completed</option>
                  <option value="pending">Pending / Active</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredTasks.length}</strong> of {tasks.length} live records
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
                    <th>Task Title</th>
                    <th>Activity Channel</th>
                    <th>Assigned Rep</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Related Record</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No task records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t: any) => (
                      <tr key={t.crmTaskId}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {t.title}
                          </strong>
                          {t.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.72rem' }}>
                            {t.activityTypeName || 'Task'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {t.assignedToName || 'Unassigned'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: t.isTerminal ? 'rgba(16,185,129,0.12)' : t.isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
                              color: t.isTerminal ? '#10b981' : t.isOverdue ? '#ef4444' : '#3b82f6',
                              fontSize: '0.72rem'
                            }}
                          >
                            {t.statusName || (t.isTerminal ? 'Completed' : 'Pending')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: t.isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td>
                          {t.customerName ? (
                            <span
                              onClick={() => navigate(`/customers/${t.customerId}`)}
                              style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              {t.customerName}
                            </span>
                          ) : t.opportunityTitle ? (
                            <span
                              onClick={() => navigate(`/opportunities/${t.opportunityId}`)}
                              style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              {t.opportunityTitle}
                            </span>
                          ) : t.leadName ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {t.leadName}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>General</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => navigate('/tasks')}
                            className="clean-back-btn"
                            style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                          >
                            Open <ExternalLink size={11} />
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
