import { z } from "zod";
import { database } from "@/lib/db";
import { tokenHash } from "@/lib/auth";
import { verifyChallenge } from "@/lib/account-actions";
import {
  body,
  handle,
  json,
  limit,
  PortalError,
  sameOrigin,
} from "@/lib/portal-http";
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const value = z
      .object({
        token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        password: z.string().min(12).max(128).optional(),
        confirm: z.string().optional(),
        inspect: z.boolean().optional(),
      })
      .parse(await body(request));
    await limit("verify:" + tokenHash(value.token), 8, 900);
    if (value.inspect) {
      const result = await database().query(
        "SELECT purpose FROM account_challenges WHERE token_hash=$1 AND consumed_at IS NULL AND expires_at>now()",
        [tokenHash(value.token)],
      );
      if (!result.rowCount)
        throw new PortalError(
          410,
          "This verification link has expired or has been used. Request a new one from Accounts.",
        );
      return json({ purpose: result.rows[0].purpose });
    }
    const purpose = await verifyChallenge(
      value.token,
      value.password,
      value.confirm,
    );
    return json({
      message:
        purpose === "password"
          ? "Password updated. Sign in again with your new password."
          : "Your account has been deleted. You have been signed out.",
    });
  });
}
