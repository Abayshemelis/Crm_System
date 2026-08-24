import{u as B,j as e,a as F}from"./index-XKpBSQE6.js";import{c as G,r as n}from"./vendor-CU1aK5H2.js";import{L as W}from"./Layout-BRWgx_D7.js";/* empty css                     */import{ae as Y,F as _,aY as H,R as q,a2 as K,C as X,T as J,z as Q,O as Z,a_ as ee,S as te,ap as ae,aD as se}from"./icons-XF-Wbpck.js";import{R as ne,C as re,X as le,Y as oe,T as ie}from"./CartesianChart-Bn2Og2IX.js";import{A as de,a as ce}from"./AreaChart-BFvlAKLT.js";import"./signalr-BSDearS1.js";function pe(d,r,p,b){const S=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),w=`invoices_revenue_report_${new Date().toISOString().split("T")[0]}.pdf`,f=(r==null?void 0:r.totalCollected)??0,m=(r==null?void 0:r.totalPending)??0,v=(r==null?void 0:r.totalOverdue)??0,c=window.open("","_blank");if(!c){alert("Please allow popups for this site to generate and download PDF reports.");return}const N=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoices & Revenue Intelligence Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; INVOICE REPORT</h1>
              <p class="pdf-sub">Cash Collections, Receivables Aging & Inflow Analytics</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${S}</div>
              <div><strong>Period:</strong> ${p}</div>
              <div><strong>Scope:</strong> ${b.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Cash Collected</div>
              <div class="pdf-stat-value" style="color: #10b981;">$${f.toLocaleString("en-US",{minimumFractionDigits:2})}</div>
              <div class="pdf-stat-sub">Realized revenue inflow</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Pending Receivables</div>
              <div class="pdf-stat-value" style="color: #f59e0b;">$${m.toLocaleString("en-US",{minimumFractionDigits:2})}</div>
              <div class="pdf-stat-sub">Unpaid invoices in window</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Overdue Aging Amount</div>
              <div class="pdf-stat-value" style="color: #ef4444;">$${v.toLocaleString("en-US",{minimumFractionDigits:2})}</div>
              <div class="pdf-stat-sub">Requires active collections</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Invoices Issued</div>
              <div class="pdf-stat-value">${d.length}</div>
              <div class="pdf-stat-sub">Total billing records</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #064e3b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Financial & Collections Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #064e3b; line-height: 1.4;">
              <li><strong>Revenue Inflow:</strong> Realized <strong>$${f.toLocaleString()}</strong> in settled payments over this reporting window.</li>
              <li><strong>Receivables Alert:</strong> <strong>$${v.toLocaleString()}</strong> is overdue. Trigger dunning reminder notices immediately.</li>
              <li><strong>Collection Health:</strong> Maintain automated invoice emailing on due dates to keep DSO (Days Sales Outstanding) below 30 days.</li>
            </ul>
          </div>

          ${d.length>0?`
            <div class="pdf-section-title">Invoice Records Ledger (${d.length} Total Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Total Amount ($)</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Issued Date</th>
                </tr>
              </thead>
              <tbody>
                ${d.slice(0,50).map((l,D)=>`
                  <tr>
                    <td>${D+1}</td>
                    <td><strong>${l.invoiceNumber||`INV-${l.invoiceId}`}</strong></td>
                    <td>${l.customerName||"—"}</td>
                    <td><strong>$${(l.totalAmount||0).toLocaleString("en-US",{minimumFractionDigits:2})}</strong></td>
                    <td>${l.status||"Draft"}</td>
                    <td>${l.dueDate?new Date(l.dueDate).toLocaleDateString():"—"}</td>
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
  `;c.document.write(N),c.document.close()}const je=()=>{const d=G(),{isManagerOrAbove:r}=B(),p=new Date().toISOString().split("T")[0],b=new Date(Date.now()-30*864e5).toISOString().split("T")[0],S=new Date(Date.now()-90*864e5).toISOString().split("T")[0],w=new Date(Date.now()-365*864e5).toISOString().split("T")[0],f=[{label:"30 Days",start:b,end:p},{label:"90 Days",start:S,end:p},{label:"1 Year",start:w,end:p},{label:"All Time",start:"",end:""}],[m,v]=n.useState(b),[c,N]=n.useState(p),[l,D]=n.useState("30 Days"),[x,I]=n.useState(r?"team":"personal"),[O,z]=n.useState(!0),[j,$]=n.useState("revenue"),[g,T]=n.useState(""),[y,E]=n.useState("all"),[a,U]=n.useState(null),[i,M]=n.useState([]),A=async()=>{z(!0);try{const t=new URLSearchParams;m&&t.append("startDate",m),c&&t.append("endDate",c),t.append("scope",x);const[u,s]=await Promise.all([F.get(`/api/reports/invoices?${t.toString()}`),F.get("/api/invoices")]);U(u);const k=Array.isArray(s)?s:Array.isArray(s==null?void 0:s.data)?s.data:Array.isArray(s==null?void 0:s.items)?s.items:[];M(k)}catch(t){console.error("Failed to load invoice reports",t)}finally{z(!1)}};n.useEffect(()=>{A()},[m,c,x]);const L=n.useMemo(()=>(a==null?void 0:a.monthlyInflow)??[],[a]),C=n.useMemo(()=>Array.isArray(i)?i.filter(t=>{const u=!g||t.invoiceNumber&&t.invoiceNumber.toLowerCase().includes(g.toLowerCase())||t.customerName&&t.customerName.toLowerCase().includes(g.toLowerCase()),s=y==="all"||(t.status||"").toLowerCase()===y.toLowerCase();return u&&s}):[],[i,g,y]),R=()=>{if(!i||!i.length){alert("No invoice records available to export.");return}const t=["InvoiceId","InvoiceNumber","Customer","TotalAmount","Status","DueDate","CreatedAt"],u=i.map(o=>[o.invoiceId,`"${o.invoiceNumber||`INV-${o.invoiceId}`}"`,`"${(o.customerName||"").replace(/"/g,'""')}"`,o.totalAmount||0,`"${o.status||"Draft"}"`,`"${o.dueDate?o.dueDate.slice(0,10):""}"`,`"${o.createdAt?o.createdAt.slice(0,10):""}"`]),s=[t.join(","),...u.map(o=>o.join(","))].join(`\r
`),k=new Blob(["\uFEFF"+s],{type:"text/csv;charset=utf-8;"}),P=URL.createObjectURL(k),h=document.createElement("a");h.setAttribute("href",P),h.setAttribute("download",`invoices_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(h),h.click(),document.body.removeChild(h),setTimeout(()=>URL.revokeObjectURL(P),1e3)},V=()=>{pe(i,a,l,x)};return e.jsx(W,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>d("/invoices"),className:"clean-back-btn",children:[e.jsx(Y,{size:15})," All Invoices"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"Revenue Intelligence"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:V,className:"clean-btn-primary",title:"Export PDF Executive Summary",children:[e.jsx(_,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:R,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(H,{size:15})," Export CSV"]}),e.jsx("button",{onClick:A,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Report Data",children:e.jsx(q,{size:14,className:O?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Invoices & Revenue Intelligence Report"}),e.jsx("p",{className:"clean-report-desc",children:"Cash collections, receivables aging velocity, invoice settlement tracking, and monthly revenue inflow."})]}),e.jsxs("div",{className:"clean-toolbar",children:[e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Scope:"}),r&&e.jsxs("div",{className:"clean-segmented",children:[e.jsx("button",{className:`clean-segmented-btn ${x==="personal"?"active":""}`,onClick:()=>I("personal"),children:"My Invoices"}),e.jsx("button",{className:`clean-segmented-btn ${x==="team"?"active":""}`,onClick:()=>I("team"),children:"All Company"})]})]}),e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Period:"}),e.jsx("div",{className:"clean-preset-group",children:f.map(t=>e.jsx("button",{className:`clean-preset-btn ${l===t.label?"active":""}`,onClick:()=>{D(t.label),v(t.start),N(t.end)},children:t.label},t.label))})]})]})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Cash Collected"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(K,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",style:{color:"#10b981"},children:["$",((a==null?void 0:a.totalCollected)??0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-green",children:"Settled"}),e.jsx("span",{children:"Cash in bank"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Pending Receivables"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b"},children:e.jsx(X,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",style:{color:"#f59e0b"},children:["$",((a==null?void 0:a.totalPending)??0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(245,158,11,0.14)",color:"#f59e0b"},children:"Open A/R"}),e.jsx("span",{children:"Awaiting payment"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Overdue Invoices"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(239,68,68,0.12)",color:"#ef4444"},children:e.jsx(J,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",style:{color:"#ef4444"},children:["$",((a==null?void 0:a.totalOverdue)??0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(239,68,68,0.14)",color:"#ef4444"},children:"Overdue"}),e.jsx("span",{children:"Past payment SLA"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Invoices Issued"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(99,102,241,0.12)",color:"#6366f1"},children:e.jsx(Q,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:i.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Billing"}),e.jsx("span",{children:"Invoiced accounts"})]})]})]}),e.jsxs("div",{className:"clean-tab-nav",children:[e.jsxs("button",{onClick:()=>$("revenue"),className:`clean-tab-item ${j==="revenue"?"active":""}`,children:[e.jsx(Z,{size:15})," Monthly Cash Inflow & Collections"]}),e.jsxs("button",{onClick:()=>$("directory"),className:`clean-tab-item ${j==="directory"?"active":""}`,children:[e.jsx(ee,{size:15})," Invoice Directory Ledger (",i.length,")"]})]}),j==="revenue"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.25rem"},children:[e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Monthly Cash Inflow Velocity"}),e.jsx("p",{className:"clean-card-sub",children:"Settled and collected payments timeline"})]})}),e.jsx("div",{style:{height:300,padding:"1rem"},children:L.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No cash inflow recorded in window"}):e.jsx(ne,{width:"100%",height:"100%",children:e.jsxs(de,{data:L,margin:{top:10,right:10,left:-10,bottom:0},children:[e.jsx("defs",{children:e.jsxs("linearGradient",{id:"invInflowGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:"#10b981",stopOpacity:.35}),e.jsx("stop",{offset:"95%",stopColor:"#10b981",stopOpacity:0})]})}),e.jsx(re,{strokeDasharray:"3 3",opacity:.08}),e.jsx(le,{dataKey:"month",stroke:"var(--text-muted)",fontSize:11}),e.jsx(oe,{stroke:"var(--text-muted)",fontSize:11,tickFormatter:t=>`$${t/1e3}k`}),e.jsx(ie,{formatter:t=>[`$${Number(t).toLocaleString()}`,"Collected"]}),e.jsx(ce,{type:"monotone",dataKey:"amount",stroke:"#10b981",strokeWidth:2.5,fill:"url(#invInflowGrad)",name:"Cash Inflow"})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Executive Cash Flow Guidance"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"💵 Realized Collections"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["You have collected ",e.jsxs("strong",{children:["$",((a==null?void 0:a.totalCollected)??0).toLocaleString()]})," in cleared payments."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#f59e0b",marginBottom:4,fontSize:"0.82rem"},children:"⏳ Outstanding Pipeline"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsxs("strong",{children:["$",((a==null?void 0:a.totalPending)??0).toLocaleString()]})," is currently pending client payment."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#ef4444",marginBottom:4,fontSize:"0.82rem"},children:"⚠️ Overdue Risk"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsxs("strong",{children:["$",((a==null?void 0:a.totalOverdue)??0).toLocaleString()]})," is overdue. Send automated payment reminders to avoid default."]})]})]})]})]}),j==="directory"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:240,flexWrap:"wrap"},children:[e.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:280},children:[e.jsx(te,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search invoice #, customer...",value:g,onChange:t=>T(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("select",{value:y,onChange:t=>E(t.target.value),style:{padding:"7px 10px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem"},children:[e.jsx("option",{value:"all",children:"All Statuses"}),e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"sent",children:"Sent / Pending"}),e.jsx("option",{value:"overdue",children:"Overdue"}),e.jsx("option",{value:"draft",children:"Draft"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:C.length})," of ",i.length," records"]}),e.jsxs("button",{onClick:R,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(ae,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Invoice #"}),e.jsx("th",{children:"Customer Name"}),e.jsx("th",{children:"Total Amount ($)"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Due Date"}),e.jsx("th",{children:"Issued Date"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:C.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No invoice records match your query"})}):C.map(t=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:t.invoiceNumber||`INV-${t.invoiceId}`})}),e.jsx("td",{children:t.customerName||"—"}),e.jsx("td",{children:e.jsxs("strong",{style:{color:t.status==="Paid"?"#10b981":"var(--text-primary)",fontSize:"0.85rem"},children:["$",Number(t.totalAmount||0).toLocaleString("en-US",{minimumFractionDigits:2})]})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:t.status==="Paid"?"rgba(16,185,129,0.12)":t.status==="Overdue"?"rgba(239,68,68,0.12)":"rgba(245,158,11,0.12)",color:t.status==="Paid"?"#10b981":t.status==="Overdue"?"#ef4444":"#f59e0b",fontSize:"0.72rem"},children:t.status||"Draft"})}),e.jsx("td",{style:{fontSize:"0.8rem",color:"var(--text-secondary)"},children:t.dueDate?new Date(t.dueDate).toLocaleDateString():"—"}),e.jsx("td",{style:{fontSize:"0.8rem",color:"var(--text-secondary)"},children:t.createdAt?new Date(t.createdAt).toLocaleDateString():"—"}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("button",{onClick:()=>d("/invoices"),className:"clean-back-btn",style:{padding:"3px 8px",fontSize:"0.75rem",display:"inline-flex",alignItems:"center",gap:3},children:["View ",e.jsx(se,{size:11})]})})]},t.invoiceId))})]})})]})]})})};export{je as InvoiceReportsScreen};
