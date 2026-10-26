"use server";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { sendVerificationEmail } from "@/lib/mail";
import { sendTwoFactorTokenEmail } from "@/lib/mail";
import crypto from "crypto";
import { transporter } from "@/lib/mail";

export async function registerStudent(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Strong Password Check: Min 8, Max 25 chars, 1 Uppercase, 1 Special Char
  const strongPasswordRegex = /^(?=.*[A-Z])(?=.*[!@#$\%^&*]).{8,25}$/;
  if (!strongPasswordRegex.test(password)) {
    return { 
      error: "Password must be between 8 and 25 characters, and include at least 1 uppercase letter and 1 special character (!@#$%^&*)." 
    };
  }

  if (!name || !email || !password) return { error: "All fields are required!" };

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const hashedPassword = await bcrypt.hash(password, 10);
    
    if (existingUser) {
      if (existingUser.emailVerified) {
        // If user exists AND is verified, block them
        return { error: "This email is already verified and registered! Please log in." };
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
    console.error("Registration Error:", error);
    return { error: "Registration failed. Please try again." };
  }
}

export async function loginStudent(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (!existingUser || !existingUser.password) {
      return { error: "Account not found. Please register first." };
    }

    // Security Check: Verify if the email is authenticated
    if (!existingUser.emailVerified) {
      return { error: "Please verify your email before logging in. Check your inbox for the verification link." };
    }

    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function generateAdminOTP(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Both email and password are required to proceed." };

  let isEnvAdmin = false;

  // --- SECURITY FIX: Supreme Admin Lockout Fix & Strict Verification ---
  if (email === process.env.ADMIN_EMAIL) {
    if (password !== process.env.ADMIN_PASSWORD) return { error: "Invalid credentials." };
    isEnvAdmin = true;
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
    // 💡 MASTER KEY LOGIC: .env admin ke liye OTP hamesha 123456 rahega
    const token = isEnvAdmin ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(new Date().getTime() + 10 * 60 * 1000); 

    await prisma.twoFactorToken.deleteMany({ where: { email } });
    await prisma.twoFactorToken.create({ data: { email, token, expires } });

    // Agar fake .env admin hai toh mail bhejne ka function call hi mat karo
    if (!isEnvAdmin) {
      await sendTwoFactorTokenEmail(email, token);
    }

    return { 
      success: true, 
      message: isEnvAdmin 
        ? "Enter your OTP." 
        : "A secure verification code has been dispatched to your email." 
    };
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

export async function sendPasswordResetLink(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    if (!email) return { error: "Email address is required." };

    // 1. Locate User
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Security Mechanism: Return success even if user is not found to prevent email enumeration attacks
    if (!user) {
      return { success: true }; 
    }

    // 2. Generate Secure Token (15 minutes expiry)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); 

    // 3. Persist token in the database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // 4. Construct Reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    // 5. Production SMTP Dispatch
    const mailOptions = {
      from: `"CyberKrisp Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Action Required: Reset Your Password",
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0F2547; margin-bottom: 16px;">Password Reset Request</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            We received a request to reset your password for the CyberKrisp Student Portal. Click the secure link below to set a new password. <strong>This link is valid for exactly 15 minutes.</strong>
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background-color: #2563EB; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset My Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            If you did not request this password reset, please ignore this email or contact the club administrators. Your account remains secure.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };

  } catch (error) {
    console.error("Forgot Password SMTP Error:", error);
    return { error: "Failed to dispatch the reset email. Please try again later." };
  }
}

export async function resetPassword(formData: FormData) {
  try {
    const token = formData.get("token") as string;
    const password = formData.get("password") as string;

    if (!token || !password) return { error: "Invalid request payload." };

    // 1. Find user with matching token that has NOT expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() } // Ensures current time is less than expiry
      }
    });

    if (!user) {
      return { error: "This reset link is invalid or has expired. Please request a new one." };
    }

    // 2. Hash the new password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Update the user record and nullify the token to prevent reuse
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return { success: true, message: "Password updated successfully. You can now log in." };

  } catch (error) {
    console.error("Password Reset Execution Error:", error);
    return { error: "An error occurred while resetting your password. Please try again." };
  }
}