import { requireSession } from "@/lib/auth";
import { database } from "@/lib/db";
import { handle, json, sameOrigin } from "@/lib/portal-http";
export async function GET() {
  return handle(async () => {
    const user = await requireSession();
    const result = await database().query(
      "SELECT c.id,p.display_name AS name,(SELECT m.body FROM conversation_messages m WHERE m.conversation_id=c.id ORDER BY m.sequence DESC LIMIT 1) AS preview FROM conversations c JOIN client_profiles p ON p.id=c.client_id WHERE $1::boolean OR c.client_id=$2 ORDER BY c.created_at DESC LIMIT 100",
      [user.isOwner, user.clientId],
    );
    return json({ conversations: result.rows });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireSession(true);
    const result = await database().query(
      "INSERT INTO conversations(client_id) VALUES($1) ON CONFLICT(client_id) DO UPDATE SET client_id=excluded.client_id RETURNING id",
      [user.clientId],
    );
    return json({ id: result.rows[0].id });
  });
}
