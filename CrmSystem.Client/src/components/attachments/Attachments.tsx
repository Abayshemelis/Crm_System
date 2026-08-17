import React, { useEffect, useState } from 'react';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import { api, resolveUrl } from '../../lib/api';
import ImageLightbox from './ImageLightbox';
import PreviewModal from './PreviewModal';
import { confirmAction } from '../../lib/confirm';

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
    entity: 'customer' | 'company' | 'opportunity' | 'lead';
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
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Allowed file types and max size (25 MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB in bytes
    const ALLOWED_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ];

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

    const validateFile = (selectedFile: File): string | null => {
        // Check file size
        if (selectedFile.size > MAX_FILE_SIZE) {
            return `File size exceeds 25 MB limit. Selected file is ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB.`;
        }

        // Check file type
        if (!ALLOWED_TYPES.includes(selectedFile.type)) {
            return `Unsupported file type: ${selectedFile.type || 'unknown'}. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, Word documents, Excel spreadsheets, text files, and CSV.`;
        }

        return null;
    };

    const handleFileSelect = (selectedFile: File | null) => {
        setUploadError(null);
        
        if (!selectedFile) {
            setFile(null);
            return;
        }

        const error = validateFile(selectedFile);
        if (error) {
            setUploadError(error);
            setFile(null);
            return;
        }

        setFile(selectedFile);
    };

    const upload = async () => {
        if (!file) return;
        setUploading(true);
        setUploadError(null);
        try {
            const form = new FormData();
            form.append('File', file);
            form.append(`${entity[0].toUpperCase() + entity.slice(1)}Id`, String(entityId));
            await api.upload('/api/attachments', form);
            setFile(null);
            await load();
        } catch (error: any) {
            setUploadError(error?.message || 'Failed to upload file. Please try again.');
        } finally { setUploading(false); }
    };

    const remove = async (id: number) => {
        if (!await confirmAction('Delete this attachment?')) return;
        await api.delete(`/api/attachments/${id}`);
        await load();
    };

    const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

    return (
        <div style={{ width: '100%', overflow: 'hidden' }}>
            {canEdit && (
                <div className="upload-zone">
                    <Upload size={24} style={{ marginBottom: 8, color: 'var(--accent-primary)' }} />
                    <p style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{file ? file.name : 'Select a file to upload (Max 25 MB)'}</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <label className="upload-label">
                            Browse
                            <input type="file" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files?.[0] ?? null)} />
                        </label>
                        {file && (
                            <button className="btn btn-primary" onClick={upload} disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Upload File'}
                            </button>
                        )}
                    </div>
                    {uploadError && <p style={{ marginTop: 8, color: 'var(--error)', fontSize: '0.75rem' }}>{uploadError}</p>}
                </div>
            )}

            <div className="attachment-list">
                {attachments.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 1rem', margin: 0 }}>No attachments uploaded yet.</p>
                )}
                {attachments.map(att => (
                    <div key={att.attachmentId} className="attachment-row">
                        <div className="attachment-icon">
                            {att.contentType && att.contentType.startsWith('image/') ? (
                                <img
                                    src={resolveUrl(att.fileUrl)}
                                    alt={att.fileName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                    onClick={() => setPreviewAttachment({ ...att, fileUrl: resolveUrl(att.fileUrl) })}
                                />
                            ) : (
                                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }} onClick={() => setPreviewAttachment({ ...att, fileUrl: resolveUrl(att.fileUrl) })}>
                                    <Paperclip size={20} style={{ color: 'var(--accent-primary)' }} />
                                </div>
                            )}
                        </div>
                        <div className="attachment-info">
                            <p className="attachment-filename" title={att.fileName}>{att.fileName}</p>
                            <p className="attachment-meta">
                                {formatBytes(att.fileSizeBytes)} · Uploaded by {att.uploadedByName} · {new Date(att.uploadedAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="attachment-actions">
                            <a className="btn-link" href={resolveUrl(att.fileUrl)} target="_blank" rel="noreferrer" download>
                                Download
                            </a>
                            {canEdit && (
                                <button className="icon-btn danger" onClick={() => remove(att.attachmentId)} title="Delete Attachment">
                                    <Trash2 size={14} />
                                </button>
                            )}
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
