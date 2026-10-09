"use client";
import { useCallback, useEffect, useState } from "react";

type AccessRequest = { uid: string; email: string; status: string; requestedAt: string };

export default function DashboardClient({ primary }: { primary: boolean }) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [busyUid, setBusyUid] = useState("");

  const loadRequests = useCallback(async () => {
    if (!primary) return;
    setLoadingRequests(true);
    try {
      const response = await fetch("/api/admin/requests", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal memuat permintaan.");
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setRequestError("");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Gagal memuat permintaan.");
    } finally {
      setLoadingRequests(false);
    }
  }, [primary]);

  useEffect(() => {
    let lastRefresh = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const logout = async () => {
      if (!active) return;
      active = false;
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      window.location.replace("/");
    };
    const onActivity = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { void logout(); }, 20 * 60 * 1000);
      const now = Date.now();
      if (now - lastRefresh > 2 * 60 * 1000) {
        lastRefresh = now;
        void fetch("/api/auth/activity", { method: "POST" }).then((res) => {
          if (res.status === 401) void logout();
        }).catch(() => undefined);
      }
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "mousemove", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    onActivity();
    return () => {
      active = false;
      clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  async function review(uid: string, action: "approve" | "reject") {
    setBusyUid(uid);
    setRequestError("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal memproses permintaan.");
      await loadRequests();
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Gagal memproses permintaan.");
    } finally {
      setBusyUid("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.replace("/");
  }

  const pending = requests.filter((item) => item.status === "pending");
  return (
    <main className="shell">
      <section className="panel dashboard">
        <div className="success-icon" aria-hidden="true">✓</div>
        <div className="eyebrow">AUTENTIKASI BERHASIL</div>
        <h1>LOGIN BERHASIL</h1>
        <p className="muted">Anda telah masuk ke dashboard admin. Sesi berakhir setelah 20 menit tanpa aktivitas.</p>
        <div className="divider" />
        <p className="small"><span className="status-dot" />Sesi admin aktif{primary ? " · Admin utama" : " · Admin"}</p>

        {primary && (
          <section className="admin-requests" aria-labelledby="requests-title">
            <div className="divider" />
            <h2 id="requests-title">Permintaan akses admin</h2>
            <p className="muted">Hanya admin utama yang dapat menyetujui atau menolak akses baru.</p>
            {requestError && <div className="notice error" role="alert">{requestError}</div>}
            {loadingRequests && <p className="small">Memuat permintaan...</p>}
            {!loadingRequests && pending.length === 0 && <p className="small">Tidak ada permintaan yang menunggu persetujuan.</p>}
            {pending.map((item) => (
              <div className="request-item" key={item.uid}>
                <div className="request-details">
                  <strong>{item.email || "Email tidak tersedia"}</strong>
                  <span className="small">Diajukan: {item.requestedAt ? new Date(item.requestedAt).toLocaleString("id-ID") : "Waktu tidak tersedia"}</span>
                </div>
                <div className="request-actions">
                  <button className="button" disabled={busyUid === item.uid} onClick={() => void review(item.uid, "approve")}>{busyUid === item.uid ? "..." : "Setujui"}</button>
                  <button className="button secondary" disabled={busyUid === item.uid} onClick={() => void review(item.uid, "reject")}>Tolak</button>
                </div>
              </div>
            ))}
            <button className="button secondary full" onClick={() => void loadRequests()} disabled={loadingRequests}>Muat ulang permintaan</button>
          </section>
        )}

        <div className="divider" />
        <button className="button full" onClick={logout}>Logout</button>
      </section>
    </main>
  );
}
