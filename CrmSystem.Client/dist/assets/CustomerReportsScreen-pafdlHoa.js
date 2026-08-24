import{u as ae,j as e,a as V}from"./index-XKpBSQE6.js";import{c as se,r as n}from"./vendor-CU1aK5H2.js";import{L as re}from"./Layout-BRWgx_D7.js";/* empty css                     */import{ae as ne,F as ie,aY as oe,R as le,u as ce,$ as de,aT as pe,v as E,an as _,O as me,a$ as xe,a_ as he,aj as ue,S as ge,ap as fe,Q as be,a3 as ye,aD as je}from"./icons-XF-Wbpck.js";import{R as P,C as K,X as Y,Y as H,T as B}from"./CartesianChart-Bn2Og2IX.js";import{A as ve,a as Ne}from"./AreaChart-BFvlAKLT.js";import{P as Ce,a as we}from"./PieChart-C57W5Fy3.js";import{C as X,B as Se,a as ke}from"./BarChart-TJnjtq0N.js";import{L as Ae}from"./Legend-BGvQ8jOe.js";import"./signalr-BSDearS1.js";const J=["#6366f1","#3b82f6","#10b981","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];function ze(l,o,h,v){if(!l)return;const S=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),k=`customer_report_${new Date().toISOString().split("T")[0]}.pdf`,u=l.filter(i=>!!i.companyName).length,g=l.length-u,N=l.length>0?(u/l.length*100).toFixed(1):"0",m=window.open("","_blank");if(!m){alert("Please allow popups for this site to generate and download PDF reports.");return}const A=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Customer Analytics & Portfolio Report - CRM</title>
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
          @media print {
            .pdf-action-bar { display: none !important; }
          }
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
          .pdf-insights-box {
            background: #f1f5f9;
            border-left: 4px solid #6366f1;
            padding: 10px 14px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 18px;
          }
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin-top: 8px;
          }
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
          .pdf-table td {
            padding: 7px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
          }
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; CUSTOMER REPORT</h1>
              <p class="pdf-sub">Client Portfolio Composition, Acquisition Velocity & Directory Roster</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${S}</div>
              <div><strong>Reporting Window:</strong> ${h}</div>
              <div><strong>Data Scope:</strong> ${v.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Customer Accounts</div>
              <div class="pdf-stat-value">${(o==null?void 0:o.totalCustomers)??l.length}</div>
              <div class="pdf-stat-sub">Active CRM database volume</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">New Customers (Period)</div>
              <div class="pdf-stat-value">${(o==null?void 0:o.newCustomers)??0}</div>
              <div class="pdf-stat-sub">Newly onboarded accounts</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Corporate Accounts (B2B)</div>
              <div class="pdf-stat-value">${u}</div>
              <div class="pdf-stat-sub">${N}% of portfolio</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Individual Clients</div>
              <div class="pdf-stat-value">${g}</div>
              <div class="pdf-stat-sub">Direct decision makers</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Strategic Portfolio Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>B2B Penetration:</strong> Corporate clients make up <strong>${N}%</strong> of total accounts. Maintain dedicated relationship managers for multi-contact accounts.</li>
              <li><strong>Acquisition Velocity:</strong> Recorded <strong>${(o==null?void 0:o.newCustomers)??0}</strong> client additions during this reporting window.</li>
              <li><strong>Retention SLA:</strong> Enforce 30-day proactive touchpoint schedules to preserve client health and accelerate upsell opportunities.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Customer Directory Ledger (${l.length} Total Records)</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer Name</th>
                <th>Classification</th>
                <th>Email Address</th>
                <th>Phone</th>
                <th>Acquisition Source</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              ${l.map((i,z)=>`
                <tr>
                  <td>${z+1}</td>
                  <td><strong>${i.firstName||""} ${i.lastName||""}</strong></td>
                  <td>${i.companyName?`Corporate (${i.companyName})`:"Individual Client"}</td>
                  <td>${i.email||"—"}</td>
                  <td>${i.phone||"—"}</td>
                  <td>${i.sourceName||"Direct"}</td>
                  <td>${i.createdAt?new Date(i.createdAt).toLocaleDateString():"—"}</td>
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
              filename:     '${k}',
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
  `;m.document.write(A),m.document.close()}const Fe=()=>{const l=se(),{isManagerOrAbove:o}=ae(),h=new Date().toISOString().split("T")[0],v=new Date(Date.now()-30*864e5).toISOString().split("T")[0],S=new Date(Date.now()-90*864e5).toISOString().split("T")[0],k=new Date(Date.now()-365*864e5).toISOString().split("T")[0],u=[{label:"30 Days",start:v,end:h},{label:"90 Days",start:S,end:h},{label:"1 Year",start:k,end:h},{label:"All Time",start:"",end:""}],[g,N]=n.useState(v),[m,A]=n.useState(h),[i,z]=n.useState("30 Days"),[f,I]=n.useState(o?"team":"personal"),[Q,L]=n.useState(!0),[p,b]=n.useState("overview"),[x,O]=n.useState(""),[y,Z]=n.useState("all"),[d,ee]=n.useState(null),[r,M]=n.useState([]),F=async()=>{L(!0);try{const t=new URLSearchParams;g&&t.append("startDate",g),m&&t.append("endDate",m),t.append("scope",f);const[a,s]=await Promise.all([V.get(`/api/reports/overview?${t.toString()}`),V.get("/api/customers?page=1&pageSize=1000")]);ee(a);const T=Array.isArray(s)?s:Array.isArray(s==null?void 0:s.data)?s.data:Array.isArray(s==null?void 0:s.items)?s.items:[];M(T)}catch(t){console.error("Failed to load customer report data",t),M([])}finally{L(!1)}};n.useEffect(()=>{F()},[g,m,f]);const q=n.useMemo(()=>{if(!Array.isArray(r)||r.length===0)return[{name:"Corporate B2B",count:0,color:"#6366f1"},{name:"Individual",count:0,color:"#3b82f6"}];const t=r.filter(s=>!!s.companyName).length,a=r.length-t;return[{name:"Corporate B2B",count:t,color:"#6366f1"},{name:"Individual Client",count:a,color:"#3b82f6"}]},[r]),D=n.useMemo(()=>{if(!Array.isArray(r)||r.length===0)return[];const t={};return r.forEach(a=>{const s=a.sourceName||"Direct / Organic";t[s]=(t[s]||0)+1}),Object.entries(t).map(([a,s])=>({source:a,count:s})).sort((a,s)=>s.count-a.count)},[r]),U=n.useMemo(()=>{if(!Array.isArray(r)||r.length===0)return[];const t={};return r.forEach(a=>{if(a.createdAt){const s=a.createdAt.slice(0,7);t[s]=(t[s]||0)+1}}),Object.entries(t).sort(([a],[s])=>a.localeCompare(s)).map(([a,s])=>({month:a,newCustomers:s}))},[r]),C=n.useMemo(()=>{if(!Array.isArray(r)||r.length===0)return[];const t={};return r.forEach(a=>{a.companyName&&(t[a.companyName]||(t[a.companyName]={companyName:a.companyName,contacts:[],count:0}),t[a.companyName].contacts.push(a),t[a.companyName].count+=1)}),Object.values(t).sort((a,s)=>s.count-a.count)},[r]),$=n.useMemo(()=>Array.isArray(r)?r.filter(t=>{const a=!x||`${t.firstName} ${t.lastName}`.toLowerCase().includes(x.toLowerCase())||t.email&&t.email.toLowerCase().includes(x.toLowerCase())||t.companyName&&t.companyName.toLowerCase().includes(x.toLowerCase())||t.sourceName&&t.sourceName.toLowerCase().includes(x.toLowerCase()),s=y==="all"||y==="corporate"&&!!t.companyName||y==="individual"&&!t.companyName;return a&&s}):[],[r,x,y]),W=()=>{if(!r||!r.length){alert("No customer records available to export.");return}const t=["CustomerId","FirstName","LastName","Email","Phone","JobTitle","Company","Source","CreatedAt"],a=r.map(c=>[c.customerId,`"${(c.firstName||"").replace(/"/g,'""')}"`,`"${(c.lastName||"").replace(/"/g,'""')}"`,`"${(c.email||"").replace(/"/g,'""')}"`,`"${(c.phone||"").replace(/"/g,'""')}"`,`"${(c.jobTitle||"").replace(/"/g,'""')}"`,`"${(c.companyName||"").replace(/"/g,'""')}"`,`"${(c.sourceName||"").replace(/"/g,'""')}"`,`"${c.createdAt||""}"`]),s=[t.join(","),...a.map(c=>c.join(","))].join(`\r
`),T=new Blob(["\uFEFF"+s],{type:"text/csv;charset=utf-8;"}),G=URL.createObjectURL(T),j=document.createElement("a");j.setAttribute("href",G),j.setAttribute("download",`customer_portfolio_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(j),j.click(),document.body.removeChild(j),setTimeout(()=>URL.revokeObjectURL(G),1e3)},te=()=>{if(!r||!r.length){alert("No customer records available to export.");return}ze(r,d,i,f)},w=n.useMemo(()=>r.filter(t=>!!t.companyName).length,[r]),R=n.useMemo(()=>r.length>0?w/r.length*100:0,[w,r]);return e.jsx(re,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>l("/customers"),className:"clean-back-btn",children:[e.jsx(ne,{size:15})," All Customers"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"Customer Intelligence"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:te,className:"clean-btn-primary",title:"Export PDF Executive Report",children:[e.jsx(ie,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:W,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(oe,{size:15})," Export CSV"]}),e.jsx("button",{onClick:F,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Report Data",children:e.jsx(le,{size:14,className:Q?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Customer Growth & Portfolio Analytics"}),e.jsx("p",{className:"clean-report-desc",children:"Comprehensive analysis of client acquisition velocity, corporate B2B penetration, and directory records."})]}),e.jsxs("div",{className:"clean-toolbar",children:[e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Scope:"}),o&&e.jsxs("div",{className:"clean-segmented",children:[e.jsx("button",{className:`clean-segmented-btn ${f==="personal"?"active":""}`,onClick:()=>I("personal"),children:"My Portfolio"}),e.jsx("button",{className:`clean-segmented-btn ${f==="team"?"active":""}`,onClick:()=>I("team"),children:"Entire Company"})]})]}),e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Period:"}),e.jsx("div",{className:"clean-preset-group",children:u.map(t=>e.jsx("button",{className:`clean-preset-btn ${i===t.label?"active":""}`,onClick:()=>{z(t.label),N(t.start),A(t.end)},children:t.label},t.label))})]})]})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Client Accounts"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(99,102,241,0.12)",color:"#6366f1"},children:e.jsx(ce,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(d==null?void 0:d.totalCustomers)??r.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Active"}),e.jsx("span",{children:"CRM database records"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"New Customers (Period)"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(de,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(d==null?void 0:d.newCustomers)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta clean-pill-green",children:[e.jsx(pe,{size:11})," Inflow"]}),e.jsx("span",{children:"Onboarded during period"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Corporate Accounts (B2B)"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6"},children:e.jsx(E,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:w}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta clean-pill-blue",children:[R.toFixed(0),"%"]}),e.jsx("span",{children:"Share of total portfolio"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Direct Contacts"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b"},children:e.jsx(_,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:r.length-w}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta",style:{background:"rgba(245,158,11,0.14)",color:"#f59e0b"},children:[(100-R).toFixed(0),"%"]}),e.jsx("span",{children:"Direct decision makers"})]})]})]}),e.jsxs("div",{className:"clean-tab-nav",children:[e.jsxs("button",{onClick:()=>b("overview"),className:`clean-tab-item ${p==="overview"?"active":""}`,children:[e.jsx(me,{size:15})," Growth & Analytics"]}),e.jsxs("button",{onClick:()=>b("breakdown"),className:`clean-tab-item ${p==="breakdown"?"active":""}`,children:[e.jsx(xe,{size:15})," Segmentation & Sources"]}),e.jsxs("button",{onClick:()=>b("companies"),className:`clean-tab-item ${p==="companies"?"active":""}`,children:[e.jsx(E,{size:15})," Top B2B Client Accounts (",C.length,")"]}),e.jsxs("button",{onClick:()=>b("directory"),className:`clean-tab-item ${p==="directory"?"active":""}`,children:[e.jsx(he,{size:15})," Complete Client Ledger (",r.length,")"]})]}),p==="overview"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.25rem"},children:[e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Customer Acquisition Velocity Timeline"}),e.jsx("p",{className:"clean-card-sub",children:"Monthly volume of newly converted and registered customer accounts"})]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"Monthly Trend"})]}),e.jsx("div",{style:{height:300,padding:"1rem"},children:U.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No timeline data recorded for this window"}):e.jsx(P,{width:"100%",height:"100%",children:e.jsxs(ve,{data:U,margin:{top:10,right:10,left:-20,bottom:0},children:[e.jsx("defs",{children:e.jsxs("linearGradient",{id:"cleanCustGrad",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:"#6366f1",stopOpacity:.35}),e.jsx("stop",{offset:"95%",stopColor:"#6366f1",stopOpacity:0})]})}),e.jsx(K,{strokeDasharray:"3 3",opacity:.08}),e.jsx(Y,{dataKey:"month",stroke:"var(--text-muted)",fontSize:11}),e.jsx(H,{stroke:"var(--text-muted)",fontSize:11,allowDecimals:!1}),e.jsx(B,{formatter:t=>[`${t} Clients`,"New Customers"]}),e.jsx(Ne,{type:"monotone",dataKey:"newCustomers",stroke:"#6366f1",strokeWidth:2.5,fill:"url(#cleanCustGrad)",name:"New Customers"})]})})})]}),e.jsxs("div",{className:"clean-card",style:{background:"var(--bg-secondary)"},children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Executive Portfolio Guidance"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#6366f1",marginBottom:4,fontSize:"0.82rem"},children:"🏢 B2B Enterprise Penetration"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsxs("strong",{children:[R.toFixed(0),"%"]})," of your client roster consists of corporate business accounts. Enterprise accounts generate higher contract expansion opportunities."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"📈 Acquisition Velocity"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["Over the reporting period, ",e.jsx("strong",{children:(d==null?void 0:d.newCustomers)??0})," new clients have joined your CRM. Maintain 30-day touchpoint SLAs to maximize client retention."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#f59e0b",marginBottom:4,fontSize:"0.82rem"},children:"🎯 Expansion Strategy"}),e.jsx("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:"Schedule periodic follow-up review tasks for key accounts and review open invoices to ensure zero churn on high-value corporate relationships."})]})]})]})]}),p==="breakdown"&&e.jsxs("div",{className:"clean-chart-grid",children:[e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Account Classification Distribution"}),e.jsx("p",{className:"clean-card-sub",children:"Ratio between corporate B2B entities and direct individual clients"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:e.jsx(P,{width:"100%",height:"100%",children:e.jsxs(Ce,{children:[e.jsx(we,{data:q,dataKey:"count",nameKey:"name",cx:"50%",cy:"50%",innerRadius:55,outerRadius:85,paddingAngle:4,label:t=>`${t.name||""}: ${t.value??t.count??0}`,children:q.map((t,a)=>e.jsx(X,{fill:t.color},`cell-${a}`))}),e.jsx(B,{}),e.jsx(Ae,{})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Customer Acquisition Channels"}),e.jsx("p",{className:"clean-card-sub",children:"Marketing channels and lead sources that generated paying clients"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:D.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No acquisition sources mapped yet"}):e.jsx(P,{width:"100%",height:"100%",children:e.jsxs(Se,{data:D,margin:{top:10,right:10,left:-20,bottom:0},children:[e.jsx(K,{strokeDasharray:"3 3",opacity:.08}),e.jsx(Y,{dataKey:"source",stroke:"var(--text-muted)",fontSize:11}),e.jsx(H,{stroke:"var(--text-muted)",fontSize:11,allowDecimals:!1}),e.jsx(B,{formatter:t=>[`${t} Clients`,"Acquired"]}),e.jsx(ke,{dataKey:"count",radius:[5,5,0,0],children:D.map((t,a)=>e.jsx(X,{fill:J[a%J.length]},`src-${a}`))})]})})})]})]}),p==="companies"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Top Corporate Accounts by Contact Density"}),e.jsx("p",{className:"clean-card-sub",children:"Organizations with active client contacts registered in your CRM"})]}),e.jsxs("span",{className:"clean-badge clean-badge-primary",children:[C.length," Organizations"]})]}),e.jsx("div",{style:{padding:"1.25rem",display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"1rem"},children:C.length===0?e.jsx("div",{style:{textAlign:"center",gridColumn:"1 / -1",padding:"3rem",color:"var(--text-muted)"},children:"No corporate client accounts created yet"}):C.map((t,a)=>e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"10px",padding:"1rem",display:"flex",flexDirection:"column",justifyContent:"space-between"},children:[e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"},children:[e.jsxs("span",{style:{fontSize:"0.72rem",fontWeight:700,color:"#6366f1"},children:["#",a+1," CORPORATE ACCOUNT"]}),e.jsxs("span",{className:"clean-badge clean-badge-primary",style:{fontSize:"0.68rem",padding:"2px 6px"},children:[t.count," Contacts"]})]}),e.jsx("h4",{style:{margin:"0 0 8px",fontSize:"1rem",fontWeight:700,color:"var(--text-primary)"},children:t.companyName}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"4px",fontSize:"0.8rem",color:"var(--text-secondary)"},children:t.contacts.slice(0,3).map(s=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"5px"},children:[e.jsx(_,{size:12,style:{color:"#10b981"}}),e.jsxs("span",{children:[s.firstName," ",s.lastName]})]},s.customerId))})]}),e.jsx("div",{style:{marginTop:"0.85rem",paddingTop:"0.65rem",borderTop:"1px solid var(--border-color)",display:"flex",justifyContent:"flex-end"},children:e.jsxs("button",{onClick:()=>{O(t.companyName),b("directory")},className:"clean-back-btn",style:{fontSize:"0.75rem",padding:"3px 8px",display:"flex",alignItems:"center",gap:3},children:["View Records ",e.jsx(ue,{size:12})]})})]},t.companyName))})]}),p==="directory"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:240,flexWrap:"wrap"},children:[e.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:320},children:[e.jsx(ge,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search customer, email, company, source...",value:x,onChange:t=>O(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("select",{value:y,onChange:t=>Z(t.target.value),style:{padding:"7px 10px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem"},children:[e.jsx("option",{value:"all",children:"All Account Types"}),e.jsx("option",{value:"corporate",children:"Corporate B2B Only"}),e.jsx("option",{value:"individual",children:"Individual Clients Only"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:$.length})," of ",r.length," records"]}),e.jsxs("button",{onClick:W,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(fe,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer Name"}),e.jsx("th",{children:"Account Classification"}),e.jsx("th",{children:"Email Address"}),e.jsx("th",{children:"Phone"}),e.jsx("th",{children:"Acquisition Channel"}),e.jsx("th",{children:"Created Date"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:$.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No customer records match your filter query"})}):$.map(t=>{var a,s;return e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsxs("div",{style:{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg, #6366f1, #3b82f6)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.78rem",flexShrink:0},children:[((a=t.firstName)==null?void 0:a[0])||"C",((s=t.lastName)==null?void 0:s[0])||""]}),e.jsxs("div",{children:[e.jsxs("strong",{style:{color:"var(--text-primary)",display:"block",fontSize:"0.85rem"},children:[t.firstName," ",t.lastName]}),t.jobTitle&&e.jsx("span",{style:{fontSize:"0.72rem",color:"var(--text-muted)"},children:t.jobTitle})]})]})}),e.jsx("td",{children:t.companyName?e.jsxs("span",{className:"clean-badge clean-badge-primary",style:{fontSize:"0.72rem",display:"inline-flex",alignItems:"center",gap:3},children:[e.jsx(E,{size:11})," ",t.companyName]}):e.jsx("span",{className:"clean-badge",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6",fontSize:"0.72rem"},children:"Individual"})}),e.jsx("td",{children:t.email?e.jsxs("a",{href:`mailto:${t.email}`,style:{color:"var(--text-secondary)",textDecoration:"none",display:"flex",alignItems:"center",gap:4,fontSize:"0.82rem"},children:[e.jsx(be,{size:12,style:{color:"var(--text-muted)"}})," ",t.email]}):e.jsx("span",{style:{color:"var(--text-muted)"},children:"—"})}),e.jsx("td",{children:t.phone?e.jsxs("a",{href:`tel:${t.phone}`,style:{color:"var(--text-secondary)",textDecoration:"none",display:"flex",alignItems:"center",gap:4,fontSize:"0.82rem"},children:[e.jsx(ye,{size:12,style:{color:"var(--text-muted)"}})," ",t.phone]}):e.jsx("span",{style:{color:"var(--text-muted)"},children:"—"})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:"rgba(16,185,129,0.12)",color:"#10b981",fontSize:"0.72rem"},children:t.sourceName||"Direct"})}),e.jsx("td",{style:{fontSize:"0.8rem",color:"var(--text-secondary)"},children:t.createdAt?new Date(t.createdAt).toLocaleDateString():"—"}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("button",{onClick:()=>l(`/customers/${t.customerId}`),className:"clean-back-btn",style:{padding:"3px 8px",fontSize:"0.75rem",display:"inline-flex",alignItems:"center",gap:3},children:["Profile ",e.jsx(je,{size:11})]})})]},t.customerId)})})]})})]})]})})};export{Fe as CustomerReportsScreen};
