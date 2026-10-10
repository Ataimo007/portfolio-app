import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { database } from "@/lib/db";
import {
  audit,
  kc,
  revoke,
  type IdentityUser,
  type IdentitySession,
} from "@/lib/keycloak-admin";
import { deleteIdentity } from "@/lib/account-actions";
import {
  body,
  handle,
  json,
  limit,
  PortalError,
  sameOrigin,
} from "@/lib/portal-http";
const idSchema = z.string().uuid();
async function record(identityId: string) {
  const person = await kc<IdentityUser>(`/users/${identityId}`);
  if (person.username.startsWith("service-account-"))
    throw new PortalError(404, "User not found.");
  const issuer = process.env.KEYCLOAK_ISSUER!;
  const found = await database().query(
    "INSERT INTO client_profiles(issuer,subject,display_name,email) VALUES($1,$2,$3,$4) ON CONFLICT(issuer,subject) DO UPDATE SET issuer=excluded.issuer RETURNING id,account_status",
    [
      issuer,
      identityId,
      [person.firstName, person.lastName].filter(Boolean).join(" ") ||
        person.username,
      person.email || "",
    ],
  );
  return { person, profile: found.rows[0] };
}
export async function GET(request: Request) {
  return handle(async () => {
    await requireOwner();
    const query = new URL(request.url).searchParams;
    const id = query.get("id");
    if (id) {
      const { person, profile } = await record(idSchema.parse(id));
      const [sessions, events, jobs, activity, conversation] =
        await Promise.all([
          kc<IdentitySession[]>(`/users/${person.id}/sessions`),
          kc<{ type: string; time: number; ipAddress?: string }[]>(
            `/events?user=${person.id}&max=30`,
          ),
          database().query(
            "SELECT j.id,j.title,j.status,j.created_at,b.starts_at FROM consultancy_jobs j LEFT JOIN bookings b ON b.job_id=j.id WHERE j.client_id=$1 ORDER BY j.created_at DESC LIMIT 100",
            [profile.id],
          ),
          database().query(
            "SELECT action,created_at FROM account_audit WHERE client_id=$1 ORDER BY created_at DESC LIMIT 30",
            [profile.id],
          ),
          database().query("SELECT id FROM conversations WHERE client_id=$1", [
            profile.id,
          ]),
        ]);
      return json({
        user: {
          id: person.id,
          clientId: profile.id,
          name:
            [person.firstName, person.lastName].filter(Boolean).join(" ") ||
            person.username,
          email: person.email,
          enabled: person.enabled,
          status: profile.account_status,
        },
        sessions: sessions.map((s) => ({
          ip: s.ipAddress,
          lastAccess: s.lastAccess,
        })),
        events: events.map((e) => ({
          type: e.type,
          time: e.time,
          ip: e.ipAddress,
        })),
        jobs: jobs.rows,
        activity: activity.rows,
        conversationId: conversation.rows[0]?.id || null,
      });
    }
    const first = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(query.get("first") || 0);
    const search = z
      .string()
      .max(200)
      .parse(query.get("search") || "");
    const people = await kc<IdentityUser[]>(
      "/users?" +
        new URLSearchParams({ first: String(first), max: "30", search }),
    );
    const profiles = await database().query(
      "SELECT subject,account_status FROM client_profiles WHERE issuer=$1",
      [process.env.KEYCLOAK_ISSUER],
    );
    const states = new Map(
      profiles.rows.map((p) => [p.subject, p.account_status]),
    );
    return json({
      users: people
        .filter((p) => !p.username.startsWith("service-account-"))
        .map((p) => ({
          id: p.id,
          name:
            [p.firstName, p.lastName].filter(Boolean).join(" ") || p.username,
          email: p.email || "",
          enabled: p.enabled,
          status: p.enabled
            ? states.get(p.id) || "active"
            : states.get(p.id) === "closed"
              ? "closed"
              : "disabled",
        })),
      hasMore: people.length === 30,
    });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const owner = await requireOwner();
    await limit("user-admin:" + owner.clientId, 20);
    const value = z
      .object({
        id: idSchema,
        action: z.enum(["enable", "disable", "close", "delete", "chat"]),
        confirmation: z.string().optional(),
      })
      .parse(await body(request));
    const { person, profile } = await record(value.id);
    if (value.action === "chat") {
      if (!person.enabled || profile.account_status !== "active")
        throw new PortalError(
          409,
          "Reopen this account before starting a conversation.",
        );
      if (profile.id === owner.clientId)
        throw new PortalError(409, "Choose a client to start a conversation.");
      const result = await database().query(
        "INSERT INTO conversations(client_id) VALUES($1) ON CONFLICT(client_id) DO UPDATE SET client_id=excluded.client_id RETURNING id",
        [profile.id],
      );
      return json({
        conversationId: result.rows[0].id,
        message: "Conversation ready.",
      });
    }
    const roles = await kc<{ name: string }[]>(
      `/users/${person.id}/role-mappings/realm/composite`,
    );
    if (
      profile.id === owner.clientId ||
      roles.some((r) => ["owner", "admin"].includes(r.name))
    )
      throw new PortalError(
        403,
        "Owner accounts are protected from these operations.",
      );
    if (value.action === "delete") {
      if (!person.email || value.confirmation !== person.email)
        throw new PortalError(
          400,
          "Enter the user's email to confirm permanent deletion.",
        );
      await deleteIdentity(profile.id, owner.clientId);
      return json({
        message:
          "Identity deleted. Historical engagement records are retained under Deleted account.",
      });
    }
    const enabled = value.action === "enable";
    await kc(`/users/${person.id}`, "PUT", { enabled });
    await database().query(
      "UPDATE client_profiles SET account_status=$1 WHERE id=$2",
      [
        enabled ? "active" : value.action === "close" ? "closed" : "disabled",
        profile.id,
      ],
    );
    if (!enabled) {
      await revoke(profile.id, person.id);
      await database().query(
        "DELETE FROM push_subscriptions WHERE client_id=$1",
        [profile.id],
      );
    }
    await audit(profile.id, owner.clientId, "account." + value.action);
    return json({
      message: enabled
        ? "Account reopened."
        : value.action === "close"
          ? "Account closed. Records retained."
          : "Account disabled and signed out.",
    });
  });
}
