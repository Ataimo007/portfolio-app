import { z } from "zod";
import {
  handle,
  json,
  sameOrigin,
  body,
  siteURL,
  PortalError,
} from "@/lib/portal-http";
import { kc, type IdentityUser } from "@/lib/keycloak-admin";
import {
  registrationAttempt,
  registrationLimits,
  verifyRegistrationChallenge,
  emailSuppressed,
  registrationAudit,
} from "@/lib/registration";
export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("signup"),
    email: z.email().max(254),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    altcha: z.string().min(1).max(8000),
    website: z.string().max(0).optional(),
  }),
  z.object({
    action: z.literal("resend"),
    email: z.email().max(254),
    altcha: z.string().min(1).max(8000),
    website: z.string().max(0).optional(),
  }),
]);
const message =
  "If this address is eligible, you will receive a link to verify your email and choose your password. Check your inbox and spam folder. Wait at least a minute before requesting another link.";
export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    const input = schema.parse(await body(request)),
      email = input.email.trim().toLowerCase();
    await registrationAttempt(request);
    try {
      await verifyRegistrationChallenge(request, input.altcha);
    } catch (error) {
      await registrationAudit(request, "challenge-rejected", email);
      throw error;
    }
    await registrationLimits(request, email);
    if (await emailSuppressed(email)) {
      await registrationAudit(request, "suppressed", email);
      return json({ message });
    }
    let users = await kc<IdentityUser[]>(
      "/users?" + new URLSearchParams({ email, exact: "true" }),
    );
    if (!users.length && input.action === "signup") {
      try {
        await kc("/users", "POST", {
          username: email,
          email,
          firstName: input.firstName,
          lastName: input.lastName,
          enabled: true,
          emailVerified: false,
          requiredActions: ["VERIFY_EMAIL"],
          attributes: { registrationSource: ["portfolio-protected-signup"] },
        });
      } catch (error) {
        if (!(error instanceof PortalError && error.status === 409))
          throw error;
      }
      users = await kc<IdentityUser[]>(
        "/users?" + new URLSearchParams({ email, exact: "true" }),
      );
    }
    const user = users[0];
    if (
      user?.enabled &&
      !user.emailVerified &&
      user.attributes?.registrationSource?.includes(
        "portfolio-protected-signup",
      )
    ) {
      const query = new URLSearchParams({
        client_id: "portfolio",
        redirect_uri: new URL("/login", siteURL()).href,
        lifespan: "1800",
      });
      try {
        await kc(
          `/users/${encodeURIComponent(user.id)}/execute-actions-email?${query}`,
          "PUT",
          ["VERIFY_EMAIL", "UPDATE_PASSWORD"],
        );
        await registrationAudit(request, "verification-requested", email);
      } catch (error) {
        await registrationAudit(request, "verification-unavailable", email);
        throw error;
      }
    } else await registrationAudit(request, "ineligible", email);
    return json({ message });
  });
}
