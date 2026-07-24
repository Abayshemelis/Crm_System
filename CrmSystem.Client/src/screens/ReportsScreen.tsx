import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { api } from '../lib/api';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, Clock, Target, DollarSign, Download, RefreshCw,
  BarChart2, Activity, Layers, Zap, ChevronRight,
  ArrowUpRight, ArrowDownRight, Users, UserCheck,
  CheckCircle2, AlertCircle, Medal, Trophy,
} from 'lucide-react';
import './reports.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PipelineItem   { stage: string; value: number; count?: number }
interface WinRateItem    { month: string; winRate: number }
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
}

interface ActivitySummary {
  totalActivities: number;
  byType: { type: string; count: number }[];
  completedTasks: number; pendingTasks: number; overdueTasks: number;
}

type Section = 'overview' | 'pipeline' | 'winrate' | 'velocity' | 'sources' | 'repperf' | 'funnel' | 'activity';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PALETTE = ['#6366f1','#8b5cf6','#ec4899','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4'];
const fmt$   = (v: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
const fmtNum = (v: number) => new Intl.NumberFormat('en-US').format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtK   = (v: number) => v >= 1000 ? `$${(v/1000).toFixed(1)}k` : fmt$(v);

function exportCSV(data: any[], name: string) {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k]??''}"`).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows],{type:'text/csv'}));
  a.download = `${name}.csv`; a.click();
}

// ─── Shared sub-components ────────────────────────────────────────────────────
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

const SectionCard: React.FC<{ title:string; subtitle?:string; onExport?:()=>void; children:React.ReactNode }> =
  ({ title, subtitle, onExport, children }) => (
    <div className="rpt-section-card">
      <div className="rpt-section-header">
        <div>
          <h3 className="rpt-section-title">{title}</h3>
          {subtitle && <p className="rpt-section-subtitle">{subtitle}</p>}
        </div>
        {onExport && (
          <button className="rpt-export-btn" onClick={onExport}>
            <Download size={13}/> Export CSV
          </button>
        )}
      </div>
      <div className="rpt-section-body">{children}</div>
    </div>
  );

const HeadlineStat: React.FC<{ label:string; value:string; color?:string }> =
  ({ label, value, color }) => (
    <div>
      <p className="rpt-headline-label">{label}</p>
      <p className="rpt-headline-value" style={color ? { color } : {}}>{value}</p>
    </div>
  );

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode; group: string }[] = [
  { id:'overview',  label:'Overview',      icon:<BarChart2 size={16}/>,    group:'Summary' },
  { id:'pipeline',  label:'Pipeline',      icon:<DollarSign size={16}/>,   group:'Sales' },
  { id:'winrate',   label:'Win Rate',      icon:<Target size={16}/>,       group:'Sales' },
  { id:'velocity',  label:'Velocity',      icon:<Zap size={16}/>,          group:'Sales' },
  { id:'repperf',   label:'Rep Leaderboard', icon:<Trophy size={16}/>,    group:'People' },
  { id:'funnel',    label:'Lead Funnel',   icon:<Layers size={16}/>,       group:'Leads' },
  { id:'sources',   label:'Lead Sources',  icon:<TrendingUp size={16}/>,   group:'Leads' },
  { id:'activity',  label:'Activities',    icon:<Activity size={16}/>,     group:'Tasks' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const ReportsScreen: React.FC = () => {
  const today  = new Date().toISOString().split('T')[0];
  const m30    = new Date(Date.now() -  30 * 86400_000).toISOString().split('T')[0];
  const m90    = new Date(Date.now() -  90 * 86400_000).toISOString().split('T')[0];
  const m365   = new Date(Date.now() - 365 * 86400_000).toISOString().split('T')[0];

  const PRESETS = [
    { label:'Last 30 days', start:m30,  end:today },
    { label:'Last 90 days', start:m90,  end:today },
    { label:'Last year',    start:m365, end:today },
  ] as const;

  const [startDate,    setStartDate]    = useState(m30);
  const [endDate,      setEndDate]      = useState(today);
  const [activePreset, setActivePreset] = useState<string>('Last 30 days');
  const [section,      setSection]      = useState<Section>('overview');
  const [loading,      setLoading]      = useState(true);

  // Data state
  const [pipelineData, setPipelineData] = useState<PipelineItem[]>([]);
  const [winRateData,  setWinRateData]  = useState<WinRateItem[]>([]);
  const [timeData,     setTimeData]     = useState<TimeItem[]>([]);
  const [sourceData,   setSourceData]   = useState<LeadSrcItem[]>([]);
  const [overview,     setOverview]     = useState<OverviewData | null>(null);
  const [repPerf,      setRepPerf]      = useState<RepPerfItem[]>([]);
  const [funnel,       setFunnel]       = useState<FunnelData | null>(null);
  const [actSummary,   setActSummary]   = useState<ActivitySummary | null>(null);

  const load = useCallback(async (s: string, e: string) => {
    setLoading(true);
    try {
      const q = `?startDate=${s}&endDate=${e}`;
      const [pipe, win, time, src, ov, rep, fn, act] = await Promise.all([
        api.get<PipelineItem[]>(`/api/reports/pipeline-by-stage${q}`),
        api.get<{ byMonth: WinRateItem[] }>(`/api/reports/win-rate${q}`),
        api.get<TimeItem[]>(`/api/reports/time-per-stage${q}`),
        api.get<LeadSrcItem[]>(`/api/reports/lead-source${q}`),
        api.get<OverviewData>(`/api/reports/overview${q}`),
        api.get<RepPerfItem[]>(`/api/reports/rep-performance${q}`),
        api.get<FunnelData>(`/api/reports/funnel${q}`),
        api.get<ActivitySummary>(`/api/reports/activity-summary${q}`),
      ]);
      setPipelineData((pipe as any) ?? []);
      setWinRateData(((win as any)?.byMonth) ?? []);
      setTimeData((time as any) ?? []);
      setSourceData((src as any) ?? []);
      setOverview((ov as any) ?? null);
      setRepPerf((rep as any) ?? []);
      setFunnel((fn as any) ?? null);
      setActSummary((act as any) ?? null);
    } catch (err) { console.error('Reports load error', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(startDate, endDate); }, []);

  // Derived
  const totalPipeline = useMemo(() => pipelineData.reduce((s,i)=>s+(i.value??0),0), [pipelineData]);
  const avgWinRate    = useMemo(() => winRateData.length ? winRateData.reduce((s,i)=>s+(i.winRate??0),0)/winRateData.length : 0, [winRateData]);
  const avgVelocity   = useMemo(() => timeData.length ? timeData.reduce((s,i)=>s+(i.averageDays??0),0)/timeData.length : 0, [timeData]);
  const maxPipeline   = useMemo(() => Math.max(...pipelineData.map(d=>d.value),1), [pipelineData]);
  const maxSource     = useMemo(() => Math.max(...sourceData.map(d=>d.count),1), [sourceData]);
  const maxRepRev     = useMemo(() => Math.max(...repPerf.map(r=>r.revenueWon),1), [repPerf]);

  const applyPreset = (p: typeof PRESETS[number]) => {
    setStartDate(p.start); setEndDate(p.end); setActivePreset(p.label); load(p.start,p.end);
  };

  // Nav groups
  const groups = Array.from(new Set(NAV_ITEMS.map(n => n.group)));

  return (
    <Layout>
      <div className="rpt-root">

        {/* ── Header ── */}
        <div className="rpt-header">
          <div>
            <p className="rpt-eyebrow">Analytics</p>
            <h1 className="rpt-title">Reports</h1>
            <p className="rpt-desc">Sales performance, pipeline health, and conversion insights.</p>
          </div>
          <div className="rpt-filter-bar">
            {PRESETS.map(p => (
              <button key={p.label} className={`rpt-preset-btn${activePreset===p.label?' active':''}`} onClick={()=>applyPreset(p)}>
                {p.label}
              </button>
            ))}
            <div className="rpt-divider"/>
            <input type="date" className="rpt-date-input" value={startDate} onChange={e=>setStartDate(e.target.value)}/>
            <span className="rpt-arrow">→</span>
            <input type="date" className="rpt-date-input" value={endDate} onChange={e=>setEndDate(e.target.value)}/>
            <button className="rpt-apply-btn" onClick={()=>{setActivePreset('');load(startDate,endDate);}}>
              <RefreshCw size={13} className={loading?'rpt-spin':''}/> Apply
            </button>
          </div>
        </div>

        {/* ── Top KPI row ── */}
        <div className="rpt-kpi-grid">
          <StatCard label="Total Pipeline"   value={loading?'…':fmt$(totalPipeline)}         sub="open stages"        icon={<DollarSign size={18}/>} color="#6366f1" loading={loading}/>
          <StatCard label="Avg Win Rate"     value={loading?'…':fmtPct(avgWinRate)}           sub="selected period"    icon={<Target size={18}/>}    color="#10b981" loading={loading}/>
          <StatCard label="Conversion Rate"  value={loading||!overview?'…':fmtPct(overview.conversionRate)} sub="leads → customers" icon={<UserCheck size={18}/>} color="#f59e0b" loading={loading}/>
          <StatCard label="Revenue (Period)" value={loading||!overview?'…':fmt$(overview.revenueInPeriod)}  sub="won deals"         icon={<TrendingUp size={18}/>} color="#8b5cf6" loading={loading}/>
        </div>

        {/* ── Body ── */}
        <div className="rpt-body">

          {/* Sidebar nav */}
          <div className="rpt-nav">
            {groups.map(group => (
              <div key={group}>
                <p className="rpt-nav-heading">{group}</p>
                {NAV_ITEMS.filter(n=>n.group===group).map(n=>(
                  <button key={n.id} className={`rpt-nav-btn${section===n.id?' active':''}`} onClick={()=>setSection(n.id)}>
                    {n.icon} {n.label}
                    {section===n.id && <ChevronRight size={14} style={{marginLeft:'auto'}}/>}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="rpt-content">

            {/* ── OVERVIEW ── */}
            {section==='overview' && (
              <>
                <SectionCard title="Business Overview" subtitle="Key CRM metrics for the selected period">
                  {loading || !overview ? (
                    <div className="rpt-overview-grid">
                      {[1,2,3,4,5,6].map(i=>(
                        <div key={i} className="rpt-ov-card">
                          <Shimmer w="60%" h={12} radius={4}/> <Shimmer w="40%" h={28} radius={8}/> <Shimmer w="70%" h={10} radius={4}/>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rpt-overview-grid">
                      <OvCard label="Total Customers" value={fmtNum(overview.totalCustomers)} sub={`+${overview.newCustomers} new`} icon={<Users size={20}/>} color="#6366f1"/>
                      <OvCard label="Total Leads" value={fmtNum(overview.totalLeads)} sub={`+${overview.newLeads} new`} icon={<TrendingUp size={20}/>} color="#8b5cf6"/>
                      <OvCard label="Open Deals" value={fmtNum(overview.openDeals)} sub="in pipeline" icon={<Target size={20}/>} color="#10b981"/>
                      <OvCard label="Pipeline Value" value={fmt$(overview.pipelineValue)} sub="open opportunities" icon={<DollarSign size={20}/>} color="#f59e0b"/>
                      <OvCard label="Period Revenue" value={fmt$(overview.revenueInPeriod)} sub="deals closed-won" icon={<Trophy size={20}/>} color="#ec4899"/>
                      <OvCard label="Conversion Rate" value={fmtPct(overview.conversionRate)} sub="leads converted" icon={<UserCheck size={20}/>} color="#06b6d4"/>
                    </div>
                  )}
                </SectionCard>

                {/* Activity snapshot */}
                {!loading && actSummary && (
                  <SectionCard title="Activity Snapshot" subtitle="Tasks and activities at a glance">
                    <div className="rpt-activity-grid">
                      <TaskRing label="Completed" value={actSummary.completedTasks} color="#10b981"/>
                      <TaskRing label="Pending"   value={actSummary.pendingTasks}   color="#f59e0b"/>
                      <TaskRing label="Overdue"   value={actSummary.overdueTasks}   color="#ef4444"/>
                      <TaskRing label="Activities" value={actSummary.totalActivities} color="#6366f1"/>
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {/* ── PIPELINE ── */}
            {section==='pipeline' && (
              <>
                <SectionCard title="Pipeline Value by Stage"
                  subtitle="Total estimated value of open opportunities at each stage"
                  onExport={()=>exportCSV(pipelineData,'pipeline_by_stage')}>
                  {loading ? <LoadingBars/> : pipelineData.length===0 ? <Empty icon={<Activity size={36}/>} msg="No pipeline data"/> : (
                    <div className="rpt-bar-list">
                      {pipelineData.map((d,i)=>(
                        <HBar key={d.stage} label={d.stage} value={d.value} max={maxPipeline} formatter={fmt$}
                          color={PALETTE[i%PALETTE.length]} badge={d.count!==undefined?`${d.count} deals`:undefined}/>
                      ))}
                    </div>
                  )}
                </SectionCard>
                <SectionCard title="Stage Distribution">
                  {loading ? <Shimmer h={300} radius={12}/> : pipelineData.length===0 ? <Empty icon={<BarChart2 size={36}/>} msg="No data"/> : (
                    <div style={{height:300}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineData} margin={{top:10,right:20,left:10,bottom:5}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false}/>
                          <XAxis dataKey="stage" tick={{fill:'var(--text-muted)',fontSize:12}} axisLine={false} tickLine={false}/>
                          <YAxis tickFormatter={v=>fmtK(v)} tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false} width={70}/>
                          <Tooltip content={<CustomTip formatter={fmt$}/>} cursor={{fill:'var(--bg-secondary)',opacity:0.5}}/>
                          <Bar dataKey="value" radius={[6,6,0,0]}>
                            {pipelineData.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </SectionCard>
              </>
            )}

            {/* ── WIN RATE ── */}
            {section==='winrate' && (
              <SectionCard title="Win Rate Over Time"
                subtitle="Percentage of closed-won opportunities month by month"
                onExport={()=>exportCSV(winRateData,'win_rate_trend')}>
                {loading ? <Shimmer h={360} radius={12}/> : winRateData.length===0 ? <Empty icon={<Target size={36}/>} msg="No win-rate data"/> : (
                  <>
                    <div className="rpt-headline-row">
                      <HeadlineStat label="Period Average" value={fmtPct(avgWinRate)} color="#10b981"/>
                      <HeadlineStat label="Best Month" value={fmtPct(Math.max(...winRateData.map(d=>d.winRate)))}/>
                      <HeadlineStat label="Months tracked" value={`${winRateData.length}`}/>
                    </div>
                    <div style={{height:300}}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={winRateData} margin={{top:10,right:20,left:0,bottom:5}}>
                          <defs>
                            <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false}/>
                          <XAxis dataKey="month" tick={{fill:'var(--text-muted)',fontSize:12}} axisLine={false} tickLine={false}/>
                          <YAxis tickFormatter={v=>`${v}%`} tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
                          <Tooltip content={<CustomTip formatter={fmtPct}/>}/>
                          <Area type="monotone" dataKey="winRate" stroke="#10b981" strokeWidth={3}
                            fill="url(#winGrad)"
                            dot={{r:4,fill:'#10b981',strokeWidth:2,stroke:'var(--bg-primary)'}}
                            activeDot={{r:6,stroke:'#10b981',strokeWidth:2,fill:'var(--bg-primary)'}}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </SectionCard>
            )}

            {/* ── VELOCITY ── */}
            {section==='velocity' && (
              <SectionCard title="Average Days Per Stage"
                subtitle="How long opportunities spend in each pipeline stage"
                onExport={()=>exportCSV(timeData,'velocity_per_stage')}>
                {loading ? <LoadingBars/> : timeData.length===0 ? <Empty icon={<Zap size={36}/>} msg="No velocity data"/> : (
                  <>
                    <div className="rpt-headline-row">
                      <HeadlineStat label="Avg Total Cycle" value={`${avgVelocity.toFixed(1)} days`} color="#f59e0b"/>
                      <HeadlineStat label="Slowest Stage" value={timeData.reduce((m,d)=>d.averageDays>m.averageDays?d:m,timeData[0])?.stage??'—'}/>
                    </div>
                    <div className="rpt-bar-list">
                      {[...timeData].sort((a,b)=>b.averageDays-a.averageDays).map((d,i)=>(
                        <HBar key={d.stage} label={d.stage} value={d.averageDays}
                          max={Math.max(...timeData.map(x=>x.averageDays),1)}
                          formatter={v=>`${v.toFixed(1)} days`} color={PALETTE[i%PALETTE.length]}/>
                      ))}
                    </div>
                  </>
                )}
              </SectionCard>
            )}

            {/* ── REP PERFORMANCE ── */}
            {section==='repperf' && (
              <SectionCard title="Sales Rep Leaderboard"
                subtitle="Performance ranking by revenue closed in the selected period"
                onExport={()=>exportCSV(repPerf,'rep_performance')}>
                {loading ? <LoadingBars/> : repPerf.length===0 ? <Empty icon={<Trophy size={36}/>} msg="No rep data in this range"/> : (
                  <div className="rpt-rep-list">
                    {repPerf.map((rep, i) => (
                      <div key={rep.repId} className="rpt-rep-card">
                        <div className="rpt-rep-rank">
                          {i===0 ? <Medal size={22} style={{color:'#fbbf24'}}/> :
                           i===1 ? <Medal size={20} style={{color:'#94a3b8'}}/> :
                           i===2 ? <Medal size={18} style={{color:'#b45309'}}/> :
                           <span style={{width:22,textAlign:'center',fontWeight:700,color:'var(--text-muted)',fontSize:'0.85rem'}}>#{i+1}</span>}
                        </div>
                        <div className="rpt-rep-info">
                          <div className="rpt-rep-avatar">{rep.repName.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase()}</div>
                          <div>
                            <div className="rpt-rep-name">{rep.repName}</div>
                            <div className="rpt-rep-meta">{rep.dealsWon} deals won · {fmtPct(rep.winRate)} win rate · {rep.leadsAssigned} leads</div>
                          </div>
                        </div>
                        <div className="rpt-rep-metrics">
                          <div className="rpt-rep-metric">
                            <span className="rpt-rep-metric-label">Revenue</span>
                            <span className="rpt-rep-metric-value" style={{color:'#10b981'}}>{fmt$(rep.revenueWon)}</span>
                          </div>
                          <div className="rpt-rep-metric">
                            <span className="rpt-rep-metric-label">Pipeline</span>
                            <span className="rpt-rep-metric-value">{fmt$(rep.openPipeline)}</span>
                          </div>
                        </div>
                        <div className="rpt-rep-bar-wrap">
                          <div className="rpt-hbar-track">
                            <div className="rpt-hbar-fill" style={{
                              width:`${maxRepRev>0?(rep.revenueWon/maxRepRev)*100:0}%`,
                              background:`linear-gradient(90deg,${PALETTE[i%PALETTE.length]},${PALETTE[i%PALETTE.length]}88)`
                            }}/>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {/* ── LEAD FUNNEL ── */}
            {section==='funnel' && (
              <SectionCard title="Lead Conversion Funnel"
                subtitle="How leads progress through the pipeline stages in the selected period">
                {loading || !funnel ? <LoadingBars/> : funnel.total===0 ? <Empty icon={<Layers size={36}/>} msg="No leads in this range"/> : (
                  <div className="rpt-funnel">
                    {[
                      { label:'Total Leads',  value:funnel.total,     color:'#6366f1', pct:100 },
                      { label:'Active',       value:funnel.active,    color:'#8b5cf6', pct:funnel.total>0?funnel.active/funnel.total*100:0 },
                      { label:'Qualified',    value:funnel.qualified,  color:'#3b82f6', pct:funnel.total>0?funnel.qualified/funnel.total*100:0 },
                      { label:'Converted',   value:funnel.converted,  color:'#10b981', pct:funnel.total>0?funnel.converted/funnel.total*100:0 },
                      { label:'Lost',        value:funnel.lost,       color:'#ef4444', pct:funnel.total>0?funnel.lost/funnel.total*100:0 },
                    ].map((step, i, arr) => (
                      <div key={step.label} className="rpt-funnel-step">
                        <div className="rpt-funnel-meta">
                          <span className="rpt-funnel-label">{step.label}</span>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            {i>0 && (
                              <span className="rpt-funnel-conv" style={{color: step.color}}>
                                {fmtPct(arr[i-1].value>0?step.value/arr[i-1].value*100:0)} from prev
                              </span>
                            )}
                            <span className="rpt-funnel-count" style={{color: step.color}}>{fmtNum(step.value)}</span>
                          </div>
                        </div>
                        <div className="rpt-funnel-bar-outer">
                          <div className="rpt-funnel-bar-fill" style={{
                            width:`${step.pct}%`,
                            background:`linear-gradient(90deg,${step.color},${step.color}88)`,
                          }}/>
                          <span className="rpt-funnel-pct">{fmtPct(step.pct)}</span>
                        </div>
                      </div>
                    ))}

                    {/* Summary row */}
                    <div className="rpt-funnel-summary">
                      <div className="rpt-funnel-summary-stat">
                        <span style={{color:'#10b981',fontWeight:800,fontSize:'1.5rem'}}>{fmtPct(funnel.total>0?funnel.converted/funnel.total*100:0)}</span>
                        <span style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>Overall conversion</span>
                      </div>
                      <div className="rpt-funnel-summary-stat">
                        <span style={{color:'#ef4444',fontWeight:800,fontSize:'1.5rem'}}>{fmtPct(funnel.total>0?funnel.lost/funnel.total*100:0)}</span>
                        <span style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>Loss rate</span>
                      </div>
                      <div className="rpt-funnel-summary-stat">
                        <span style={{color:'#6366f1',fontWeight:800,fontSize:'1.5rem'}}>{fmtNum(funnel.total - funnel.converted - funnel.lost)}</span>
                        <span style={{color:'var(--text-muted)',fontSize:'0.78rem'}}>Still in pipeline</span>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* ── LEAD SOURCES ── */}
            {section==='sources' && (
              <SectionCard title="Leads by Source"
                subtitle="Number of leads attributed to each acquisition channel"
                onExport={()=>exportCSV(sourceData,'lead_sources')}>
                {loading ? <LoadingBars/> : sourceData.length===0 ? <Empty icon={<Layers size={36}/>} msg="No source data"/> : (
                  <div className="rpt-sources-grid">
                    <div className="rpt-bar-list">
                      {[...sourceData].sort((a,b)=>b.count-a.count).map((d,i)=>(
                        <HBar key={d.source} label={d.source} value={d.count} max={maxSource}
                          formatter={v=>`${fmtNum(v)} leads`} color={PALETTE[i%PALETTE.length]}/>
                      ))}
                    </div>
                    <div className="rpt-donut">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sourceData} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                            {sourceData.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
                          </Pie>
                          <Tooltip formatter={(v:any)=>[`${fmtNum(v)} leads`]}
                            contentStyle={{background:'var(--bg-secondary)',border:'1px solid var(--border-color)',borderRadius:10,fontSize:'0.8rem',color:'var(--text-primary)'}}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* ── ACTIVITY SUMMARY ── */}
            {section==='activity' && (
              <>
                <SectionCard title="Task Summary" subtitle="Task completion health for the selected period">
                  {loading || !actSummary ? <LoadingBars/> : (
                    <div className="rpt-activity-grid">
                      <TaskRing label="Completed"  value={actSummary.completedTasks}  color="#10b981"/>
                      <TaskRing label="Pending"    value={actSummary.pendingTasks}    color="#f59e0b"/>
                      <TaskRing label="Overdue"    value={actSummary.overdueTasks}    color="#ef4444"/>
                      <TaskRing label="Activities" value={actSummary.totalActivities} color="#6366f1"/>
                    </div>
                  )}
                </SectionCard>

                {!loading && actSummary && actSummary.byType.length > 0 && (
                  <SectionCard title="Activities by Type"
                    subtitle="Breakdown of logged activities by category"
                    onExport={()=>exportCSV(actSummary.byType,'activities_by_type')}>
                    <div className="rpt-bar-list">
                      {[...actSummary.byType].sort((a,b)=>b.count-a.count).map((d,i)=>(
                        <HBar key={d.type} label={d.type} value={d.count}
                          max={Math.max(...actSummary.byType.map(x=>x.count),1)}
                          formatter={v=>`${fmtNum(v)} logged`} color={PALETTE[i%PALETTE.length]}/>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
};

// ─── Helper components ────────────────────────────────────────────────────────
const OvCard: React.FC<{ label:string; value:string; sub:string; icon:React.ReactNode; color:string }> =
  ({ label, value, sub, icon, color }) => (
    <div className="rpt-ov-card" style={{ '--ov-color': color } as any}>
      <div className="rpt-ov-icon" style={{ background:`${color}18`, color }}>{icon}</div>
      <div className="rpt-ov-value">{value}</div>
      <div className="rpt-ov-label">{label}</div>
      <div className="rpt-ov-sub">{sub}</div>
    </div>
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
