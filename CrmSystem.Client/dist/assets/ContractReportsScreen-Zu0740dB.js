import{u as G,j as e,a as T}from"./index-Co7ni-7w.js";import{c as H,r}from"./vendor-CU1aK5H2.js";import{L as K}from"./Layout-BxZ5wp6R.js";/* empty css                     */import{ad as q,F as X,aY as J,R as Q,a1 as Z,a6 as ee,C as te,r as ae,N as se,a_ as ne,S as re,ao as ie,aD as le}from"./icons-C1PjxkzD.js";import{R,T as F,C as oe,X as ce,Y as de}from"./CartesianChart-Bn2Og2IX.js";import{P as pe,a as me}from"./PieChart-C57W5Fy3.js";import{C as I,B as xe,a as ge}from"./BarChart-TJnjtq0N.js";import{L as ue}from"./Legend-BGvQ8jOe.js";import"./signalr-BSDearS1.js";const V=["#10b981","#6366f1","#f59e0b","#ec4899","#3b82f6","#8b5cf6","#06b6d4"];function he(d,s,p,v){const C=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),N=`contracts_portfolio_report_${new Date().toISOString().split("T")[0]}.pdf`,m=`$${((s==null?void 0:s.totalContractValue)??0).toLocaleString("en-US",{minimumFractionDigits:2})}`,u=window.open("","_blank");if(!u){alert("Please allow popups for this site to generate and download PDF reports.");return}const h=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Contracts & E-Signatures Portfolio Report - CRM</title>
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
            background: #10b981;
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
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          }
          .pdf-btn-primary:hover { background: #059669; }
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
          .pdf-brand { font-size: 20px; font-weight: 800; color: #064e3b; margin: 0 0 4px 0; }
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
            background: #ecfdf5;
            border-left: 4px solid #10b981;
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; CONTRACT REPORT</h1>
              <p class="pdf-sub">Portfolio Value, Legal E-Signatures & Execution Compliance</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${C}</div>
              <div><strong>Period:</strong> ${p}</div>
              <div><strong>Scope:</strong> ${v.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Contract Value</div>
              <div class="pdf-stat-value">${m}</div>
              <div class="pdf-stat-sub">Executed portfolio volume</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Signed & Active</div>
              <div class="pdf-stat-value">${(s==null?void 0:s.signedContracts)??0}</div>
              <div class="pdf-stat-sub">Legally binding agreements</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Pending Signatures</div>
              <div class="pdf-stat-value">${(s==null?void 0:s.pendingContracts)??0}</div>
              <div class="pdf-stat-sub">Out for client execution</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Signing Completion Rate</div>
              <div class="pdf-stat-value">${s!=null&&s.signingRate?`${s.signingRate.toFixed(1)}%`:"—"}</div>
              <div class="pdf-stat-sub">Proposal-to-execution ratio</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #064e3b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Legal & Contract Governance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #064e3b; line-height: 1.4;">
              <li><strong>Portfolio Execution:</strong> <strong>${m}</strong> committed revenue across active contracts.</li>
              <li><strong>Pending Closure:</strong> <strong>${(s==null?void 0:s.pendingContracts)??0}</strong> contracts awaiting e-signature. Issue automated reminder notifications after 48h of dispatch.</li>
              <li><strong>Billing Invoicing:</strong> Transition signed contracts directly into milestone invoices to minimize collection cycles.</li>
            </ul>
          </div>

          ${d.length>0?`
            <div class="pdf-section-title">Contract Records Ledger (${d.length} Total Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Contract Title</th>
                  <th>Contract #</th>
                  <th>Customer</th>
                  <th>Value ($)</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                ${d.slice(0,50).map((l,j)=>`
                  <tr>
                    <td>${j+1}</td>
                    <td><strong>${l.title}</strong></td>
                    <td>${l.contractNumber||"—"}</td>
                    <td>${l.customerName||"—"}</td>
                    <td><strong>$${(l.contractValue||0).toLocaleString("en-US",{minimumFractionDigits:2})}</strong></td>
                    <td>${l.status||"Draft"}</td>
                    <td>${l.createdAt?new Date(l.createdAt).toLocaleDateString():"—"}</td>
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
              filename:     '${N}',
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
  `;u.document.write(h),u.document.close()}const ke=()=>{const d=H(),{isManagerOrAbove:s}=G(),p=new Date().toISOString().split("T")[0],v=new Date(Date.now()-30*864e5).toISOString().split("T")[0],C=new Date(Date.now()-90*864e5).toISOString().split("T")[0],N=new Date(Date.now()-365*864e5).toISOString().split("T")[0],k=[{label:"30 Days",start:v,end:p},{label:"90 Days",start:C,end:p},{label:"1 Year",start:N,end:p},{label:"All Time",start:"",end:""}],[m,u]=r.useState(v),[h,l]=r.useState(p),[j,O]=r.useState("30 Days"),[b,z]=r.useState(s?"team":"personal"),[B,$]=r.useState(!0),[y,A]=r.useState("overview"),[x,U]=r.useState(""),[S,M]=r.useState("all"),[a,W]=r.useState(null),[o,Y]=r.useState([]),E=async()=>{$(!0);try{const t=new URLSearchParams;m&&t.append("startDate",m),h&&t.append("endDate",h),t.append("scope",b);const[i,n]=await Promise.all([T.get(`/api/reports/contracts?${t.toString()}`),T.get("/api/contracts")]);W(i);const D=Array.isArray(n)?n:Array.isArray(n==null?void 0:n.data)?n.data:Array.isArray(n==null?void 0:n.items)?n.items:[];Y(D)}catch(t){console.error("Failed to load contract reports",t)}finally{$(!1)}};r.useEffect(()=>{E()},[m,h,b]);const g=r.useMemo(()=>a!=null&&a.byStatus?a.byStatus.map((t,i)=>({name:t.status,count:t.count,value:t.value,color:V[i%V.length]})):[],[a]),w=r.useMemo(()=>Array.isArray(o)?o.filter(t=>{const i=!x||t.title&&t.title.toLowerCase().includes(x.toLowerCase())||t.contractNumber&&t.contractNumber.toLowerCase().includes(x.toLowerCase())||t.customerName&&t.customerName.toLowerCase().includes(x.toLowerCase()),n=S==="all"||(t.status||"").toLowerCase()===S.toLowerCase();return i&&n}):[],[o,x,S]),L=()=>{if(!o||!o.length){alert("No contract records available to export.");return}const t=["ContractId","Title","ContractNumber","Customer","ContractValue","Status","CreatedAt"],i=o.map(c=>[c.contractId,`"${(c.title||"").replace(/"/g,'""')}"`,`"${c.contractNumber||""}"`,`"${(c.customerName||"").replace(/"/g,'""')}"`,c.contractValue||0,`"${c.status||"Draft"}"`,`"${c.createdAt||""}"`]),n=[t.join(","),...i.map(c=>c.join(","))].join(`\r
`),D=new Blob(["\uFEFF"+n],{type:"text/csv;charset=utf-8;"}),P=URL.createObjectURL(D),f=document.createElement("a");f.setAttribute("href",P),f.setAttribute("download",`contracts_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(f),f.click(),document.body.removeChild(f),setTimeout(()=>URL.revokeObjectURL(P),1e3)},_=()=>{he(o,a,j,b)};return e.jsx(K,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>d("/contracts"),className:"clean-back-btn",children:[e.jsx(q,{size:15})," All Contracts"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"Contract Intelligence"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:_,className:"clean-btn-primary",title:"Export PDF Executive Report",children:[e.jsx(X,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:L,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(J,{size:15})," Export CSV"]}),e.jsx("button",{onClick:E,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Report Data",children:e.jsx(Q,{size:14,className:B?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Contracts & E-Signatures Portfolio Report"}),e.jsx("p",{className:"clean-report-desc",children:"Legal agreements portfolio valuation, digital signature execution progress, and contract lifecycle status."})]}),e.jsxs("div",{className:"clean-toolbar",children:[e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Scope:"}),s&&e.jsxs("div",{className:"clean-segmented",children:[e.jsx("button",{className:`clean-segmented-btn ${b==="personal"?"active":""}`,onClick:()=>z("personal"),children:"My Contracts"}),e.jsx("button",{className:`clean-segmented-btn ${b==="team"?"active":""}`,onClick:()=>z("team"),children:"All Company"})]})]}),e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Period:"}),e.jsx("div",{className:"clean-preset-group",children:k.map(t=>e.jsx("button",{className:`clean-preset-btn ${j===t.label?"active":""}`,onClick:()=>{O(t.label),u(t.start),l(t.end)},children:t.label},t.label))})]})]})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Contract Value"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(Z,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",children:["$",((a==null?void 0:a.totalContractValue)??0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-green",children:"Portfolio"}),e.jsx("span",{children:"Executed volume"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Signed & Active"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6"},children:e.jsx(ee,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(a==null?void 0:a.signedContracts)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Active"}),e.jsx("span",{children:"Legally binding contracts"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Pending Execution"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b"},children:e.jsx(te,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(a==null?void 0:a.pendingContracts)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(245,158,11,0.14)",color:"#f59e0b"},children:"Out for Sign"}),e.jsx("span",{children:"Awaiting client signature"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Signing Completion Rate"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(99,102,241,0.12)",color:"#6366f1"},children:e.jsx(ae,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:a!=null&&a.signingRate?`${a.signingRate.toFixed(1)}%`:"—"}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Efficiency"}),e.jsx("span",{children:"Contract close velocity"})]})]})]}),e.jsxs("div",{className:"clean-tab-nav",children:[e.jsxs("button",{onClick:()=>A("overview"),className:`clean-tab-item ${y==="overview"?"active":""}`,children:[e.jsx(se,{size:15})," Contract Status Distribution & Analytics"]}),e.jsxs("button",{onClick:()=>A("directory"),className:`clean-tab-item ${y==="directory"?"active":""}`,children:[e.jsx(ne,{size:15})," Contracts Directory Ledger (",o.length,")"]})]}),y==="overview"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.25rem"},children:[e.jsxs("div",{className:"clean-chart-grid",children:[e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Contracts by Status"}),e.jsx("p",{className:"clean-card-sub",children:"Distribution of agreements by execution milestone"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:g.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No contract status data"}):e.jsx(R,{width:"100%",height:"100%",children:e.jsxs(pe,{children:[e.jsx(me,{data:g,dataKey:"count",nameKey:"name",cx:"50%",cy:"50%",innerRadius:55,outerRadius:85,paddingAngle:4,label:t=>`${t.name||""}: ${t.value??t.count??0}`,children:g.map((t,i)=>e.jsx(I,{fill:t.color},`cell-${i}`))}),e.jsx(F,{}),e.jsx(ue,{})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Committed Value by Status"}),e.jsx("p",{className:"clean-card-sub",children:"Dollar volume grouped by signing state"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:g.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No valuation data recorded"}):e.jsx(R,{width:"100%",height:"100%",children:e.jsxs(xe,{data:g,margin:{top:10,right:10,left:-10,bottom:0},children:[e.jsx(oe,{strokeDasharray:"3 3",opacity:.08}),e.jsx(ce,{dataKey:"name",stroke:"var(--text-muted)",fontSize:11}),e.jsx(de,{stroke:"var(--text-muted)",fontSize:11,tickFormatter:t=>`$${t/1e3}k`}),e.jsx(F,{formatter:t=>[`$${Number(t).toLocaleString()}`,"Value"]}),e.jsx(ge,{dataKey:"value",radius:[5,5,0,0],children:g.map((t,i)=>e.jsx(I,{fill:t.color},`bar-${i}`))})]})})})]})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Executive Contract Governance Guidance"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"📑 Portfolio Health"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["You have ",e.jsx("strong",{children:(a==null?void 0:a.signedContracts)??0})," active contracts totaling ",e.jsxs("strong",{children:["$",((a==null?void 0:a.totalContractValue)??0).toLocaleString()]}),"."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#f59e0b",marginBottom:4,fontSize:"0.82rem"},children:"✍️ Signature Follow-ups"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsx("strong",{children:(a==null?void 0:a.pendingContracts)??0})," contracts are currently pending signature. Automate signing link delivery via email to accelerate closure."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#6366f1",marginBottom:4,fontSize:"0.82rem"},children:"🧾 Billing Alignment"}),e.jsx("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:"Immediately generate milestone billing invoices once agreements are legally signed to prevent delayed accounts receivable."})]})]})]})]}),y==="directory"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:240,flexWrap:"wrap"},children:[e.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:280},children:[e.jsx(re,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search contract, number, customer...",value:x,onChange:t=>U(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("select",{value:S,onChange:t=>M(t.target.value),style:{padding:"7px 10px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem"},children:[e.jsx("option",{value:"all",children:"All Statuses"}),e.jsx("option",{value:"signed",children:"Signed / Active"}),e.jsx("option",{value:"sent",children:"Sent / Pending"}),e.jsx("option",{value:"draft",children:"Draft"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:w.length})," of ",o.length," records"]}),e.jsxs("button",{onClick:L,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(ie,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Contract Title"}),e.jsx("th",{children:"Contract #"}),e.jsx("th",{children:"Customer Name"}),e.jsx("th",{children:"Contract Value ($)"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Created Date"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:w.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No contract records match your query"})}):w.map(t=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:t.title})}),e.jsx("td",{children:e.jsx("span",{style:{fontFamily:"monospace",fontSize:"0.8rem",color:"var(--text-muted)"},children:t.contractNumber||"—"})}),e.jsx("td",{children:t.customerName||"—"}),e.jsx("td",{children:e.jsxs("strong",{style:{color:"#10b981",fontSize:"0.85rem"},children:["$",Number(t.contractValue||0).toLocaleString("en-US",{minimumFractionDigits:2})]})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:t.status==="Signed"||t.status==="Active"?"rgba(16,185,129,0.12)":"rgba(245,158,11,0.12)",color:t.status==="Signed"||t.status==="Active"?"#10b981":"#f59e0b",fontSize:"0.72rem"},children:t.status||"Draft"})}),e.jsx("td",{style:{fontSize:"0.8rem",color:"var(--text-secondary)"},children:t.createdAt?new Date(t.createdAt).toLocaleDateString():"—"}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("button",{onClick:()=>d("/contracts"),className:"clean-back-btn",style:{padding:"3px 8px",fontSize:"0.75rem",display:"inline-flex",alignItems:"center",gap:3},children:["View ",e.jsx(le,{size:11})]})})]},t.contractId))})]})})]})]})})};export{ke as ContractReportsScreen};
