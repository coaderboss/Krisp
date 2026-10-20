"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function getStudentDashboardData() {
  const session = await auth();
  if (!session?.user) return { error: "Not logged in" };

  try {
    // Check if application exists (1 Student = 1 Form)
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
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) return { error: "Application not found" };

    // --- SECURITY FIX: IDOR Ownership Guard ---
    if (app.userId !== session.user.id) {
      return { error: "Unauthorized access: You cannot nudge someone else's application." };
    }

    // --- RATE LIMITING: Week mein max 2 baar Nudge ---
    if (app.nudgeDate) {
      const daysSinceLastNudge = (new Date().getTime() - new Date(app.nudgeDate).getTime()) / (1000 * 3600 * 24);
      if (daysSinceLastNudge < 3.5) {
        return { 
          error: `Rate Limit Exceeded: Aap week me sirf 2 baar Nudge kar sakte hain. Kripya ${Math.ceil(3.5 - daysSinceLastNudge)} din baad dubara try karein.` 
        };
      }
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { hasNudged: true, nudgeDate: new Date() }
    });
    
    revalidatePath("/dashboard");
    return { success: true, message: "Admin has been notified! Your application has been highlighted." };
  } catch (error) {
    console.error("Nudge Error:", error);
    return { error: "Failed to send nudge." };
  }
}

// Student form submission logic
export async function submitStudentForm(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized: Please login first." };

  // --- FIX 1: DUPLICATE APPLICATION BLOCK ---
  const existingApp = await prisma.application.findFirst({
    where: { userId: session.user.id }
  });
  if (existingApp) {
    return { error: "Aap already ek application submit kar chuke hain. Duplicate submissions allowed nahi hain." };
  }

  // 1. Dynamic Form Data ko ek JSON object me convert karna
  const rawData: Record<string, any> = {};
  
  formData.forEach((value, key) => {
    // --- FIX 2: FILE UPLOAD FIX ---
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
    // --- NAYA LOGIC: Highlighted Fields (Pin to Card) Filter Karna ---
    const highlightedFields = await prisma.formField.findMany({
      where: { isHighlighted: true },
      select: { fieldLabel: true }
    });

    const highlightedDataObj: Record<string, any> = {};
    highlightedFields.forEach(field => {
      // Checkbox array name (Label[]) ko bhi handle karo
      const val = rawData[field.fieldLabel] ?? rawData[`${field.fieldLabel}[]`];
      if (val !== undefined) {
        highlightedDataObj[field.fieldLabel] = val;
      }
    });

    // 2. Database me save karna
    await prisma.application.create({
      data: {
        userId: session.user.id,
        topicInterested: rawData["Choose your preffered topic"]?.toString() || rawData["Topic"]?.toString() || "Custom Application",
        dynamicData: JSON.stringify(rawData), 
        highlightedData: Object.keys(highlightedDataObj).length > 0 ? JSON.stringify(highlightedDataObj) : null, // Sirf 4 fields yahan jayenge
        status: "WAITING"
      }
    });
    
    // 3. UI update karna
    revalidatePath("/dashboard");
    return { success: true };
    
  } catch (error: any) {
    console.error("Form Submit Error:", error);
    return { error: "Database error: Form submit nahi ho paaya." };
  }
}