"use server";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { sendVerificationEmail } from "@/lib/mail";
import { sendTwoFactorTokenEmail } from "@/lib/mail";

export async function registerStudent(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
 const password = formData.get("password") as string;

  // Strong Password Check: Min 8, Max 25 chars, 1 Uppercase, 1 Special Char
  const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,25}$/;
  if (!strongPasswordRegex.test(password)) {
    return { 
      error: "Password 8 se 25 characters ke beech hona chahiye, jisme 1 Capital Letter aur 1 Special Character (!@#$&*) zaroori hai." 
    };
  }

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

// Replace inside src/actions/auth.ts

export async function generateAdminOTP(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Both email and password are required to proceed." };

  // --- SECURITY FIX: Supreme Admin Lockout Fix & Strict Verification ---
  if (email === process.env.ADMIN_EMAIL) {
    if (password !== process.env.ADMIN_PASSWORD) return { error: "Invalid credentials." };
  } else {
    // Normal Club Admin verification
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== "CLUB_ADMIN") {
      return { error: "Access Denied: This account lacks administrative privileges." };
    }
    if (!user.password || !(await bcrypt.compare(password, user.password))) {
      return { error: "Invalid credentials." };
    }
  }

  try {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(new Date().getTime() + 10 * 60 * 1000); 

    await prisma.twoFactorToken.deleteMany({ where: { email } });
    await prisma.twoFactorToken.create({ data: { email, token, expires } });
    await sendTwoFactorTokenEmail(email, token);

    return { success: true, message: "A secure verification code has been dispatched to your email." };
  } catch (error) {
    return { error: "Failed to dispatch the verification code. Please try again." };
  }
}

export async function verifyAdminOTPAndLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const otp = formData.get("otp") as string;

  if (!otp) return { error: "A verification code is required." };

  const existingToken = await prisma.twoFactorToken.findFirst({
    where: { email, token: otp }
  });

  if (!existingToken) {
    return { error: "The provided verification code is invalid." };
  }

  if (new Date(existingToken.expires) < new Date()) {
    return { error: "The verification code has expired. Please request a new one." };
  }

  await prisma.twoFactorToken.delete({ where: { id: existingToken.id } });

  try {
    await signIn("credentials", { email, password, redirectTo: "/admin" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Final authentication phase failed. Please verify your credentials." };
    }
    throw error;
  }
}