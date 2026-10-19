"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";

// Guard for Admin Operations
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN" && session?.user?.role !== "EXECUTIVE") {
    throw new Error("Unauthorized: Appropriate rights required.");
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

export async function updateExecutiveApproval(userId: string, isApproved: boolean) {
  await requireAdmin();
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "User not found." };

    if (isApproved) {
      await prisma.user.update({
        where: { id: userId },
        data: { isApproved: true }
      });

      // Send Approval Email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
      });

      await transporter.sendMail({
        from: `"Club Admin" <${process.env.GMAIL_EMAIL}>`,
        to: user.email,
        subject: "✅ Executive Access Approved",
        html: `
          <div style="font-family: Arial; padding: 20px;">
            <h2>Welcome to the Core Team, ${user.name}!</h2>
            <p>Your request for Executive privileges has been approved by the Supreme Admin.</p>
            <p>You can now log in using your exact Name, Email, and Password.</p>
          </div>
        `,
      });
    } else {
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