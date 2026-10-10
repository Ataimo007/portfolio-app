import { z } from "zod";
import { cookies } from "next/headers";
import * as oidc from "openid-client";
import {
  cookieOptions,
  identity,
  loginCookie,
  requireSession,
  seal,
  sessionCookie,
  tokenHash,
} from "@/lib/auth";
import { database } from "@/lib/db";
import {
  audit,
  kc,
  subject,
  type IdentityUser,
  type IdentitySession,
  type LinkedIdentity,
} from "@/lib/keycloak-admin";
import { challenge } from "@/lib/account-actions";
import {
  body,
  handle,
  json,
  limit,
  PortalError,
  sameOrigin,
  siteURL,
} from "@/lib/portal-http";
const providers = ["google", "github", "linkedin", "microsoft"] as const;
const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("personal"),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100),
  }),
  z.object({ action: z.literal("reset-password") }),
  z.object({ action: z.literal("delete-account") }),
  z.object({
    action: z.literal("revoke-device"),
    id: z.string().min(1).max(100),
  }),
  z.object({ action: z.literal("link"), provider: z.enum(providers) }),
  z.object({ action: z.literal("unlink"), provider: z.enum(providers) }),
]);
export async function GET() {
  return handle(async () => {
    const user = await requireSession();
    const id = await subject(user.clientId);
    const [person, sessions, linked, credentials, available] =
      await Promise.all([
        kc<IdentityUser>(`/users/${id}`),
        kc<IdentitySession[]>(`/users/${id}/sessions`),
        kc<LinkedIdentity[]>(`/users/${id}/federated-identity`),
        kc<{ type: string }[]>(`/users/${id}/credentials`),
        kc<{ alias: string; enabled: boolean }[]>(
          "/identity-provider/instances",
        ),
      ]);
    const token = (await cookies()).get(sessionCookie)?.value || "";
    const current = await database().query(
      "SELECT identity_session_id FROM portal_sessions WHERE token_hash=$1",
      [tokenHash(token)],
    );
    return json({
      firstName: person.firstName || "",
      lastName: person.lastName || "",
      emailVerified: person.emailVerified,
      hasPassword: credentials.some((c) => c.type === "password"),
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ipAddress,
        startedAt: new Date(s.start).toISOString(),
        lastAccess: new Date(s.lastAccess).toISOString(),
        current: current.rows[0]?.identity_session_id === s.id,
        applications: Object.values(s.clients || {}).filter(
          (c) => !c.startsWith("account"),
        ),
      })),
      linked,
      providers: available
        .filter(
          (p) =>
            p.enabled &&
            providers.includes(p.alias as (typeof providers)[number]),
        )
        .map((p) => p.alias),
    });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const user = await requireSession(true);
    await limit("account:" + user.clientId, 12);
    const value = input.parse(await body(request));
    const id = await subject(user.clientId);
    if (value.action === "personal") {
      await kc(`/users/${id}`, "PUT", {
        firstName: value.firstName,
        lastName: value.lastName,
      });
      await database().query(
        "UPDATE client_profiles SET display_name=$1 WHERE id=$2",
        [
          [value.firstName, value.lastName].filter(Boolean).join(" "),
          user.clientId,
        ],
      );
      await audit(user.clientId, user.clientId, "personal.updated");
      return json({ message: "Personal information updated." });
    }
    if (
      value.action === "reset-password" ||
      value.action === "delete-account"
    ) {
      await limit("challenge:" + user.clientId, 3, 900);
      if (value.action === "delete-account" && user.isOwner)
        throw new PortalError(403, "The owner account cannot be deleted here.");
      if (value.action === "reset-password") {
        const credentials = await kc<{ type: string }[]>(
          `/users/${id}/credentials`,
        );
        if (!credentials.some((c) => c.type === "password"))
          throw new PortalError(
            409,
            "Your password is managed by your social sign-in provider.",
          );
      }
      await challenge(
        user.clientId,
        value.action === "reset-password" ? "password" : "delete",
      );
      return json({
        message:
          "A verification link has been sent to your account email. It expires in 15 minutes.",
      });
    }
    if (value.action === "revoke-device") {
      const sessions = await kc<IdentitySession[]>(`/users/${id}/sessions`);
      if (!sessions.some((s) => s.id === value.id))
        throw new PortalError(404, "Device session not found.");
      await kc(`/sessions/${encodeURIComponent(value.id)}`, "DELETE");
      await database().query(
        "DELETE FROM portal_sessions WHERE client_id=$1 AND (identity_session_id=$2 OR identity_session_id IS NULL)",
        [user.clientId, value.id],
      );
      await audit(user.clientId, user.clientId, "device.signed-out");
      return json({ message: "Device signed out." });
    }
    const links = await kc<LinkedIdentity[]>(`/users/${id}/federated-identity`);
    if (value.action === "unlink") {
      const credentials = await kc<{ type: string }[]>(
        `/users/${id}/credentials`,
      );
      if (links.length <= 1 && !credentials.some((c) => c.type === "password"))
        throw new PortalError(
          409,
          "Keep at least one sign-in method linked to your account.",
        );
      if (!links.some((l) => l.identityProvider === value.provider))
        throw new PortalError(404, "This provider is not linked.");
      await kc(`/users/${id}/federated-identity/${value.provider}`, "DELETE");
      await audit(
        user.clientId,
        user.clientId,
        "identity.unlinked." + value.provider,
      );
      return json({ message: "Social account unlinked." });
    }
    const enabled = await kc<{ alias: string; enabled: boolean }[]>(
      "/identity-provider/instances",
    );
    if (!enabled.some((p) => p.alias === value.provider && p.enabled))
      throw new PortalError(409, "This social sign-in is unavailable.");
    const state = oidc.randomState(),
      nonce = oidc.randomNonce(),
      verifier = oidc.randomPKCECodeVerifier();
    const jar = await cookies();
    await jar.set(
      loginCookie,
      await seal(
        {
          state,
          nonce,
          verifier,
          linkingSubject: decodeURIComponent(id),
          returnTo: "/portal?view=accounts",
        },
        300,
      ),
      { ...cookieOptions(), maxAge: 300 },
    );
    const destination = oidc.buildAuthorizationUrl(await identity(), {
      redirect_uri: new URL("/api/auth/callback/keycloak", siteURL()).href,
      scope: "openid profile email",
      state,
      nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: "S256",
      kc_action: "idp_link:" + value.provider,
    });
    return json({ redirect: destination.href });
  });
}
