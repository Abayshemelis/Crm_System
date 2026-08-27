export function exportCSV(data: any[], name: string) {
  if (!data?.length) return;
  const rawKeys = Object.keys(data[0]);
  const formattedHeaders = rawKeys.map((k) =>
    k.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
  );

  const rows = [
    formattedHeaders.join(','),
    ...data.map((r) =>
      rawKeys
        .map((k) => {
          const val = r[k];
          if (val === null || val === undefined) return '""';
          const strVal = String(val).replace(/"/g, '""');
          return `"${strVal}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportExecutivePDF(
  data: any[],
  title: string,
  subtitle: string,
  stats: Array<{ label: string; value: string | number; sub?: string }>,
  insights: string[],
  filename: string
) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups for this site to generate and download PDF reports.');
    return;
  }

  const rawKeys = data && data.length > 0 ? Object.keys(data[0]) : [];
  const formattedHeaders = rawKeys.map((k) =>
    k.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
  );

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - CRM Report</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
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
          }
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
          .pdf-container { padding: 8px; background: #fff; }
          .pdf-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .pdf-brand { font-size: 20px; font-weight: 800; color: #1e1b4b; margin: 0 0 4px 0; }
          .pdf-sub { font-size: 11px; color: #64748b; margin: 0; }
          .pdf-meta { text-align: right; font-size: 10.5px; color: #64748b; }
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
          .pdf-stat-value { font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
          .pdf-stat-sub { font-size: 9px; color: #94a3b8; }
          .pdf-insights-box {
            background: #f1f5f9;
            border-left: 4px solid #6366f1;
            padding: 12px 14px;
            border-radius: 0 6px 6px 0;
            margin-bottom: 18px;
          }
          .pdf-section-title {
            font-size: 12px;
            font-weight: 800;
            color: #1e293b;
            margin: 16px 0 8px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-top: 8px;
          }
          .pdf-table th {
            background: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 6px 8px;
            font-weight: 700;
            border-bottom: 1px solid #cbd5e1;
            text-transform: uppercase;
            font-size: 8.5px;
          }
          .pdf-table td {
            padding: 6px 8px;
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
              <h1 class="pdf-brand">CRM ENTERPRISE &bull; ${title.toUpperCase()}</h1>
              <p class="pdf-sub">${subtitle}</p>
            </div>
            <div class="pdf-meta">
              <div><strong>Date:</strong> ${dateStr}</div>
              <div><strong>Records:</strong> ${data.length}</div>
            </div>
          </div>

          ${
            stats.length > 0
              ? `
            <div class="pdf-stat-grid">
              ${stats
                .map(
                  (s) => `
                <div class="pdf-stat-box">
                  <div class="pdf-stat-label">${s.label}</div>
                  <div class="pdf-stat-value">${s.value}</div>
                  ${s.sub ? `<div class="pdf-stat-sub">${s.sub}</div>` : ''}
                </div>
              `
                )
                .join('')}
            </div>
          `
              : ''
          }

          ${
            insights.length > 0
              ? `
            <div class="pdf-insights-box">
              <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase;">
                Executive Analytical Summary:
              </div>
              <ul style="margin: 0; padding-left: 16px; font-size: 10px; color: #475569; line-height: 1.4;">
                ${insights.map((item) => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          `
              : ''
          }

          ${
            data.length > 0
              ? `
            <div class="pdf-section-title">Detailed Ledger (${data.length} Total Records)</div>
            <table class="pdf-table">
              <thead>
                <tr>
                  ${formattedHeaders.map((h) => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data
                  .slice(0, 100)
                  .map(
                    (row) => `
                  <tr>
                    ${rawKeys
                      .map((k) => {
                        let val = row[k];
                        if (val === null || val === undefined) val = '-';
                        if (typeof val === 'number') {
                          if (k.toLowerCase().includes('value') || k.toLowerCase().includes('revenue') || k.toLowerCase().includes('amount') || k.toLowerCase().includes('total')) {
                            val = '$' + Number(val).toLocaleString();
                          } else if (k.toLowerCase().includes('rate') || k.toLowerCase().includes('pct')) {
                            val = Number(val).toFixed(1) + '%';
                          }
                        }
                        return `<td>${val}</td>`;
                      })
                      .join('')}
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          `
              : ''
          }

          <div class="pdf-footer">
            <span>CRM Enterprise Analytics &bull; Confidential Executive Document</span>
            <span>Live System Generated</span>
          </div>
        </div>

        <script>
          function triggerDownload() {
            var element = document.getElementById('pdf-content');
            var opt = {
              margin:       [8, 8, 8, 8],
              filename:     '${filename}',
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
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
