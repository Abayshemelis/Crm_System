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
  ArrowUpRight
} from 'lucide-react';
import './cleanReports.css';

const PALETTE = ['#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#8b5cf6', '#06b6d4'];

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
  const completionRate = totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(1) : '0';

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
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .pdf-brand { font-size: 20px; font-weight: 800; color: #831843; margin: 0 0 4px 0; }
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
            background: #fdf2f8;
            border-left: 4px solid #ec4899;
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; TASK & ACTIVITY REPORT</h1>
              <p class="pdf-sub">Action Execution Rate, SLA Follow-ups & Activity Channels</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Period:</strong> ${dateRange}</div>
              <div><strong>Scope:</strong> ${scope.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Tasks Scheduled</div>
              <div class="pdf-stat-value">${totalTasks}</div>
              <div class="pdf-stat-sub">Activities in window</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Completed On-Time</div>
              <div class="pdf-stat-value" style="color: #10b981;">${completed}</div>
              <div class="pdf-stat-sub">${completionRate}% completion rate</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Pending / In Progress</div>
              <div class="pdf-stat-value" style="color: #3b82f6;">${stats?.pending ?? 0}</div>
              <div class="pdf-stat-sub">Active open tasks</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Overdue Tasks</div>
              <div class="pdf-stat-value" style="color: #ef4444;">${stats?.overdue ?? 0}</div>
              <div class="pdf-stat-sub">Past SLA deadline</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #831843; margin-bottom: 4px; text-transform: uppercase;">
              Executive Team Execution Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #701a75; line-height: 1.4;">
              <li><strong>Execution Rate:</strong> Team achieved a <strong>${completionRate}%</strong> task completion rate during this reporting cycle.</li>
              <li><strong>Overdue Backlog:</strong> <strong>${stats?.overdue ?? 0}</strong> tasks have exceeded their due dates. Reassign or clear backlog immediately.</li>
              <li><strong>Touchpoint Frequency:</strong> Maintain daily morning task triage to ensure prospect touchpoint consistency.</li>
            </ul>
          </div>

          ${tasks.length > 0 ? `
            <div class="pdf-section-title">Task Ledger Sample (${tasks.length} Total Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Task Title</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                ${tasks.slice(0, 50).map((t, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${t.title}</strong></td>
                    <td>${t.type || 'General'}</td>
                    <td>${t.priority || 'Medium'}</td>
                    <td>${t.status || 'Pending'}</td>
                    <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
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

export const TaskReportsScreen: React.FC = () => {
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

  const [actSummary, setActSummary] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (startDate) q.append('startDate', startDate);
      if (endDate)   q.append('endDate', endDate);
      q.append('scope', dataScope);

      const [summaryData, tasksData] = await Promise.all([
        api.get<any>(`/api/reports/activity-summary?${q.toString()}`),
        api.get<any>('/api/tasks')
      ]);

      setActSummary(summaryData);
      const list = Array.isArray(tasksData)
        ? tasksData
        : (Array.isArray(tasksData?.data) ? tasksData.data : (Array.isArray(tasksData?.items) ? tasksData.items : []));
      setTasks(list);
    } catch (err) {
      console.error('Failed to load task reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, dataScope]);

  const activityTypes = useMemo(() => actSummary?.byType ?? [], [actSummary]);

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter(t => {
      const matchesSearch =
        !searchTerm ||
        (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.type && t.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || (t.status || '').toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    if (!tasks || !tasks.length) {
      alert('No task records available to export.');
      return;
    }
    const headers = ['TaskId', 'Title', 'Type', 'Priority', 'Status', 'DueDate', 'CreatedAt'];
    const rows = tasks.map(t => [
      t.taskId,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.type || 'General'}"`,
      `"${t.priority || 'Medium'}"`,
      `"${t.status || 'Pending'}"`,
      `"${t.dueDate ? t.dueDate.slice(0, 10) : ''}"`,
      `"${t.createdAt ? t.createdAt.slice(0, 10) : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExportPDF = () => {
    exportTaskPDF(tasks, actSummary, activePreset, dataScope);
  };

  return (
    <Layout>
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/tasks')} className="clean-back-btn">
                <ArrowLeft size={15} /> All Tasks
              </button>
              <span className="clean-badge clean-badge-primary">
                Task Execution
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
              Tasks & Team Activity Execution Metrics
            </h1>
            <p className="clean-report-desc">
              Prospect interaction velocity, to-do completion compliance, and activity type distribution.
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
                    My Tasks
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
          {/* Total Tasks */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Activities</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(236,72,153,0.12)', color: '#ec4899' }}>
                <CheckSquare size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{actSummary?.total ?? tasks.length}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(236,72,153,0.14)', color: '#ec4899' }}>Scheduled</span>
              <span>All recorded tasks</span>
            </div>
          </div>

          {/* Completed */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Completed On-Time</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#10b981' }}>
              {actSummary?.completed ?? 0}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">
                <ArrowUpRight size={11} /> Done
              </span>
              <span>Executed touchpoints</span>
            </div>
          </div>

          {/* In Progress */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Pending / In Progress</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <Clock size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#3b82f6' }}>
              {actSummary?.pending ?? 0}
            </div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Active</span>
              <span>In flight</span>
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
              {actSummary?.overdue ?? 0}
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
            onClick={() => setActiveTab('overview')}
            className={`clean-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <BarChart3 size={15} /> Activity Channels & Execution Breakdown
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`clean-tab-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <TableIcon size={15} /> Task Directory Ledger ({tasks.length})
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="clean-card">
              <div className="clean-card-header">
                <div>
                  <h3 className="clean-card-title">Activity Breakdown by Channel / Type</h3>
                  <p className="clean-card-sub">Calls, emails, demos, and follow-up touchpoint distribution</p>
                </div>
              </div>
              <div style={{ height: 280, padding: '1rem' }}>
                {activityTypes.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    No activity type distribution recorded
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityTypes} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
                      <XAxis dataKey="type" stroke="var(--text-muted)" fontSize={11} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                      <Tooltip formatter={(val: any) => [`${val} Activities`, 'Count']} />
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

            {/* Strategic Insights */}
            <div className="clean-card">
              <div className="clean-card-header">
                <h3 className="clean-card-title">Executive Activity & Follow-Up Guidance</h3>
              </div>
              <div className="clean-guidance-grid">
                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#10b981', marginBottom: 4, fontSize: '0.82rem' }}>
                    ✅ Completed Velocity
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Your team executed <strong>{actSummary?.completed ?? 0}</strong> completed customer touchpoints.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#ef4444', marginBottom: 4, fontSize: '0.82rem' }}>
                    ⚠️ SLA Backlog
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong>{actSummary?.overdue ?? 0}</strong> tasks are overdue. Prioritize immediate backlog triage.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', color: '#ec4899', marginBottom: 4, fontSize: '0.82rem' }}>
                    📞 Outreach Multi-Channel
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Combine phone calls with email and scheduled product demos for 2x faster prospect engagement.
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
                    placeholder="Search task title, type, notes..."
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
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{filteredTasks.length}</strong> of {tasks.length} records
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
                    <th>Task Title</th>
                    <th>Activity Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No task records match your query
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map(t => (
                      <tr key={t.taskId}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {t.title}
                          </strong>
                        </td>
                        <td>
                          <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.72rem' }}>
                            {t.type || 'Task'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: t.priority === 'High' || t.priority === 'Urgent' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                              color: t.priority === 'High' || t.priority === 'Urgent' ? '#ef4444' : '#818cf8',
                              fontSize: '0.72rem'
                            }}
                          >
                            {t.priority || 'Medium'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: t.status === 'Completed' ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                              color: t.status === 'Completed' ? '#10b981' : '#3b82f6',
                              fontSize: '0.72rem'
                            }}
                          >
                            {t.status || 'Pending'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => navigate('/tasks')}
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
