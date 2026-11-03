/**
 * PWA Notification Helper for E-Izin Santri
 * Handles browser and PWA service worker push/local notifications
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export async function sendPwaNotification(
  title: string,
  options?: NotificationOptions & { url?: string }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    // Optionally try asking permission if default
    if (Notification.permission === 'default') {
      const res = await requestNotificationPermission();
      if (res !== 'granted') return false;
    } else {
      return false;
    }
  }

  const defaultOptions: NotificationOptions & Record<string, any> = {
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    vibrate: [200, 100, 200],
    data: {
      url: options?.url || '/',
      timestamp: Date.now(),
    },
    ...options,
  };

  try {
    // Preferred in PWA / mobile: Service Worker Registration
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, defaultOptions);
        return true;
      }
    }

    // Fallback: Web standard notification
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn('Fallback standard notification due to:', err);
    try {
      new Notification(title, defaultOptions);
      return true;
    } catch {
      return false;
    }
  }
}
