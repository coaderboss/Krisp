"use server";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { sendVerificationEmail } from "@/lib/mail";

export async function registerStudent(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) return { error: "All fields are required!" };

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (existingUser) {
      if (existingUser.emailVerified) {
        // If user exists AND is verified, block them
        return { error: "This email is already verified and registered! Please login." };
      } else {
        // If user exists BUT is not verified, update password and resend token
        await prisma.user.update({
          where: { email },
          data: { password: hashedPassword, name }
        });
        // Delete any old unused tokens for this email
        await prisma.verificationToken.deleteMany({ where: { email } });
      }
    } else {
      // Completely new user
      await prisma.user.create({
        data: { name, email, password: hashedPassword, role: "STUDENT" }
      });
    }

    // Generate new unique Token (1 hour expiry)
    const token = uuidv4();
    const expires = new Date(new Date().getTime() + 3600 * 1000);

    await prisma.verificationToken.create({
      data: { email, token, expires }
    });

    // Send the email using Nodemailer
    await sendVerificationEmail(email, token);

    return { success: true, message: "Verification email has been sent. Please check your inbox!" };
  } catch (error) {
    console.error(error);
    return { error: "Registration failed. Please try again." };
  }
}

export async function loginStudent(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (!existingUser || !existingUser.password) {
      return { error: "Account nahi mila!" };
    }

    // Security Check: Email verify hua hai ya nahi
    if (!existingUser.emailVerified) {
      return { error: "Kripya login karne se pehle apna email verify karein. Inbox check karein." };
    }

    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ya password galat hai!" };
    }
    throw error;
  }
}

// ... baaki Admin Login ka code waisa hi rahega

export async function loginAdmin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email aur Password dono zaroori hain!" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "CLUB_ADMIN") {
    return { error: "Access Denied: Ye account Club Admin nahi hai!" };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ya password galat hai!" };
    }
    throw error;
  }
}