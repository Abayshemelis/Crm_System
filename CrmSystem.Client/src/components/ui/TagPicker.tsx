import React from 'react';
import './ui.css';

interface TagPickerProps {
    tags: { id: number; name: string }[];
    selectedTagIds: number[];
    onToggle: (tagId: number) => void;
}

export const TagPicker: React.FC<TagPickerProps> = ({ tags, selectedTagIds, onToggle }) => (
    <div className="tag-picker">
        {tags.map(tag => (
            <button
                key={tag.id}
                type="button"
                className={`tag-badge ${selectedTagIds.includes(tag.id) ? 'tag-selected' : ''}`}
                onClick={() => onToggle(tag.id)}
            >
                {tag.name}
            </button>
        ))}
    </div>
);
