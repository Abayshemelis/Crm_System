import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { FileText, CheckCircle, ShieldCheck, PenTool, Printer, AlertTriangle, Calendar, DollarSign, Building } from 'lucide-react';
import './screens.css';

interface PublicContract {
  contractId: number;
  contractNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  companyName?: string;
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
  createdByName: string;
  createdAt: string;
}

export const PublicContractSignScreen: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<PublicContract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Signature state
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [signerName, setSignerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    // Use raw fetch with ngrok-skip-browser-warning header so external devices
    // (accessed via ngrok/tunnel) never receive the HTML interstitial page instead of JSON.
    fetch(`/api/public/contracts/${token}`, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      }
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        return res.json() as Promise<PublicContract>;
      })
      .then(res => {
        setContract(res);
        if (res.customerName) setSignerName(res.customerName);
        if (res.customerSignatureDataUrl || res.signatureDataUrl || res.status === 'Signed') {
          setSignedSuccess(true);
        }
      })
      .catch(err => {
        console.error('Failed to load contract', err);
        setError('Contract link is invalid, expired, or has been removed.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4f46e5';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const generateTypedSignatureDataUrl = (name: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'italic 38px "Brush Script MT", cursive, sans-serif';
    ctx.fillStyle = '#4f46e5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name || 'Authorized Signatory', canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  const handleSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !contract) return;
    if (!signerName.trim()) { showToast('Please enter your full name', 'error'); return; }

    let signatureUrl = '';
    if (signMode === 'draw') {
      if (!hasDrawn || !canvasRef.current) {
        showToast('Please draw your signature in the box', 'error');
        return;
      }
      signatureUrl = canvasRef.current.toDataURL('image/png');
    } else {
      if (!typedName.trim()) {
        showToast('Please type your signature', 'error');
        return;
      }
      signatureUrl = generateTypedSignatureDataUrl(typedName.trim());
    }

    setIsSubmitting(true);
    try {
      const rawRes = await window.fetch(`/api/public/contracts/${token}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          signatureDataUrl: signatureUrl,
          signedByName: signerName.trim(),
          signerRole: 'Customer'
        }),
      });
      if (!rawRes.ok) throw new Error(`HTTP ${rawRes.status}`);
      const res = await rawRes.json();

      setContract(prev => prev ? {
        ...prev,
        status: res.status || 'Signed',
        customerSignatureDataUrl: signatureUrl,
        customerSignedByName: signerName.trim(),
        customerSignedAt: res.signedAt || new Date().toISOString(),
        signatureDataUrl: signatureUrl,
        signedByName: signerName.trim(),
        signedAt: res.signedAt || new Date().toISOString()
      } : null);

      setSignedSuccess(true);
      showToast(res.message || 'Contract signed successfully!');
    } catch {
      showToast('Failed to submit signature. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <FileText className="rpt-spin" size={40} style={{ color: '#818cf8', marginBottom: '1rem' }} />
          <p>Loading document preview...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', padding: '1.5rem' }}>
        <Card style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2rem' }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Document Unavailable</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {error || 'The requested contract link is invalid or expired.'}
          </p>
        </Card>
      </div>
    );
  }

  const isCustomerSigned = !!(contract.customerSignatureDataUrl || contract.signatureDataUrl || signedSuccess);
  const isCompanySigned = !!contract.companySignatureDataUrl;
  const isFullySigned = isCustomerSigned && isCompanySigned;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '2rem 1rem', fontFamily: 'Segoe UI, sans-serif' }}>
      
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>

        {/* Top Header Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 36, height: 36, background: '#6366f1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>⚡</div>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>CRM Enterprise Portal</span>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Secure Document E-Signature Center</div>
            </div>
          </div>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' }}>
            <Printer size={14} /> Print Copy
          </button>
        </div>

        {/* Success Banner */}
        {signedSuccess && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShieldCheck size={36} style={{ color: '#10b981', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 0.2rem 0', color: '#10b981', fontSize: '1.1rem' }}>
                {isFullySigned ? '🎉 Contract Fully Executed by Both Parties!' : '✅ Your Signature Has Been Recorded!'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                Thank you, <strong>{contract.customerSignedByName || contract.signedByName || contract.customerName}</strong>. This legal agreement was digitally executed on {new Date(contract.customerSignedAt || contract.signedAt || Date.now()).toLocaleString()}.
              </p>
            </div>
          </div>
        )}

        {/* Main Contract Document Paper */}
        <div style={{ background: '#ffffff', color: '#0f172a', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', marginBottom: '2rem' }}>

          {/* Document Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #6366f1', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>COMMERCIAL CONTRACT AGREEMENT</div>
              <h1 style={{ margin: '0.2rem 0 0 0', fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{contract.title}</h1>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>Contract #: <strong>{contract.contractNumber}</strong></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e1b4b' }}>
                ${contract.contractValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ display: 'inline-block', marginTop: '0.4rem', padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', background: isFullySigned ? '#dcfce7' : '#fef3c7', color: isFullySigned ? '#15803d' : '#b45309' }}>
                {isFullySigned ? 'Signed & Executed' : isCompanySigned ? 'Pending Client Sign' : isCustomerSigned ? 'Pending Company Sign' : 'Draft'}
              </div>
            </div>
          </div>

          {/* Customer & Details Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>PREPARED FOR CLIENT</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{contract.customerName}</div>
              {contract.companyName && <div style={{ fontSize: '0.85rem', color: '#475569' }}>{contract.companyName}</div>}
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{contract.customerEmail}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>EFFECTIVE DATES</div>
              <div style={{ fontSize: '0.85rem', color: '#334155' }}><strong>Start Date:</strong> {new Date(contract.startDate).toLocaleDateString()}</div>
              <div style={{ fontSize: '0.85rem', color: '#334155' }}><strong>End Date:</strong> {new Date(contract.endDate).toLocaleDateString()}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.3rem' }}>ISSUING REPRESENTATIVE</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{contract.createdByName}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Issued on {new Date(contract.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Terms & Conditions Body */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              Terms & Conditions
            </h3>
            <div style={{ background: '#fafafa', padding: '1.25rem', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '250px', overflowY: 'auto' }}>
              {contract.termsAndConditions || 'Standard commercial terms apply. Payment Net 30 days.'}
            </div>
          </div>

          {/* DUAL-PARTY SIGNATURE DISPLAY */}
          <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '1.5rem', marginTop: '2rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>
              MUTUAL DIGITAL SIGNATURE EXECUTION RECORD
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              
              {/* Box 1: Seller / Company Representative */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  SERVICE PROVIDER (SELLER)
                </div>
                {contract.companySignatureDataUrl ? (
                  <div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.4rem', background: '#fff', marginBottom: '0.5rem' }}>
                      <img src={contract.companySignatureDataUrl} alt="Seller Signature" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Signed by: {contract.companySignedByName || contract.createdByName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {contract.companySignedAt ? new Date(contract.companySignedAt).toLocaleString() : 'Executed'}</div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', background: '#f1f5f9', borderRadius: '6px', color: '#64748b', fontSize: '0.8rem' }}>
                    ✍️ Authorized Company Signature recorded upon issuance
                  </div>
                )}
              </div>

              {/* Box 2: Client / Customer Signatory */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  CLIENT (CUSTOMER SIGNATORY)
                </div>
                {isCustomerSigned ? (
                  <div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.4rem', background: '#fff', marginBottom: '0.5rem' }}>
                      <img src={contract.customerSignatureDataUrl || contract.signatureDataUrl} alt="Customer Signature" style={{ maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Signed by: {contract.customerSignedByName || contract.signedByName || signerName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Date: {new Date(contract.customerSignedAt || contract.signedAt || Date.now()).toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                      <ShieldCheck size={13} /> Verified Legal E-Signature
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', background: '#fefce8', border: '1px dashed #fde047', borderRadius: '6px', color: '#854d0e', fontSize: '0.8rem' }}>
                    ⏳ Your signature is required in the box below
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* Signature Form (If Not Yet Signed) */}
        {!signedSuccess && contract.status !== 'Signed' && (
          <Card style={{ padding: '2rem', background: '#1e293b', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <PenTool size={22} style={{ color: '#818cf8' }} />
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Execute Contract Signature</h3>
            </div>

            <form onSubmit={handleSignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Your Full Name (Signatory) *</label>
                <Input
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  style={{ background: '#0f172a', borderColor: '#475569', color: '#fff' }}
                />
              </div>

              {/* Mode Toggle */}
              <div>
                <label style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Signature Style</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setSignMode('draw')}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600,
                      background: signMode === 'draw' ? '#6366f1' : '#334155', color: '#fff', border: 'none', cursor: 'pointer'
                    }}
                  >
                    ✏️ Draw Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignMode('type')}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600,
                      background: signMode === 'type' ? '#6366f1' : '#334155', color: '#fff', border: 'none', cursor: 'pointer'
                    }}
                  >
                    ⌨️ Type Signature
                  </button>
                </div>
              </div>

              {/* Drawing Canvas */}
              {signMode === 'draw' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Draw signature below using mouse or touchscreen:</span>
                    <button type="button" onClick={clearCanvas} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                      Clear Box
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ width: '100%', maxWidth: '500px', height: '140px', background: '#ffffff', borderRadius: '8px', border: '2px solid #818cf8', cursor: 'crosshair', touchAction: 'none' }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Type name to generate signature representation:</label>
                  <Input
                    value={typedName}
                    onChange={e => setTypedName(e.target.value)}
                    placeholder="Type name here..."
                    style={{ background: '#0f172a', borderColor: '#475569', color: '#fff', fontFamily: 'cursive', fontSize: '1.4rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <Button variant="primary" type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} /> {isSubmitting ? 'Submitting Signature...' : 'Submit & Sign Contract'}
                </Button>
              </div>
            </form>
          </Card>
        )}

      </div>
    </div>
  );
};
