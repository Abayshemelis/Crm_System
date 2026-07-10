import React, { useRef, useState } from 'react';
import './ui.css';

interface UploadDropzoneProps {
    onFilesSelected: (files: FileList) => void;
    accept?: string;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onFilesSelected, accept }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dragging, setDragging] = useState(false);

    return (
        <div
            className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => {
                e.preventDefault(); setDragging(false);
                if (e.dataTransfer.files.length) onFilesSelected(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
        >
            <p>Drag files here or click to browse</p>
            <input ref={inputRef} type="file" accept={accept} onChange={e => e.target.files && onFilesSelected(e.target.files)} hidden />
        </div>
    );
};
