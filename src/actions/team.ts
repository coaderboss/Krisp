"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// 🟢 P1 SECURITY FIX: DB Guard: Only CLUB_ADMIN can access
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN") {
    throw new Error("Unauthorized: Supreme Admin rights required.");
  }
  
  // Real-time Database Check to prevent stale token usage
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isBlacklisted: true } });
  if (!dbUser || dbUser.isBlacklisted || dbUser.role !== "CLUB_ADMIN") {
    throw new Error("Security Alert: Supreme Admin access has been revoked or account is suspended.");
  }
  return session;
}

// 1. Fetch ALL users from the database
export async function fetchTeamData() {
  await requireAdmin();
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, isApproved: true, createdAt: true, isBlacklisted: true, accountStatus: true }
    });
    return { success: true, data: users };
  } catch (error) {
    return { error: "Failed to fetch user database." };
  }
}

// 2. Change User Role & Approval Status
export async function changeUserAccess(userId: string, newRole: "STUDENT" | "EXECUTIVE" | "CLUB_ADMIN", isApproved: boolean) {
  await requireAdmin();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        role: newRole,
        isApproved: isApproved
      }
    });
    revalidatePath("/admin");
    return { success: true, message: `User access updated successfully.` };
  } catch (error) {
    return { error: "Failed to update user access." };
  }
}