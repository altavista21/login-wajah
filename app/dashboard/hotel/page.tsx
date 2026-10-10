"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LogOut, BedDouble, CalendarDays, Users, CheckCircle2, Clock3, RefreshCw } from "lucide-react";

type Booking = {
  id: string; bookingCode: string; guestName: string; phone: string; hotelName: string;
  roomType: string; checkIn: string; checkOut: string; nights: number; guests: number;
  rooms: number; status: string; createdAt: string; paymentStatus: string;
};
type AccessRequest = { uid: string; email: string; status: string; requestedAt: string };
const roomTypes = [
  { name: "Superior Room Balcony", capacity: "1–2 orang", size: "36 m²", detail: "Balkon pribadi, AC, Wi-Fi, dan tempat tidur double." },
  { name: "Deluxe Balcony Room with Bathtub", capacity: "1–2 orang", size: "36 m²", detail: "Balkon, bathtub, AC, Wi-Fi, dan fasilitas kamar." },
  { name: "Suite Balcony Room with Bathtub", capacity: "1–2 orang", size: "Suite", detail: "Ruang lebih lega, balkon, bathtub, AC, dan Wi-Fi." },
];

export default function HotelBookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [primary, setPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [roomType, setRoomType] = useState(roomTypes[0].name);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [rooms, setRooms] = useState("1");
  const nights = checkIn && checkOut ? Math.round((Date.parse(checkOut + "T00:00:00Z") - Date.parse(checkIn + "T00:00:00Z")) / 86400000) : 0;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [bookingRes, requestRes] = await Promise.all([
        fetch("/api/bookings", { cache: "no-store" }),
        fetch("/api/admin/requests", { cache: "no-store" }),
      ]);
      const bookingData = await bookingRes.json().catch(() => ({}));
      if (!bookingRes.ok) throw new Error(bookingData.error || "Gagal memuat data booking.");
      setBookings(Array.isArray(bookingData.bookings) ? bookingData.bookings : []);
      if (requestRes.ok) {
        const requestData = await requestRes.json().catch(() => ({}));
        setRequests(Array.isArray(requestData.requests) ? requestData.requests.filter((r: AccessRequest) => r.status === "pending") : []);
        setPrimary(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    let idleTimer: ReturnType<typeof setTimeout>;
    let active = true;
    const logout = async () => {
      if (!active) return;
      active = false;
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      window.location.replace("/");
    };
    const resetIdle = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => void logout(), 20 * 60 * 1000); };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetIdle, { passive: true }));
    resetIdle();
    return () => { active = false; clearTimeout(idleTimer); events.forEach((event) => window.removeEventListener(event, resetIdle)); };
  }, [load]);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("create"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName, phone, roomType, checkIn, checkOut, guests: Number(guests), rooms: Number(rooms) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Pemesanan gagal.");
      setNotice("Permintaan booking berhasil dibuat. Simpan kode booking dan tunggu konfirmasi hotel.");
      setGuestName(""); setPhone(""); setCheckIn(""); setCheckOut("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Pemesanan gagal."); }
    finally { setBusy(""); }
  }

  async function verifyCheckin(code: string) {
    if (!window.confirm("Pastikan tamu sudah hadir di hotel dan identitasnya telah diperiksa. Verifikasi check-in sekarang?")) return;
    setBusy(code); setError(""); setNotice("");
    try {
      const response = await fetch("/api/bookings/" + encodeURIComponent(code) + "/checkin", { method: "PATCH" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Verifikasi gagal.");
      setNotice("Check-in berhasil diverifikasi secara manual."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Verifikasi gagal."); }
    finally { setBusy(""); }
  }

  async function reviewRequest(uid: string, action: "approve" | "reject") {
    setBusy(uid); setError("");
    try {
      const response = await fetch("/api/admin/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid, action }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal memproses permintaan.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal memproses permintaan."); }
    finally { setBusy(""); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.replace("/");
  }

  return (
    <main className="hotel-shell">
      <header className="hotel-header">
        <a href="/dashboard/hotel" className="hotel-brand"><span className="hotel-brand-icon"><BedDouble size={21}/></span><span><strong>Pesan Hotel</strong><small>Bali · Reservasi langsung</small></span></a>
        <button className="hotel-logout" onClick={() => void logout()}><LogOut size={16}/> Keluar</button>
      </header>
      <section className="hotel-hero">
        <div className="hotel-hero-copy"><span className="hotel-kicker">PENGINAPAN DI BALI</span><h1>Waktunya rehat di Bali.</h1><p>Ajukan reservasi, simpan kode booking, lalu tunjukkan kepada petugas saat tiba di hotel.</p><div className="hotel-hero-meta"><span><CheckCircle2 size={16}/> Bayar di hotel</span><span><Clock3 size={16}/> Verifikasi manual</span></div></div>
        <div className="hotel-hero-image" role="img" aria-label="Kolam renang dan pemandangan resort tropis di Bali" />
      </section>
      <section className="hotel-property">
        <div><span className="hotel-kicker">HOTEL PILIHAN</span><h2>Pandawa Hill Resort</h2><p>Jl. Pantai Pandawa No.15, Kutuh, Kuta Selatan, Badung, Bali 80361</p></div>
        <a href="https://pandawahillresort.com/rooms/" target="_blank" rel="noreferrer">Lihat kamar di situs resmi ↗</a>
      </section>
      <section className="hotel-section"><div className="hotel-section-heading"><div><span className="hotel-kicker">PILIH KAMAR</span><h2>Tipe kamar</h2></div><span className="hotel-source-note">Nama kamar mengacu pada situs resmi hotel</span></div>
        <div className="hotel-room-grid">{roomTypes.map((room, i) => <article className={"hotel-room-card room-" + i} key={room.name}><div className="hotel-room-image" aria-hidden="true"><BedDouble size={27}/></div><div className="hotel-room-content"><h3>{room.name}</h3><p>{room.detail}</p><div className="hotel-room-facts"><span><Users size={15}/>{room.capacity}</span><span>{room.size}</span></div><button className={"hotel-select-room " + (roomType === room.name ? "selected" : "")} type="button" onClick={() => { setRoomType(room.name); document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{roomType === room.name ? "Kamar dipilih ✓" : "Pilih kamar"}</button></div></article>)}</div>
        <p className="hotel-disclaimer">Tarif, ketersediaan kamar, dan konfirmasi akhir harus diperiksa langsung oleh hotel. Formulir ini mengajukan permintaan reservasi, bukan konfirmasi kamar tersedia.</p>
      </section>
      <section className="hotel-booking-layout">
        <form id="booking-form" className="hotel-form" onSubmit={submitBooking}>
          <span className="hotel-kicker">FORMULIR RESERVASI</span><h2>Rencanakan menginap</h2><p className="hotel-muted">Isi detail tamu dan tanggal. Tidak ada pembayaran online di aplikasi ini.</p>
          {error && <div className="hotel-alert error" role="alert">{error}</div>}
          {notice && <div className="hotel-alert success" role="status">{notice}</div>}
          <label className="hotel-field">Nama lengkap tamu<input required maxLength={100} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Sesuai identitas saat check-in"/></label>
          <label className="hotel-field">Nomor telepon / WhatsApp<input required maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} placeholder="Contoh: 081234567890" inputMode="tel"/></label>
          <label className="hotel-field">Tipe kamar<select value={roomType} onChange={e => setRoomType(e.target.value)}>{roomTypes.map(room => <option key={room.name} value={room.name}>{room.name}</option>)}</select></label>
          <div className="hotel-date-grid"><label className="hotel-field"><span><CalendarDays size={15}/> Check-in</span><input required type="date" min={new Date().toLocaleDateString("en-CA")} value={checkIn} onChange={e => { setCheckIn(e.target.value); if (checkOut && e.target.value >= checkOut) setCheckOut(""); }}/></label><label className="hotel-field"><span><CalendarDays size={15}/> Check-out</span><input required type="date" min={checkIn || new Date().toLocaleDateString("en-CA")} value={checkOut} onChange={e => setCheckOut(e.target.value)}/></label></div>
          <div className="hotel-date-grid"><label className="hotel-field">Jumlah tamu<select value={guests} onChange={e => setGuests(e.target.value)}>{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} tamu</option>)}</select></label><label className="hotel-field">Jumlah kamar<select value={rooms} onChange={e => setRooms(e.target.value)}>{[1,2,3].map(n => <option key={n} value={n}>{n} kamar</option>)}</select></label></div>
          <div className="hotel-summary"><span>Durasi menginap</span><strong>{nights > 0 ? nights + " malam" : "Pilih tanggal"}</strong><span>Harga dan ketersediaan</span><strong>Dikonfirmasi oleh hotel</strong></div>
          <button className="hotel-submit" type="submit" disabled={busy === "create"}>{busy === "create" ? "Mengirim permintaan…" : "Buat permintaan booking"}</button>
          <p className="hotel-small">Dengan melanjutkan, Anda memahami reservasi berstatus menunggu sampai diperiksa hotel. Pembayaran dilakukan langsung sesuai instruksi hotel.</p>
        </form>
        <aside className="hotel-steps"><span className="hotel-kicker">CARA KERJA</span><h2>Dari booking ke check-in</h2><ol><li><span>1</span><div><strong>Kirim permintaan</strong><p>Isi data tamu, tipe kamar, dan tanggal menginap.</p></div></li><li><span>2</span><div><strong>Simpan kode booking</strong><p>Kode unik muncul pada daftar booking Anda.</p></div></li><li><span>3</span><div><strong>Datang ke hotel</strong><p>Tunjukkan kode dan identitas kepada petugas hotel.</p></div></li><li><span>4</span><div><strong>Verifikasi manual</strong><p>Petugas yang berwenang mengubah status setelah memeriksa tamu secara langsung.</p></div></li></ol><div className="hotel-note"><strong>Catatan penting</strong><p>Ini prototipe reservasi untuk satu hotel. Sistem belum terhubung dengan inventaris atau sistem reservasi hotel, sehingga booking perlu dikonfirmasi oleh pihak hotel.</p></div></aside>
      </section>
      <section className="hotel-section hotel-bookings"><div className="hotel-section-heading"><div><span className="hotel-kicker">RESERVASI</span><h2>Daftar booking</h2></div><button className="hotel-refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/> Muat ulang</button></div>
        {loading ? <p className="hotel-muted">Memuat booking…</p> : bookings.length === 0 ? <div className="hotel-empty">Belum ada booking. Reservasi Anda akan tampil di sini.</div> : <div className="hotel-booking-list">{bookings.map(b => <article className="hotel-booking-card" key={b.id}><div className="hotel-booking-top"><div><span className="hotel-booking-code">{b.bookingCode}</span><h3>{b.guestName}</h3></div><span className={"hotel-status " + (b.status === "checked_in" ? "verified" : "")}>{b.status === "checked_in" ? "Check-in terverifikasi" : "Menunggu konfirmasi"}</span></div><p>{b.roomType} · {b.rooms} kamar · {b.guests} tamu · {b.nights} malam</p><p>{b.checkIn} sampai {b.checkOut}</p><div className="hotel-booking-bottom"><span>Pembayaran: langsung di hotel</span>{primary && b.status === "pending" && <button className="hotel-verify" disabled={busy === b.bookingCode} onClick={() => void verifyCheckin(b.bookingCode)}>{busy === b.bookingCode ? "Memproses…" : "Verifikasi check-in"}</button>}</div></article>)}</div>}
      </section>
      {primary && <section className="hotel-section"><div className="hotel-section-heading"><div><span className="hotel-kicker">ADMIN UTAMA</span><h2>Permintaan akses admin</h2></div></div>{requests.length === 0 ? <p className="hotel-muted">Tidak ada permintaan yang menunggu persetujuan.</p> : requests.map(r => <div className="hotel-admin-request" key={r.uid}><div><strong>{r.email || "Email tidak tersedia"}</strong><p>{r.requestedAt ? new Date(r.requestedAt).toLocaleString("id-ID") : "Waktu tidak tersedia"}</p></div><div><button onClick={() => void reviewRequest(r.uid,"approve")} disabled={!!busy}>Setujui</button><button className="reject" onClick={() => void reviewRequest(r.uid,"reject")} disabled={!!busy}>Tolak</button></div></div>)}</section>}
      <footer className="hotel-footer">Reservasi hotel · Bali <span>•</span> <a href="https://pandawahillresort.com/" target="_blank" rel="noreferrer">Situs resmi hotel</a></footer>
    </main>
  );
}
