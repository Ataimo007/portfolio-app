import nodemailer from "nodemailer";
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function notificationMail(row, origin) {
  const unsubscribe = new URL("/email-preferences", origin);
  unsubscribe.searchParams.set("token", row.unsubscribe_token);
  const endpoint = new URL("/api/email/unsubscribe", origin);
  endpoint.searchParams.set("token", row.unsubscribe_token);
  const titles = {
    welcome: "Welcome to Ataimo",
    "account.login": "Someone signed in to your portfolio",
    "message.created": "You have a new private message",
  };
  const subject = titles[row.kind];
  const text =
    row.kind === "welcome"
      ? `Welcome, ${row.payload.name || "there"}. Your workspace is ready. Request a consultation, track your engagements and chat privately with Ataimo.`
      : row.kind === "account.login"
        ? `${row.payload.name || "A client"}${row.payload.email ? " (" + row.payload.email + ")" : ""} signed in to your portfolio. Open your dashboard to review activity.`
        : `${row.payload.name || "A client"} sent you a private message. Sign in to read it securely.`;
  const path = row.kind === "welcome" ? "/portal" : row.payload.url;
  const url = new URL(
    typeof path === "string" && /^\/(admin|portal)(\?|$)/.test(path)
      ? path
      : "/portal",
    origin,
  ).href;
  return {
    from: "Ataimo <hello@ataimo.com>",
    replyTo: "contact@ataimo.com",
    to: row.email,
    subject,
    messageId: `<notification-${row.id}@ataimo.com>`,
    text: `${text}\n\nOpen your workspace: ${url}\n\nUnsubscribe from optional portfolio emails: ${unsubscribe.href}\nThis does not change your account, security emails or in-app notifications.`,
    html: `<div style="font-family:Arial,sans-serif;background:#f5f3ed;padding:32px;color:#252a30"><div style="max-width:560px;margin:auto;background:#fffef9;padding:32px;border:1px solid #dcdcd2"><p>ATAIMO EDEM</p><h1 style="font-size:28px">${escape(subject)}</h1><p style="line-height:1.7">${escape(text)}</p><p><a style="display:inline-block;background:#2447b9;color:white;padding:12px 24px;text-decoration:none" href="${escape(url)}">Open your workspace</a></p><hr style="border:0;border-top:1px solid #dcdcd2;margin:32px 0"><p style="font-size:13px;line-height:1.6">Optional portfolio emails. Your account and in-app notifications remain available.</p><a style="color:#2447b9;font-size:13px" href="${escape(unsubscribe.href)}">Unsubscribe from emails</a></div></div>`,
    headers: {
      "List-Unsubscribe": `<${endpoint.href}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
let transport;
export async function sendPendingEmail(db, sender) {
  if (
    !sender &&
    (!process.env.MAIL_HOST ||
      !process.env.MAIL_USER ||
      !process.env.MAIL_PASSWORD)
  )
    return;
  transport ||= sender
    ? undefined
    : nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: 465,
        secure: true,
        auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
      });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT d.*,p.unsubscribe_token,p.unsubscribed_at FROM email_deliveries d JOIN email_preferences p ON p.email=d.email WHERE d.delivered_at IS NULL AND d.skipped_at IS NULL AND d.attempts<6 AND d.next_attempt_at<=now() ORDER BY d.created_at FOR UPDATE OF d SKIP LOCKED LIMIT 1",
    );
    const row = result.rows[0];
    if (row) {
      if (row.unsubscribed_at)
        await client.query(
          "UPDATE email_deliveries SET skipped_at=now() WHERE id=$1",
          [row.id],
        );
      else
        try {
          const mail = notificationMail(
            row,
            process.env.SITE_URL || "https://ataimo.com",
          );
          await (sender ? sender(mail) : transport.sendMail(mail));
          await client.query(
            "UPDATE email_deliveries SET delivered_at=now() WHERE id=$1",
            [row.id],
          );
        } catch {
          await client.query(
            "UPDATE email_deliveries SET attempts=attempts+1,next_attempt_at=now()+least(3600,power(2,attempts+5))*interval '1 second' WHERE id=$1",
            [row.id],
          );
          console.error(
            "Notification email deferred; delivery retained for retry",
          );
        }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
