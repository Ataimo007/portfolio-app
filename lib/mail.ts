import "server-only";
import { configuredMailboxes } from "../workers/mail-accounts.mjs";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser } from "mailparser";
import { PortalError } from "./portal-http";
export const mailAvailable = () => configuredMailboxes().length > 0;
export const mailAccounts = () =>
  configuredMailboxes().map(({ id, address }) => ({ id, address }));
export function mailAccount(id = "ataimo") {
  const account = configuredMailboxes().find((item) => item.id === id);
  if (!account) throw new PortalError(400, "This mailbox is unavailable.");
  return account;
}
export async function mailbox<T>(
  run: (client: ImapFlow) => Promise<T>,
  accountId = "ataimo",
) {
  const account = mailAccount(accountId);
  const client = new ImapFlow({
    host: process.env.MAIL_HOST!,
    port: 993,
    secure: true,
    auth: { user: account.address, pass: account.password },
    logger: false,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
  });
  try {
    await client.connect();
    return await run(client);
  } finally {
    await client.logout().catch(() => {});
  }
}
export async function folder(client: ImapFlow, value: string) {
  if (value === "inbox") return "INBOX";
  const folders = await client.list();
  const sent = folders.find((item) => item.specialUse === "\\Sent");
  if (sent) return sent.path;
  if (!folders.some((item) => item.path === "Sent"))
    await client.mailboxCreate("Sent");
  return "Sent";
}
export async function readMail(
  view: string,
  uid?: number,
  validity?: string,
  accountId = "ataimo",
) {
  return mailbox(async (client) => {
    const path = await folder(client, view);
    const lock = await client.getMailboxLock(path);
    try {
      const state = client.mailbox;
      if (!state) throw new PortalError(503, "Mailbox unavailable.");
      const uidValidity = state.uidValidity.toString();
      if (uid) {
        if (validity !== uidValidity)
          throw new PortalError(
            409,
            "This mailbox changed. Refresh its message list.",
          );
        const message = await client.fetchOne(
          String(uid),
          { envelope: true, flags: true, size: true },
          { uid: true },
        );
        if (!message) throw new PortalError(404, "Email not found.");
        if ((message.size || 0) > 2_000_000)
          throw new PortalError(
            413,
            "This message is too large for the in-app reader. Open it in your mail client.",
          );
        const source = await client.fetchOne(
          String(uid),
          { source: true },
          { uid: true },
        );
        if (!source || !source.source)
          throw new PortalError(404, "Email not found.");
        const parsed = await simpleParser(source.source, {
          skipHtmlToText: false,
          skipImageLinks: true,
          skipTextToHtml: true,
        });
        await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
        return {
          uid,
          uidValidity,
          subject: parsed.subject || "(No subject)",
          from: parsed.from?.text || "",
          replyTo:
            parsed.replyTo?.value[0]?.address ||
            parsed.from?.value[0]?.address ||
            "",
          to: parsed.to && "text" in parsed.to ? parsed.to.text : "",
          date: parsed.date?.toISOString(),
          text: (
            parsed.text || "This message has no plain-text content."
          ).slice(0, 100000),
          attachments: parsed.attachments.map((a) => ({
            name: a.filename || "Attachment",
            size: a.size,
          })),
        };
      }
      const messages = [];
      if (state.exists) {
        for await (const message of client.fetch(
          `${Math.max(1, state.exists - 49)}:*`,
          { envelope: true, flags: true, uid: true, size: true },
        )) {
          messages.push({
            uid: message.uid,
            uidValidity,
            subject: message.envelope?.subject || "(No subject)",
            from:
              message.envelope?.from
                ?.map((a) => a.name || a.address)
                .join(", ") || "",
            date: message.envelope?.date
              ? new Date(message.envelope.date).toISOString()
              : undefined,
            unread: !message.flags?.has("\\Seen"),
            size: message.size,
          });
        }
      }
      return {
        messages: messages.reverse(),
        uidValidity,
        mailbox: mailAccount(accountId).address,
        accounts: mailAccounts(),
        total: state.exists,
      };
    } finally {
      lock.release();
    }
  }, accountId);
}
export async function deliverMail(
  to: string,
  subject: string,
  text: string,
  messageId: string,
  accountId = "ataimo",
) {
  const account = mailAccount(accountId);
  const options = {
    from: { name: "Ataimo Edem", address: account.address },
    to,
    subject,
    text,
    messageId,
  };
  const transport = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: account.address, pass: account.password },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    logger: false,
  });
  try {
    await transport.sendMail(options);
  } finally {
    transport.close();
  }
  let copied = false;
  try {
    const composer = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: "unix",
    });
    const composed = await composer.sendMail(options);
    await mailbox(async (client) => {
      await client.append(
        await folder(client, "sent"),
        composed.message as Buffer,
        ["\\Seen"],
      );
    }, accountId);
    copied = true;
  } catch {}
  return copied;
}
