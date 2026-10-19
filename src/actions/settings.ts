"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Guard for Admin Operations
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN") {
    throw new Error("Unauthorized: Supreme Admin rights required.");
  }
  return session;
}

// 1. Fetch current form fields from Database
export async function getFormFields() {
  try {
    const fields = await prisma.formField.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    return { success: true, data: fields };
  } catch (error) {
    return { error: "Failed to fetch form fields." };
  }
}

// 2. Save the entire form structure to Database
export async function saveFormFields(fields: any[]) {
  await requireAdmin();
  
  try {
    // Transaction: Delete old form layout and insert the new fully updated layout
    await prisma.$transaction([
      prisma.formField.deleteMany({}), // Clear old fields
      prisma.formField.createMany({
        data: fields.map((f: any, index: number) => ({
          fieldName: f.fieldName || `field_${Date.now()}_${index}`,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          options: f.options,
          isRequired: f.isRequired,
          isActive: true,
          orderIndex: index // Maintains the order you set in UI
        }))
      })
    ]);

    revalidatePath("/"); // Update the student frontend instantly
    revalidatePath("/admin");
    return { success: true, message: "Form successfully published! Students will now see this exact form." };
  } catch (error) {
    console.error(error);
    return { error: "Failed to save form structure to database." };
  }
}

// 3. GET REAL PENDING EXECUTIVES
export async function getPendingExecutives() {
  await requireAdmin();
  try {
    const users = await prisma.user.findMany({
      where: { 
        role: "EXECUTIVE",
        isApproved: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });
    return { success: true, data: users };
  } catch (error) {
    return { error: "Failed to fetch pending executives." };
  }
}

// 4. APPROVE/REJECT EXECUTIVE
export async function updateExecutiveApproval(userId: string, isApproved: boolean) {
  await requireAdmin();
  try {
    if (isApproved) {
      await prisma.user.update({
        where: { id: userId },
        data: { isApproved: true }
      });
    } else {
      // If rejected, either revert to STUDENT or delete the account
      await prisma.user.update({
        where: { id: userId },
        data: { role: "STUDENT", isApproved: true } 
      });
    }
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return { error: "Failed to update executive status." };
  }
}