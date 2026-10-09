import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { euclideanDistance, FACE_DISTANCE_THRESHOLD, isValidDescriptor } from "@/lib/face";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isValidDescriptor(body?.descriptor)) return NextResponse.json({ error: "Data wajah tidak valid." }, { status: 400 });

    const db = adminDb();
    const throttle = db.collection("adminSecurity").doc("faceLogin");
    const allowed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(throttle);
      return Number(snap.data()?.blockedUntil || 0) <= Date.now();
    });
    if (!allowed) return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit." }, { status: 429 });

    const profiles = await db.collection("adminFaceProfiles").get();
    let matchedUid: string | null = null;
    let matchedPrimary = false;

    for (const profile of profiles.docs) {
      const saved = profile.data()?.descriptor;
      if (!isValidDescriptor(saved) || euclideanDistance(body.descriptor, saved) >= FACE_DISTANCE_THRESHOLD) continue;

      if (profile.id === "admin") {
        matchedUid = "admin";
        matchedPrimary = true;
        break;
      }

      const access = await db.collection("adminAccessRequests").doc(profile.id).get();
      if (access.data()?.status === "enrolled") {
        matchedUid = profile.id;
        matchedPrimary = false;
        break;
      }
    }

    if (!matchedUid) {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(throttle), old = snap.data() || {}, now = Date.now();
        const expired = now - Number(old.windowStart || 0) > 600000;
        const attempts = expired ? 1 : Number(old.attempts || 0) + 1;
        tx.set(throttle, { attempts, windowStart: expired ? now : Number(old.windowStart), blockedUntil: attempts >= 5 ? now + 300000 : 0 });
      });
      return NextResponse.json({ error: "Wajah tidak cocok atau akses admin tidak aktif." }, { status: 401 });
    }

    await throttle.set({ attempts: 0, windowStart: Date.now(), blockedUntil: 0 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(matchedUid, matchedPrimary), sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("Admin face login failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Login gagal. Periksa konfigurasi server." }, { status: 500 });
  }
}
