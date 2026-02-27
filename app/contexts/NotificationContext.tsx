'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
    useNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead as markAllRead,
} from '@/lib/hooks';
import type { Notification } from '@/lib/types';
import { useAuth } from './AuthContext';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => void;
    pushPermission: NotificationPermission | 'default';
    requestPushPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    markAsRead: async () => { },
    markAllAsRead: async () => { },
    refresh: () => { },
    pushPermission: 'default',
    requestPushPermission: async () => { },
});

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const userId = user?.id ?? '';
    const { data: notifications, loading, setData, refetch } = useNotifications(userId);
    const [pushPermission, setPushPermission] = useState<NotificationPermission | 'default'>('default');
    const hasRequestedPermission = useRef(false);

    // Check push permission on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPushPermission(window.Notification.permission);
        }
    }, []);

    // Request push permission (only once, friendly)
    useEffect(() => {
        if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            window.Notification.permission === 'default' &&
            !hasRequestedPermission.current &&
            userId // Only request if authenticated
        ) {
            hasRequestedPermission.current = true;
            const timer = setTimeout(() => {
                if (window.Notification.permission === 'default') {
                    window.Notification.requestPermission().then(perm => {
                        setPushPermission(perm);
                    });
                }
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [userId]);

    const requestPushPermission = useCallback(async () => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const perm = await window.Notification.requestPermission();
            setPushPermission(perm);
        }
    }, []);

    // Subscribe to Supabase Realtime for new notifications
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificacoes',
                    filter: `usuario_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setData((prev: Notification[]) => [newNotif, ...prev]);

                    // Trigger browser push notification
                    if (
                        typeof window !== 'undefined' &&
                        'Notification' in window &&
                        window.Notification.permission === 'granted'
                    ) {
                        try {
                            const n = new window.Notification(newNotif.titulo, {
                                body: newNotif.mensagem,
                                icon: '/favicon.ico',
                                tag: newNotif.id,
                            });
                            n.onclick = () => {
                                window.focus();
                                if (newNotif.redirecionamento) {
                                    window.location.href = newNotif.redirecionamento;
                                }
                                n.close();
                            };
                        } catch {
                            // Safari may not support this
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, setData]);

    const unreadCount = notifications.filter(n => !n.lida).length;

    const markAsRead = useCallback(async (id: string) => {
        try {
            const updated = await markNotificationAsRead(id);
            setData((prev: Notification[]) => prev.map(n => n.id === id ? updated : n));
        } catch (e) {
            console.error('Error marking notification as read:', e);
        }
    }, [setData]);

    const markAllAsRead = useCallback(async () => {
        if (!userId) return;
        try {
            await markAllRead(userId);
            setData((prev: Notification[]) => prev.map(n => ({
                ...n,
                lida: true,
                lida_em: n.lida_em || new Date().toISOString()
            })));
        } catch (e) {
            console.error('Error marking all as read:', e);
        }
    }, [userId, setData]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                markAsRead,
                markAllAsRead,
                refresh: refetch,
                pushPermission,
                requestPushPermission,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationContext() {
    return useContext(NotificationContext);
}
