import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { adminDb } from "@/lib/firebase-admin";
import { euclideanDistance, FACE_DISTANCE_THRESHOLD, isValidDescriptor } from "@/lib/face";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function scopedId(uid: string, subject: string) {
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
    const scoped = scopedId(principal.uid, payload.subject);
    const throttleRef = db.collection("externalFaceSecurity").doc(scoped);
    const throttleAllowed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(throttleRef);
      return Number(snap.data()?.blockedUntil || 0) <= Date.now();
    });
    if (!throttleAllowed) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit." }, {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": "300" },
      });
    }

    const profile = await db.collection("externalFaceProfiles").doc(scoped).get();
    const saved = profile.data()?.descriptor;
    const matched = profile.exists
      && profile.data()?.serviceUid === principal.uid
      && isValidDescriptor(saved)
      && euclideanDistance(payload.descriptor, saved) < FACE_DISTANCE_THRESHOLD;

    if (!matched) {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(throttleRef);
        const old = snap.data() || {};
        const now = Date.now();
        const expired = now - Number(old.windowStart || 0) > 600000;
        const attempts = expired ? 1 : Number(old.attempts || 0) + 1;
        tx.set(throttleRef, {
          attempts,
          windowStart: expired ? now : Number(old.windowStart || now),
          blockedUntil: attempts >= 5 ? now + 300000 : 0,
        });
      });
      return NextResponse.json({ ok: true, verified: false }, {
        status: 200,
        headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
      });
    }

    await throttleRef.set({ attempts: 0, windowStart: Date.now(), blockedUntil: 0 });
    return NextResponse.json({ ok: true, verified: true }, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (error) {
    console.error("External face verification failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Verifikasi wajah tidak dapat diproses." }, { status: 500 });
  }
}
