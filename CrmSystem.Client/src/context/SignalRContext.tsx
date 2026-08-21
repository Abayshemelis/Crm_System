import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { showToast } from '../lib/toast';
import { playNotificationSound } from '../lib/sound';

// ── 1. CONTEXT TYPE INTERFACE ─────────────────────────────────────────────────
// Exposes the real-time connection state and live unread notification counter
// to all components in the React application tree.
interface SignalRContextType {
    connected: boolean;                                             // True when WebSocket is actively connected
    unreadCount: number;                                            // Number of unread notifications for badge
    setUnreadCount: React.Dispatch<React.SetStateAction<number>>; // Allows components (e.g. Bell) to update count
}

const SignalRContext = createContext<SignalRContextType>({
    connected: false,
    unreadCount: 0,
    setUnreadCount: () => {},
});

// ── 2. REAL-TIME SIGNALR PROVIDER ─────────────────────────────────────────────
// Manages the persistent WebSocket lifecycle between the frontend and ASP.NET Core backend.
export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, user } = useAuth();
    const [connected, setConnected] = useState<boolean>(false);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    const userId = user?.userId;

    useEffect(() => {
        // Step A: When the user logs out, gracefully shut down the WebSocket connection
        if (!token || !userId) {
            setConnected(false);
            if (connectionRef.current) {
                const conn = connectionRef.current;
                connectionRef.current = null;
                if (conn.state === signalR.HubConnectionState.Connected) {
                    conn.stop().catch(() => {});
                }
            }
            return;
        }

        // Step B: Prevent duplicate connections if already connecting or connected
        if (connectionRef.current && connectionRef.current.state !== signalR.HubConnectionState.Disconnected) {
            return;
        }

        // Step C: Build the SignalR Hub connection with JWT token factory & auto-reconnect policy
        const apiHost = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:5072';
        const hubUrl = `${apiHost}/hubs/notifications`;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                // Pass JWT access token in WebSocket handshake query string / authorization header
                accessTokenFactory: () => token,
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
            })
            // Automatic retry intervals: immediate, 2s, 5s, 10s, 30s
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.None)
            .build();

        connectionRef.current = connection;

        // ── Step D: REGISTER REAL-TIME EVENT LISTENERS ─────────────────────────

        // 1. Generic Notification (Tasks due today, overdue tasks, stalled deals)
        connection.on('ReceiveNotification', (data: { title?: string; message: string; type?: string }) => {
            setUnreadCount(prev => prev + 1);
            playNotificationSound(data.type === 'warning' ? 'alert' : 'default'); // Play synthesized chime
            showToast(data.message || data.title || 'New Notification Received', 'info');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        // 2. Contract Signed Event (Live celebration notification & sound)
        connection.on('ContractSigned', (data: { contractId: number; title: string; clientName: string }) => {
            playNotificationSound('success'); // Play ascending happy chime
            showToast(`Contract "${data.title}" was signed by ${data.clientName}!`, 'success');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        // 3. Lead Assigned Event (Notifies sales rep when a manager assigns a lead)
        connection.on('LeadAssigned', (data: { leadId: number; leadName: string }) => {
            playNotificationSound('default');
            showToast(`New Lead assigned to you: ${data.leadName}`, 'info');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        // Connection status tracking
        connection.onreconnecting(() => setConnected(false));
        connection.onreconnected(() => setConnected(true));
        connection.onclose(() => setConnected(false));

        // Step E: Start WebSocket connection and fetch initial unread counter
        connection.start()
            .then(async () => {
                setConnected(true);
                try {
                    const res = await fetch('/api/notifications/count', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUnreadCount(data.unreadCount ?? 0);
                    }
                } catch { /* ignore */ }
            })
            .catch(() => {
                setConnected(false);
            });

    }, [token, userId]);

    return (
        <SignalRContext.Provider value={{ connected, unreadCount, setUnreadCount }}>
            {children}
        </SignalRContext.Provider>
    );
};

// Custom React hook to consume SignalR context anywhere
export const useSignalR = () => useContext(SignalRContext);
