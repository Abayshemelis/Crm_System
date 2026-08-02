import React, { useState } from 'react';
import { X, Send, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  onEmailSent
}) => {
  const [toEmail, setToEmail] = useState(defaultRecipient || '');
  const [subject, setSubject] = useState(initialSubject || '');
  const [body, setBody] = useState(initialBody || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim() || !subject.trim()) {
      setError('Please fill in recipient email and subject.');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/api/emails/send', {
        toEmail: toEmail.trim(),
        subject: subject.trim(),
        bodyHtml: body,
        leadId,
        customerId,
        opportunityId
      });

      setSuccess('Email sent successfully!');
      if (onEmailSent) onEmailSent();

      setTimeout(() => {
        setSubject('');
        setBody('');
        setSuccess(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send email. Please check your SMTP settings.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="crm-modal-backdrop" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100
    }}>
      <div className="crm-modal-card" style={{
        width: '100%',
        maxWidth: '560px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
              <Mail size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Compose Email {recipientName ? `to ${recipientName}` : ''}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Outbound messages automatically log to the activity timeline
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
              TO:
            </label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="recipient@example.com"
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
              SUBJECT:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Follow up regarding proposal / inquiry"
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
              MESSAGE BODY:
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message here..."
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--accent-primary, #6366f1)',
                color: '#fff',
                cursor: sending ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                opacity: sending ? 0.7 : 1
              }}
            >
              <Send size={15} /> {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
