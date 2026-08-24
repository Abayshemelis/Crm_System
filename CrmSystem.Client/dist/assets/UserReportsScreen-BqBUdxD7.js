import{u as A,j as e,a as F}from"./index-tGhFFj1M.js";import{c as I,r}from"./vendor-CU1aK5H2.js";import{L as U}from"./Layout-CVSvVVk3.js";/* empty css                     */import{ad as O,F as M,aY as _,R as B,a1 as Y,at as q,aR as G,b5 as V,S as K,ao as X,aD as H}from"./icons-C1PjxkzD.js";import{R as Q,C as J,X as Z,Y as ee,T as te}from"./CartesianChart-Bn2Og2IX.js";import{B as ae,a as se,C as ne}from"./BarChart-TJnjtq0N.js";import"./signalr-BSDearS1.js";const z=["#f59e0b","#10b981","#6366f1","#3b82f6","#ec4899","#8b5cf6","#06b6d4"];function re(o,j,c,m){const h=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),f=`sales_rep_leaderboard_report_${new Date().toISOString().split("T")[0]}.pdf`,n=o.length>0?o[0]:null,d=window.open("","_blank");if(!d){alert("Please allow popups for this site to generate and download PDF reports.");return}const g=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sales Rep Performance Leaderboard Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; TEAM LEADERBOARD REPORT</h1>
              <p class="pdf-sub">Sales Rep Deal Wins, Won Revenue Production & Win Rates</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${h}</div>
              <div><strong>Period:</strong> ${m}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Closed Revenue</div>
              <div class="pdf-stat-value" style="color: #10b981;">$${j.toLocaleString("en-US",{minimumFractionDigits:2})}</div>
              <div class="pdf-stat-sub">Team closed won production</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Won Deals</div>
              <div class="pdf-stat-value">${c}</div>
              <div class="pdf-stat-sub">Executed customer deals</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Top Producing Rep</div>
              <div class="pdf-stat-value" style="font-size: 15px;">${(n==null?void 0:n.repName)||"—"}</div>
              <div class="pdf-stat-sub">$${((n==null?void 0:n.revenueWon)||0).toLocaleString()} Won</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Active Sales Reps</div>
              <div class="pdf-stat-value">${o.length}</div>
              <div class="pdf-stat-sub">Tracked team members</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #78350f; margin-bottom: 4px; text-transform: uppercase;">
              Executive Sales Leadership Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #451a03; line-height: 1.4;">
              <li><strong>Top Performance:</strong> <strong>${(n==null?void 0:n.repName)||"Leading rep"}</strong> leads the quota board with <strong>$${((n==null?void 0:n.revenueWon)||0).toLocaleString()}</strong> in closed revenue.</li>
              <li><strong>Quota Enablement:</strong> Facilitate peer coaching on deal objection handling and proposal scoping for emerging sales reps.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Sales Rep Rankings Ledger</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Sales Representative</th>
                <th>Deals Won</th>
                <th>Revenue Won ($)</th>
                <th>Win Rate (%)</th>
                <th>Assigned Leads</th>
              </tr>
            </thead>
            <tbody>
              ${o.map((l,u)=>`
                <tr>
                  <td><strong>#${u+1}</strong></td>
                  <td><strong>${l.repName}</strong></td>
                  <td>${l.dealsWon||0}</td>
                  <td style="color: #10b981; font-weight: 700;">$${(l.revenueWon||0).toLocaleString("en-US",{minimumFractionDigits:2})}</td>
                  <td>${l.winRate?`${l.winRate.toFixed(1)}%`:"—"}</td>
                  <td>${l.leadsCount||0}</td>
                </tr>
              `).join("")}
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
              filename:     '${f}',
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
  `;d.document.write(g),d.document.close()}const be=()=>{const o=I(),{isManagerOrAbove:j}=A(),c=new Date().toISOString().split("T")[0],m=new Date(Date.now()-30*864e5).toISOString().split("T")[0],h=new Date(Date.now()-90*864e5).toISOString().split("T")[0],f=new Date(Date.now()-365*864e5).toISOString().split("T")[0],n=[{label:"30 Days",start:m,end:c},{label:"90 Days",start:h,end:c},{label:"1 Year",start:f,end:c},{label:"All Time",start:"",end:""}],[d,g]=r.useState(m),[l,u]=r.useState(c),[y,C]=r.useState("30 Days"),[$,S]=r.useState(!0),[b,W]=r.useState(""),[a,L]=r.useState([]),w=async()=>{S(!0);try{const t=new URLSearchParams;d&&t.append("startDate",d),l&&t.append("endDate",l),t.append("scope","company");const s=await F.get(`/api/reports/rep-performance?${t.toString()}`);L(s??[])}catch(t){console.error("Failed to load user reports",t)}finally{S(!1)}};r.useEffect(()=>{w()},[d,l]);const N=r.useMemo(()=>a.reduce((t,s)=>t+(s.revenueWon||0),0),[a]),R=r.useMemo(()=>a.reduce((t,s)=>t+(s.dealsWon||0),0),[a]),p=r.useMemo(()=>a.length>0?a[0]:null,[a]),v=r.useMemo(()=>b?a.filter(t=>(t.repName||"").toLowerCase().includes(b.toLowerCase())):a,[a,b]),D=()=>{if(!a.length)return;const t=["Rank","SalesRep","DealsWon","RevenueWon","WinRate","AssignedLeads"],s=a.map((i,P)=>[P+1,`"${i.repName||""}"`,i.dealsWon||0,i.revenueWon||0,i.winRate?`${i.winRate.toFixed(1)}%`:"",i.leadsCount||0]),E=[t.join(","),...s.map(i=>i.join(","))].join(`\r
`),T=new Blob(["\uFEFF"+E],{type:"text/csv;charset=utf-8;"}),k=URL.createObjectURL(T),x=document.createElement("a");x.setAttribute("href",k),x.setAttribute("download",`sales_leaderboard_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(x),x.click(),document.body.removeChild(x),setTimeout(()=>URL.revokeObjectURL(k),1e3)};return e.jsx(U,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>o("/users"),className:"clean-back-btn",children:[e.jsx(O,{size:15})," All Users"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"Team Leaderboard"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:()=>re(a,N,R,y),className:"clean-btn-primary",title:"Export PDF Executive Report",children:[e.jsx(M,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:D,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(_,{size:15})," Export CSV"]}),e.jsx("button",{onClick:w,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Report Data",children:e.jsx(B,{size:14,className:$?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Sales Rep Performance & Team Leaderboard Report"}),e.jsx("p",{className:"clean-report-desc",children:"Individual quota attainment, closed won revenue production, deal velocity, and prospect assignment."})]}),e.jsx("div",{className:"clean-toolbar",children:e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Period:"}),e.jsx("div",{className:"clean-preset-group",children:n.map(t=>e.jsx("button",{className:`clean-preset-btn ${y===t.label?"active":""}`,onClick:()=>{C(t.label),g(t.start),u(t.end)},children:t.label},t.label))})]})})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Closed Revenue"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(Y,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",style:{color:"#10b981"},children:["$",N.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-green",children:"Won"}),e.jsx("span",{children:"Team total closed production"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Closed Won Deals"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b"},children:e.jsx(q,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:R}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(245,158,11,0.14)",color:"#f59e0b"},children:"Deals"}),e.jsx("span",{children:"Successfully closed"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Top Producing Rep"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(234,179,8,0.12)",color:"#eab308"},children:e.jsx(G,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",style:{fontSize:"1.25rem"},children:(p==null?void 0:p.repName)||"—"}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta clean-pill-green",children:["$",((p==null?void 0:p.revenueWon)||0).toLocaleString()]}),e.jsx("span",{children:"Leaderboard #1"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Active Team Reps"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(99,102,241,0.12)",color:"#6366f1"},children:e.jsx(V,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:a.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Sales Team"}),e.jsx("span",{children:"Contributing reps"})]})]})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Closed Won Revenue by Sales Representative"}),e.jsx("p",{className:"clean-card-sub",children:"Individual contribution ranking"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:a.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No rep sales recorded in this window"}):e.jsx(Q,{width:"100%",height:"100%",children:e.jsxs(ae,{data:a,margin:{top:10,right:10,left:-10,bottom:0},children:[e.jsx(J,{strokeDasharray:"3 3",opacity:.08}),e.jsx(Z,{dataKey:"repName",stroke:"var(--text-muted)",fontSize:11}),e.jsx(ee,{stroke:"var(--text-muted)",fontSize:11,tickFormatter:t=>`$${t/1e3}k`}),e.jsx(te,{formatter:t=>[`$${Number(t).toLocaleString()}`,"Revenue Won"]}),e.jsx(se,{dataKey:"revenueWon",radius:[5,5,0,0],children:a.map((t,s)=>e.jsx(ne,{fill:z[s%z.length]},`rep-${s}`))})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{position:"relative",width:280},children:[e.jsx(K,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search sales rep...",value:b,onChange:t=>W(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:v.length})," of ",a.length," sales reps"]}),e.jsxs("button",{onClick:D,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(X,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Leaderboard Rank"}),e.jsx("th",{children:"Sales Representative"}),e.jsx("th",{children:"Deals Won"}),e.jsx("th",{children:"Revenue Won ($)"}),e.jsx("th",{children:"Win Rate (%)"}),e.jsx("th",{children:"Assigned Leads"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:v.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No sales rep records found"})}):v.map((t,s)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("span",{className:"clean-badge",style:{background:s===0?"rgba(234,179,8,0.15)":s===1?"rgba(148,163,184,0.15)":"rgba(99,102,241,0.15)",color:s===0?"#eab308":s===1?"#94a3b8":"#818cf8",fontSize:"0.75rem",fontWeight:800},children:["#",s+1]})}),e.jsx("td",{children:e.jsx("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:t.repName})}),e.jsx("td",{children:e.jsx("strong",{children:t.dealsWon||0})}),e.jsx("td",{children:e.jsxs("strong",{style:{color:"#10b981",fontSize:"0.85rem"},children:["$",Number(t.revenueWon||0).toLocaleString("en-US",{minimumFractionDigits:2})]})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge clean-badge-primary",style:{fontSize:"0.72rem"},children:t.winRate?`${t.winRate.toFixed(1)}%`:"—"})}),e.jsx("td",{children:t.leadsCount||0}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("button",{onClick:()=>o("/users"),className:"clean-back-btn",style:{padding:"3px 8px",fontSize:"0.75rem",display:"inline-flex",alignItems:"center",gap:3},children:["User ",e.jsx(H,{size:11})]})})]},t.repId||s))})]})})]})]})})};export{be as UserReportsScreen};
