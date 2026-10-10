import * as oidc from "openid-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  cookieOptions,
  createSession,
  identity,
  loginCookie,
  sessionCookie,
  unseal,
} from "@/lib/auth";
import { siteURL } from "@/lib/portal-http";

export async function GET(request: Request) {
  const jar = await cookies();
  const pending = jar.get(loginCookie)?.value;
  jar.delete(loginCookie);
  try {
    if (!pending) throw Error("Missing login state");
    const flow = await unseal(pending);
    if (
      typeof flow.state !== "string" ||
      typeof flow.nonce !== "string" ||
      typeof flow.verifier !== "string"
    )
      throw Error("Invalid login state");
    const current = new URL("/api/auth/callback/keycloak", siteURL());
    current.search = new URL(request.url).search;
    const tokens = await oidc.authorizationCodeGrant(
      await identity(),
      current,
      {
        expectedState: flow.state,
        expectedNonce: flow.nonce,
        pkceCodeVerifier: flow.verifier,
        idTokenExpected: true,
      },
    );
    const claims = tokens.claims();
    if (!claims || !tokens.id_token) throw Error("Missing identity claims");
    if (flow.linkingSubject && claims.sub !== flow.linkingSubject)
      throw Error("Account linking changed identity");
    const created = await createSession(claims, tokens.id_token);
    jar.set(sessionCookie, created.token, {
      ...cookieOptions(),
      maxAge: created.seconds,
    });
    return NextResponse.redirect(
      new URL(
        flow.returnTo === "/portal?view=accounts" ? flow.returnTo : "/portal",
        siteURL(),
      ),
    );
  } catch {
    return NextResponse.redirect(new URL("/portal?auth=failed", siteURL()));
  }
}
