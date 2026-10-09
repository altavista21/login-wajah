import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb, getAdminApp } from "@/lib/firebase-admin";

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
      return NextResponse.json({ status: "primary", message: "Akun ini adalah admin utama." });
    }

    const db = adminDb();
    const profile = await db.collection("adminFaceProfiles").doc(decoded.uid).get();
    if (profile.exists) return NextResponse.json({ status: "enrolled", message: "Akun ini sudah terdaftar sebagai admin." });

    const ref = db.collection("adminAccessRequests").doc(decoded.uid);
    const current = await ref.get();
    if (current.data()?.email?.toLowerCase() !== email) {
      await ref.set({ uid: decoded.uid, email, status: "pending", requestedAt: new Date().toISOString() });
      return NextResponse.json({ status: "pending", message: "Permintaan akses dikirim. Tunggu persetujuan admin utama." });
    }
    const status = current.data()?.status;
    if (status === "rejected") {
      return NextResponse.json({ status: "rejected", message: "Permintaan akses ditolak admin utama." }, { status: 403 });
    }
    if (status === "pending") return NextResponse.json({ status, message: "Permintaan masih menunggu persetujuan admin utama." });
    if (status === "approved") return NextResponse.json({ status, message: "Akses disetujui. Kamera akan digunakan untuk mendaftarkan wajah." });
    if (status === "enrolled") return NextResponse.json({ status, message: "Akun ini sudah terdaftar sebagai admin." });
    return NextResponse.json({ status: "pending", message: "Permintaan akses sedang diproses." });
  } catch (error) {
    console.error("Admin access request failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Tidak dapat mengirim permintaan akses." }, { status: 500 });
  }
}
