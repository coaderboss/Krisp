import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const subscription = await req.json();

    // upsert use kar rahe hain taaki duplicate tokens entry na karein
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: { userId: session.user.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Database mapping error" }, { status: 500 });
  }
}