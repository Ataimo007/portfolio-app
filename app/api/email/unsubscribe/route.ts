import { database } from "@/lib/db";
import { handle, json, PortalError, siteURL } from "@/lib/portal-http";
export async function POST(request: Request) {
  return handle(async () => {
    let token = new URL(request.url).searchParams.get("token");
    if (
      !token &&
      request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded")
    ) {
      const text = await request.text();
      if (text.length > 512)
        throw new PortalError(413, "Request is too large.");
      token = new URLSearchParams(text).get("token");
    }
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new PortalError(400, "This email preference link is invalid.");
    const result = await database().query(
      "UPDATE email_preferences SET unsubscribed_at=coalesce(unsubscribed_at,now()) WHERE unsubscribe_token=$1 RETURNING email",
      [token],
    );
    if (!result.rowCount)
      throw new PortalError(404, "This email preference link is invalid.");
    if (new URL(request.url).searchParams.has("token"))
      return json({
        message: "You are unsubscribed from optional portfolio emails.",
      });
    return Response.redirect(
      new URL("/email-preferences?updated=1", siteURL()),
      303,
    );
  });
}

export async function GET(request: Request) {
  const target = new URL("/email-preferences", siteURL());
  target.searchParams.set(
    "token",
    new URL(request.url).searchParams.get("token") || "",
  );
  return Response.redirect(target, 303);
}
