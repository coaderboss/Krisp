"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required. Invalid session." };
  }

  const college = formData.get("college") as string;
  const department = formData.get("department") as string;
  const rollNumber = formData.get("rollNumber") as string;

  if (!college || !department || !rollNumber) {
    return { error: "All fields are strictly required to proceed." };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isProfileComplete: true }
    });

    // GHOST SESSION FIX: Agar user DB me nahi hai, toh fail karo
    if (!existingUser) {
      return { error: "GHOST_SESSION" };
    }

    if (existingUser.isProfileComplete) {
      return { error: "Profile is already complete." };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        college: college.trim(),
        department: department.trim(),
        rollNumber: rollNumber.trim(),
        isProfileComplete: true
      }
    });

    return { success: true, message: "Profile secured successfully." };
  } catch (error) {
    console.error("Onboarding Update Error:", error);
    return { error: "A server error occurred while saving your profile." };
  }
}