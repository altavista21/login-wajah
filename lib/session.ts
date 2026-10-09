import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
export const SESSION_COOKIE = "admin_face_session";
export const SESSION_TTL_SECONDS = 20 * 60;
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error("SESSION_SECRET harus minimal 32 karakter."); return new TextEncoder().encode(value); }
export async function createSessionToken() { return new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setSubject("admin").setIssuedAt().setExpirationTime(`${SESSION_TTL_SECONDS}s`).sign(secret()); }
export async function verifySessionToken(token: string) { try { const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] }); return payload.sub === "admin" && payload.role === "admin"; } catch { return false; } }
export async function getAdminSession() { const store = await cookies(); const token = store.get(SESSION_COOKIE)?.value; return token ? verifySessionToken(token) : false; }
export function sessionCookieOptions() { return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: SESSION_TTL_SECONDS }; }
