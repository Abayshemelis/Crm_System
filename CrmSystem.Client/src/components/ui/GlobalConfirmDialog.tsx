import React from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

interface GlobalConfirmDialogProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const GlobalConfirmDialog: React.FC<GlobalConfirmDialogProps> = ({ 
  message, 
  confirmText = 'Delete', 
  cancelText = 'Cancel', 
  type = 'danger',
  onConfirm, 
  onCancel 
}) => {
  const isDanger = type === 'danger';
  
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 320 }}>
        <div className="modal-header" style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              padding: '0.35rem', 
              background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
              color: isDanger ? '#ef4444' : '#3b82f6', 
              borderRadius: '50%' 
            }}>
              {isDanger ? <AlertTriangle size={18} /> : <Info size={18} />}
            </div>
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Confirm</h2>
          </div>
          <button className="icon-btn" onClick={onCancel} style={{ padding: '0.25rem' }}><X size={18} /></button>
        </div>
        
        <div className="modal-body" style={{ padding: '0.75rem 1rem 1.25rem', color: 'var(--text-secondary)' }}>
          <p style={{ margin: 0, lineHeight: 1.4, fontSize: '0.9rem' }}>{message}</p>
        </div>
        
        <div className="modal-footer" style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }} onClick={onCancel}>{cancelText}</button>
          <button 
            className={isDanger ? "btn-danger" : "btn-primary"} 
            onClick={onConfirm} 
            style={isDanger ? { background: '#ef4444', color: 'white', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.85rem' } : { padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
