import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, X, CheckCheck, ExternalLink, Volume2, VolumeX, 
  CreditCard, CheckSquare, Briefcase, FileText, UserCheck, 
  Info, Trash2, CheckCircle2, Clock, Calendar, ArrowRight, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useSignalR } from '../../context/SignalRContext';
import { playNotificationSound, isSoundEnabled, setSoundEnabled } from '../../lib/sound';
import { showToast } from '../../lib/toast';
import './NotificationBell.css';

export interface NotificationDto {
  notificationId: number;
  message: string;
  typeName: string;
  isRead: boolean;
  relatedTaskId?: number;
  relatedTaskTitle?: string;
  relatedOpportunityId?: number;
  relatedOpportunityTitle?: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const parsedIso = iso.endsWith('Z') || iso.includes('+') || (iso.includes('-') && iso.length > 19)
    ? iso
    : iso + 'Z';
  const ms = Date.now() - new Date(parsedIso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function formatFullDate(iso: string): string {
  if (!iso) return '';
  const parsedIso = iso.endsWith('Z') || iso.includes('+') || (iso.includes('-') && iso.length > 19)
    ? iso
    : iso + 'Z';
  const d = new Date(parsedIso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getNotificationCategory(n: NotificationDto): {
  icon: React.ReactNode;
  color: string;
  bg: string;
  label: string;
  targetUrl: string;
  targetLabel: string;
} {
  const msg = (n.message || '').toLowerCase();
  const type = (n.typeName || '').toLowerCase();

  if (msg.includes('invoice') || msg.includes('payment') || type.includes('payment') || type.includes('invoice')) {
    return {
      icon: <CreditCard size={16} color="#10b981" />,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      label: 'Payment & Invoice',
      targetUrl: '/invoices',
      targetLabel: 'Open Invoices Screen'
    };
  }

  if (msg.includes('contract') || type.includes('contract')) {
    return {
      icon: <FileText size={16} color="#ec4899" />,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.15)',
      label: 'Contract Agreement',
      targetUrl: '/contracts',
      targetLabel: 'Open Contracts Screen'
    };
  }

  if (type.includes('followup') || type.includes('follow-up') || msg.includes('follow-up') || msg.includes('lead') || type.includes('lead')) {
    return {
      icon: <UserCheck size={16} color="#818cf8" />,
      color: '#818cf8',
      bg: 'rgba(129, 140, 248, 0.15)',
      label: 'Lead Follow-up',
      targetUrl: '/leads',
      targetLabel: 'Open Leads Screen'
    };
  }

  if (n.relatedTaskId || msg.includes('task') || type.includes('task')) {
    return {
      icon: <CheckSquare size={16} color="#38bdf8" />,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      label: 'Task Due',
      targetUrl: '/tasks',
      targetLabel: 'View Task Manager'
    };
  }

  if (n.relatedOpportunityId || msg.includes('opportunity') || msg.includes('deal') || type.includes('opportunity')) {
    return {
      icon: <Briefcase size={16} color="#f59e0b" />,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      label: 'Opportunity / Deal',
      targetUrl: n.relatedOpportunityId ? `/opportunities/${n.relatedOpportunityId}` : '/opportunities',
      targetLabel: n.relatedOpportunityTitle ? `View Deal: ${n.relatedOpportunityTitle}` : 'View Opportunities'
    };
  }

  return {
    icon: <Bell size={16} color="#a855f7" />,
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.15)',
    label: n.typeName || 'System Alert',
    targetUrl: '',
    targetLabel: ''
  };
}

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [selectedNotif, setSelectedNotif] = useState<NotificationDto | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Use SignalR context — unreadCount is updated in real-time via WebSocket
  const { unreadCount: signalRCount, setUnreadCount } = useSignalR();

  // Keep local count in sync with SignalR context
  useEffect(() => {
    setCount(signalRCount);
  }, [signalRCount]);

  // Poll unread count every 30 seconds as a fallback (SignalR handles real-time)
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get<{ unreadCount: number }>('/api/notifications/count');
      setCount(res.unreadCount);
      setUnreadCount(res.unreadCount);
    } catch { /* ignore */ }
  }, [setUnreadCount]);

  const alertedLeadsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkFollowUps = async () => {
      try {
        const res = await api.get<any>('/api/leads?limit=200');
        const leads = res.items || res;
        const now = new Date();
        leads.forEach((lead: any) => {
          if (
            lead.nextFollowUpDate &&
            lead.leadStatusName !== 'Converted' &&
            lead.leadStatusName !== 'Lost' &&
            lead.leadStatusName !== 'Closed'
          ) {
            const raw = lead.nextFollowUpDate;
            const parsedIso =
              raw.endsWith('Z') || raw.includes('+') || (raw.includes('-') && raw.length > 19)
                ? raw
                : raw + 'Z';
            const time = new Date(parsedIso).getTime();
            const alertKey = `${lead.leadId}_${lead.nextFollowUpDate}`;

            // Show toast for ANY overdue follow-up not already alerted this session
            if (now.getTime() >= time && !alertedLeadsRef.current.has(alertKey)) {
              alertedLeadsRef.current.add(alertKey);
              playNotificationSound('alert');
              const msg = `Overdue follow-up: ${lead.firstName} ${lead.lastName} (was due ${new Date(parsedIso).toLocaleDateString()})`;
              window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: msg, type: 'warning' } }));
            }
          }
        });
      } catch { /* ignore */ }
    };

    checkFollowUps();
    const followUpTimer = setInterval(checkFollowUps, 30000);

    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    const onLiveNotif = () => {
      fetchCount();
      fetchNotifications();
    };

    window.addEventListener('app:notification', onLiveNotif);

    return () => {
      clearInterval(interval);
      clearInterval(followUpTimer);
      window.removeEventListener('app:notification', onLiveNotif);
    };
  }, [fetchCount]);

  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      playNotificationSound('default');
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get<NotificationDto[]>('/api/notifications');
      setNotifications(res);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) fetchNotifications();
  };

  // Lock background scroll (body, html, .main-content, .layout-main) when notifications panel or detail modal is open
  useEffect(() => {
    if (!open && !selectedNotif) return;

    const mainContent = document.querySelector('.main-content') as HTMLElement | null;
    const layoutMain = document.querySelector('.layout-main') as HTMLElement | null;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevMainOverflow = mainContent ? mainContent.style.overflow : '';
    const prevLayoutOverflow = layoutMain ? layoutMain.style.overflow : '';

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (mainContent) mainContent.style.overflow = 'hidden';
    if (layoutMain) layoutMain.style.overflow = 'hidden';

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && panelRef.current.contains(target)) {
        return;
      }
      const detailModal = document.querySelector('.notif-detail-modal');
      if (detailModal && target && detailModal.contains(target)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      if (mainContent) mainContent.style.overflow = prevMainOverflow;
      if (layoutMain) layoutMain.style.overflow = prevLayoutOverflow;
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [open, selectedNotif]);

  // Close on outside click/touch, allowing the touch event to interact directly with the clicked element
  useEffect(() => {
    if (!open) return;

    const handleOutsideInteract = (e: Event) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideInteract);
    document.addEventListener('touchstart', handleOutsideInteract, { passive: true });
    document.addEventListener('mousedown', handleOutsideInteract);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideInteract);
      document.removeEventListener('touchstart', handleOutsideInteract);
      document.removeEventListener('mousedown', handleOutsideInteract);
    };
  }, [open]);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
      setNotifications(ns => ns.map(n => n.notificationId === id ? { ...n, isRead: true } : n));
      setSelectedNotif(curr => curr && curr.notificationId === id ? { ...curr, isRead: true } : curr);
      const newCount = Math.max(0, count - 1);
      setCount(newCount);
      setUnreadCount(newCount);
    } catch { /* ignore */ }
  };

  const markUnread = async (id: number) => {
    try {
      await api.patch(`/api/notifications/${id}/unread`, {});
      setNotifications(ns => ns.map(n => n.notificationId === id ? { ...n, isRead: false } : n));
      setSelectedNotif(curr => curr && curr.notificationId === id ? { ...curr, isRead: false } : curr);
      const newCount = count + 1;
      setCount(newCount);
      setUnreadCount(newCount);
    } catch { /* ignore */ }
  };

  const deleteNotif = async (id: number) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      const wasUnread = notifications.find(n => n.notificationId === id)?.isRead === false;
      setNotifications(ns => ns.filter(n => n.notificationId !== id));
      if (selectedNotif?.notificationId === id) setSelectedNotif(null);
      if (wasUnread) {
        const newCount = Math.max(0, count - 1);
        setCount(newCount);
        setUnreadCount(newCount);
      }
      showToast('Notification removed', 'info');
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all', {});
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
      setCount(0);
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleNotifClick = async (n: NotificationDto) => {
    if (!n.isRead) await markRead(n.notificationId);
    setSelectedNotif(n);
  };

  const handleNavigateToTarget = (url: string) => {
    if (!url) return;
    setOpen(false);
    setSelectedNotif(null);
    navigate(url);
  };

  const displayedNotifications = filterTab === 'unread' 
    ? notifications.filter(n => !n.isRead) 
    : notifications;

  const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';

  return (
    <>
      <div className="notif-bell-wrapper" ref={panelRef}>
        <button type="button" className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
          <Bell size={18} />
          {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
        </button>

        {open && (
          <div 
            className="notif-panel"
              style={{
                backgroundColor: isLight ? '#ffffff' : '#1e293b',
                borderColor: isLight ? '#cbd5e1' : '#334155',
                color: isLight ? '#0f172a' : '#f8fafc'
              }}
            >
            <div 
              className="notif-panel-header"
              style={{
                backgroundColor: isLight ? '#f8fafc' : '#0f172a',
                borderBottomColor: isLight ? '#e2e8f0' : '#334155'
              }}
            >
              <span className="notif-panel-title" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
                <Bell size={16} /> Notifications
                {count > 0 && <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{count} new</span>}
              </span>
              <div className="notif-panel-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={toggleSound}
                  title={soundOn ? 'Sound enabled (click to mute)' : 'Sound muted (click to enable)'}
                  style={{ opacity: soundOn ? 1 : 0.5 }}
                >
                  {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                {count > 0 && (
                  <button type="button" className="notif-action-btn" onClick={markAllRead} title="Mark all read">
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
                <button type="button" className="icon-btn" onClick={() => setOpen(false)}><X size={14} /></button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div 
              className="notif-filter-tabs"
              style={{
                backgroundColor: isLight ? '#f1f5f9' : '#0f172a',
                borderBottomColor: isLight ? '#e2e8f0' : '#334155'
              }}
            >
              <button 
                type="button" 
                className={`notif-filter-tab ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All ({notifications.length})
              </button>
              <button 
                type="button" 
                className={`notif-filter-tab ${filterTab === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterTab('unread')}
              >
                Unread ({count})
              </button>
            </div>

            <div 
              className="notif-panel-body"
              style={{
                backgroundColor: isLight ? '#ffffff' : '#1e293b'
              }}
            >
              {loading && <div className="notif-loading">Loading notifications…</div>}
              {!loading && displayedNotifications.length === 0 && (
                <div className="notif-empty">
                  {filterTab === 'unread' ? 'No unread notifications 🥳' : "You're all caught up 🎉"}
                </div>
              )}
              {!loading && displayedNotifications.map(n => {
                const cat = getNotificationCategory(n);
                return (
                  <div
                    key={n.notificationId}
                    className={`notif-row ${n.isRead ? 'notif-row-read' : 'notif-row-unread'}`}
                    style={{
                      backgroundColor: isLight 
                        ? (n.isRead ? '#ffffff' : '#f0f4ff') 
                        : (n.isRead ? '#1e293b' : '#1e2846'),
                      borderBottomColor: isLight ? '#f1f5f9' : '#334155'
                    }}
                    onClick={() => handleNotifClick(n)}
                    title="Click to view full details"
                  >
                    <div className="notif-row-icon" style={{ background: cat.bg }}>
                      {cat.icon}
                    </div>
                    <div className="notif-row-body">
                      <div className="notif-row-top">
                        <span className="notif-type-badge" style={{ color: cat.color, background: cat.bg }}>
                          {cat.label}
                        </span>
                        <span className="notif-time">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="notif-message" style={{ color: isLight ? '#1e293b' : '#f1f5f9' }}>{n.message}</p>
                    </div>

                    <div className="notif-row-actions" onClick={e => e.stopPropagation()}>
                      <button 
                        type="button" 
                        className="notif-row-btn" 
                        title="View details"
                        onClick={() => handleNotifClick(n)}
                      >
                        <Eye size={13} />
                      </button>
                      {cat.targetUrl && (
                        <button 
                          type="button" 
                          className="notif-row-btn" 
                          title={cat.targetLabel || 'Go to page'}
                          onClick={() => handleNavigateToTarget(cat.targetUrl)}
                        >
                          <ExternalLink size={13} />
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="notif-row-btn" 
                        title="Delete notification"
                        onClick={() => deleteNotif(n.notificationId)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── NOTIFICATION DETAIL VIEW MODAL ────────────────────────────────────── */}
      {selectedNotif && (() => {
        const cat = getNotificationCategory(selectedNotif);
        return (
          <div className="notif-detail-backdrop" onClick={() => setSelectedNotif(null)}>
            <div className="notif-detail-modal" onClick={e => e.stopPropagation()}>
              <div className="notif-detail-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div className="notif-row-icon" style={{ background: cat.bg }}>
                    {cat.icon}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #f8fafc)', fontWeight: 700 }}>
                      Notification Details
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: cat.color, fontWeight: 600 }}>
                      {cat.label}
                    </span>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="icon-btn" 
                  onClick={() => setSelectedNotif(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="notif-detail-body">
                {/* Full Message Box */}
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Message Content
                  </div>
                  <div className="notif-detail-content-box">
                    {selectedNotif.message}
                  </div>
                </div>

                {/* Metadata Cards */}
                <div className="notif-detail-info-grid">
                  <div className="notif-detail-info-card">
                    <span className="notif-detail-info-label">
                      <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Received
                    </span>
                    <span className="notif-detail-info-val">
                      {formatFullDate(selectedNotif.createdAt)}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                      ({timeAgo(selectedNotif.createdAt)})
                    </span>
                  </div>

                  <div className="notif-detail-info-card">
                    <span className="notif-detail-info-label">
                      <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> Status
                    </span>
                    <span className="notif-detail-info-val" style={{ color: selectedNotif.isRead ? '#10b981' : '#818cf8' }}>
                      {selectedNotif.isRead ? '🟢 Read' : '🔵 Unread'}
                    </span>
                  </div>
                </div>

                {/* Related Resource Quick Jump */}
                {cat.targetUrl && (
                  <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#818cf8' }}>
                        Related CRM Resource
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary, #f8fafc)', fontWeight: 700, marginTop: '0.15rem' }}>
                        {cat.targetLabel}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNavigateToTarget(cat.targetUrl)}
                      style={{
                        padding: '0.5rem 0.9rem',
                        borderRadius: '8px',
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Open <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="notif-detail-footer">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedNotif.isRead ? (
                    <button
                      type="button"
                      onClick={() => markUnread(selectedNotif.notificationId)}
                      style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary, #94a3b8)',
                        border: '1px solid var(--border-color, #334155)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Mark as Unread
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(selectedNotif.notificationId)}
                      style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Mark as Read
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteNotif(selectedNotif.notificationId)}
                    style={{
                      padding: '0.45rem 0.8rem',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNotif(null)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '6px',
                    background: 'var(--bg-tertiary, #334155)',
                    color: 'var(--text-primary, #f8fafc)',
                    border: '1px solid var(--border-color, #334155)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
