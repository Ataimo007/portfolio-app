import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { database } from "./db";

export class PortalError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const siteURL = () =>
  new URL(process.env.SITE_URL || "http://localhost:3000");
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== siteURL().origin)
    throw new PortalError(403, "This request must come from the portfolio.");
}
export async function body(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new PortalError(415, "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) throw new PortalError(400, "Request body is missing.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 12000) {
        await reader.cancel();
        throw new PortalError(413, "Request is too large.");
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new PortalError(400, "Invalid JSON.");
  }
}
export async function limit(key: string, max = 30, seconds = 60) {
  const result = await database().query(
    "INSERT INTO api_rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN api_rate_limits.expires_at<now() THEN 1 ELSE api_rate_limits.hits+1 END, expires_at=CASE WHEN api_rate_limits.expires_at<now() THEN excluded.expires_at ELSE api_rate_limits.expires_at END RETURNING hits",
    [key, seconds],
  );
  if (result.rows[0].hits > max)
    throw new PortalError(429, "Too many requests. Please wait a minute.");
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function handle(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PortalError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return json(
        { error: error.issues[0]?.message || "Check your entries." },
        400,
      );
    const code = (error as { code?: string })?.code;
    if (code === "23P01" || code === "23505")
      return json(
        { error: "That time or request has changed. Refresh and try again." },
        409,
      );
    console.error("Portal request failed", {
      type: error instanceof Error ? error.name : "Unknown",
      code,
    });
    return json(
      { error: "The service is temporarily unavailable. Please try again." },
      503,
    );
  }
}
