"use server";

import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { hash } from "bcryptjs"; 
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function registerExecutive(formData: FormData) {
  const name = formData.get("name") as string;
  const rollNumber = formData.get("rollNumber") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !rollNumber || !email || !password) {
    return { error: "All fields are required." };
  }

  // --- STRICT PASSWORD VALIDATION ---
  const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[!@#$\%^&*]).{8,25}$/;
  if (!strongPasswordRegex.test(password)) {
    return { 
      error: "Password must be between 8 and 25 characters, and include at least 1 uppercase letter and 1 special character (!@#$%^&*)." 
    };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Email is already registered." };
  }

  const hashedPassword = await hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      rollNumber,
      password: hashedPassword,
      role: "EXECUTIVE",
      isApproved: false, // Requires admin approval
    }
  });

  // Generate Verification Token
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.verificationToken.create({
    data: {
      email,
      token,
      expires: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
    }
  });

  const verifyLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
  });

  await transporter.sendMail({
    from: `"CyberKrisp Security" <${process.env.GMAIL_EMAIL}>`,
    to: email,
    subject: "Action Required: Verify Your Executive Registration",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; max-w: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #0F2547;">Verify Your Email</h2>
        <p style="color: #475569; font-size: 15px;">Click the button below to verify your email address. Please keep your registration tab open.</p>
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold;">Verify Email</a>
      </div>
    `,
  });

  return { success: true, userId: newUser.id, email: newUser.email };
}

// Polling mechanism for frontend to check verification status
export async function checkVerificationStatus(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.emailVerified) {
    return { verified: true };
  }
  return { verified: false };
}

// --- EXECUTIVE LOGIN LOGIC ---
export async function generateExecutiveOTP(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Name, Email, and Password are all required." };
  }

  // 1. Find User by Email
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || user.role !== "EXECUTIVE") {
    return { error: "Access Denied: Executive account not found." };
  }

  // 2. Exact Name Match (Case insensitive check)
  if (user.name?.toLowerCase().trim() !== name.toLowerCase().trim()) {
    return { error: "Invalid Credentials: Name does not match the registered account." };
  }

  // 3. Approval Check
  if (!user.isApproved) {
    return { error: "Access Denied: Your account is pending approval from the Supreme Admin." };
  }

  try {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(new Date().getTime() + 10 * 60 * 1000); 

    await prisma.twoFactorToken.deleteMany({ where: { email } });
    await prisma.twoFactorToken.create({ data: { email, token, expires } });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_EMAIL, pass: process.env.GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"CyberKrisp Security" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: "🔒 Your Executive Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; max-w: 400px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0F2547;">Executive Authentication</h2>
          <p style="color: #475569; font-size: 14px;">Your secure login OTP is provided below. This code will expire in 10 minutes.</p>
          <h1 style="letter-spacing: 5px; color: #2563EB; background: #f1f5f9; padding: 15px; border-radius: 8px;">${token}</h1>
        </div>
      `,
    });

    return { success: true, message: "A secure verification code has been dispatched to your email." };
  } catch (error) {
    console.error("Executive OTP Dispatch Error:", error);
    return { error: "Failed to dispatch the verification code. Please try again." };
  }
}

export async function verifyExecutiveOTPAndLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const otp = formData.get("otp") as string;

  if (!otp) return { error: "Verification code is required." };

  const existingToken = await prisma.twoFactorToken.findFirst({
    where: { email, token: otp }
  });

  if (!existingToken) return { error: "The provided verification code is invalid." };
  
  if (new Date(existingToken.expires) < new Date()) {
    return { error: "The verification code has expired. Please request a new one." };
  }

  await prisma.twoFactorToken.delete({ where: { id: existingToken.id } });

  try {
    // Final Secure Login via NextAuth credentials provider
    await signIn("credentials", { email, password, redirectTo: "/executive/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Authentication failed. Invalid credentials provided." };
    }
    throw error;
  }
}