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
import { owners } from "@/lib/portal";
async function access(
  id: string,
  user: Awaited<ReturnType<typeof requireSession>>,
) {
  const result = await database().query(
    "SELECT * FROM conversations WHERE id=$1 AND ($2::boolean OR client_id=$3)",
    [id, user.isOwner, user.clientId],
  );
  if (!result.rowCount) throw new PortalError(404, "Conversation not found.");
  return result.rows[0];
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireSession();
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    await access(id, user);
    const after = z.coerce
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .parse(new URL(request.url).searchParams.get("after") || 0);
    const result = await database().query(
      "SELECT m.id,m.sequence::text,m.body,m.created_at,p.display_name AS sender_name,m.sender_id=$3 AS mine FROM conversation_messages m JOIN client_profiles p ON p.id=m.sender_id WHERE conversation_id=$1 AND sequence>$2 ORDER BY sequence LIMIT 100",
      [id, after, user.clientId],
    );
    return json({ messages: result.rows });
  });
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireSession(true);
    await limit("direct-chat:" + user.clientId, 40);
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const conversation = await access(id, user);
    const input = z
      .object({
        body: z.string().trim().min(1).max(4000),
        nonce: z.string().uuid(),
      })
      .parse(await body(request));
    await transaction(async (client) => {
      const result = await client.query(
        "INSERT INTO conversation_messages(conversation_id,sender_id,body,client_nonce) VALUES($1,$2,$3,$4) ON CONFLICT(sender_id,client_nonce) DO NOTHING RETURNING id",
        [id, user.clientId, input.body, input.nonce],
      );
      if (!result.rowCount) {
        const old = await client.query(
          "SELECT conversation_id,body FROM conversation_messages WHERE sender_id=$1 AND client_nonce=$2",
          [user.clientId, input.nonce],
        );
        if (
          old.rows[0]?.conversation_id !== id ||
          old.rows[0]?.body !== input.body
        )
          throw new PortalError(
            409,
            "This retry belongs to a different message.",
          );
        return;
      }
      await client.query(
        "INSERT INTO event_outbox(event_type,aggregate_id,payload) VALUES('message.created',$1,$2)",
        [
          id,
          JSON.stringify({
            schemaVersion: 2,
            conversationId: id,
            recipientIds: user.isOwner
              ? [conversation.client_id]
              : await owners(client),
          }),
        ],
      );
    });
    return json({ message: "Message saved." }, 201);
  });
}
