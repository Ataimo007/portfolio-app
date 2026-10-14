import { handle, json, siteURL, PortalError } from "@/lib/portal-http";
import { newRegistrationChallenge } from "@/lib/registration";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    const origin = request.headers.get("origin");
    if (origin && origin !== siteURL().origin)
      throw new PortalError(403, "Open registration on the portfolio.");
    return json(await newRegistrationChallenge(request));
  });
}
