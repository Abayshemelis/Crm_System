import React, { useEffect, useState } from 'react';
import { resolveUrl } from '../../lib/api';

interface Attachment {
    attachmentId: number;
    fileName: string;
    fileUrl: string;
    fileSizeBytes: number;
    uploadedByName: string;
    uploadedAt: string;
    contentType?: string | null;
}

interface Props {
    attachment: Attachment | null;
    onClose: () => void;
}

export const PreviewModal: React.FC<Props> = ({ attachment, onClose }) => {
    const [textPreview, setTextPreview] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    if (!attachment) return null;

    const fileUrl = resolveUrl(attachment.fileUrl);
    const rawCtype = attachment.contentType ?? '';
    const ctype = rawCtype.split(';')[0].trim().toLowerCase();
    const nameExtension = attachment.fileName.split('.').pop()?.toLowerCase() ?? '';
    const urlExtension = fileUrl.split('.').pop()?.toLowerCase().split(/[?#]/)[0] ?? '';
    const extension = nameExtension || urlExtension;
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'mkv'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
    const textExtensions = ['txt', 'md', 'csv', 'json', 'log', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'yml', 'yaml'];
    const isImage = ctype.startsWith('image/') || imageExtensions.includes(extension) || ctype === 'image/svg+xml';
    const isVideo = ctype.startsWith('video/') || videoExtensions.includes(extension);
    const isAudio = ctype.startsWith('audio/') || audioExtensions.includes(extension);
    const isText = ctype.startsWith('text/') || textExtensions.includes(extension) || ctype === 'application/json' || ctype === 'application/xml' || ctype === 'application/javascript' || ctype === 'application/xhtml+xml';
    const isPdf = ctype === 'application/pdf' || ctype === 'application/x-pdf' || extension === 'pdf';

    useEffect(() => {
        if (!attachment) return;
        setLoadError(null);
        if (isText) {
            // fetch text content to preview
            fetch(fileUrl)
                .then(r => {
                    if (!r.ok) throw new Error('Load failed');
                    return r.text();
                })
                .then(t => setTextPreview(t.slice(0, 20000)))
                .catch(() => {
                    setTextPreview('Unable to load text preview.');
                    setLoadError('Unable to load text preview.');
                });
        } else {
            setTextPreview(null);
        }
    }, [attachment, fileUrl, isText]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <h3>{attachment.fileName}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Close modal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>

                <div className="modal-body">
                    {isImage && (
                        <img src={fileUrl} alt={attachment.fileName} style={{ width: '100%', height: 'auto', borderRadius: 6 }} onError={() => setLoadError('Unable to load image preview.')} />
                    )}

                    {isPdf && (
                        <div style={{ width: '100%', height: '70vh' }}>
                            <object data={fileUrl} type="application/pdf" width="100%" height="100%">
                                <iframe src={fileUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Preview (fallback)" onError={() => setLoadError('Unable to load PDF preview.')} />
                            </object>
                        </div>
                    )}

                    {isVideo && (
                        <video controls style={{ width: '100%' }} src={fileUrl} onError={() => setLoadError('Unable to load video preview.')} />
                    )}

                    {isAudio && (
                        <audio controls style={{ width: '100%' }} src={fileUrl} onError={() => setLoadError('Unable to load audio preview.')} />
                    )}

                    {isText && (
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: 'var(--bg-primary)', padding: '1rem', borderRadius: '4px' }}>{textPreview ?? 'Loading…'}</pre>
                    )}

                    {!isImage && !isPdf && !isVideo && !isAudio && !isText && (
                        <div>
                            <iframe src={fileUrl} style={{ width: '100%', height: '70vh', border: 'none' }} title="File Preview" onError={() => setLoadError('Unable to load preview.')} />
                            <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Browser preview is attempted for this file type; if it does not render, use Download.</p>
                        </div>
                    )}

                    {loadError && <p style={{ color: 'var(--error)' }}>{loadError}</p>}
                </div>

                <div className="modal-footer">
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="btn-link" style={{ textDecoration: 'none', color: 'var(--text-primary)', padding: '0.375rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>Open in new tab</a>
                    <a href={fileUrl} download className="btn-link" style={{ textDecoration: 'none', color: '#fff', padding: '0.375rem 0.75rem', background: 'var(--accent-primary)', borderRadius: '4px' }}>Download</a>
                </div>
            </div>
        </div>
    );
};

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 };
const box: React.CSSProperties = { width: 'min(900px, 96%)', background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' };
const closeBtn: React.CSSProperties = { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 };

export default PreviewModal;
