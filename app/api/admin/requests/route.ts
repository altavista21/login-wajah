import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

async function primarySession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session?.primary && session.uid === "admin" ? session : null;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await primarySession(request))) return NextResponse.json({ error: "Hanya admin utama yang dapat mengelola permintaan." }, { status: 403 });
    const snapshot = await adminDb().collection("adminAccessRequests").get();
    const requests = snapshot.docs
      .map((doc) => ({ uid: doc.id, email: String(doc.data().email || ""), status: String(doc.data().status || "pending"), requestedAt: String(doc.data().requestedAt || "") }))
      .filter((item) => item.status === "pending" || item.status === "approved" || item.status === "rejected" || item.status === "enrolled")
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Admin requests fetch failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Gagal memuat permintaan admin." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await primarySession(request))) return NextResponse.json({ error: "Hanya admin utama yang dapat mengelola permintaan." }, { status: 403 });
    const body = await request.json();
    const uid = typeof body?.uid === "string" ? body.uid : "";
    const action = body?.action;
    if (!uid || !["approve", "reject"].includes(action) || uid === "admin") {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.collection("adminAccessRequests").doc(uid);
    const updated = await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.data()?.status !== "pending") return false;
      tx.update(ref, { status: action === "approve" ? "approved" : "rejected", reviewedAt: new Date().toISOString() });
      return true;
    });
    if (!updated) return NextResponse.json({ error: "Permintaan tidak ditemukan atau sudah diproses." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin request review failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Gagal memproses permintaan admin." }, { status: 500 });
  }
}
