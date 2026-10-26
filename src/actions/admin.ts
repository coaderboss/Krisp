"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { AppStatus } from "@prisma/client";
import { transporter } from "@/lib/mail";

// Guard: Regular Executives & Admin
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN" && session?.user?.role !== "EXECUTIVE") {
    throw new Error("Unauthorized: Appropriate rights required.");
  }
  return session;
}

// SECURITY FIX: Guard ONLY for Supreme Admin
async function requireSupremeAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN") {
    throw new Error("Security Alert: Only Supreme Admin can perform this action.");
  }
  return session;
}

// 1. Get or Create Current Active Weekly Slot
export async function getOrCreateCurrentSlot() {
  await requireAdmin();
  const now = new Date();
  
  let slot = await prisma.weeklySlot.findFirst({
    where: { isPublished: true },
    include: { selectedTrainees: { include: { user: true } } },
    orderBy: { weekStartDate: "desc" },
  });

  if (!slot) {
    slot = await prisma.weeklySlot.findFirst({
      include: { selectedTrainees: { include: { user: true } } },
      orderBy: { weekStartDate: "desc" },
    });
  }

  if (!slot) {
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    slot = await prisma.weeklySlot.create({
      data: {
        weekStartDate: now,
        weekEndDate: nextWeek,
        theme: "Cybersecurity Fundamentals & Threat Vectors",
        isPublished: false,
      },
      include: { selectedTrainees: { include: { user: true } } },
    });
  }

  return slot;
}

// 2. Auto-Queue
export async function runAutoQueue(slotId: string) {
  await requireAdmin();

  const slot = await prisma.weeklySlot.findUnique({
    where: { id: slotId },
    include: { selectedTrainees: true },
  });
  
  if (!slot) return { error: "Weekly slot could not be found." };

  const currentCount = slot.selectedTrainees.length;
  const needed = 2 - currentCount;
  
  if (needed <= 0) return { error: "This slot has already reached the maximum capacity of 2 presenters." };

  const waitingApps = await prisma.application.findMany({
    where: { status: "WAITING" },
    orderBy: { appliedAt: "asc" },
    take: needed,
  });

  if (waitingApps.length === 0) {
    return { error: "No waiting applications found in the enrollment queue." };
  }

  for (const app of waitingApps) {
    await prisma.application.update({
      where: { id: app.id },
      data: {
        status: "SHORTLISTED",
        weeklySlotId: slotId,
      },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, count: waitingApps.length };
}

// 3. Manual Pick / Remove Student
export async function toggleStudentSelection(applicationId: string, slotId: string) {
  await requireAdmin();

  try {
    const [app, slot] = await Promise.all([
      prisma.application.findUnique({ where: { id: applicationId } }),
      prisma.weeklySlot.findUnique({ where: { id: slotId } })
    ]);

    if (!app) return { error: "Application record could not be found." };
    if (!slot) return { error: "Active weekly slot could not be found." };

    if (app.weeklySlotId === slotId) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { weeklySlotId: null, status: "WAITING" },
      });
      revalidatePath("/admin");
      revalidatePath("/executive/dashboard");
      return { success: true, message: "Slot allocation revoked." };
    } else {
      const count = await prisma.application.count({ where: { weeklySlotId: slotId } });
      if (count >= 2) {
        return { error: "This slot is already full (Maximum 2 presenters allowed)." };
      }

      await prisma.application.update({
        where: { id: applicationId },
        data: { weeklySlotId: slotId, status: "SHORTLISTED" },
      });
      revalidatePath("/admin");
      revalidatePath("/executive/dashboard");
      return { success: true, message: "Candidate successfully assigned to slot." };
    }
  } catch (error) {
    console.error("Toggle Selection Error:", error);
    return { error: "Database error occurred during slot assignment." };
  }
}

// 4. Update Status
export async function updateApplicationStatus(applicationId: string, status: AppStatus) {
  await requireAdmin();

  try {
    await prisma.application.update({
      where: { id: applicationId },
      data: { status },
    });
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update status." };
  }
}

// 4b. Global Media Engine (SPA Integration)
export async function getGlobalMedia() {
  await requireAdmin();
  const settings = await prisma.clubSettings.findUnique({ where: { id: "global" } });
  return { 
    success: true, 
    data: { 
      title: settings?.mediaTitle || "Featured Cyber Bulletin Episode", 
      limit: settings?.mediaLimit || 1, 
      urls: settings?.mediaUrls || "[]" 
    } 
  };
}

export async function updateGlobalMedia(mediaTitle: string, mediaLimit: number, mediaUrls: string) {
  await requireAdmin();
  try {
    await prisma.clubSettings.upsert({
      where: { id: "global" },
      update: { mediaTitle, mediaLimit, mediaUrls },
      create: { id: "global", mediaTitle, mediaLimit, mediaUrls }
    });
    revalidatePath("/");
    return { success: true, message: "Homepage Media Engine updated & published successfully!" };
  } catch (error) {
    return { error: "Failed to publish media settings." };
  }
}

// 5. Toggle Publish
export async function toggleSlotPublish(slotId: string, isPublished: boolean) {
  await requireSupremeAdmin(); // SECURITY FIX: Locked to CLUB_ADMIN

  await prisma.weeklySlot.update({
    where: { id: slotId },
    data: { isPublished },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

// 6. Update Slot Theme
export async function updateSlotTheme(slotId: string, theme: string) {
  await requireSupremeAdmin(); // SECURITY FIX: Locked to CLUB_ADMIN

  await prisma.weeklySlot.update({
    where: { id: slotId },
    data: { theme },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

// 7. Dispatch Editable Screening Invites
export async function sendInvitesToShortlisted(slotId: string, customHtmlTemplate: string) {
  await requireAdmin();

  const slot = await prisma.weeklySlot.findUnique({
    where: { id: slotId },
    include: {
      selectedTrainees: { include: { user: true } },
    },
  });

  if (!slot || slot.selectedTrainees.length === 0) {
    return { error: "No shortlisted presenters found in the active slot." };
  }

  const emailsSent = [];

  for (const trainee of slot.selectedTrainees) {
    const studentEmail = trainee.user.email;
    const studentName = trainee.user.name;
    const topic = trainee.topicInterested;

    const personalizedHtml = customHtmlTemplate
      .replace(/{{name}}/g, studentName)
      .replace(/{{topic}}/g, topic);

    try {
      // FIX: Using global transporter to save server memory
      await transporter.sendMail({
        from: `"Cybersecurity Club CSJMU" <${process.env.GMAIL_EMAIL}>`,
        to: studentEmail,
        subject: "🎉 Action Required: Weekly Video Bulletin Screening Call",
        html: personalizedHtml,
      });
      emailsSent.push(studentEmail);
    } catch (err) {
      console.error("Nodemailer delivery failed for:", studentEmail, err);
    }
  }

  return { 
    success: true, 
    count: emailsSent.length,
    message: `Personalized screening invitations successfully dispatched to ${emailsSent.length} candidate(s).`
  };
}

// 8. Dispatch Mass Emails
export async function sendMassEmails(recipients: { name: string; email: string }[], subject: string, customHtmlTemplate: string) {
  await requireAdmin();

  if (!recipients || recipients.length === 0) return { error: "No recipients provided." };

  let successCount = 0;

  for (const person of recipients) {
    if (!person.email || !person.name) continue;

    const personalizedHtml = customHtmlTemplate.replace(/{{name}}/g, person.name);

    try {
      // FIX: Using global transporter to save server memory
      await transporter.sendMail({
        from: `"Cybersecurity Club CSJMU" <${process.env.GMAIL_EMAIL}>`,
        to: person.email,
        subject: subject,
        html: personalizedHtml,
      });
      successCount++;
    } catch (err) {
      console.error("Mass email failure for:", person.email, err);
    }
  }

  return { 
    success: true, 
    message: `Mass email broadcast completed. Successfully reached ${successCount} recipient(s).`
  };
}

// 9. Dispatch Single Direct Email
export async function sendDirectEmail(email: string, subject: string, htmlBody: string) {
  await requireAdmin();

  try {
    // FIX: Using global transporter to save server memory
    await transporter.sendMail({
      from: `"Cybersecurity Club CSJMU" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: subject,
      html: htmlBody,
    });
    return { success: true, message: "Direct communication dispatched successfully." };
  } catch (error) {
    return { error: "Failed to dispatch the email. Please verify the SMTP configuration." };
  }
}

// 10. Fetch ALL Applications & Form Responses (Unified Data Vault Engine)
export async function fetchAllApplications() {
  await requireAdmin();
  try {
    const apps = await prisma.application.findMany({
      include: { user: true },
      orderBy: { appliedAt: "desc" }
    });

    const responses = await prisma.formResponse.findMany({
      include: { user: true, form: true },
      orderBy: { submittedAt: "desc" }
    });

    const unifiedData: any[] = [];

    apps.forEach(app => {
      unifiedData.push({
        ...app, // Keeps id, status, appliedAt, weeklySlotId to prevent Executive Crash
        formId: "master",
        user: app.user, // 🟢 FIX: Restores nested user object!
        topicInterested: app.topicInterested || "Not Selected",
        dynamicData: app.dynamicData || "{}",
        highlightedData: app.highlightedData,
      });
    });

    responses.forEach(res => {
      unifiedData.push({
        id: res.id,
        formId: res.formId,
        user: res.user, // 🟢 FIX: Restores nested user object!
        topicInterested: res.form.title, 
        dynamicData: res.answersData || "{}",
        highlightedData: null,
        status: "RECORDED",
        appliedAt: res.submittedAt, 
        weeklySlotId: null, 
      });
    });

    return { success: true, data: unifiedData };
  } catch (error) {
    console.error("Vault Fetch Error:", error);
    return { error: "Failed to fetch applications from the data vault." };
  }
}

// ==========================================
// PHASE 1: VAULT & TEAM SECURITY ACTIONS
// ==========================================

// 11. Permanently Delete Vault Entry
export async function deleteVaultEntry(id: string, isMaster: boolean) {
  await requireSupremeAdmin();
  try {
    if (isMaster) {
      await prisma.application.delete({ where: { id } });
    } else {
      await prisma.formResponse.delete({ where: { id } });
    }
    revalidatePath("/admin");
    return { success: true, message: "Record permanently purged from database." };
  } catch (error) {
    return { error: "Action failed." };
  }
}

// 12. Allow Reattempt (Clears old record, unlocks form)
export async function allowReattempt(id: string, isMaster: boolean) {
  await requireAdmin();
  try {
    if (isMaster) {
      await prisma.application.delete({ where: { id } });
    } else {
      await prisma.formResponse.delete({ where: { id } });
    }
    revalidatePath("/admin");
    return { success: true, message: "Entry cleared. Student can now resubmit." };
  } catch (error) {
    return { error: "Failed to process reattempt." };
  }
}

// 13. Blacklist User (Suspends Account)
export async function toggleUserBlacklist(userId: string, isBlacklisted: boolean) {
  await requireSupremeAdmin();
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isBlacklisted, accountStatus: isBlacklisted ? "SUSPENDED" : "ACTIVE" }
    });
    revalidatePath("/admin");
    return { success: true, message: isBlacklisted ? "User completely blocked from system." : "User access restored." };
  } catch (error) {
    return { error: "Failed to update user identity." };
  }
}

// 14. Permanent User Deletion
export async function deleteUser(userId: string) {
  await requireSupremeAdmin();
  try {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin");
    return { success: true, message: "User deleted." };
  } catch (error) {
    return { error: "Deletion failed." };
  }
}

// ==========================================
// PHASE 2: COMMAND CENTER (OVERVIEW & ATTENDANCE)
// ==========================================

export async function getOverviewMetrics() {
  await requireAdmin();
  const [totalUsers, activeForms, totalSubmissions, todayEvents] = await Promise.all([
    prisma.user.count(),
    prisma.form.count({ where: { isActive: true } }),
    prisma.formResponse.count(),
    prisma.clubEvent.count({
      where: {
        eventDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    })
  ]);
  return { success: true, data: { totalUsers, activeForms, totalSubmissions, todayEvents } };
}

export async function getClubEvents() {
  await requireAdmin();
  const events = await prisma.clubEvent.findMany({
    orderBy: { eventDate: "asc" },
    include: { attendanceSession: true }
  });
  return { success: true, data: events };
}

export async function createClubEvent(title: string, description: string, eventType: string, eventDate: Date) {
  await requireAdmin();
  try {
    await prisma.clubEvent.create({
      data: { title, description, eventType, eventDate }
    });
    revalidatePath("/admin");
    return { success: true, message: "Event scheduled successfully." };
  } catch (error) {
    return { error: "Failed to create event." };
  }
}

export async function startAttendanceSession(eventId: string) {
  await requireAdmin();
  const secretCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    const session = await prisma.attendanceSession.upsert({
      where: { eventId },
      update: { isActive: true, secretCode },
      create: { eventId, title: "Live Session", date: new Date(), secretCode, isActive: true },
    });
    return { success: true, data: session };
  } catch (error) {
    return { error: "Failed to start session." };
  }
}

export async function stopAttendanceSession(sessionId: string) {
  await requireAdmin();
  await prisma.attendanceSession.update({
    where: { id: sessionId },
    data: { isActive: false }
  });
  return { success: true, message: "Session closed." };
}

export async function getLiveAttendance(sessionId: string) {
  await requireAdmin();
  const records = await prisma.attendanceRecord.findMany({
    where: { sessionId },
    include: { 
      user: { select: { name: true, email: true, rollNumber: true, department: true } } 
    },
    orderBy: { markedAt: "desc" }
  });
  return { success: true, data: records };
}