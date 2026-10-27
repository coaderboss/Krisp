"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// 🟢 SECURITY GUARD ADDED
async function requireAdminGuard() {
  const sessionUser = await auth();
  if (sessionUser?.user?.role !== "CLUB_ADMIN" && sessionUser?.user?.role !== "EXECUTIVE") {
    throw new Error("Unauthorized Access Attempt Blocked.");
  }
}

export async function createAttendanceSession(data: { title: string; date: Date; type: "MANUAL" | "TIMER"; mode: "QR" | "CODE"; durationMins?: number }) {
  const sessionUser = await auth();
  if (sessionUser?.user?.role !== "CLUB_ADMIN" && sessionUser?.user?.role !== "EXECUTIVE") return { error: "Unauthorized" };

  const secretCode = data.mode === "CODE" ? Math.random().toString(36).substring(2, 8).toUpperCase() : null;
  const qrPayload = data.mode === "QR" ? `AUTH_${Math.random().toString(36).substring(2, 15)}_${Date.now()}` : null;
  
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