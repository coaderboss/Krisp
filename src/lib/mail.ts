import nodemailer from "nodemailer";

// --- FIX: SINGLETON TRANSPORTER (Saves Server Memory & SMTP Quota) ---
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

export const sendTwoFactorTokenEmail = async (email: string, token: string) => {
  await transporter.sendMail({
    from: `"Cybersecurity Club Admin Security" <${process.env.GMAIL_EMAIL}>`,
    to: email,
    subject: "🔒 2FA Code - Admin Portal Access",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #0F2547;">
        <h2>Admin Authentication Required</h2>
        <p>Aapke Club Admin portal mein login karne ke liye Two-Factor Authentication code niche diya gaya hai:</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #F1F5F9; border-radius: 8px; text-align: center;">
          <h1 style="letter-spacing: 5px; color: #2563EB; margin: 0;">${token}</h1>
        </div>
        <p style="font-size: 12px; color: #64748B;">Yeh code 10 minute mein expire ho jayega. Agar yeh request aapne nahi ki hai, toh turant apna password change karein.</p>
      </div>
    `,
  });
};