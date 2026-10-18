# 🕵️‍♂️ Mouri Minds
"A Progressive Web App (PWA) ala detektif untuk menaklukkan bahasa Jepang — belajar Hiragana, kosakata, dan kuis sesi bertahap dengan cara yang seru, interaktif, dan gak ngebosenin!"

React Tailwind CSS Vite Supabase PWA

### 💡 The Story / Latar Belakang
Pernah nggak sih, semangat banget mau belajar bahasa Jepang tapi bingung mulai dari mana, hafalan Hiragana hilang lagi besoknya, dan latihan nulisnya gak tau urutan goresannya bener apa enggak?

Dari rasa penasaran dan pengen bikin belajar jadi kayak main game detektif itulah Mouri Minds lahir! Aplikasi web interaktif ini dirancang khusus biar kamu bisa belajar dari NOL — mulai dari keadaan bersih, langsung latihan flashcard, coret-coret kanvas pakai kuas, sampai uji nyali di kuis sesi bertahap. Semua bisa dari HP!

### ✨ Key Features (Fitur Utama)

**📚 Flashcard Interaktif (Detective Flip):**
Belajar Hiragana/kosakata lengkap dengan indikator kartu, fitur balik kartu (flip animation), dan dukungan swipe gesture buat di HP. Lengkap dengan suara asli Jepang!

**✍️ Latihan Menulis Kuas (Canvas Brush):**
Fitur kanvas interaktif dengan garis putus-putus sebagai panduan, plus badge nomor urut goresan (stroke order) kayak ①, ②, ③ biar tulisanmu presisi.

**⚡ Kuis Sesi Bertahap & Badge System:**
Sistem kuis acak per 5 soal, harus lulus 80% baru bisa lanjut sesi berikutnya. Dapetin lencana prestasi tiap sesi yang kamu taklukkan!

**🔊 Audio Integrasi & Speech API:**
Fitur pengucapan otomatis pakai Web Speech API (ja-JP) buat ngelatih listening kamu.

**📱 Responsive Detective Design:**
Dioptimalkan khusus biar nyaman di HP Android/iOS (100dvh) maupun di desktop, dengan gambar latar Heiji yang estetik.

### 🛠️ Tech Stack

**Frontend:** React.js, Vite
**Styling:** Tailwind CSS
**Database & Backend:** Supabase (vocabulary table)
**Browser Features:** Web Speech API (Text-to-Speech), HTML5 Canvas API, Touch Gesture

### 🚀 Getting Started & Deployment

#### 1. Cara Menjalankan Lokal (Development)
Kalau kamu mau clone dan running proyek ini secara lokal:

```bash
# 1. Clone repository ini
git clone https://github.com/username/mouri-minds.git

# 2. Masuk ke direktori proyek
cd mouri-minds

# 3. Install dependencies
npm install

# 4. Setting env Supabase (buat file .env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# 5. Jalankan server lokal
npm run dev
#### 2. Cara Akses Online (PWA Live Demo)
Kamu bisa langsung belajar sekarang atau install sebagai PWA di HP:

👉 *https://mouri-minds.vercel.app*

#### 3. Cara Deploy Sendiri (Vercel)
Mau punya link online pribadi kayak di atas?

1.  Push repository kamu ke GitHub.
2.  Buat akun di *Vercel.com* dulu kalo belum ada — daftar pakai email aktif ya, nanti verif email dulu baru bisa login.
3.  Pas udah login, klik *Add New Project*.
4.  Import repository `mouri-minds`.
5.  Vercel bakal otomatis deteksi Vite React, tinggal klik *Deploy*! Selesai dalam 1 menit.
6.  Ganti domain jadi `mouri-minds.vercel.app` di setting Vercel.

---