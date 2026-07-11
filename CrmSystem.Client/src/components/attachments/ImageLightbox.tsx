import React from 'react';

interface Props {
    src: string;
    alt?: string;
    onClose: () => void;
}

export const ImageLightbox: React.FC<Props> = ({ src, alt = '', onClose }) => {
    return (
        <div className="lightbox-overlay" onClick={onClose} style={overlayStyle}>
            <div style={containerStyle} onClick={e => e.stopPropagation()}>
                <button onClick={onClose} style={closeBtnStyle} aria-label="Close">✕</button>
                <img src={src} alt={alt} style={imgStyle} />
            </div>
        </div>
    );
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
};

const containerStyle: React.CSSProperties = {
    maxWidth: '90%', maxHeight: '90%', position: 'relative'
};

const imgStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 };

const closeBtnStyle: React.CSSProperties = { position: 'absolute', right: -8, top: -8, background: '#fff', borderRadius: 999, border: 'none', padding: '6px 8px', cursor: 'pointer' };

export default ImageLightbox;
