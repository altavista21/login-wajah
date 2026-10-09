import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
function getAdminApp() {
 const existing = getApps()[0]; if (existing) return existing;
 const projectId = process.env.FIREBASE_PROJECT_ID; const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
 const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
 if (!projectId || !clientEmail || !privateKey) throw new Error("Konfigurasi Firebase Admin belum lengkap.");
 return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}
export function adminDb() { return getFirestore(getAdminApp()); }
