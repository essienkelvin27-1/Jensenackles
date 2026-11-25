import "server-only";

import nodemailer from "nodemailer";

export async function sendNotification(to: string, subject: string, message: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;
  if (!host || !user || !password || !from || !process.env.SMTP_PORT) {
    return {
      sent: false,
      warning: "Email notifications are not configured (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM are required).",
    };
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { sent: false, warning: "Email notifications are not configured: SMTP_PORT must be a valid port number." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });
    await transporter.sendMail({ from, to, subject, text: message });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      warning: `Email delivery failed: ${error instanceof Error ? error.message : "unknown provider error"}`,
    };
  }
}
