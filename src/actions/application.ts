// src/actions/application.ts
"use server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function submitApplication(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Aapko pehle login karna hoga." };

  const course = formData.get("course") as string;
  const semester = formData.get("semester") as string;
  const topicInterested = formData.get("topicInterested") as string;
  const pastExperience = formData.get("pastExperience") as string;

  if (!course || !semester || !topicInterested) {
    return { error: "Zaroori fields khali hain!" };
  }

  try {
    // Check if already applied
    const existingApp = await prisma.application.findFirst({
      where: { userId: session.user.id }
    });

    if (existingApp) {
      return { error: "Aap pehle hi apply kar chuke hain." };
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

    revalidatePath("/dashboard"); // Page ko refresh karne ke liye
    return { success: true };
  } catch {
    return { error: "Server error. Kripya baad mein try karein." };
  }
}