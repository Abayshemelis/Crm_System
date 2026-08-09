import React, { createContext, useContext, useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { showToast } from '../lib/toast';

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

    useEffect(() => {
        if (!token || !user) {
            setConnected(false);
            return;
        }

        const hubUrl = '/hubs/notifications';
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token,
                skipNegotiation: false,
                transport: signalR.HttpTransportType.LongPolling
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        connection.start()
            .then(() => {
                setConnected(true);
                console.log('SignalR connected to /hubs/notifications');
            })
            .catch(err => {
                console.warn('SignalR connection failed (will auto-retry):', err);
                setConnected(false);
            });

        // Listen for live server notifications
        connection.on('ReceiveNotification', (data: { title?: string; message: string; type?: string }) => {
            setUnreadCount(prev => prev + 1);
            showToast(data.message || data.title || 'New Notification Received', 'info');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        connection.on('ContractSigned', (data: { contractId: number; title: string; clientName: string }) => {
            showToast(`Contract "${data.title}" was signed by ${data.clientName}!`, 'success');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        connection.on('LeadAssigned', (data: { leadId: number; leadName: string }) => {
            showToast(`New Lead assigned to you: ${data.leadName}`, 'info');
            window.dispatchEvent(new CustomEvent('app:notification', { detail: data }));
        });

        connection.onreconnecting(() => setConnected(false));
        connection.onreconnected(() => setConnected(true));

        return () => {
            connection.stop();
        };
    }, [token, user]);

    return (
        <SignalRContext.Provider value={{ connected, unreadCount, setUnreadCount }}>
            {children}
        </SignalRContext.Provider>
    );
};

export const useSignalR = () => useContext(SignalRContext);
