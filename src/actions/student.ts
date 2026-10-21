"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getStudentDashboardData() {
  const session = await auth();
  if (!session?.user) return { error: "Authentication required." };

  try {
    // Check if application exists (Strict 1:1 relation)
    const existingApp = await prisma.application.findFirst({
      where: { userId: session.user.id }
    });

    // Fetch the dynamically published form fields
    const formFields = await prisma.formField.findMany({
      orderBy: { orderIndex: 'asc' }
    });

    return { 
      success: true, 
      hasApplied: !!existingApp, 
      applicationData: existingApp,
      formFields 
    };
  } catch (error) {
    return { error: "Failed to load dashboard data." };
  }
}

export async function nudgeAdmin(applicationId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized access." };

  try {
    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) return { error: "Application not found." };

    // --- SECURITY FIX: IDOR Ownership Guard ---
    if (app.userId !== session.user.id) {
      return { error: "Unauthorized access: You cannot nudge an application that does not belong to you." };
    }

    // --- RATE LIMITING: Max 2 Nudges per week ---
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
    return { success: true, message: "The administration team has been notified. Your application is now highlighted." };
  } catch (error) {
    console.error("Nudge Execution Error:", error);
    return { error: "Failed to send the nudge request. Please try again later." };
  }
}

// Student form submission execution
export async function submitStudentForm(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized: Please log in to submit your application." };

  // --- DUPLICATE APPLICATION BLOCK ---
  const existingApp = await prisma.application.findFirst({
    where: { userId: session.user.id }
  });
  if (existingApp) {
    return { error: "You have already submitted an application. Duplicate submissions are not permitted." };
  }

  // 1. Parse dynamic form data into a structured JSON object
  const rawData: Record<string, any> = {};
  
  formData.forEach((value, key) => {
    // --- FILE UPLOAD HANDLER ---
    let finalValue = value;
    if (value instanceof File) {
      if (!value.name || value.name === "undefined") return; 
      finalValue = value.name; 
    }

    if (rawData[key]) {
      if (Array.isArray(rawData[key])) {
        rawData[key].push(finalValue);
      } else {
        rawData[key] = [rawData[key], finalValue];
      }
    } else {
      rawData[key] = finalValue;
    }
  });

  try {
    // --- Highlighted Fields (Pin to Card) Extraction ---
    const highlightedFields = await prisma.formField.findMany({
      where: { isHighlighted: true },
      select: { fieldLabel: true }
    });

    const highlightedDataObj: Record<string, any> = {};
    highlightedFields.forEach(field => {
      // Safely handle checkbox array inputs (e.g., Label[])
      const val = rawData[field.fieldLabel] ?? rawData[`${field.fieldLabel}[]`];
      if (val !== undefined) {
        highlightedDataObj[field.fieldLabel] = val;
      }
    });

    // 2. Persist application in the database
    await prisma.application.create({
      data: {
        userId: session.user.id,
        topicInterested: rawData["Choose your preffered topic"]?.toString() || rawData["Topic"]?.toString() || "Custom Application",
        dynamicData: JSON.stringify(rawData), 
        highlightedData: Object.keys(highlightedDataObj).length > 0 ? JSON.stringify(highlightedDataObj) : null, // Limit stored to pinned items
        status: "WAITING"
      }
    });
    
    // 3. Invalidate cache to reflect changes on the dashboard
    revalidatePath("/dashboard");
    return { success: true };
    
  } catch (error: any) {
    console.error("Form Submission Error:", error);
    return { error: "A database error occurred. Your application could not be submitted." };
  }
}