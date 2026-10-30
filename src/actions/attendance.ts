"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// 🟢 SECURITY GUARD ADDED
async function requireAdminGuard() {
  const sessionUser = await auth();
  if (sessionUser?.user?.role !== "CLUB_ADMIN" && sessionUser?.user?.role !== "EXECUTIVE") {
    // P2 FIX: Avoid throwing raw exception to prevent 500 error in Client Actions (CWE-754)
    throw new Error("Unauthorized Access Attempt Blocked.");
  }

  // 🟢 P1 SECURITY FIX: Live DB Check to prevent Stale JWT Privilege Escalation
  const dbUser = await prisma.user.findUnique({ 
    where: { id: sessionUser.user.id }, 
    select: { role: true, isBlacklisted: true } 
  });
  
  if (!dbUser || dbUser.isBlacklisted || (dbUser.role !== "CLUB_ADMIN" && dbUser.role !== "EXECUTIVE")) {
    throw new Error("Security Alert: Your access level has been revoked or suspended.");
  }
}

export async function createAttendanceSession(data: { title: string; date: Date; type: "MANUAL" | "TIMER"; mode: "QR" | "CODE"; durationMins?: number }) {
  const sessionUser = await auth();
  if (sessionUser?.user?.role !== "CLUB_ADMIN" && sessionUser?.user?.role !== "EXECUTIVE") return { error: "Unauthorized" };

  // 🟢 SECURITY FIX: Cryptographically Secure Randomization (CWE-330)
  const secretCode = data.mode === "CODE" ? crypto.randomBytes(4).toString("hex").toUpperCase() : null;
  const qrPayload = data.mode === "QR" ? `AUTH_${crypto.randomBytes(16).toString("hex")}_${Date.now()}` : null;
  
  let deadline = null;
  if (data.type === "TIMER" && data.durationMins) {
    deadline = new Date(Date.now() + data.durationMins * 60000);
  }

  try {
    await prisma.attendanceSession.updateMany({ where: { isActive: true }, data: { isActive: false } });

    const session = await prisma.attendanceSession.create({
      data: {
        title: data.title,
        date: data.date,
        type: data.type,
        mode: data.mode,
        deadline,
        secretCode,
        qrPayload,
        isActive: true
      }
    });
    revalidatePath("/admin");
    return { success: true, data: session };
  } catch (error) {
    return { error: "Failed to create session." };
  }
}

export async function getLiveAdminSession() {
  await requireAdminGuard();
  const session = await prisma.attendanceSession.findFirst({
    where: { isActive: true },
    include: {
      records: {
        // 🟢 FIX: Changed 'course' to 'college' to match Prisma Schema
        include: { user: { select: { name: true, rollNumber: true, department: true, college: true, email: true } } },
        orderBy: { markedAt: "asc" }
      }
    }
  });

  if (session && session.type === "TIMER" && session.deadline && new Date() > session.deadline) {
    await prisma.attendanceSession.update({ where: { id: session.id }, data: { isActive: false } });
    return { success: true, data: null };
  }

  return { success: true, data: session };
}

export async function stopSession(id: string) {
  await requireAdminGuard();
  await prisma.attendanceSession.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/admin");
  return { success: true };
}

export async function getActiveSessionForStudent() {
  const session = await prisma.attendanceSession.findFirst({
    where: { isActive: true },
    select: { id: true, title: true, mode: true, type: true, deadline: true }
  });

  if (session && session.type === "TIMER" && session.deadline && new Date() > session.deadline) {
    await prisma.attendanceSession.update({ where: { id: session.id }, data: { isActive: false } });
    return { error: "Session expired." };
  }

  return { success: true, data: session };
}

export async function markStudentAttendance(sessionId: string, payload: string) {
  const authSession = await auth();
  if (!authSession?.user?.id) return { error: "Authentication required." };
  const userId = authSession.user.id;

  // 🟢 SECURITY GUARD: Prevent suspended users from marking attendance
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBlacklisted: true, accountStatus: true } });
  if (user?.isBlacklisted || user?.accountStatus !== "ACTIVE") {
    return { error: "Your account is suspended. You cannot mark attendance." };
  }

  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found." };
  if (!session.isActive) return { error: "This attendance session has ended." };
  if (session.type === "TIMER" && session.deadline && new Date() > session.deadline) {
    return { error: "Time is up! Attendance is closed." };
  }

  if (session.mode === "CODE" && session.secretCode !== payload.trim().toUpperCase()) {
    return { error: "Invalid attendance code." };
  }
  if (session.mode === "QR" && session.qrPayload !== payload.trim()) {
    return { error: "Invalid or expired QR code." };
  }

  try {
    await prisma.attendanceRecord.create({
      data: { sessionId, userId }
    });
    return { success: true, message: "Attendance Marked Successfully!" };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "Your attendance is already marked for this session." };
    return { error: "Failed to mark attendance." };
  }
}

// Fetch all past/inactive sessions
export async function getPastSessions() {
  await requireAdminGuard();
  const sessions = await prisma.attendanceSession.findMany({
    where: { isActive: false },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { records: true } }
    }
  });
  return { success: true, data: sessions };
}

// Fetch records for a specific past session
export async function getSessionRecords(sessionId: string) {
  await requireAdminGuard();
  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId },
    include: { 
      user: { select: { name: true, rollNumber: true, department: true, college: true, email: true } } 
    },
    orderBy: { markedAt: "asc" }
  });
  return { success: true, data: records };
}

// 🟢 NEW API: Delete Empty Attendance Session
export async function deleteSession(sessionId: string) {
  await requireAdminGuard();
  try {
    // Only allow deletion if there are zero records (empty session)
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { records: true } } }
    });

    if (!session) return { error: "Session not found." };
    if (session._count.records > 0) return { error: "Cannot delete a session that has attendance records." };

    await prisma.attendanceSession.delete({
      where: { id: sessionId }
    });
    
    revalidatePath("/admin");
    return { success: true, message: "Empty session deleted permanently." };
  } catch (error) {
    return { error: "Failed to delete session." };
  }
}

// 🟢 NEW API: Reactivate a stopped/expired session
export async function reactivateSession(sessionId: string) {
  await requireAdminGuard();
  try {
    // First, stop any currently active sessions so only one is live at a time
    await prisma.attendanceSession.updateMany({ 
      where: { isActive: true }, 
      data: { isActive: false } 
    });

    // If it was a TIMER session, we need to extend the deadline (e.g., add 5 more minutes)
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session) return { error: "Session not found." };

    let newDeadline = session.deadline;
    if (session.type === "TIMER") {
       // Reset deadline to current time + 5 minutes
       newDeadline = new Date(Date.now() + 5 * 60000);
    }

    // Now activate the targeted session
    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { isActive: true, deadline: newDeadline }
    });

    revalidatePath("/admin");
    return { success: true, message: "Session reactivated successfully!" };
  } catch (error) {
    return { error: "Failed to reactivate session." };
  }
}