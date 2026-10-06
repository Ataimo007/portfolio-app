import { database } from "@/lib/db";
import { snapshotSchema } from "@/lib/platform-status";
import { json } from "@/lib/portal-http";
let cached: unknown = null,
  lastRead = 0,
  windowStart = 0,
  hits = 0;

export async function GET() {
  const now = Date.now();
  if (now - windowStart > 60000) {
    windowStart = now;
    hits = 0;
  }
  if (++hits > 600)
    return json(
      {
        mode: "unavailable",
        error: "Please wait before requesting another status update.",
      },
      429,
    );
  if (cached && now - lastRead < 5000) return json(cached);
  try {
    const result = await database().query(
      "SELECT snapshot FROM platform_snapshots WHERE id=1",
    );
    if (!result.rowCount)
      return json(
        {
          mode: "unavailable",
          error: "No measured snapshot is available yet.",
        },
        503,
      );
    const data = snapshotSchema.parse(result.rows[0].snapshot);
    const stale =
      Date.now() - Date.parse(data.generatedAt) > data.staleAfterSeconds * 1000;
    cached = { ...data, stale, overall: stale ? "unknown" : data.overall };
    lastRead = now;
    return json(cached);
  } catch {
    return json(
      { mode: "unavailable", error: "Live status is temporarily unavailable." },
      503,
    );
  }
}
