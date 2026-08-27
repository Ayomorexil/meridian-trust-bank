// Email delivery, configured entirely through environment variables — never
// hardcode credentials here. If SMTP isn't configured (the default for local
// dev / this demo), emails are logged to the console instead of sent, so you
// can verify every notification fires correctly without needing real SMTP
// credentials or risking sending real mail.
//
// To enable real delivery, set in your .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
// Works with any standard SMTP provider (SendGrid, Postmark, Mailgun, SES,
// even a personal Gmail app password for testing).

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null; // package not installed — falls back to dev-log mode below
}

const isConfigured = !!(
  nodemailer &&
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * @param {{to: string, subject: string, html?: string, text?: string}} params
 */
async function sendEmail({ to, subject, html, text }) {
  if (!isConfigured) {
    console.log(`\n[email:DEV MODE — not actually sent]\n  To: ${to}\n  Subject: ${subject}\n  ${text || ''}\n`);
    return { simulated: true, to, subject };
  }

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Meridian Trust (Demo) <no-reply@meridiantrust.demo>',
    to,
    subject,
    html,
    text,
  });
}

module.exports = { sendEmail, isConfigured };
