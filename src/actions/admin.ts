"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { AppStatus } from "@prisma/client";

// Guard: Only CLUB_ADMIN can run these actions
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN") {
    throw new Error("Unauthorized: Club Admin rights required.");
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

  // Find slot
  const slot = await prisma.weeklySlot.findUnique({
    where: { id: slotId },
    include: { selectedTrainees: true },
  });
  if (!slot) return { error: "Weekly slot not found." };

  const currentCount = slot.selectedTrainees.length;
  const needed = 2 - currentCount;
  if (needed <= 0) return { error: "Is week ke 2 students pehle hi selected hain." };

  // Fetch oldest WAITING applications (FIFO Queue)
  const waitingApps = await prisma.application.findMany({
    where: { status: "WAITING" },
    orderBy: { appliedAt: "asc" },
    take: needed,
  });

  if (waitingApps.length === 0) {
    return { error: "Queue me koi waiting student application nahi mili." };
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
  if (!app) return { error: "Application not found." };

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
      return { error: "Is slot me maximum 2 students hi select ho sakte hain." };
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

// 7. Send Screening Invites / Emails
export async function sendInvitesToShortlisted(slotId: string) {
  await requireAdmin();

  const slot = await prisma.weeklySlot.findUnique({
    where: { id: slotId },
    include: {
      selectedTrainees: {
        include: { user: true },
      },
    },
  });

  if (!slot || slot.selectedTrainees.length === 0) {
    return { error: "Invites bhejne ke liye koi shortlisted presenter nahi hai." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const resend = apiKey ? new Resend(apiKey) : null;
  const emailsSent = [];

  for (const trainee of slot.selectedTrainees) {
    const studentEmail = trainee.user.email;
    const studentName = trainee.user.name;
    const topic = trainee.topicInterested;

    if (resend) {
      try {
        await resend.emails.send({
          from: "Cybersecurity Club UIET <bulletin@resend.dev>",
          to: studentEmail,
          subject: "🎉 You have been Shortlisted! Weekly Video Bulletin Screening Call",
          html: `
            <h2>Hello ${studentName},</h2>
            <p>Congratulations! Aapko hamare <strong>Weekly Cybersecurity Video Bulletin</strong> ke liye shortlist kiya gaya hai.</p>
            <p><strong>Your Topic:</strong> ${topic}</p>
            <p><strong>Screening Schedule:</strong> Friday, 4:00 PM IST (UIET Media Cell)</p>
            <p>Kripya apne topic par 3-4 slides taiyaar rakhein.</p>
            <br/>
            <p>Best regards,<br/><strong>Cybersecurity Club • UIET CSJM University</strong></p>
          `,
        });
        emailsSent.push(studentEmail);
      } catch (err) {
        console.error("Resend error for:", studentEmail, err);
      }
    } else {
      // Graceful simulation when API key is pending
      emailsSent.push(studentEmail);
    }
  }

  revalidatePath("/admin");
  return { 
    success: true, 
    count: emailsSent.length,
    simulated: !apiKey,
    message: apiKey 
      ? `${emailsSent.length} students ko official screening invites email kar diye gaye!`
      : `${emailsSent.length} students ke liye invites simulate ho gaye (Resend API Key set karein live email delivery ke liye).`
  };
}

