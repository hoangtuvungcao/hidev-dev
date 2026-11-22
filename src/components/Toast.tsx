'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';
import { AppIcon } from '@/components/ui/icon';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, message }]);

    // Start exit animation after 3s
    setTimeout(() => {
      setToasts(prev =>
        prev.map(t => (t.id === id ? { ...t, exiting: true } : t))
      );
    }, 3000);

    // Remove from DOM after exit animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3300);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
          >
            <div className="toast-icon">
              {toast.type === 'success' && <AppIcon name="Check" size="sm" stroke={2.5} />}
              {toast.type === 'error' && <AppIcon name="AlertCircle" size="sm" stroke={2.5} />}
              {toast.type === 'info' && <AppIcon name="Info" size="sm" stroke={2.5} />}
            </div>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-close"
              onClick={() => dismissToast(toast.id)}
            >
              <AppIcon name="X" size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
