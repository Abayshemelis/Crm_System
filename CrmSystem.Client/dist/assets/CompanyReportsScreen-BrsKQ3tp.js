import{j as e,a as F}from"./index-B0Yvr7-X.js";import{c as O,r as i}from"./vendor-CU1aK5H2.js";import{L as W}from"./Layout-SZ4QbJHw.js";/* empty css                     */import{a9 as _,F as M,aV as G,R as U,u as z,L as V,ao as $,t as K,K as H,aX as Y,aA as E,S as q,ak as X}from"./icons-Wso9gVAh.js";import{R as T,C as J,X as Q,Y as Z,T as I}from"./CartesianChart-Bn2Og2IX.js";import{B as ee,a as te,C as R}from"./BarChart-TJnjtq0N.js";import{P as ae,a as se}from"./PieChart-C57W5Fy3.js";import{L as re}from"./Legend-BGvQ8jOe.js";import"./signalr-BSDearS1.js";const y=["#3b82f6","#10b981","#6366f1","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];function ne(r){if(!r||!r.length)return;const a=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),b=`company_portfolio_report_${new Date().toISOString().split("T")[0]}.pdf`,u=r.reduce((o,x)=>o+(x.contactCount||0),0),h=r.filter(o=>!!o.website).length,c=r.length>0?(u/r.length).toFixed(1):"0",m=window.open("","_blank");if(!m){alert("Please allow popups for this site to generate and download PDF reports.");return}const l=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Company Accounts & B2B Portfolio Report - CRM</title>
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
            background: #3b82f6;
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
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
          }
          .pdf-btn-primary:hover { background: #2563eb; }
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
          .pdf-btn-secondary:hover { background: rgba(255,255,255,0.25); }
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
          .pdf-brand { font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px 0; }
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
            border-left: 4px solid #3b82f6;
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; COMPANY REPORT</h1>
              <p class="pdf-sub">B2B Corporate Account Segmentation & Stakeholder Contact Depth</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${a}</div>
              <div><strong>Total Accounts:</strong> ${r.length}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Organizations</div>
              <div class="pdf-stat-value">${r.length}</div>
              <div class="pdf-stat-sub">Active corporate accounts</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Attached Contacts</div>
              <div class="pdf-stat-value">${u}</div>
              <div class="pdf-stat-sub">Team members registered</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Digital Presence</div>
              <div class="pdf-stat-value">${h}</div>
              <div class="pdf-stat-sub">Verified website accounts</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Avg Contacts / Org</div>
              <div class="pdf-stat-value">${c}</div>
              <div class="pdf-stat-sub">Account stakeholder depth</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Strategic Corporate Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>Stakeholder Density:</strong> Average of <strong>${c}</strong> contacts per organization. Target multi-stakeholder mapping (2+ contacts) on high-value accounts to prevent single-point attrition.</li>
              <li><strong>Sector Diversification:</strong> Track industry distribution to identify high-converting verticals and focus enterprise sales campaigns.</li>
              <li><strong>Account Hygiene:</strong> <strong>${h}</strong> out of ${r.length} organizations have verified websites. Ensure complete digital profiles for all active accounts.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Corporate Directory Ledger (${r.length} Accounts)</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Company Name</th>
                <th>Industry Sector</th>
                <th>Company Size</th>
                <th>Website</th>
                <th>Phone</th>
                <th>Contacts</th>
              </tr>
            </thead>
            <tbody>
              ${r.map((o,x)=>`
                <tr>
                  <td>${x+1}</td>
                  <td><strong>${o.name}</strong></td>
                  <td>${o.industry||"General"}</td>
                  <td>${o.companySize||"—"}</td>
                  <td>${o.website||"—"}</td>
                  <td>${o.phone||"—"}</td>
                  <td><strong>${o.contactCount||0}</strong></td>
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
              filename:     '${b}',
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
  `;m.document.write(l),m.document.close()}const ue=()=>{var A;const r=O(),[a,b]=i.useState([]),[u,h]=i.useState(!0),[c,m]=i.useState("distribution"),[l,o]=i.useState(""),[x,B]=i.useState("all"),[v,ie]=i.useState("all"),S=()=>{h(!0),F.get("/api/companies?page=1&pageSize=1000").then(t=>{const s=Array.isArray(t)?t:Array.isArray(t==null?void 0:t.data)?t.data:Array.isArray(t==null?void 0:t.items)?t.items:[];b(s)}).catch(t=>{console.error("Failed to load company report data",t),b([])}).finally(()=>h(!1))};i.useEffect(()=>{S()},[]);const j=i.useMemo(()=>Array.isArray(a)?a.reduce((t,s)=>t+(s.contactCount||0),0):0,[a]),w=i.useMemo(()=>Array.isArray(a)?a.filter(t=>!!t.website).length:0,[a]),f=i.useMemo(()=>{if(!Array.isArray(a)||a.length===0)return[{name:"No Data",count:0}];const t={};return a.forEach(s=>{var p;const n=((p=s.industry)==null?void 0:p.trim())||"Uncategorized";t[n]=(t[n]||0)+1}),Object.entries(t).map(([s,n])=>({name:s,count:n})).sort((s,n)=>n.count-s.count)},[a]),N=i.useMemo(()=>{if(!Array.isArray(a)||a.length===0)return[{name:"Not Specified",count:0}];const t={};return a.forEach(s=>{var p;const n=((p=s.companySize)==null?void 0:p.trim())||"Not Specified";t[n]=(t[n]||0)+1}),Object.entries(t).map(([s,n])=>({name:s,count:n}))},[a]),L=i.useMemo(()=>{if(!Array.isArray(a))return[];const t=new Set;return a.forEach(s=>{s.industry&&t.add(s.industry)}),Array.from(t)},[a]),C=i.useMemo(()=>Array.isArray(a)?a.filter(t=>{const s=!l||t.name&&t.name.toLowerCase().includes(l.toLowerCase())||t.industry&&t.industry.toLowerCase().includes(l.toLowerCase())||t.companySize&&t.companySize.toLowerCase().includes(l.toLowerCase())||t.website&&t.website.toLowerCase().includes(l.toLowerCase())||t.email&&t.email.toLowerCase().includes(l.toLowerCase()),n=x==="all"||t.industry===x,p=v==="all"||t.companySize===v;return s&&n&&p}):[],[a,l,x,v]),k=()=>{if(!a||!a.length){alert("No company records available to export.");return}const t=["CompanyId","Name","Industry","CompanySize","Website","Phone","Email","ContactCount"],s=a.map(d=>[d.companyId,`"${(d.name||"").replace(/"/g,'""')}"`,`"${(d.industry||"").replace(/"/g,'""')}"`,`"${(d.companySize||"").replace(/"/g,'""')}"`,`"${(d.website||"").replace(/"/g,'""')}"`,`"${(d.phone||"").replace(/"/g,'""')}"`,`"${(d.email||"").replace(/"/g,'""')}"`,d.contactCount||0]),n=[t.join(","),...s.map(d=>d.join(","))].join(`\r
`),p=new Blob(["\uFEFF"+n],{type:"text/csv;charset=utf-8;"}),D=URL.createObjectURL(p),g=document.createElement("a");g.setAttribute("href",D),g.setAttribute("download",`company_portfolio_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(g),g.click(),document.body.removeChild(g),setTimeout(()=>URL.revokeObjectURL(D),1e3)},P=()=>{if(!a||!a.length){alert("No company records available to export.");return}ne(a)};return e.jsx(W,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>r("/companies"),className:"clean-back-btn",children:[e.jsx(_,{size:15})," All Companies"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"B2B Enterprise Intelligence"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:P,className:"clean-btn-primary",style:{background:"linear-gradient(135deg, #3b82f6, #2563eb)"},title:"Export PDF Executive Summary",children:[e.jsx(M,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:k,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(G,{size:15})," Export CSV"]}),e.jsx("button",{onClick:S,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Data",children:e.jsx(U,{size:14,className:u?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Company Accounts & B2B Portfolio Report"}),e.jsx("p",{className:"clean-report-desc",children:"Industry vertical diversification, organization size distribution, and key corporate account density."})]})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Organizations"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6"},children:e.jsx(z,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:a.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Active"}),e.jsx("span",{children:"B2B enterprise accounts"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Market Sectors"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(V,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:f.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-green",children:"Tracked"}),e.jsx("span",{children:"Industry verticals"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Digital Presence"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(99,102,241,0.12)",color:"#6366f1"},children:e.jsx($,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:w}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta clean-pill-blue",children:[a.length>0?(w/a.length*100).toFixed(0):0,"%"]}),e.jsx("span",{children:"Verified websites"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Attached Contacts"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b"},children:e.jsx(K,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:j}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta",style:{background:"rgba(245,158,11,0.14)",color:"#f59e0b"},children:[a.length>0?(j/a.length).toFixed(1):0," / org"]}),e.jsx("span",{children:"Team stakeholder depth"})]})]})]}),e.jsxs("div",{className:"clean-tab-nav",children:[e.jsxs("button",{onClick:()=>m("distribution"),className:`clean-tab-item ${c==="distribution"?"active":""}`,children:[e.jsx(H,{size:15})," Industry & Size Distribution"]}),e.jsxs("button",{onClick:()=>m("top_accounts"),className:`clean-tab-item ${c==="top_accounts"?"active":""}`,children:[e.jsx(z,{size:15})," Key Accounts by Contact Density"]}),e.jsxs("button",{onClick:()=>m("directory"),className:`clean-tab-item ${c==="directory"?"active":""}`,children:[e.jsx(Y,{size:15})," Corporate Directory Ledger (",a.length,")"]})]}),c==="distribution"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.25rem"},children:[e.jsxs("div",{className:"clean-chart-grid",children:[e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Accounts by Industry Sector"}),e.jsx("p",{className:"clean-card-sub",children:"Top business verticals represented across your client base"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:e.jsx(T,{width:"100%",height:"100%",children:e.jsxs(ee,{data:f.slice(0,8),margin:{top:10,right:10,left:-20,bottom:0},children:[e.jsx(J,{strokeDasharray:"3 3",opacity:.08}),e.jsx(Q,{dataKey:"name",stroke:"var(--text-muted)",fontSize:11}),e.jsx(Z,{stroke:"var(--text-muted)",fontSize:11,allowDecimals:!1}),e.jsx(I,{formatter:t=>[`${t} Organizations`,"Count"]}),e.jsx(te,{dataKey:"count",radius:[5,5,0,0],children:f.map((t,s)=>e.jsx(R,{fill:y[s%y.length]},`ind-${s}`))})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Organization Size Tiers"}),e.jsx("p",{className:"clean-card-sub",children:"Headcount scale and enterprise tier distribution"})]})}),e.jsx("div",{style:{height:280,padding:"1rem"},children:e.jsx(T,{width:"100%",height:"100%",children:e.jsxs(ae,{children:[e.jsx(se,{data:N,dataKey:"count",nameKey:"name",cx:"50%",cy:"50%",innerRadius:55,outerRadius:85,paddingAngle:4,label:t=>`${t.name||""}: ${t.value??t.count??0}`,children:N.map((t,s)=>e.jsx(R,{fill:y[s%y.length]},`sz-${s}`))}),e.jsx(I,{}),e.jsx(re,{})]})})})]})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Executive B2B Strategic Guidance"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#3b82f6",marginBottom:4,fontSize:"0.82rem"},children:"🏢 Stakeholder Depth"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["Your accounts average ",e.jsx("strong",{children:a.length>0?(j/a.length).toFixed(1):0})," contacts per organization. Aim for 2+ key champions on major accounts to build resilience."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"📈 Vertical Focus"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsx("strong",{children:((A=f[0])==null?void 0:A.name)||"Top sector"})," represents your largest customer segment. Develop tailored case studies for this vertical to accelerate new deals."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#f59e0b",marginBottom:4,fontSize:"0.82rem"},children:"🌐 Digital Profile Completion"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsx("strong",{children:w})," of ",a.length," organizations have verified websites. Enrich missing records with corporate domains to power automated enrichment."]})]})]})]})]}),c==="top_accounts"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Key Accounts by Team Size & Stakeholders"}),e.jsx("p",{className:"clean-card-sub",children:"Organizations ranked by number of associated customer contacts"})]}),e.jsxs("span",{className:"clean-badge clean-badge-primary",children:[a.length," Organizations"]})]}),e.jsx("div",{style:{padding:"1.25rem",display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:"1rem"},children:a.length===0?e.jsx("div",{style:{textAlign:"center",gridColumn:"1 / -1",padding:"3rem",color:"var(--text-muted)"},children:"No corporate accounts created yet"}):[...a].sort((t,s)=>(s.contactCount||0)-(t.contactCount||0)).slice(0,12).map((t,s)=>e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"10px",padding:"1rem",display:"flex",flexDirection:"column",justifyContent:"space-between"},children:[e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"},children:[e.jsxs("span",{style:{fontSize:"0.72rem",fontWeight:700,color:"#3b82f6"},children:["#",s+1," CORPORATE ACCOUNT"]}),e.jsxs("span",{className:"clean-badge clean-badge-primary",style:{fontSize:"0.68rem",padding:"2px 6px"},children:[t.contactCount||0," Contacts"]})]}),e.jsx("h4",{style:{margin:"0 0 6px",fontSize:"1rem",fontWeight:700,color:"var(--text-primary)"},children:t.name}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"3px",fontSize:"0.78rem",color:"var(--text-secondary)"},children:[e.jsxs("div",{children:["Industry: ",e.jsx("strong",{style:{color:"var(--text-primary)"},children:t.industry||"General"})]}),t.companySize&&e.jsxs("div",{children:["Size: ",t.companySize]}),t.website&&e.jsx("div",{style:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:e.jsx("a",{href:t.website.startsWith("http")?t.website:`https://${t.website}`,target:"_blank",rel:"noreferrer",style:{color:"var(--accent, #6366f1)",textDecoration:"none"},children:t.website})})]})]}),e.jsx("div",{style:{marginTop:"0.85rem",paddingTop:"0.65rem",borderTop:"1px solid var(--border-color)",display:"flex",justifyContent:"flex-end"},children:e.jsxs("button",{onClick:()=>r(`/companies/${t.companyId}`),className:"clean-back-btn",style:{fontSize:"0.75rem",padding:"3px 8px",display:"flex",alignItems:"center",gap:3},children:["Profile ",e.jsx(E,{size:11})]})})]},t.companyId))})]}),c==="directory"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:240,flexWrap:"wrap"},children:[e.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:280},children:[e.jsx(q,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search company, industry, domain...",value:l,onChange:t=>o(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("select",{value:x,onChange:t=>B(t.target.value),style:{padding:"7px 10px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem"},children:[e.jsx("option",{value:"all",children:"All Industries"}),L.map(t=>e.jsx("option",{value:t,children:t},t))]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:C.length})," of ",a.length," records"]}),e.jsxs("button",{onClick:k,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(X,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Company Name"}),e.jsx("th",{children:"Industry Sector"}),e.jsx("th",{children:"Size Tier"}),e.jsx("th",{children:"Website Domain"}),e.jsx("th",{children:"Contacts"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:C.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No corporate accounts match your query"})}):C.map(t=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("div",{style:{width:30,height:30,borderRadius:"6px",background:"linear-gradient(135deg, #3b82f6, #1d4ed8)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.78rem",flexShrink:0},children:e.jsx(z,{size:15})}),e.jsx("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:t.name})]})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge clean-badge-primary",style:{fontSize:"0.72rem"},children:t.industry||"General"})}),e.jsx("td",{style:{fontSize:"0.82rem",color:"var(--text-secondary)"},children:t.companySize||"—"}),e.jsx("td",{children:t.website?e.jsxs("a",{href:t.website.startsWith("http")?t.website:`https://${t.website}`,target:"_blank",rel:"noreferrer",style:{color:"var(--accent, #6366f1)",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,fontSize:"0.82rem"},children:[e.jsx($,{size:12,style:{color:"var(--text-muted)"}})," ",t.website]}):e.jsx("span",{style:{color:"var(--text-muted)"},children:"—"})}),e.jsx("td",{children:e.jsx("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:t.contactCount||0})}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("button",{onClick:()=>r(`/companies/${t.companyId}`),className:"clean-back-btn",style:{padding:"3px 8px",fontSize:"0.75rem",display:"inline-flex",alignItems:"center",gap:3},children:["Profile ",e.jsx(E,{size:11})]})})]},t.companyId))})]})})]})]})})};export{ue as CompanyReportsScreen};
