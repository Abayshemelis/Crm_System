import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Send, Mail, AlertCircle, CheckCircle2, ChevronDown, User, FileText } from 'lucide-react';
import { api } from '../../lib/api';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient: string;
  recipientName?: string;
  initialSubject?: string;
  initialBody?: string;
  leadId?: number;
  customerId?: number;
  opportunityId?: number;
  onEmailSent?: () => void;
}

const SUBJECT_TEMPLATES = [
  'Follow up regarding our recent conversation',
  'Proposal and pricing overview',
  'Check-in regarding your requirements',
  'Next steps & contract review',
  'Scheduling a quick discovery call',
  'Service renewal & account update',
];

export const EmailComposerModal: React.FC<EmailComposerModalProps> = ({
  isOpen,
  onClose,
  defaultRecipient,
  recipientName,
  initialSubject,
  initialBody,
  leadId,
  customerId,
  opportunityId,
  onEmailSent,
}) => {
  const [toEmail, setToEmail] = useState(defaultRecipient || '');
  const [subject, setSubject] = useState(initialSubject || '');
  const [body, setBody] = useState(initialBody || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);

  const subjectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setToEmail(defaultRecipient || '');
      setSubject(initialSubject || '');
      setBody(initialBody || '');
      setError(null);
      setSuccess(null);
      setShowSubjectMenu(false);
    }
  }, [isOpen, defaultRecipient, initialSubject, initialBody]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subjectMenuRef.current && !subjectMenuRef.current.contains(e.target as Node)) {
        setShowSubjectMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim()) {
      setError('Please provide a recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setError('Please provide an email subject.');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post<{ success: boolean; message?: string; warning?: string }>('/api/emails/send', {
        toEmail: toEmail.trim(),
        subject: subject.trim(),
        bodyHtml: body,
        leadId,
        customerId,
        opportunityId,
      });

      setSuccess(res?.message || 'Email sent successfully!');
      if (onEmailSent) onEmailSent();

      setTimeout(() => {
        setSubject('');
        setBody('');
        setSuccess(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to send email. Please check your SMTP settings.');
    } finally {
      setSending(false);
    }
  };

  const S: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 99999,
    },
    container: {
      width: '100%',
      maxWidth: '640px',
      maxHeight: '92vh',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '20px',
      boxShadow: '0 25px 60px -15px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.35rem 1.75rem',
      background: '#ffffff',
      borderBottom: '1px solid #f1f5f9',
      flexShrink: 0,
    },
    iconBox: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
    },
    closeBtn: {
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      padding: '7px',
      color: '#64748b',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      lineHeight: 1,
      transition: 'all 0.15s',
    },
    body: {
      padding: '1.25rem 1.75rem',
      overflowY: 'auto',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      background: '#f8fafc',
    },
    card: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '1.1rem 1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      marginBottom: '0.45rem',
      fontWeight: 600,
      fontSize: '0.82rem',
      color: '#374151',
    },
    input: {
      width: '100%',
      padding: '0.65rem 0.85rem',
      borderRadius: '10px',
      border: '1.5px solid #e2e8f0',
      backgroundColor: '#ffffff',
      color: '#1e293b',
      fontSize: '0.9rem',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    textarea: {
      width: '100%',
      minHeight: '150px',
      padding: '0.75rem 0.85rem',
      borderRadius: '10px',
      border: '1.5px solid #e2e8f0',
      backgroundColor: '#ffffff',
      color: '#1e293b',
      fontSize: '0.9rem',
      fontFamily: 'inherit',
      outline: 'none',
      resize: 'vertical',
      boxSizing: 'border-box',
      lineHeight: '1.5',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem 1.75rem',
      background: '#ffffff',
      borderTop: '1px solid #f1f5f9',
      flexShrink: 0,
    },
    cancelBtn: {
      background: 'transparent',
      border: '1.5px solid #e2e8f0',
      borderRadius: '10px',
      color: '#64748b',
      fontWeight: 600,
      padding: '0.6rem 1.1rem',
      fontSize: '0.9rem',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
    },
    sendBtn: {
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      color: '#ffffff',
      fontWeight: 700,
      padding: '0.6rem 1.35rem',
      fontSize: '0.9rem',
      border: 'none',
      borderRadius: '10px',
      cursor: sending ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.45rem',
      boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
      opacity: sending ? 0.7 : 1,
      transition: 'transform 0.1s, box-shadow 0.15s',
    },
    errorBanner: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.75rem 1rem',
      borderRadius: '10px',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
      fontSize: '0.84rem',
      fontWeight: 500,
    },
    successBanner: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.75rem 1rem',
      borderRadius: '10px',
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#16a34a',
      fontSize: '0.84rem',
      fontWeight: 500,
    },
  };

  return ReactDOM.createPortal(
    <div style={S.overlay} onClick={onClose}>
      <style>{`
        .ecm-modal input:focus,
        .ecm-modal textarea:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
          outline: none !important;
        }
      `}</style>

      <div className="ecm-modal" style={S.container} onClick={(e) => e.stopPropagation()}>
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={S.iconBox}>
              <Mail size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
                Compose Email {recipientName ? `to ${recipientName}` : ''}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.79rem', color: '#94a3b8' }}>
                Outbound messages automatically log to the activity timeline
              </p>
            </div>
          </div>
          <button type="button" style={S.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ── FORM ───────────────────────────────────────────────────── */}
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={S.body}>
            {error && (
              <div style={S.errorBanner}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div style={S.successBanner}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </div>
            )}

            {/* Recipient Card */}
            <div style={S.card}>
              <label style={S.label}>
                <User size={14} style={{ color: '#6366f1' }} />
                Recipient Email *
              </label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@example.com"
                required
                style={S.input}
              />
            </div>

            {/* Subject Card with Suggestions Menu */}
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{ ...S.label, marginBottom: 0 }}>
                  <FileText size={14} style={{ color: '#6366f1' }} />
                  Subject *
                </label>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Clear & concise summary</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Follow up regarding proposal / inquiry"
                    required
                    style={S.input}
                  />
                </div>

                {/* Templates dropdown trigger */}
                <div ref={subjectMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowSubjectMenu((v) => !v)}
                    style={{
                      height: '40px',
                      padding: '0 0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.79rem',
                      fontWeight: 700,
                      color: showSubjectMenu ? '#4f46e5' : '#475569',
                      background: showSubjectMenu ? '#ede9fe' : '#f8fafc',
                      border: showSubjectMenu ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    Templates
                    <ChevronDown
                      size={13}
                      style={{
                        transform: showSubjectMenu ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s',
                      }}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {showSubjectMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px -6px rgba(0,0,0,0.15)',
                        minWidth: '280px',
                        zIndex: 200,
                        padding: '0.35rem',
                      }}
                    >
                      <p
                        style={{
                          margin: '0 0 0.2rem',
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.67rem',
                          fontWeight: 700,
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.07em',
                        }}
                      >
                        Quick Subject Templates
                      </p>
                      {SUBJECT_TEMPLATES.map((tmpl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSubject(tmpl);
                            setShowSubjectMenu(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '0.5rem 0.7rem',
                            fontSize: '0.84rem',
                            fontWeight: subject === tmpl ? 700 : 500,
                            color: subject === tmpl ? '#4f46e5' : '#1e293b',
                            background: subject === tmpl ? '#ede9fe' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.1s',
                          }}
                        >
                          <span>{tmpl}</span>
                          {subject === tmpl && <CheckCircle2 size={14} style={{ color: '#6366f1' }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Message Body Card */}
            <div style={S.card}>
              <label style={S.label}>Message Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email message here..."
                style={S.textarea}
              />
            </div>
          </div>

          {/* ── FOOTER ─────────────────────────────────────────────────── */}
          <div style={S.footer}>
            <button type="button" style={S.cancelBtn} onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button type="submit" style={S.sendBtn} disabled={sending}>
              <Send size={15} />
              <span>{sending ? 'Sending...' : 'Send Email'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EmailComposerModal;
