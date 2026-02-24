const { Resend } = require("resend");

// Initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function isSmtpConfigured() {
  return Boolean(resend);
}

async function sendMail({ to, subject, text, attachments }) {
  if (!isSmtpConfigured()) {
    console.log("[email:dev]", { to, subject, text, hasAttachments: !!attachments });
    return { messageId: "dev-log" };
  }

  try {
    const payload = {
      from: process.env.SMTP_FROM || "Felicity EMS <onboarding@resend.dev>",
      to,
      subject,
      text,
    };

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content || Buffer.from(a.content, a.encoding).toString('base64'),
      }));
    }

    const data = await resend.emails.send(payload);
    return data;
  } catch (err) {
    console.error("[email] Resend API error:", err);
    throw err;
  }
}

module.exports = { sendMail };
