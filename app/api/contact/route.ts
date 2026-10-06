import { validateContact } from "@/lib/contact";
import { sendContact } from "@/lib/send-contact";
export async function POST(request: Request) {
  const expectedOrigin = `${new URL(request.url).protocol}//${request.headers.get("host")}`;
  if (request.headers.get("origin") !== expectedOrigin)
    return Response.json(
      { error: "Please submit the form from this website." },
      { status: 403 },
    );
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 12000)
      return Response.json({ error: "Message is too large." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const data = validateContact(body);
  if (!data)
    return Response.json(
      {
        error:
          "Please provide a name, valid email and message between 10 and 5,000 characters.",
      },
      { status: 400 },
    );
  // ponytail: no in-memory rate limiter across serverless instances; add a shared limiter before enabling public sending.
  try {
    if ((await sendContact(data)) === "unconfigured")
      return Response.json(
        {
          error:
            "Sending is not configured yet. Please email contact@ataimo.com directly.",
        },
        { status: 503 },
      );
    return Response.json({ message: "Your message has been sent." });
  } catch {
    return Response.json(
      { error: "Your message could not be sent. Please try email instead." },
      { status: 502 },
    );
  }
}
