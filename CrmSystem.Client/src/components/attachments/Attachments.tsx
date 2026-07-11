import React, { useEffect, useState } from 'react';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import { api, resolveUrl } from '../../lib/api';
import ImageLightbox from './ImageLightbox';
import PreviewModal from './PreviewModal';

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
    entity: 'customer' | 'company' | 'opportunity';
    entityId: number;
    canEdit?: boolean;
    onCountChange?: (count: number) => void;
}

export const Attachments: React.FC<Props> = ({ entity, entityId, canEdit = true, onCountChange }) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

    const queryParam = `${entity}Id=${entityId}`;

    const load = async () => {
        try {
            const res = await api.get<Attachment[]>(`/api/attachments?${queryParam}`);
            setAttachments(res ?? []);
            onCountChange?.(res?.length ?? 0);
        } catch {
            // ignore
        }
    };

    useEffect(() => { load(); }, [entity, entityId]);

    const upload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            form.append(`${entity[0].toUpperCase() + entity.slice(1)}Id`, String(entityId));
            await api.upload('/api/attachments', form);
            setFile(null);
            await load();
        } finally { setUploading(false); }
    };

    const remove = async (id: number) => {
        if (!window.confirm('Delete this attachment?')) return;
        await api.delete(`/api/attachments/${id}`);
        await load();
    };

    const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

    return (
        <div>
            {canEdit && (
                <div className="upload-zone">
                    <Upload size={20} style={{ marginBottom: 8 }} />
                    <p style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{file ? file.name : 'Select a file to upload'}</p>
                    <label className="upload-label">Browse
                        <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {file && <button className="btn" style={{ marginLeft: 8 }} onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>}
                </div>
            )}

            <div className="attachment-list">
                {attachments.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No attachments yet.</p>}
                {attachments.map(att => (
                    <div key={att.attachmentId} className="attachment-row">
                        <div style={{ width: 72, height: 56, marginRight: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {att.contentType && att.contentType.startsWith('image/') ? (
                                <img src={resolveUrl(att.fileUrl)} alt={att.fileName} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }} onClick={() => setPreviewAttachment({ ...att, fileUrl: resolveUrl(att.fileUrl) })} />
                            ) : (
                                <div style={{ cursor: 'pointer' }} onClick={() => setPreviewAttachment({ ...att, fileUrl: resolveUrl(att.fileUrl) })}><Paperclip size={20} style={{ color: 'var(--accent-primary)' }} /></div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500, fontSize: '0.875rem', margin: 0 }}>{att.fileName}</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>{formatBytes(att.fileSizeBytes)} · Uploaded by {att.uploadedByName} · {new Date(att.uploadedAt).toLocaleDateString()}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <a className="btn-link" href={resolveUrl(att.fileUrl)} target="_blank" rel="noreferrer" download>Download</a>
                            {canEdit && <button className="icon-btn danger" onClick={() => remove(att.attachmentId)} title="Delete"><Trash2 size={14} /></button>}
                        </div>
                    </div>
                ))}
            </div>

            {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
            {previewAttachment && <PreviewModal attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />}
        </div>
    );
};

export default Attachments;
