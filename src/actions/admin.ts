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

  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) return { error: "Application record could not be found." };

  if (app.weeklySlotId === slotId) {
    await prisma.application.update({
      where: { id: applicationId },
      data: { weeklySlotId: null, status: "WAITING" },
    });
  } else {
    const count = await prisma.application.count({ where: { weeklySlotId: slotId } });
    if (count >= 2) {
      return { error: "A maximum of 2 students can be assigned to a single weekly slot." };
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { weeklySlotId: slotId, status: "SHORTLISTED" },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

// 4. Update Status
export async function updateApplicationStatus(applicationId: string, status: AppStatus) {
  await requireAdmin();

  await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
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

// 10. Fetch Applications (TYPESCRIPT CRASH FIXED & HIGHLIGHTS ADDED)
export async function fetchAllApplications() {
  await requireAdmin();
  try {
    const apps = await prisma.application.findMany({
      include: { user: true },
      orderBy: { appliedAt: "desc" }
    });

    // Data will flow entirely from dynamicData and highlightedData
    const fixedApps = apps.map(app => ({
      ...app,
      dynamicData: app.dynamicData,
      highlightedData: app.highlightedData // Dashboard par show hone wala fast data
    }));

    return { success: true, data: fixedApps };
  } catch (error) {
    return { error: "Failed to fetch applications." };
  }
}