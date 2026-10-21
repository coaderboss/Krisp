import nodemailer from "nodemailer";

// --- SINGLETON TRANSPORTER (Optimizes Server Memory & SMTP Quota) ---
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendVerificationEmail = async (email: string, token: string) => {
  const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const confirmLink = `${domain}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"CyberKrisp Security" <${process.env.GMAIL_EMAIL}>`,
    to: email,
    subject: "Action Required: Verify Your Email - Student Portal",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0F2547; max-w: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0F2547; margin-bottom: 16px;">Welcome to CyberKrisp!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Your account has been created successfully. Please verify your email address to complete the registration process:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmLink}" style="display: inline-block; padding: 14px 28px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #64748B; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          This secure link will expire in 1 hour. If you did not create an account, please ignore this email.
        </p>
      </div>
    `,
  });
};

export const sendTwoFactorTokenEmail = async (email: string, token: string) => {
  await transporter.sendMail({
    from: `"CyberKrisp Admin Security" <${process.env.GMAIL_EMAIL}>`,
    to: email,
    subject: "🔒 2FA Code - Admin Portal Access",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0F2547; max-w: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0F2547; margin-bottom: 16px;">Admin Authentication Required</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Your Two-Factor Authentication code for the CyberKrisp Admin portal is provided below:
        </p>
        <div style="margin: 24px 0; padding: 16px; background-color: #F1F5F9; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
          <h1 style="letter-spacing: 6px; color: #2563EB; margin: 0; font-size: 32px;">${token}</h1>
        </div>
        <p style="font-size: 12px; color: #64748B; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          This code will expire in 10 minutes. If you did not initiate this request, please change your password immediately and notify the system administrator.
        </p>
      </div>
    `,
  });
};