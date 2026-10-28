import webpush from 'web-push';
import prisma from '@/lib/prisma';

webpush.setVapidDetails(
  `mailto:${process.env.ADMIN_EMAIL || 'admin@cyberclub.com'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string; image?: string }) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    
    const promises = subscriptions.map(async (sub) => {
      const pushConfig = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(pushConfig, JSON.stringify(payload));
      } catch (err: any) {
        // Agar user ne notification block kar diya ya browser data clear kar diya, toh invalid token ko DB se hata do
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    });

    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error("Push delivery failed:", error);
    return { success: false, error };
  }
}

// Naya function: Role ke hisaab se sabhi ko message bhejna (e.g. sirf EXECUTIVES ko, ya sirf STUDENTS ko)
export async function broadcastToRole(role: "STUDENT" | "EXECUTIVE" | "CLUB_ADMIN", payload: { title: string; body: string; url?: string; image?: string }) {
  try {
    const users = await prisma.user.findMany({
      where: { role: role },
      select: { id: true }
    });

    const userIds = users.map(u => u.id);
    if (userIds.length === 0) return { success: true };

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } }
    });

    const promises = subscriptions.map(async (sub) => {
      const pushConfig = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
      try {
        await webpush.sendNotification(pushConfig, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    });

    await Promise.all(promises);
    return { success: true, count: promises.length };
  } catch (error) {
    console.error(`Broadcast to ${role} failed:`, error);
    return { success: false, error };
  }
}