import React, { useRef, useState } from 'react';
import { Printer, Send, X, FileText, CheckCircle, Building2, User, Calendar, ShieldCheck, Download } from 'lucide-react';
import { Button } from '../ui/Button';

interface OpportunityLineItem {
  lineItemId: number;
  productId: number;
  product?: {
    name: string;
    sku?: string;
    productCategory?: { name: string };
  };
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  totalPrice: number;
}

interface QuoteModalProps {
  opportunity: {
    opportunityId: number;
    title: string;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    customerPhone?: string;
    estimatedValue: number;
    expectedCloseDate?: string;
    ownerName?: string;
    createdAt: string;
  };
  lineItems: OpportunityLineItem[];
  onClose: () => void;
  onSendEmail?: (summaryText: string) => void;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  opportunity,
  lineItems,
  onClose,
  onSendEmail
}) => {
  const quoteRef = useRef<HTMLDivElement>(null);

  const quoteNumber = `QT-${new Date().getFullYear()}-${String(opportunity.opportunityId).padStart(5, '0')}`;
  const quoteDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const totalDiscount = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (item.discountPercent / 100)), 0);
  const grandTotal = lineItems.length > 0 ? (subtotal - totalDiscount) : opportunity.estimatedValue;

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const loadHtml2PdfScript = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve((window as any).html2pdf);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve((window as any).html2pdf);
      script.onerror = () => reject(new Error('Failed to load PDF library'));
      document.body.appendChild(script);
    });
  };

  const handleDownloadPDF = async () => {
    if (!quoteRef.current) return;
    setDownloadingPdf(true);
    try {
      let html2pdf: any;
      try {
        const module = await import('html2pdf.js');
        html2pdf = module.default || module;
      } catch {
        html2pdf = await loadHtml2PdfScript();
      }

      if (!html2pdf) {
        html2pdf = await loadHtml2PdfScript();
      }

      const element = quoteRef.current;
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3],
        filename: `Proposal-${quoteNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF Generation error:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleEmailQuote = () => {
    if (!onSendEmail) return;
    const itemsSummary = lineItems.map(i => `- ${i.product?.name || 'Product'} (Qty: ${i.quantity}, Price: $${i.unitPrice}, Total: $${i.totalPrice.toFixed(2)})`).join('\n');
    const emailBody = `Dear ${opportunity.customerFirstName} ${opportunity.customerLastName},\n\nPlease find your official proposal quote details below:\n\nQuote Reference: ${quoteNumber}\nDate: ${quoteDate}\nValid Until: ${validUntil}\n\nPROPOSAL ITEMS:\n${itemsSummary || 'Standard Consulting Proposal'}\n\nGRAND TOTAL: $${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nPlease let us know if you have any questions.\n\nBest regards,\n${opportunity.ownerName || 'Sales Team'}`;
    onSendEmail(emailBody);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1.5rem',
      backdropFilter: 'blur(6px)'
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-color)',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Modal Action Header (Hidden during browser printing) */}
        <div className="no-print" style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-primary)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Proposal Quote ({quoteNumber})
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Official Sales Proposal & Commercial Quote
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={handleDownloadPDF} disabled={downloadingPdf}>
              <Download size={15} style={{ marginRight: 6 }} /> {downloadingPdf ? 'Generating PDF…' : 'Download PDF Quote'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer size={15} style={{ marginRight: 6 }} /> Print / Save PDF
            </Button>
            {onSendEmail && (
              <Button variant="primary" size="sm" onClick={handleEmailQuote}>
                <Send size={15} style={{ marginRight: 6 }} /> Email Quote
              </Button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Proposal Document Body */}
        <div ref={quoteRef} className="printable-quote-body" style={{
          padding: '2.5rem',
          overflowY: 'auto',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          {/* Company Brand & Quote Reference Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: '2rem',
            marginBottom: '2rem',
            borderBottom: '2px solid var(--border-color)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
                <div style={{
                  background: 'var(--accent-primary)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '8px'
                }}>
                  CRM
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Enterprise Sales CRM
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Official Sales Proposal & Commercial Quotation
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--accent-primary)',
                letterSpacing: '0.05em'
              }}>
                {quoteNumber}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Date: <strong>{quoteDate}</strong>
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Valid Until: <strong>{validUntil}</strong>
              </div>
            </div>
          </div>

          {/* Client & Owner Info Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '2.5rem'
          }}>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                Prepared For (Client)
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {opportunity.customerFirstName} {opportunity.customerLastName}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                {opportunity.customerEmail}
              </div>
              {opportunity.customerPhone && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Phone: {opportunity.customerPhone}
                </div>
              )}
            </div>

            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                Proposal Owner (Sales Rep)
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {opportunity.ownerName || 'Sales Representative'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                Opportunity: <strong>{opportunity.title}</strong>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Status: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Commercial Proposal</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--text-primary)' }}>
              Itemized Products & Services
            </h4>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem'
            }}>
              <thead>
                <tr style={{
                  borderBottom: '2px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)'
                }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontWeight: 600 }}>Product / Item</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontWeight: 600 }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600 }}>Unit Price</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600 }}>Discount</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }} colSpan={4}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{opportunity.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Standard enterprise solution package</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${opportunity.estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item, idx) => (
                    <tr key={item.lineItemId || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product?.name || 'Product'}</div>
                        {item.product?.sku && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {item.product.sku}</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                        ${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                        {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ${item.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Totals & Terms */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '2rem',
            marginBottom: '2.5rem'
          }}>
            <div style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color="var(--accent-primary)" /> Terms & Commercial Conditions
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li>Prices are valid for 30 calendar days from the issue date.</li>
                <li>Payment terms: Net 30 days upon invoice receipt.</li>
                <li>Standard implementation and onboarding support included.</li>
              </ul>
            </div>

            <div style={{
              width: '280px',
              background: 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span>${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {totalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#10b981' }}>
                  <span>Discount Total:</span>
                  <span>-${totalDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--accent-primary)',
                paddingTop: '0.65rem',
                borderTop: '2px solid var(--border-color)',
                marginTop: '0.25rem'
              }}>
                <span>Grand Total:</span>
                <span>${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Acceptance Signature Block */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2.5rem',
            paddingTop: '2rem',
            borderTop: '1px dashed var(--border-color)'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                Authorized Client Signature:
              </div>
              <div style={{ borderBottom: '1px solid var(--border-color)', width: '80%' }}></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Date & Client Acceptance Stamp
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>
                Sales Representative Signature:
              </div>
              <div style={{ borderBottom: '1px solid var(--border-color)', width: '80%' }}></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {opportunity.ownerName || 'Account Manager'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
