"use client";

import Link from "next/link";
import { useState } from "react";

type GeneratedKey = { apiKey: string; prefix: string; createdAt: string };

export default function ApiKeyPage() {
  const [generated, setGenerated] = useState<GeneratedKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generateKey() {
    setLoading(true);
    setError("");
    setGenerated(null);
    setCopied(false);
    try {
      const response = await fetch("/api/admin/api-keys", { method: "POST", cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal membuat API key.");
      setGenerated({ apiKey: data.apiKey, prefix: data.prefix, createdAt: data.createdAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat API key.");
    } finally {
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.apiKey);
      setCopied(true);
    } catch {
      setError("Gagal menyalin otomatis. Pilih dan salin API key secara manual.");
    }
  }

  return (
    <main className="shell">
      <section className="panel api-key-panel">
        <Link href="/dashboard" className="api-key-back">← Kembali ke dashboard</Link>
        <div className="api-key-symbol" aria-hidden="true">⌘</div>
        <div className="eyebrow">PENGELOLAAN AKSES</div>
        <h1>Generate API Key</h1>
        <p className="muted">Buat kunci akses untuk integrasi yang membutuhkan API key dari aplikasi ini.</p>

        <div className="api-key-warning" role="note">
          <strong>Simpan kunci dengan aman</strong>
          <p>API key lengkap hanya ditampilkan saat dibuat. Salin dan simpan di tempat aman. Jangan bagikan di kode frontend, repositori publik, atau tangkapan layar.</p>
        </div>

        {error && <div className="notice error" role="alert">{error}</div>}

        {generated ? (
          <div className="api-key-result" aria-live="polite">
            <label htmlFor="generated-api-key">API key baru</label>
            <textarea id="generated-api-key" className="text-input api-key-value" readOnly value={generated.apiKey} rows={3} />
            <button type="button" className="button full" onClick={() => void copyKey()}>{copied ? "Berhasil disalin" : "Salin API Key"}</button>
            <p className="small">Dibuat: {new Date(generated.createdAt).toLocaleString("id-ID")}</p>
            <p className="small">Kunci lengkap tidak dapat ditampilkan kembali setelah halaman ini ditinggalkan.</p>
          </div>
        ) : (
          <button type="button" className="button full" onClick={() => void generateKey()} disabled={loading}>
            {loading ? "Membuat API Key..." : "Generate API Key"}
          </button>
        )}

        <div className="divider" />
        <Link href="/dashboard" className="api-key-dashboard-link">Kembali ke dashboard</Link>
      </section>
    </main>
  );
}
