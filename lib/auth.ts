import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import * as oidc from "openid-client";
import { database, transaction } from "./db";
import { ownerAlert, queueEmail } from "./notification-email";
import { PortalError, siteURL } from "./portal-http";

export const sessionCookie = "ataimo_session";
export const loginCookie = "ataimo_login";
export const cookieOptions = () => ({
  httpOnly: true,
  secure: siteURL().protocol === "https:",
  sameSite: "lax" as const,
  path: "/",
});
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function key() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw Error("Session encryption not configured");
  return createHash("sha256").update(process.env.SESSION_SECRET).digest();
}
export async function seal(payload: Record<string, unknown>, seconds: number) {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .setIssuer("ataimo-session")
    .setAudience("ataimo-portal")
    .encrypt(key());
}
export async function unseal(value: string) {
  return (
    await jwtDecrypt(value, key(), {
      issuer: "ataimo-session",
      audience: "ataimo-portal",
    })
  ).payload;
}
let config: Promise<oidc.Configuration> | undefined;
export function identity() {
  if (!process.env.KEYCLOAK_ISSUER || !process.env.KEYCLOAK_CLIENT_SECRET)
    throw Error("Identity not configured");
  if (!config) {
    const issuer = new URL(process.env.KEYCLOAK_ISSUER);
    if (issuer.protocol !== "https:" && process.env.ALLOW_LOCAL_HTTP !== "true")
      throw Error("Identity requires HTTPS");
    const transport: oidc.CustomFetch = async (input, options) => {
      const url = new URL(input.toString());
      if (process.env.KEYCLOAK_INTERNAL_URL && url.origin === issuer.origin) {
        const internal = new URL(process.env.KEYCLOAK_INTERNAL_URL);
        url.protocol = internal.protocol;
        url.host = internal.host;
      }
      return fetch(url, {
        ...options,
        body: options.body as BodyInit,
        signal: AbortSignal.timeout(6000),
      });
    };
    config = oidc
      .discovery(
        issuer,
        "portfolio",
        process.env.KEYCLOAK_CLIENT_SECRET,
        undefined,
        {
          [oidc.customFetch]: transport,
          execute:
            process.env.ALLOW_LOCAL_HTTP === "true"
              ? [oidc.allowInsecureRequests, oidc.enableNonRepudiationChecks]
              : [oidc.enableNonRepudiationChecks],
        },
      )
      .catch((e) => {
        config = undefined;
        throw e;
      });
  }
  return config;
}
export type Session = {
  clientId: string;
  name: string;
  email: string;
  timezone: string;
  company: string;
  phone: string;
  roles: string[];
  isOwner: boolean;
};
export async function session(): Promise<Session | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || token.length > 128) return null;
  const result = await database().query(
    "SELECT p.id,p.display_name,p.email,p.timezone,p.company,p.phone,s.roles FROM portal_sessions s JOIN client_profiles p ON p.id=s.client_id WHERE s.token_hash=$1 AND s.expires_at>now() AND p.account_status='active'",
    [tokenHash(token)],
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  const roles = (row.roles as string[]).filter((r) =>
    ["owner", "admin", "client", "demo-viewer"].includes(r),
  );
  return {
    clientId: row.id,
    name: row.display_name,
    email: row.email,
    timezone: row.timezone,
    company: row.company,
    phone: row.phone,
    roles,
    isOwner: roles.includes("owner") || roles.includes("admin"),
  };
}
export async function requireSession(write = false) {
  const user = await session();
  if (!user)
    throw new PortalError(401, "Your session has ended. Please sign in again.");
  if (
    write &&
    !user.isOwner &&
    (!user.roles.includes("client") || user.roles.includes("demo-viewer"))
  )
    throw new PortalError(403, "This account has read-only access.");
  return user;
}
export async function requireOwner() {
  const user = await requireSession();
  if (!user.isOwner) throw new PortalError(403, "Owner access is required.");
  return user;
}
export async function createSession(claims: oidc.IDToken, rawToken: string) {
  const realm = claims.realm_access as { roles?: unknown } | undefined;
  const roles = Array.isArray(realm?.roles)
    ? realm.roles.filter(
        (r): r is string =>
          typeof r === "string" &&
          ["owner", "admin", "client", "demo-viewer"].includes(r),
      )
    : [];
  if (!roles.length)
    throw new PortalError(
      403,
      "Ask Ataimo to grant your account portal access.",
    );
  const name =
    typeof claims.name === "string"
      ? claims.name
      : typeof claims.preferred_username === "string"
        ? claims.preferred_username
        : "Client";
  const email = typeof claims.email === "string" ? claims.email : "";
  return transaction(async (client) => {
    const existing = await client.query(
      "SELECT account_status FROM client_profiles WHERE issuer=$1 AND subject=$2 FOR UPDATE",
      [claims.iss, claims.sub],
    );
    if (existing.rowCount && existing.rows[0].account_status !== "active")
      throw new PortalError(
        403,
        "This account is closed or disabled. Contact Ataimo for assistance.",
      );
    const row = await client.query(
      "INSERT INTO client_profiles(issuer,subject,display_name,email) VALUES($1,$2,$3,$4) ON CONFLICT(issuer,subject) DO UPDATE SET display_name=excluded.display_name,email=excluded.email RETURNING id,(xmax=0) AS is_new",
      [claims.iss, claims.sub, name.slice(0, 200), email.slice(0, 254)],
    );
    if (roles.includes("owner") || roles.includes("admin")) {
      await client.query(
        "INSERT INTO owner_accounts(client_id) VALUES($1) ON CONFLICT DO NOTHING",
        [row.rows[0].id],
      );
    } else {
      await client.query("DELETE FROM owner_accounts WHERE client_id=$1", [
        row.rows[0].id,
      ]);
    }
    const token = randomBytes(32).toString("base64url");
    const seconds = Math.max(
      1,
      Math.min(1800, Number(claims.exp) - Math.floor(Date.now() / 1000)),
    );
    await client.query(
      "INSERT INTO portal_sessions(token_hash,client_id,roles,id_token,expires_at,identity_session_id) VALUES($1,$2,$3,$4,now()+$5*interval '1 second',$6)",
      [
        tokenHash(token),
        row.rows[0].id,
        JSON.stringify(roles),
        await seal({ idToken: rawToken }, 1800),
        seconds,
        typeof claims.sid === "string" ? claims.sid : null,
      ],
    );
    const clientId = row.rows[0].id;
    await queueEmail(client, email, "welcome", "welcome:" + clientId, { name });
    await ownerAlert(client, "account.login", "login:" + tokenHash(token), {
      name,
      email,
      url: "/admin",
    });
    return { token, seconds };
  });
}
