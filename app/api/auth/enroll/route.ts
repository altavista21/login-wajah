import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb, getAdminApp } from "@/lib/firebase-admin";
import { isValidDescriptor } from "@/lib/face";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body?.idToken !== "string" || !body.idToken) {
      return NextResponse.json({ error: "Login dengan Google diperlukan." }, { status: 401 });
    }
    const decoded = await getAuth(getAdminApp()).verifyIdToken(body.idToken);
    if (decoded.email_verified !== true || typeof decoded.email !== "string") {
      return NextResponse.json({ error: "Gunakan akun Google dengan email terverifikasi." }, { status: 403 });
    }
    const email = decoded.email.toLowerCase();
    if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
      return NextResponse.json({ error: "Akun ini adalah admin utama dan tidak perlu mendaftar lagi." }, { status: 409 });
    }
    if (!isValidDescriptor(body?.descriptor)) {
      return NextResponse.json({ error: "Data wajah tidak valid." }, { status: 400 });
    }

    const db = adminDb();
    const requestRef = db.collection("adminAccessRequests").doc(decoded.uid);
    const profileRef = db.collection("adminFaceProfiles").doc(decoded.uid);
    const access = await requestRef.get();
    if (access.data()?.email?.toLowerCase() !== email || access.data()?.status !== "approved") {
      return NextResponse.json({ error: "Permintaan akses belum disetujui admin utama." }, { status: 403 });
    }

    const created = await db.runTransaction(async (transaction) => {
      const [profile, latestRequest] = await Promise.all([transaction.get(profileRef), transaction.get(requestRef)]);
      if (profile.exists) return false;
      if (latestRequest.data()?.status !== "approved" || latestRequest.data()?.email?.toLowerCase() !== email) {
        throw new Error("ACCESS_NOT_APPROVED");
      }
      transaction.create(profileRef, {
        uid: decoded.uid, email, descriptor: body.descriptor,
        createdAt: new Date().toISOString(), version: 1,
      });
      transaction.update(requestRef, { status: "enrolled", enrolledAt: new Date().toISOString() });
      return true;
    });

    if (!created) return NextResponse.json({ error: "Wajah untuk akun ini sudah terdaftar." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCESS_NOT_APPROVED") {
      return NextResponse.json({ error: "Permintaan akses belum disetujui admin utama." }, { status: 403 });
    }
    console.error("Admin face enrollment failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Pendaftaran gagal. Periksa login Google dan konfigurasi server." }, { status: 500 });
  }
}
