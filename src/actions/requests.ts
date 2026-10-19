"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function submitReviewRequest(actionType: string, payload: any) {
  const session = await auth();
  
  if (!session?.user || session.user.role !== "EXECUTIVE") {
    return { error: "Only authorized executives can submit review requests." };
  }

  try {
    // FIXED: Changed AdminRequest to adminRequest (lowercase 'a')
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
    return { error: "Failed to submit request." };
  }
}