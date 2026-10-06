import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { database, transaction } from "@/lib/db";
import {
  body,
  handle,
  json,
  limit,
  PortalError,
  sameOrigin,
} from "@/lib/portal-http";
import { event, jobAccess, owners } from "@/lib/portal";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireSession();
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    await jobAccess(id, user);
    const after = z.coerce
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .parse(new URL(request.url).searchParams.get("after") || 0);
    const messages = await database().query(
      "SELECT m.id,m.sequence::text,m.body,m.created_at,p.display_name AS sender_name,(m.sender_id=$3) AS mine FROM messages m JOIN client_profiles p ON p.id=m.sender_id WHERE m.job_id=$1 AND m.sequence>$2 ORDER BY m.sequence LIMIT 100",
      [id, after, user.clientId],
    );
    return json({ messages: messages.rows });
  });
}
export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireSession(true);
    await limit("chat:" + user.clientId, 40);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const input = z
      .object({
        body: z.string().trim().min(1).max(4000),
        nonce: z.string().uuid(),
      })
      .parse(await body(request));
    await transaction(async (client) => {
      const job = await jobAccess(id, user, client);
      if (job.status === "cancelled" || job.status === "completed")
        throw new PortalError(
          409,
          "This job is closed. Its conversation is read-only.",
        );
      const inserted = await client.query(
        "INSERT INTO messages(job_id,sender_id,body,client_nonce) VALUES($1,$2,$3,$4) ON CONFLICT(sender_id,client_nonce) DO NOTHING RETURNING id",
        [id, user.clientId, input.body, input.nonce],
      );
      if (inserted.rowCount)
        await event(
          client,
          "message.created",
          id,
          user.isOwner ? [job.client_id] : await owners(client),
        );
      else {
        const existing = await client.query(
          "SELECT job_id,body FROM messages WHERE sender_id=$1 AND client_nonce=$2",
          [user.clientId, input.nonce],
        );
        if (
          existing.rows[0]?.job_id !== id ||
          existing.rows[0]?.body !== input.body
        )
          throw new PortalError(
            409,
            "This message retry key belongs to another message.",
          );
      }
    });
    return json({ message: "Message saved." }, 201);
  });
}
