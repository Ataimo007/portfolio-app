import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { database } from "@/lib/db";
import {
  body,
  handle,
  json,
  limit,
  sameOrigin,
  PortalError,
} from "@/lib/portal-http";
import { readMail, deliverMail, mailAvailable } from "@/lib/mail";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireOwner();
    await limit("mail-read:" + user.clientId, 120);
    const params = new URL(request.url).searchParams;
    const view = z
      .enum(["inbox", "sent"])
      .parse(params.get("folder") || "inbox");
    if (params.get("status")) return json({ available: mailAvailable() });
    const uid = params.has("uid")
      ? z.coerce
          .number()
          .int()
          .positive()
          .max(4294967295)
          .parse(params.get("uid"))
      : undefined;
    return json(await readMail(view, uid, params.get("validity") || undefined));
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireOwner();
    await limit("mail-send:" + user.clientId, 10, 3600);
    const input = z
      .object({
        nonce: z.string().uuid(),
        to: z.email().max(254),
        subject: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .refine((v) => !/[\r\n]/.test(v)),
        text: z.string().trim().min(1).max(8000),
      })
      .parse(await body(request));
    const id = `<${randomUUID()}@ataimo.com>`;
    const hash = createHash("sha256")
      .update(JSON.stringify([input.to, input.subject, input.text]))
      .digest("hex");
    const inserted = await database().query(
      "INSERT INTO mail_sends(id,client_id,message_id,payload_hash,status) VALUES($1,$2,$3,$4,'sending') ON CONFLICT DO NOTHING RETURNING id",
      [input.nonce, user.clientId, id, hash],
    );
    if (!inserted.rowCount) {
      const previous = await database().query(
        "SELECT status,sent_copy,payload_hash FROM mail_sends WHERE id=$1 AND client_id=$2",
        [input.nonce, user.clientId],
      );
      if (previous.rows[0]?.payload_hash !== hash)
        throw new PortalError(409, "This retry belongs to a different email.");
      if (previous.rows[0]?.status === "sent")
        return json({
          message: previous.rows[0].sent_copy
            ? "Email sent and saved to Sent."
            : "Email sent. A Sent copy could not be saved; do not resend.",
        });
      throw new PortalError(
        409,
        "Delivery is already in progress or uncertain. Check Sent before sending another copy.",
      );
    }
    try {
      const copied = await deliverMail(input.to, input.subject, input.text, id);
      await database().query(
        "UPDATE mail_sends SET status='sent',sent_copy=$2 WHERE id=$1",
        [input.nonce, copied],
      );
      return json({
        message: copied
          ? "Email sent and saved to Sent."
          : "Email sent. A Sent copy could not be saved; do not resend.",
      });
    } catch {
      await database().query(
        "UPDATE mail_sends SET status='uncertain' WHERE id=$1",
        [input.nonce],
      );
      throw new PortalError(
        503,
        "Email delivery could not be confirmed. Check Sent and your mail client before trying again.",
      );
    }
  });
}
