"use server";

import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import { hash } from "bcryptjs"; // Assuming you use bcryptjs for passwords
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

// --- STRONG PASSWORD CHECK YAHAN LAGA RAHE HAIN ---
  const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{20,}$/;
  if (!strongPasswordRegex.test(password)) {
    return { 
      error: "Password kam se kam 20 characters ka hona chahiye aur usme 1 capital letter & 1 special character hona zaroori hai." 
    };
  }
  // --------------------------------------------------

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
    from: `"Cybersecurity Club" <${process.env.GMAIL_EMAIL}>`,
    to: email,
    subject: "Verify Your Executive Registration",
    html: `
      <div style="font-family: Arial; padding: 20px; text-align: center;">
        <h2>Verify Your Email</h2>
        <p>Click the button below to verify your email address. Keep your registration tab open!</p>
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px;">Verify Email</a>
      </div>
    `,
  });

  return { success: true, userId: newUser.id, email: newUser.email };
}

// Frontend use karega continuously check karne ke liye
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

  if (!name || !email || !password) return { error: "Name, Email, aur Password teeno zaroori hain." };

  // 1. Find User by Email
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || user.role !== "EXECUTIVE") {
    return { error: "Access Denied: Executive account nahi mila." };
  }

  // 2. Exact Name Match (Case insensitive check)
  if (user.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
    return { error: "Invalid Credentials: Name match nahi hua." };
  }

  // 3. Approval Check
  if (!user.isApproved) {
    return { error: "Account abhi Supreme Admin dwara approve nahi hua hai." };
  }

  // Note: Password validation will happen in the final NextAuth signIn step, 
  // but we can generate OTP now if the basic fields match.
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
      from: `"Executive Security" <${process.env.GMAIL_EMAIL}>`,
      to: email,
      subject: "🔒 Your Executive Login OTP",
      html: `<div style="font-family: Arial; padding: 20px;">
              <h2>Executive Authentication</h2>
              <p>Aapka login OTP niche diya gaya hai:</p>
              <h1 style="letter-spacing: 5px; color: #2563EB;">${token}</h1>
            </div>`,
    });

    return { success: true, message: "OTP sent to your email!" };
  } catch (error) {
    return { error: "OTP bhejne mein error aayi." };
  }
}

export async function verifyExecutiveOTPAndLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const otp = formData.get("otp") as string;

  if (!otp) return { error: "OTP zaroori hai!" };

  const existingToken = await prisma.twoFactorToken.findFirst({
    where: { email, token: otp }
  });

  if (!existingToken) return { error: "Invalid OTP!" };
  if (new Date(existingToken.expires) < new Date()) return { error: "OTP expire ho gaya hai." };

  await prisma.twoFactorToken.delete({ where: { id: existingToken.id } });

  try {
    // Final Secure Login via NextAuth credentials provider
    await signIn("credentials", { email, password, redirectTo: "/executive/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Authentication failed. Password galat ho sakta hai." };
    }
    throw error;
  }
}