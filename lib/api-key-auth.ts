import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export type ApiKeyPrincipal = { uid: string; prefix: string };

export async function authenticateApiKey(request: NextRequest): Promise<ApiKeyPrincipal | NextResponse> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return NextResponse.json(
      { error: "unauthorized", message: "Kirim API key melalui header Authorization: Bearer <API_KEY>." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" } },
    );
  }

  const apiKey = match[1];
  if (!/^lw_[a-f0-9]{64}$/.test(apiKey)) {
    return NextResponse.json(
      { error: "unauthorized", message: "API key tidak valid atau sudah dinonaktifkan." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" } },
    );
  }

  try {
    const keyHash = createHash("sha256").update(apiKey).digest("hex");
    const snapshot = await adminDb().collection("apiKeys").doc(keyHash).get();
    const data = snapshot.data();
    if (!snapshot.exists || data?.active !== true || typeof data.uid !== "string") {
      return NextResponse.json(
        { error: "unauthorized", message: "API key tidak valid atau sudah dinonaktifkan." },
        { status: 401, headers: { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" } },
      );
    }

    return { uid: data.uid, prefix: typeof data.prefix === "string" ? data.prefix : apiKey.slice(0, 11) };
  } catch {
    return NextResponse.json(
      { error: "service_unavailable", message: "Layanan autentikasi API sedang tidak tersedia." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
}
