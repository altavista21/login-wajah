# Login Wajah Admin

Aplikasi Next.js untuk pendaftaran satu wajah admin dan login menggunakan `face-api.js`, Firebase Authentication, Firestore, serta cookie sesi `HttpOnly`.

## Jalankan lokal

1. Gunakan Node.js 20 atau LTS yang kompatibel dengan Next.js 15.
2. Isi kredensial Firebase Admin, `SESSION_SECRET` acak minimal 32 karakter, `ADMIN_EMAIL`, dan konfigurasi Firebase Web App di environment variables.
3. Di Firebase Console, aktifkan Authentication dengan provider Email/Password dan buat akun admin melalui Authentication → Users → Add user.
4. Daftarkan Web App di Project settings → General → Your apps jika belum ada, lalu ambil apiKey, authDomain, projectId, dan appId untuk variabel `NEXT_PUBLIC_FIREBASE_*`.
5. Jalankan `npm install`, lalu `npm run download:models` dan `npm run dev`.
6. Pilih **Daftarkan wajah**, masukkan kredensial akun Firebase admin yang emailnya sama persis dengan `ADMIN_EMAIL`, aktifkan kamera, lalu daftarkan wajah. Pendaftaran hanya berhasil sekali.
7. Kembali ke tab **Login**.

## Environment variables

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Firebase Admin SDK server credentials.
- `SESSION_SECRET`: rahasia JWT sesi, minimal 32 karakter acak.
- `ADMIN_EMAIL`: satu-satunya email Firebase yang diizinkan melakukan pendaftaran wajah awal.
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`: konfigurasi Firebase Web App. Ini konfigurasi client, bukan service-account private key.

Jangan commit service account atau private key ke GitHub. Simpan rahasia server di environment variables hosting. Buat akun admin melalui Firebase Console, bukan dengan membuka pendaftaran akun publik di website.

## Endpoint API

- `POST /api/auth/enroll`: menerima `{ idToken, descriptor }`; memverifikasi Firebase ID token, mencocokkan email dengan `ADMIN_EMAIL`, dan hanya membuat profil admin pertama kali.
- `POST /api/auth/login`: menerima `{ descriptor }`; mencocokkan descriptor dengan profil admin lalu membuat cookie sesi.
- `POST /api/auth/activity`: memperpanjang sesi valid ketika ada aktivitas.
- `POST /api/auth/logout`: menghapus cookie sesi.

Descriptor disimpan di `adminFaceProfiles/admin`. Throttle percobaan login disimpan di `adminSecurity/faceLogin`.

## Sesi dan keamanan

Cookie sesi memakai `HttpOnly`, `SameSite=Strict`, `Secure` saat production, dan masa berlaku 20 menit. Dashboard memverifikasi sesi di server; aktivitas memperpanjang sesi.

**Batas keamanan penting:** pencocokan descriptor bukan bukti liveness. Foto, video, atau request API yang dipalsukan dapat melewati sistem tanpa pemeriksaan liveness kuat. Jangan gunakan prototipe ini sebagai satu-satunya autentikasi untuk sistem sensitif; tambahkan liveness detection dan faktor kedua.

## Model face-api.js

Build mengunduh model Tiny Face Detector, Face Landmark 68, dan Face Recognition ke `public/models/`, yang dilayani pada URL `/models`. Tinjau lisensi dan ketersediaan upstream sebelum deployment.
