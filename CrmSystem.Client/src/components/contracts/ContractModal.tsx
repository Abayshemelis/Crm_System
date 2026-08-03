import React, { useRef, useState, useEffect } from 'react';
import { FileText, X, CheckCircle, Download, Printer, PenTool, RefreshCw, Receipt } from 'lucide-react';
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
  termsAndConditions?: string;
  notes?: string;
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatoryName, setSignatoryName] = useState(contract.customerName || '');
  const [signing, setSigning] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  }, []);

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

  const handleSignContract = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnSignature) {
      showToast('Please draw your digital signature before submitting.', 'error');
      return;
    }

    const signatureDataUrl = canvas.toDataURL('image/png');
    setSigning(true);
    try {
      await api.post(`/api/contracts/${contract.contractId}/sign`, {
        signatureDataUrl,
        signedByName: signatoryName.trim() || contract.customerName
      });
      showToast('Contract digitally signed successfully!');
      onUpdate();
      onClose();
    } catch {
      showToast('Failed to sign contract', 'error');
    } finally {
      setSigning(false);
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
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
        {/* Modal Action Header */}
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
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex'
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Commercial Agreement ({contract.contractNumber})
              </h3>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '0.3rem',
                background: (contract.status === 'Signed' || contract.status === 'Active' || !!contract.signatureDataUrl || !!contract.signedAt) 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : 'rgba(245, 158, 11, 0.15)',
                color: (contract.status === 'Signed' || contract.status === 'Active' || !!contract.signatureDataUrl || !!contract.signedAt) 
                  ? '#10b981' 
                  : '#f59e0b'
              }}>
                Status: {(contract.status === 'Signed' || contract.status === 'Active' || !!contract.signatureDataUrl || !!contract.signedAt) ? 'Signed & Executed' : contract.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(contract.status === 'Signed' || contract.status === 'Active' || !!contract.signatureDataUrl || !!contract.signedAt) && onInvoice && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => { onInvoice(contract); onClose(); }}
                style={{ background: '#10b981', borderColor: '#10b981', color: '#ffffff' }}
              >
                <Receipt size={15} style={{ marginRight: 6 }} /> 🧾 Generate Invoice
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleDownloadPDF} disabled={downloadingPdf}>
              <Download size={15} style={{ marginRight: 6 }} /> {downloadingPdf ? 'Generating PDF…' : 'Download PDF'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer size={15} style={{ marginRight: 6 }} /> Print
            </Button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contract Printable Document Area */}
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: '#ffffff', color: '#0f172a' }} id="printable-contract-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', margin: 0 }}>Enterprise Commercial Agreement</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Ref: <strong>{contract.contractNumber}</strong></p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
              <div>Start Date: <strong>{new Date(contract.startDate).toLocaleDateString()}</strong></div>
              <div>End Date: <strong>{new Date(contract.endDate).toLocaleDateString()}</strong></div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                Value: ${contract.contractValue.toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#d97706', marginBottom: 4 }}>Client Organization</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{contract.customerName}</div>
              {contract.companyName && <div style={{ fontSize: '0.9rem', color: '#475569' }}>{contract.companyName}</div>}
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{contract.customerEmail}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#d97706', marginBottom: 4 }}>Service Provider</div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>CRM System Enterprise</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Authorized Agent: {contract.createdByName}</div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Agreement Title</h4>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '1.05rem', color: '#1e293b' }}>{contract.title}</p>
          </div>

          <div style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', margin: '0 0 0.5rem 0' }}>Terms & Conditions</h4>
            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {contract.termsAndConditions}
            </div>
          </div>

          {/* Signature Block Section */}
          <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '1.5rem', marginTop: '2rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Digital Signature & Execution</h4>

            {contract.signatureDataUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: '#f0fdf4', padding: '1.25rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>VERIFIED DIGITAL SIGNATURE</div>
                  <img src={contract.signatureDataUrl} alt="Signature" style={{ maxHeight: '60px', marginTop: '8px' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px' }}>Signed by: {contract.signedByName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Timestamp: {new Date(contract.signedAt!).toLocaleString()}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#15803d', fontWeight: 700 }}>
                  <CheckCircle size={20} /> Contract Fully Executed
                </div>
              </div>
            ) : (
              <div className="no-print" style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PenTool size={16} /> Draw Signature in Box Below:
                  </label>
                  <Button variant="secondary" size="sm" onClick={clearSignature}>
                    <RefreshCw size={13} style={{ marginRight: 4 }} /> Clear Box
                  </Button>
                </div>

                <div style={{ border: '2px dashed #94a3b8', borderRadius: '8px', background: '#ffffff', marginBottom: '1rem' }}>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    style={{ width: '100%', height: '120px', cursor: 'crosshair', touchAction: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Full Name of Signatory"
                    value={signatoryName}
                    onChange={e => setSignatoryName(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                  <Button variant="primary" onClick={handleSignContract} disabled={signing || !hasDrawnSignature}>
                    {signing ? 'Signing Contract…' : 'Execute & Sign Contract'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
