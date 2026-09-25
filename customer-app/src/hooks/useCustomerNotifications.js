import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import socket from '../lib/socket';
import { useSessionStore } from '../store/sessionStore';
import { useCustomerNotificationStore } from '../store/customerNotificationStore';
import {
  initCustomerAudioUnlock,
  playOrderAccepted,
  playOrderPreparing,
  playFoodReady,
  playOrderServed,
  playWaiterComing,
  playPaymentReceived,
  playOrderCancelled,
} from '../lib/customerSoundEffects';

export function useCustomerNotifications() {
  const qc = useQueryClient();
  const { table, sessionToken, sessionId, orderHistory, restaurant } = useSessionStore();
  const {
    soundEnabled,
    soundVolume,
    triggerAlert,
    setAssistanceState,
  } = useCustomerNotificationStore();

  const prevOrderStatusRef = useRef({});
  const prevPaymentStatusRef = useRef({});
  const prevAssistanceStatusRef = useRef(null);

  // Initialize one-time audio unlock on first user gesture
  useEffect(() => {
    initCustomerAudioUnlock();
  }, []);

  // Background Panel Notification dispatcher (SMS-like alerts on mobile notification shade & desktop)
  const sendBackgroundNotification = (title, body, orderId = null) => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    // Only dispatch background system alert if user is away from the page or screen is off/locked
    if (document.visibilityState !== 'hidden') {
      return;
    }

    const targetUrl = orderId ? `/order/${orderId}` : '/orders';
    const venueName = restaurant?.name || 'LayoScan';
    const tableLabel = table?.label ? ` · Table ${table.label}` : '';

    // SMS-style presentation: Sender heading + concise body message
    const smsTitle = `💬 ${venueName}${tableLabel}`;
    const smsBody = `${title}\n${body}`;

    const notificationOptions = {
      body: smsBody,
      icon: restaurant?.logoUrl || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: orderId ? `layoscan-order-${orderId}` : 'layoscan-order-status',
      renotify: true,
      requireInteraction: true, // Keep notification pinned on panel until dismissed or opened
      vibrate: [300, 100, 300, 100, 300], // SMS vibration cadence
      data: {
        url: targetUrl,
        orderId,
        timestamp: Date.now(),
      },
    };

    // Prefer Service Worker registration (delivers reliably on mobile notification panel / lock screen)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          return reg.showNotification(smsTitle, notificationOptions);
        })
        .catch((err) => {
          console.debug('[Push] SW showNotification failed, trying fallback:', err);
          tryWindowNotification(smsTitle, notificationOptions, targetUrl);
        });
    } else {
      tryWindowNotification(smsTitle, notificationOptions, targetUrl);
    }
  };

  const tryWindowNotification = (title, options, targetUrl) => {
    try {
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        if (targetUrl) window.location.pathname = targetUrl;
        n.close();
      };
    } catch (err) {
      console.debug('[Push] Fallback Notification failed:', err);
    }
  };

  useEffect(() => {
    if (!sessionToken || !table?._id) return;

    // Connect socket globally across all customer pages
    socket.connect();

    const joinRooms = () => {
      // Join table room for table-level updates and assistance feedback
      socket.emit('join:table', {
        tableId: table._id,
        sessionToken,
      });

      // Join individual order rooms for all past and active rounds
      if (Array.isArray(orderHistory)) {
        orderHistory.forEach((oid) => {
          if (oid && /^[a-f\d]{24}$/i.test(oid)) {
            socket.emit('join:order', {
              orderId: oid,
              sessionToken,
            });
          }
        });
      }
    };

    joinRooms();

    // ── Handle Order Status & Payment Updates ────────────────────────────────
    const onOrderUpdated = (order) => {
      if (!order || !order._id) return;

      // Invalidate multi-round query cache
      qc.invalidateQueries({ queryKey: ['table-orders', sessionToken, sessionId] });

      const prevStatus = prevOrderStatusRef.current[order._id];
      const prevPayment = prevPaymentStatusRef.current[order._id];
      const newStatus = order.status;
      const newPayment = order.paymentStatus;

      // Record new states
      prevOrderStatusRef.current[order._id] = newStatus;
      prevPaymentStatusRef.current[order._id] = newPayment;

      // Skip initial load notification if we didn't have a previous status
      if (!prevStatus) return;

      // Determine round index
      const roundIdx = Array.isArray(orderHistory)
        ? orderHistory.indexOf(order._id) + 1
        : null;
      const roundLabel = roundIdx && roundIdx > 0 ? `Round ${roundIdx}` : 'Your order';

      // Status change handlers
      if (newStatus !== prevStatus) {
        switch (newStatus) {
          case 'accepted': {
            if (soundEnabled) playOrderAccepted(soundVolume);
            const title = `${roundLabel} Accepted!`;
            const message = 'The kitchen has confirmed your order.';
            triggerAlert({
              type: 'order_accepted',
              title,
              message,
              orderId: order._id,
              roundNumber: roundIdx,
              status: 'accepted',
              icon: 'chef',
            });
            sendBackgroundNotification(`🍳 ${title}`, message, order._id);
            break;
          }

          case 'preparing': {
            if (soundEnabled) playOrderPreparing(soundVolume);
            const title = `${roundLabel} in the Kitchen`;
            const message = 'The chef is currently preparing your dishes.';
            triggerAlert({
              type: 'order_preparing',
              title,
              message,
              orderId: order._id,
              roundNumber: roundIdx,
              status: 'preparing',
              icon: 'flame',
            });
            sendBackgroundNotification(`🔥 ${title}`, message, order._id);
            break;
          }

          case 'ready': {
            if (soundEnabled) playFoodReady(soundVolume);
            const title = `🍽️ ${roundLabel} is Ready!`;
            const message = 'Your food is ready and being brought to your table.';
            triggerAlert({
              type: 'food_ready',
              title,
              message,
              orderId: order._id,
              roundNumber: roundIdx,
              status: 'ready',
              icon: 'utensils',
            });
            sendBackgroundNotification(title, message, order._id);
            break;
          }

          case 'served': {
            if (soundEnabled) playOrderServed(soundVolume);
            const title = `${roundLabel} Served!`;
            const message = 'Enjoy your meal! Let us know if you need anything else.';
            triggerAlert({
              type: 'order_served',
              title,
              message,
              orderId: order._id,
              roundNumber: roundIdx,
              status: 'served',
              icon: 'check',
            });
            sendBackgroundNotification(`😋 ${title}`, message, order._id);
            break;
          }

          case 'cancelled': {
            if (soundEnabled) playOrderCancelled(soundVolume);
            const title = `${roundLabel} Notice`;
            const message = 'An order item was cancelled. Please check with staff.';
            triggerAlert({
              type: 'order_cancelled',
              title,
              message,
              orderId: order._id,
              roundNumber: roundIdx,
              status: 'cancelled',
              icon: 'alert',
            });
            sendBackgroundNotification(`⚠️ ${title}`, message, order._id);
            break;
          }

          default:
            break;
        }
      }

      // Payment status transition
      if (newPayment === 'paid' && prevPayment !== 'paid') {
        if (soundEnabled) playPaymentReceived(soundVolume);
        const title = 'Payment Received!';
        const message = 'Your bill has been settled. Thank you for dining with us!';
        triggerAlert({
          type: 'payment_received',
          title,
          message,
          orderId: order._id,
          roundNumber: roundIdx,
          status: 'paid',
          icon: 'receipt',
        });
        sendBackgroundNotification(`💳 ${title}`, message, order._id);
      }
    };

    // ── Handle Waiter Assistance Updates ─────────────────────────────────────
    const onAssistanceUpdated = (assistance) => {
      if (!assistance) return;
      const prevStatus = prevAssistanceStatusRef.current;
      prevAssistanceStatusRef.current = assistance.status;

      if (assistance.status === 'acknowledged' && prevStatus !== 'acknowledged') {
        if (soundEnabled) playWaiterComing(soundVolume);
        const title = 'Waiter is on the way!';
        const message = `A staff member acknowledged your call and is heading to ${table.label || 'your table'}.`;
        triggerAlert({
          type: 'waiter_coming',
          title,
          message,
          status: 'acknowledged',
          icon: 'bell',
        });
        setAssistanceState({
          active: true,
          type: assistance.type,
          status: 'acknowledged',
          timestamp: Date.now(),
        });
        sendBackgroundNotification(`🏃‍♂️ ${title}`, message, null);
      } else if (assistance.status === 'resolved') {
        setAssistanceState(null);
      }
    };

    socket.on('connect', joinRooms);
    socket.on('reconnect', joinRooms);
    socket.on('order:updated', onOrderUpdated);
    socket.on('assistance:updated', onAssistanceUpdated);

    return () => {
      socket.off('connect', joinRooms);
      socket.off('reconnect', joinRooms);
      socket.off('order:updated', onOrderUpdated);
      socket.off('assistance:updated', onAssistanceUpdated);
    };
  }, [
    sessionToken,
    table?._id,
    table?.label,
    sessionId,
    orderHistory,
    soundEnabled,
    soundVolume,
    triggerAlert,
    setAssistanceState,
    restaurant?.logoUrl,
    qc,
  ]);
}
