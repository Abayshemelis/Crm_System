import{u as re,j as e,a as C}from"./index-B-1JbFYK.js";import{c as ne,r as s}from"./vendor-CU1aK5H2.js";import{L as le}from"./Layout-B4SOGMJ6.js";/* empty css                     */import{ae as oe,F as de,aY as ce,R as pe,a2 as me,ab as xe,au as ge,aT as he,C as G,O as ue,a_ as be,S as fe,ap as ve,aD as ye}from"./icons-XF-Wbpck.js";import{R as E,C as T,X as O,Y as V,T as I}from"./CartesianChart-Bn2Og2IX.js";import{B as q,a as H,C as je}from"./BarChart-TJnjtq0N.js";import{A as Ne,a as Se}from"./AreaChart-BFvlAKLT.js";import"./signalr-BSDearS1.js";const K=["#6366f1","#3b82f6","#10b981","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];function we(d,S,c,b,f,$,k){const v=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),z=`pipeline_valuation_report_${new Date().toISOString().split("T")[0]}.pdf`,h=`$${f.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,y=window.open("","_blank");if(!y){alert("Please allow popups for this site to generate and download PDF reports.");return}const w=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Pipeline Valuation & Sales Velocity Report - CRM</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
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
              <div><strong>Generated:</strong> ${v}</div>
              <div><strong>Period:</strong> ${$}</div>
              <div><strong>Scope:</strong> ${k.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Pipeline Value</div>
              <div class="pdf-stat-value">${h}</div>
              <div class="pdf-stat-sub">Active in-flight valuation</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Overall Win Rate</div>
              <div class="pdf-stat-value">${c.toFixed(1)}%</div>
              <div class="pdf-stat-sub">Historical closing ratio</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Active Deals</div>
              <div class="pdf-stat-value">${d.length}</div>
              <div class="pdf-stat-sub">Open opportunities</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Avg Sales Cycle</div>
              <div class="pdf-stat-value">${b.toFixed(0)} Days</div>
              <div class="pdf-stat-sub">Creation-to-close velocity</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Pipeline Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>Portfolio Depth:</strong> <strong>${h}</strong> in active pipeline across <strong>${d.length}</strong> opportunities.</li>
              <li><strong>Closing Velocity:</strong> Average sales velocity is <strong>${b.toFixed(0)} days</strong>. Flag deals lingering over 45 days for manager deal review.</li>
              <li><strong>Win Rate:</strong> Current win rate is <strong>${c.toFixed(1)}%</strong>. Maintain rigorous discovery qualifications in initial stages.</li>
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
              ${S.map(a=>`
                <tr>
                  <td><strong>${a.stageName||a.name}</strong></td>
                  <td>${a.count||0} Deals</td>
                  <td><strong>$${(a.value||0).toLocaleString("en-US",{minimumFractionDigits:2})}</strong></td>
                  <td>${f>0?((a.value||0)/f*100).toFixed(1):0}%</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          ${d.length>0?`
            <div class="pdf-section-title">Opportunities Ledger (${d.length} Records)</div>
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
                ${d.slice(0,50).map((a,p)=>`
                  <tr>
                    <td>${p+1}</td>
                    <td><strong>${a.title}</strong></td>
                    <td>${a.customerName||(a.customerFirstName?`${a.customerFirstName} ${a.customerLastName}`:"—")} ${a.companyName?`(${a.companyName})`:""}</td>
                    <td>${a.stageName||"Deal"}</td>
                    <td><strong>$${(a.estimatedValue||0).toLocaleString("en-US",{minimumFractionDigits:2})}</strong></td>
                    <td>${a.expectedCloseDate?new Date(a.expectedCloseDate).toLocaleDateString():"—"}</td>
                    <td>${a.ownerName||"—"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `:""}

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
              filename:     '${z}',
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
        <\/script>
      </body>
    </html>
  `;y.document.write(w),y.document.close()}const Le=()=>{const d=ne(),{isManagerOrAbove:S}=re(),c=new Date().toISOString().split("T")[0],b=new Date(Date.now()-30*864e5).toISOString().split("T")[0],f=new Date(Date.now()-90*864e5).toISOString().split("T")[0],$=new Date(Date.now()-365*864e5).toISOString().split("T")[0],k=[{label:"30 Days",start:b,end:c},{label:"90 Days",start:f,end:c},{label:"1 Year",start:$,end:c},{label:"All Time",start:"",end:""}],[v,z]=s.useState(b),[h,y]=s.useState(c),[w,a]=s.useState("30 Days"),[p,W]=s.useState(S?"team":"personal"),[Y,U]=s.useState(!0),[u,A]=s.useState("stages"),[m,X]=s.useState(""),[D,J]=s.useState("all"),[x,Q]=s.useState([]),[M,Z]=s.useState([]),[j,ee]=s.useState([]),[F,te]=s.useState(0),[l,ae]=s.useState([]),B=async()=>{U(!0);try{const t=new URLSearchParams;v&&t.append("startDate",v),h&&t.append("endDate",h),t.append("scope",p);const[i,o,N,r]=await Promise.all([C.get(`/api/reports/pipeline-by-stage?${t.toString()}`),C.get(`/api/reports/win-rate?${t.toString()}`),C.get(`/api/reports/time-per-stage?${t.toString()}`),C.get("/api/opportunities")]);Q(i??[]),Z((o==null?void 0:o.byMonth)??[]),te((o==null?void 0:o.overallWinRate)??0),ee(N??[]);const g=Array.isArray(r)?r:Array.isArray(r==null?void 0:r.data)?r.data:Array.isArray(r==null?void 0:r.items)?r.items:[];ae(g)}catch(t){console.error("Failed to load pipeline reports",t)}finally{U(!1)}};s.useEffect(()=>{B()},[v,h,p]);const R=s.useMemo(()=>x.reduce((t,i)=>t+(i.value||0),0),[x]),P=s.useMemo(()=>j.length?j.reduce((t,i)=>t+(i.averageDays||0),0):0,[j]),se=s.useMemo(()=>{const t=new Set;return x.forEach(i=>{i.stageName&&t.add(i.stageName)}),Array.from(t)},[x]),L=s.useMemo(()=>Array.isArray(l)?l.filter(t=>{const i=`${t.customerFirstName||""} ${t.customerLastName||""} ${t.customerName||""}`,o=!m||t.title&&t.title.toLowerCase().includes(m.toLowerCase())||i.toLowerCase().includes(m.toLowerCase())||t.companyName&&t.companyName.toLowerCase().includes(m.toLowerCase())||t.ownerName&&t.ownerName.toLowerCase().includes(m.toLowerCase()),N=D==="all"||(t.stageName||"").toLowerCase()===D.toLowerCase();return o&&N}):[],[l,m,D]),_=()=>{if(!l||!l.length){alert("No opportunity records available to export.");return}const t=["OpportunityId","Title","Customer","Company","Stage","EstimatedValue","ExpectedCloseDate","Owner"],i=l.map(n=>[n.opportunityId,`"${(n.title||"").replace(/"/g,'""')}"`,`"${(n.customerName||`${n.customerFirstName||""} ${n.customerLastName||""}`).trim().replace(/"/g,'""')}"`,`"${(n.companyName||"").replace(/"/g,'""')}"`,`"${n.stageName||"Deal"}"`,n.estimatedValue||0,`"${n.expectedCloseDate?n.expectedCloseDate.slice(0,10):""}"`,`"${(n.ownerName||"").replace(/"/g,'""')}"`]),o=[t.join(","),...i.map(n=>n.join(","))].join(`\r
`),N=new Blob(["\uFEFF"+o],{type:"text/csv;charset=utf-8;"}),r=URL.createObjectURL(N),g=document.createElement("a");g.setAttribute("href",r),g.setAttribute("download",`pipeline_opportunities_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(g),g.click(),document.body.removeChild(g),setTimeout(()=>URL.revokeObjectURL(r),1e3)},ie=()=>{we(l,x,F,P,R,w,p)};return e.jsx(le,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>d("/pipeline"),className:"clean-back-btn",children:[e.jsx(oe,{size:15})," All Pipeline"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"Pipeline Intelligence"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:ie,className:"clean-btn-primary",title:"Export PDF Executive Report",children:[e.jsx(de,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:_,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(ce,{size:15})," Export CSV"]}),e.jsx("button",{onClick:B,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Report Data",children:e.jsx(pe,{size:14,className:Y?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Pipeline Valuation & Sales Velocity Report"}),e.jsx("p",{className:"clean-report-desc",children:"Active deal progression across pipeline stages, historical win-rate velocity, and sales cycle efficiency."})]}),e.jsxs("div",{className:"clean-toolbar",children:[e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Scope:"}),S&&e.jsxs("div",{className:"clean-segmented",children:[e.jsx("button",{className:`clean-segmented-btn ${p==="personal"?"active":""}`,onClick:()=>W("personal"),children:"My Deals"}),e.jsx("button",{className:`clean-segmented-btn ${p==="team"?"active":""}`,onClick:()=>W("team"),children:"All Pipeline"})]})]}),e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Period:"}),e.jsx("div",{className:"clean-preset-group",children:k.map(t=>e.jsx("button",{className:`clean-preset-btn ${w===t.label?"active":""}`,onClick:()=>{a(t.label),z(t.start),y(t.end)},children:t.label},t.label))})]})]})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Pipeline Valuation"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(99,102,241,0.12)",color:"#6366f1"},children:e.jsx(me,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",children:["$",R.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"In Flight"}),e.jsx("span",{children:"Active pipeline valuation"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Active Opportunities"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6"},children:e.jsx(xe,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:l.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Deals"}),e.jsx("span",{children:"Across all active stages"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Overall Win Rate"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(ge,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",children:[F.toFixed(1),"%"]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta clean-pill-green",children:[e.jsx(he,{size:11})," Closing Ratio"]}),e.jsx("span",{children:"Won vs Lost outcomes"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Avg Sales Velocity"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b"},children:e.jsx(G,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",children:[P.toFixed(0)," Days"]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(245,158,11,0.14)",color:"#f59e0b"},children:"Duration"}),e.jsx("span",{children:"Full deal cycle speed"})]})]})]}),e.jsxs("div",{className:"clean-tab-nav",children:[e.jsxs("button",{onClick:()=>A("stages"),className:`clean-tab-item ${u==="stages"?"active":""}`,children:[e.jsx(ue,{size:15})," Stage Valuations & Win Trends"]}),e.jsxs("button",{onClick:()=>A("velocity"),className:`clean-tab-item ${u==="velocity"?"active":""}`,children:[e.jsx(G,{size:15})," Sales Velocity & Bottlenecks"]}),e.jsxs("button",{onClick:()=>A("directory"),className:`clean-tab-item ${u==="directory"?"active":""}`,children:[e.jsx(be,{size:15})," Opportunities Directory Ledger (",l.length,")"]})]}),u==="stages"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.25rem"},children:[e.jsxs("div",{className:"clean-chart-grid",children:[e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Deal Valuation by Stage"}),e.jsx("p",{className:"clean-card-sub",children:"Distribution of total active dollar volume"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:e.jsx(E,{width:"100%",height:"100%",children:e.jsxs(q,{data:x,margin:{top:10,right:10,left:-10,bottom:0},children:[e.jsx(T,{strokeDasharray:"3 3",opacity:.08}),e.jsx(O,{dataKey:"stageName",stroke:"var(--text-muted)",fontSize:11}),e.jsx(V,{stroke:"var(--text-muted)",fontSize:11,tickFormatter:t=>`$${t/1e3}k`}),e.jsx(I,{formatter:t=>[`$${Number(t).toLocaleString()}`,"Valuation"]}),e.jsx(H,{dataKey:"value",radius:[5,5,0,0],children:x.map((t,i)=>e.jsx(je,{fill:K[i%K.length]},`bar-${i}`))})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Historical Win-Rate Velocity"}),e.jsx("p",{className:"clean-card-sub",children:"Monthly percentage of closed deals won"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:M.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No win-rate trajectory data recorded"}):e.jsx(E,{width:"100%",height:"100%",children:e.jsxs(Ne,{data:M,margin:{top:10,right:10,left:-20,bottom:0},children:[e.jsx("defs",{children:e.jsxs("linearGradient",{id:"winGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:"#10b981",stopOpacity:.35}),e.jsx("stop",{offset:"95%",stopColor:"#10b981",stopOpacity:0})]})}),e.jsx(T,{strokeDasharray:"3 3",opacity:.08}),e.jsx(O,{dataKey:"month",stroke:"var(--text-muted)",fontSize:11}),e.jsx(V,{stroke:"var(--text-muted)",fontSize:11,domain:[0,100],unit:"%"}),e.jsx(I,{formatter:t=>[`${Number(t).toFixed(1)}%`,"Win Rate"]}),e.jsx(Se,{type:"monotone",dataKey:"winRate",stroke:"#10b981",strokeWidth:2.5,fill:"url(#winGrad)",name:"Win Rate"})]})})})]})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Executive Pipeline Strategy & Guidance"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#6366f1",marginBottom:4,fontSize:"0.82rem"},children:"💰 Pipeline Coverage Ratio"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["Total active pipeline is ",e.jsxs("strong",{children:["$",R.toLocaleString()]})," across ",l.length," opportunities. Aim for 3.5x pipeline coverage relative to your monthly quota."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"🏆 Closing Conversion Target"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["Your current win rate is ",e.jsxs("strong",{children:[F.toFixed(1),"%"]}),". High-value proposal reviews and executive sponsorship typically boost final stage win rates by 15%."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#f59e0b",marginBottom:4,fontSize:"0.82rem"},children:"⚡ Sales Cycle Efficiency"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["Deals take an average of ",e.jsxs("strong",{children:[P.toFixed(0)," days"]})," to close. Audit stalled opportunities that have exceeded 45 days in discovery or quotation stages."]})]})]})]})]}),u==="velocity"&&e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Average Duration per Pipeline Stage"}),e.jsx("p",{className:"clean-card-sub",children:"Days spent by opportunities before advancing to the next milestone"})]})}),e.jsx("div",{style:{height:300,padding:"1rem"},children:j.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No stage dwell duration data recorded"}):e.jsx(E,{width:"100%",height:"100%",children:e.jsxs(q,{data:j,margin:{top:10,right:10,left:-10,bottom:0},children:[e.jsx(T,{strokeDasharray:"3 3",opacity:.08}),e.jsx(O,{dataKey:"stageName",stroke:"var(--text-muted)",fontSize:11}),e.jsx(V,{stroke:"var(--text-muted)",fontSize:11,unit:"d"}),e.jsx(I,{formatter:t=>[`${Number(t).toFixed(1)} Days`,"Avg Duration"]}),e.jsx(H,{dataKey:"averageDays",fill:"#f59e0b",radius:[5,5,0,0]})]})})})]}),u==="directory"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:240,flexWrap:"wrap"},children:[e.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:280},children:[e.jsx(fe,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search deal, customer, company, owner...",value:m,onChange:t=>X(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("select",{value:D,onChange:t=>J(t.target.value),style:{padding:"7px 10px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem"},children:[e.jsx("option",{value:"all",children:"All Stages"}),se.map(t=>e.jsx("option",{value:t,children:t},t))]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:L.length})," of ",l.length," records"]}),e.jsxs("button",{onClick:_,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(ve,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Opportunity Title"}),e.jsx("th",{children:"Customer / Company"}),e.jsx("th",{children:"Pipeline Stage"}),e.jsx("th",{children:"Est. Value ($)"}),e.jsx("th",{children:"Target Close Date"}),e.jsx("th",{children:"Deal Owner"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:L.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No opportunity records match your query"})}):L.map(t=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:t.title})}),e.jsx("td",{children:e.jsxs("div",{children:[e.jsx("span",{style:{color:"var(--text-primary)"},children:t.customerName||(t.customerFirstName?`${t.customerFirstName} ${t.customerLastName}`:"—")}),t.companyName&&e.jsx("span",{style:{fontSize:"0.75rem",color:"var(--text-muted)",display:"block"},children:t.companyName})]})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge clean-badge-primary",style:{fontSize:"0.72rem"},children:t.stageName||"Deal"})}),e.jsx("td",{children:e.jsxs("strong",{style:{color:"#10b981",fontSize:"0.85rem"},children:["$",Number(t.estimatedValue||0).toLocaleString("en-US",{minimumFractionDigits:2})]})}),e.jsx("td",{style:{fontSize:"0.8rem",color:"var(--text-secondary)"},children:t.expectedCloseDate?new Date(t.expectedCloseDate).toLocaleDateString():"—"}),e.jsx("td",{style:{fontSize:"0.8rem",color:"var(--text-secondary)"},children:t.ownerName||"—"}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("button",{onClick:()=>d(`/opportunities/${t.opportunityId}`),className:"clean-back-btn",style:{padding:"3px 8px",fontSize:"0.75rem",display:"inline-flex",alignItems:"center",gap:3},children:["Deal ",e.jsx(ye,{size:11})]})})]},t.opportunityId))})]})})]})]})})};export{Le as PipelineReportsScreen};
