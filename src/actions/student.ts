"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { uploadFileToDrive } from "@/lib/gdrive";

export async function getStudentDashboardData() {
  const session = await auth();
  if (!session?.user) return { error: "Authentication required." };

  try {
    // 1. Fetch All Active Forms with their Questions
    const activeForms = await prisma.form.findMany({ 
      where: { isActive: true },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch User's Master Application (Weekly Bulletin)
    const mainApp = await prisma.application.findFirst({
      where: { userId: session.user.id }
    });

    // 3. Fetch User's Other Event Responses
    const otherResponses = await prisma.formResponse.findMany({
      where: { userId: session.user.id },
      include: { form: { select: { title: true } } }
    });

    return { 
      success: true, 
      activeForms,
      mainApp,
      otherResponses
    };
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    return { error: "Failed to load dashboard data." };
  }
}

export async function nudgeAdmin(applicationId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized access." };

  try {
    // 🟢 SECURITY FIX: Blacklist Protection for Nudges
    const userCheck = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isBlacklisted: true, accountStatus: true } });
    if (userCheck?.isBlacklisted || userCheck?.accountStatus !== "ACTIVE") {
      return { error: "Your account is suspended. You cannot send nudges." };
    }

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) return { error: "Application not found." };

    if (app.userId !== session.user.id) {
      return { error: "Unauthorized access: You cannot nudge an application that does not belong to you." };
    }

    if (app.nudgeDate) {
      const daysSinceLastNudge = (new Date().getTime() - new Date(app.nudgeDate).getTime()) / (1000 * 3600 * 24);
      if (daysSinceLastNudge < 3.5) {
        return { 
          error: `Rate Limit Exceeded: You can only send a nudge twice a week. Please try again in ${Math.ceil(3.5 - daysSinceLastNudge)} days.` 
        };
      }
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { hasNudged: true, nudgeDate: new Date() }
    });
    
    revalidatePath("/dashboard");
    // Gamified response matching user requirement
    return { success: true, message: "Priority Alert dispatched! The executive team has seen your nudge. We will review your application shortly." };
  } catch (error) {
    return { error: "Failed to send the nudge request. Please try again later." };
  }
}

export async function submitStudentForm(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized: Please log in to submit your application." };

  // Frontend se formId extract karna
  const formId = formData.get('$formId') as string;
  formData.delete('$formId');
  formData.delete('$isMaster'); // SECURITY: Ignore client's isMaster to prevent tampering

  if (!formId) return { error: "Invalid form payload." };

  // 🟢 SECURITY FIX: Blacklist Protection - Prevent suspended users from submitting forms
  const userCheck = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isBlacklisted: true, accountStatus: true } });
  if (userCheck?.isBlacklisted || userCheck?.accountStatus !== "ACTIVE") {
    return { error: "Your account is currently suspended. Access denied." };
  }

  // 🟢 SECURITY GUARD: Validate Form Status & Master Flag Server-Side
  const targetForm = await prisma.form.findUnique({ where: { id: formId } });
  if (!targetForm || !targetForm.isActive) {
    return { error: "This application form is closed and no longer accepting entries." };
  }
  const isMaster = Boolean(targetForm.isMaster);

  // --- DUPLICATE CHECK LOGIC ---
  if (isMaster) {
    const existingApp = await prisma.application.findFirst({ where: { userId: session.user.id } });
    if (existingApp) return { error: "You have already submitted the master application." };
  } else {
    const existingRes = await prisma.formResponse.findFirst({ where: { formId, userId: session.user.id } });
    if (existingRes) return { error: "You have already participated in this event." };
  }

  // --- PARSE DYNAMIC DATA (Including Google Drive file uploads) ---
  const rawData: Record<string, any> = {};
  for (const [key, value] of formData.entries()) {
    let finalValue: any = value;

    if (value instanceof File) {
      if (!value.name || value.name === "undefined" || value.size === 0) continue;

      // 🟢 P0 SECURITY FIX: Strict Memory DoS Protection (Max 5MB per file enforced at Server level)
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
      if (value.size > MAX_FILE_SIZE) {
        return { error: `Upload Failed: File '${value.name}' exceeds the strict 5MB limit.` };
      }

      try {
        const arrayBuffer = await value.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const driveUrl = await uploadFileToDrive(
          buffer,
          value.name,
          value.type || "application/octet-stream"
        );
        finalValue = driveUrl;
      } catch (uploadError: any) {
        console.error(`[Upload Error] Failed to upload ${value.name} to Google Drive:`, uploadError);
        return { 
          error: `Failed to upload document '${value.name}' to Google Drive: ${uploadError.message || "Storage error"}. Please try again.` 
        };
      }
    }

    if (rawData[key]) {
      if (Array.isArray(rawData[key])) rawData[key].push(finalValue);
      else rawData[key] = [rawData[key], finalValue];
    } else {
      rawData[key] = finalValue;
    }
  }

  try {
    if (isMaster) {
      // 🟢 MASTER FORM FLOW (Goes to Workflow Pipeline)
      const highlightedFields = await prisma.formQuestion.findMany({
        where: { formId, isHighlighted: true },
        select: { fieldLabel: true }
      });

      const highlightedDataObj: Record<string, any> = {};
      highlightedFields.forEach(field => {
        const val = rawData[field.fieldLabel] ?? rawData[`${field.fieldLabel}[]`];
        if (val !== undefined) highlightedDataObj[field.fieldLabel] = val;
      });

      await prisma.application.create({
        data: {
          userId: session.user.id,
          // 🟢 P2 DATA FIX: Handling typo variants in dynamic form questions
          topicInterested: rawData["Choose your preferred topic"]?.toString() || rawData["Choose your preffered topic"]?.toString() || rawData["Topic"]?.toString() || "Bulletin Core",
          dynamicData: JSON.stringify(rawData), 
          highlightedData: Object.keys(highlightedDataObj).length > 0 ? JSON.stringify(highlightedDataObj) : null,
          status: "WAITING"
        }
      });
    } else {
      // 🟢 EVENT FORM FLOW (Goes to Data Vault directly)
      await prisma.formResponse.create({
        data: {
          formId,
          userId: session.user.id,
          answersData: JSON.stringify(rawData)
        }
      });
    }
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Form Submission Error:", error);
    return { error: "A database error occurred. Your submission failed." };
  }
}

export async function getStudentEvents() {
  try {
    const events = await prisma.clubEvent.findMany({
      orderBy: { eventDate: "asc" }
    });
    return { success: true, data: events };
  } catch (error) {
    return { error: "Failed to fetch events." };
  }
}
