# 🕵️‍♂️ Mouri Minds
**A Progressive Web App (PWA) ala detektif untuk menaklukkan bahasa Jepang.**

Belajar Hiragana, Katakana, Kanji, dan Percakapan + Furigana dengan cara yang seru, interaktif, dan gak ngebosenin! Flashcard swipe, latihan kuas, dan kuis sesi bertahap.

![React](https://img.shields.io/badge/React-19-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Supabase](https://img.shields.io/badge/Supabase-DB-green) ![PWA](https://img.shields.io/badge/PWA-Ready-yellow)

🔗 **Live Demo:** https://mouri-minds.vercel.app

### ✨ Key Features
- **📚 Flashcard Detective Flip:** Animasi flip 3D, swipe gesture di HP, indikator kartu, auto-bunyi `ja-JP`
- **✍️ Latihan Kuas + Stroke Order:** Canvas HTML5 dengan panduan garis putus-putus + badge ①②③ urutan goresan
- **🔬 Percakapan + Furigana:** Kalimat asli campur Hiragana/Katakana/Kanji dipecah jadi chip `お | o` `げんき | genki` biar gampang hafal
- **⚡ Kuis Sesi Bertahap:** Sistem 5 soal per sesi, harus lulus 80% baru buka sesi berikutnya + Badge System
- **🔊 Audio Native:** Web Speech API (ja-JP) cepat & lambat
- **📱 PWA Installable:** Bisa di-install ke layar utama Android/iOS, ikon custom `conan.jpg`

### 🛠️ Tech Stack
- Frontend: React.js + Vite
- Styling: Tailwind CSS
- Backend & DB: Supabase (`vocabulary` table with category: Hiragana, Katakana, Kanji, Conversation)
- PWA: `manifest.json` + Service Worker
- API: Web Speech API, Canvas API, Touch Events

### 🚀 Getting Started

#### 1. Jalankan Lokal
```bash
git clone https://github.com/username/mouri-minds.git
cd mouri-minds
npm install

# buat file .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

npm run dev
#### 2. PWA Icon Setup
Pastikan file ikon ada di `public/`:
- `public/icon-192.png`
- `public/icon-512.png`
Convert dari `public/images/conan.jpg` ke PNG biar gak kepotong pas `maskable`.

Manifest sudah ada di `public/manifest.json`.

#### 3. Deploy ke Vercel (PWA Live)

> *PENTING - Cara Login Vercel:*
> Kalo belum punya akun, daftar dulu di Vercel.com pakai *email asli yang aktif*. Vercel bakal kirim email verifikasi dulu, kalo belum di-verif kamu gak bakal bisa login & deploy. Cek inbox/spam folder.

1. Push repo ke GitHub
2. Login Vercel (sudah verif email)
3. Add New Project > Import `mouri-minds`
4. Vercel auto-detect Vite > Klik Deploy
5. Jadi! Link kamu `xxx.vercel.app`

### 📂 Struktur Supabase
Table: `vocabulary`
- `hiragana` (text) : `あ` atau `おげんきですか`
- `romaji` (text) : `a` atau `o genki desu ka` (wajib pakai spasi buat furigana)
- `meaning_id` (text) : arti Indonesia
- `category` : `Hiragana` / `Katakana` / `Kanji` / `Conversation`

---