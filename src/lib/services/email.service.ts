import { Resend } from "resend";
import { logger } from "@/lib/logger";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Trishul Beats <noreply@trishulbeats.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const emailService = {
  async sendPasswordResetEmail(
    to: string,
    token: string,
    name: string
  ): Promise<void> {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to,
        subject: "Reset your Trishul Beats password",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Reset your password</h2>
            <p>Hi ${escapeHtml(name)},</p>
            <p>We received a request to reset your password. Click the button below to set a new one:</p>
            <p style="text-align: center; margin: 24px 0;">
              <a href="${resetUrl}" style="background: #c2410c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Reset Password
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">Trishul Beats</p>
          </div>
        `,
      });
    } catch (error) {
      logger.error("Failed to send password reset email", { to, error });
      throw new Error("Failed to send password reset email");
    }
  },

  async sendContactFormEmail(
    name: string,
    email: string,
    subject: string,
    message: string
  ): Promise<void> {
    const adminEmail = process.env.CONTACT_EMAIL || "contact@trishulbeats.com";

    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: adminEmail,
        replyTo: email,
        subject: `[Contact Form] ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
            <h2>New Contact Form Submission</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 80px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(name)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Subject</td><td style="padding: 8px 0;">${escapeHtml(subject)}</td></tr>
            </table>
            <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
            <div style="white-space: pre-wrap; color: #333; line-height: 1.6;">${escapeHtml(message)}</div>
          </div>
        `,
      });
    } catch (error) {
      logger.error("Failed to send contact form email", { email, error });
      throw new Error("Failed to send email");
    }
  },
};
