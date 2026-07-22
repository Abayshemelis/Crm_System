import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

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
  const ms = Date.now() - new Date(iso).getTime();
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
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Poll unread count every 60 seconds
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get<{ unreadCount: number }>('/api/notifications/count');
      setCount(res.unreadCount);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [fetchCount]);

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
      setCount(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all', {});
      setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
      setCount(0);
    } catch { /* ignore */ }
  };

  const handleNotifClick = async (n: NotificationDto) => {
    if (!n.isRead) await markRead(n.notificationId);
    setOpen(false);
    if (n.relatedTaskId) navigate('/tasks');
    else if (n.relatedOpportunityId) navigate(`/opportunities/${n.relatedOpportunityId}`);
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
