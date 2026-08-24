import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../lib/toast';
import {
  X, Camera, Trash2, Check, User, Mail, Shield, LogOut,
  UploadCloud, Copy, CheckCheck, Sparkles, Key, Smartphone,
  Activity, Clock, BadgeCheck, ChevronRight
} from 'lucide-react';
import './layout.css';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'avatar' | 'security';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfileImage, logout, selectedRole, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [previewImage, setPreviewImage] = useState<string | null>(user?.profileImage || null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  // Sync state if user.profileImage changes
  const currentAvatar = previewImage !== null ? previewImage : user.profileImage;

  // Compress image on client using canvas to keep payload super light (~30-50kb)
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
        const maxSize = 320;
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
          showToast('Photo selected! Click "Save Photo" to apply.', 'info');
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
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

  const handleRemoveAvatar = async () => {
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Photo reset. Click "Save Photo" to confirm.', 'info');
  };

  const handleCopyEmail = () => {
    if (!user.email) return;
    navigator.clipboard.writeText(user.email);
    setCopiedEmail(true);
    showToast('Email copied to clipboard!', 'success');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Get user initials for default avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isRoleAdmin = user.roles.includes('Admin');
  const isRoleManager = user.roles.includes('Manager');

  return (
    <div className="user-profile-modal-overlay" onClick={onClose}>
      <div
        className="user-profile-modal-card modern-profile-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Cover Banner with Sleek Gradient */}
        <div className="profile-cover-banner">
          <div className="profile-cover-badges">
            <span className="profile-cover-status">
              <span className="status-dot-pulse" />
              Active Session
            </span>
          </div>
          <button className="profile-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Hero Section */}
        <div className="profile-hero-container">
          <div className="profile-hero-avatar-wrap">
            <div className="profile-avatar-glow-ring">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={user.name}
                  className="profile-hero-avatar-img"
                />
              ) : (
                <div className="profile-hero-avatar-initials">
                  {getInitials(user.name)}
                </div>
              )}
            </div>

            <button
              type="button"
              className="profile-camera-floating-btn"
              onClick={() => {
                setActiveTab('avatar');
                fileInputRef.current?.click();
              }}
              title="Change Profile Photo"
              aria-label="Change Profile Photo"
            >
              <Camera size={15} />
            </button>
          </div>

          <div className="profile-hero-meta">
            <div className="profile-hero-name-row">
              <h2 id="profile-modal-title" className="profile-hero-user-name">
                {user.name}
              </h2>
              <span className="profile-verified-badge" title="Verified Account">
                <BadgeCheck size={16} />
              </span>
            </div>

            <div className="profile-hero-sub-row">
              <button
                type="button"
                className="profile-email-chip"
                onClick={handleCopyEmail}
                title="Click to copy email"
              >
                <Mail size={13} />
                <span>{user.email || 'No email associated'}</span>
                {copiedEmail ? <CheckCheck size={13} className="text-success" /> : <Copy size={12} className="copy-icon" />}
              </button>

              <div className={`profile-role-pill role-${selectedRole.toLowerCase()}`}>
                <Shield size={13} />
                <span>
                  {selectedRole === 'Admin'
                    ? 'Administrator'
                    : selectedRole === 'Manager'
                    ? 'Sales Manager'
                    : 'Sales Representative'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="profile-nav-tabs">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <User size={15} />
            <span>Profile Overview</span>
          </button>

          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'avatar' ? 'active' : ''}`}
            onClick={() => setActiveTab('avatar')}
          >
            <Camera size={15} />
            <span>Photo & Branding</span>
            {previewImage !== user.profileImage && <span className="tab-update-dot" />}
          </button>

          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Key size={15} />
            <span>Account & Access</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="profile-modal-content-area">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="profile-tab-pane animate-fade-in">
              <div className="profile-summary-grid">
                <div className="profile-card-field">
                  <span className="field-title">
                    <User size={13} /> Full Legal Name
                  </span>
                  <span className="field-data">{user.name}</span>
                </div>

                <div className="profile-card-field">
                  <span className="field-title">
                    <Mail size={13} /> Work Email
                  </span>
                  <span className="field-data">{user.email}</span>
                </div>

                <div className="profile-card-field">
                  <span className="field-title">
                    <Shield size={13} /> Primary Role
                  </span>
                  <span className="field-data">
                    {user.roles.join(', ') || selectedRole}
                  </span>
                </div>

                <div className="profile-card-field">
                  <span className="field-title">
                    <Activity size={13} /> Account ID
                  </span>
                  <span className="field-data font-mono">
                    #USR-{user.userId || '001'}
                  </span>
                </div>
              </div>

              {/* Privilege Highlights Card */}
              <div className="profile-access-card">
                <div className="access-card-header">
                  <Sparkles size={16} className="text-accent" />
                  <span className="access-card-title">Role Privileges & Access</span>
                </div>
                <p className="access-card-desc">
                  {selectedRole === 'Admin'
                    ? 'Full enterprise access enabled: Lead generation, Opportunity management, Pipeline automation, User provisioning, Audit logs, and System settings.'
                    : selectedRole === 'Manager'
                    ? 'Management access enabled: Pipeline analytics, Sales team supervision, Deal assignment, and Reporting dashboards.'
                    : 'Sales representative access: Opportunity pipeline tracking, Lead management, Task management, and Customer engagement tools.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: AVATAR & BRANDING */}
          {activeTab === 'avatar' && (
            <div className="profile-tab-pane animate-fade-in">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div
                className={`profile-dropzone ${isDragging ? 'dropzone-active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="dropzone-icon-circle">
                  <UploadCloud size={24} />
                </div>
                <div className="dropzone-text">
                  <h4>Drag & Drop your photo here</h4>
                  <p>or click to browse files from your device</p>
                </div>
                <span className="dropzone-badge">JPG, PNG, WebP • Max 5MB</span>
              </div>

              <div className="profile-avatar-actions-bar">
                <button
                  type="button"
                  className="btn-upload-action"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={15} />
                  <span>Choose New Photo</span>
                </button>

                {previewImage && (
                  <button
                    type="button"
                    className="btn-remove-action"
                    onClick={handleRemoveAvatar}
                  >
                    <Trash2 size={15} />
                    <span>Reset to Initials</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & SESSION */}
          {activeTab === 'security' && (
            <div className="profile-tab-pane animate-fade-in">
              {/* Role Simulation for Admins */}
              {(isRoleAdmin || isRoleManager) && (
                <div className="profile-role-switcher-section">
                  <div className="section-label-row">
                    <Shield size={14} />
                    <span>Role View Switcher</span>
                  </div>
                  <p className="section-subtext">
                    Preview CRM dashboard workflows under different permission sets:
                  </p>
                  <div className="role-switcher-buttons">
                    {isRoleAdmin && (
                      <button
                        type="button"
                        className={`role-choice-btn ${selectedRole === 'Admin' ? 'active' : ''}`}
                        onClick={() => switchRole('Admin')}
                      >
                        👑 Administrator
                      </button>
                    )}
                    {(isRoleAdmin || isRoleManager) && (
                      <button
                        type="button"
                        className={`role-choice-btn ${selectedRole === 'Manager' ? 'active' : ''}`}
                        onClick={() => switchRole('Manager')}
                      >
                        👔 Manager
                      </button>
                    )}
                    <button
                      type="button"
                      className={`role-choice-btn ${selectedRole === 'SalesRep' ? 'active' : ''}`}
                      onClick={() => switchRole('SalesRep')}
                    >
                      💼 Sales Rep
                    </button>
                  </div>
                </div>
              )}

              {/* Active Session Info */}
              <div className="profile-session-box">
                <div className="session-item">
                  <Smartphone size={16} className="text-secondary" />
                  <div className="session-info">
                    <span className="session-title">Current Web Session</span>
                    <span className="session-subtitle">Active now • JWT Secure Bearer Token</span>
                  </div>
                  <span className="badge-online">Online</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="profile-modal-footer-modern">
          <button
            type="button"
            className="profile-btn-signout"
            onClick={() => {
              onClose();
              logout();
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>

          <div className="profile-footer-right-actions">
            <button
              type="button"
              className="profile-btn-cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              Close
            </button>

            {previewImage !== user.profileImage && (
              <button
                type="button"
                className="profile-btn-save"
                onClick={handleSaveAvatar}
                disabled={isSaving}
              >
                <Check size={16} />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
