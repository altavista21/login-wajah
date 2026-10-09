# Login Wajah Admin

Aplikasi Next.js untuk autentikasi admin menggunakan pengenalan wajah, Firebase Authentication Google, Firestore, serta cookie sesi `HttpOnly`. Mendukung admin utama dan admin tambahan yang wajib mendapat persetujuan.

## Alur admin

1. Admin utama masuk menggunakan wajah yang sudah terdaftar.
2. Calon admin memilih **Ajukan akses admin** lalu login dengan Google.
3. Permintaan disimpan dengan status `pending`; calon admin belum dapat mendaftarkan wajah.
4. Admin utama membuka dashboard dan menyetujui atau menolak permintaan.
5. Setelah disetujui, calon admin login Google kembali dan mendaftarkan wajahnya.
6. Login wajah hanya berhasil untuk profil admin yang aktif. Admin tambahan tidak dapat menyetujui permintaan admin lain.

Profil admin utama lama tetap berada di `adminFaceProfiles/admin`. Profil admin tambahan disimpan berdasarkan Firebase UID di `adminFaceProfiles/{uid}`; permintaan akses ada di `adminAccessRequests/{uid}`.

## Jalankan lokal

1. Gunakan Node.js 20 atau LTS yang kompatibel dengan Next.js 15.
2. Isi kredensial Firebase Admin, `SESSION_SECRET` acak minimal 32 karakter, `ADMIN_EMAIL`, dan konfigurasi Firebase Web App di environment variables.
3. Di Firebase Console, buka Authentication → Sign-in method → Google, aktifkan provider Google, lalu pilih support email.
4. Di Authentication → Settings → Authorized domains, pastikan domain aplikasi (termasuk domain Vercel) diizinkan.
5. Daftarkan Web App di Project settings → General → Your apps jika belum ada, lalu ambil apiKey, authDomain, projectId, dan appId untuk variabel `NEXT_PUBLIC_FIREBASE_*`.
6. Jalankan `npm install`, lalu `npm run download:models` dan `npm run dev`.
7. Admin utama login dengan wajah yang sudah terdaftar. Admin baru mengajukan akses menggunakan Google, menunggu persetujuan di dashboard admin utama, lalu mendaftarkan wajah.

## Environment variables

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Firebase Admin SDK server credentials.
- `SESSION_SECRET`: rahasia JWT sesi, minimal 32 karakter acak.
- `ADMIN_EMAIL`: email Google terverifikasi milik admin utama.
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`: konfigurasi Firebase Web App. Ini konfigurasi client, bukan service-account private key.

Jangan commit service account atau private key ke GitHub. Simpan rahasia server di environment variables hosting.

## Endpoint API

- `POST /api/auth/request-access`: memverifikasi ID token Google dan membuat/memeriksa permintaan akses.
- `POST /api/auth/enroll`: hanya mendaftarkan wajah untuk permintaan yang sudah disetujui.
- `POST /api/auth/login`: mencocokkan wajah admin utama atau admin tambahan yang sudah terdaftar.
- `GET /api/admin/requests`: daftar permintaan, khusus admin utama.
- `POST /api/admin/requests`: menyetujui atau menolak permintaan, khusus admin utama.
- `POST /api/auth/activity`: memperpanjang sesi yang masih aktif.
- `POST /api/auth/logout`: menghapus cookie sesi.

## Sesi dan keamanan

Cookie sesi memakai `HttpOnly`, `SameSite=Strict`, `Secure` saat production, dan masa berlaku 20 menit. Dashboard dan endpoint persetujuan memverifikasi sesi di server. Status admin tambahan diperiksa lagi saat sesi diperpanjang.

**Batas keamanan penting:** pencocokan descriptor bukan bukti liveness. Foto, video, atau request API yang dipalsukan dapat melewati sistem tanpa pemeriksaan liveness kuat. Jangan gunakan prototipe ini sebagai satu-satunya autentikasi untuk sistem sensitif; tambahkan liveness detection dan faktor kedua.

## Model face-api.js

Build mengunduh model Tiny Face Detector, Face Landmark 68, dan Face Recognition ke `public/models/`, yang dilayani pada URL `/models`. Tinjau lisensi dan ketersediaan upstream sebelum deployment.
