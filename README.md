# Login Wajah Admin

Aplikasi Next.js untuk pendaftaran satu wajah admin dan login menggunakan `face-api.js`, Firestore, serta cookie sesi `HttpOnly`.

## Jalankan lokal

1. Gunakan Node.js 20 atau LTS yang kompatibel dengan Next.js 15.
2. Salin `.env.example` menjadi `.env.local`, lalu isi kredensial Firebase service account, `SESSION_SECRET` acak minimal 32 karakter, dan `ADMIN_SETUP_TOKEN` yang panjang dan rahasia.
3. Jalankan `npm install`.
4. Jalankan `npm run download:models` untuk mengunduh model ke `public/models/`. Pastikan file model tersedia pada build/deployment.
5. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.
6. Pilih **Daftarkan wajah**, masukkan token setup rahasia, izinkan kamera, lalu daftarkan wajah admin. Endpoint hanya menerima pendaftaran pertama.
7. Kembali ke tab **Login**.

## Environment variables

- `FIREBASE_PROJECT_ID`: ID project Firebase.
- `FIREBASE_CLIENT_EMAIL`: email service account.
- `FIREBASE_PRIVATE_KEY`: private key service account.
- `SESSION_SECRET`: rahasia JWT sesi, minimal 32 karakter acak.
- `ADMIN_SETUP_TOKEN`: token rahasia pendaftaran wajah pertama.

Jangan commit service account, private key, atau token asli ke GitHub. Simpan semua nilai tersebut sebagai secret environment variables di hosting. Firebase Admin SDK berjalan di server, jadi gunakan service account dengan hak akses minimum.

## Endpoint API

- `POST /api/auth/enroll`: menerima `{ setupToken, descriptor }`; hanya membuat profil admin pertama kali.
- `POST /api/auth/login`: menerima `{ descriptor }`; mencocokkan descriptor dengan jarak Euclidean di bawah `0.6`, lalu membuat cookie sesi.
- `POST /api/auth/activity`: memperpanjang sesi valid ketika ada aktivitas.
- `POST /api/auth/logout`: menghapus cookie sesi.

Descriptor disimpan di `adminFaceProfiles/admin`. Throttle percobaan login disimpan di `adminSecurity/faceLogin`.

## Sesi dan keamanan

Cookie sesi memakai `HttpOnly`, `SameSite=Strict`, `Secure` saat production, dan masa berlaku 20 menit. Dashboard memverifikasi sesi di server. Aktivitas pada dashboard memperpanjang sesi; 20 menit tanpa aktivitas akan melakukan logout.

**Batas keamanan penting:** pencocokan descriptor bukan bukti liveness. Foto, video, atau request API yang dipalsukan dapat melewati sistem tanpa pemeriksaan liveness kuat. Descriptor login dikirim dari browser ke endpoint, sehingga implementasi ini adalah prototipe/gerbang admin berisiko rendah, bukan autentikasi biometrik tingkat tinggi. Untuk sistem sensitif, tambahkan liveness detection dan faktor kedua, serta lakukan uji replay sebelum penggunaan produksi.

## Model face-api.js

Jalankan `npm run download:models`. Script mengunduh model Tiny Face Detector, Face Landmark 68, dan Face Recognition ke `public/models/`, yang dilayani pada URL `/models`. Tinjau lisensi dan ketersediaan upstream sebelum deployment.
