'use client';

import { useState, useEffect } from 'react';

export interface Notification {
  id: number;
  type: 'comment' | 'reply' | 'post_approved' | 'post_rejected' | 'mention' | 'vote';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isMounted = true;

    const initAndConnect = async () => {
      try {
        // 1. Fetch initial notifications
        const res = await fetch('/api/notifications');
        if (!res.ok) {
          throw new Error('Failed to fetch notifications');
        }
        
        const initialNotifications = await res.json() as Notification[];
        
        if (!isMounted) return;

        setNotifications(initialNotifications);
        setUnreadCount(initialNotifications.filter(n => !n.is_read).length);

        // 2. Get max ID to prevent streaming duplicates
        const latestId = initialNotifications.length > 0
          ? Math.max(...initialNotifications.map(n => n.id))
          : 0;

        // 3. Connect to SSE stream
        eventSource = new EventSource(`/api/notifications/stream?lastId=${latestId}`);

        eventSource.onopen = () => {
          if (isMounted) setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data) as Notification[];
            if (Array.isArray(data) && data.length > 0 && isMounted) {
              // Prepend new incoming notifications
              setNotifications(prev => [...data, ...prev]);
              
              // Increment unread count by new unread notifications only
              const newUnread = data.filter(n => !n.is_read).length;
              setUnreadCount(prev => prev + newUnread);
              
              // Show browser notification if permission granted
              if ('Notification' in window && Notification.permission === 'granted') {
                data.forEach(notification => {
                  new Notification(notification.title, {
                    body: notification.message,
                    icon: '/icon.png',
                  });
                });
              }
            }
          } catch (error) {
            console.error('Error parsing notification data:', error);
          }
        };

        eventSource.onerror = () => {
          // EventSource reconnects automatically using the server's `retry`
          // interval — don't open a second connection here, just reflect state.
          if (isMounted) setIsConnected(false);
        };
      } catch (err) {
        console.error('Error in notifications setup:', err);
        // Retry connection in 5 seconds on load failure
        setTimeout(() => {
          if (isMounted) initAndConnect();
        }, 5000);
      }
    };

    const handleBeforeUnload = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    initAndConnect();

    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, []);

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  };
}
