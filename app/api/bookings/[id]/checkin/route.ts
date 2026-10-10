import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE, verifySessionToken, isSessionActive } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session || !session.primary || session.uid !== "admin" || !(await isSessionActive(session))) {
      return NextResponse.json({ error: "Hanya admin utama yang dapat memverifikasi check-in." }, { status: 403 });
    }
    const { id } = await context.params;
    if (!/^BALI-[A-F0-9]{10}$/.test(id)) return NextResponse.json({ error: "Kode booking tidak valid." }, { status: 400 });
    const ref = adminDb().collection("hotelBookings").doc(id);
    const updated = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.status !== "pending") return false;
      tx.update(ref, { status: "checked_in", checkedInAt: new Date().toISOString(), verifiedBy: session.uid, updatedAt: new Date().toISOString() });
      return true;
    });
    if (!updated) return NextResponse.json({ error: "Booking tidak ditemukan atau sudah diverifikasi." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Hotel check-in verification failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Gagal memverifikasi check-in." }, { status: 500 });
  }
}
