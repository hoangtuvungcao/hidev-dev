'use client';

import React from 'react';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { AppIcon } from '@/components/ui/icon';

export function NotificationToast({ isInline = false }: { isInline?: boolean }) {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = React.useState(false);

  // Show only recent unread notifications
  const recentNotifications = notifications.slice(0, 5);

  const containerStyle = isInline
    ? { position: 'relative' as const }
    : { position: 'fixed' as const, top: '20px', right: '20px', zIndex: 9999 };

  const buttonStyle = isInline
    ? {
        position: 'relative' as const,
        background: 'none',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'var(--transition)',
        color: 'var(--text-secondary)',
      }
    : {
        position: 'relative' as const,
        background: 'var(--background)',
        border: '1px solid var(--border)',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'var(--transition)',
      };

  const badgeStyle = isInline
    ? {
        position: 'absolute' as const,
        top: '2px',
        right: '2px',
        background: 'var(--destructive)',
        color: 'white',
        borderRadius: '50%',
        width: '16px',
        height: '16px',
        fontSize: '9px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
      }
    : {
        position: 'absolute' as const,
        top: '-4px',
        right: '-4px',
        background: 'var(--destructive)',
        color: 'white',
        borderRadius: '50%',
        width: '20px',
        height: '20px',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
      };

  return (
    <div className="notification-container" style={containerStyle}>
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(console.error);
          }
        }}
        style={buttonStyle}
        className={isInline ? 'notification-bell-btn' : ''}
        title={isConnected ? 'Notifications' : 'Connecting...'}
      >
        <AppIcon name="Bell" size={isInline ? 20 : 24} />
        {unreadCount > 0 && (
          <span style={badgeStyle}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          className="notification-dropdown"
          style={{
            position: 'absolute',
            top: isInline ? '44px' : '60px',
            right: '0',
            width: '350px',
            maxHeight: '500px',
            background: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {recentNotifications.length === 0 ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                No notifications yet
              </div>
            ) : (
              recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <AppIcon name="X" size={16} className="text-muted" />
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}) {
  const getIcon = () => {
    switch (notification.type) {
      case 'comment':
        return <AppIcon name="MessageSquare" size={18} />;
      case 'reply':
        return <AppIcon name="CornerUpLeft" size={18} />;
      case 'post_approved':
        return <AppIcon name="Check" size={18} />;
      case 'post_rejected':
        return <AppIcon name="X" size={18} />;
      default:
        return <AppIcon name="Bell" size={18} />;
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        borderBottom: '1px solid var(--border)',
        background: notification.is_read ? 'transparent' : 'var(--accent)',
        cursor: notification.link ? 'pointer' : 'default',
        transition: 'background 0.2s',
      }}
      onClick={async () => {
        if (!notification.is_read) {
          await onMarkAsRead(notification.id);
        }
        if (notification.link) {
          window.location.href = notification.link;
        }
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div
          style={{
            flexShrink: 0,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          {getIcon()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '4px',
            }}
          >
            {notification.title}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {notification.message}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            {new Date(notification.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
