import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../lib/toast';
import {
  X, Camera, Trash2, Check, User, Mail, Shield, LogOut,
  UploadCloud, Sparkles
} from 'lucide-react';
import './layout.css';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfileImage, logout, selectedRole } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(user?.profileImage || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  // Compress image on client using canvas to keep payload super light (~30-50kb)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WebP)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewImage(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    setIsSaving(true);
    try {
      await updateProfileImage(previewImage);
      showToast('Profile image updated successfully!', 'success');
      onClose();
    } catch {
      showToast('Failed to save profile image', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Get user initials for default avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="user-profile-modal-overlay" onClick={onClose}>
      <div
        className="user-profile-modal-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Header */}
        <div className="profile-modal-header">
          <div className="profile-modal-title-wrap">
            <User className="profile-modal-title-icon" size={20} />
            <h3 id="profile-modal-title" className="profile-modal-title">
              User Profile
            </h3>
          </div>
          <button className="profile-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="profile-modal-body">
          {/* Avatar & Hero Identity Section */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrapper">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={user.name}
                  className="profile-avatar-preview-img"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  {getInitials(user.name)}
                </div>
              )}

              {/* Camera Trigger */}
              <button
                type="button"
                className="profile-avatar-edit-trigger"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Profile Picture"
                aria-label="Upload Profile Picture"
              >
                <Camera size={16} />
              </button>
            </div>

            {/* Prominent Name, Email & Role Header */}
            <div className="profile-hero-identity">
              <h3 className="profile-hero-name">{user.name}</h3>
              <div className="profile-hero-email">
                <Mail size={14} />
                <span>{user.email}</span>
              </div>
              <div className="profile-hero-role-badge">
                <Shield size={13} />
                <span>
                  {selectedRole === 'Admin'
                    ? '👑 Administrator'
                    : selectedRole === 'Manager'
                    ? '👔 Manager'
                    : '💼 Sales Representative'}
                </span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div className="profile-avatar-controls">
              <button
                type="button"
                className="profile-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={15} />
                <span>{previewImage ? 'Change Photo' : 'Upload Photo'}</span>
              </button>

              {previewImage && (
                <button
                  type="button"
                  className="profile-remove-btn"
                  onClick={handleRemoveAvatar}
                  title="Remove Photo"
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              )}
            </div>
            <p className="profile-avatar-hint">
              Supported formats: JPG, PNG, WebP (Max recommended: 5MB)
            </p>
          </div>

          {/* User Details Grid */}
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <div className="profile-info-label">
                <User size={14} />
                <span>Full Name</span>
              </div>
              <div className="profile-info-value">{user.name}</div>
            </div>

            <div className="profile-info-item">
              <div className="profile-info-label">
                <Mail size={14} />
                <span>Email Address</span>
              </div>
              <div className="profile-info-value">{user.email}</div>
            </div>

            <div className="profile-info-item">
              <div className="profile-info-label">
                <Shield size={14} />
                <span>Assigned Role</span>
              </div>
              <div className="profile-info-value" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {user.roles.map((r) => (
                  <span
                    key={r}
                    className={`profile-role-badge ${r === selectedRole ? 'active-role' : ''}`}
                  >
                    {r === 'SalesRep' ? 'Sales Representative' : r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="profile-modal-footer">
          <button
            type="button"
            className="profile-logout-btn"
            onClick={() => {
              onClose();
              logout();
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>

          <div className="profile-footer-right">
            <button
              type="button"
              className="profile-cancel-btn"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="profile-save-btn"
              onClick={handleSaveAvatar}
              disabled={isSaving || previewImage === user.profileImage}
            >
              <Check size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
