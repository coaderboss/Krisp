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

// 1. Fetch ALL Forms with their full architecture
export async function getAllFormsAdmin() {
  await requireAdmin();
  try {
    const forms = await prisma.form.findMany({
      include: {
        questions: { orderBy: { orderIndex: 'asc' } }
      },
      orderBy: { createdAt: 'asc' }
    });
    return { success: true, data: forms };
  } catch (error) {
    return { error: "Failed to fetch system forms." };
  }
}

// 2. Save Complete Form Architecture (SPA Payload)
export async function saveCompleteForm(formId: string, formMeta: any, fields: any[]) {
  await requireSupremeAdmin();
  
  const highlightedCount = fields.filter((f: any) => f.isHighlighted).length;
  if (highlightedCount > 4) {
    return { error: "Validation Error: Maximum 4 fields can be pinned to the Vault." };
  }
  
  try {
    let targetForm = await prisma.form.findUnique({ where: { id: formId } });
    
    if (!targetForm) {
      targetForm = await prisma.form.create({
        data: {
          id: formId.startsWith("new_") ? undefined : formId,
          title: formMeta.title || "Untitled Form",
          description: formMeta.description || "",
          instructionText: formMeta.instructionText || "",
          isActive: formMeta.isActive ?? false,
          isMaster: formMeta.isMaster ?? false,
          execVaultAccess: formMeta.execVaultAccess ?? true,
          formMode: formMeta.formMode || "NORMAL",
          hasDeclaration: formMeta.hasDeclaration ?? false,
          declarationText: formMeta.declarationText || ""
        }
      });
    } else {
      targetForm = await prisma.form.update({
        where: { id: targetForm.id },
        data: {
          title: formMeta.title,
          description: formMeta.description,
          instructionText: formMeta.instructionText,
          isActive: formMeta.isActive,
          formMode: formMeta.formMode,
          hasDeclaration: formMeta.hasDeclaration,
          declarationText: formMeta.declarationText
        }
      });
    }

    // Replace all fields accurately
    await prisma.$transaction([
      prisma.formQuestion.deleteMany({ where: { formId: targetForm.id } }),
      prisma.formQuestion.createMany({
        data: fields.map((f: any, index: number) => ({
          formId: targetForm.id,
          fieldName: f.fieldName || `field_${Date.now()}_${index}`,
          fieldLabel: f.fieldLabel,
          fieldType: f.fieldType,
          options: f.options || [],
          isRequired: f.isRequired,
          isHighlighted: f.isHighlighted || false,
          placeholder: f.placeholder || "",
          maxLength: f.maxLength ? Number(f.maxLength) : null,
          isMultiSelect: f.isMultiSelect || false,
          orderIndex: index
        }))
      })
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return { success: true, message: "Form Architecture Published Successfully!" };
  } catch (error) {
    console.error("Save Form Error:", error);
    return { error: "Database transaction failed while saving form." };
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

// 🟢 NEW: PLUG & PLAY WORKFLOW ENGINE
export async function plugFormToWorkflow(formId: string) {
  await requireSupremeAdmin();
  try {
    // Transaction ensures only 1 form is connected at a time
    await prisma.$transaction([
      prisma.form.updateMany({ data: { isMaster: false, formMode: "EVENT" } }),
      prisma.form.update({ where: { id: formId }, data: { isMaster: true, formMode: "QUEUE" } })
    ]);
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: "Form successfully plugged into Presenter Pipeline!" };
  } catch (error) {
    return { error: "Failed to connect form to workflow." };
  }
}

// 🟢 NEW: UNPLUG FROM WORKFLOW ENGINE
export async function unplugFormFromWorkflow(formId: string) {
  await requireSupremeAdmin();
  try {
    await prisma.form.update({
      where: { id: formId },
      data: { isMaster: false, formMode: "EVENT" }
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true, message: "Form disconnected from Presenter Pipeline." };
  } catch (error) {
    return { error: "Failed to disconnect form." };
  }
}