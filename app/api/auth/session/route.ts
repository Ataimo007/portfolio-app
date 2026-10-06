import { session } from "@/lib/auth";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  try {
    return Response.json(
      { authenticated: Boolean(await session()) },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Account status is temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
