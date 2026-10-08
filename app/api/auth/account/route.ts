import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { siteURL } from "@/lib/portal-http";

export async function GET() {
  if (!(await session()))
    return NextResponse.redirect(new URL("/login", siteURL()));
  const issuer = new URL(process.env.KEYCLOAK_ISSUER!);
  const account = new URL(`${issuer.href.replace(/\/$/, "")}/account/`);
  return NextResponse.redirect(account);
}
