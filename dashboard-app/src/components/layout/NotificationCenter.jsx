import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Volume2, VolumeX, X, Check, CheckCheck,
  Clock, Trash2, ShoppingBag, QrCode,
  Sparkles, HandPlatter
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useNotificationStore } from '../../store/notificationStore';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const secs = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getEventBadge(type) {
  switch (type) {
    case 'order_created':
      return {
        icon: ShoppingBag,
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'order_ready':
      return {
        icon: HandPlatter,
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'order_cancelled':
      return {
        icon: X,
        bg: 'bg-red-100 text-red-800 border-red-200',
        dot: 'bg-red-500',
      };
    case 'table_occupied':
      return {
        icon: QrCode,
        bg: 'bg-blue-100 text-blue-800 border-blue-200',
        dot: 'bg-blue-500',
      };
    case 'table_ready_to_clear':
      return {
        icon: Sparkles,
        bg: 'bg-teal-100 text-teal-800 border-teal-200',
        dot: 'bg-teal-500',
      };
    case 'assistance_bill':
      return {
        icon: Bell,
        bg: 'bg-rose-100 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'assistance_call':
    default:
      return {
        icon: Bell,
        bg: 'bg-rose-100 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
      };
  }
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const panelRef = useRef(null);

  const {
    notifications,
    isDrawerOpen,
    setDrawerOpen,
    toggleDrawer,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    soundEnabled,
    setSoundEnabled,
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'orders' | 'tables' | 'assistance'
  const [, setNow] = useState(Date.now());

  // Periodically refresh relative time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Fetch pending assistance requests from server
  const { data: assistanceData } = useQuery({
    queryKey: ['assistance'],
    queryFn: () => api.get('/assistance').then((r) => r.data),
    refetchInterval: 15_000,
  });

  const activeAssistance = useMemo(() => {
    return (assistanceData?.assistance ?? []).filter(
      (a) => a.status === 'pending' || a.status === 'acknowledged'
    );
  }, [assistanceData]);

  // Assistance mutation
  const assistanceMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/assistance/${id}/${status === 'acknowledged' ? 'acknowledge' : 'resolve'}`).then((r) => r.data),
    onSuccess: ({ assistance }) => {
      qc.setQueryData(['assistance'], (old) => ({
        ...old,
        assistance: (old?.assistance ?? []).map((item) =>
          item._id === assistance._id ? assistance : item
        ),
      }));
      toast.success(assistance.status === 'acknowledged' ? 'Request acknowledged' : 'Request resolved');
    },
    onError: () => toast.error('Failed to update request'),
  });

  // Calculate total unread (notifications + active assistance count)
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const totalBadgeCount = unreadNotificationsCount + activeAssistance.length;

  // Filter notifications based on tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, setDrawerOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isDrawerOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        // Prevent closing if clicked on a trigger button
        if (!e.target.closest('[data-notification-trigger]')) {
          setDrawerOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDrawerOpen, setDrawerOpen]);

  return (
    <>
      {/* ── Trigger Controls: Sound Toggle + Bell Icon ──────────────────── */}
      <div className="flex items-center gap-1.5">
        {/* Quick Sound Mute/Unmute */}
        <button
          type="button"
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            toast(next ? 'Sound alerts enabled' : 'Sound alerts muted', {
              icon: next ? '🔊' : '🔇',
              duration: 2000,
            });
          }}
          className={`p-2 rounded-xl border transition-all text-xs flex items-center justify-center ${
            soundEnabled
              ? 'bg-white/90 border-ink/10 text-teal hover:text-teal-dark shadow-2xs'
              : 'bg-ink/5 border-transparent text-ink-muted hover:text-ink'
          }`}
          title={soundEnabled ? 'Sound alerts enabled (Click to mute)' : 'Sound alerts muted (Click to unmute)'}
          aria-label={soundEnabled ? 'Mute sound alerts' : 'Unmute sound alerts'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Bell Button */}
        <button
          type="button"
          data-notification-trigger="true"
          onClick={toggleDrawer}
          className={`relative p-2 rounded-xl border transition-all flex items-center justify-center ${
            isDrawerOpen
              ? 'bg-teal text-white border-teal shadow-xs'
              : 'bg-white/90 border-ink/10 text-ink-muted hover:text-ink hover:border-teal shadow-2xs'
          }`}
          aria-label={`Notification center${totalBadgeCount > 0 ? ` (${totalBadgeCount} unread)` : ''}`}
        >
          <Bell size={16} />
          {totalBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-xs animate-pulse">
              {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Slide-Over Notification Drawer ──────────────────────────────── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ink/30 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              ref={panelRef}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-ink/10 animate-slide-left"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-ink/8 flex items-center justify-between bg-paper/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base text-ink">Notifications</h2>
                    <p className="text-xs text-ink-muted">
                      {totalBadgeCount === 0
                        ? 'All caught up'
                        : `${totalBadgeCount} pending alert${totalBadgeCount === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllAsRead()}
                      className="px-2.5 py-1 text-xs text-teal font-medium hover:bg-teal/10 rounded-lg transition-colors flex items-center gap-1"
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} />
                      <span className="hidden sm:inline">Mark read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
                    aria-label="Close notifications"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Active Assistance Alert Banner (Always pinned if any are active) */}
              {activeAssistance.length > 0 && (
                <div className="bg-rose-50 border-b border-rose-200/80 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      Live Table Calls ({activeAssistance.length})
                    </span>
                    <button
                      onClick={() => navigate('/tables')}
                      className="text-[11px] text-rose-700 font-semibold hover:underline"
                    >
                      View on Tables →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeAssistance.map((req) => (
                      <div
                        key={req._id}
                        className="bg-white rounded-lg p-2.5 border border-rose-200/60 shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-display font-bold text-xs text-ink truncate">
                            {req.tableId?.label ?? 'Table'} •{' '}
                            {req.type === 'call_staff' ? 'Staff Called' : 'Bill Requested'}
                          </p>
                          <p className="text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
                            <Clock size={10} /> {timeAgo(req.createdAt)}
                            {req.message && ` — "${req.message}"`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {req.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => assistanceMutation.mutate({ id: req._id, status: 'acknowledged' })}
                              className="px-2 py-1 text-[11px] font-semibold text-teal bg-teal/10 hover:bg-teal/20 rounded-md transition-colors"
                            >
                              Ack
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => assistanceMutation.mutate({ id: req._id, status: 'resolved' })}
                            className="px-2 py-1 text-[11px] font-semibold text-ink-muted hover:text-ink bg-ink/5 rounded-md transition-colors flex items-center gap-0.5"
                          >
                            <Check size={11} /> Done
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="px-4 py-2 border-b border-ink/8 flex items-center gap-1.5 overflow-x-auto bg-white shrink-0">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'orders', label: 'Orders' },
                  { id: 'tables', label: 'Tables' },
                  { id: 'assistance', label: 'Assistance' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-ink text-white font-semibold shadow-2xs'
                        : 'text-ink-muted hover:text-ink hover:bg-ink/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto divide-y divide-ink/6">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                    <div className="w-12 h-12 rounded-full bg-ink/5 flex items-center justify-center text-ink-muted mb-3">
                      <Bell size={22} className="opacity-40" />
                    </div>
                    <p className="font-display font-semibold text-sm text-ink">No notifications yet</p>
                    <p className="text-xs text-ink-muted mt-1 max-w-xs">
                      Live events from customer orders, table check-ins, and assistance calls will appear here.
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    const badge = getEventBadge(notif.type);
                    const Icon = badge.icon;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.read) markAsRead(notif.id);
                        }}
                        className={`p-4 transition-colors relative group hover:bg-paper/60 ${
                          notif.read ? 'bg-white opacity-85' : 'bg-teal/2'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Event Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${badge.bg}`}>
                            <Icon size={16} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`font-display text-xs truncate ${notif.read ? 'font-medium text-ink' : 'font-bold text-ink'}`}>
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-ink-muted shrink-0 flex items-center gap-1">
                                <Clock size={9} />
                                {timeAgo(notif.timestamp)}
                              </span>
                            </div>

                            {notif.message && (
                              <p className="text-xs text-ink-muted mt-1 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                            )}

                            {/* Action Row */}
                            <div className="flex items-center justify-between mt-2.5 pt-1">
                              {notif.category === 'orders' ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif.id);
                                    setDrawerOpen(false);
                                    navigate('/orders');
                                  }}
                                  className="text-xs font-semibold text-teal hover:underline flex items-center gap-1"
                                >
                                  Go to Orders →
                                </button>
                              ) : notif.category === 'tables' || notif.category === 'assistance' ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif.id);
                                    setDrawerOpen(false);
                                    navigate('/tables');
                                  }}
                                  className="text-xs font-semibold text-teal hover:underline flex items-center gap-1"
                                >
                                  Go to Tables →
                                </button>
                              ) : <span />}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissNotification(notif.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-ink-muted hover:text-danger transition-all rounded"
                                title="Dismiss"
                                aria-label="Dismiss notification"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Unread indicator dot */}
                        {!notif.read && (
                          <span className="absolute top-4 right-2 w-1.5 h-1.5 rounded-full bg-teal" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-3.5 border-t border-ink/8 bg-paper/60 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => clearAll()}
                  disabled={notifications.length === 0}
                  className="text-xs text-ink-muted hover:text-danger disabled:opacity-40 transition-colors flex items-center gap-1.5 px-2 py-1"
                >
                  <Trash2 size={13} />
                  Clear all history
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate('/settings');
                  }}
                  className="text-xs font-medium text-teal hover:underline"
                >
                  Notification Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
