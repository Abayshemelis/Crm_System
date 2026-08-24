import{j as e,a as x}from"./index-XKpBSQE6.js";import{c as f,r as i}from"./vendor-CU1aK5H2.js";import{L as u}from"./Layout-BRWgx_D7.js";/* empty css                     */import{ae as v,F as h,aY as j,R as y,w,u as N,v as C,A as S}from"./icons-XF-Wbpck.js";import"./signalr-BSDearS1.js";function k(t){const a=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}),r=`data_migration_report_${new Date().toISOString().split("T")[0]}.pdf`,s=window.open("","_blank");if(!s){alert("Please allow popups for this site to generate and download PDF reports.");return}const n=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Data Migration & Import Audit Report - CRM</title>
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; IMPORT REPORT</h1>
              <p class="pdf-sub">Data Ingestion Volume, System Migration & Entity Audit</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Generated:</strong> ${a}</div>
              <div><strong>Audit Type:</strong> Complete System Migration</div>
            </div>
          </div>

          <div class="pdf-stat-grid">
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Leads Ingested</div>
              <div class="pdf-stat-value">${(t==null?void 0:t.totalLeadsImported)??0}</div>
              <div class="pdf-stat-sub">Prospect records created</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Customer Accounts</div>
              <div class="pdf-stat-value">${(t==null?void 0:t.totalCustomers)??0}</div>
              <div class="pdf-stat-sub">Total database clients</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Corporate Accounts</div>
              <div class="pdf-stat-value">${(t==null?void 0:t.totalCompanies)??0}</div>
              <div class="pdf-stat-sub">B2B organizations imported</div>
            </div>
            <div class="pdf-stat-box">
              <div class="pdf-stat-label">Product SKUs</div>
              <div class="pdf-stat-value">${(t==null?void 0:t.totalProducts)??0}</div>
              <div class="pdf-stat-sub">Catalog line items & inventory</div>
            </div>
          </div>

          <div class="pdf-insights-box">
            <div style="font-size: 10px; font-weight: 700; color: #1e1b4b; margin-bottom: 4px; text-transform: uppercase;">
              Executive Data Integrity Audit Summary:
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 10.5px; color: #475569; line-height: 1.4;">
              <li><strong>Ingestion Volume:</strong> Database contains <strong>${(t==null?void 0:t.totalCustomers)??0}</strong> client accounts and <strong>${(t==null?void 0:t.totalCompanies)??0}</strong> corporate organizations.</li>
              <li><strong>Pipeline Inflow:</strong> <strong>${(t==null?void 0:t.totalLeadsImported)??0}</strong> prospect records ready for sales assignment.</li>
              <li><strong>Catalog Readiness:</strong> <strong>${(t==null?void 0:t.totalProducts)??0}</strong> product SKUs available for quote generation.</li>
            </ul>
          </div>

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
              filename:     '${r}',
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
  `;s.document.write(n),s.document.close()}const L=()=>{const t=f(),[a,r]=i.useState(null),[s,n]=i.useState(!0),l=()=>{n(!0),x.get("/api/reports/import-summary").then(d=>r(d)).catch(console.error).finally(()=>n(!1))};i.useEffect(()=>{l()},[]);const p=()=>{if(!a)return;const m=[["Entity Type","Total Count"],["Leads Ingested",(a==null?void 0:a.totalLeadsImported)??0],["Customer Accounts",(a==null?void 0:a.totalCustomers)??0],["Corporate Accounts",(a==null?void 0:a.totalCompanies)??0],["Product SKUs",(a==null?void 0:a.totalProducts)??0]].map(g=>g.join(",")).join(`\r
`),b=new Blob(["\uFEFF"+m],{type:"text/csv;charset=utf-8;"}),c=URL.createObjectURL(b),o=document.createElement("a");o.setAttribute("href",c),o.setAttribute("download",`data_import_audit_report_${new Date().toISOString().slice(0,10)}.csv`),document.body.appendChild(o),o.click(),document.body.removeChild(o),setTimeout(()=>URL.revokeObjectURL(c),1e3)};return e.jsx(u,{children:e.jsxs("div",{className:"clean-report-container",children:[e.jsxs("div",{className:"clean-report-header",children:[e.jsxs("div",{className:"clean-header-top",children:[e.jsxs("div",{className:"clean-breadcrumb-group",children:[e.jsxs("button",{onClick:()=>t("/import"),className:"clean-back-btn",children:[e.jsx(v,{size:15})," Back to Import Wizard"]}),e.jsx("span",{className:"clean-badge clean-badge-primary",children:"Data Migration Audit"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[e.jsxs("button",{onClick:()=>k(a),className:"clean-btn-primary",title:"Export PDF Executive Report",children:[e.jsx(h,{size:15})," Export PDF"]}),e.jsxs("button",{onClick:p,className:"clean-btn-secondary",title:"Download CSV Summary",children:[e.jsx(j,{size:15})," Export CSV"]}),e.jsx("button",{onClick:l,className:"clean-btn-secondary",style:{padding:"6px 10px"},title:"Refresh Data",children:e.jsx(y,{size:14,className:s?"animate-spin":""})})]})]}),e.jsxs("div",{className:"clean-title-group",children:[e.jsx("h1",{className:"clean-report-title",children:"Data Migration & Import Audit Report"}),e.jsx("p",{className:"clean-report-desc",children:"Historical volume of ingested CSV records across leads, customers, corporate accounts, and products."})]})]}),e.jsxs("div",{className:"clean-stat-grid",children:[e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Leads Ingested"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(245,158,11,0.12)",color:"#f59e0b"},children:e.jsx(w,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(a==null?void 0:a.totalLeadsImported)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(245,158,11,0.14)",color:"#f59e0b"},children:"CSV Source"}),e.jsx("span",{children:"Prospect records"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Customer Accounts"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(16,185,129,0.12)",color:"#10b981"},children:e.jsx(N,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(a==null?void 0:a.totalCustomers)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-green",children:"Active"}),e.jsx("span",{children:"Database clients"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Corporate Accounts"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(59,130,246,0.12)",color:"#3b82f6"},children:e.jsx(C,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(a==null?void 0:a.totalCompanies)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta clean-pill-blue",children:"B2B"}),e.jsx("span",{children:"Corporate entities"})]})]}),e.jsxs("div",{className:"clean-stat-card",children:[e.jsxs("div",{className:"clean-stat-top",children:[e.jsx("span",{className:"clean-stat-label",children:"Product SKUs"}),e.jsx("div",{className:"clean-stat-icon",style:{background:"rgba(6,182,212,0.12)",color:"#06b6d4"},children:e.jsx(S,{size:17})})]}),e.jsx("div",{className:"clean-stat-value",children:(a==null?void 0:a.totalProducts)??0}),e.jsxs("div",{className:"clean-stat-footer",children:[e.jsx("span",{className:"clean-pill-delta",style:{background:"rgba(6,182,212,0.14)",color:"#06b6d4"},children:"Catalog"}),e.jsx("span",{children:"Catalog inventory items"})]})]})]}),e.jsxs("div",{className:"clean-card",children:[e.jsx("div",{className:"clean-card-header",children:e.jsx("h3",{className:"clean-card-title",children:"Data Ingestion Governance & Integrity"})}),e.jsxs("div",{className:"clean-guidance-grid",children:[e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#6366f1",marginBottom:4,fontSize:"0.82rem"},children:"🚀 Self-Service Wizard"}),e.jsx("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:"Use the CSV Import Wizard to map columns, validate duplicate emails, and bulk create records with real-time audit logging."})]}),e.jsxs("div",{style:{background:"var(--bg-tertiary, rgba(0,0,0,0.15))",padding:"1rem",borderRadius:"8px",border:"1px solid var(--border-color)"},children:[e.jsx("strong",{style:{display:"block",color:"#10b981",marginBottom:4,fontSize:"0.82rem"},children:"🛡️ Audit & History Trail"}),e.jsx("p",{style:{margin:0,fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.45},children:"All imported rows trigger immutable audit trail records indicating batch time, user attribution, and field mutation history."})]})]})]})]})})};export{L as ImportReportsScreen};
