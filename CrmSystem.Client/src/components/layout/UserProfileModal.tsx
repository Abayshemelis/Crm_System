import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../lib/toast';
import {
  X, Camera, Trash2, Check, User, Mail, Shield, LogOut,
  UploadCloud, Copy, CheckCheck, Key, ShieldCheck,
  RefreshCw, BadgeCheck, Smartphone, CheckCircle2
} from 'lucide-react';
import './layout.css';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfileImage, logout, selectedRole, switchRole } = useAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(user?.profileImage || null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  // Sync current avatar
  const currentAvatar = previewImage !== null ? previewImage : user.profileImage;

  // Client-side image processing & compression using canvas
  const processImageFile = (file: File) => {
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setPreviewImage(dataUrl);
          showToast('Photo selected! Click "Save Changes" to apply.', 'info');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
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

  const handleRemoveAvatar = () => {
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Photo reset. Click "Save Changes" to confirm.', 'info');
  };

  const handleCopyEmail = () => {
    if (!user.email) return;
    navigator.clipboard.writeText(user.email);
    setCopiedEmail(true);
    showToast('Email copied to clipboard!', 'success');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isRoleAdmin = user.roles.includes('Admin');
  const isRoleManager = user.roles.includes('Manager');

  // Short role label matching the active session role
  const profileTitle =
    selectedRole === 'Admin'
      ? 'Admin'
      : selectedRole === 'Manager'
      ? 'Manager'
      : 'Sales Rep';

  return (
    <div className="user-profile-modal-overlay" onClick={onClose}>
      <div
        className="user-profile-modal-card clean-profile-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* ── Compact Profile Header ── */}
        <div className="clean-profile-header">
          <div className="clean-profile-header-left">
            <div className="clean-profile-avatar-wrap">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={user.name}
                  className="clean-profile-avatar-img"
                />
              ) : (
                <div className="clean-profile-avatar-initials">
                  {getInitials(user.name)}
                </div>
              )}
              <button
                type="button"
                className="clean-profile-camera-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Upload/Change Profile Photo"
                aria-label="Upload/Change Profile Photo"
              >
                <Camera size={13} />
              </button>
            </div>

            <div className="clean-profile-user-info">
              <div className="clean-profile-name-row">
                <h2 id="profile-modal-title" className="clean-profile-name">
                  {user.name}
                </h2>
                <span title="Verified CRM Account" style={{ display: 'inline-flex' }}>
                  <BadgeCheck size={16} className="clean-profile-verified" />
                </span>
              </div>

              <div className="clean-profile-meta-row">
                <button
                  type="button"
                  className="clean-profile-email-btn"
                  onClick={handleCopyEmail}
                  title="Click to copy email"
                >
                  <Mail size={12} />
                  <span>{user.email || 'No email associated'}</span>
                  {copiedEmail ? <CheckCheck size={12} color="#10b981" /> : <Copy size={11} className="copy-icon" />}
                </button>

                <div className={`clean-profile-role-badge role-${selectedRole.toLowerCase()}`}>
                  <Shield size={12} />
                  <span>{profileTitle}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            className="clean-profile-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Profile Body Sections ── */}
        <div className="clean-profile-body">
          {/* Section 1: Account Information */}
          <div className="clean-profile-section">
            <div className="clean-profile-section-title">
              <User size={14} /> Account Information
            </div>

            <div className="clean-profile-info-grid">
              <div className="clean-profile-info-item">
                <span className="clean-profile-info-label">Full Name</span>
                <span className="clean-profile-info-value">{user.name}</span>
              </div>

              <div className="clean-profile-info-item">
                <span className="clean-profile-info-label">Email Address</span>
                <span className="clean-profile-info-value">{user.email}</span>
              </div>

              <div className="clean-profile-info-item">
                <span className="clean-profile-info-label">Assigned Roles</span>
                <span className="clean-profile-info-value">
                  {user.roles.join(', ') || selectedRole}
                </span>
              </div>

              <div className="clean-profile-info-item">
                <span className="clean-profile-info-label">Account Reference</span>
                <span className="clean-profile-info-value" style={{ fontFamily: 'monospace' }}>
                  #USR-{user.userId || '001'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Photo Management Actions */}
          <div className="clean-profile-section">
            <div className="clean-profile-section-title">
              <Camera size={14} /> Profile Picture Management
            </div>

            <div className="clean-profile-photo-bar">
              <button
                type="button"
                className="clean-profile-action-btn primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={14} />
                <span>Upload New Photo</span>
              </button>

              {currentAvatar && (
                <button
                  type="button"
                  className="clean-profile-action-btn secondary"
                  onClick={handleRemoveAvatar}
                >
                  <Trash2 size={14} />
                  <span>Reset to Initials</span>
                </button>
              )}

              <span className="clean-profile-photo-hint">
                PNG, JPG, WebP (auto-optimized)
              </span>
            </div>
          </div>

          {/* Section 3: Role Switcher (For Admins / Managers) */}
          {(isRoleAdmin || isRoleManager) && (
            <div className="clean-profile-section">
              <div className="clean-profile-section-title">
                <Shield size={14} /> Role View Switcher
              </div>
              <p className="clean-profile-section-desc">
                Preview CRM dashboards and permissions under different user perspectives:
              </p>

              <div className="clean-profile-role-switcher">
                {isRoleAdmin && (
                  <button
                    type="button"
                    className={`clean-role-toggle-btn ${selectedRole === 'Admin' ? 'active' : ''}`}
                    onClick={() => switchRole('Admin')}
                  >
                    👑 Administrator
                  </button>
                )}
                {(isRoleAdmin || isRoleManager) && (
                  <button
                    type="button"
                    className={`clean-role-toggle-btn ${selectedRole === 'Manager' ? 'active' : ''}`}
                    onClick={() => switchRole('Manager')}
                  >
                    👔 Manager
                  </button>
                )}
                <button
                  type="button"
                  className={`clean-role-toggle-btn ${selectedRole === 'SalesRep' ? 'active' : ''}`}
                  onClick={() => switchRole('SalesRep')}
                >
                  💼 Sales Rep
                </button>
              </div>
            </div>
          )}

          {/* Section 4: Security Status */}
          <div className="clean-profile-section">
            <div className="clean-profile-section-title">
              <Key size={14} /> Security & Session
            </div>

            <div className="clean-profile-security-row">
              <div className="clean-profile-security-left">
                <ShieldCheck size={16} color="#10b981" />
                <div>
                  <span className="clean-profile-security-main">Active Web Session</span>
                  <span className="clean-profile-security-sub">JWT Bearer Token Encrypted • Role & Scope Guarded</span>
                </div>
              </div>
              <span className="clean-profile-status-pill">
                <span className="clean-profile-status-dot" /> Online
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="clean-profile-footer">
          <button
            type="button"
            className="clean-profile-signout-btn"
            onClick={() => {
              onClose();
              logout();
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>

          <div className="clean-profile-footer-right">
            <button
              type="button"
              className="clean-profile-btn-close"
              onClick={onClose}
              disabled={isSaving}
            >
              Close
            </button>

            {previewImage !== user.profileImage && (
              <button
                type="button"
                className="clean-profile-btn-save"
                onClick={handleSaveAvatar}
                disabled={isSaving}
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
