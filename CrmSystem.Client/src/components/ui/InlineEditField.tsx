import React, { useState } from 'react';
import './ui.css';

interface InlineEditFieldProps {
    value: string;
    onSave: (value: string) => Promise<void>;
    placeholder?: string;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({ value, onSave, placeholder }) => {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(value);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="inline-edit-field">
            {editing ? (
                <input
                    className="input-field"
                    value={text}
                    placeholder={placeholder}
                    onChange={e => setText(e.target.value)}
                    onBlur={async () => {
                        setSaving(true);
                        try {
                            await onSave(text);
                            setEditing(false);
                            setError(null);
                        } catch (ex) {
                            setError('Save failed');
                        } finally {
                            setSaving(false);
                        }
                    }}
                    autoFocus
                />
            ) : (
                <div className="inline-edit-display" onClick={() => setEditing(true)}>
                    {value || placeholder || 'Click to edit'}
                </div>
            )}
            {saving && <span className="inline-loading">Saving...</span>}
            {error && <span className="inline-error">{error}</span>}
        </div>
    );
};
