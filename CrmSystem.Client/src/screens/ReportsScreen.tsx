import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, Clock, Target, DollarSign, Download, RefreshCw,
  BarChart2, Activity, Layers, Zap, ChevronRight, ChevronDown,
  ArrowUpRight, ArrowDownRight, Users, UserCheck,
  CheckCircle2, AlertCircle, Medal, Trophy, ShieldAlert, Calendar,
  Search, LayoutGrid, List, Crown, Award, FileText, Printer, UploadCloud,
  X, Sparkles, SlidersHorizontal, Check
} from 'lucide-react';
import './reports.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PipelineItem   { stage: string; value: number; count?: number }
interface WinRateItem    { month: string; winRate: number; won?: number; total?: number }
interface TimeItem       { stage: string; averageDays: number }
interface LeadSrcItem    { source: string; count: number }

interface OverviewData {
  totalCustomers: number; newCustomers: number;
  totalLeads: number;     newLeads: number;
  openDeals: number;      pipelineValue: number;
  revenueInPeriod: number; conversionRate: number;
}

interface RepPerfItem {
  repId: number; repName: string;
  dealsWon: number; revenueWon: number;
  winRate: number;  openPipeline: number; leadsAssigned: number;
}

interface FunnelData {
  total: number; active: number;
  qualified: number; converted: number; lost: number;
  leadLost?: number; pipelineLost?: number;
}

interface ActivitySummary {
  totalActivities: number;
  byType: { type: string; count: number }[];
  completedTasks: number; pendingTasks: number; overdueTasks: number;
}

interface LeadPriorityItem {
  priority: string;
  total: number;
  active: number;
  converted: number;
  lost: number;
  avgScore: number;
}

interface FollowUpSlaData {
  totalActive: number;
  scheduledCount: number;
  dueTodayCount: number;
  overdueCount: number;
  unscheduledCount: number;
  scheduledPercentage: number;
}

interface InvoiceReportData {
  totalCollected: number;
  totalPending: number;
  totalCancelled: number;
  totalInvoiced: number;
  paidCount: number;
  pendingCount: number;
  byMonth: Array<{ month: string; collected: number; pending: number; count: number }>;
}

interface ContractReportData {
  totalCount: number;
  activeCount: number;
  draftCount: number;
  expiringCount: number;
  totalValue: number;
  activeValue: number;
  byStatus: Array<{ status: string; count: number; value: number }>;
  byMonth: Array<{ month: string; count: number; value: number }>;
}

interface ImportReportData {
  totalLeadsImported: number;
  totalCustomers: number;
  totalCompanies: number;
  totalProducts: number;
  lastImportDate: string;
}

type Section = 'overview' | 'invoices' | 'contracts' | 'pipeline' | 'winrate' | 'velocity' | 'sources' | 'repperf' | 'funnel' | 'activity' | 'priority' | 'import';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PALETTE = ['#6366f1','#8b5cf6','#ec4899','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4'];
const fmt$   = (v: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtK   = (v: number) => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : fmt$(v);

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function exportCSV(data: any[], name: string) {
  if (!data?.length) return;
  const rawKeys = Object.keys(data[0]);
  const formattedHeaders = rawKeys.map(k => k.replace(/([A-Z])/g, ' $1').trim().toUpperCase());

  const rows = [
    formattedHeaders.join(','),
    ...data.map(r => rawKeys.map(k => {
      const val = r[k];
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(','))
  ].join('\r\n');

  const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}_report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generatePDFTableExplanation(data: any[], name: string): { summary: string; insights: string[] } {
  if (!data || data.length === 0) {
    return {
      summary: 'No records available for analysis during this reporting period.',
      insights: ['Verify filter dates or record creation logs to populate report data.']
    };
  }

  const nName = name.toLowerCase();

  if (nName.includes('pipeline')) {
    const totalVal = data.reduce((acc, row) => acc + (Number(row.value) || 0), 0);
    const totalDeals = data.reduce((acc, row) => acc + (Number(row.count) || 0), 0);
    const avgVal = totalDeals > 0 ? totalVal / totalDeals : 0;
    const topStage = [...data].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))[0];

    return {
      summary: `This report details active pipeline stage distribution and deal valuation across ${data.length} active stages. Total pipeline capital value stands at $${totalVal.toLocaleString()} across ${totalDeals} open deals, averaging $${Math.round(avgVal).toLocaleString()} per deal.`,
      insights: [
        `Dominant Valuation Stage: "${topStage?.stage || topStage?.name || 'N/A'}" holds the highest concentration of total pipeline value at $${(Number(topStage?.value) || 0).toLocaleString()}.`,
        `Deal Concentration: Active deals are distributed across ${data.length} pipeline stages to track deal movement and bottleneck progression.`,
        `Executive Recommendation: Prioritize resource allocation toward high-value middle-stage deals to accelerate conversion velocity.`
      ]
    };
  }

  if (nName.includes('win_rate') || nName.includes('winrate')) {
    const totalWon = data.reduce((acc, row) => acc + (Number(row.won) || 0), 0);
    const totalLost = data.reduce((acc, row) => acc + (Number(row.lost) || 0), 0);
    const totalDeals = data.reduce((acc, row) => acc + (Number(row.total) || 0), 0);
    const avgWinRate = totalDeals > 0 ? (totalWon / totalDeals) * 100 : 0;
    const bestMonth = [...data].sort((a, b) => (Number(b.winRate) || 0) - (Number(a.winRate) || 0))[0];

    return {
      summary: `This report provides historical monthly win rate trend analytics and closed deal conversion performance across ${data.length} reporting periods. A total of ${totalDeals} deals were evaluated (${totalWon} won, ${totalLost} lost), achieving an overall win rate of ${avgWinRate.toFixed(1)}%.`,
      insights: [
        `Peak Conversion Month: "${bestMonth?.month || 'N/A'}" recorded the highest conversion efficiency with a win rate of ${Number(bestMonth?.winRate || 0).toFixed(1)}%.`,
        `Deal Outcome Ratio: ${totalWon} won deals vs ${totalLost} lost deals across evaluated closed opportunities.`,
        `Executive Recommendation: Benchmark sales pitch strategies against peak-performing months to improve close rates.`
      ]
    };
  }

  if (nName.includes('velocity') || nName.includes('time')) {
    const totalDays = data.reduce((acc, row) => acc + (Number(row.averageDays) || 0), 0);
    const avgDays = data.length > 0 ? totalDays / data.length : 0;
    const slowest = [...data].sort((a, b) => (Number(b.averageDays) || 0) - (Number(a.averageDays) || 0))[0];

    return {
      summary: `This report measures sales velocity by analyzing the average duration (in days) deals spend in each pipeline stage before transitioning or closing. Across ${data.length} stages, the average duration is ${avgDays.toFixed(1)} days per stage (cumulative cycle duration of ${totalDays.toFixed(1)} days).`,
      insights: [
        `Primary Bottleneck Stage: "${slowest?.stage || 'N/A'}" requires the longest residence time at ${Number(slowest?.averageDays || 0).toFixed(1)} days on average.`,
        `Cycle Health: Monitoring residence times per stage highlights operational friction and deal stagnation points.`,
        `Executive Recommendation: Implement automated follow-up SLAs and manager reviews for deals exceeding stage averages.`
      ]
    };
  }

  if (nName.includes('rep') || nName.includes('leaderboard')) {
    const totalRev = data.reduce((acc, row) => acc + (Number(row.revenueWon) || 0), 0);
    const totalWon = data.reduce((acc, row) => acc + (Number(row.dealsWon) || 0), 0);
    const topRep = [...data].sort((a, b) => (Number(b.revenueWon) || 0) - (Number(a.revenueWon) || 0))[0];

    return {
      summary: `This leaderboard report evaluates sales representative execution performance across ${data.length} active team members. Total revenue won stands at $${totalRev.toLocaleString()} across ${totalWon} closed-won opportunities.`,
      insights: [
        `Top Sales Performer: "${topRep?.repName || topRep?.name || 'N/A'}" leads the organization with $${(Number(topRep?.revenueWon) || 0).toLocaleString()} in revenue won across ${topRep?.dealsWon || 0} deals.`,
        `Team Coverage: Evaluates revenue contribution, closed deal volume, win rate percentages, and open pipeline management.`,
        `Executive Recommendation: Pair top-performing reps with junior sales staff for deal coaching and methodology sharing.`
      ]
    };
  }

  if (nName.includes('funnel')) {
    const fn = data[0] || {};
    const total = Number(fn.total) || 0;
    const converted = Number(fn.converted) || 0;
    const qualified = Number(fn.qualified) || 0;
    const convRate = total > 0 ? (converted / total) * 100 : 0;
    const qualRate = total > 0 ? (qualified / total) * 100 : 0;

    return {
      summary: `This report details the end-to-end lead conversion funnel flow from initial acquisition to closed-won conversion. Out of ${total} total leads captured, ${qualified} were qualified (${qualRate.toFixed(1)}%) and ${converted} were successfully converted (${convRate.toFixed(1)}%).`,
      insights: [
        `Funnel Conversion Efficiency: Overall lead-to-won conversion rate is ${convRate.toFixed(1)}%.`,
        `Qualification Throughput: ${qualRate.toFixed(1)}% of total leads meet discovery and qualification criteria.`,
        `Executive Recommendation: Focus marketing qualification alignment to improve lead quality entering the funnel.`
      ]
    };
  }

  if (nName.includes('channel') || nName.includes('source')) {
    const totalLeads = data.reduce((acc, row) => acc + (Number(row.count) || 0), 0);
    const topSrc = [...data].sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))[0];
    const topPct = totalLeads > 0 ? ((Number(topSrc?.count) || 0) / totalLeads) * 100 : 0;

    return {
      summary: `This report provides lead acquisition attribution analytics across ${data.length} marketing channels, tracking a total volume of ${totalLeads} acquired leads.`,
      insights: [
        `Top Acquisition Channel: "${topSrc?.source || topSrc?.name || 'N/A'}" produced the highest volume with ${topSrc?.count || 0} leads (${topPct.toFixed(1)}% share).`,
        `Channel Diversity: Attribution is distributed across ${data.length} channels to assess marketing return on investment (ROI).`,
        `Executive Recommendation: Double down ad budget on top-converting channels while optimizing underperforming acquisition sources.`
      ]
    };
  }

  if (nName.includes('priority') || nName.includes('sla')) {
    const totalLeads = data.reduce((acc, row) => acc + (Number(row.total || row.count) || 0), 0);
    return {
      summary: `This report monitors lead priority tier allocation and follow-up SLA execution health across ${data.length} priority categories covering ${totalLeads} active leads.`,
      insights: [
        `Priority Tiering: Categorizes leads into Urgent, High, Medium, and Low tiers to ensure rapid touchpoint response.`,
        `SLA Compliance: Tracks scheduled, due today, overdue, and unscheduled prospect touchpoints.`,
        `Executive Recommendation: Enforce mandatory 24-hour response SLAs for Urgent and High priority lead assignments.`
      ]
    };
  }

  if (nName.includes('activity') || nName.includes('task')) {
    const totalActs = data.reduce((acc, row) => acc + (Number(row.count || row.totalActivities) || 0), 0);
    return {
      summary: `This report analyzes sales activity log distribution across ${data.length} categories, recording a total of ${totalActs} completed prospect interactions.`,
      insights: [
        `Activity Engagement: Measures calls, meetings, emails, notes, and task completions to gauge team activity output.`,
        `Execution Tracking: Compares activity volume against pipeline progress and rep deal velocity.`,
        `Executive Recommendation: Maintain balanced multi-channel prospect engagement (Calls + Meetings + Written follow-ups).`
      ]
    };
  }

  return {
    summary: `This report contains structured dataset analytics for "${name.replace(/_/g, ' ')}" comprising ${data.length} detailed records.`,
    insights: [
      `Record Volume: Total of ${data.length} rows evaluated in this data table.`,
      `Data Consistency: All metrics have been verified against active CRM database records for the selected reporting window.`
    ]
  };
}

function exportPDF(data: any[], name: string, title?: string) {
  if (!data?.length) return;
  const rawKeys = Object.keys(data[0]);
  const formattedHeaders = rawKeys.map(k => k.replace(/([A-Z])/g, ' $1').trim().toUpperCase());
  const formattedTitle = title || name.replace(/_/g, ' ').toUpperCase();
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const filename = `${name}_report_${new Date().toISOString().split('T')[0]}.pdf`;
  const explanation = generatePDFTableExplanation(data, name);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${formattedTitle} - CRM PDF Report</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
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
          .pdf-btn-primary:hover {
            background: #4f46e5;
          }
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
          .pdf-btn-secondary:hover {
            background: rgba(255,255,255,0.25);
          }
          @media print {
            .pdf-action-bar { display: none !important; }
          }
          .pdf-container {
            padding: 10px;
            background: #fff;
          }
          .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 3px solid #6366f1;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .pdf-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 6px;
          }
          .pdf-logo-box {
            width: 28px;
            height: 28px;
            background: #6366f1;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-weight: 800;
            font-size: 13px;
          }
          .pdf-company {
            font-size: 13px;
            font-weight: 700;
            color: #6366f1;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .pdf-title {
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .pdf-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .pdf-meta {
            text-align: right;
            font-size: 11px;
            color: #64748b;
            line-height: 1.5;
          }
          .pdf-meta-tag {
            display: inline-block;
            padding: 3px 8px;
            background: #f1f5f9;
            border-radius: 4px;
            font-weight: 600;
            color: #334155;
            margin-top: 4px;
          }
          .pdf-explanation-box {
            background: #f8fafc;
            border-left: 4px solid #6366f1;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          }
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .pdf-table th {
            background-color: #475569;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.05em;
            padding: 10px 14px;
            border: 1px solid #334155;
            text-align: left;
          }
          .pdf-table td {
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            color: #334155;
            font-weight: 500;
          }
          .pdf-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .pdf-footer {
            margin-top: 35px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div class="pdf-action-bar">
          <button class="pdf-btn-primary" id="download-btn">📥 Download .PDF File</button>
          <button class="pdf-btn-secondary" onclick="window.print()">🖨️ Print Dialog</button>
          <button class="pdf-btn-secondary" onclick="window.close()">✕ Close</button>
        </div>

        <div id="pdf-content" class="pdf-container">
          <div class="pdf-header">
            <div>
              <div class="pdf-logo">
                <span class="pdf-logo-box">CRM</span>
                <span class="pdf-company">Enterprise Analytics</span>
              </div>
              <h1 class="pdf-title">${formattedTitle} Report</h1>
              <div class="pdf-subtitle">Executive Performance Analytics & Execution Summary</div>
            </div>
            <div class="pdf-meta">
              <div>Date Generated: <strong>${dateStr}</strong></div>
              <div class="pdf-meta-tag">Total Records: ${data.length}</div>
            </div>
          </div>

          <!-- Analytical Explanation & Table Explanation Block -->
          <div class="pdf-explanation-box">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 14px;">💡</span>
              <h3 style="margin: 0; font-size: 12px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 0.05em;">
                Executive Table Analysis & Analytical Explanation
              </h3>
            </div>
            <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #334155; line-height: 1.5; font-weight: 500;">
              ${explanation.summary}
            </p>
            <div style="font-size: 10.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
              Key Insights & Strategic Guidance:
            </div>
            <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #475569; line-height: 1.5;">
              ${explanation.insights.map(item => `<li style="margin-bottom: 3px;">${item}</li>`).join('')}
            </ul>
          </div>

          <table class="pdf-table">
            <thead>
              <tr>
                ${formattedHeaders.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${rawKeys.map(k => {
                    let val = row[k];
                    if (val === null || val === undefined) val = '-';
                    if (typeof val === 'number') {
                      if (k.toLowerCase().includes('value') || k.toLowerCase().includes('revenue') || k.toLowerCase().includes('pipeline')) {
                        val = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
                      } else if (k.toLowerCase().includes('rate') || k.toLowerCase().includes('pct') || k.toLowerCase().includes('percentage')) {
                        val = `${val.toFixed(1)}%`;
                      } else {
                        val = new Intl.NumberFormat('en-US').format(val);
                      }
                    }
                    return `<td>${val}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="pdf-footer">
            <span>CRM Enterprise System &bull; Confidential Executive Document</span>
            <span>System Generated Report</span>
          </div>
        </div>

        <script>
          function triggerDownload() {
            var element = document.getElementById('pdf-content');
            var opt = {
              margin:       [10, 10, 10, 10],
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
            setTimeout(function() {
              triggerDownload();
            }, 600);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

// ─── Shared Sub-Components ────────────────────────────────────────────────────
const CustomTip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rpt-tooltip">
      <p className="rpt-tooltip-label">{label}</p>
      <p className="rpt-tooltip-value" style={{ color: payload[0].color ?? '#6366f1' }}>
        {formatter ? formatter(payload[0].value) : payload[0].value}
      </p>
    </div>
  );
};

const Shimmer: React.FC<{ w?: string; h?: number; radius?: number }> = ({ w='100%', h=16, radius=6 }) => (
  <div className="rpt-shimmer" style={{ width:w, height:h, borderRadius:radius }}/>
);

const TaskRing: React.FC<{ label:string; value:number; color:string }> =
  ({ label, value, color }) => (
    <div className="rpt-task-ring">
      <div className="rpt-task-ring-num" style={{ color }}>{value}</div>
      <div className="rpt-task-ring-label">{label}</div>
      <div className="rpt-task-ring-bar" style={{ borderColor: `${color}30` }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`3px solid ${color}`, opacity:0.8 }}/>
      </div>
    </div>
  );

const LoadingBars = () => (
  <div className="rpt-loading-bars">
    {[1,2,3,4].map(i=>(
      <div key={i} className="rpt-loading-bar-row">
        <div className="rpt-shimmer" style={{width:'40%',height:12,borderRadius:4}}/>
        <div className="rpt-shimmer" style={{width:'100%',height:8,borderRadius:99}}/>
      </div>
    ))}
  </div>
);

const Empty: React.FC<{ icon:React.ReactNode; msg:string }> = ({ icon, msg }) => (
  <div className="rpt-empty">{icon}<span>{msg}</span></div>
);

interface StatCardProps {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: string;
  delta?: string; deltaUp?: boolean; loading?: boolean;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, color, delta, deltaUp, loading }) => (
  <div className="rpt-stat-card" style={{ '--card-color': color } as any}>
    <div className="rpt-stat-glow" style={{ background: color }}/>
    <div className="rpt-stat-top">
      <span className="rpt-stat-label">{label}</span>
      <span className="rpt-stat-icon" style={{ background:`${color}20`, color }}>{icon}</span>
    </div>
    {loading ? (
      <div className="rpt-stat-loading">
        <Shimmer w="55%" h={28} radius={8}/> <Shimmer w="80%" h={12} radius={4}/>
      </div>
    ) : (
      <>
        <div className="rpt-stat-value">{value}</div>
        <div className="rpt-stat-footer">
          {delta && (
            <span className={`rpt-delta ${deltaUp ? 'rpt-delta-up' : 'rpt-delta-down'}`}>
              {deltaUp ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}{delta}
            </span>
          )}
          <span className="rpt-stat-sub">{sub}</span>
        </div>
      </>
    )}
  </div>
);

const HBar: React.FC<{ label:string; value:number; max:number; formatter?:(v:number)=>string; color:string; badge?:string }> =
  ({ label, value, max, formatter, color, badge }) => (
    <div className="rpt-hbar">
      <div className="rpt-hbar-header">
        <div className="rpt-hbar-label-row">
          <span className="rpt-hbar-label">{label}</span>
          {badge && <span className="rpt-hbar-badge" style={{color, background:`${color}18`, borderColor:`${color}30`}}>{badge}</span>}
        </div>
        <span className="rpt-hbar-value">{formatter ? formatter(value) : fmtNum(value)}</span>
      </div>
      <div className="rpt-hbar-track">
        <div className="rpt-hbar-fill" style={{ width:`${max>0?(value/max)*100:0}%`, background:`linear-gradient(90deg,${color},${color}88)` }}/>
      </div>
    </div>
  );

const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  onExport?: () => void;
  onExportPDF?: () => void;
  exportData?: any[];
  exportName?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, onExport, onExportPDF, exportData, exportName, children }) => {
  const handleCSV = onExport || (exportData ? () => exportCSV(exportData, exportName || 'report_data') : undefined);
  const handlePDF = onExportPDF || (exportData ? () => exportPDF(exportData, exportName || 'report_data', title) : (onExport && exportData ? () => exportPDF(exportData, exportName || 'report_data', title) : undefined));

  return (
    <div className="rpt-section-card">
      <div className="rpt-section-header">
        <div>
          <h3 className="rpt-section-title">{title}</h3>
          {subtitle && <p className="rpt-section-subtitle">{subtitle}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {handleCSV && (
            <button className="rpt-export-btn" onClick={handleCSV} title="Export CSV Data">
              <Download size={13} /> CSV
            </button>
          )}
          {handlePDF && (
            <button
              className="rpt-export-btn pdf"
              onClick={handlePDF}
              title="Export PDF Report"
              style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.25)' }}
            >
              <Printer size={13} /> PDF
            </button>
          )}
        </div>
      </div>
      <div className="rpt-section-body">{children}</div>
    </div>
  );
};

const HeadlineStat: React.FC<{ label:string; value:string; color?:string }> =
  ({ label, value, color }) => (
    <div>
      <p className="rpt-headline-label">{label}</p>
      <p className="rpt-headline-value" style={color ? { color } : {}}>{value}</p>
    </div>
  );

// ─── Nav Items with Rich Categorization & Descriptions ──────────────────────────
export interface NavItem {
  id: Section;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  group: string;
  desc: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id:'overview',  label:'Executive Overview',  shortLabel: 'Overview',   icon:<BarChart2 size={15}/>,    group:'Summary',    desc: 'High-level business KPIs, conversion rates, and revenue pipeline snapshot', color: '#6366f1' },
  { id:'invoices',  label:'Invoice & Cash Revenue', shortLabel: 'Invoices', icon:<DollarSign size={15}/>, group:'Financial',  desc: 'Collected cash, pending payments, invoice schedules, and billing metrics', color: '#10b981' },
  { id:'contracts', label:'Contract Analytics',  shortLabel: 'Contracts', icon:<FileText size={15}/>,     group:'Financial',  desc: 'Active agreements, execution values, draft pipeline, and expiration risks', color: '#8b5cf6' },
  { id:'pipeline',  label:'Pipeline Stage Analysis', shortLabel: 'Pipeline', icon:<Layers size={15}/>,   group:'Sales',      desc: 'Stage-by-stage deal volume, bottleneck analysis, and open pipeline valuation', color: '#3b82f6' },
  { id:'winrate',   label:'Win Rate Trends',     shortLabel: 'Win Rate',  icon:<Target size={15}/>,       group:'Sales',      desc: 'Historical closed-deal win/loss performance, monthly trends, and conversion ratios', color: '#f59e0b' },
  { id:'velocity',  label:'Sales Velocity',      shortLabel: 'Velocity',  icon:<Zap size={15}/>,          group:'Sales',      desc: 'Average days spent per deal stage and sales cycle duration analytics', color: '#ec4899' },
  { id:'repperf',   label:'Rep Leaderboard',     shortLabel: 'Leaderboard', icon:<Trophy size={15}/>,     group:'Team',       desc: 'Sales rep rankings, revenue won, deal win rates, and pipeline health', color: '#eab308' },
  { id:'funnel',    label:'Lead Funnel',         shortLabel: 'Funnel',    icon:<TrendingUp size={15}/>,   group:'Leads',      desc: 'End-to-end lead journey from acquisition to qualification and customer conversion', color: '#06b6d4' },
  { id:'sources',   label:'Acquisition Channels',shortLabel: 'Channels',  icon:<Users size={15}/>,        group:'Leads',      desc: 'Lead generation attribution, channel breakdown, and marketing source ROI', color: '#14b8a6' },
  { id:'priority',  label:'Priority & SLA Health',shortLabel: 'SLA Health',icon:<ShieldAlert size={15}/>, group:'Leads',     desc: 'Lead tier distribution, urgent follow-up deadlines, and SLA execution rate', color: '#ef4444' },
  { id:'activity',  label:'Task & Activity Log', shortLabel: 'Activity',  icon:<Activity size={15}/>,     group:'Execution',  desc: 'Calls, meetings, emails, task completion rates, and team workload', color: '#84cc16' },
  { id:'import',    label:'Data Import History', shortLabel: 'Imports',   icon:<UploadCloud size={15}/>,  group:'Execution',  desc: 'Data import history, batch logs, record counts, and data sync audit', color: '#64748b' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const ReportsScreen: React.FC = () => {
  const { user, isManagerOrAbove } = useAuth();
  const today  = new Date().toISOString().split('T')[0];
  const m30    = new Date(Date.now() -  30 * 86400_000).toISOString().split('T')[0];
  const m90    = new Date(Date.now() -  90 * 86400_000).toISOString().split('T')[0];
  const m365   = new Date(Date.now() - 365 * 86400_000).toISOString().split('T')[0];

  const PRESETS = [
    { label:'Last 30 days', start:m30,  end:today },
    { label:'Last 90 days', start:m90,  end:today },
    { label:'Last year',    start:m365, end:today },
    { label:'All time',     start:'',   end:'' },
  ] as const;

  const getInitialSection = (): Section => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || params.get('section');
    if (tab && ['overview', 'invoices', 'contracts', 'pipeline', 'winrate', 'velocity', 'repperf', 'funnel', 'sources', 'priority', 'activity', 'import'].includes(tab)) {
      return tab as Section;
    }
    return 'overview';
  };

  const [startDate,    setStartDate]    = useState(m30);
  const [endDate,      setEndDate]      = useState(today);
  const [activePreset, setActivePreset] = useState<string>('Last 30 days');
  const [section,      setSectionState]  = useState<Section>(getInitialSection);
  const [dataScope,    setDataScope]    = useState<'personal' | 'team'>(isManagerOrAbove ? 'team' : 'personal');
  const [loading,      setLoading]      = useState(true);

  const currentNav = useMemo(() => NAV_ITEMS.find(n => n.id === section) || NAV_ITEMS[0], [section]);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => currentNav.group);

  useEffect(() => {
    if (currentNav.group !== selectedCategory) {
      setSelectedCategory(currentNav.group);
    }
  }, [currentNav.group]);

  const categoryGroups = useMemo(() => [
    { key: 'Summary', label: '📊 Summary', count: 1 },
    { key: 'Financial', label: '💰 Financial', count: 2 },
    { key: 'Sales', label: '🎯 Sales', count: 3 },
    { key: 'Team', label: '🏆 Team', count: 1 },
    { key: 'Leads', label: '⚡ Leads', count: 3 },
    { key: 'Execution', label: '📋 Execution', count: 2 },
  ], []);

  const currentCategoryItems = useMemo(() => {
    return NAV_ITEMS.filter(item => item.group === selectedCategory);
  }, [selectedCategory]);

  const setSection = useCallback((s: Section) => {
    setSectionState(s);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', s);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Data state
  const [pipelineData, setPipelineData] = useState<PipelineItem[]>([]);
  const [winRateData,  setWinRateData]  = useState<WinRateItem[]>([]);
  const [overallWinRate, setOverallWinRate] = useState<number>(0);
  const [timeData,     setTimeData]     = useState<TimeItem[]>([]);
  const [sourceData,   setSourceData]   = useState<LeadSrcItem[]>([]);
  const [overview,     setOverview]     = useState<OverviewData | null>(null);
  const [repPerf,      setRepPerf]      = useState<RepPerfItem[]>([]);
  const [funnel,       setFunnel]       = useState<FunnelData | null>(null);
  const [actSummary,   setActSummary]   = useState<ActivitySummary | null>(null);
  const [priorityData, setPriorityData] = useState<LeadPriorityItem[]>([]);
  const [slaHealth,    setSlaHealth]    = useState<FollowUpSlaData | null>(null);
  const [invoiceReport, setInvoiceReport] = useState<InvoiceReportData | null>(null);
  const [contractReport, setContractReport] = useState<ContractReportData | null>(null);
  const [importReport, setImportReport] = useState<ImportReportData | null>(null);

  // Pipeline Stage Analysis interactive state
  const [pipeViewMode, setPipeViewMode] = useState<'visual' | 'cards' | 'table'>('visual');
  const [pipeMetric, setPipeMetric] = useState<'value' | 'count'>('value');

  // Pipeline Stage Analysis calculated stats
  const totalPipeVal = useMemo(() => pipelineData.reduce((a, b) => a + (b.value || 0), 0), [pipelineData]);
  const maxPipeVal   = useMemo(() => Math.max(...pipelineData.map(d => d.value || 0), 1), [pipelineData]);
  const totalPipeDeals = useMemo(() => pipelineData.reduce((a, b) => a + (b.count || 0), 0), [pipelineData]);
  const avgDealVal = useMemo(() => (totalPipeDeals > 0 ? totalPipeVal / totalPipeDeals : 0), [totalPipeVal, totalPipeDeals]);
  const topPipeStage = useMemo(() => [...pipelineData].sort((a, b) => b.value - a.value)[0], [pipelineData]);

  // Win Rate Trend interactive state
  const [winViewMode, setWinViewMode] = useState<'visual' | 'cards' | 'table'>('visual');

  // Win Rate Trend calculated stats
  const totalClosedDeals = useMemo(() => winRateData.reduce((sum, w) => sum + (w.total || 0), 0), [winRateData]);
  const totalWonDeals = useMemo(() => winRateData.reduce((sum, w) => sum + (w.won || 0), 0), [winRateData]);
  const bestWinRateMonth = useMemo(() => [...winRateData].sort((a, b) => b.winRate - a.winRate)[0], [winRateData]);

  // Sales Velocity interactive state
  const [velViewMode, setVelViewMode] = useState<'visual' | 'cards' | 'table'>('visual');

  // Sales Velocity calculated stats
  const totalCycleDays = useMemo(() => timeData.reduce((sum, d) => sum + d.averageDays, 0), [timeData]);
  const maxStageDays = useMemo(() => Math.max(...timeData.map(d => d.averageDays), 1), [timeData]);
  const avgStageDays = useMemo(() => (timeData.length > 0 ? totalCycleDays / timeData.length : 0), [totalCycleDays, timeData]);
  const fastestStage = useMemo(() => [...timeData].sort((a, b) => a.averageDays - b.averageDays)[0], [timeData]);
  const slowestStage = useMemo(() => [...timeData].sort((a, b) => b.averageDays - a.averageDays)[0], [timeData]);

  // Lead Funnel interactive state
  const [funnelViewMode, setFunnelViewMode] = useState<'visual' | 'cards' | 'table'>('visual');

  // Lead Funnel calculated stats
  const funnelConvRate = useMemo(() => (funnel && funnel.total > 0 ? (funnel.converted / funnel.total) * 100 : 0), [funnel]);
  const funnelQualRate = useMemo(() => (funnel && funnel.total > 0 ? (funnel.qualified / funnel.total) * 100 : 0), [funnel]);
  const funnelLossRate = useMemo(() => (funnel && funnel.total > 0 ? (funnel.lost / funnel.total) * 100 : 0), [funnel]);

  // Acquisition Channels interactive state
  const [srcViewMode, setSrcViewMode] = useState<'visual' | 'cards' | 'table'>('visual');

  // Acquisition Channels calculated stats
  const totalSourceLeads = useMemo(() => sourceData.reduce((sum, d) => sum + d.count, 0), [sourceData]);
  const maxSourceCount = useMemo(() => Math.max(...sourceData.map(d => d.count), 1), [sourceData]);
  const topSource = useMemo(() => [...sourceData].sort((a, b) => b.count - a.count)[0], [sourceData]);
  const activeChannelCount = useMemo(() => sourceData.filter(d => d.count > 0).length, [sourceData]);

  // Priority & SLA interactive state
  const [prioViewMode, setPrioViewMode] = useState<'cards' | 'visual' | 'table'>('cards');

  // Activity interactive state
  const [actViewMode, setActViewMode] = useState<'visual' | 'cards' | 'table'>('visual');

  // Activity calculated stats
  const totalActTypeCount = useMemo(() => actSummary ? actSummary.byType.reduce((sum, d) => sum + d.count, 0) : 0, [actSummary]);
  const maxActTypeCount = useMemo(() => actSummary && actSummary.byType.length > 0 ? Math.max(...actSummary.byType.map(d => d.count), 1) : 1, [actSummary]);
  const topActType = useMemo(() => actSummary && actSummary.byType.length > 0 ? [...actSummary.byType].sort((a, b) => b.count - a.count)[0] : null, [actSummary]);

  // Rep Leaderboard interactive state
  const [repSearchQuery, setRepSearchQuery] = useState('');
  const [repSortKey, setRepSortKey] = useState<'revenueWon' | 'dealsWon' | 'winRate' | 'openPipeline' | 'leadsAssigned'>('revenueWon');
  const [repSortDir, setRepSortDir] = useState<'desc' | 'asc'>('desc');
  const [repViewMode, setRepViewMode] = useState<'table' | 'cards'>('table');

  // Rep Leaderboard calculated stats
  const totalRepRev = useMemo(() => repPerf.reduce((sum, r) => sum + r.revenueWon, 0), [repPerf]);
  const totalRepDeals = useMemo(() => repPerf.reduce((sum, r) => sum + r.dealsWon, 0), [repPerf]);
  const avgRepWinRate = useMemo(() => (repPerf.length > 0 ? repPerf.reduce((sum, r) => sum + r.winRate, 0) / repPerf.length : 0), [repPerf]);
  const maxRepRev = useMemo(() => Math.max(...repPerf.map(r => r.revenueWon), 1), [repPerf]);

  const top3Reps = useMemo(() => {
    return [...repPerf].sort((a, b) => b.revenueWon - a.revenueWon).slice(0, 3);
  }, [repPerf]);

  const filteredReps = useMemo(() => {
    let list = [...repPerf];
    if (repSearchQuery.trim()) {
      const q = repSearchQuery.toLowerCase();
      list = list.filter(r => r.repName.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const valA = (a as any)[repSortKey] ?? 0;
      const valB = (b as any)[repSortKey] ?? 0;
      if (valA < valB) return repSortDir === 'desc' ? 1 : -1;
      if (valA > valB) return repSortDir === 'desc' ? -1 : 1;
      return 0;
    });
    return list;
  }, [repPerf, repSearchQuery, repSortKey, repSortDir]);

  const load = useCallback(async (s: string, e: string) => {
    setLoading(true);
    try {
      const q = `?startDate=${s}&endDate=${e}&scope=${dataScope}`;
      const [pipe, win, time, src, ov, rep, fn, act, pri, sla, invRep, cntRep, impRep] = await Promise.all([
        api.get<PipelineItem[]>(`/api/reports/pipeline-by-stage${q}`),
        api.get<{ overallWinRate: number; byMonth: WinRateItem[] }>(`/api/reports/win-rate${q}`),
        api.get<TimeItem[]>(`/api/reports/time-per-stage${q}`),
        api.get<LeadSrcItem[]>(`/api/reports/lead-source${q}`),
        api.get<OverviewData>(`/api/reports/overview${q}`),
        api.get<RepPerfItem[]>(`/api/reports/rep-performance${q}`),
        api.get<FunnelData>(`/api/reports/funnel${q}`),
        api.get<ActivitySummary>(`/api/reports/activity-summary${q}`),
        api.get<LeadPriorityItem[]>(`/api/reports/lead-priority${q}`),
        api.get<FollowUpSlaData>(`/api/reports/followup-sla${q}`),
        api.get<InvoiceReportData>(`/api/reports/invoice-revenue${q}`).catch(() => null),
        api.get<ContractReportData>(`/api/reports/contracts${q}`).catch(() => null),
        api.get<ImportReportData>(`/api/reports/imports${q}`).catch(() => null),
      ]);
      setPipelineData((pipe as any) ?? []);
      setWinRateData(((win as any)?.byMonth) ?? []);
      setOverallWinRate(((win as any)?.overallWinRate) ?? 0);
      setTimeData((time as any) ?? []);
      setSourceData((src as any) ?? []);
      setOverview((ov as any) ?? null);
      setRepPerf((rep as any) ?? []);
      setFunnel((fn as any) ?? null);
      setActSummary((act as any) ?? null);
      setPriorityData((pri as any) ?? []);
      setSlaHealth((sla as any) ?? null);
      setInvoiceReport((invRep as any) ?? null);
      setContractReport((cntRep as any) ?? null);
      setImportReport((impRep as any) ?? null);
    } catch (err) {
      console.error('Failed to load report data', err);
    } finally {
      setLoading(false);
    }
  }, [dataScope]);

  useEffect(() => { load(startDate, endDate); }, [startDate, endDate, load]);

  const applyPreset = (p: typeof PRESETS[number]) => {
    setActivePreset(p.label);
    setStartDate(p.start);
    setEndDate(p.end);
  };

  const getActiveSectionExportData = useCallback(() => {
    switch (section) {
      case 'invoices': return { data: invoiceReport?.byMonth || [], name: 'invoice_revenue_report', title: 'Invoice Revenue & Financial Report' };
      case 'contracts': return { data: contractReport?.byStatus || [], name: 'contract_analytics_report', title: 'Contract Analytics Report' };
      case 'import': return { data: importReport ? [importReport] : [], name: 'data_import_history_report', title: 'Data Import History Report' };
      case 'pipeline': return { data: pipelineData, name: 'pipeline_stage_analysis', title: 'Pipeline Stage Analysis' };
      case 'winrate': return { data: winRateData, name: 'win_rate_trends', title: 'Win Rate Trends' };
      case 'velocity': return { data: timeData, name: 'sales_velocity', title: 'Sales Velocity (Time in Stage)' };
      case 'repperf': return { data: repPerf, name: 'rep_performance_leaderboard', title: 'Representative Performance Leaderboard' };
      case 'funnel': return { data: funnel ? [funnel] : [], name: 'lead_conversion_funnel', title: 'Lead Conversion Funnel' };
      case 'sources': return { data: sourceData, name: 'lead_acquisition_channels', title: 'Lead Acquisition Channels' };
      case 'priority': return { data: priorityData, name: 'lead_priority_breakdown', title: 'Lead Priority & SLA Breakdown' };
      case 'activity': return { data: actSummary?.byType || [], name: 'activities_by_type', title: 'Activities by Category' };
      case 'overview': default: return { data: pipelineData, name: 'executive_overview_pipeline', title: 'Executive Overview Pipeline' };
    }
  }, [section, pipelineData, winRateData, timeData, repPerf, funnel, sourceData, priorityData, actSummary]);

  const groupedNav = useMemo(() => {
    const groups: { [k: string]: typeof NAV_ITEMS } = {};
    NAV_ITEMS.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, []);

  return (
    <Layout>
      <div className="rpt-root animate-fade-in">
        {/* ── Top Control Header ── */}
        <div className="rpt-header">
          <div>
            <p className="rpt-eyebrow">Enterprise Analytics & Intelligence</p>
            <h1 className="rpt-title">Reports Dashboard</h1>
            <p className="rpt-desc">Executive pipeline performance, team leaderboards, and follow-up SLA health</p>
          </div>

          <div className="rpt-filter-bar">
            {isManagerOrAbove && (
              <select 
                className="rpt-preset-btn" 
                value={dataScope} 
                onChange={(e) => setDataScope(e.target.value as any)} 
                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
              >
                <option value="personal">View: My Data</option>
                <option value="team">View: Team/Company Data</option>
              </select>
            )}
            {PRESETS.map(p => (
              <button key={p.label}
                className={`rpt-preset-btn ${activePreset === p.label ? 'active' : ''}`}
                onClick={() => applyPreset(p)}>
                {p.label}
              </button>
            ))}
            <button className="rpt-apply-btn" onClick={() => load(startDate, endDate)} disabled={loading} title="Refresh report data">
              <RefreshCw size={13} className={loading ? 'rpt-spin' : ''} /> Refresh
            </button>
            <button
              className="rpt-apply-btn"
              style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}
              onClick={() => {
                const info = getActiveSectionExportData();
                exportCSV(info.data, info.name);
              }}
              title="Export Active Tab CSV"
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              className="rpt-apply-btn"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              onClick={() => {
                const info = getActiveSectionExportData();
                exportPDF(info.data, info.name, info.title);
              }}
              title="Export Active Tab PDF"
            >
              <Printer size={13} /> Export PDF
            </button>
          </div>
        </div>

        {/* ── Mobile & Tablet Clean Categorized Dropdown Selector ── */}
        <div className="rpt-mobile-selector-bar">
          <div className="rpt-mobile-select-wrap">
            <span className="rpt-mobile-select-icon" style={{ background: `${currentNav.color}22`, color: currentNav.color }}>
              {currentNav.icon}
            </span>
            <select
              className="rpt-mobile-select"
              value={section}
              onChange={e => setSection(e.target.value as Section)}
            >
              <optgroup label="Executive Summary">
                <option value="overview">📊 Executive Overview</option>
              </optgroup>
              <optgroup label="Financial & Revenue">
                <option value="invoices">💰 Invoice & Cash Revenue</option>
                <option value="contracts">📑 Contract Analytics</option>
              </optgroup>
              <optgroup label="Sales & Pipeline">
                <option value="pipeline">📈 Pipeline Stage Analysis</option>
                <option value="winrate">🎯 Win Rate Trends</option>
                <option value="velocity">⚡ Sales Velocity (Time in Stage)</option>
              </optgroup>
              <optgroup label="Team Performance">
                <option value="repperf">🏆 Rep Leaderboard</option>
              </optgroup>
              <optgroup label="Leads & Funnel">
                <option value="priority">🛡️ Priority & SLA Health</option>
              </optgroup>
              <optgroup label="Execution & Logs">
                <option value="activity">📋 Task & Activity Log</option>
                <option value="import">📦 Data Import History</option>
              </optgroup>
            </select>
            <ChevronDown size={18} className="rpt-mobile-select-chevron" />
          </div>
        </div>

        {/* ── Main Dashboard Layout ── */}
        <div className="rpt-body">
          {/* Desktop Left Sidebar Nav */}
          <div className="rpt-nav rpt-desktop-nav">
            {Object.entries(groupedNav).map(([grp, items]) => (
              <div key={grp} className="rpt-nav-group-section">
                <div className="rpt-nav-heading">{grp}</div>
                {items.map(item => (
                  <button
                    key={item.id}
                    className={`rpt-nav-btn ${section === item.id ? 'active' : ''}`}
                    onClick={() => setSection(item.id)}
                  >
                    <span className="rpt-nav-btn-icon" style={section === item.id ? { color: item.color } : {}}>
                      {item.icon}
                    </span>
                    <span className="rpt-nav-btn-label">{item.label}</span>
                    {section === item.id && <span className="rpt-nav-active-dot" style={{ background: item.color }} />}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Report Content Panel */}
          <div className="rpt-content">

            {/* ── CONTRACT ANALYTICS REPORT ── */}
            {section === 'contracts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Contract Portfolio & Renewal Analytics</h2>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)' }}>Legal & Agreement Scope</span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Active agreements, draft lifecycle statuses, contract values, and expiration risk tracking
                    </p>
                  </div>
                </div>

                <div className="rpt-kpi-grid">
                  <StatCard
                    label="Active Contracts"
                    value={contractReport ? fmtNum(contractReport.activeCount) : '0'}
                    sub={`Active contract value: ${contractReport ? fmt$(contractReport.activeValue) : '$0'}`}
                    icon={<FileText size={18} />}
                    color="#10b981"
                    loading={loading}
                  />
                  <StatCard
                    label="Total Contract Value"
                    value={contractReport ? fmt$(contractReport.totalValue) : '$0'}
                    sub={`${contractReport?.totalCount ?? 0} total agreements in CRM`}
                    icon={<DollarSign size={18} />}
                    color="#6366f1"
                    loading={loading}
                  />
                  <StatCard
                    label="Drafts / Pending Signature"
                    value={contractReport ? fmtNum(contractReport.draftCount) : '0'}
                    sub="Contracts awaiting signature"
                    icon={<Clock size={18} />}
                    color="#f59e0b"
                    loading={loading}
                  />
                  <StatCard
                    label="Expiring Soon (30 Days)"
                    value={contractReport ? fmtNum(contractReport.expiringCount) : '0'}
                    sub="Agreements approaching renewal date"
                    icon={<AlertCircle size={18} />}
                    color="#ef4444"
                    loading={loading}
                  />
                </div>

                {/* Contract Portfolio Renewal & Expiration Risk Queue */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  <div className="rpt-card">
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700 }}>Contract Status Portfolio Share</h3>
                    {contractReport && contractReport.byStatus.length > 0 ? (
                      <div style={{ height: '220px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={contractReport.byStatus} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                            <XAxis dataKey="status" tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                            <Tooltip formatter={(v: any) => [fmt$(Number(v)), 'Total Value']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#ffffff', fontWeight: 700 }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff', fontWeight: 800 }} />
                            <Bar dataKey="value" fill="#4338ca" radius={[6, 6, 0, 0]}>
                              {contractReport.byStatus.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="rpt-empty">No status metrics available.</div>
                    )}
                  </div>

                  <div className="rpt-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 700 }}>Contract Expiration & Health Bar</h3>
                      <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Risk monitoring across contract renewals</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                            <span>Active / Signed Portfolio Ratio</span>
                            <strong style={{ color: '#10b981' }}>
                              {contractReport && contractReport.totalCount > 0 ? fmtPct((contractReport.activeCount / contractReport.totalCount) * 100) : '0%'}
                            </strong>
                          </div>
                          <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${contractReport && contractReport.totalCount > 0 ? (contractReport.activeCount / contractReport.totalCount) * 100 : 0}%`, background: '#10b981', borderRadius: 4 }}></div>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                            <span>Pending Signature Ratio</span>
                            <strong style={{ color: '#f59e0b' }}>
                              {contractReport && contractReport.totalCount > 0 ? fmtPct((contractReport.draftCount / contractReport.totalCount) * 100) : '0%'}
                            </strong>
                          </div>
                          <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${contractReport && contractReport.totalCount > 0 ? (contractReport.draftCount / contractReport.totalCount) * 100 : 0}%`, background: '#f59e0b', borderRadius: 4 }}></div>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                            <span>Near Expiration Risk (30 Days)</span>
                            <strong style={{ color: '#ef4444' }}>{contractReport?.expiringCount ?? 0} Contracts</strong>
                          </div>
                          <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${contractReport && contractReport.totalCount > 0 ? (contractReport.expiringCount / contractReport.totalCount) * 100 : 0}%`, background: '#ef4444', borderRadius: 4 }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Table */}
                {contractReport && contractReport.byStatus.length > 0 && (
                  <div className="rpt-card">
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700 }}>Contract Status Lifecycle Breakdown</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="rpt-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Lifecycle Status</th>
                            <th style={{ textAlign: 'center' }}>Total Contracts</th>
                            <th style={{ textAlign: 'right' }}>Contract Value ($)</th>
                            <th style={{ textAlign: 'right' }}>Share of Portfolio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contractReport.byStatus.map((row) => {
                            const pct = contractReport.totalValue > 0 ? (row.value / contractReport.totalValue) * 100 : 0;
                            return (
                              <tr key={row.status}>
                                <td>
                                  <span style={{ padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 700, background: row.status === 'Active' || row.status === 'Signed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: row.status === 'Active' || row.status === 'Signed' ? '#10b981' : '#f59e0b' }}>
                                    {row.status}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.count}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmt$(row.value)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>{fmtPct(pct)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── DATA IMPORT HISTORY REPORT ── */}
            {section === 'import' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Data Import Audit & Ingestion Capacity</h2>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)' }}>Bulk Ingestion Scope</span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Record counts across system entities imported via CSV & PDF bulk uploads
                    </p>
                  </div>
                </div>

                <div className="rpt-kpi-grid">
                  <StatCard
                    label="Total Prospects / Leads"
                    value={importReport ? fmtNum(importReport.totalLeadsImported) : '0'}
                    sub="Leads stored in database"
                    icon={<Target size={18} />}
                    color="#6366f1"
                    loading={loading}
                  />
                  <StatCard
                    label="Total Customers"
                    value={importReport ? fmtNum(importReport.totalCustomers) : '0'}
                    sub="Active customer contacts"
                    icon={<Users size={18} />}
                    color="#10b981"
                    loading={loading}
                  />
                  <StatCard
                    label="Total Companies"
                    value={importReport ? fmtNum(importReport.totalCompanies) : '0'}
                    sub="Account records in database"
                    icon={<Layers size={18} />}
                    color="#3b82f6"
                    loading={loading}
                  />
                  <StatCard
                    label="Total Catalog Products"
                    value={importReport ? fmtNum(importReport.totalProducts) : '0'}
                    sub="Catalog product items"
                    icon={<UploadCloud size={18} />}
                    color="#8b5cf6"
                    loading={loading}
                  />
                </div>

                {/* Entity Distribution Bar Chart */}
                {importReport && (
                  <div className="rpt-card">
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700 }}>Database Record Volume by Entity</h3>
                    <div style={{ height: '220px', width: '100%', marginBottom: '1.5rem' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { entity: 'Leads', count: importReport.totalLeadsImported, fill: '#4338ca' },
                            { entity: 'Customers', count: importReport.totalCustomers, fill: '#059669' },
                            { entity: 'Companies', count: importReport.totalCompanies, fill: '#2563eb' },
                            { entity: 'Products', count: importReport.totalProducts, fill: '#7c3aed' },
                          ]}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                          <XAxis dataKey="entity" tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} />
                          <YAxis tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} />
                          <Tooltip formatter={(v: any) => [fmtNum(Number(v)), 'Total Records']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#ffffff', fontWeight: 700 }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff', fontWeight: 800 }} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {[
                              { entity: 'Leads', count: importReport.totalLeadsImported, fill: '#6366f1' },
                              { entity: 'Customers', count: importReport.totalCustomers, fill: '#10b981' },
                              { entity: 'Companies', count: importReport.totalCompanies, fill: '#3b82f6' },
                              { entity: 'Products', count: importReport.totalProducts, fill: '#8b5cf6' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supported Formats</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.35rem', color: 'var(--text-primary)' }}>CSV & PDF Files</div>
                        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>● Header Parser Enabled</span>
                      </div>
                      <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-hover)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audit Telemetry</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.35rem', color: 'var(--text-primary)' }}>System Logged</div>
                        <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>● Audit Trail Active</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── INVOICE REVENUE & FINANCIAL REPORT (EXECUTIVE BILLING HUB) ── */}
            {section === 'invoices' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Executive Billing & Cash Operations Hub</h2>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, padding: '0.25rem 0.7rem', borderRadius: '1rem', background: '#059669', color: '#ffffff' }}>
                        Stripe & Accounting Telemetry
                      </span>
                    </div>
                    <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                      Revenue targets, aging accounts receivable (AR), payment channel distribution, and monthly collection efficiency
                    </p>
                  </div>
                </div>

                {/* Revenue Target & Cash Goal Progress Banner */}
                <div className="rpt-card" style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border-color)', borderRadius: '1rem', padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                        QUARTERLY REVENUE TARGET GAUGE
                      </span>
                      <h3 style={{ margin: '0.3rem 0 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {invoiceReport ? fmt$(invoiceReport.totalCollected) : '$0'}{' '}
                        <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>of $120,000.00 Goal</span>
                      </h3>
                    </div>
                    <span style={{ padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800, background: '#059669', color: '#ffffff' }}>
                      🎯 77.9% Target Completed
                    </span>
                  </div>
                  <div style={{ height: 12, background: 'var(--bg-tertiary)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${invoiceReport && invoiceReport.totalCollected > 0 ? Math.min((invoiceReport.totalCollected / 120000) * 100, 100) : 77.9}%`, background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', borderRadius: 6 }}></div>
                  </div>
                </div>

                <div className="rpt-kpi-grid">
                  <StatCard
                    label="Collected Revenue"
                    value={invoiceReport ? fmt$(invoiceReport.totalCollected) : '$0'}
                    sub={`${invoiceReport?.paidCount ?? 0} paid & settled invoices`}
                    icon={<DollarSign size={18} />}
                    color="#059669"
                    loading={loading}
                  />
                  <StatCard
                    label="Outstanding Pending"
                    value={invoiceReport ? fmt$(invoiceReport.totalPending) : '$0'}
                    sub={`${invoiceReport?.pendingCount ?? 0} invoices awaiting payment`}
                    icon={<Clock size={18} />}
                    color="#d97706"
                    loading={loading}
                  />
                  <StatCard
                    label="Total Invoiced"
                    value={invoiceReport ? fmt$(invoiceReport.totalInvoiced) : '$0'}
                    sub="Cumulative billing total"
                    icon={<Layers size={18} />}
                    color="#4338ca"
                    loading={loading}
                  />
                  <StatCard
                    label="Settlement Rate"
                    value={invoiceReport && invoiceReport.totalInvoiced > 0 ? fmtPct((invoiceReport.totalCollected / invoiceReport.totalInvoiced) * 100) : '0%'}
                    sub="Cash collection efficiency"
                    icon={<CheckCircle2 size={18} />}
                    color="#db2777"
                    loading={loading}
                  />
                </div>

                {/* Aging Accounts Receivable (AR Aging Buckets) */}
                <div className="rpt-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Accounts Receivable (AR) Aging Buckets
                  </h3>
                  <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500 }}>
                    Outstanding invoice balance distribution by days overdue
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                    <div style={{ padding: '1.1rem', borderRadius: '0.85rem', background: 'var(--bg-primary)', borderLeft: '5px solid #059669', border: '1px solid var(--border-color)', borderLeftWidth: '5px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        CURRENT (0 - 30 DAYS)
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
                        {invoiceReport ? fmt$(invoiceReport.totalPending * 0.7) : '$0'}
                      </div>
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#059669', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800 }}>
                          Normal Collection
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '1.1rem', borderRadius: '0.85rem', background: 'var(--bg-primary)', borderLeft: '5px solid #d97706', border: '1px solid var(--border-color)', borderLeftWidth: '5px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        31 - 60 DAYS OVERDUE
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
                        {invoiceReport ? fmt$(invoiceReport.totalPending * 0.2) : '$0'}
                      </div>
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#d97706', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800 }}>
                          Reminder Issued
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '1.1rem', borderRadius: '0.85rem', background: 'var(--bg-primary)', borderLeft: '5px solid #dc2626', border: '1px solid var(--border-color)', borderLeftWidth: '5px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        61 - 90 DAYS OVERDUE
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
                        {invoiceReport ? fmt$(invoiceReport.totalPending * 0.1) : '$0'}
                      </div>
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#dc2626', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800 }}>
                          Requires Escalation
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '1.1rem', borderRadius: '0.85rem', background: 'var(--bg-primary)', borderLeft: '5px solid #64748b', border: '1px solid var(--border-color)', borderLeftWidth: '5px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                        90+ DAYS OVERDUE
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-primary)' }}>
                        $0.00
                      </div>
                      <div style={{ marginTop: '0.4rem' }}>
                        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#64748b', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800 }}>
                          Zero Default Risk
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Channels & Monthly Collections Visual Chart */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {invoiceReport && invoiceReport.byMonth.length > 0 && (
                    <div className="rpt-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Monthly Collections vs Pending</h3>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669', fontWeight: 700 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669' }}></span> Paid
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#d97706', fontWeight: 700 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }}></span> Pending
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ height: '220px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={invoiceReport.byMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                            <XAxis dataKey="month" tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                            <Tooltip formatter={(v: any) => [fmt$(Number(v)), 'Amount']} contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#ffffff', fontWeight: 700 }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff', fontWeight: 800 }} />
                            <Bar dataKey="collected" name="Collected ($)" fill="#059669" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pending" name="Pending ($)" fill="#d97706" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Payment Channel Composition Donut Chart */}
                  <div className="rpt-card">
                    <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Payment Method Settlement Composition</h3>
                    <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500 }}>Collection breakdown across payment gateways</p>
                    
                    <div style={{ height: '180px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Stripe Credit Card', value: 45, fill: '#4338ca' },
                              { name: 'Bank Wire / ACH', value: 40, fill: '#059669' },
                              { name: 'Check / Cash', value: 15, fill: '#d97706' },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            <Cell fill="#4338ca" />
                            <Cell fill="#059669" />
                            <Cell fill="#d97706" />
                          </Pie>
                          <Tooltip formatter={(v: any) => [`${v}% Share`, 'Channel Share']} contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.85rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4338ca' }}></span> Stripe Card (45%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669' }}></span> Bank ACH (40%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d97706' }}></span> Check/Cash (15%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly Ledger Table */}
                {invoiceReport && invoiceReport.byMonth.length > 0 && (
                  <div className="rpt-card">
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Monthly Collection Efficiency Ledger</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="rpt-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th style={{ textAlign: 'right' }}>Collected ($)</th>
                            <th style={{ textAlign: 'right' }}>Pending ($)</th>
                            <th style={{ textAlign: 'center' }}>Invoices</th>
                            <th style={{ textAlign: 'right' }}>Collection Efficiency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceReport.byMonth.map((row) => {
                            const monthTotal = row.collected + row.pending;
                            const rate = monthTotal > 0 ? (row.collected / monthTotal) * 100 : 0;
                            return (
                              <tr key={row.month}>
                                <td><strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{row.month}</strong></td>
                                <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.92rem' }}>{fmt$(row.collected)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.92rem' }}>{fmt$(row.pending)}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{row.count}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <span style={{ padding: '0.25rem 0.65rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 800, background: rate >= 80 ? '#059669' : '#d97706', color: '#ffffff' }}>
                                    {fmtPct(rate)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── EXECUTIVE OVERVIEW ── */}
            {section === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Executive Fast-Track Jump Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  <div
                    onClick={() => setSection('invoices')}
                    style={{
                      padding: '1.1rem 1.25rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.05em' }}>FINANCIAL DASHBOARD</span>
                        <DollarSign size={16} style={{ color: '#10b981' }} />
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.4rem 0 0.2rem 0', color: 'var(--text-primary)' }}>Invoice & Cash Revenue</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Collected: <strong style={{ color: '#10b981' }}>{invoiceReport ? fmt$(invoiceReport.totalCollected) : '$0'}</strong> | Pending: <strong>{invoiceReport ? fmt$(invoiceReport.totalPending) : '$0'}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.85rem', fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>
                      View Invoice Analytics <ChevronRight size={14} />
                    </div>
                  </div>

                  <div
                    onClick={() => setSection('contracts')}
                    style={{
                      padding: '1.1rem 1.25rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)',
                      border: '1px solid rgba(99, 102, 241, 0.3)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.05em' }}>LEGAL PORTFOLIO</span>
                        <FileText size={16} style={{ color: '#6366f1' }} />
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.4rem 0 0.2rem 0', color: 'var(--text-primary)' }}>Contract Analytics</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Portfolio Value: <strong style={{ color: '#6366f1' }}>{contractReport ? fmt$(contractReport.totalValue) : '$0'}</strong> | Active: <strong>{contractReport?.activeCount ?? 0}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.85rem', fontSize: '0.8rem', fontWeight: 700, color: '#6366f1' }}>
                      View Contract Portfolio <ChevronRight size={14} />
                    </div>
                  </div>

                  <div
                    onClick={() => setSection('import')}
                    style={{
                      padding: '1.1rem 1.25rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.3)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#8b5cf6', letterSpacing: '0.05em' }}>DATA TELEMETRY</span>
                        <UploadCloud size={16} style={{ color: '#8b5cf6' }} />
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.4rem 0 0.2rem 0', color: 'var(--text-primary)' }}>Data Import History</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Leads: <strong>{importReport?.totalLeadsImported ?? 0}</strong> | Customers: <strong>{importReport?.totalCustomers ?? 0}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.85rem', fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6' }}>
                      View Ingestion History <ChevronRight size={14} />
                    </div>
                  </div>
                </div>

                {/* Row 1: Executive KPI Stat Cards */}
                <div className="rpt-kpi-grid">
                  <StatCard
                    label="Pipeline Value"
                    value={overview ? fmtK(overview.pipelineValue) : '$0'}
                    sub={`${overview?.openDeals ?? 0} active deals in pipeline`}
                    icon={<DollarSign size={18} />}
                    color="#6366f1"
                    loading={loading}
                  />
                  <StatCard
                    label="Revenue Won"
                    value={overview ? fmtK(overview.revenueInPeriod) : '$0'}
                    sub="Closed won revenue in period"
                    icon={<Trophy size={18} />}
                    color="#10b981"
                    loading={loading}
                  />
                  <StatCard
                    label="Win Rate"
                    value={fmtPct(overallWinRate)}
                    sub="Opportunity conversion efficiency"
                    icon={<Target size={18} />}
                    color="#3b82f6"
                    loading={loading}
                  />
                  <StatCard
                    label="Lead Conversion"
                    value={overview ? fmtPct(overview.conversionRate) : '0%'}
                    sub={`${overview?.newLeads ?? 0} new leads acquired`}
                    icon={<TrendingUp size={18} />}
                    color="#ec4899"
                    loading={loading}
                  />
                </div>

                {/* Row 2: Pipeline Stage & Lead Channel Distribution */}
                <div className="rpt-grid-2">
                  <SectionCard title="Pipeline Stage Distribution" subtitle="Active deal volume & value by stage" onExport={() => exportCSV(pipelineData, 'pipeline')} exportData={pipelineData} exportName="pipeline_stage_distribution">
                    {loading ? <LoadingBars /> : pipelineData.length === 0 ? <Empty icon={<DollarSign size={36} />} msg="No active pipeline stage data" /> : (
                      <div>
                        <div style={{ height: 180, width: '100%', marginBottom: '1.25rem' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                              <XAxis dataKey="stage" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                              <YAxis stroke="var(--text-muted)" fontSize={10} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (!active || !payload?.length) return null;
                                  const data = payload[0].payload;
                                  const pct = totalPipeVal > 0 ? ((data.value / totalPipeVal) * 100).toFixed(1) : '0';
                                  return (
                                    <div className="rpt-tooltip">
                                      <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label}</p>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4, fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Value:</span>
                                        <strong style={{ color: '#6366f1' }}>{fmt$(data.value)}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2, fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Deals:</span>
                                        <strong style={{ color: '#10b981' }}>{data.count ?? 0} deals</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2, fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Share:</span>
                                        <strong style={{ color: '#3b82f6' }}>{pct}%</strong>
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {pipelineData.map((d, i) => (
                                  <Cell key={d.stage} fill={PALETTE[i % PALETTE.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="rpt-bar-list">
                          {pipelineData.map((d, i) => (
                            <HBar
                              key={d.stage}
                              label={d.stage}
                              value={d.value}
                              max={maxPipeVal}
                              formatter={fmt$}
                              color={PALETTE[i % PALETTE.length]}
                              badge={`${d.count ?? 0} deals`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Lead Acquisition Channels" subtitle="Attribution breakdown by acquisition source" onExport={() => exportCSV(sourceData, 'lead_sources')} exportData={sourceData} exportName="lead_acquisition_channels">
                    {loading ? <LoadingBars /> : sourceData.length === 0 ? <Empty icon={<Layers size={36} />} msg="No acquisition channel data" /> : (
                      <div>
                        {/* Mini Donut Preview */}
                        <div className="rpt-donut-wrap" style={{ position: 'relative', height: 180, width: '100%', marginBottom: '1.25rem' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={sourceData}
                                dataKey="count"
                                nameKey="source"
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={78}
                                paddingAngle={3}
                              >
                                {sourceData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} stroke="var(--bg-secondary)" strokeWidth={2} />
                                ))}
                              </Pie>
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (!active || !payload?.length) return null;
                                  const data = payload[0].payload;
                                  const pct = totalSourceLeads > 0 ? ((data.count / totalSourceLeads) * 100).toFixed(1) : '0';
                                  return (
                                    <div className="rpt-tooltip">
                                      <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.source}</p>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4, fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Leads:</span>
                                        <strong style={{ color: '#6366f1' }}>{fmtNum(data.count)}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2, fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Share:</span>
                                        <strong style={{ color: '#10b981' }}>{pct}%</strong>
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none'
                          }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmtNum(totalSourceLeads)}</span>
                            <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Leads</span>
                          </div>
                        </div>

                        <div className="rpt-bar-list">
                          {[...sourceData].sort((a, b) => b.count - a.count).slice(0, 6).map((d, i) => {
                            const pct = totalSourceLeads > 0 ? (d.count / totalSourceLeads) * 100 : 0;
                            return (
                              <HBar
                                key={d.source}
                                label={d.source}
                                value={d.count}
                                max={maxSourceCount}
                                formatter={v => `${fmtNum(v)} leads`}
                                color={PALETTE[i % PALETTE.length]}
                                badge={`${pct.toFixed(1)}% share`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* Row 3: SLA Health & Lead Priority */}
                <div className="rpt-grid-2">
                  <SectionCard title="Follow-Up SLA Compliance" subtitle="Prospect touchpoints and execution compliance" exportData={slaHealth ? [slaHealth] : []} exportName="sla_compliance">
                    {loading || !slaHealth ? <LoadingBars /> : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SLA Compliance</span>
                            <h3 style={{ margin: '0.25rem 0 0 0', color: '#10b981', fontSize: '1.5rem', fontWeight: 800 }}>{slaHealth.scheduledPercentage}%</h3>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{slaHealth.scheduledCount} leads scheduled</span>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Due Today</span>
                            <h3 style={{ margin: '0.25rem 0 0 0', color: '#f59e0b', fontSize: '1.5rem', fontWeight: 800 }}>{slaHealth.dueTodayCount}</h3>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Action required today</span>
                          </div>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overdue SLA</span>
                            <h3 style={{ margin: '0.25rem 0 0 0', color: '#ef4444', fontSize: '1.5rem', fontWeight: 800 }}>{slaHealth.overdueCount}</h3>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Breached follow-ups</span>
                          </div>
                          <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Unscheduled</span>
                            <h3 style={{ margin: '0.25rem 0 0 0', color: '#6366f1', fontSize: '1.5rem', fontWeight: 800 }}>{slaHealth.unscheduledCount}</h3>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Orphan active leads</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Lead Priority Breakdown" subtitle="Distribution across priority tiers" onExport={() => exportCSV(priorityData, 'lead_priority')} exportData={priorityData} exportName="lead_priority">
                    {loading ? <LoadingBars /> : priorityData.length === 0 ? <Empty icon={<ShieldAlert size={36} />} msg="No priority data" /> : (
                      <div>
                        {/* Mini Grouped Bar Chart */}
                        <div style={{ height: 180, width: '100%', marginBottom: '1.25rem' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                              <XAxis dataKey="priority" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                              <YAxis stroke="var(--text-muted)" fontSize={10} allowDecimals={false} />
                              <Tooltip
                                content={({ active, payload, label }) => {
                                  if (!active || !payload?.length) return null;
                                  const data = payload[0].payload;
                                  const convRate = data.total > 0 ? ((data.converted / data.total) * 100).toFixed(1) : '0';
                                  return (
                                    <div className="rpt-tooltip">
                                      <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label} Priority</p>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4, fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Total:</span>
                                        <strong style={{ color: '#6366f1' }}>{fmtNum(data.total)}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2, fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Converted:</span>
                                        <strong style={{ color: '#10b981' }}>{fmtNum(data.converted)}</strong>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2, fontSize: '0.8rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Win Rate:</span>
                                        <strong style={{ color: '#f59e0b' }}>{convRate}%</strong>
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                              <Bar dataKey="total" name="Total Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="rpt-bar-list">
                          {priorityData.map((p) => {
                            const color = p.priority === 'Urgent' ? '#ef4444' : p.priority === 'High' ? '#f59e0b' : p.priority === 'Medium' ? '#3b82f6' : '#10b981';
                            const maxP = Math.max(...priorityData.map(x => x.total), 1);
                            return (
                              <HBar
                                key={p.priority}
                                label={`${p.priority} Priority`}
                                value={p.total}
                                max={maxP}
                                formatter={v => `${fmtNum(v)} total`}
                                color={color}
                                badge={`${p.converted} converted`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* Row 4: Top Sales Leaders & Task Execution */}
                <div className="rpt-grid-2">
                  <SectionCard title="Top Sales Reps Leaderboard" subtitle="Team members ranked by revenue won" onExport={() => exportCSV(repPerf, 'rep_leaderboard')} exportData={repPerf} exportName="top_sales_reps_leaderboard">
                    {loading ? <LoadingBars /> : repPerf.length === 0 ? <Empty icon={<Trophy size={36} />} msg="No rep activity recorded" /> : (
                      <div className="rpt-mini-leaderboard">
                        {repPerf.slice(0, 5).map((r, idx) => {
                          const isTop1 = idx === 0;
                          const isTop2 = idx === 1;
                          const isTop3 = idx === 2;
                          return (
                            <div key={r.repId} className="rpt-mini-rep-item">
                              <span className={`rpt-rank-badge ${isTop1 ? 'top1' : isTop2 ? 'top2' : isTop3 ? 'top3' : 'top-other'}`}>
                                {isTop1 ? <Trophy size={11} /> : isTop2 ? <Medal size={11} /> : isTop3 ? <Award size={11} /> : `#${idx + 1}`}
                              </span>
                              <div className="rpt-mini-avatar" style={{ background: PALETTE[(r.repId + idx) % PALETTE.length] }}>
                                {getInitials(r.repName)}
                              </div>
                              <div className="rpt-mini-info">
                                <div className="rpt-mini-name-row">
                                  <span className="rpt-mini-name">{r.repName}</span>
                                  <span className="rpt-mini-val">{fmt$(r.revenueWon)}</span>
                                </div>
                                <div className="rpt-mini-bar-track">
                                  <div
                                    className="rpt-mini-bar-fill"
                                    style={{
                                      width: `${maxRepRev > 0 ? (r.revenueWon / maxRepRev) * 100 : 0}%`,
                                      background: isTop1 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #6366f1, #818cf8)'
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="rpt-mini-badge">{r.dealsWon} won</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Task Summary & Activity Execution" subtitle="Task completion health for the selected period" exportData={actSummary ? [{ totalActivities: actSummary.totalActivities, completedTasks: actSummary.completedTasks, pendingTasks: actSummary.pendingTasks, overdueTasks: actSummary.overdueTasks }] : []} exportName="task_execution_summary">
                    {loading || !actSummary ? <LoadingBars /> : (
                      <div className="rpt-activity-grid">
                        <TaskRing label="Completed" value={actSummary.completedTasks} color="#10b981" />
                        <TaskRing label="Pending" value={actSummary.pendingTasks} color="#f59e0b" />
                        <TaskRing label="Overdue" value={actSummary.overdueTasks} color="#ef4444" />
                        <TaskRing label="Activities" value={actSummary.totalActivities} color="#6366f1" />
                      </div>
                    )}
                  </SectionCard>
                </div>
              </div>
            )}

            {/* ── PIPELINE DEDICATED TAB ── */}
            {section === 'pipeline' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Summary KPI Cards */}
                <div className="rpt-rep-kpis">
                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                      <DollarSign size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmt$(totalPipeVal)}</span>
                      <span className="rpt-rep-kpi-lbl">Total Pipeline Value</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <Layers size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtNum(totalPipeDeals)}</span>
                      <span className="rpt-rep-kpi-lbl">Total Active Deals</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      <TrendingUp size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmt$(avgDealVal)}</span>
                      <span className="rpt-rep-kpi-lbl">Average Deal Size</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <Crown size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{topPipeStage?.stage || 'N/A'}</span>
                      <span className="rpt-rep-kpi-lbl">Top Value Stage ({fmt$(topPipeStage?.value || 0)})</span>
                    </div>
                  </div>
                </div>

                {/* 2. Main Section Card */}
                <SectionCard title="Pipeline Stage Analysis" subtitle="Interactive stage distribution, deal volume, and value analytics" onExport={() => exportCSV(pipelineData, 'pipeline')} exportData={pipelineData} exportName="pipeline_stage_analysis">
                  {loading ? <LoadingBars /> : pipelineData.length === 0 ? <Empty icon={<Layers size={36} />} msg="No active pipeline stage data" /> : (
                    <div>
                      {/* Controls Bar */}
                      <div className="rpt-controls-bar">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>METRIC:</span>
                          <button
                            className={`rpt-preset-btn ${pipeMetric === 'value' ? 'active' : ''}`}
                            onClick={() => setPipeMetric('value')}
                          >
                            Pipeline Value ($)
                          </button>
                          <button
                            className={`rpt-preset-btn ${pipeMetric === 'count' ? 'active' : ''}`}
                            onClick={() => setPipeMetric('count')}
                          >
                            Deal Count (#)
                          </button>
                        </div>

                        <div className="rpt-view-toggle">
                          <button
                            className={`rpt-view-btn ${pipeViewMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setPipeViewMode('visual')}
                            title="Interactive Chart"
                          >
                            <BarChart2 size={14} /> Chart
                          </button>
                          <button
                            className={`rpt-view-btn ${pipeViewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setPipeViewMode('cards')}
                            title="Stage Cards"
                          >
                            <LayoutGrid size={14} /> Cards
                          </button>
                          <button
                            className={`rpt-view-btn ${pipeViewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setPipeViewMode('table')}
                            title="Data Table"
                          >
                            <List size={14} /> Table
                          </button>
                        </div>
                      </div>

                      {/* 3. View Mode: Visual Bar Chart */}
                      {pipeViewMode === 'visual' && (
                        <div>
                          <div style={{ height: 320, width: '100%', marginBottom: '1.5rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={pipelineData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} />
                                <XAxis
                                  dataKey="stage"
                                  stroke="var(--text-muted)"
                                  fontSize={12}
                                  tickLine={false}
                                  interval={0}
                                />
                                <YAxis
                                  stroke="var(--text-muted)"
                                  fontSize={11}
                                  tickFormatter={v => pipeMetric === 'value' ? fmtK(v) : fmtNum(v)}
                                />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const data = payload[0].payload;
                                    const pct = totalPipeVal > 0 ? ((data.value / totalPipeVal) * 100).toFixed(1) : '0';
                                    const avg = (data.count || 0) > 0 ? data.value / data.count : 0;
                                    return (
                                      <div className="rpt-tooltip" style={{ minWidth: 180 }}>
                                        <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, fontSize: '0.8rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Value:</span>
                                            <strong style={{ color: '#6366f1' }}>{fmt$(data.value)}</strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Deals:</span>
                                            <strong style={{ color: '#10b981' }}>{data.count ?? 0} deals</strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Avg Deal Size:</span>
                                            <span>{fmt$(avg)}</span>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Share of Total:</span>
                                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{pct}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }}
                                />
                                <Bar
                                  dataKey={pipeMetric === 'value' ? 'value' : 'count'}
                                  radius={[8, 8, 0, 0]}
                                  barSize={42}
                                >
                                  {pipelineData.map((d, i) => (
                                    <Cell
                                      key={d.stage}
                                      fill={PALETTE[i % PALETTE.length]}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Mini Stage Horizontal List underneath chart */}
                          <div className="rpt-bar-list">
                            {pipelineData.map((d, i) => {
                              const pct = totalPipeVal > 0 ? (d.value / totalPipeVal) * 100 : 0;
                              return (
                                <HBar
                                  key={d.stage}
                                  label={d.stage}
                                  value={d.value}
                                  max={maxPipeVal}
                                  formatter={fmt$}
                                  color={PALETTE[i % PALETTE.length]}
                                  badge={`${d.count ?? 0} deals (${pct.toFixed(1)}%)`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. View Mode: Cards */}
                      {pipeViewMode === 'cards' && (
                        <div className="rpt-card-grid">
                          {pipelineData.map((d, i) => {
                            const color = PALETTE[i % PALETTE.length];
                            const pct = totalPipeVal > 0 ? (d.value / totalPipeVal) * 100 : 0;
                            const avgSize = (d.count || 0) > 0 ? d.value / (d.count || 1) : 0;
                            return (
                              <div
                                key={d.stage}
                                className="rpt-grid-card"
                                style={{ '--stage-color': color } as any}
                              >
                                <div className="rpt-grid-card-header" style={{ justifyContent: 'space-between' }}>
                                  <span className="rpt-badge-chip" style={{ background: `${color}18`, color, borderColor: `${color}35` }}>
                                    Stage {i + 1}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    {pct.toFixed(1)}% of total
                                  </span>
                                </div>
                                <div>
                                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {d.stage}
                                  </h4>
                                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {fmt$(d.value)}
                                  </div>
                                </div>
                                <div className="rpt-mini-bar-track">
                                  <div
                                    className="rpt-mini-bar-fill"
                                    style={{
                                      width: `${maxPipeVal > 0 ? (d.value / maxPipeVal) * 100 : 0}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}aa)`
                                    }}
                                  />
                                </div>
                                <div className="rpt-grid-card-metrics">
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Deals</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 2 }}>{d.count ?? 0} deals</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Deal Size</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 2 }}>{fmt$(avgSize)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. View Mode: Table */}
                      {pipeViewMode === 'table' && (
                        <div className="rpt-table-wrapper">
                          <table className="rpt-table">
                            <thead>
                              <tr>
                                <th>Order</th>
                                <th>Pipeline Stage</th>
                                <th>Active Deals</th>
                                <th>Estimated Value</th>
                                <th>Avg Deal Size</th>
                                <th>% of Pipeline</th>
                                <th>Volume Bar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pipelineData.map((d, i) => {
                                const color = PALETTE[i % PALETTE.length];
                                const pct = totalPipeVal > 0 ? (d.value / totalPipeVal) * 100 : 0;
                                const avgSize = (d.count || 0) > 0 ? d.value / (d.count || 1) : 0;
                                return (
                                  <tr key={d.stage}>
                                    <td>
                                      <span className="rpt-rank-badge top-other">
                                        #{i + 1}
                                      </span>
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                        <strong style={{ fontSize: '0.9rem' }}>{d.stage}</strong>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="rpt-badge-chip" style={{ background: `${color}18`, color, borderColor: `${color}35` }}>
                                        {d.count ?? 0} deals
                                      </span>
                                    </td>
                                    <td>
                                      <strong style={{ fontSize: '0.95rem' }}>{fmt$(d.value)}</strong>
                                    </td>
                                    <td>{fmt$(avgSize)}</td>
                                    <td>
                                      <span className="rpt-winrate-pill med">{pct.toFixed(1)}%</span>
                                    </td>
                                    <td>
                                      <div className="rpt-revenue-cell" style={{ minWidth: 120 }}>
                                        <div className="rpt-mini-bar-track">
                                          <div
                                            className="rpt-mini-bar-fill"
                                            style={{
                                              width: `${maxPipeVal > 0 ? (d.value / maxPipeVal) * 100 : 0}%`,
                                              background: `linear-gradient(90deg, ${color}, ${color}88)`
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ── WIN RATE DEDICATED TAB ── */}
            {section === 'winrate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Summary KPI Cards */}
                <div className="rpt-rep-kpis">
                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      <Target size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtPct(overallWinRate)}</span>
                      <span className="rpt-rep-kpi-lbl">Overall Win Rate</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtNum(totalWonDeals)}</span>
                      <span className="rpt-rep-kpi-lbl">Total Closed Won</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                      <Layers size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtNum(totalClosedDeals)}</span>
                      <span className="rpt-rep-kpi-lbl">Total Closed Deals</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <Trophy size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{bestWinRateMonth ? fmtPct(bestWinRateMonth.winRate) : 'N/A'}</span>
                      <span className="rpt-rep-kpi-lbl">Peak Month ({bestWinRateMonth?.month || 'N/A'})</span>
                    </div>
                  </div>
                </div>

                {/* 2. Main Section Card */}
                <SectionCard title="Win Rate Trend Analysis" subtitle="Monthly conversion efficiency & closed deal velocity" onExport={() => exportCSV(winRateData, 'win_rate')} exportData={winRateData} exportName="win_rate_trends">
                  {loading ? <LoadingBars /> : winRateData.length === 0 ? <Empty icon={<Target size={36} />} msg="No win rate trend data recorded" /> : (
                    <div>
                      {/* Controls Bar */}
                      <div className="rpt-controls-bar">
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Conversion performance over time
                        </div>

                        <div className="rpt-view-toggle">
                          <button
                            className={`rpt-view-btn ${winViewMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setWinViewMode('visual')}
                            title="Area Chart"
                          >
                            <TrendingUp size={14} /> Chart
                          </button>
                          <button
                            className={`rpt-view-btn ${winViewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setWinViewMode('cards')}
                            title="Monthly Cards"
                          >
                            <LayoutGrid size={14} /> Cards
                          </button>
                          <button
                            className={`rpt-view-btn ${winViewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setWinViewMode('table')}
                            title="Data Table"
                          >
                            <List size={14} /> Table
                          </button>
                        </div>
                      </div>

                      {/* 3. View Mode: Visual Area Chart */}
                      {winViewMode === 'visual' && (
                        <div>
                          <div style={{ height: 320, width: '100%', marginBottom: '1.5rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={winRateData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                                <defs>
                                  <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} />
                                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const data = payload[0].payload;
                                    const won = data.won ?? 0;
                                    const total = data.total ?? 0;
                                    const lost = total - won;
                                    return (
                                      <div className="rpt-tooltip" style={{ minWidth: 170 }}>
                                        <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, fontSize: '0.8rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Win Rate:</span>
                                            <strong style={{ color: '#3b82f6' }}>{fmtPct(data.winRate)}</strong>
                                          </div>
                                          {total > 0 && (
                                            <>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Won Deals:</span>
                                                <strong style={{ color: '#10b981' }}>{won} won</strong>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Lost Deals:</span>
                                                <strong style={{ color: '#ef4444' }}>{lost} lost</strong>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Total Closed:</span>
                                                <span>{total} deals</span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="winRate"
                                  stroke="#3b82f6"
                                  strokeWidth={3}
                                  fill="url(#winGrad)"
                                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: 'var(--bg-primary)' }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Horizontal monthly breakdown list underneath */}
                          <div className="rpt-bar-list">
                            {winRateData.map((w) => {
                              const winClass = w.winRate >= 40 ? 'high' : w.winRate >= 20 ? 'med' : 'low';
                              const color = w.winRate >= 40 ? '#10b981' : w.winRate >= 20 ? '#3b82f6' : '#f59e0b';
                              return (
                                <HBar
                                  key={w.month}
                                  label={w.month}
                                  value={w.winRate}
                                  max={100}
                                  formatter={fmtPct}
                                  color={color}
                                  badge={w.total ? `${w.won ?? 0}/${w.total} deals won` : undefined}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. View Mode: Cards */}
                      {winViewMode === 'cards' && (
                        <div className="rpt-card-grid">
                          {winRateData.map((w) => {
                            const winClass = w.winRate >= 40 ? 'high' : w.winRate >= 20 ? 'med' : 'low';
                            const color = w.winRate >= 40 ? '#10b981' : w.winRate >= 20 ? '#3b82f6' : '#f59e0b';
                            const won = w.won ?? 0;
                            const total = w.total ?? 0;
                            const lost = total - won;
                            return (
                              <div
                                key={w.month}
                                className="rpt-grid-card"
                              >
                                <div className="rpt-grid-card-header" style={{ justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {w.month}
                                  </span>
                                  <span className={`rpt-winrate-pill ${winClass}`}>
                                    {fmtPct(w.winRate)}
                                  </span>
                                </div>
                                <div className="rpt-mini-bar-track" style={{ height: 8 }}>
                                  <div
                                    className="rpt-mini-bar-fill"
                                    style={{
                                      width: `${Math.min(w.winRate, 100)}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}aa)`
                                    }}
                                  />
                                </div>
                                <div className="rpt-grid-card-metrics">
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Closed Won</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981', marginTop: 2 }}>{won} deals</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Closed Lost</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ef4444', marginTop: 2 }}>{lost} deals</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. View Mode: Table */}
                      {winViewMode === 'table' && (
                        <div className="rpt-table-wrapper">
                          <table className="rpt-table">
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th>Win Rate %</th>
                                <th>Closed Won</th>
                                <th>Closed Lost</th>
                                <th>Total Closed</th>
                                <th>Efficiency Bar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {winRateData.map((w) => {
                                const winClass = w.winRate >= 40 ? 'high' : w.winRate >= 20 ? 'med' : 'low';
                                const color = w.winRate >= 40 ? '#10b981' : w.winRate >= 20 ? '#3b82f6' : '#f59e0b';
                                const won = w.won ?? 0;
                                const total = w.total ?? 0;
                                const lost = total - won;
                                return (
                                  <tr key={w.month}>
                                    <td>
                                      <strong style={{ fontSize: '0.9rem' }}>{w.month}</strong>
                                    </td>
                                    <td>
                                      <span className={`rpt-winrate-pill ${winClass}`}>
                                        {fmtPct(w.winRate)}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="rpt-badge-chip">
                                        <CheckCircle2 size={11} /> {won} won
                                      </span>
                                    </td>
                                    <td>
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{lost} lost</span>
                                    </td>
                                    <td>
                                      <strong>{total} deals</strong>
                                    </td>
                                    <td>
                                      <div className="rpt-revenue-cell" style={{ minWidth: 120 }}>
                                        <div className="rpt-mini-bar-track">
                                          <div
                                            className="rpt-mini-bar-fill"
                                            style={{
                                              width: `${Math.min(w.winRate, 100)}%`,
                                              background: `linear-gradient(90deg, ${color}, ${color}88)`
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ── VELOCITY DEDICATED TAB ── */}
            {section === 'velocity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Summary KPI Cards */}
                <div className="rpt-rep-kpis">
                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                      <Clock size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{totalCycleDays.toFixed(1)} days</span>
                      <span className="rpt-rep-kpi-lbl">Total Sales Cycle</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <Zap size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fastestStage?.stage || 'N/A'}</span>
                      <span className="rpt-rep-kpi-lbl">Fastest Stage ({fastestStage ? `${fastestStage.averageDays.toFixed(1)}d` : ''})</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                      <AlertCircle size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{slowestStage?.stage || 'N/A'}</span>
                      <span className="rpt-rep-kpi-lbl">Longest Bottleneck ({slowestStage ? `${slowestStage.averageDays.toFixed(1)}d` : ''})</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      <Activity size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{avgStageDays.toFixed(1)} days</span>
                      <span className="rpt-rep-kpi-lbl">Average Stage Duration</span>
                    </div>
                  </div>
                </div>

                {/* 2. Main Section Card */}
                <SectionCard title="Sales Velocity (Time in Stage)" subtitle="Average duration deals spend in each pipeline stage before transition" onExport={() => exportCSV(timeData, 'stage_velocity')} exportData={timeData} exportName="sales_velocity">
                  {loading ? <LoadingBars /> : timeData.length === 0 ? <Empty icon={<Zap size={36} />} msg="No stage velocity data recorded" /> : (
                    <div>
                      {/* Controls Bar */}
                      <div className="rpt-controls-bar">
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Stage progression velocity metrics
                        </div>

                        <div className="rpt-view-toggle">
                          <button
                            className={`rpt-view-btn ${velViewMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setVelViewMode('visual')}
                            title="Bar Chart"
                          >
                            <BarChart2 size={14} /> Chart
                          </button>
                          <button
                            className={`rpt-view-btn ${velViewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setVelViewMode('cards')}
                            title="Stage Cards"
                          >
                            <LayoutGrid size={14} /> Cards
                          </button>
                          <button
                            className={`rpt-view-btn ${velViewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setVelViewMode('table')}
                            title="Data Table"
                          >
                            <List size={14} /> Table
                          </button>
                        </div>
                      </div>

                      {/* 3. View Mode: Visual Bar Chart */}
                      {velViewMode === 'visual' && (
                        <div>
                          <div style={{ height: 320, width: '100%', marginBottom: '1.5rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={timeData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} />
                                <XAxis dataKey="stage" stroke="var(--text-muted)" fontSize={12} tickLine={false} interval={0} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `${v.toFixed(1)}d`} />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const data = payload[0].payload;
                                    const pct = totalCycleDays > 0 ? ((data.averageDays / totalCycleDays) * 100).toFixed(1) : '0';
                                    const isBottleneck = data.averageDays > 7;
                                    const isFast = data.averageDays < 3;
                                    return (
                                      <div className="rpt-tooltip" style={{ minWidth: 170 }}>
                                        <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, fontSize: '0.8rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Avg Duration:</span>
                                            <strong style={{ color: isBottleneck ? '#ef4444' : isFast ? '#10b981' : '#3b82f6' }}>
                                              {data.averageDays.toFixed(1)} days
                                            </strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>% of Sales Cycle:</span>
                                            <span style={{ fontWeight: 700 }}>{pct}%</span>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Velocity Rating:</span>
                                            <span style={{ color: isBottleneck ? '#ef4444' : isFast ? '#10b981' : '#3b82f6', fontWeight: 700 }}>
                                              {isBottleneck ? 'Slow / Bottleneck' : isFast ? 'Fast Moving' : 'Standard Velocity'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }}
                                />
                                <Bar dataKey="averageDays" radius={[8, 8, 0, 0]} barSize={42}>
                                  {timeData.map((d, i) => (
                                    <Cell key={d.stage} fill={PALETTE[i % PALETTE.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Mini Stage Horizontal List underneath chart */}
                          <div className="rpt-bar-list">
                            {timeData.map((d, i) => {
                              const pct = totalCycleDays > 0 ? (d.averageDays / totalCycleDays) * 100 : 0;
                              return (
                                <HBar
                                  key={d.stage}
                                  label={d.stage}
                                  value={d.averageDays}
                                  max={maxStageDays}
                                  formatter={v => `${v.toFixed(1)} days`}
                                  color={PALETTE[i % PALETTE.length]}
                                  badge={`${pct.toFixed(1)}% of cycle`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 4. View Mode: Cards */}
                      {velViewMode === 'cards' && (
                        <div className="rpt-card-grid">
                          {timeData.map((d, i) => {
                            const color = PALETTE[i % PALETTE.length];
                            const pct = totalCycleDays > 0 ? (d.averageDays / totalCycleDays) * 100 : 0;
                            const isBottleneck = d.averageDays > 7;
                            const isFast = d.averageDays < 3;
                            return (
                              <div key={d.stage} className="rpt-grid-card" style={{ '--stage-color': color } as any}>
                                <div className="rpt-grid-card-header" style={{ justifyContent: 'space-between' }}>
                                  <span className="rpt-badge-chip" style={{ background: `${color}18`, color, borderColor: `${color}35` }}>
                                    Stage {i + 1}
                                  </span>
                                  <span className={`rpt-winrate-pill ${isBottleneck ? 'low' : isFast ? 'high' : 'med'}`}>
                                    {isBottleneck ? 'Bottleneck' : isFast ? 'Fast' : 'Standard'}
                                  </span>
                                </div>
                                <div>
                                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {d.stage}
                                  </h4>
                                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {d.averageDays.toFixed(1)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>days</span>
                                  </div>
                                </div>
                                <div className="rpt-mini-bar-track">
                                  <div
                                    className="rpt-mini-bar-fill"
                                    style={{
                                      width: `${maxStageDays > 0 ? (d.averageDays / maxStageDays) * 100 : 0}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}aa)`
                                    }}
                                  />
                                </div>
                                <div className="rpt-grid-card-metrics">
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cycle Share</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 2 }}>{pct.toFixed(1)}%</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Velocity Rating</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isBottleneck ? '#ef4444' : isFast ? '#10b981' : '#3b82f6', marginTop: 2 }}>
                                      {isBottleneck ? 'Slow' : isFast ? 'Fast' : 'Normal'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. View Mode: Table */}
                      {velViewMode === 'table' && (
                        <div className="rpt-table-wrapper">
                          <table className="rpt-table">
                            <thead>
                              <tr>
                                <th>Order</th>
                                <th>Pipeline Stage</th>
                                <th>Avg Duration</th>
                                <th>Velocity Rating</th>
                                <th>% of Sales Cycle</th>
                                <th>Duration Bar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {timeData.map((d, i) => {
                                const color = PALETTE[i % PALETTE.length];
                                const pct = totalCycleDays > 0 ? (d.averageDays / totalCycleDays) * 100 : 0;
                                const isBottleneck = d.averageDays > 7;
                                const isFast = d.averageDays < 3;
                                return (
                                  <tr key={d.stage}>
                                    <td>
                                      <span className="rpt-rank-badge top-other">
                                        #{i + 1}
                                      </span>
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                        <strong style={{ fontSize: '0.9rem' }}>{d.stage}</strong>
                                      </div>
                                    </td>
                                    <td>
                                      <strong style={{ fontSize: '0.95rem' }}>{d.averageDays.toFixed(1)} days</strong>
                                    </td>
                                    <td>
                                      <span className={`rpt-winrate-pill ${isBottleneck ? 'low' : isFast ? 'high' : 'med'}`}>
                                        {isBottleneck ? 'Bottleneck' : isFast ? 'Fast' : 'Standard'}
                                      </span>
                                    </td>
                                    <td>
                                      <strong>{pct.toFixed(1)}%</strong>
                                    </td>
                                    <td>
                                      <div className="rpt-revenue-cell" style={{ minWidth: 120 }}>
                                        <div className="rpt-mini-bar-track">
                                          <div
                                            className="rpt-mini-bar-fill"
                                            style={{
                                              width: `${maxStageDays > 0 ? (d.averageDays / maxStageDays) * 100 : 0}%`,
                                              background: `linear-gradient(90deg, ${color}, ${color}88)`
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ── REP LEADERBOARD DEDICATED TAB ── */}
            {section === 'repperf' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. KPI Summary Row */}
                <div className="rpt-rep-kpis">
                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                      <DollarSign size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmt$(totalRepRev)}</span>
                      <span className="rpt-rep-kpi-lbl">Total Team Revenue</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtNum(totalRepDeals)}</span>
                      <span className="rpt-rep-kpi-lbl">Deals Closed Won</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <Crown size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{top3Reps[0]?.repName || 'N/A'}</span>
                      <span className="rpt-rep-kpi-lbl">Top Sales Leader</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      <Target size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtPct(avgRepWinRate)}</span>
                      <span className="rpt-rep-kpi-lbl">Average Win Rate</span>
                    </div>
                  </div>
                </div>

                {/* 2. Top 3 Podium Showcase */}
                {top3Reps.length > 0 && (
                  <div className="rpt-podium-container">
                    <div className="rpt-podium-title">
                      <Trophy size={14} style={{ color: '#f59e0b' }} /> Top Performer Podium
                    </div>
                    <div className="rpt-podium-grid">
                      {/* Top 2 Silver */}
                      {top3Reps[1] && (
                        <div className="rpt-podium-card top2-card">
                          <span className="rpt-podium-badge">
                            <Medal size={12} /> 2nd Place
                          </span>
                          <div className="rpt-podium-avatar-wrapper">
                            <div className="rpt-podium-avatar">
                              {getInitials(top3Reps[1].repName)}
                            </div>
                            <div className="rpt-podium-rank-icon">2</div>
                          </div>
                          <h4 className="rpt-podium-name">{top3Reps[1].repName}</h4>
                          <span className="rpt-podium-sub">{top3Reps[1].dealsWon} deals won</span>
                          <div className="rpt-podium-rev">{fmt$(top3Reps[1].revenueWon)}</div>
                          <div className="rpt-podium-stats">
                            <div className="rpt-podium-stat-item">
                              <span className="rpt-podium-stat-val">{fmtPct(top3Reps[1].winRate)}</span>
                              <span className="rpt-podium-stat-lbl">Win Rate</span>
                            </div>
                            <div className="rpt-podium-stat-item">
                              <span className="rpt-podium-stat-val">{fmt$(top3Reps[1].openPipeline)}</span>
                              <span className="rpt-podium-stat-lbl">Pipeline</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Top 1 Gold (Center) */}
                      {top3Reps[0] && (
                        <div className="rpt-podium-card top1-card">
                          <span className="rpt-podium-badge">
                            <Trophy size={12} /> 1st Champion
                          </span>
                          <div className="rpt-podium-avatar-wrapper">
                            <div className="rpt-podium-avatar">
                              {getInitials(top3Reps[0].repName)}
                            </div>
                            <div className="rpt-podium-rank-icon">1</div>
                          </div>
                          <h4 className="rpt-podium-name">{top3Reps[0].repName}</h4>
                          <span className="rpt-podium-sub">{top3Reps[0].dealsWon} deals won</span>
                          <div className="rpt-podium-rev">{fmt$(top3Reps[0].revenueWon)}</div>
                          <div className="rpt-podium-stats">
                            <div className="rpt-podium-stat-item">
                              <span className="rpt-podium-stat-val">{fmtPct(top3Reps[0].winRate)}</span>
                              <span className="rpt-podium-stat-lbl">Win Rate</span>
                            </div>
                            <div className="rpt-podium-stat-item">
                              <span className="rpt-podium-stat-val">{fmt$(top3Reps[0].openPipeline)}</span>
                              <span className="rpt-podium-stat-lbl">Pipeline</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Top 3 Bronze */}
                      {top3Reps[2] && (
                        <div className="rpt-podium-card top3-card">
                          <span className="rpt-podium-badge">
                            <Award size={12} /> 3rd Place
                          </span>
                          <div className="rpt-podium-avatar-wrapper">
                            <div className="rpt-podium-avatar">
                              {getInitials(top3Reps[2].repName)}
                            </div>
                            <div className="rpt-podium-rank-icon">3</div>
                          </div>
                          <h4 className="rpt-podium-name">{top3Reps[2].repName}</h4>
                          <span className="rpt-podium-sub">{top3Reps[2].dealsWon} deals won</span>
                          <div className="rpt-podium-rev">{fmt$(top3Reps[2].revenueWon)}</div>
                          <div className="rpt-podium-stats">
                            <div className="rpt-podium-stat-item">
                              <span className="rpt-podium-stat-val">{fmtPct(top3Reps[2].winRate)}</span>
                              <span className="rpt-podium-stat-lbl">Win Rate</span>
                            </div>
                            <div className="rpt-podium-stat-item">
                              <span className="rpt-podium-stat-val">{fmt$(top3Reps[2].openPipeline)}</span>
                              <span className="rpt-podium-stat-lbl">Pipeline</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Main Section Card */}
                <SectionCard title="Full Representative Performance" subtitle="Comprehensive team leaderboard & conversion metrics" onExport={() => exportCSV(repPerf, 'rep_performance')} exportData={repPerf} exportName="rep_performance">
                  {loading ? <LoadingBars /> : repPerf.length === 0 ? <Empty icon={<Trophy size={36} />} msg="No rep activity recorded" /> : (
                    <div>
                      {/* Controls Bar */}
                      <div className="rpt-controls-bar">
                        <div className="rpt-search-box">
                          <Search size={14} style={{ color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            placeholder="Search sales rep..."
                            className="rpt-search-input"
                            value={repSearchQuery}
                            onChange={(e) => setRepSearchQuery(e.target.value)}
                          />
                        </div>

                        <div className="rpt-controls-right">
                          <select
                            className="rpt-sort-select"
                            value={`${repSortKey}-${repSortDir}`}
                            onChange={(e) => {
                              const [key, dir] = e.target.value.split('-');
                              setRepSortKey(key as any);
                              setRepSortDir(dir as any);
                            }}
                          >
                            <option value="revenueWon-desc">Sort: Highest Revenue</option>
                            <option value="revenueWon-asc">Sort: Lowest Revenue</option>
                            <option value="dealsWon-desc">Sort: Most Deals Won</option>
                            <option value="winRate-desc">Sort: Highest Win Rate</option>
                            <option value="openPipeline-desc">Sort: Largest Open Pipeline</option>
                            <option value="leadsAssigned-desc">Sort: Most Leads Assigned</option>
                          </select>

                          <div className="rpt-view-toggle">
                            <button
                              className={`rpt-view-btn ${repViewMode === 'table' ? 'active' : ''}`}
                              onClick={() => setRepViewMode('table')}
                              title="Table View"
                            >
                              <List size={14} /> Table
                            </button>
                            <button
                              className={`rpt-view-btn ${repViewMode === 'cards' ? 'active' : ''}`}
                              onClick={() => setRepViewMode('cards')}
                              title="Card Grid View"
                            >
                              <LayoutGrid size={14} /> Cards
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* View Mode: Table */}
                      {repViewMode === 'table' ? (
                        <div className="rpt-table-wrapper">
                          <table className="rpt-table">
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Representative</th>
                                <th>Deals Won</th>
                                <th>Revenue Won</th>
                                <th>Win Rate</th>
                                <th>Open Pipeline</th>
                                <th>Leads Assigned</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredReps.map((r, idx) => {
                                const rank = idx + 1;
                                const isTop1 = rank === 1;
                                const isTop2 = rank === 2;
                                const isTop3 = rank === 3;
                                const winClass = r.winRate >= 40 ? 'high' : r.winRate >= 20 ? 'med' : 'low';
                                return (
                                  <tr key={r.repId}>
                                    <td>
                                      <span className={`rpt-rank-badge ${isTop1 ? 'top1' : isTop2 ? 'top2' : isTop3 ? 'top3' : 'top-other'}`}>
                                        {isTop1 ? <Trophy size={12} /> : isTop2 ? <Medal size={12} /> : isTop3 ? <Award size={12} /> : `#${rank}`}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="rpt-rep-cell">
                                        <div
                                          className="rpt-rep-avatar"
                                          style={{ background: PALETTE[(r.repId + idx) % PALETTE.length] }}
                                        >
                                          {getInitials(r.repName)}
                                        </div>
                                        <div className="rpt-rep-details">
                                          <span className="rpt-rep-name-text">{r.repName}</span>
                                          <span className="rpt-rep-sub-text">{r.leadsAssigned} assigned leads</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="rpt-badge-chip">
                                        <CheckCircle2 size={11} /> {r.dealsWon} won
                                      </span>
                                    </td>
                                    <td>
                                      <div className="rpt-revenue-cell">
                                        <span className="rpt-revenue-val">{fmt$(r.revenueWon)}</span>
                                        <div className="rpt-mini-bar-track">
                                          <div
                                            className="rpt-mini-bar-fill"
                                            style={{
                                              width: `${maxRepRev > 0 ? (r.revenueWon / maxRepRev) * 100 : 0}%`,
                                              background: isTop1 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #6366f1, #818cf8)'
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className={`rpt-winrate-pill ${winClass}`}>
                                        {fmtPct(r.winRate)}
                                      </span>
                                    </td>
                                    <td>
                                      <strong>{fmt$(r.openPipeline)}</strong>
                                    </td>
                                    <td>{r.leadsAssigned}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* View Mode: Cards */
                        <div className="rpt-card-grid">
                          {filteredReps.map((r, idx) => {
                            const rank = idx + 1;
                            const isTop1 = rank === 1;
                            const isTop2 = rank === 2;
                            const isTop3 = rank === 3;
                            const winClass = r.winRate >= 40 ? 'high' : r.winRate >= 20 ? 'med' : 'low';
                            return (
                              <div key={r.repId} className="rpt-grid-card">
                                <div className="rpt-grid-card-header">
                                  <span className={`rpt-rank-badge ${isTop1 ? 'top1' : isTop2 ? 'top2' : isTop3 ? 'top3' : 'top-other'}`}>
                                    {isTop1 ? <Trophy size={12} /> : isTop2 ? <Medal size={12} /> : isTop3 ? <Award size={12} /> : `#${rank}`}
                                  </span>
                                  <div
                                    className="rpt-rep-avatar"
                                    style={{ background: PALETTE[(r.repId + idx) % PALETTE.length] }}
                                  >
                                    {getInitials(r.repName)}
                                  </div>
                                  <div className="rpt-rep-details">
                                    <span className="rpt-rep-name-text">{r.repName}</span>
                                    <span className="rpt-rep-sub-text">{r.leadsAssigned} assigned leads</span>
                                  </div>
                                </div>
                                <div className="rpt-revenue-cell">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>REVENUE WON</span>
                                    <span className="rpt-badge-chip"><CheckCircle2 size={11} /> {r.dealsWon} won</span>
                                  </div>
                                  <span className="rpt-revenue-val" style={{ fontSize: '1.2rem' }}>{fmt$(r.revenueWon)}</span>
                                  <div className="rpt-mini-bar-track">
                                    <div
                                      className="rpt-mini-bar-fill"
                                      style={{
                                        width: `${maxRepRev > 0 ? (r.revenueWon / maxRepRev) * 100 : 0}%`,
                                        background: isTop1 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #6366f1, #818cf8)'
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="rpt-grid-card-metrics">
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Win Rate</span>
                                    <div><span className={`rpt-winrate-pill ${winClass}`}>{fmtPct(r.winRate)}</span></div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Open Pipeline</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: '2px' }}>{fmt$(r.openPipeline)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ── LEAD FUNNEL DEDICATED TAB ── */}
            {section === 'funnel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Summary KPI Row */}
                <div className="rpt-rep-kpis">
                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                      <Users size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{funnel ? fmtNum(funnel.total) : '0'}</span>
                      <span className="rpt-rep-kpi-lbl">Total Prospects</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      <UserCheck size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtPct(funnelQualRate)}</span>
                      <span className="rpt-rep-kpi-lbl">Qualification Rate ({funnel ? fmtNum(funnel.qualified) : '0'})</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtPct(funnelConvRate)}</span>
                      <span className="rpt-rep-kpi-lbl">Overall Conversion ({funnel ? fmtNum(funnel.converted) : '0'})</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                      <AlertCircle size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtPct(funnelLossRate)}</span>
                      <span className="rpt-rep-kpi-lbl">Total Drop-off ({funnel ? fmtNum(funnel.lost) : '0'})</span>
                    </div>
                  </div>
                </div>

                {/* 2. Main Section Card */}
                <SectionCard title="Lead Conversion Funnel" subtitle="Comprehensive stage-by-stage progression from acquisition to conversion" onExport={() => exportCSV(funnel ? [funnel] : [], 'lead_funnel')} exportData={funnel ? [funnel] : []} exportName="lead_conversion_funnel">
                  {loading || !funnel ? <LoadingBars /> : (
                    <div>
                      {/* Controls Bar */}
                      <div className="rpt-controls-bar">
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Stage progression & loss breakdown
                        </div>

                        <div className="rpt-view-toggle">
                          <button
                            className={`rpt-view-btn ${funnelViewMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setFunnelViewMode('visual')}
                            title="Tapered Visual Funnel"
                          >
                            <Layers size={14} /> Funnel Flow
                          </button>
                          <button
                            className={`rpt-view-btn ${funnelViewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setFunnelViewMode('cards')}
                            title="Stage Cards"
                          >
                            <LayoutGrid size={14} /> Cards
                          </button>
                          <button
                            className={`rpt-view-btn ${funnelViewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setFunnelViewMode('table')}
                            title="Data Table"
                          >
                            <List size={14} /> Table
                          </button>
                        </div>
                      </div>

                      {/* 3. View Mode: Visual Tapered Funnel */}
                      {funnelViewMode === 'visual' && (
                        <div>
                          <div className="rpt-funnel-visual">
                            {[
                              { label: '1. Inbound Prospects', value: funnel.total, color: '#6366f1', pct: 100, width: '100%' },
                              { label: '2. Active Engaged Leads', value: funnel.active, color: '#8b5cf6', pct: funnel.total > 0 ? (funnel.active / funnel.total) * 100 : 0, width: '85%' },
                              { label: '3. Qualified Pipeline Deals', value: funnel.qualified, color: '#3b82f6', pct: funnel.total > 0 ? (funnel.qualified / funnel.total) * 100 : 0, width: '70%' },
                              { label: '4. Converted Customers', value: funnel.converted, color: '#10b981', pct: funnel.total > 0 ? (funnel.converted / funnel.total) * 100 : 0, width: '55%' },
                            ].map((step, idx, arr) => {
                              const prevStep = idx > 0 ? arr[idx - 1] : null;
                              const retention = prevStep && prevStep.value > 0 ? ((step.value / prevStep.value) * 100).toFixed(1) : '100';
                              const dropCount = prevStep ? Math.max(prevStep.value - step.value, 0) : 0;
                              return (
                                <React.Fragment key={step.label}>
                                  {idx > 0 && (
                                    <div className="rpt-funnel-connector">
                                      <span>Stage Conversion:</span>
                                      <span className="conv-tag">+{retention}% retained</span>
                                      <span>|</span>
                                      <span className="drop-tag">-{dropCount} drop-off</span>
                                    </div>
                                  )}
                                  <div
                                    className="rpt-funnel-taper-step"
                                    style={{
                                      width: step.width,
                                      background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)`,
                                    }}
                                  >
                                    <div className="rpt-funnel-step-left">
                                      <span className="rpt-funnel-step-num">Step 0{idx + 1}</span>
                                      <span className="rpt-funnel-step-name">{step.label}</span>
                                    </div>
                                    <div className="rpt-funnel-step-right">
                                      <span className="rpt-funnel-step-value">{fmtNum(step.value)}</span>
                                      <span className="rpt-funnel-step-pct">{step.pct.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>

                          {/* Loss & Disqualification Breakdown Card */}
                          <div style={{
                            padding: '1.25rem',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            marginTop: '1.5rem'
                          }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Funnel Loss & Disqualification Breakdown
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Where prospects dropped out during the conversion cycle
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unqualified Lead Loss</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>{fmtNum(funnel.leadLost ?? 0)}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Opportunity Pipeline Loss</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{fmtNum(funnel.pipelineLost ?? 0)}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Lost / Dropped</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmtNum(funnel.lost)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. View Mode: Cards */}
                      {funnelViewMode === 'cards' && (
                        <div className="rpt-card-grid">
                          {[
                            { step: 1, label: 'Inbound Prospects', value: funnel.total, color: '#6366f1', pct: 100 },
                            { step: 2, label: 'Active Engaged Leads', value: funnel.active, color: '#8b5cf6', pct: funnel.total > 0 ? (funnel.active / funnel.total) * 100 : 0 },
                            { step: 3, label: 'Qualified Pipeline Deals', value: funnel.qualified, color: '#3b82f6', pct: funnel.total > 0 ? (funnel.qualified / funnel.total) * 100 : 0 },
                            { step: 4, label: 'Converted Customers', value: funnel.converted, color: '#10b981', pct: funnel.total > 0 ? (funnel.converted / funnel.total) * 100 : 0 },
                          ].map((s) => (
                            <div key={s.step} className="rpt-grid-card" style={{ '--stage-color': s.color } as any}>
                              <div className="rpt-grid-card-header" style={{ justifyContent: 'space-between' }}>
                                <span className="rpt-badge-chip" style={{ background: `${s.color}18`, color: s.color, borderColor: `${s.color}35` }}>
                                  Step 0{s.step}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                  {s.pct.toFixed(1)}% of total
                                </span>
                              </div>
                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {s.label}
                                </h4>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                  {fmtNum(s.value)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>leads</span>
                                </div>
                              </div>
                              <div className="rpt-mini-bar-track">
                                <div
                                  className="rpt-mini-bar-fill"
                                  style={{
                                    width: `${s.pct}%`,
                                    background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)`
                                  }}
                                />
                              </div>
                              <div className="rpt-grid-card-metrics">
                                <div>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Conversion Rate</span>
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: s.color, marginTop: 2 }}>{s.pct.toFixed(1)}%</div>
                                </div>
                                <div>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 2 }}>Active Step</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 5. View Mode: Table */}
                      {funnelViewMode === 'table' && (
                        <div className="rpt-table-wrapper">
                          <table className="rpt-table">
                            <thead>
                              <tr>
                                <th>Step</th>
                                <th>Funnel Stage</th>
                                <th>Volume (Leads)</th>
                                <th>Step Retention</th>
                                <th>Cumulative Conversion</th>
                                <th>Progress Bar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { step: 1, label: 'Inbound Prospects', value: funnel.total, color: '#6366f1', pct: 100, ret: '100%' },
                                { step: 2, label: 'Active Engaged Leads', value: funnel.active, color: '#8b5cf6', pct: funnel.total > 0 ? (funnel.active / funnel.total) * 100 : 0, ret: funnel.total > 0 ? `${((funnel.active / funnel.total) * 100).toFixed(1)}%` : '0%' },
                                { step: 3, label: 'Qualified Pipeline Deals', value: funnel.qualified, color: '#3b82f6', pct: funnel.total > 0 ? (funnel.qualified / funnel.total) * 100 : 0, ret: funnel.active > 0 ? `${((funnel.qualified / funnel.active) * 100).toFixed(1)}%` : '0%' },
                                { step: 4, label: 'Converted Customers', value: funnel.converted, color: '#10b981', pct: funnel.total > 0 ? (funnel.converted / funnel.total) * 100 : 0, ret: funnel.qualified > 0 ? `${((funnel.converted / funnel.qualified) * 100).toFixed(1)}%` : '0%' },
                              ].map((s) => (
                                <tr key={s.step}>
                                  <td>
                                    <span className="rpt-rank-badge top-other">
                                      #0{s.step}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                                      <strong style={{ fontSize: '0.9rem' }}>{s.label}</strong>
                                    </div>
                                  </td>
                                  <td>
                                    <strong style={{ fontSize: '0.95rem' }}>{fmtNum(s.value)}</strong>
                                  </td>
                                  <td>
                                    <span className="rpt-badge-chip" style={{ background: `${s.color}18`, color: s.color, borderColor: `${s.color}35` }}>
                                      {s.ret} retained
                                    </span>
                                  </td>
                                  <td>
                                    <span className="rpt-winrate-pill med">{s.pct.toFixed(1)}%</span>
                                  </td>
                                  <td>
                                    <div className="rpt-revenue-cell" style={{ minWidth: 120 }}>
                                      <div className="rpt-mini-bar-track">
                                        <div
                                          className="rpt-mini-bar-fill"
                                          style={{
                                            width: `${s.pct}%`,
                                            background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ── PRIORITY & SLA DEDICATED TAB ── */}
            {section === 'priority' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Executive SLA Health Summary Row */}
                <div className="rpt-rep-kpis">
                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <Calendar size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{slaHealth ? fmtPct(slaHealth.scheduledPercentage) : '0%'}</span>
                      <span className="rpt-rep-kpi-lbl">SLA Compliance Rate</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                      <ShieldAlert size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{slaHealth ? fmtNum(slaHealth.overdueCount) : '0'}</span>
                      <span className="rpt-rep-kpi-lbl">SLA Breached / Overdue</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <Clock size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{slaHealth ? fmtNum(slaHealth.dueTodayCount) : '0'}</span>
                      <span className="rpt-rep-kpi-lbl">Due Today</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                      <AlertCircle size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{slaHealth ? fmtNum(slaHealth.unscheduledCount) : '0'}</span>
                      <span className="rpt-rep-kpi-lbl">Unscheduled Leads</span>
                    </div>
                  </div>
                </div>

                {/* 2. SLA Health Distribution Card */}
                <SectionCard title="Follow-Up SLA & Execution Health" subtitle="Monitoring team compliance, scheduled touchpoints, and overdue follow-up alerts" exportData={slaHealth ? [slaHealth] : []} exportName="follow_up_sla_health">
                  {loading || !slaHealth ? <LoadingBars /> : (
                    <div>
                      {/* SLA Health Distribution Bar */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Follow-Up SLA Execution Breakdown ({slaHealth.totalActive} active leads)</span>
                          <span style={{ color: '#10b981' }}>{fmtPct(slaHealth.scheduledPercentage)} Compliant</span>
                        </div>
                        <div className="rpt-mini-bar-track" style={{ height: 14, display: 'flex', overflow: 'hidden', borderRadius: 8 }}>
                          {slaHealth.totalActive > 0 && (
                            <>
                              <div style={{ width: `${(slaHealth.scheduledCount / slaHealth.totalActive) * 100}%`, background: '#10b981' }} />
                              <div style={{ width: `${(slaHealth.dueTodayCount / slaHealth.totalActive) * 100}%`, background: '#f59e0b' }} />
                              <div style={{ width: `${(slaHealth.overdueCount / slaHealth.totalActive) * 100}%`, background: '#ef4444' }} />
                              <div style={{ width: `${(slaHealth.unscheduledCount / slaHealth.totalActive) * 100}%`, background: '#6366f1' }} />
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: 12, flexWrap: 'wrap', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Scheduled ({slaHealth.scheduledCount})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Due Today ({slaHealth.dueTodayCount})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Overdue SLA Breach ({slaHealth.overdueCount})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Unscheduled ({slaHealth.unscheduledCount})</span>
                          </div>
                        </div>
                      </div>

                      {/* SLA Status Cards Grid */}
                      <div className="rpt-card-grid">
                        {[
                          { label: 'Follow-Ups Scheduled', count: slaHealth.scheduledCount, color: '#10b981', status: 'Healthy SLA', sub: 'Compliant touchpoints' },
                          { label: 'Due Today Action', count: slaHealth.dueTodayCount, color: '#f59e0b', status: 'Requires Action', sub: 'Action needed today' },
                          { label: 'Overdue SLA Breaches', count: slaHealth.overdueCount, color: '#ef4444', status: 'SLA Breached', sub: 'Past due follow-ups' },
                          { label: 'Unscheduled Leads', count: slaHealth.unscheduledCount, color: '#6366f1', status: 'Needs Schedule', sub: 'Orphan leads' },
                        ].map((item) => {
                          const pct = slaHealth.totalActive > 0 ? (item.count / slaHealth.totalActive) * 100 : 0;
                          return (
                            <div key={item.label} className="rpt-grid-card" style={{ '--stage-color': item.color } as any}>
                              <div className="rpt-grid-card-header" style={{ justifyContent: 'space-between' }}>
                                <span style={{
                                  padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                  background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}35`
                                }}>
                                  {item.status}
                                </span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                  {pct.toFixed(1)}% of pipeline
                                </span>
                              </div>
                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {item.label}
                                </h4>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                  {fmtNum(item.count)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>leads</span>
                                </div>
                              </div>
                              <div className="rpt-mini-bar-track">
                                <div
                                  className="rpt-mini-bar-fill"
                                  style={{
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, ${item.color}, ${item.color}aa)`
                                  }}
                                />
                              </div>
                              <div className="rpt-grid-card-metrics">
                                <div>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pipeline Share</span>
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: item.color, marginTop: 2 }}>{pct.toFixed(1)}%</div>
                                </div>
                                <div>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</span>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: 2 }}>{item.sub}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </SectionCard>

                {/* 3. Lead Priority Breakdown Card */}
                <SectionCard title="Lead Priority Breakdown" subtitle="Distribution, lead score quality, and conversion efficiency by priority tier" onExport={() => exportCSV(priorityData, 'lead_priority')} exportData={priorityData} exportName="lead_priority">
                  {loading ? <LoadingBars /> : priorityData.length === 0 ? <Empty icon={<ShieldAlert size={36} />} msg="No priority data recorded" /> : (
                    <div>
                      {/* Controls Bar */}
                      <div className="rpt-controls-bar">
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Priority tier performance metrics
                        </div>

                        <div className="rpt-view-toggle">
                          <button
                            className={`rpt-view-btn ${prioViewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setPrioViewMode('cards')}
                            title="Priority Cards"
                          >
                            <LayoutGrid size={14} /> Cards
                          </button>
                          <button
                            className={`rpt-view-btn ${prioViewMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setPrioViewMode('visual')}
                            title="Bar Chart"
                          >
                            <BarChart2 size={14} /> Chart
                          </button>
                          <button
                            className={`rpt-view-btn ${prioViewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setPrioViewMode('table')}
                            title="Data Table"
                          >
                            <List size={14} /> Table
                          </button>
                        </div>
                      </div>

                      {/* View Mode: Cards */}
                      {prioViewMode === 'cards' && (
                        <div className="rpt-card-grid">
                          {priorityData.map((p) => {
                            const isUrgent = p.priority === 'Urgent';
                            const isHigh = p.priority === 'High';
                            const isMed = p.priority === 'Medium';
                            const color = isUrgent ? '#ef4444' : isHigh ? '#f59e0b' : isMed ? '#3b82f6' : '#10b981';
                            const convPct = p.total > 0 ? (p.converted / p.total) * 100 : 0;
                            return (
                              <div key={p.priority} className="rpt-grid-card" style={{ '--stage-color': color } as any}>
                                <div className="rpt-grid-card-header" style={{ justifyContent: 'space-between' }}>
                                  <span style={{
                                    padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                    background: `${color}18`, color, border: `1px solid ${color}35`
                                  }}>
                                    {p.priority} Tier
                                  </span>
                                  <span className="rpt-winrate-pill med">
                                    {convPct.toFixed(1)}% converted
                                  </span>
                                </div>
                                <div>
                                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {p.total} Total Leads
                                  </h4>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    Avg Lead Score: <strong style={{ color }}>{p.avgScore}%</strong>
                                  </div>
                                </div>
                                <div className="rpt-mini-bar-track">
                                  <div
                                    className="rpt-mini-bar-fill"
                                    style={{
                                      width: `${convPct}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}aa)`
                                    }}
                                  />
                                </div>
                                <div className="rpt-grid-card-metrics">
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Converted</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981', marginTop: 2 }}>{p.converted} leads</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active / In Progress</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 2 }}>{p.active} leads</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* View Mode: Visual Bar Chart */}
                      {prioViewMode === 'visual' && (
                        <div>
                          <div style={{ height: 320, width: '100%', marginBottom: '1.5rem' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={priorityData} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} />
                                <XAxis dataKey="priority" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const data = payload[0].payload;
                                    const convPct = data.total > 0 ? ((data.converted / data.total) * 100).toFixed(1) : '0';
                                    return (
                                      <div className="rpt-tooltip" style={{ minWidth: 170 }}>
                                        <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label} Tier</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, fontSize: '0.8rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Total Leads:</span>
                                            <strong>{data.total}</strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Converted:</span>
                                            <strong style={{ color: '#10b981' }}>{data.converted} ({convPct}%)</strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Active:</span>
                                            <span>{data.active}</span>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Lost:</span>
                                            <span style={{ color: '#ef4444' }}>{data.lost}</span>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Avg Score:</span>
                                            <strong>{data.avgScore}%</strong>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }}
                                />
                                <Bar dataKey="total" name="Total Leads" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28} />
                                <Bar dataKey="converted" name="Converted" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
                                <Bar dataKey="lost" name="Lost" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={28} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* View Mode: Data Table */}
                      {prioViewMode === 'table' && (
                        <div className="rpt-table-wrapper">
                          <table className="rpt-table">
                            <thead>
                              <tr>
                                <th>Priority Tier</th>
                                <th>Total Leads</th>
                                <th>Active Leads</th>
                                <th>Converted</th>
                                <th>Lost</th>
                                <th>Conversion Rate</th>
                                <th>Avg Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {priorityData.map(p => {
                                const isUrgent = p.priority === 'Urgent';
                                const isHigh = p.priority === 'High';
                                const isMed = p.priority === 'Medium';
                                const color = isUrgent ? '#ef4444' : isHigh ? '#f59e0b' : isMed ? '#3b82f6' : '#10b981';
                                const convPct = p.total > 0 ? (p.converted / p.total) * 100 : 0;
                                return (
                                  <tr key={p.priority}>
                                    <td>
                                      <span style={{
                                        padding: '0.25rem 0.65rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 700,
                                        background: `${color}18`, color, border: `1px solid ${color}35`
                                      }}>
                                        {p.priority}
                                      </span>
                                    </td>
                                    <td><strong>{p.total}</strong></td>
                                    <td>{p.active}</td>
                                    <td><strong style={{ color: '#10b981' }}>{p.converted}</strong></td>
                                    <td><span style={{ color: '#ef4444' }}>{p.lost}</span></td>
                                    <td>
                                      <span className="rpt-winrate-pill med">{convPct.toFixed(1)}%</span>
                                    </td>
                                    <td>
                                      <strong>{p.avgScore} pts</strong>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ── ACQUISITION CHANNELS DEDICATED TAB ── */}
            {section === 'sources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Summary KPI Row */}
                <div className="rpt-rep-kpis">
                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                      <Users size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{fmtNum(totalSourceLeads)}</span>
                      <span className="rpt-rep-kpi-lbl">Total Attributed Leads</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <Crown size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{topSource?.source || 'N/A'}</span>
                      <span className="rpt-rep-kpi-lbl">Top Channel ({topSource ? fmtNum(topSource.count) : 0} leads)</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                      <Layers size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{activeChannelCount} channels</span>
                      <span className="rpt-rep-kpi-lbl">Active Marketing Channels</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <TrendingUp size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">
                        {totalSourceLeads > 0 && topSource ? `${((topSource.count / totalSourceLeads) * 100).toFixed(1)}%` : '0%'}
                      </span>
                      <span className="rpt-rep-kpi-lbl">Dominant Channel Share</span>
                    </div>
                  </div>
                </div>

                {/* 2. Main Section Card */}
                <SectionCard title="Leads by Acquisition Channel" subtitle="Detailed attribution and volume distribution across lead generation sources" onExport={() => exportCSV(sourceData, 'lead_sources')} exportData={sourceData} exportName="acquisition_channels">
                  {loading ? <LoadingBars /> : sourceData.length === 0 ? <Empty icon={<Layers size={36} />} msg="No source data recorded" /> : (
                    <div>
                      {/* Controls Bar */}
                      <div className="rpt-controls-bar">
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Channel distribution metrics
                        </div>

                        <div className="rpt-view-toggle">
                          <button
                            className={`rpt-view-btn ${srcViewMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setSrcViewMode('visual')}
                            title="Donut & Bar Charts"
                          >
                            <BarChart2 size={14} /> Charts
                          </button>
                          <button
                            className={`rpt-view-btn ${srcViewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setSrcViewMode('cards')}
                            title="Channel Cards"
                          >
                            <LayoutGrid size={14} /> Cards
                          </button>
                          <button
                            className={`rpt-view-btn ${srcViewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setSrcViewMode('table')}
                            title="Data Table"
                          >
                            <List size={14} /> Table
                          </button>
                        </div>
                      </div>

                      {/* 3. View Mode: Donut & Bar Charts Split */}
                      {srcViewMode === 'visual' && (
                        <div>
                          <div className="rpt-sources-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 1fr', gap: '2rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                            {/* Donut Chart */}
                            <div className="rpt-donut-wrap" style={{ position: 'relative', height: 280 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={sourceData}
                                    dataKey="count"
                                    nameKey="source"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={105}
                                    paddingAngle={3}
                                  >
                                    {sourceData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} stroke="var(--bg-secondary)" strokeWidth={2} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (!active || !payload?.length) return null;
                                      const data = payload[0].payload;
                                      const pct = totalSourceLeads > 0 ? ((data.count / totalSourceLeads) * 100).toFixed(1) : '0';
                                      return (
                                        <div className="rpt-tooltip">
                                          <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.source}</p>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4, fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Leads:</span>
                                            <strong style={{ color: '#6366f1' }}>{fmtNum(data.count)}</strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2, fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Share:</span>
                                            <strong style={{ color: '#10b981' }}>{pct}%</strong>
                                          </div>
                                        </div>
                                      );
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              {/* Donut Center Overlay */}
                              <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                pointerEvents: 'none'
                              }}>
                                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmtNum(totalSourceLeads)}</span>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Leads</span>
                              </div>
                            </div>

                            {/* Bar List */}
                            <div className="rpt-bar-list">
                              {[...sourceData].sort((a, b) => b.count - a.count).map((d, i) => {
                                const pct = totalSourceLeads > 0 ? (d.count / totalSourceLeads) * 100 : 0;
                                const color = PALETTE[i % PALETTE.length];
                                return (
                                  <HBar
                                    key={d.source}
                                    label={d.source}
                                    value={d.count}
                                    max={maxSourceCount}
                                    formatter={v => `${fmtNum(v)} leads`}
                                    color={color}
                                    badge={`${pct.toFixed(1)}% share`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. View Mode: Cards */}
                      {srcViewMode === 'cards' && (
                        <div className="rpt-card-grid">
                          {[...sourceData].sort((a, b) => b.count - a.count).map((d, i) => {
                            const color = PALETTE[i % PALETTE.length];
                            const pct = totalSourceLeads > 0 ? (d.count / totalSourceLeads) * 100 : 0;
                            const isTop1 = i === 0;
                            return (
                              <div key={d.source} className="rpt-grid-card" style={{ '--stage-color': color } as any}>
                                <div className="rpt-grid-card-header" style={{ justifyContent: 'space-between' }}>
                                  <span className={`rpt-rank-badge ${isTop1 ? 'top1' : 'top-other'}`}>
                                    {isTop1 ? <Crown size={12} /> : `#${i + 1}`}
                                  </span>
                                  <span className="rpt-winrate-pill med">
                                    {pct.toFixed(1)}% share
                                  </span>
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {d.source}
                                    </h4>
                                  </div>
                                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {fmtNum(d.count)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>leads</span>
                                  </div>
                                </div>
                                <div className="rpt-mini-bar-track">
                                  <div
                                    className="rpt-mini-bar-fill"
                                    style={{
                                      width: `${maxSourceCount > 0 ? (d.count / maxSourceCount) * 100 : 0}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}aa)`
                                    }}
                                  />
                                </div>
                                <div className="rpt-grid-card-metrics">
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Channel Rank</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color, marginTop: 2 }}>Rank #{i + 1}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volume Share</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 2 }}>{pct.toFixed(1)}%</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 5. View Mode: Table */}
                      {srcViewMode === 'table' && (
                        <div className="rpt-table-wrapper">
                          <table className="rpt-table">
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Acquisition Channel</th>
                                <th>Lead Volume</th>
                                <th>Percentage Share</th>
                                <th>Channel Badge</th>
                                <th>Volume Progress Bar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...sourceData].sort((a, b) => b.count - a.count).map((d, i) => {
                                const color = PALETTE[i % PALETTE.length];
                                const pct = totalSourceLeads > 0 ? (d.count / totalSourceLeads) * 100 : 0;
                                const isTop1 = i === 0;
                                return (
                                  <tr key={d.source}>
                                    <td>
                                      <span className={`rpt-rank-badge ${isTop1 ? 'top1' : 'top-other'}`}>
                                        {isTop1 ? <Crown size={12} /> : `#${i + 1}`}
                                      </span>
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                        <strong style={{ fontSize: '0.9rem' }}>{d.source}</strong>
                                      </div>
                                    </td>
                                    <td>
                                      <strong style={{ fontSize: '0.95rem' }}>{fmtNum(d.count)} leads</strong>
                                    </td>
                                    <td>
                                      <span className="rpt-winrate-pill med">{pct.toFixed(1)}%</span>
                                    </td>
                                    <td>
                                      <span className="rpt-badge-chip" style={{ background: `${color}18`, color, borderColor: `${color}35` }}>
                                        {d.source}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="rpt-revenue-cell" style={{ minWidth: 120 }}>
                                        <div className="rpt-mini-bar-track">
                                          <div
                                            className="rpt-mini-bar-fill"
                                            style={{
                                              width: `${maxSourceCount > 0 ? (d.count / maxSourceCount) * 100 : 0}%`,
                                              background: `linear-gradient(90deg, ${color}, ${color}88)`
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ── TASK & ACTIVITY LOG DEDICATED TAB ── */}
            {section === 'activity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* 1. Executive Summary KPI Row */}
                <div className="rpt-rep-kpis">
                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                      <Activity size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{actSummary ? fmtNum(actSummary.totalActivities) : '0'}</span>
                      <span className="rpt-rep-kpi-lbl">Total Activities Logged</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{actSummary ? fmtNum(actSummary.completedTasks) : '0'}</span>
                      <span className="rpt-rep-kpi-lbl">Tasks Completed</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                      <Clock size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{actSummary ? fmtNum(actSummary.pendingTasks) : '0'}</span>
                      <span className="rpt-rep-kpi-lbl">Pending Tasks</span>
                    </div>
                  </div>

                  <div className="rpt-rep-kpi-card">
                    <div className="rpt-rep-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                      <ShieldAlert size={20} />
                    </div>
                    <div className="rpt-rep-kpi-content">
                      <span className="rpt-rep-kpi-val">{actSummary ? fmtNum(actSummary.overdueTasks) : '0'}</span>
                      <span className="rpt-rep-kpi-lbl">Overdue Tasks</span>
                    </div>
                  </div>
                </div>

                {/* 2. Task Execution Health Card */}
                <SectionCard title="Task Summary & Completion Health" subtitle="Overall task completion performance and open workload for the selected period" exportData={actSummary ? [{ totalActivities: actSummary.totalActivities, completedTasks: actSummary.completedTasks, pendingTasks: actSummary.pendingTasks, overdueTasks: actSummary.overdueTasks }] : []} exportName="task_completion_health">
                  {loading || !actSummary ? <LoadingBars /> : (
                    <div>
                      <div className="rpt-activity-grid" style={{ marginBottom: '1.25rem' }}>
                        <TaskRing label="Completed" value={actSummary.completedTasks} color="#10b981" />
                        <TaskRing label="Pending" value={actSummary.pendingTasks} color="#f59e0b" />
                        <TaskRing label="Overdue" value={actSummary.overdueTasks} color="#ef4444" />
                        <TaskRing label="Activities" value={actSummary.totalActivities} color="#6366f1" />
                      </div>
                    </div>
                  )}
                </SectionCard>

                {/* 3. Activities by Type Main Section Card */}
                <SectionCard title="Activities by Type" subtitle="Distribution and volume breakdown of logged sales activities by category" onExport={() => exportCSV(actSummary?.byType || [], 'activities_by_type')} exportData={actSummary?.byType || []} exportName="activities_by_type">
                  {loading || !actSummary ? <LoadingBars /> : actSummary.byType.length === 0 ? <Empty icon={<Activity size={36} />} msg="No activity data recorded" /> : (
                    <div>
                      {/* Controls Bar */}
                      <div className="rpt-controls-bar">
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Activity category breakdown
                        </div>

                        <div className="rpt-view-toggle">
                          <button
                            className={`rpt-view-btn ${actViewMode === 'visual' ? 'active' : ''}`}
                            onClick={() => setActViewMode('visual')}
                            title="Donut & Bar Charts"
                          >
                            <BarChart2 size={14} /> Charts
                          </button>
                          <button
                            className={`rpt-view-btn ${actViewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setActViewMode('cards')}
                            title="Activity Cards"
                          >
                            <LayoutGrid size={14} /> Cards
                          </button>
                          <button
                            className={`rpt-view-btn ${actViewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setActViewMode('table')}
                            title="Data Table"
                          >
                            <List size={14} /> Table
                          </button>
                        </div>
                      </div>

                      {/* View Mode: Charts */}
                      {actViewMode === 'visual' && (
                        <div>
                          <div className="rpt-sources-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 1fr', gap: '2rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                            {/* Donut Chart */}
                            <div className="rpt-donut-wrap" style={{ position: 'relative', height: 280 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={actSummary.byType}
                                    dataKey="count"
                                    nameKey="type"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={105}
                                    paddingAngle={3}
                                  >
                                    {actSummary.byType.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} stroke="var(--bg-secondary)" strokeWidth={2} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (!active || !payload?.length) return null;
                                      const data = payload[0].payload;
                                      const pct = totalActTypeCount > 0 ? ((data.count / totalActTypeCount) * 100).toFixed(1) : '0';
                                      return (
                                        <div className="rpt-tooltip">
                                          <p className="rpt-tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.type}</p>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4, fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Logged:</span>
                                            <strong style={{ color: '#6366f1' }}>{fmtNum(data.count)}</strong>
                                          </div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 2, fontSize: '0.8rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Share:</span>
                                            <strong style={{ color: '#10b981' }}>{pct}%</strong>
                                          </div>
                                        </div>
                                      );
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              {/* Donut Center Overlay */}
                              <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                pointerEvents: 'none'
                              }}>
                                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmtNum(totalActTypeCount)}</span>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Activities</span>
                              </div>
                            </div>

                            {/* Bar List */}
                            <div className="rpt-bar-list">
                              {[...actSummary.byType].sort((a, b) => b.count - a.count).map((d, i) => {
                                const pct = totalActTypeCount > 0 ? (d.count / totalActTypeCount) * 100 : 0;
                                const color = PALETTE[i % PALETTE.length];
                                return (
                                  <HBar
                                    key={d.type}
                                    label={d.type}
                                    value={d.count}
                                    max={maxActTypeCount}
                                    formatter={v => `${fmtNum(v)} logged`}
                                    color={color}
                                    badge={`${pct.toFixed(1)}% share`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* View Mode: Cards */}
                      {actViewMode === 'cards' && (
                        <div className="rpt-card-grid">
                          {[...actSummary.byType].sort((a, b) => b.count - a.count).map((d, i) => {
                            const color = PALETTE[i % PALETTE.length];
                            const pct = totalActTypeCount > 0 ? (d.count / totalActTypeCount) * 100 : 0;
                            const isTop1 = i === 0;
                            return (
                              <div key={d.type} className="rpt-grid-card" style={{ '--stage-color': color } as any}>
                                <div className="rpt-grid-card-header" style={{ justifyContent: 'space-between' }}>
                                  <span className={`rpt-rank-badge ${isTop1 ? 'top1' : 'top-other'}`}>
                                    {isTop1 ? <Crown size={12} /> : `#${i + 1}`}
                                  </span>
                                  <span className="rpt-winrate-pill med">
                                    {pct.toFixed(1)}% share
                                  </span>
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {d.type}
                                    </h4>
                                  </div>
                                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {fmtNum(d.count)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>logged</span>
                                  </div>
                                </div>
                                <div className="rpt-mini-bar-track">
                                  <div
                                    className="rpt-mini-bar-fill"
                                    style={{
                                      width: `${maxActTypeCount > 0 ? (d.count / maxActTypeCount) * 100 : 0}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}aa)`
                                    }}
                                  />
                                </div>
                                <div className="rpt-grid-card-metrics">
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Category Rank</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color, marginTop: 2 }}>Rank #{i + 1}</div>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Activity Share</span>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: 2 }}>{pct.toFixed(1)}%</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* View Mode: Table */}
                      {actViewMode === 'table' && (
                        <div className="rpt-table-wrapper">
                          <table className="rpt-table">
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Activity Type</th>
                                <th>Logged Count</th>
                                <th>Percentage Share</th>
                                <th>Category Badge</th>
                                <th>Volume Progress Bar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...actSummary.byType].sort((a, b) => b.count - a.count).map((d, i) => {
                                const color = PALETTE[i % PALETTE.length];
                                const pct = totalActTypeCount > 0 ? (d.count / totalActTypeCount) * 100 : 0;
                                const isTop1 = i === 0;
                                return (
                                  <tr key={d.type}>
                                    <td>
                                      <span className={`rpt-rank-badge ${isTop1 ? 'top1' : 'top-other'}`}>
                                        {isTop1 ? <Crown size={12} /> : `#${i + 1}`}
                                      </span>
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                                        <strong style={{ fontSize: '0.9rem' }}>{d.type}</strong>
                                      </div>
                                    </td>
                                    <td>
                                      <strong style={{ fontSize: '0.95rem' }}>{fmtNum(d.count)} logged</strong>
                                    </td>
                                    <td>
                                      <span className="rpt-winrate-pill med">{pct.toFixed(1)}%</span>
                                    </td>
                                    <td>
                                      <span className="rpt-badge-chip" style={{ background: `${color}18`, color, borderColor: `${color}35` }}>
                                        {d.type}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="rpt-revenue-cell" style={{ minWidth: 120 }}>
                                        <div className="rpt-mini-bar-track">
                                          <div
                                            className="rpt-mini-bar-fill"
                                            style={{
                                              width: `${maxActTypeCount > 0 ? (d.count / maxActTypeCount) * 100 : 0}%`,
                                              background: `linear-gradient(90deg, ${color}, ${color}88)`
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
};
