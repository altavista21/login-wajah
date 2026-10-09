import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Sesi admin tidak aktif. Silakan login kembali." }, { status: 401 });

    const rawKey = `lw_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 11);
    const createdAt = new Date().toISOString();

    await adminDb().collection("apiKeys").doc(keyHash).create({
      uid: session.uid,
      prefix,
      createdAt,
      active: true,
    });

    return NextResponse.json({ ok: true, apiKey: rawKey, prefix, createdAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("API key generation failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Gagal membuat API key. Periksa konfigurasi server." }, { status: 500 });
  }
}
