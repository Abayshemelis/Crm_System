import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useSignalR } from '../../context/SignalRContext';
import { playNotificationSound, isSoundEnabled, setSoundEnabled } from '../../lib/sound';

interface NotificationDto {
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

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
      setNotifications(ns => ns.map(n => n.notificationId === id ? { ...n, isRead: true } : n));
      const newCount = Math.max(0, count - 1);
      setCount(newCount);
      setUnreadCount(newCount);
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
    setOpen(false);
    const msg = n.message.toLowerCase();
    const type = (n.typeName || '').toLowerCase();
    if (msg.includes('contract')) navigate('/contracts');
    else if (msg.includes('invoice') || msg.includes('payment')) navigate('/invoices');
    else if (type.includes('followup') || type.includes('follow-up') || msg.includes('follow-up') || msg.includes('lead')) navigate('/leads');
    else if (n.relatedTaskId || msg.includes('task')) navigate('/tasks');
    else if (n.relatedOpportunityId || msg.includes('opportunity') || msg.includes('deal')) {
      if (n.relatedOpportunityId) navigate(`/opportunities/${n.relatedOpportunityId}`);
      else navigate('/opportunities');
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={panelRef}>
      <button type="button" className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        <Bell size={18} />
        {count > 0 && <span className="notif-badge">{count > 99 ? '99+' : count}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
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
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button type="button" className="icon-btn" onClick={() => setOpen(false)}><X size={14} /></button>
            </div>
          </div>

          <div className="notif-panel-body">
            {loading && <div className="notif-loading">Loading…</div>}
            {!loading && notifications.length === 0 && (
              <div className="notif-empty">You're all caught up 🎉</div>
            )}
            {!loading && notifications.map(n => (
              <div
                key={n.notificationId}
                className={`notif-row ${n.isRead ? 'notif-row-read' : 'notif-row-unread'}`}
                onClick={() => handleNotifClick(n)}
              >
                <div className="notif-row-body">
                  <span className="notif-type-badge">{n.typeName}</span>
                  <p className="notif-message">{n.message}</p>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </div>
                {(n.relatedTaskId || n.relatedOpportunityId) && (
                  <ExternalLink size={12} className="notif-link-icon" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
