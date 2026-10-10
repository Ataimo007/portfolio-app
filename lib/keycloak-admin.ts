import "server-only";
import { database } from "./db";
import { PortalError } from "./portal-http";
let cached: { value: string; until: number } | undefined;
function config() {
  const issuer = new URL(process.env.KEYCLOAK_ISSUER!);
  const realm = issuer.pathname.split("/").filter(Boolean).at(-1)!;
  const base = process.env.KEYCLOAK_INTERNAL_URL || issuer.origin;
  if (!process.env.KEYCLOAK_ACCOUNT_CLIENT_SECRET)
    throw new PortalError(
      503,
      "Account services are temporarily unavailable. Please try again later.",
    );
  return { base, realm };
}
async function token() {
  if (cached && cached.until > Date.now()) return cached.value;
  const { base, realm } = config();
  const response = await fetch(
    `${base}/realms/${realm}/protocol/openid-connect/token`,
    {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "portfolio-account-api",
        client_secret: process.env.KEYCLOAK_ACCOUNT_CLIENT_SECRET!,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new PortalError(503, "Account services are temporarily unavailable.");
  const value = await response.json();
  cached = {
    value: value.access_token,
    until: Date.now() + Math.max(0, value.expires_in - 30) * 1000,
  };
  return cached.value;
}
export async function kc<T = Record<string, unknown>>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const { base, realm } = config();
  const response = await fetch(`${base}/admin/realms/${realm}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      "Content-Type": "application/json",
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401) cached = undefined;
    if (response.status === 404)
      throw new PortalError(404, "Account or device not found.");
    if (response.status === 409)
      throw new PortalError(
        409,
        "That account operation conflicts with an existing account.",
      );
    if (response.status === 400)
      throw new PortalError(
        400,
        "The identity service rejected these details. Check the password policy and your entries.",
      );
    throw new PortalError(
      503,
      "Account services could not complete the operation. Please try again.",
    );
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
export type IdentityUser = {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled: boolean;
  emailVerified: boolean;
  createdTimestamp?: number;
  requiredActions?: string[];
  attributes?: Record<string, string[]>;
};
export type IdentitySession = {
  id: string;
  ipAddress: string;
  start: number;
  lastAccess: number;
  clients?: Record<string, string>;
};
export type LinkedIdentity = { identityProvider: string; userName: string };
export async function subject(clientId: string) {
  const result = await database().query(
    "SELECT subject,account_status FROM client_profiles WHERE id=$1",
    [clientId],
  );
  if (!result.rowCount || result.rows[0].account_status === "deleted")
    throw new PortalError(404, "Account not found.");
  return encodeURIComponent(result.rows[0].subject);
}
export async function audit(clientId: string, actorId: string, action: string) {
  await database().query(
    "INSERT INTO account_audit(client_id,actor_id,action) VALUES($1,$2,$3)",
    [clientId, actorId, action],
  );
}
export async function revoke(clientId: string, identityId: string) {
  await database().query("DELETE FROM portal_sessions WHERE client_id=$1", [
    clientId,
  ]);
  await kc(`/users/${identityId}/logout`, "POST");
}
