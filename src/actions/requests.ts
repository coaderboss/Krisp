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
        return { error: "Validation Error: You can pin a maximum of 4 fields to the Vault." };
      }

      // 💡 Find active Form or Create it
      const payloadObj = payload;
// Exact targeted form ID to prevent blind overwriting
let targetForm = await prisma.form.findUnique({ where: { id: payloadObj.formId || "master" } });
      
      if (!targetForm) {
        targetForm = await prisma.form.findFirst({ where: { isMaster: true } });
      }
      if (!targetForm) {
        targetForm = await prisma.form.create({
          data: {
            title: payload.title || "Weekly Bulletin Registration",
            description: payload.description || "Live application form",
            isActive: true,
            isMaster: true
          }
        });
      } else if (payload.title || payload.description) {
        targetForm = await prisma.form.update({
          where: { id: targetForm.id },
          data: {
            title: payload.title || targetForm.title,
            description: payload.description || targetForm.description
          }
        });
      }

      // 🟢 FIX: Map strictly to Prisma Schema (removed isActive, used maxLength, safe options)
      await prisma.$transaction([
        prisma.formQuestion.deleteMany({ where: { formId: targetForm.id } }),
        prisma.formQuestion.createMany({
          data: payload.fields.map((f: any, index: number) => ({
            formId: targetForm.id,
            fieldName: f.fieldName || `field_${Date.now()}_${index}`,
            fieldLabel: f.fieldLabel,
            fieldType: f.fieldType,
            options: f.options || [], 
            isRequired: f.isRequired,
            isHighlighted: f.isHighlighted || false,
            placeholder: f.placeholder || "",
            maxLength: f.wordLimit ? Number(f.wordLimit) : null,
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
      await prisma.clubSettings.upsert({
        where: { id: "global" },
        update: { mailTemplate: payload.template },
        create: { id: "global", mailTemplate: payload.template }
      });
    }

    // 2. MARK AS APPROVED & AWARD CREDITS TO EXECUTIVE (GAMIFICATION)
    // 🟢 FIX: Match Schema Fields exactly (approvedRequests)
    await prisma.$transaction([
      prisma.adminRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" }
      }),
      prisma.user.update({
        where: { id: request.executiveId },
        data: { 
          credits: { increment: 15 },
          approvedRequests: { increment: 1 } 
        }
      })
    ]);

    revalidatePath("/"); 
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: "Request approved! Form updated and 15 Credits awarded to Executive." };
  } catch (error) {
    console.error("Approval Execution Error:", error);
    return { error: "Failed to execute the approval process." };
  }
}

// --- REJECT REQUEST & UPDATE LEADERBOARD ---
export async function rejectRequest(requestId: string) {
  await requireSupremeAdmin();

  try {
    const request = await prisma.adminRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" }
    });

    // 🟢 FIX: Match Schema Field (rejectedRequests)
    if (request.executiveId) {
      await prisma.user.update({
        where: { id: request.executiveId },
        data: { rejectedRequests: { increment: 1 } }
      });
    }

    revalidatePath("/admin");
    return { success: true, message: "Request has been rejected." };
  } catch (error) {
    return { error: "Failed to reject the request." };
  }
}