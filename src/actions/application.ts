"use server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function submitApplication(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required. Please log in to continue." };
  }

  const course = formData.get("course") as string;
  const semester = formData.get("semester") as string;
  const topicInterested = formData.get("topicInterested") as string;
  const pastExperience = formData.get("pastExperience") as string;

  if (!course || !semester || !topicInterested) {
    return { error: "Missing required fields. Please complete all mandatory sections." };
  }

  try {
    // Verify if the user has an existing application to prevent duplicates
    const existingApp = await prisma.application.findFirst({
      where: { userId: session.user.id }
    });

    if (existingApp) {
      return { error: "You have already submitted an application. Multiple submissions are not permitted." };
    }

    await prisma.application.create({
      data: {
        userId: session.user.id,
        course,
        semester,
        topicInterested,
        status: "WAITING"
      }
    });

    // Revalidate the dashboard path to reflect the new application status
    revalidatePath("/dashboard"); 
    return { success: true };
  } catch (error) {
    console.error("Application Submission Error:", error);
    return { error: "An unexpected server error occurred. Please try again later." };
  }
}