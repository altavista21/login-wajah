"use client";
import { useEffect } from "react";

export default function DashboardClient() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.location.replace("/dashboard/hotel"), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="shell">
      <section className="panel dashboard">
        <div className="success-icon" aria-hidden="true">✓</div>
        <div className="eyebrow">AUTENTIKASI BERHASIL</div>
        <h1>LOGIN BERHASIL</h1>
        <p className="muted">Anda berhasil masuk. Halaman ini akan beralih ke pemesanan hotel dalam 3 detik.</p>
        <div className="redirect-countdown" role="status">Menyiapkan pemesanan hotel…</div>
      </section>
    </main>
  );
}
