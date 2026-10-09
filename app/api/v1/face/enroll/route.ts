import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { adminDb } from "@/lib/firebase-admin";
import { isValidDescriptor } from "@/lib/face";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function profileId(uid: string, subject: string) {
  return createHash("sha256").update(`${uid}:news-generator:${subject}`).digest("hex");
}

export async function POST(request: NextRequest) {
  const principal = await authenticateApiKey(request);
  if (principal instanceof NextResponse) return principal;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON request tidak valid." }, { status: 400 });
  }

  const payload = body as { subject?: unknown; descriptor?: unknown };
  if (typeof payload.subject !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(payload.subject)) {
    return NextResponse.json({ error: "subject wajib berupa ID pengguna yang valid." }, { status: 400 });
  }
  if (!isValidDescriptor(payload.descriptor)) {
    return NextResponse.json({ error: "Descriptor wajah tidak valid." }, { status: 400 });
  }

  try {
    const db = adminDb();
    const ref = db.collection("externalFaceProfiles").doc(profileId(principal.uid, payload.subject));
    const exists = await ref.get();
    if (exists.exists) {
      return NextResponse.json({ error: "Wajah untuk pengguna ini sudah terdaftar." }, { status: 409 });
    }

    await ref.create({
      serviceUid: principal.uid,
      subject: payload.subject,
      descriptor: payload.descriptor,
      createdAt: new Date().toISOString(),
      version: 1,
    });

    return NextResponse.json({ ok: true, enrolled: true }, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (error) {
    console.error("External face enrollment failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Pendaftaran wajah tidak dapat diproses." }, { status: 500 });
  }
}
