"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { transporter } from "@/lib/mail";

// Guard for Admin Operations
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN" && session?.user?.role !== "EXECUTIVE") {
    throw new Error("Unauthorized: Appropriate rights required.");
  }
  return session;
}

// Guard ONLY for Supreme Admin
async function requireSupremeAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CLUB_ADMIN") {
    throw new Error("Security Alert: Only Supreme Admin can perform this action.");
  }
  return session;
}

// 1. Fetch current form questions from the New Architecture
export async function getFormFields() {
  try {
    const fields = await prisma.formQuestion.findMany({
      orderBy: { orderIndex: 'asc' }
    });
    return { success: true, data: fields };
  } catch (error) {
    return { error: "Failed to fetch form fields." };
  }
}

// 2. Save the entire form structure to Database
export async function saveFormFields(fields: any[]) {
  await requireSupremeAdmin(); // 🟢 FIX: Maker-Checker Security Bypass - Only Admin can directly publish!
  
  const highlightedCount = fields.filter((f: any) => f.isHighlighted).length;
  if (highlightedCount > 4) {
    return { error: "Validation Error: You can pin a maximum of 4 fields to the dashboard." };
  }
  
  try {
    // 💡 FIX: For Multi-form setup, we need the exact Form ID from frontend payload, 
    // but to preserve the existing signature temporarily, we'll fetch the targeted form 
    // or rely on a wrapper function. Since this currently targets a generic active form:
    let activeForm = await prisma.form.findFirst({
      where: { isActive: true }
    });

    if (!activeForm) {
      activeForm = await prisma.form.create({
        data: {
          title: "Master Form: Weekly Bulletin",
          description: "Live application form",
          isActive: true,
          isMaster: true,
          formMode: "QUEUE",
          hasDeclaration: true,
          declarationText: "I hereby declare that all information provided is accurate to the best of my knowledge."
        }
      });
    } else if (!activeForm.isMaster) {
      activeForm = await prisma.form.update({
        where: { id: activeForm.id },
        data: { isMaster: true }
      });
    }

    // 🟢 FIX: Match Schema exactly
    await prisma.$transaction([
      prisma.formQuestion.deleteMany({ where: { formId: activeForm.id } }),
      prisma.formQuestion.createMany({
        data: fields.map((f: any, index: number) => ({
          formId: activeForm.id,
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

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: "Form successfully published! Highlights updated on Dashboard." };
  } catch (error) {
    console.error("Save Form Error:", error);
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
  await requireSupremeAdmin();
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "User not found." };

    if (isApproved) {
      await prisma.user.update({
        where: { id: userId },
        data: { isApproved: true }
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