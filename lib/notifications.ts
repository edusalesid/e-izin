/**
 * PWA & Web Notification Helper for E-Izin Santri SMAIT Ihsanul Fikri
 * Handles browser and PWA service worker push/local notifications
 * & bridges all in-app toasts to native device notifications.
 */

import { toast } from 'sonner';

export type NotificationPermissionStatus = NotificationPermission | 'unsupported';

export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
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

/**
 * Mendapatkan ServiceWorkerRegistration aktif tanpa risiko hanging/freeze.
 * Menggunakan timeout race agar tidak macet jika Service Worker belum siap.
 */
async function getActiveServiceWorker(timeoutMs = 1500): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    // 1. Cek pendaftaran yang sudah ada langsung
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing && existing.active) {
      return existing;
    }

    // 2. Race navigator.serviceWorker.ready dengan timeout agar tidak deadlock
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), timeoutMs)
    );

    const result = await Promise.race([readyPromise, timeoutPromise]);
    return result;
  } catch {
    return null;
  }
}

// Cache deduplikasi agar tidak memunculkan notifikasi ganda dalam rentang 2.5 detik
const recentNotifications = new Map<string, number>();

function isDuplicate(key: string): boolean {
  const now = Date.now();
  const lastTime = recentNotifications.get(key);

  // Bersihkan cache lama jika sudah menumpuk
  if (recentNotifications.size > 50) {
    for (const [k, time] of recentNotifications.entries()) {
      if (now - time > 10000) recentNotifications.delete(k);
    }
  }

  if (lastTime && now - lastTime < 2500) {
    return true;
  }

  recentNotifications.set(key, now);
  return false;
}

export async function sendPwaNotification(
  title: string,
  options?: NotificationOptions & { url?: string; silentDuplicateCheck?: boolean }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // Cek deduplikasi
  const dedupKey = `${title}|${options?.body || ''}`;
  if (!options?.silentDuplicateCheck && isDuplicate(dedupKey)) {
    return true;
  }

  // Cek izin notifikasi
  if (Notification.permission !== 'granted') {
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
    // Prioritas 1: Service Worker showNotification (standar PWA & Mobile Android/Installed)
    const swReg = await getActiveServiceWorker(1200);
    if (swReg && typeof swReg.showNotification === 'function') {
      await swReg.showNotification(title, defaultOptions);
      return true;
    }

    // Prioritas 2: Standar Web Notification (Desktop & Browser biasa)
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

/**
 * Global Bridge: Otomatis menghubungkan seluruh toast (Sonner)
 * ke Web / PWA Notification jika permission sudah granted.
 */
let isBridgeInitialized = false;

export function initToastPwaBridge() {
  if (typeof window === 'undefined' || isBridgeInitialized) return;
  isBridgeInitialized = true;

  const originalToast = toast;
  const methods: Array<'success' | 'error' | 'info' | 'warning' | 'message'> = [
    'success',
    'error',
    'info',
    'warning',
    'message',
  ];

  methods.forEach((method) => {
    const originalMethod = originalToast[method];
    if (typeof originalMethod === 'function') {
      (originalToast as any)[method] = function (message: any, data?: any) {
        // Panggil toast UI asli Sonner di layar
        const result = originalMethod(message, data);

        // Teruskan ke Web / PWA Notification jika tidak sengaja di-disable
        try {
          if (data?.native !== false && data?.pwa !== false) {
            const title = typeof message === 'string' ? message : String(message || 'E-Izin Santri');
            const body = typeof data?.description === 'string' ? data.description : undefined;

            sendPwaNotification(title, {
              body,
              silentDuplicateCheck: false,
              url: data?.url || '/',
            }).catch(() => {});
          }
        } catch {}

        return result;
      };
    }
  });
}
