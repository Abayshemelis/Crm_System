import React, { useRef, useState, useEffect } from 'react';
import { FileText, X, CheckCircle, Download, Printer, PenTool, RefreshCw, Receipt, Link as LinkIcon, Mail, ShieldCheck, Clock, UserCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { showToast } from '../../lib/toast';
import html2pdf from 'html2pdf.js';

export interface ContractItem {
  contractId: number;
  contractNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  companyName?: string;
  opportunityId?: number;
  opportunityTitle?: string;
  title: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: string;
  signatureDataUrl?: string;
  signedByName?: string;
  signedAt?: string;
  companySignatureDataUrl?: string;
  companySignedByName?: string;
  companySignedAt?: string;
  customerSignatureDataUrl?: string;
  customerSignedByName?: string;
  customerSignedAt?: string;
  isFullySigned?: boolean;
  isCompanySigned?: boolean;
  isCustomerSigned?: boolean;
  termsAndConditions?: string;
  notes?: string;
  signingToken?: string;
  createdByName: string;
  createdAt: string;
}

interface ContractModalProps {
  contract: ContractItem;
  onClose: () => void;
  onUpdate: () => void;
  onInvoice?: (contract: ContractItem) => void;
}

export const ContractModal: React.FC<ContractModalProps> = ({ contract, onClose, onUpdate, onInvoice }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const customerCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDrawingCustomer, setIsDrawingCustomer] = useState(false);
  const [sellerSignatoryName, setSellerSignatoryName] = useState(contract.companySignedByName || contract.createdByName || 'Company Representative');
  const [customerSignatoryName, setCustomerSignatoryName] = useState(contract.customerSignedByName || contract.customerName || 'Customer Signatory');
  const [signing, setSigning] = useState(false);
  const [signingCustomer, setSigningCustomer] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [hasDrawnCustomerSignature, setHasDrawnCustomerSignature] = useState(false);
  const [showInPersonCustomerSign, setShowInPersonCustomerSign] = useState(false);

  const isCompanySigned = !!contract.companySignatureDataUrl;
  const isCustomerSigned = !!(contract.customerSignatureDataUrl || contract.signatureDataUrl || contract.status === 'Signed');
  const isFullySigned = (isCompanySigned && isCustomerSigned) || (contract.status === 'Signed' && isCompanySigned);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, [isCompanySigned]);

  useEffect(() => {
    const canvas = customerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, [showInPersonCustomerSign]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawnSignature(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  // Customer Drawing Handlers
  const startDrawingCustomer = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawingCustomer(true);
    setHasDrawnCustomerSignature(true);
    drawCustomer(e);
  };

  const stopDrawingCustomer = () => {
    setIsDrawingCustomer(false);
    const canvas = customerCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const drawCustomer = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingCustomer) return;
    const canvas = customerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCustomerSignature = () => {
    const canvas = customerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnCustomerSignature(false);
  };

  const handleSignAsCompany = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnSignature) {
      showToast('Please draw your company digital signature before submitting.', 'error');
      return;
    }

    const signatureDataUrl = canvas.toDataURL('image/png');
    setSigning(true);
    try {
      await api.post(`/api/contracts/${contract.contractId}/sign`, {
        signatureDataUrl,
        signedByName: sellerSignatoryName.trim() || contract.createdByName || 'Company Representative',
        signerRole: 'Company'
      });
      showToast('Company signature recorded successfully!');
      onUpdate();
    } catch {
      showToast('Failed to record company signature', 'error');
    } finally {
      setSigning(false);
    }
  };

  const handleSignAsCustomer = async () => {
    const canvas = customerCanvasRef.current;
    if (!canvas || !hasDrawnCustomerSignature) {
      showToast('Please draw customer digital signature before submitting.', 'error');
      return;
    }

    const signatureDataUrl = canvas.toDataURL('image/png');
    setSigningCustomer(true);
    try {
      await api.post(`/api/contracts/${contract.contractId}/sign`, {
        signatureDataUrl,
        signedByName: customerSignatoryName.trim() || contract.customerName || 'Customer Signatory',
        signerRole: 'Customer'
      });
      showToast('Customer signature recorded successfully!');
      onUpdate();
    } catch {
      showToast('Failed to record customer signature', 'error');
    } finally {
      setSigningCustomer(false);
    }
  };

  const handleCopySigningLink = () => {
    const token = contract.signingToken || String(contract.contractId);
    const signUrl = `${window.location.origin}/sign/contract/${token}`;
    navigator.clipboard.writeText(signUrl);
    showToast('Client signing link copied to clipboard!');
  };

  const handleSendSigningEmail = async () => {
    let targetEmail = contract.customerEmail?.trim();
    if (!targetEmail) {
      const input = window.prompt('Please enter the customer email address to send the contract to:');
      if (!input || !input.trim()) return;
      targetEmail = input.trim();
    }

    setSendingEmail(true);
    try {
      const res = await api.post<{ message?: string }>(`/api/contracts/${contract.contractId}/send-email`, {
        recipientEmail: targetEmail
      });
      showToast(res.message || `Signing link emailed to ${targetEmail}!`);
      onUpdate();
    } catch (err: any) {
      showToast(err?.message || 'Failed to email signing link', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const element = document.getElementById('printable-contract-area');
      if (!element) {
        showToast('Printable contract area not found', 'error');
        return;
      }
      const opt = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename: `Contract-${contract.contractNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      await (html2pdf as any)().set(opt).from(element).save();
      showToast(`Contract-${contract.contractNumber}.pdf downloaded!`);
    } catch {
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="crm-modal-overlay">
      <div className="crm-contract-viewer-container">
        {/* Modal Action Header */}
        <div className="no-print" style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: isFullySigned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              color: isFullySigned ? '#10b981' : '#818cf8',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Commercial Contract ({contract.contractNumber})
              </h3>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.12rem 0.5rem',
                  borderRadius: '0.3rem',
                  background: isFullySigned ? 'rgba(16, 185, 129, 0.15)' : isCompanySigned ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isFullySigned ? '#10b981' : isCompanySigned ? '#818cf8' : '#f59e0b',
                  border: isFullySigned ? '1px solid rgba(16, 185, 129, 0.3)' : isCompanySigned ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  {isFullySigned ? '🟢 Fully Executed by Both Parties' : isCompanySigned ? '🔵 Company Signed · Awaiting Client' : isCustomerSigned ? '🟠 Client Signed · Awaiting Company' : '⚪ Draft (Unsigned)'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {isFullySigned && onInvoice && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => { onInvoice(contract); onClose(); }}
                style={{ background: '#10b981', borderColor: '#10b981', color: '#ffffff' }}
              >
                <Receipt size={15} style={{ marginRight: 5 }} /> Generate Invoice
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleCopySigningLink} title="Copy public signing link to send to client">
              <LinkIcon size={14} style={{ marginRight: 5 }} /> Copy E-Sign Link
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSendSigningEmail} disabled={sendingEmail} title="Email signing link to client">
              <Mail size={14} style={{ marginRight: 5 }} /> {sendingEmail ? 'Sending…' : 'Email Client'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadPDF} disabled={downloadingPdf}>
              <Download size={14} style={{ marginRight: 5 }} /> {downloadingPdf ? 'PDF…' : 'Download PDF'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer size={14} style={{ marginRight: 5 }} /> Print
            </Button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contract Printable Document Area */}
        <div style={{ padding: 'clamp(1rem, 3vw, 2rem)', overflowY: 'auto', flex: 1, background: '#ffffff', color: '#0f172a' }} id="printable-contract-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4338ca', margin: 0 }}>Enterprise Commercial Agreement</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Contract Ref: <strong>{contract.contractNumber}</strong></p>
            </div>
            <div style={{ textAlign: 'left', fontSize: '0.85rem' }}>
              <div>Start Date: <strong>{new Date(contract.startDate).toLocaleDateString()}</strong></div>
              <div>End Date: <strong>{new Date(contract.endDate).toLocaleDateString()}</strong></div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                Contract Value: ${contract.contractValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="crm-contract-doc-parties">
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#6366f1', marginBottom: 4 }}>Party A: Service Provider</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>CRM System Enterprise Inc.</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Account Executive: {contract.createdByName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#6366f1', marginBottom: 4 }}>Party B: Client Organization</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{contract.customerName}</div>
              {contract.companyName && <div style={{ fontSize: '0.85rem', color: '#475569' }}>{contract.companyName}</div>}
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{contract.customerEmail}</div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Scope / Agreement Title</h4>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>{contract.title}</p>
          </div>

          <div style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', margin: '0 0 0.5rem 0' }}>Terms & Conditions</h4>
            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {contract.termsAndConditions || 'Standard commercial terms apply. Payment Net 30 days.'}
            </div>
          </div>

          {/* DUAL-PARTY SIGNATURE BLOCK */}
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b' }}>
                Mutual Execution & Signatures
              </h4>
              {isFullySigned && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Legally Executed Agreement
                </span>
              )}
            </div>

            <div className="crm-contract-sig-grid">
              
              {/* Box 1: Seller / Company Signature */}
              <div style={{
                background: isCompanySigned ? '#f0fdf4' : '#f8fafc',
                border: isCompanySigned ? '1.5px solid #86efac' : '1.5px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isCompanySigned ? '#166534' : '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <UserCheck size={14} /> Service Provider (Seller)
                  </div>

                  {isCompanySigned ? (
                    <div>
                      <div style={{ borderBottom: '1px solid #bbf7d0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                        <img src={contract.companySignatureDataUrl} alt="Seller Signature" style={{ maxHeight: '55px', maxWidth: '200px', objectFit: 'contain' }} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                        Signed by: {contract.companySignedByName || contract.createdByName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Date: {contract.companySignedAt ? new Date(contract.companySignedAt).toLocaleString() : 'Executed'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="no-print">
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                          Draw your signature below to execute on behalf of the company:
                        </p>
                        <div style={{ border: '1px dashed #94a3b8', borderRadius: '6px', background: '#ffffff', marginBottom: '0.5rem' }}>
                          <canvas
                            ref={canvasRef}
                            width={320}
                            height={90}
                            onMouseDown={startDrawing}
                            onMouseUp={stopDrawing}
                            onMouseMove={draw}
                            onTouchStart={startDrawing}
                            onTouchEnd={stopDrawing}
                            onTouchMove={draw}
                            style={{ width: '100%', height: '90px', cursor: 'crosshair', touchAction: 'none' }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={sellerSignatoryName}
                            onChange={e => setSellerSignatoryName(e.target.value)}
                            placeholder="Your Full Name"
                            style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                          <button type="button" onClick={clearSignature} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer' }}>
                            Clear
                          </button>
                        </div>
                        <div style={{ marginTop: '0.6rem' }}>
                          <Button variant="primary" size="sm" onClick={handleSignAsCompany} disabled={signing || !hasDrawnSignature} style={{ width: '100%' }}>
                            {signing ? 'Recording…' : '✍️ Sign as Seller'}
                          </Button>
                        </div>
                      </div>

                      {/* Blank Signature Line for PDF Download / Print */}
                      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #94a3b8' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                          {sellerSignatoryName || contract.createdByName || 'Authorized Company Representative'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Authorized Representative
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Date: ________________________
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Customer / Client Signature */}
              <div style={{
                background: isCustomerSigned ? '#f0fdf4' : '#ffffff',
                border: isCustomerSigned ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isCustomerSigned ? '#166534' : '#475569', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <PenTool size={14} /> Client (Customer Signatory)
                  </div>

                  {isCustomerSigned ? (
                    <div>
                      {contract.customerSignatureDataUrl || contract.signatureDataUrl ? (
                        <div style={{ borderBottom: '1px solid #bbf7d0', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                          <img src={contract.customerSignatureDataUrl || contract.signatureDataUrl} alt="Client Signature" style={{ maxHeight: '55px', maxWidth: '200px', objectFit: 'contain' }} />
                        </div>
                      ) : (
                        <div style={{ padding: '0.5rem', background: '#dcfce7', borderRadius: '6px', color: '#166534', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={16} /> Verified Authorized Signature
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                        Signed by: {contract.customerSignedByName || contract.signedByName || contract.customerName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Date: {new Date(contract.customerSignedAt || contract.signedAt || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* On-screen guidance (hidden in print / PDF) */}
                      <div className="no-print" style={{ background: '#fefce8', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #fde047', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                          <Clock size={15} /> Awaiting Customer E-Signature
                        </div>

                        {!showInPersonCustomerSign ? (
                          <>
                            <p style={{ fontSize: '0.78rem', color: '#78350f', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                              Client can sign online or directly on this device:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setShowInPersonCustomerSign(true)}
                                style={{ fontSize: '0.78rem', background: '#16a34a', borderColor: '#16a34a' }}
                              >
                                <PenTool size={13} style={{ marginRight: 4 }} /> ✍️ Sign In-Person (On this Device)
                              </Button>
                              <Button variant="secondary" size="sm" onClick={handleCopySigningLink} style={{ fontSize: '0.78rem' }}>
                                <LinkIcon size={13} style={{ marginRight: 4 }} /> Copy Client Signing Link
                              </Button>
                              <Button variant="ghost" size="sm" onClick={handleSendSigningEmail} disabled={sendingEmail} style={{ fontSize: '0.78rem', border: '1px solid #fde047' }}>
                                <Mail size={13} style={{ marginRight: 4 }} /> {sendingEmail ? 'Sending…' : 'Email Signing Request'}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div>
                            <p style={{ fontSize: '0.8rem', color: '#15803d', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
                              Client draws signature below:
                            </p>
                            <div style={{ border: '1px dashed #16a34a', borderRadius: '6px', background: '#ffffff', marginBottom: '0.5rem' }}>
                              <canvas
                                ref={customerCanvasRef}
                                width={320}
                                height={90}
                                onMouseDown={startDrawingCustomer}
                                onMouseUp={stopDrawingCustomer}
                                onMouseMove={drawCustomer}
                                onTouchStart={startDrawingCustomer}
                                onTouchEnd={stopDrawingCustomer}
                                onTouchMove={drawCustomer}
                                style={{ width: '100%', height: '90px', cursor: 'crosshair', touchAction: 'none' }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <input
                                type="text"
                                value={customerSignatoryName}
                                onChange={e => setCustomerSignatoryName(e.target.value)}
                                placeholder="Customer Signatory Name"
                                style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                              />
                              <button type="button" onClick={clearCustomerSignature} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer' }}>
                                Clear
                              </button>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowInPersonCustomerSign(false)}
                                style={{ flex: 1, fontSize: '0.75rem' }}
                              >
                                Back to Link/Email
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSignAsCustomer}
                                disabled={signingCustomer || !hasDrawnCustomerSignature}
                                style={{ flex: 2, fontSize: '0.78rem', background: '#16a34a', borderColor: '#16a34a' }}
                              >
                                {signingCustomer ? 'Recording…' : '✅ Submit Customer Signature'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Clean Blank Signature Line for PDF Download / Paper Print */}
                      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #94a3b8' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                          {customerSignatoryName || contract.customerName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Authorized Client Signatory
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Date: ________________________
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

