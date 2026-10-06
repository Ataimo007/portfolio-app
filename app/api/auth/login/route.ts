import * as oidc from "openid-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cookieOptions, identity, loginCookie, seal } from "@/lib/auth";
import { siteURL } from "@/lib/portal-http";

export async function GET(request: Request) {
  try {
    const issuer = new URL(process.env.KEYCLOAK_ISSUER!);
    const probe = new URL(
      issuer.pathname + "/.well-known/openid-configuration",
      process.env.KEYCLOAK_INTERNAL_URL || issuer.origin,
    );
    const response = await fetch(probe, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("Identity is unavailable");
    const config = await identity();
    const state = oidc.randomState(),
      nonce = oidc.randomNonce(),
      verifier = oidc.randomPKCECodeVerifier();
    (await cookies()).set(
      loginCookie,
      await seal({ state, nonce, verifier }, 300),
      { ...cookieOptions(), maxAge: 300 },
    );
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: new URL("/api/auth/callback/keycloak", siteURL()).href,
      scope: "openid profile email",
      state,
      nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: "S256",
    });
    if (new URL(request.url).searchParams.get("screen") === "signup")
      url.pathname = url.pathname.replace(/\/auth$/, "/registrations");
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      new URL("/portal?auth=unavailable", siteURL()),
    );
  }
}
