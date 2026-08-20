import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { showToast } from '../lib/toast';
import { playNotificationSound } from '../lib/sound';

interface SignalRContextType {
    connected: boolean;
    unreadCount: number;
    setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const SignalRContext = createContext<SignalRContextType>({
    connected: false,
    unreadCount: 0,
    setUnreadCount: () => {},
});

export const SignalRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, user } = useAuth();
    const [connected, setConnected] = useState<boolean>(false);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    const userId = user?.userId;

    useEffect(() => {
        // If user logged out, stop active connection
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

        // If connection already exists and is connecting, connected, or reconnecting, preserve it!
        if (connectionRef.current && connectionRef.current.state !== signalR.HubConnectionState.Disconnected) {
            return;
        }

        const apiHost = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:5072';
        const hubUrl = `${apiHost}/hubs/notifications`;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token,
                skipNegotiation: false,
                transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.None)
            .build();

        connectionRef.current = connection;

        // Attach event handlers
        connection.on('ReceiveNotification', (data: { title?: string; message: string; type?: string }) => {
            setUnreadCount(prev => prev + 1);
            playNotificationSound(data.type === 'warning' ? 'alert' : 'default');
            showToast(data.message || data.title || 'New Notification Received', 'info');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        connection.on('ContractSigned', (data: { contractId: number; title: string; clientName: string }) => {
            playNotificationSound('success');
            showToast(`Contract "${data.title}" was signed by ${data.clientName}!`, 'success');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        connection.on('LeadAssigned', (data: { leadId: number; leadName: string }) => {
            playNotificationSound('default');
            showToast(`New Lead assigned to you: ${data.leadName}`, 'info');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        connection.onreconnecting(() => setConnected(false));
        connection.onreconnected(() => setConnected(true));
        connection.onclose(() => setConnected(false));

        // Start connection safely
        connection.start()
            .then(async () => {
                setConnected(true);
                // Fetch initial unread count so the badge is correct immediately on login
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

export const useSignalR = () => useContext(SignalRContext);
