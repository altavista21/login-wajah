import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const principal = await authenticateApiKey(request);
  if (principal instanceof NextResponse) return principal;

  return NextResponse.json(
    {
      ok: true,
      authenticated: true,
      owner: { uid: principal.uid },
      apiKey: { prefix: principal.prefix },
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}
