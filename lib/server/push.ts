import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Inisialisasi web-push dengan kunci VAPID (menggunakan environment variable atau default terkonfigurasi)
export const DEFAULT_VAPID_PUBLIC_KEY =
  'BH9AbtWvfE6rMA1Y2_6hg-jcCcQcoof7ObZ0EbG3G5oNoea3H1G6MGn77hi_SFs1kfuBMx0X4eXQxn2-QemA2eo';
export const DEFAULT_VAPID_PRIVATE_KEY =
  'FiNIy5w9mP3sE3ll-4AN28-MDqukyybOr0r0ovAmyTk';
export const DEFAULT_VAPID_SUBJECT =
  'mailto:admin@ihsanulfikri.sch.id';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error('Error setting VAPID details:', err);
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

export interface PushTargetFilter {
  userIds?: string[];
  roles?: string[];
  studentNisList?: string[];
  excludeUserIds?: string[];
}

/**
 * Kirim web push notification ke target tertentu (spesifik user, role, atau wali santri)
 */
export async function sendTargetedPush(
  payload: PushNotificationPayload,
  filter?: PushTargetFilter
): Promise<{ sent: number; failed: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification');
    return { sent: 0, failed: 0 };
  }

  try {
    // Bangun filter query prisma
    const whereConditions: any[] = [];

    if (filter?.userIds && filter.userIds.length > 0) {
      whereConditions.push({ userId: { in: filter.userIds } });
    }

    if (filter?.roles && filter.roles.length > 0) {
      whereConditions.push({ role: { in: filter.roles } });
    }

    if (filter?.studentNisList && filter.studentNisList.length > 0) {
      whereConditions.push({ studentNis: { in: filter.studentNisList } });
    }

    const whereClause = whereConditions.length > 0 ? { OR: whereConditions } : {};

    const rawSubscriptions = await prisma.pushSubscription.findMany({
      where: whereClause,
    });

    const excludeSet = new Set((filter?.excludeUserIds || []).filter(Boolean));
    const subscriptions =
      excludeSet.size > 0
        ? rawSubscriptions.filter((s) => !s.userId || !excludeSet.has(s.userId))
        : rawSubscriptions;

    if (subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag || undefined,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/favicon-32.png',
      url: payload.url || '/',
      data: {
        url: payload.url || '/',
        tag: payload.tag || undefined,
        timestamp: Date.now(),
        ...payload.data,
      },
    });

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          sent++;
        } catch (error: any) {
          failed++;
          // Kode 404 (Not Found) atau 410 (Gone) berarti subscription sudah kadaluarsa/uninstalled
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            expiredIds.push(sub.id);
          } else {
            console.error('Error sending push to endpoint:', sub.endpoint, error?.message || error);
          }
        }
      })
    );

    // Hapus subscription yang sudah expired secara otomatis
    if (expiredIds.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: expiredIds } },
      }).catch((e) => console.error('Failed to clean up expired subscriptions', e));
    }

    return { sent, failed };
  } catch (err) {
    console.error('Failed to send push notification:', err);
    return { sent: 0, failed: 0 };
  }
}
