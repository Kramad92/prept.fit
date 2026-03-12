import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured. Add it to your environment variables.");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Prept <onboarding@resend.dev>";

export async function sendInquiryNotification({
  to,
  businessName,
  inquiryName,
  inquiryEmail,
  inquiryMessage,
}: {
  to: string;
  businessName: string;
  inquiryName: string;
  inquiryEmail: string;
  inquiryMessage: string;
}) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `New inquiry from ${inquiryName} — ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111827; margin-bottom: 8px;">New Inquiry</h2>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
          You received a new inquiry on your ${businessName} landing page.
        </p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${inquiryName}</p>
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${inquiryEmail}</p>
          <p style="margin: 0;"><strong>Message:</strong><br/>${inquiryMessage}</p>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          Reply to this inquiry from your Prept dashboard under Settings → Inquiries.
        </p>
      </div>
    `,
  });
}

export async function sendInviteEmail({
  to,
  clientName,
  coachName,
  businessName,
  inviteUrl,
}: {
  to: string;
  clientName: string;
  coachName: string;
  businessName: string;
  inviteUrl: string;
}) {
  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${coachName} invited you to ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111827; margin-bottom: 8px;">You're invited!</h2>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
          Hi ${clientName},
        </p>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
          <strong>${coachName}</strong> has invited you to join <strong>${businessName}</strong> on Prept. You'll be able to view your workouts, meal plans, track habits, and more.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #84CC16; color: #0F172A; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 16px 0;">
          Set Up Your Account
        </a>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
          This link expires in 48 hours. If you didn't expect this invitation, you can ignore this email.
        </p>
      </div>
    `,
  });
}
