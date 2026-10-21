"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Guard ONLY for Supreme Admin
async function requireSupremeAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN") {
    throw new Error("Security Alert: Only Supreme Admin can perform this action.");
  }
  return session;
}

export async function submitReviewRequest(actionType: string, payload: any) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "EXECUTIVE") {
    return { error: "Access Denied: Only authorized executives can submit review requests." };
  }

  try {
    await prisma.adminRequest.create({
      data: {
        executiveId: session.user.id,
        actionType,
        payload: JSON.stringify(payload),
        status: "PENDING"
      }
    });
    return { success: true, message: "Request successfully sent to Supreme Admin for review!" };
  } catch (error) {
    console.error("Error submitting review request:", error);
    return { error: "Failed to submit request. Please try again later." };
  }
}

// --- FETCH PENDING REQUESTS FOR INBOX ---
export async function getPendingRequests() {
  await requireSupremeAdmin();
  
  try {
    const requests = await prisma.adminRequest.findMany({
      where: { status: "PENDING" },
      include: { executive: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
    return { success: true, data: requests };
  } catch (error) {
    return { error: "Failed to fetch pending requests." };
  }
}

// --- MASTER EXECUTION ENGINE (APPROVE & APPLY) ---
export async function approveRequest(requestId: string) {
  await requireSupremeAdmin();

  try {
    const request = await prisma.adminRequest.findUnique({ where: { id: requestId } });
    if (!request) return { error: "Review request not found." };

    const payload = JSON.parse(request.payload);

    // 1. EXECUTE THE REQUESTED ACTION
    if (request.actionType === "UPDATE_FORM") {
      // Server-Side Guard - Maximum 4 Highlights
      const highlightedCount = payload.fields.filter((f: any) => f.isHighlighted).length;
      if (highlightedCount > 4) {
        return { error: "Validation Error: You can pin a maximum of 4 fields to the dashboard." };
      }

      // Transaction: Delete old form layout and insert the new fully updated layout
      await prisma.$transaction([
        prisma.formField.deleteMany({}),
        prisma.formField.createMany({
          data: payload.fields.map((f: any, index: number) => ({
            fieldName: f.fieldName || `field_${Date.now()}_${index}`,
            fieldLabel: f.fieldLabel,
            fieldType: f.fieldType,
            options: f.options,
            isRequired: f.isRequired,
            isActive: true,
            isHighlighted: f.isHighlighted || false,
            orderIndex: index
          }))
        })
      ]);
    } else if (request.actionType === "PUBLISH_SLOT") {
      await prisma.weeklySlot.update({
        where: { id: payload.slotId },
        data: { isPublished: true }
      });
    } else if (request.actionType === "UPDATE_MAIL_TEMPLATE") {
      // 🟢 FIX: Store Global Mail Template persistently in the database
      await prisma.clubSettings.upsert({
        where: { id: "global" },
        update: { mailTemplate: payload.template },
        create: { id: "global", mailTemplate: payload.template }
      });
    }

    // 2. MARK AS APPROVED
    await prisma.adminRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED" }
    });

    // 🟢 FIX: Invalidate cache for the public home page and dashboard routes
    revalidatePath("/"); 
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: "Request approved and successfully applied to the system!" };
  } catch (error) {
    console.error("Approval Execution Error:", error);
    return { error: "Failed to execute the approval process." };
  }
}

// --- REJECT REQUEST ---
export async function rejectRequest(requestId: string) {
  await requireSupremeAdmin();

  try {
    await prisma.adminRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });
    revalidatePath("/admin");
    return { success: true, message: "Request has been rejected." };
  } catch (error) {
    return { error: "Failed to reject the request." };
  }
}