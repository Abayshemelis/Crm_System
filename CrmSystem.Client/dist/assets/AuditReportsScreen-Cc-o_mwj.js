import{j as e,a as B}from"./index-B0Yvr7-X.js";import{c as P,r}from"./vendor-CU1aK5H2.js";import{L as F}from"./Layout-SZ4QbJHw.js";/* empty css                     */import{a9 as M,F as U,aV as O,R as H,V as _,a2 as Y,Q as G,e as V,K as W,aX as q,S as K,ak as X}from"./icons-Wso9gVAh.js";import{R as Q,C as J,X as Z,Y as ee,T as te}from"./CartesianChart-Bn2Og2IX.js";import{B as ae,a as se,C as ie}from"./BarChart-TJnjtq0N.js";import"./signalr-BSDearS1.js";const k=["#6366f1","#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];function ne(d,x){const y=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),v=`system_audit_history_report_${new Date().toISOString().split("T")[0]}.pdf`,u=window.open("","_blank");if(!u){alert("Please allow popups for this site to generate and download PDF reports.");return}const j=d.filter(a=>(a.action||a.auditActionTypeName||"").toLowerCase().includes("create")||(a.action||a.auditActionTypeName||"").toLowerCase().includes("insert")).length,h=d.filter(a=>(a.action||a.auditActionTypeName||"").toLowerCase().includes("update")||(a.action||a.auditActionTypeName||"").toLowerCase().includes("modify")).length,g=d.filter(a=>(a.action||a.auditActionTypeName||"").toLowerCase().includes("delete")).length,p=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>System History & Security Audit Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; SYSTEM HISTORY REPORT</h1>
              <p class="pdf-sub">Database Mutation Logs, User Activity & Security Compliance Trail</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${y}</div>
              <div><strong>Period:</strong> ${x}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Mutation Events</div>
              <div class="pdf-stat-value">${d.length}</div>
              <div class="pdf-stat-sub">Logged database changes</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Creations & Inserts</div>
              <div class="pdf-stat-value" style="color: #10b981;">${j}</div>
              <div class="pdf-stat-sub">New records created</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Updates & Edits</div>
              <div class="pdf-stat-value" style="color: #3b82f6;">${h}</div>
              <div class="pdf-stat-sub">Field modifications</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Deletions</div>
              <div class="pdf-stat-value" style="color: #ef4444;">${g}</div>
              <div class="pdf-stat-sub">Purged entity records</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e1b4b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Security & Audit Compliance Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>Integrity Trail:</strong> <strong>${d.length}</strong> total mutation events recorded. All database modifications are tamper-evident.</li>
              <li><strong>Deletion Monitoring:</strong> <strong>${g}</strong> record deletions captured. Review deletion reasons during weekly security audits.</li>
              <li><strong>User Attribution:</strong> Every event is tied to an authenticated sales rep identity and timestamp.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Audit Ledger Records (${d.length} Total Records)</div>
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
              ${d.slice(0,100).map((a,s)=>`
                <tr>
                  <td>${s+1}</td>
                  <td><strong>${a.entityTypeName||a.entityName||a.entity||"Entity"} (#${a.entityId||"—"})</strong></td>
                  <td>${a.auditActionTypeName||a.action||"Mutation"}</td>
                  <td>${a.changedByName||"System User"}</td>
                  <td>${a.changedByEmail||"—"}</td>
                  <td>${a.changedAt?new Date(a.changedAt).toLocaleString():"—"}</td>
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
              filename:     '${v}',
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
  `;u.document.write(p),u.document.close()}const ue=()=>{const d=P(),x=new Date().toISOString().split("T")[0],y=new Date(Date.now()-30*864e5).toISOString().split("T")[0],v=new Date(Date.now()-90*864e5).toISOString().split("T")[0],u=new Date(Date.now()-365*864e5).toISOString().split("T")[0],j=[{label:"30 Days",start:y,end:x},{label:"90 Days",start:v,end:x},{label:"1 Year",start:u,end:x},{label:"All Time",start:"",end:""}],[h,g]=r.useState("30 Days"),[p,a]=r.useState("analytics"),[s,S]=r.useState([]),[z,A]=r.useState(!0),[b,D]=r.useState(""),[m,L]=r.useState("all"),C=()=>{A(!0),B.get("/api/audit-logs?pageSize=1000").then(t=>{const i=Array.isArray(t)?t:Array.isArray(t==null?void 0:t.items)?t.items:Array.isArray(t==null?void 0:t.data)?t.data:[];S(i)}).catch(t=>{console.error("Failed to load audit logs",t),S([])}).finally(()=>A(!1))};r.useEffect(()=>{C()},[]);const R=r.useMemo(()=>s.filter(t=>(t.action||t.auditActionTypeName||"").toLowerCase().includes("create")||(t.action||t.auditActionTypeName||"").toLowerCase().includes("insert")).length,[s]),$=r.useMemo(()=>s.filter(t=>(t.action||t.auditActionTypeName||"").toLowerCase().includes("update")||(t.action||t.auditActionTypeName||"").toLowerCase().includes("modify")).length,[s]),T=r.useMemo(()=>s.filter(t=>(t.action||t.auditActionTypeName||"").toLowerCase().includes("delete")).length,[s]),N=r.useMemo(()=>{const t={};return s.forEach(i=>{const l=i.auditActionTypeName||i.action||"Other";t[l]=(t[l]||0)+1}),Object.entries(t).map(([i,l],o)=>({name:i,count:l,color:k[o%k.length]}))},[s]),w=r.useMemo(()=>Array.isArray(s)?s.filter(t=>{const i=b.toLowerCase(),l=(t.entityTypeName||t.entityName||t.entity||"").toLowerCase(),o=(t.action||t.auditActionTypeName||"").toLowerCase(),f=(t.changedByName||"").toLowerCase(),c=(t.changedByEmail||"").toLowerCase(),n=!b||l.includes(i)||o.includes(i)||f.includes(i)||c.includes(i),I=m==="all"||m==="create"&&(o.includes("create")||o.includes("insert"))||m==="update"&&(o.includes("update")||o.includes("modify"))||m==="delete"&&o.includes("delete");return n&&I}):[],[s,b,m]),E=()=>{if(!s.length)return;const t=["AuditId","EntityName","EntityId","Action","ChangedByName","ChangedByEmail","Timestamp"],i=s.map(n=>[n.auditLogId||n.id,`"${n.entityTypeName||n.entityName||""}"`,n.entityId||"",`"${n.auditActionTypeName||n.action||""}"`,`"${(n.changedByName||"").replace(/"/g,'""')}"`,`"${n.changedByEmail||""}"`,`"${n.changedAt||""}"`]),l=[t.join(","),...i.map(n=>n.join(","))].join(`\r
`),o=new Blob(["\uFEFF"+l],{type:"text/csv;charset=utf-8;"}),f=URL.createObjectURL(o),c=document.createElement("a");c.setAttribute("href",f),c.setAttribute("download",`system_history_audit_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(c),c.click(),document.body.removeChild(c),setTimeout(()=>URL.revokeObjectURL(f),1e3)};return e.jsx(F,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>d("/audit-logs"),className:"clean-back-btn",children:[e.jsx(M,{size:15})," All Audit Logs"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"System History & Security Audit"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:()=>ne(s,h),className:"clean-btn-primary",title:"Export PDF Executive Report",children:[e.jsx(U,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:E,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(O,{size:15})," Export CSV"]}),e.jsx("button",{onClick:C,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Audit Log Data",children:e.jsx(H,{size:14,className:z?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"System Audit Trail & Mutation Intelligence Report"}),e.jsx("p",{className:"clean-report-desc",children:"Immutable history of database mutations, user actions, security trail compliance, and deletion metrics."})]}),e.jsx("div",{className:"clean-toolbar",children:e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Period:"}),e.jsx("div",{className:"clean-preset-group",children:j.map(t=>e.jsx("button",{className:`clean-preset-btn ${h===t.label?"active":""}`,onClick:()=>g(t.label),children:t.label},t.label))})]})})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Mutation Events"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(99,102,241,0.12)",color:"#6366f1"},children:e.jsx(_,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:s.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Audit Log"}),e.jsx("span",{children:"Logged database changes"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Insert / Create Actions"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(Y,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",style:{color:"#10b981"},children:R}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-green",children:"Inserts"}),e.jsx("span",{children:"New records added"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Updates & Field Edits"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6"},children:e.jsx(G,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",style:{color:"#3b82f6"},children:$}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Updates"}),e.jsx("span",{children:"State & field edits"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Deletions / Purged"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(239,68,68,0.12)",color:"#ef4444"},children:e.jsx(V,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",style:{color:"#ef4444"},children:T}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(239,68,68,0.14)",color:"#ef4444"},children:"Deletions"}),e.jsx("span",{children:"Removed entity records"})]})]})]}),e.jsxs("div",{className:"clean-tab-nav",children:[e.jsxs("button",{onClick:()=>a("analytics"),className:`clean-tab-item ${p==="analytics"?"active":""}`,children:[e.jsx(W,{size:15})," Action Type Distribution & Compliance"]}),e.jsxs("button",{onClick:()=>a("directory"),className:`clean-tab-item ${p==="directory"?"active":""}`,children:[e.jsx(q,{size:15})," Audit History Ledger (",s.length,")"]})]}),p==="analytics"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.25rem"},children:[e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Activity Breakdown by Action Type"}),e.jsx("p",{className:"clean-card-sub",children:"Distribution of Creates, Updates, Deletions, and Reassignments"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:N.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No audit action data recorded"}):e.jsx(Q,{width:"100%",height:"100%",children:e.jsxs(ae,{data:N,margin:{top:10,right:10,left:-10,bottom:0},children:[e.jsx(J,{strokeDasharray:"3 3",opacity:.08}),e.jsx(Z,{dataKey:"name",stroke:"var(--text-muted)",fontSize:11}),e.jsx(ee,{stroke:"var(--text-muted)",fontSize:11,allowDecimals:!1}),e.jsx(te,{formatter:t=>[`${t} Events`,"Count"]}),e.jsx(se,{dataKey:"count",radius:[5,5,0,0],children:N.map((t,i)=>e.jsx(ie,{fill:t.color},`bar-${i}`))})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Executive Security & Compliance Guidance"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#6366f1",marginBottom:4,fontSize:"0.82rem"},children:"🛡️ Tamper-Evident Trail"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["Your system has logged ",e.jsx("strong",{children:s.length})," total changes. Every modification preserves original values and authenticated user identity."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#ef4444",marginBottom:4,fontSize:"0.82rem"},children:"⚠️ Deletion Governance"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsx("strong",{children:T})," records were deleted. Administrators can review deleted payloads directly in the log inspector."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"👥 User Accountability"}),e.jsx("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:"Filter by sales rep or user in the System History dashboard to inspect individual productivity and data modifications."})]})]})]})]}),p==="directory"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:240,flexWrap:"wrap"},children:[e.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:280},children:[e.jsx(K,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search entity, action, user...",value:b,onChange:t=>D(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("select",{value:m,onChange:t=>L(t.target.value),style:{padding:"7px 10px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem"},children:[e.jsx("option",{value:"all",children:"All Action Types"}),e.jsx("option",{value:"create",children:"Creations / Inserts"}),e.jsx("option",{value:"update",children:"Updates / Edits"}),e.jsx("option",{value:"delete",children:"Deletions"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:w.length})," of ",s.length," records"]}),e.jsxs("button",{onClick:E,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(X,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Target Entity"}),e.jsx("th",{children:"Action Type"}),e.jsx("th",{children:"Changed By User"}),e.jsx("th",{children:"Email Address"}),e.jsx("th",{children:"Timestamp"})]})}),e.jsx("tbody",{children:w.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:5,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No audit records match your query"})}):w.map((t,i)=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:[t.entityTypeName||t.entityName||t.entity||"Entity"," ",t.entityId?`(#${t.entityId})`:""]})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:(t.action||t.auditActionTypeName||"").toLowerCase().includes("delete")?"rgba(239,68,68,0.12)":(t.action||t.auditActionTypeName||"").toLowerCase().includes("create")?"rgba(16,185,129,0.12)":"rgba(59,130,246,0.12)",color:(t.action||t.auditActionTypeName||"").toLowerCase().includes("delete")?"#ef4444":(t.action||t.auditActionTypeName||"").toLowerCase().includes("create")?"#10b981":"#3b82f6",fontSize:"0.72rem"},children:t.auditActionTypeName||t.action||"Mutation"})}),e.jsx("td",{children:t.changedByName||"System User"}),e.jsx("td",{children:e.jsx("span",{style:{color:"var(--text-secondary)",fontSize:"0.82rem"},children:t.changedByEmail||"—"})}),e.jsx("td",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:t.changedAt?new Date(t.changedAt).toLocaleString():"—"})]},t.auditLogId||i))})]})})]})]})})};export{ue as AuditReportsScreen};
