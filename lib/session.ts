import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";

export const SESSION_COOKIE = "admin_face_session";
export const SESSION_TTL_SECONDS = 20 * 60;

export type AdminSession = { uid: string; primary: boolean };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET harus minimal 32 karakter.");
  return new TextEncoder().encode(value);
}

export async function createSessionToken(uid: string, primary: boolean) {
  return new SignJWT({ role: "admin", primary })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.role !== "admin" || typeof payload.sub !== "string" || typeof payload.primary !== "boolean") return null;
    return { uid: payload.sub, primary: payload.primary };
  } catch {
    return null;
  }
}

export async function isSessionActive(session: AdminSession) {
  if (session.primary) return session.uid === "admin";
  const db = adminDb();
  const [profile, request] = await Promise.all([
    db.collection("adminFaceProfiles").doc(session.uid).get(),
    db.collection("adminAccessRequests").doc(session.uid).get(),
  ]);
  return profile.exists && request.data()?.status === "approved";
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session || !(await isSessionActive(session))) return null;
  return session;
}

export function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: SESSION_TTL_SECONDS };
}
