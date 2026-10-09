"use client";
import * as faceapi from "face-api.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { getIdToken, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";

type Mode = "login" | "enroll";

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [camera, setCamera] = useState<"user" | "environment">("user");
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Memuat model pengenalan wajah...");
  const [messageType, setMessageType] = useState<"normal" | "error" | "success">("normal");

  useEffect(() => {
    let alive = true;
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]).then(() => {
      if (alive) {
        setModelsReady(true);
        setMessage("Model siap. Aktifkan kamera untuk memulai.");
      }
    }).catch(() => {
      if (alive) {
        setMessage("Model belum tersedia. Jalankan npm run download:models lalu deploy ulang.");
        setMessageType("error");
      }
    });
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Browser tidak mendukung kamera. Gunakan HTTPS.");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: camera }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setMessage("Kamera aktif. Pastikan wajah terlihat jelas.");
      setMessageType("normal");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tidak dapat mengakses kamera.");
      setMessageType("error");
    }
  }, [camera, stopCamera]);

  async function captureDescriptor() {
    if (!videoRef.current || !modelsReady || !cameraReady) throw new Error("Model dan kamera harus siap.");
    const result = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!result) throw new Error("Wajah tidak terdeteksi. Hadapkan wajah ke kamera dan coba lagi.");
    return Array.from(result.descriptor);
  }

  async function submit() {
    setBusy(true);
    setMessage(mode === "enroll" ? "Menunggu login Google..." : "Memeriksa wajah...");
    setMessageType("normal");
    let googleSignedIn = false;
    try {
      let body: Record<string, unknown>;
      if (mode === "enroll") {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const credential = await signInWithPopup(firebaseAuth, provider);
        googleSignedIn = true;
        const idToken = await getIdToken(credential.user, true);
        if (!credential.user.email) throw new Error("Akun Google tidak memiliki email.");
        const descriptor = await captureDescriptor();
        body = { descriptor, idToken };
      } else {
        body = { descriptor: await captureDescriptor() };
      }

      const response = await fetch(mode === "enroll" ? "/api/auth/enroll" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Autentikasi gagal.");
      if (mode === "login") {
        window.location.assign("/dashboard");
        return;
      }
      setMessage("Pendaftaran wajah berhasil. Sekarang login dengan wajah terdaftar.");
      setMessageType("success");
      setMode("login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Terjadi kesalahan.");
      setMessageType("error");
    } finally {
      if (googleSignedIn) await signOut(firebaseAuth).catch(() => undefined);
      setBusy(false);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setMessage(next === "enroll"
      ? "Gunakan akun Google yang emailnya cocok dengan ADMIN_EMAIL di konfigurasi server."
      : "Arahkan wajah admin ke kamera.");
    setMessageType("normal");
  }

  return (
    <main className="shell">
      <section className="panel">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div><div className="brand-title">Admin Secure Access</div><div className="small">Autentikasi wajah</div></div>
        </div>
        <div className="eyebrow">PANEL ADMIN</div>
        <h1>Masuk dengan wajah</h1>
        <p className="muted">Gunakan kamera perangkat untuk memverifikasi wajah admin yang sudah terdaftar.</p>
        <div className="tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Login</button>
          <button className={mode === "enroll" ? "active" : ""} onClick={() => changeMode("enroll")}>Daftarkan wajah</button>
        </div>
        {mode === "enroll" && (
          <div className="field">
            <p className="muted">Pendaftaran pertama memerlukan login Google. Hanya Gmail yang cocok dengan ADMIN_EMAIL di server yang diizinkan.</p>
          </div>
        )}
        <div className="field">
          <label htmlFor="camera-select">Pilih kamera</label>
          <select id="camera-select" className="select" value={camera} onChange={(event) => { setCamera(event.target.value as "user" | "environment"); stopCamera(); }}>
            <option value="user">Kamera depan</option><option value="environment">Kamera belakang</option>
          </select>
        </div>
        <div className="camera">
          <video ref={videoRef} muted playsInline aria-label="Pratinjau kamera untuk verifikasi wajah" />
          <span className="camera-label">{cameraReady ? "KAMERA AKTIF" : "KAMERA NONAKTIF"}</span>
        </div>
        <div className="controls">
          <button className="button secondary" onClick={startCamera} disabled={!modelsReady || busy}>Aktifkan kamera</button>
          <button className="button secondary" onClick={stopCamera} disabled={!cameraReady || busy}>Matikan kamera</button>
        </div>
        <button className="button full" onClick={submit} disabled={!modelsReady || !cameraReady || busy}>
          {busy ? "Memproses..." : mode === "enroll" ? "Masuk dengan Google & daftarkan wajah" : "Login dengan wajah"}
        </button>
        <div className={`notice ${messageType === "error" ? "error" : messageType === "success" ? "success" : ""}`} role="status">{message}</div>
        <p className="small">Pendaftaran hanya dapat dilakukan sekali. Kamera membutuhkan izin browser dan HTTPS. Pengenalan wajah ini belum memiliki pemeriksaan liveness.</p>
        <div className="footer">Sesi admin berakhir setelah 20 menit tanpa aktivitas.</div>
      </section>
    </main>
  );
}
