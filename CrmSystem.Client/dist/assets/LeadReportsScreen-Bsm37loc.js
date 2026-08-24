import{u as ae,j as e,a as w}from"./index-XKpBSQE6.js";import{c as se,r}from"./vendor-CU1aK5H2.js";import{L as re}from"./Layout-BRWgx_D7.js";/* empty css                     */import{ae as ie,F as ne,aY as oe,R as le,w as de,$ as ce,aT as pe,au as O,C as xe,O as he,a_ as me,S as ge,ap as ue,Q as be,a3 as fe,aD as ve}from"./icons-XF-Wbpck.js";import{R as B,C as je,X as ye,Y as Se,T as H,L as Ne}from"./CartesianChart-Bn2Og2IX.js";import{B as we,a as Le,C as _}from"./BarChart-TJnjtq0N.js";import{P as ke,a as Ce}from"./PieChart-C57W5Fy3.js";import{L as ze}from"./Legend-BGvQ8jOe.js";import"./signalr-BSDearS1.js";const Y=["#f59e0b","#10b981","#6366f1","#ec4899","#3b82f6","#8b5cf6","#06b6d4"];function $e(c,i,a,p,x,b){const z=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),$=`lead_conversion_report_${new Date().toISOString().split("T")[0]}.pdf`,y=(i==null?void 0:i.total)??c.length,f=(i==null?void 0:i.converted)??0,L=y>0?(f/y*100).toFixed(1):"0",g=window.open("","_blank");if(!g){alert("Please allow popups for this site to generate and download PDF reports.");return}const A=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lead Funnel, Sources & SLA Intelligence Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; LEAD REPORT</h1>
              <p class="pdf-sub">Funnel Velocity, Marketing Attribution & SLA Response Analysis</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${z}</div>
              <div><strong>Period:</strong> ${x}</div>
              <div><strong>Scope:</strong> ${b.toUpperCase()}</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Total Leads Inbound</div>
              <div class="pdf-stat-value">${y}</div>
              <div class="pdf-stat-sub">Prospect pipeline volume</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Conversion Rate</div>
              <div class="pdf-stat-value">${L}%</div>
              <div class="pdf-stat-sub">${f} leads converted</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Qualified Leads</div>
              <div class="pdf-stat-value">${(i==null?void 0:i.qualified)??0}</div>
              <div class="pdf-stat-sub">High intent ready for proposal</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">SLA Follow-up Rate</div>
              <div class="pdf-stat-value">${p!=null&&p.scheduledPercentage?`${p.scheduledPercentage.toFixed(0)}%`:"—"}</div>
              <div class="pdf-stat-sub">Response compliance rate</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #78350f; margin-bottom: 4px; text-transform: uppercase;">
              Executive Sales Funnel Guidance:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #451a03; line-height: 1.4;">
              <li><strong>Funnel Efficiency:</strong> <strong>${L}%</strong> overall conversion rate across all marketing channels.</li>
              <li><strong>Response SLA:</strong> Maintain under 1-hour first response time on Urgent/High priority leads to maximize qualification velocity.</li>
              <li><strong>Source Attribution:</strong> Double down ad spend on top-converting channels and streamline lead qualification routing.</li>
            </ul>
          </div>

          <div class="pdf-section-title">Lead Priority Tiers</div>
          <table class="pdf-table" style="margin-bottom: 18px;">
            <thead>
              <tr>
                <th>Priority Tier</th>
                <th>Avg Score</th>
                <th>Total Inbound</th>
                <th>In Progress</th>
                <th>Converted</th>
                <th>Disqualified</th>
              </tr>
            </thead>
            <tbody>
              ${a.map(n=>{var v;return`
                <tr>
                  <td><strong>${n.priority} Priority</strong></td>
                  <td>${((v=n.avgScore)==null?void 0:v.toFixed(0))||"0"} / 100</td>
                  <td>${n.total}</td>
                  <td>${n.active}</td>
                  <td style="color: #10b981; font-weight: 700;">${n.converted}</td>
                  <td style="color: #ef4444;">${n.lost}</td>
                </tr>
              `}).join("")}
            </tbody>
          </table>

          ${c.length>0?`
            <div class="pdf-section-title">Lead Ledger Sample (${c.length} Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lead Name</th>
                  <th>Company</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                ${c.slice(0,50).map((n,v)=>`
                  <tr>
                    <td>${v+1}</td>
                    <td><strong>${n.firstName||""} ${n.lastName||""}</strong></td>
                    <td>${n.companyName||"—"}</td>
                    <td>${n.priority||"Medium"}</td>
                    <td>${n.statusName||"New"}</td>
                    <td>${n.sourceName||"Direct"}</td>
                    <td>${n.createdAt?new Date(n.createdAt).toLocaleDateString():"—"}</td>
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
              filename:     '${$}',
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
  `;g.document.write(A),g.document.close()}const Ae=({active:c,payload:i})=>{if(c&&i&&i.length){const a=i[0].payload;return e.jsxs("div",{style:{background:"var(--bg-secondary, #0f172a)",border:"1px solid var(--border-color, rgba(255,255,255,0.15))",borderRadius:"7px",padding:"6px 10px",boxShadow:"0 6px 16px rgba(0,0,0,0.35)",minWidth:"120px",color:"var(--text-primary, #ffffff)",backdropFilter:"blur(8px)",zIndex:1e3,pointerEvents:"none"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px"},children:[e.jsx("span",{style:{width:"7px",height:"7px",borderRadius:"50%",backgroundColor:a.color,display:"inline-block",flexShrink:0}}),e.jsx("strong",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-primary)"},children:a.fullName||a.name})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",fontSize:"0.75rem"},children:[e.jsx("span",{style:{color:"var(--text-muted, #94a3b8)"},children:"Leads:"}),e.jsxs("span",{style:{fontWeight:600,color:a.color},children:[(a.count??0).toLocaleString()," ",e.jsxs("span",{style:{color:"var(--text-muted)",fontWeight:400,fontSize:"0.72rem"},children:["(",a.pct,")"]})]})]})]})}return null},De=c=>{const{x:i,y:a,payload:p,isMobile:x}=c,b=(p==null?void 0:p.value)||"";return e.jsx("g",{transform:`translate(${i},${a})`,children:e.jsx("text",{x:0,y:0,dy:x?8:10,textAnchor:"middle",fill:"var(--text-secondary, #94a3b8)",fontSize:x?9.5:11.5,fontWeight:500,letterSpacing:x?"-0.01em":"normal",children:b})})},Oe=()=>{const c=se(),{isManagerOrAbove:i}=ae(),[a,p]=r.useState(()=>typeof window<"u"&&window.innerWidth<640);r.useEffect(()=>{const t=()=>p(window.innerWidth<640);return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]);const x=new Date().toISOString().split("T")[0],b=new Date(Date.now()-30*864e5).toISOString().split("T")[0],z=new Date(Date.now()-90*864e5).toISOString().split("T")[0],$=new Date(Date.now()-365*864e5).toISOString().split("T")[0],y=[{label:"30 Days",start:b,end:x},{label:"90 Days",start:z,end:x},{label:"1 Year",start:$,end:x},{label:"All Time",start:"",end:""}],[f,L]=r.useState(b),[g,A]=r.useState(x),[n,v]=r.useState("30 Days"),[S,I]=r.useState(i?"team":"personal"),[G,E]=r.useState(!0),[j,D]=r.useState("funnel"),[u,Q]=r.useState(""),[k,V]=r.useState("all"),[s,K]=r.useState(null),[P,X]=r.useState([]),[T,J]=r.useState([]),[m,Z]=r.useState(null),[h,ee]=r.useState([]),M=async()=>{E(!0);try{const t=new URLSearchParams;f&&t.append("startDate",f),g&&t.append("endDate",g),t.append("scope",S);const[d,N,R,C,o]=await Promise.all([w.get(`/api/reports/funnel?${t.toString()}`),w.get(`/api/reports/lead-source?${t.toString()}`),w.get(`/api/reports/lead-priority?${t.toString()}`),w.get(`/api/reports/followup-sla?${t.toString()}`),w.get("/api/leads?page=1&pageSize=1000")]);K(d),X(N??[]),J(R??[]),Z(C);const l=Array.isArray(o)?o:Array.isArray(o==null?void 0:o.data)?o.data:Array.isArray(o==null?void 0:o.items)?o.items:[];ee(l)}catch(t){console.error("Failed to load lead reports",t)}finally{E(!1)}};r.useEffect(()=>{M()},[f,g,S]);const W=r.useMemo(()=>{if(!s)return[];const t=s.total||0;return[{name:"Inbound",fullName:"Total Inbound Leads",count:t,color:"#f59e0b",pct:"100%",desc:"All captured inbound leads"},{name:"Contacted",fullName:"Active / Contacted",count:s.active||0,color:"#3b82f6",pct:t>0?`${(s.active/t*100).toFixed(1)}%`:"0%",desc:"Prospects in discovery & active contact"},{name:"Qualified",fullName:"Sales Qualified (SQL)",count:s.qualified||0,color:"#8b5cf6",pct:t>0?`${(s.qualified/t*100).toFixed(1)}%`:"0%",desc:"Budget and criteria verified"},{name:"Converted",fullName:"Deal Converted (Won)",count:s.converted||0,color:"#10b981",pct:t>0?`${(s.converted/t*100).toFixed(1)}%`:"0%",desc:"Successfully converted to opportunities"},{name:"Lost",fullName:"Disqualified / Lost",count:s.lost||0,color:"#ef4444",pct:t>0?`${(s.lost/t*100).toFixed(1)}%`:"0%",desc:"Unresponsive or criteria mismatch"}]},[s]),q=r.useMemo(()=>!s||!s.total?0:s.converted/s.total*100,[s]),F=r.useMemo(()=>Array.isArray(h)?h.filter(t=>{const d=!u||`${t.firstName} ${t.lastName}`.toLowerCase().includes(u.toLowerCase())||t.email&&t.email.toLowerCase().includes(u.toLowerCase())||t.companyName&&t.companyName.toLowerCase().includes(u.toLowerCase())||t.sourceName&&t.sourceName.toLowerCase().includes(u.toLowerCase()),N=k==="all"||(t.priority||"").toLowerCase()===k.toLowerCase();return d&&N}):[],[h,u,k]),U=()=>{if(!h||!h.length){alert("No lead records available to export.");return}const t=["LeadId","FirstName","LastName","Email","Phone","Company","Priority","Status","Source","CreatedAt"],d=h.map(l=>[l.leadId,`"${(l.firstName||"").replace(/"/g,'""')}"`,`"${(l.lastName||"").replace(/"/g,'""')}"`,`"${(l.email||"").replace(/"/g,'""')}"`,`"${(l.phone||"").replace(/"/g,'""')}"`,`"${(l.companyName||"").replace(/"/g,'""')}"`,`"${l.priority||"Medium"}"`,`"${l.statusName||"New"}"`,`"${(l.sourceName||"").replace(/"/g,'""')}"`,`"${l.createdAt||""}"`]),N=[t.join(","),...d.map(l=>l.join(","))].join(`\r
`),R=new Blob(["\uFEFF"+N],{type:"text/csv;charset=utf-8;"}),C=URL.createObjectURL(R),o=document.createElement("a");o.setAttribute("href",C),o.setAttribute("download",`lead_pipeline_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(o),o.click(),document.body.removeChild(o),setTimeout(()=>URL.revokeObjectURL(C),1e3)},te=()=>{$e(h,s,T,m,n,S)};return e.jsx(re,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>c("/leads"),className:"clean-back-btn",children:[e.jsx(ie,{size:15})," All Leads"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b",borderColor:"rgba(245,158,11,0.25)"},children:"Lead Intelligence"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:te,className:"clean-btn-primary",style:{background:"linear-gradient(135deg, #f59e0b, #d97706)"},title:"Export PDF Executive Report",children:[e.jsx(ne,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:U,className:"clean-btn-secondary",title:"Download CSV Dataset",children:[e.jsx(oe,{size:15})," Export CSV"]}),e.jsx("button",{onClick:M,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Report Data",children:e.jsx(le,{size:14,className:G?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Lead Funnel, Sources & SLA Intelligence"}),e.jsx("p",{className:"clean-report-desc",children:"Prospect qualification velocity, marketing channel attribution, and follow-up response compliance."})]}),e.jsxs("div",{className:"clean-toolbar",children:[e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Scope:"}),i&&e.jsxs("div",{className:"clean-segmented",children:[e.jsx("button",{className:`clean-segmented-btn ${S==="personal"?"active":""}`,onClick:()=>I("personal"),children:"My Leads"}),e.jsx("button",{className:`clean-segmented-btn ${S==="team"?"active":""}`,onClick:()=>I("team"),children:"All Team"})]})]}),e.jsxs("div",{className:"clean-toolbar-group",children:[e.jsx("span",{style:{fontSize:"0.78rem",fontWeight:600,color:"var(--text-muted)"},children:"Period:"}),e.jsx("div",{className:"clean-preset-group",children:y.map(t=>e.jsx("button",{className:`clean-preset-btn ${n===t.label?"active":""}`,onClick:()=>{v(t.label),L(t.start),A(t.end)},children:t.label},t.label))})]})]})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Total Leads Inbound"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b"},children:e.jsx(de,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(s==null?void 0:s.total)??h.length}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(245,158,11,0.14)",color:"#f59e0b"},children:"Pipeline"}),e.jsx("span",{children:"Prospect volume"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Conversion Rate"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(ce,{size:17})})]}),e.jsxs("div",{className:"clean-stat-value",children:[q.toFixed(1),"%"]}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsxs("span",{className:"clean-pill-delta clean-pill-green",children:[e.jsx(pe,{size:11})," ",(s==null?void 0:s.converted)??0," Won"]}),e.jsx("span",{children:"Lead-to-deal conversion"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Qualified Leads"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(99,102,241,0.12)",color:"#6366f1"},children:e.jsx(O,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(s==null?void 0:s.qualified)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"Sales Ready"}),e.jsx("span",{children:"High conversion intent"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"SLA Scheduled Coverage"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(236,72,153,0.12)",color:"#ec4899"},children:e.jsx(xe,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:m!=null&&m.scheduledPercentage?`${m.scheduledPercentage.toFixed(0)}%`:"—"}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(236,72,153,0.14)",color:"#ec4899"},children:"SLA Target"}),e.jsx("span",{children:"Active booked follow-ups"})]})]})]}),e.jsxs("div",{className:"clean-tab-nav",children:[e.jsxs("button",{onClick:()=>D("funnel"),className:`clean-tab-item ${j==="funnel"?"active":""}`,children:[e.jsx(he,{size:15})," Funnel & Marketing Attribution"]}),e.jsxs("button",{onClick:()=>D("matrix"),className:`clean-tab-item ${j==="matrix"?"active":""}`,children:[e.jsx(O,{size:15})," Priority & SLA Health Matrix"]}),e.jsxs("button",{onClick:()=>D("directory"),className:`clean-tab-item ${j==="directory"?"active":""}`,children:[e.jsx(me,{size:15})," Leads Directory Ledger (",h.length,")"]})]}),j==="funnel"&&e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.25rem"},children:[e.jsxs("div",{className:"clean-chart-grid",children:[e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Lead Conversion Stages"}),e.jsx("p",{className:"clean-card-sub",children:"Inbound pipeline progression through qualification gates"})]})}),e.jsx("div",{style:{height:a?320:350,padding:a?"0.75rem 0.25rem 0.25rem 0":"1.25rem"},children:e.jsx(B,{width:"100%",height:"100%",children:e.jsxs(we,{data:W,margin:{top:a?24:32,right:a?8:20,left:a?-26:-10,bottom:a?8:20},barCategoryGap:a?"14%":"24%",children:[e.jsx(je,{strokeDasharray:"3 3",opacity:.08,vertical:!1}),e.jsx(ye,{dataKey:"name",stroke:"var(--text-muted)",fontSize:a?10:12,tickLine:!1,axisLine:{stroke:"var(--border-color, rgba(255,255,255,0.1))"},tick:e.jsx(De,{isMobile:a}),interval:0}),e.jsx(Se,{allowDecimals:!1,stroke:"var(--text-muted)",fontSize:a?9.5:11,tickLine:!1,axisLine:!1,width:a?24:32,tick:{fill:"var(--text-muted)",fontSize:a?9.5:11}}),e.jsx(H,{content:e.jsx(Ae,{}),cursor:{fill:"rgba(255,255,255,0.04)"}}),e.jsxs(Le,{dataKey:"count",radius:[5,5,0,0],maxBarSize:a?36:48,children:[e.jsx(Ne,{dataKey:"count",position:"top",offset:6,style:{fill:"var(--text-primary, #ffffff)",fontSize:a?11:13,fontWeight:600}}),W.map((t,d)=>e.jsx(_,{fill:t.color},`cell-${d}`))]})]})})})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Marketing Channels & Attribution"}),e.jsx("p",{className:"clean-card-sub",children:"Inbound lead distribution by origin channel"})]})}),e.jsx("div",{style:{height:a?260:280,padding:a?"0.75rem 0.25rem":"1rem"},children:P.length===0?e.jsx("div",{style:{display:"flex",justifyContent:"center",alignItems:"center",height:"100%",color:"var(--text-muted)"},children:"No attribution channels recorded"}):e.jsx(B,{width:"100%",height:"100%",children:e.jsxs(ke,{children:[e.jsx(Ce,{data:P,dataKey:"count",nameKey:"source",cx:"50%",cy:"50%",innerRadius:a?42:55,outerRadius:a?68:85,paddingAngle:4,label:a?!1:(t=>`${t.name||t.source||""}: ${t.value??t.count??0}`),children:P.map((t,d)=>e.jsx(_,{fill:Y[d%Y.length]},`src-${d}`))}),e.jsx(H,{}),e.jsx(ze,{})]})})})]})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Sales Funnel Strategy & Guidance"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#f59e0b",marginBottom:4,fontSize:"0.82rem"},children:"🎯 Funnel Efficiency"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:["Your current lead-to-deal conversion rate stands at ",e.jsxs("strong",{children:[q.toFixed(1),"%"]}),". Focus sales follow-up efforts on high-scoring prospects."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"⏱️ Response SLA Velocity"}),e.jsxs("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:[e.jsx("strong",{children:m!=null&&m.scheduledPercentage?`${m.scheduledPercentage.toFixed(0)}%`:"—"})," of active leads have scheduled follow-up touchpoints. Faster response correlates with 3x higher win rates."]})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#6366f1",marginBottom:4,fontSize:"0.82rem"},children:"📈 Inbound Channel Focus"}),e.jsx("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:"Optimize campaigns toward the highest-performing inbound channel and automate initial inquiry qualification."})]})]})]})]}),j==="matrix"&&e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsxs("div",{children:[e.jsx("h3",{className:"clean-card-title",children:"Lead Priority Tier & SLA Health Matrix"}),e.jsx("p",{className:"clean-card-sub",children:"Progression, lead scoring, and outcome breakdown by priority level"})]})}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Priority Tier"}),e.jsx("th",{children:"Average Score"}),e.jsx("th",{children:"Total Inbound"}),e.jsx("th",{children:"Active In Progress"}),e.jsx("th",{children:"Converted"}),e.jsx("th",{children:"Disqualified"})]})}),e.jsx("tbody",{children:T.map(t=>{var d;return e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("strong",{style:{color:t.priority==="Urgent"?"#ef4444":t.priority==="High"?"#f59e0b":"var(--text-primary)"},children:[t.priority," Priority"]})}),e.jsx("td",{children:e.jsxs("span",{className:"clean-badge clean-badge-primary",style:{fontSize:"0.75rem"},children:[((d=t.avgScore)==null?void 0:d.toFixed(0))||0," / 100"]})}),e.jsx("td",{children:e.jsx("strong",{children:t.total})}),e.jsx("td",{children:t.active}),e.jsx("td",{children:e.jsx("span",{style:{color:"#10b981",fontWeight:700},children:t.converted})}),e.jsx("td",{children:e.jsx("span",{style:{color:"#ef4444"},children:t.lost})})]},t.priority)})})]})})]}),j==="directory"&&e.jsxs("div",{className:"clean-card",children:[e.jsxs("div",{className:"clean-card-header",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:240,flexWrap:"wrap"},children:[e.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:280},children:[e.jsx(ge,{size:15,style:{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}}),e.jsx("input",{type:"text",placeholder:"Search lead, email, company, source...",value:u,onChange:t=>Q(t.target.value),style:{width:"100%",padding:"7px 10px 7px 32px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem",boxSizing:"border-box"}})]}),e.jsxs("select",{value:k,onChange:t=>V(t.target.value),style:{padding:"7px 10px",background:"var(--bg-tertiary, rgba(0,0,0,0.15))",border:"1px solid var(--border-color)",borderRadius:"6px",color:"var(--text-primary)",fontSize:"0.82rem"},children:[e.jsx("option",{value:"all",children:"All Priorities"}),e.jsx("option",{value:"urgent",children:"Urgent"}),e.jsx("option",{value:"high",children:"High"}),e.jsx("option",{value:"medium",children:"Medium"}),e.jsx("option",{value:"low",children:"Low"})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[e.jsxs("span",{style:{fontSize:"0.8rem",color:"var(--text-muted)"},children:["Showing ",e.jsx("strong",{children:F.length})," of ",h.length," records"]}),e.jsxs("button",{onClick:U,className:"clean-btn-secondary",style:{fontSize:"0.75rem",padding:"4px 10px"},children:[e.jsx(ue,{size:12})," Export CSV"]})]})]}),e.jsx("div",{className:"clean-table-container",children:e.jsxs("table",{className:"clean-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Lead Name"}),e.jsx("th",{children:"Company Name"}),e.jsx("th",{children:"Priority"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Email Address"}),e.jsx("th",{children:"Phone"}),e.jsx("th",{children:"Acquisition Source"}),e.jsx("th",{style:{textAlign:"right"},children:"Actions"})]})}),e.jsx("tbody",{children:F.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,style:{textAlign:"center",padding:"3rem",color:"var(--text-muted)"},children:"No lead records match your query"})}):F.map(t=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("strong",{style:{color:"var(--text-primary)",fontSize:"0.85rem"},children:[t.firstName," ",t.lastName]})}),e.jsx("td",{children:t.companyName||"—"}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:t.priority==="Urgent"?"rgba(239,68,68,0.15)":t.priority==="High"?"rgba(245,158,11,0.15)":"rgba(99,102,241,0.15)",color:t.priority==="Urgent"?"#ef4444":t.priority==="High"?"#f59e0b":"#818cf8",fontSize:"0.72rem"},children:t.priority||"Medium"})}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6",fontSize:"0.72rem"},children:t.statusName||"New"})}),e.jsx("td",{children:t.email?e.jsxs("a",{href:`mailto:${t.email}`,style:{color:"var(--text-secondary)",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,fontSize:"0.82rem"},children:[e.jsx(be,{size:12,style:{color:"var(--text-muted)"}})," ",t.email]}):"—"}),e.jsx("td",{children:t.phone?e.jsxs("a",{href:`tel:${t.phone}`,style:{color:"var(--text-secondary)",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,fontSize:"0.82rem"},children:[e.jsx(fe,{size:12,style:{color:"var(--text-muted)"}})," ",t.phone]}):"—"}),e.jsx("td",{children:e.jsx("span",{className:"clean-badge",style:{background:"rgba(16,185,129,0.12)",color:"#10b981",fontSize:"0.72rem"},children:t.sourceName||"Direct"})}),e.jsx("td",{style:{textAlign:"right"},children:e.jsxs("button",{onClick:()=>c(`/leads/${t.leadId}`),className:"clean-back-btn",style:{padding:"3px 8px",fontSize:"0.75rem",display:"inline-flex",alignItems:"center",gap:3},children:["Profile ",e.jsx(ve,{size:11})]})})]},t.leadId))})]})})]})]})})};export{Oe as LeadReportsScreen};
