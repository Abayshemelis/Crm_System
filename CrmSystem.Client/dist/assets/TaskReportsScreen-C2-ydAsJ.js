import{u as _,j as e,a as L}from"./index-sZHpaULD.js";import{c as G,r as i}from"./vendor-CU1aK5H2.js";import{L as V}from"./Layout-BwDIzOin.js";/* empty css                     */import{ad as W,F as H,aY as q,R as K,aA as X,a6 as J,aT as Q,C as Z,T as ee,N as te,a_ as ae,S as se,ao as re,aD as ie}from"./icons-C1PjxkzD.js";import{R as ne,C as le,X as oe,Y as de,T as ce}from"./CartesianChart-Bn2Og2IX.js";import{B as pe,a as xe,C as me}from"./BarChart-TJnjtq0N.js";import"./signalr-BSDearS1.js";const I=["#ec4899","#10b981","#3b82f6","#f59e0b","#6366f1","#8b5cf6","#06b6d4"];function he(c,s,x,f){const k=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),w=`tasks_activity_report_${new Date().toISOString().split("T")[0]}.pdf`,g=(s==null?void 0:s.total)??c.length,m=(s==null?void 0:s.completed)??0,v=g>0?(m/g*100).toFixed(1):"0",p=window.open("","_blank");if(!p){alert("Please allow popups for this site to generate and download PDF reports.");return}const S=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tasks & Activity Execution Report - CRM</title>
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
              <div><strong>Generated:</strong> ${k}</div>
              <div><strong>Period:</strong> ${x}</div>
              <div><strong>Scope:</strong> ${f.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Tasks Scheduled</div>
              <div class="pdf-stat-value">${g}</div>
              <div class="pdf-stat-sub">Activities in window</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Completed On-Time</div>
              <div class="pdf-stat-value" style="color: #10b981;">${m}</div>
              <div class="pdf-stat-sub">${v}% completion rate</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Pending / In Progress</div>
              <div class="pdf-stat-value" style="color: #3b82f6;">${(s==null?void 0:s.pending)??0}</div>
              <div class="pdf-stat-sub">Active open tasks</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Overdue Tasks</div>
              <div class="pdf-stat-value" style="color: #ef4444;">${(s==null?void 0:s.overdue)??0}</div>
              <div class="pdf-stat-sub">Past SLA deadline</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #831843; margin-bottom: 4px; text-transform: uppercase;">
              Executive Team Execution Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #701a75; line-height: 1.4;">
              <li><strong>Execution Rate:</strong> Team achieved a <strong>${v}%</strong> task completion rate during this reporting cycle.</li>
              <li><strong>Overdue Backlog:</strong> <strong>${(s==null?void 0:s.overdue)??0}</strong> tasks have exceeded their due dates. Reassign or clear backlog immediately.</li>
              <li><strong>Touchpoint Frequency:</strong> Maintain daily morning task triage to ensure prospect touchpoint consistency.</li>
            </ul>
          </div>

          ${c.length>0?`
            <div class="pdf-section-title">Task Ledger Sample (${c.length} Total Records)</div>
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
                ${c.slice(0,50).map((o,N)=>`
                  <tr>
                    <td>${N+1}</td>
                    <td><strong>${o.title}</strong></td>
                    <td>${o.type||"General"}</td>
                    <td>${o.priority||"Medium"}</td>
                    <td>${o.status||"Pending"}</td>
                    <td>${o.dueDate?new Date(o.dueDate).toLocaleDateString():"—"}</td>
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
              filename:     '${w}',
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
  `;p.document.write(S),p.document.close()}const we=()=>{const c=G(),{isManagerOrAbove:s}=_(),x=new Date().toISOString().split("T")[0],f=new Date(Date.now()-30*864e5).toISOString().split("T")[0],k=new Date(Date.now()-90*864e5).toISOString().split("T")[0],w=new Date(Date.now()-365*864e5).toISOString().split("T")[0],g=[{label:"30 Days",start:f,end:x},{label:"90 Days",start:k,end:x},{label:"1 Year",start:w,end:x},{label:"All Time",start:"",end:""}],[m,v]=i.useState(f),[p,S]=i.useState(x),[o,N]=i.useState("30 Days"),[b,A]=i.useState(s?"team":"personal"),[F,z]=i.useState(!0),[y,E]=i.useState("overview"),[h,O]=i.useState(""),[j,B]=i.useState("all"),[a,M]=i.useState(null),[l,U]=i.useState([]),R=async()=>{z(!0);try{const t=new URLSearchParams;m&&t.append("startDate",m),p&&t.append("endDate",p),t.append("scope",b);const[d,r]=await Promise.all([L.get(`/api/reports/activity-summary?${t.toString()}`),L.get("/api/tasks")]);M(d);const D=Array.isArray(r)?r:Array.isArray(r==null?void 0:r.data)?r.data:Array.isArray(r==null?void 0:r.items)?r.items:[];U(D)}catch(t){console.error("Failed to load task reports",t)}finally{z(!1)}};i.useEffect(()=>{R()},[m,p,b]);const C=i.useMemo(()=>(a==null?void 0:a.byType)??[],[a]),T=i.useMemo(()=>Array.isArray(l)?l.filter(t=>{const d=!h||t.title&&t.title.toLowerCase().includes(h.toLowerCase())||t.type&&t.type.toLowerCase().includes(h.toLowerCase())||t.description&&t.description.toLowerCase().includes(h.toLowerCase()),r=j==="all"||(t.status||"").toLowerCase()===j.toLowerCase();return d&&r}):[],[l,h,j]),P=()=>{if(!l||!l.length){alert("No task records available to export.");return}const t=["TaskId","Title","Type","Priority","Status","DueDate","CreatedAt"],d=l.map(n=>[n.taskId,`"${(n.title||"").replace(/"/g,'""')}"`,`"${n.type||"General"}"`,`"${n.priority||"Medium"}"`,`"${n.status||"Pending"}"`,`"${n.dueDate?n.dueDate.slice(0,10):""}"`,`"${n.createdAt?n.createdAt.slice(0,10):""}"`]),r=[t.join(","),...d.map(n=>n.join(","))].join(`\r
`),D=new Blob(["\uFEFF"+r],{type:"text/csv;charset=utf-8;"}),$=URL.createObjectURL(D),u=document.createElement("a");u.setAttribute("href",$),u.setAttribute("download",`tasks_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(u),u.click(),document.body.removeChild(u),setTimeout(()=>URL.revokeObjectURL($),1e3)},Y=()=>{he(l,a,o,b)};return e.jsx(V,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>c("/tasks"),className:"clean-back-btn",children:[e.jsx(W,{size:15})," All Tasks"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"Task Execution"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:Y,className:"clean-btn-primary",title:"Export PDF Executive Report",children:[e.jsx(H,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:P,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(q,{size:15})," Export CSV"]}),e.jsx("button",{onClick:R,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Report Data",children:e.jsx(K,{size:14,className:F?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Tasks & Team Activity Execution Metrics"}),e.jsx("p",{className:"clean-report-desc",children:"Prospect interaction velocity, to-do completion compliance, and activity type distribution."})]}),e.jsxs("div",{className:"clean-toolbar",children:[e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Scope:"}),s&&e.jsxs("div",{className:"clean-segmented",children:[e.jsx("button",{className:`clean-segmented-btn ${b==="personal"?"active":""}`,onClick:()=>A("personal"),children:"My Tasks"}),e.jsx("button",{className:`clean-segmented-btn ${b==="team"?"active":""}`,onClick:()=>A("team"),children:"All Team"})]})]}),e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Period:"}),e.jsx("div",{className:"clean-preset-group",children:g.map(t=>e.jsx("button",{className:`clean-preset-btn ${o===t.label?"active":""}`,onClick:()=>{N(t.label),v(t.start),S(t.end)},children:t.label},t.label))})]})]})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Activities"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(236,72,153,0.12)",color:"#ec4899"},children:e.jsx(X,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(a==null?void 0:a.total)??l.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(236,72,153,0.14)",color:"#ec4899"},children:"Scheduled"}),e.jsx("span",{children:"All recorded tasks"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Completed On-Time"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(J,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",style:{color:"#10b981"},children:(a==null?void 0:a.completed)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta clean-pill-green",children:[e.jsx(Q,{size:11})," Done"]}),e.jsx("span",{children:"Executed touchpoints"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Pending / In Progress"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6"},children:e.jsx(Z,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",style:{color:"#3b82f6"},children:(a==null?void 0:a.pending)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Active"}),e.jsx("span",{children:"In flight"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Overdue Tasks"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(239,68,68,0.12)",color:"#ef4444"},children:e.jsx(ee,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",style:{color:"#ef4444"},children:(a==null?void 0:a.overdue)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(239,68,68,0.14)",color:"#ef4444"},children:"SLA Alert"}),e.jsx("span",{children:"Past deadline"})]})]})]}),e.jsxs("div",{className:"clean-tab-nav",children:[e.jsxs("button",{onClick:()=>E("overview"),className:`clean-tab-item ${y==="overview"?"active":""}`,children:[e.jsx(te,{size:15})," Activity Channels & Execution Breakdown"]}),e.jsxs("button",{onClick:()=>E("directory"),className:`clean-tab-item ${y==="directory"?"active":""}`,children:[e.jsx(ae,{size:15})," Task Directory Ledger (",l.length,")"]})]}),y==="overview"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.25rem"},children:[e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Activity Breakdown by Channel / Type"}),e.jsx("p",{className:"clean-card-sub",children:"Calls, emails, demos, and follow-up touchpoint distribution"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:C.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No activity type distribution recorded"}):e.jsx(ne,{width:"100%",height:"100%",children:e.jsxs(pe,{data:C,margin:{top:10,right:10,left:-10,bottom:0},children:[e.jsx(le,{strokeDasharray:"3 3",opacity:.08}),e.jsx(oe,{dataKey:"type",stroke:"var(--text-muted)",fontSize:11}),e.jsx(de,{stroke:"var(--text-muted)",fontSize:11,allowDecimals:!1}),e.jsx(ce,{formatter:t=>[`${t} Activities`,"Count"]}),e.jsx(xe,{dataKey:"count",radius:[5,5,0,0],children:C.map((t,d)=>e.jsx(me,{fill:I[d%I.length]},`act-${d}`))})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Executive Activity & Follow-Up Guidance"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"✅ Completed Velocity"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["Your team executed ",e.jsx("strong",{children:(a==null?void 0:a.completed)??0})," completed customer touchpoints."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#ef4444",marginBottom:4,fontSize:"0.82rem"},children:"⚠️ SLA Backlog"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsx("strong",{children:(a==null?void 0:a.overdue)??0})," tasks are overdue. Prioritize immediate backlog triage."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#ec4899",marginBottom:4,fontSize:"0.82rem"},children:"📞 Outreach Multi-Channel"}),e.jsx("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:"Combine phone calls with email and scheduled product demos for 2x faster prospect engagement."})]})]})]})]}),y==="directory"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:240,flexWrap:"wrap"},children:[e.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:280},children:[e.jsx(se,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search task title, type, notes...",value:h,onChange:t=>O(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("select",{value:j,onChange:t=>B(t.target.value),style:{padding:"7px 10px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem"},children:[e.jsx("option",{value:"all",children:"All Statuses"}),e.jsx("option",{value:"completed",children:"Completed"}),e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"overdue",children:"Overdue"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:T.length})," of ",l.length," records"]}),e.jsxs("button",{onClick:P,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(re,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Task Title"}),e.jsx("th",{children:"Activity Type"}),e.jsx("th",{children:"Priority"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Due Date"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:T.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No task records match your query"})}):T.map(t=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:t.title})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge clean-badge-primary",style:{fontSize:"0.72rem"},children:t.type||"Task"})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:t.priority==="High"||t.priority==="Urgent"?"rgba(239,68,68,0.12)":"rgba(99,102,241,0.12)",color:t.priority==="High"||t.priority==="Urgent"?"#ef4444":"#818cf8",fontSize:"0.72rem"},children:t.priority||"Medium"})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:t.status==="Completed"?"rgba(16,185,129,0.12)":"rgba(59,130,246,0.12)",color:t.status==="Completed"?"#10b981":"#3b82f6",fontSize:"0.72rem"},children:t.status||"Pending"})}),e.jsx("td",{style:{fontSize:"0.8rem",color:"var(--text-secondary)"},children:t.dueDate?new Date(t.dueDate).toLocaleDateString():"—"}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("button",{onClick:()=>c("/tasks"),className:"clean-back-btn",style:{padding:"3px 8px",fontSize:"0.75rem",display:"inline-flex",alignItems:"center",gap:3},children:["View ",e.jsx(ie,{size:11})]})})]},t.taskId))})]})})]})]})})};export{we as TaskReportsScreen};
