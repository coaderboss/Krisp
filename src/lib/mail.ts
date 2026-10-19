import nodemailer from "nodemailer";

export const sendVerificationEmail = async (email: string, token: string) => {
  const domain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const confirmLink = `${domain}/verify-email?token=${token}`;

  // Gmail SMTP Server connect karna
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Mail bhejna
  await transporter.sendMail({
    from: `"Cybersecurity Club CSJMU" <${process.env.GMAIL_EMAIL}>`,
    to: email,
    subject: "🔐 Verify your Email - Student Presenter Portal",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F2547;">
        <h2>Welcome to the Cybersecurity Club!</h2>
        <p>Aapka account create ho gaya hai. Login karne se pehle kripya apna email verify karein:</p>
        <a href="${confirmLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify Email Address</a>
        <p style="margin-top: 20px; font-size: 12px; color: #64748B;">Ye link 1 ghante mein expire ho jayega.</p>
      </div>
    `,
  });
};