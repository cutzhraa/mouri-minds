# 🕵️‍♂️ Mouri Minds

**A Progressive Web App (PWA) ala detektif untuk menaklukkan bahasa Jepang.**

Belajar Hiragana, Katakana, Kanji, serta percakapan dan kosakata dengan cara yang interaktif. Tersedia flashcard swipe, latihan kuas, dan kuis bertahap.

![React](https://img.shields.io/badge/React-19-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![Supabase](https://img.shields.io/badge/Supabase-DB-green) ![PWA](https://img.shields.io/badge/PWA-Ready-yellow)

🔗 **Live Demo:** [https://mouri-minds.vercel.app](https://mouri-minds.vercel.app/)

## ✨ Key Features

- **📚 Flashcard Detective Flip:** animasi flip, swipe gesture di HP, indikator kartu, dan pelafalan `ja-JP`.
- **✍️ Latihan Kuas + Stroke Order:** canvas HTML5, panduan urutan guratan, dan nomor guratan.
- **🔬 Percakapan + Furigana:** belajar kalimat dan kosakata percakapan Jepang.
- **⚡ Kuis Sesi Bertahap:** lima soal per sesi. Nilai 5/5 menandai tahap selesai; sesi dapat dipilih tanpa dikunci.
- **📝 Kuis Tulis:** Hiragana dan Katakana menyediakan tahap kuis menggambar karakter dengan validasi urutan guratan.
- **🏠 Daily Progress Hub:** ringkasan streak, target latihan harian, dan tombol untuk membuka modul terakhir.
- **🔊 Audio Native:** pelafalan menggunakan Web Speech API (`ja-JP`); suara yang tersedia bergantung pada browser dan perangkat.
- **📱 PWA Installable:** dapat dipasang pada perangkat yang mendukung PWA, dengan ikon dari `public/images/conan.png`.

## 🛠️ Tech Stack

- Frontend: React 19 + Vite 8
- Styling: Tailwind CSS 3
- Backend & DB: Supabase (`vocabulary` table dengan kategori Hiragana, Katakana, Kanji, dan Conversation)
- PWA: `vite-plugin-pwa`, manifest, dan service worker
- API: Web Speech API, Canvas API, dan Touch Events

## 🚀 Getting Started

### 1. Jalankan Lokal

Pastikan Node.js dan npm sudah terpasang.

```bash
git clone https://github.com/cutzhraa/mouri-minds.git
cd mouri-minds
npm install
npm run dev
```

Konfigurasi koneksi Supabase berada di `src/lib/supabase.js`. Sesuaikan URL proyek serta anon/publishable key jika menggunakan proyek Supabase sendiri. Jangan gunakan service role key pada frontend.

Perintah tambahan:

```bash
npm run build    # Membuat build produksi di dist/
npm run preview  # Menjalankan preview build produksi
npm run lint     # Menjalankan ESLint
```

### 2. PWA Icon Setup

Ikon PWA dikonfigurasi di `vite.config.js` dan menggunakan `public/images/conan.png` untuk ukuran 192×192 dan 512×512. Jika mengganti ikon, gunakan gambar PNG persegi dengan resolusi yang memadai dan perbarui konfigurasi manifest di file tersebut.

### 3. Deploy ke Vercel (PWA Live)

1. Push repository ke GitHub.
2. Login ke Vercel dan pilih **Add New Project**.
3. Import repository `mouri-minds`.
4. Pastikan konfigurasi Supabase di `src/lib/supabase.js` sesuai untuk deployment.
5. Deploy. Vercel akan mendeteksi Vite dan membangun aplikasi.

### 4. Struktur Supabase

Aplikasi membaca tabel `vocabulary` dan memfilter berdasarkan kolom `category`:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | integer/uuid | ID unik setiap data; digunakan untuk urutan serta jawaban kuis |
| `hiragana` | text | Karakter atau kalimat Jepang, misalnya `あ` atau `おげんきですか` |
| `romaji` | text | Cara baca latin; data percakapan menggunakan pemisah yang sesuai dengan format furigana aplikasi |
| `meaning_id` | text | Arti bahasa Indonesia |
| `meaning_en` | text | Arti bahasa Inggris (opsional untuk sejumlah tampilan) |
| `category` | text | `Hiragana`, `Katakana`, `Kanji`, atau `Conversation` |

## 📈 Progres dan Reset Kuis

Progres tahap dan sesi kuis disimpan di `localStorage` browser/perangkat. Progres kuis tidak otomatis ter-reset setiap hari. Sesi dapat dipilih bebas; kelulusan tahap dicatat saat mendapat nilai 5/5.

Dashboard menghitung streak dan target harian berdasarkan tanggal latihan. Saat ini aktivitas kuis dan latihan tulis Hiragana/Katakana yang memperbarui hitungan tersebut.
---
