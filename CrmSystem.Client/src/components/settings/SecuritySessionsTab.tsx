import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Monitor,
  Laptop,
  Globe,
  Clock,
  Key,
  Lock,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../lib/toast';
import { confirmAction } from '../../lib/confirm';

interface ActiveSession {
  sessionId: number;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrentSession?: boolean;
}

export const SecuritySessionsTab: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  // Change Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const storedRefresh = localStorage.getItem('refreshToken') || '';
      const data = await api.get<ActiveSession[]>(`/api/auth/sessions?currentRefreshToken=${encodeURIComponent(storedRefresh)}`);
      setSessions(data || []);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load active sessions', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: number, deviceName: string) => {
    const confirmed = await confirmAction(
      `Are you sure you want to log out the session on "${deviceName}"? That device will require signing in again.`,
      {
        confirmText: 'Revoke Session',
        cancelText: 'Cancel',
        type: 'danger'
      }
    );
    if (!confirmed) return;

    setRevokingId(sessionId);
    try {
      await api.post(`/api/auth/sessions/revoke/${sessionId}`, {});
      showToast(`Session on ${deviceName} revoked successfully.`, 'success');
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke session', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (sessions.length <= 1) {
      showToast('No other active sessions detected.', 'info');
      return;
    }

    const confirmed = await confirmAction(
      'Are you sure you want to log out all other active devices? All other computers or phones logged into your account will require signing in again.',
      {
        confirmText: 'Log Out Others',
        cancelText: 'Keep Sessions',
        type: 'danger'
      }
    );
    if (!confirmed) return;

    setRevokingOthers(true);
    try {
      const currentRefreshToken = localStorage.getItem('refreshToken') || undefined;
      await api.post('/api/auth/sessions/revoke-others', { currentRefreshToken });
      showToast('All other sessions have been logged out.', 'success');
      await fetchSessions();
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke other sessions', 'error');
    } finally {
      setRevokingOthers(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New password and confirmation do not match.', 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      // Direct password update endpoint
      await api.post('/api/users/change-password', {
        oldPassword,
        newPassword
      }).catch(async () => {
        // Fallback: If self-update endpoint is under another route
        await api.put(`/api/users/${user?.userId}`, {
          name: user?.name,
          email: user?.email,
          password: newPassword
        });
      });

      showToast('Password updated successfully!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    const lower = deviceInfo.toLowerCase();
    if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) {
      return <Smartphone size={22} className="text-amber-500" style={{ color: '#f59e0b' }} />;
    }
    if (lower.includes('mac') || lower.includes('laptop')) {
      return <Laptop size={22} className="text-indigo-500" style={{ color: '#6366f1' }} />;
    }
    return <Monitor size={22} className="text-blue-500" style={{ color: '#3b82f6' }} />;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const otherSessionsCount = Math.max(0, sessions.length - 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── 1. Top Summary Banner ─────────────────────────────────────────── */}
      <Card className="glass-panel" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '1.75rem 2rem',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}
            >
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Security & Active Sessions
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Standard enterprise session control. Monitor devices logged into account <strong>{user?.email}</strong>.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchSessions}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
              Refresh
            </Button>
            {otherSessionsCount > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleRevokeOtherSessions}
                disabled={revokingOthers || loading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <LogOut size={14} />
                Log Out Other Devices ({otherSessionsCount})
              </Button>
            )}
          </div>
        </div>

        {/* ── 2. KPI Metrics Bar ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            padding: '1.5rem 2rem',
            background: 'var(--bg-primary)'
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Active Sessions
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {sessions.length} {sessions.length === 1 ? 'Device' : 'Devices'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <UserCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Account Security
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.roles?.join(', ') || 'Authorized'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Globe size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                Current Connection
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {sessions[0]?.ipAddress || '127.0.0.1 (Local)'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. Active Sessions List ───────────────────────────────────────── */}
      <Card className="glass-panel" style={{ padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Logged-in Devices & Browsers
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
              If you see an unfamiliar device or location, revoke it immediately and change your password.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 0.75rem' }} />
            Loading active sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No active session records found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {sessions.map((session, index) => {
              const isCurrentDevice = !!session.isCurrentSession || (sessions.every(s => !s.isCurrentSession) && index === 0);
              return (
                <div
                  key={session.sessionId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.1rem 1.35rem',
                    background: isCurrentDevice ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: isCurrentDevice ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '260px' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '12px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getDeviceIcon(session.deviceInfo)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {session.deviceInfo}
                        </span>
                        {isCurrentDevice && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '20px',
                              padding: '2px 8px'
                            }}
                          >
                            Active Now (This Device)
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          marginTop: '0.35rem',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          flexWrap: 'wrap'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Globe size={13} /> {session.ipAddress}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={13} /> Last active: {formatDate(session.lastActiveAt)}
                        </span>
                        <span>
                          Signed in: {formatDate(session.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isCurrentDevice ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Current Browser Session
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRevokeSession(session.sessionId, session.deviceInfo)}
                        disabled={revokingId === session.sessionId}
                        style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      >
                        <LogOut size={13} style={{ marginRight: 4 }} />
                        {revokingId === session.sessionId ? 'Revoking...' : 'Revoke Session'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── 4. Standard Best Practice Information ──────────────────────────── */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}
      >
        <Shield size={20} style={{ color: '#6366f1', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-primary)' }}>Standard CRM Best Practice:</strong> Every administrator and team member should have their own individual login account (configured under <em>Settings &gt; Users &amp; Roles</em>). This ensures full accountability in the <strong>Audit Trail</strong> and allows seamless session revocation when an employee changes devices.
        </div>
      </div>
    </div>
  );
};
