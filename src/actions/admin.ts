"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { AppStatus } from "@prisma/client";

// Guard: Only CLUB_ADMIN can run these actions
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN") {
    throw new Error("Unauthorized: Club Admin privileges are required to perform this action.");
  }
  return session;
}

// 1. Get or Create Current Active Weekly Slot
export async function getOrCreateCurrentSlot() {
  await requireAdmin();
  const now = new Date();
  
  // Find currently open or published slot
  let slot = await prisma.weeklySlot.findFirst({
    where: { isPublished: true },
    include: { selectedTrainees: { include: { user: true } } },
    orderBy: { weekStartDate: "desc" },
  });

  if (!slot) {
    // If no published slot, find most recent slot
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

// 2. Auto-Queue: Automatically select the oldest 2 waiting applicants
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

  // Fetch oldest WAITING applications (FIFO Queue)
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

// 3. Manual Pick / Remove Student for Slot
export async function toggleStudentSelection(applicationId: string, slotId: string) {
  await requireAdmin();

  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) return { error: "Application record could not be found." };

  if (app.weeklySlotId === slotId) {
    // Deselect
    await prisma.application.update({
      where: { id: applicationId },
      data: { weeklySlotId: null, status: "WAITING" },
    });
  } else {
    // Check if slot already has 2 presenters
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

// 4. Update Status (WAITING, SHORTLISTED, SCREENING_DONE, COMPLETED, REJECTED)
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

// 5. Toggle Publish on Program Home Page
export async function toggleSlotPublish(slotId: string, isPublished: boolean) {
  await requireAdmin();

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
  await requireAdmin();

  await prisma.weeklySlot.update({
    where: { id: slotId },
    data: { theme },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

// Add this inside src/actions/admin.ts

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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const emailsSent = [];

  for (const trainee of slot.selectedTrainees) {
    const studentEmail = trainee.user.email;
    const studentName = trainee.user.name;
    const topic = trainee.topicInterested;

    // Dynamically replace variables in the admin's custom HTML
    const personalizedHtml = customHtmlTemplate
      .replace(/{{name}}/g, studentName)
      .replace(/{{topic}}/g, topic);

    try {
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

// 8. Dispatch Mass Emails (Spreadsheet Style)
export async function sendMassEmails(recipients: { name: string; email: string }[], subject: string, customHtmlTemplate: string) {
  await requireAdmin();

  if (!recipients || recipients.length === 0) return { error: "No recipients provided." };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  let successCount = 0;

  for (const person of recipients) {
    if (!person.email || !person.name) continue;

    const personalizedHtml = customHtmlTemplate.replace(/{{name}}/g, person.name);

    try {
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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
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