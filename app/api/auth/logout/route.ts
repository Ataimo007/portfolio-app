import * as oidc from "openid-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { identity, sessionCookie, tokenHash, unseal } from "@/lib/auth";
import { database } from "@/lib/db";
import { handle, sameOrigin, siteURL } from "@/lib/portal-http";

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const jar = await cookies();
    const token = jar.get(sessionCookie)?.value;
    jar.delete(sessionCookie);
    let destination = new URL("/portal", siteURL());
    if (token) {
      const result = await database().query(
        "DELETE FROM portal_sessions WHERE token_hash=$1 RETURNING id_token",
        [tokenHash(token)],
      );
      if (result.rowCount) {
        try {
          const data = await unseal(result.rows[0].id_token);
          destination = oidc.buildEndSessionUrl(await identity(), {
            id_token_hint: String(data.idToken),
            post_logout_redirect_uri: new URL("/portal", siteURL()).href,
          });
        } catch {}
      }
    }
    return NextResponse.redirect(destination, 303);
  });
}
