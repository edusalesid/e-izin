/**
 * PWA & Web Notification Helper for E-Izin Santri SMAIT Ihsanul Fikri
 * Handles browser and PWA service worker push/local notifications
 * & bridges all in-app toasts to native device notifications.
 */

import { toast } from 'sonner';
import type { AuthSession, Permission, Student } from '@/lib/types';

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
    registerPushSubscription().catch(() => {});
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      registerPushSubscription().catch(() => {});
    }
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

// Cache deduplikasi agar tidak memunculkan notifikasi ganda
const recentNotifications = new Map<string, number>();
const handledLocalActions = new Set<string>();

export function markLocalPermissionAction(permissionId: string, status?: string) {
  if (!permissionId) return;
  handledLocalActions.add(`new:${permissionId}`);
  recentNotifications.set(`tag:perm-new-${permissionId}`, Date.now());
  if (status) {
    handledLocalActions.add(`status:${permissionId}:${status}`);
    recentNotifications.set(`tag:perm-status-${permissionId}-${status}`, Date.now());
  }
}

function isDuplicate(key: string, windowMs = 3500): boolean {
  const now = Date.now();
  const lastTime = recentNotifications.get(key);

  // Bersihkan cache lama jika sudah menumpuk
  if (recentNotifications.size > 100) {
    for (const [k, time] of recentNotifications.entries()) {
      if (now - time > 30000) recentNotifications.delete(k);
    }
  }

  if (lastTime && now - lastTime < windowMs) {
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

  // Cek deduplikasi berdasarkan tag (jika ada) maupun kombinasi title|body
  if (!options?.silentDuplicateCheck) {
    if (options?.tag && isDuplicate(`tag:${options.tag}`, 15000)) {
      return true;
    }
    const dedupKey = `${title}|${options?.body || ''}`;
    if (isDuplicate(dedupKey, 3500)) {
      return true;
    }
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

  // Catat tag dari Web Push Service Worker agar polling diff tidak memunculkan notifikasi ganda
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'REALTIME_DATA_UPDATE') {
        const pushTag = event.data?.payload?.tag || event.data?.payload?.data?.tag;
        if (pushTag) {
          recentNotifications.set(`tag:${pushTag}`, Date.now());
        }
      }
    });
  }
}


function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getSavedSessionInfo() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('e_izin_session_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        userId: parsed.user?.id || parsed.user?.username,
        role: parsed.role,
        studentNis: parsed.student?.nis,
      };
    }
  } catch {}
  return {};
}

export const DEFAULT_VAPID_PUBLIC_KEY =
  'BH9AbtWvfE6rMA1Y2_6hg-jcCcQcoof7ObZ0EbG3G5oNoea3H1G6MGn77hi_SFs1kfuBMx0X4eXQxn2-QemA2eo';

let lastSyncedSubscriptionKey = '';

/**
 * Mendaftarkan Web Push Subscription ke server backend
 */
export async function registerPushSubscription(userInfo?: {
  userId?: string;
  role?: string;
  studentNis?: string;
}): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return false;
  }

  if ('Notification' in window && Notification.permission !== 'granted') {
    return false;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;

  try {
    const reg = (await getActiveServiceWorker(2500)) || (await navigator.serviceWorker.ready);
    if (!reg) return false;

    const appServerKey = urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      } catch {
        // Jika gagal karena kunci VAPID lama berbeda, unsubscribe lalu subscribe ulang
        const stale = await reg.pushManager.getSubscription();
        if (stale) {
          await stale.unsubscribe().catch(() => {});
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      }
    }

    const rawSub = sub.toJSON();
    if (!rawSub.endpoint || !rawSub.keys?.p256dh || !rawSub.keys?.auth) {
      return false;
    }

    const effectiveUser = {
      ...getSavedSessionInfo(),
      ...userInfo,
    };

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: rawSub.endpoint,
        keys: rawSub.keys,
        userId: effectiveUser.userId || null,
        role: effectiveUser.role || null,
        studentNis: effectiveUser.studentNis || null,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'PWA Client',
      }),
    });

    if (res.ok) {
      lastSyncedSubscriptionKey = `${rawSub.endpoint}|${effectiveUser.userId || ''}|${effectiveUser.role || ''}|${effectiveUser.studentNis || ''}`;
    }

    return res.ok;
  } catch (err) {
    console.warn('Gagal mendaftarkan push notification subscription:', err);
    return false;
  }
}

/**
 * Memastikan subscription Web Push tersinkronisasi untuk sesi aktif (otomatis retry jika sempat gagal)
 */
export async function ensurePushSubscriptionSynced(userInfo?: {
  userId?: string;
  role?: string;
  studentNis?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const effectiveUser = {
    ...getSavedSessionInfo(),
    ...userInfo,
  };
  const targetSuffix = `|${effectiveUser.userId || ''}|${effectiveUser.role || ''}|${effectiveUser.studentNis || ''}`;
  if (lastSyncedSubscriptionKey && lastSyncedSubscriptionKey.endsWith(targetSuffix)) {
    return;
  }
  await registerPushSubscription(effectiveUser).catch(() => {});
}

/**
 * Deteksi perubahan data perizinan secara real-time (antara state lama vs baru)
 * dan picu notifikasi perangkat (PWA Notification + Toast) untuk akun/role yang berhak.
 */
export function checkAndTriggerPermissionNotifications(
  prevMap: Map<string, string> | null,
  incomingPermissions: Permission[],
  session: AuthSession | null,
  students: Student[]
): Map<string, string> {
  const nextMap = new Map<string, string>();
  for (const p of incomingPermissions) {
    nextMap.set(p.id, p.status);
  }

  // Jika belum login atau ini baru pemuatan pertama (initial load), cukup simpan snapshot awal
  if (!session || prevMap === null) {
    return nextMap;
  }

  const currentUserId = session.user?.id;
  const currentUsername = session.user?.username;

  for (const p of incomingPermissions) {
    const prevStatus = prevMap.get(p.id);

    // 1. IZIN BARU MASUK (!prevStatus)
    if (!prevStatus) {
      if (handledLocalActions.has(`new:${p.id}`)) continue;

      const isCreatedByMe = Boolean(
        (currentUserId && p.applicantId === currentUserId) ||
          (currentUsername && p.applicantId === currentUsername) ||
          (session.role === 'ORANG_TUA' &&
            p.applicantType === 'ORANG_TUA' &&
            (p.studentNis === session.student?.nis || p.studentId === session.student?.id))
      );

      if (isCreatedByMe) continue;

      let notifTitle = '';
      let notifBody = '';

      if (session.role === 'SUPER_ADMIN' || session.role === 'KEPALA_ASRAMA') {
        notifTitle = 'Pengajuan Izin Santri Baru 📝';
        notifBody = `${p.studentName} (${p.className}) mengajukan izin: ${p.reason}`;
      } else if (session.role === 'WALI_KELAS') {
        const isTargetApprover = Boolean(currentUserId && p.targetApproverId === currentUserId);
        const studentObj = students.find((s) => s.id === p.studentId || s.nis === p.studentNis);
        const isMyClass = Boolean(
          (session.user?.classroomId && studentObj?.classroomId === session.user.classroomId) ||
            (studentObj?.classroom?.waliKelasId && studentObj.classroom.waliKelasId === currentUserId) ||
            (!p.targetApproverId && !session.user?.classroomId)
        );

        if (isTargetApprover || isMyClass) {
          notifTitle = 'Pengajuan Izin Santri Baru 📝';
          notifBody = `${p.studentName} (${p.className}) mengajukan izin: ${p.reason}`;
        }
      } else if (
        session.role === 'SATPAM' &&
        (p.status === 'APPROVED_WALI_KELAS' || p.status === 'SEDANG_DI_LUAR')
      ) {
        notifTitle =
          p.category === 'PESIAR'
            ? 'Pesiar Santri: Siap Keluar Gerbang 🚪'
            : 'Izin Baru Siap Keluar 🚪';
        notifBody = `Santri ${p.studentName} (${p.className}) telah disetujui izin keluar pos gerbang.`;
      } else if (
        session.role === 'ORANG_TUA' &&
        (p.studentNis === session.student?.nis || p.studentId === session.student?.id)
      ) {
        notifTitle =
          p.status === 'APPROVED_WALI_KELAS'
            ? 'Izin Santri Disetujui Otomatis 🔔'
            : 'Pengajuan Izin Santri Baru 📝';
        notifBody = `Izin untuk ananda ${p.studentName} (${p.className}): ${p.reason}`;
      }

      if (notifTitle && notifBody) {
        const tag = `perm-new-${p.id}`;
        toast.info(notifTitle, {
          description: notifBody,
          pwa: false,
        } as any);
        sendPwaNotification(notifTitle, {
          body: notifBody,
          tag,
          url: '/',
        }).catch(() => {});
      }
      continue;
    }

    // 2. PERUBAHAN STATUS IZIN (prevStatus !== p.status)
    if (prevStatus !== p.status) {
      if (handledLocalActions.has(`status:${p.id}:${p.status}`)) continue;

      const isApprovedByMe = Boolean(currentUserId && p.approvedById === currentUserId);
      const isCheckoutByMe = Boolean(currentUserId && p.satpamDepartureId === currentUserId);
      const isCheckinByMe = Boolean(currentUserId && p.satpamReturnId === currentUserId);

      const isMyApplication = Boolean(currentUserId && p.applicantId === currentUserId);
      const isMyChild = Boolean(
        session.role === 'ORANG_TUA' &&
          (p.studentNis === session.student?.nis || p.studentId === session.student?.id)
      );
      const isDormHeadOrAdmin =
        session.role === 'SUPER_ADMIN' || session.role === 'KEPALA_ASRAMA';

      let notifTitle = '';
      let notifBody = '';

      if (p.status === 'APPROVED_WALI_KELAS' && !isApprovedByMe) {
        if (isMyApplication || isMyChild || isDormHeadOrAdmin) {
          notifTitle = 'Izin Santri Disetujui ✅';
          notifBody = `Alhamdulillah, izin ${p.studentName} (${p.className}) telah disetujui oleh ${p.approvedByName || 'Pihak Sekolah'}.`;
        } else if (session.role === 'SATPAM') {
          notifTitle = 'Izin Santri Siap Keluar 🚪';
          notifBody = `Santri ${p.studentName} (${p.className}) diizinkan keluar pos gerbang.`;
        }
      } else if (p.status === 'REJECTED') {
        if (isMyApplication || isMyChild || isDormHeadOrAdmin) {
          notifTitle = 'Pengajuan Izin Belum Disetujui ❌';
          notifBody = `Izin untuk ${p.studentName} belum disetujui: ${p.rejectionReason || 'Silakan hubungi pihak sekolah/asrama.'}`;
        }
      } else if (p.status === 'SEDANG_DI_LUAR' && !isCheckoutByMe) {
        if (isMyApplication || isMyChild || isDormHeadOrAdmin) {
          notifTitle = 'Santri Telah Keluar Gerbang 🚗';
          notifBody = `${p.studentName} (${p.className}) telah melewati pos gerbang.`;
        }
      } else if (
        (p.status === 'KEMBALI_TEPAT_WAKTU' || p.status === 'KEMBALI_TERLAMBAT') &&
        !isCheckinByMe
      ) {
        if (isMyApplication || isMyChild || isDormHeadOrAdmin) {
          const isLate = p.status === 'KEMBALI_TERLAMBAT';
          notifTitle = isLate
            ? 'Santri Kembali (Terlambat) ⚠️'
            : 'Santri Telah Kembali ke Pondok 🏡';
          notifBody = isLate
            ? `${p.studentName} (${p.className}) tiba kembali di pondok (terlambat ${p.lateDurationMinutes || 0} menit).`
            : `Alhamdulillah, ${p.studentName} (${p.className}) telah tiba kembali di pondok tepat waktu.`;
        }
      }

      if (notifTitle && notifBody) {
        const tag = `perm-status-${p.id}-${p.status}`;
        toast.info(notifTitle, {
          description: notifBody,
          pwa: false,
        } as any);
        sendPwaNotification(notifTitle, {
          body: notifBody,
          tag,
          url: '/',
        }).catch(() => {});
      }
    }
  }

  return nextMap;
}
