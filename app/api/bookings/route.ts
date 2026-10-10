import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE, verifySessionToken, isSessionActive } from "@/lib/session";

export const runtime = "nodejs";
const ROOM_TYPES = ["Superior Room Balcony", "Deluxe Balcony Room with Bathtub", "Suite Balcony Room with Bathtub"] as const;

async function sessionFor(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session || !(await isSessionActive(session))) return null;
  return session;
}

export async function GET(request: NextRequest) {
  try {
    const session = await sessionFor(request);
    if (!session) return NextResponse.json({ error: "Sesi tidak aktif. Silakan login kembali." }, { status: 401 });
    const db = adminDb();
    const snapshot = await db.collection("hotelBookings").orderBy("createdAt", "desc").limit(100).get();
    const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item) => session.primary || item.uid === session.uid);
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Hotel bookings fetch failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Gagal memuat pemesanan hotel." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await sessionFor(request);
    if (!session) return NextResponse.json({ error: "Sesi tidak aktif. Silakan login kembali." }, { status: 401 });
    const body = await request.json();
    const guestName = typeof body?.guestName === "string" ? body.guestName.trim().slice(0, 100) : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 30) : "";
    const roomType = typeof body?.roomType === "string" ? body.roomType : "";
    const checkIn = typeof body?.checkIn === "string" ? body.checkIn : "";
    const checkOut = typeof body?.checkOut === "string" ? body.checkOut : "";
    const guests = Number(body?.guests);
    const rooms = Number(body?.rooms);
    const parseDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00.000Z") : new Date(NaN);
    const start = parseDate(checkIn), end = parseDate(checkOut);
    const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (!guestName || !phone || !ROOM_TYPES.includes(roomType as typeof ROOM_TYPES[number]) ||
      !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start < today ||
      nights < 1 || nights > 30 || !Number.isInteger(guests) || guests < 1 || guests > 6 ||
      !Number.isInteger(rooms) || rooms < 1 || rooms > 3 || guests > rooms * 3) {
      return NextResponse.json({ error: "Data pemesanan tidak valid. Periksa nama, kontak, tipe kamar, tanggal, tamu, dan jumlah kamar." }, { status: 400 });
    }
    const db = adminDb();
    const bookingCode = "BALI-" + randomBytes(5).toString("hex").toUpperCase();
    const createdAt = new Date().toISOString();
    const record = {
      bookingCode, uid: session.uid, guestName, phone, hotelName: "Pandawa Hill Resort",
      hotelLocation: "Jl. Pantai Pandawa No.15, Kutuh, Kuta Selatan, Badung, Bali 80361",
      roomType, checkIn, checkOut, nights, guests, rooms, status: "pending",
      paymentStatus: "pay_at_hotel", createdAt, updatedAt: createdAt,
    };
    await db.collection("hotelBookings").doc(bookingCode).create(record);
    return NextResponse.json({ ok: true, booking: { id: bookingCode, ...record } }, { status: 201 });
  } catch (error) {
    console.error("Hotel booking creation failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Pemesanan gagal dibuat. Silakan coba kembali." }, { status: 500 });
  }
}
