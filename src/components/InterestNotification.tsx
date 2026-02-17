'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, X, Bell, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'interest' | 'milestone' | 'achievement';
  title: string;
  message: string;
  emoji: string;
  amountCents?: number;
  childName?: string;
  createdAt: string;
}

interface InterestToastProps {
  notification: Notification;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function InterestToast({ notification, onDismiss, autoDismissMs = 5000 }: InterestToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [onDismiss, autoDismissMs]);

  const bgColor = notification.type === 'interest' 
    ? 'bg-gradient-to-r from-[#27AE60] to-[#2ECC71]'
    : notification.type === 'milestone'
    ? 'bg-gradient-to-r from-[#F39C12] to-[#F1C40F]'
    : 'bg-gradient-to-r from-[#9B59B6] to-[#8E44AD]';

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`${bgColor} text-white rounded-2xl shadow-lg p-4 max-w-sm mx-auto`}
    >
      <div className="flex items-start gap-3">
        <motion.span 
          className="text-2xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: 3, duration: 0.5 }}
        >
          {notification.emoji}
        </motion.span>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm">{notification.title}</h4>
          <p className="text-sm opacity-90">{notification.message}</p>
          {notification.amountCents && (
            <motion.p 
              className="text-lg font-mono font-bold mt-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              +{formatMoney(notification.amountCents)}
            </motion.p>
          )}
        </div>
        <button 
          onClick={onDismiss}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

interface NotificationBannerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export function NotificationBanner({ notifications, onDismiss, onDismissAll }: NotificationBannerProps) {
  if (notifications.length === 0) return null;

  const interestTotal = notifications
    .filter(n => n.type === 'interest')
    .reduce((sum, n) => sum + (n.amountCents || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gradient-to-r from-[#27AE60] to-[#2ECC71] text-white"
    >
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
            <div>
              <span className="font-medium">
                {notifications.length === 1 
                  ? notifications[0].message 
                  : `${notifications.length} new notifications!`}
              </span>
              {interestTotal > 0 && notifications.length > 1 && (
                <span className="ml-2 font-mono font-bold">
                  Total: +{formatMoney(interestTotal)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onDismissAll}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[#ECF0F1] rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5 text-[#7F8C8D]" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-[#E74C3C] text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#ECF0F1] z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-[#ECF0F1] flex items-center justify-between">
                <h3 className="font-bold text-[#2C3E50]">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-[#3498DB] hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[#7F8C8D]">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-4 border-b border-[#ECF0F1] last:border-0 hover:bg-[#F8FAFE] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{notification.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[#2C3E50]">
                            {notification.title}
                          </p>
                          <p className="text-sm text-[#7F8C8D]">
                            {notification.message}
                          </p>
                          {notification.amountCents && (
                            <p className="text-sm font-mono font-bold text-[#27AE60] mt-1">
                              +{formatMoney(notification.amountCents)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 hover:bg-[#ECF0F1] rounded-lg"
                        >
                          <X className="w-4 h-4 text-[#BDC3C7]" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook for showing toast notifications
export function useNotificationToast() {
  const [toasts, setToasts] = useState<Notification[]>([]);

  const showToast = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newToast: Notification = {
      ...notification,
      id: Math.random().toString(36).slice(2),
      createdAt: new Date().toISOString(),
    };
    setToasts(prev => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <InterestToast
            key={toast.id}
            notification={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );

  return { showToast, ToastContainer };
}
