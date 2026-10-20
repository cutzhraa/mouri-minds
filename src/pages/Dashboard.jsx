import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import HiraganaModule from './HiraganaModule'
import KatakanaModule from './KatakanaModule'
import KanjiModule from './KanjiModule'
import ConversationModule from './ConversationModule'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { readLearningOverview, recordLastModule } from '../lib/learningProgress'

const moduleTitle = module => ({ hiragana: 'Bab 1: Hiragana Dasar', katakana: 'Bab 2: Katakana Dasar', kanji: 'Bab 3: Kanji Dasar', conversation: 'Bab 4: Percakapan & Kosakata' }[module] || 'Bab 1: Hiragana Dasar')
const moduleIcon = module => ({ hiragana: 'あ', katakana: 'ア', kanji: '漢', conversation: '💬' }[module] || 'あ')

function getLearnerName(user) {
  const profileName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name
  const emailName = user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ')
  const name = String(profileName || emailName || 'Detektif').trim()
  return name.replace(/\b\p{L}/gu, letter => letter.toLocaleUpperCase('id-ID'))
}

export default function Dashboard({ session }) {
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'hiragana', 'katakana', 'kanji', 'conversation'
  const [overview, setOverview] = useState(() => readLearningOverview())
  const learnerName = getLearnerName(session?.user)
  const openModule = module => {
    recordLastModule(module)
    setOverview(readLearningOverview())
    setCurrentView(module)
  }
  const goHome = () => {
    setOverview(readLearningOverview())
    setCurrentView('dashboard')
  }

  useEffect(() => {
    const refreshOverview = () => setOverview(readLearningOverview())
    window.addEventListener('focus', refreshOverview)
    return () => window.removeEventListener('focus', refreshOverview)
  }, [])

  // Hook untuk mendeteksi update PWA
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const t = {
    welcome: "Selamat Datang di Mouri Minds!",
    subtitle: "Aplikasi Belajar Bahasa Jepang ala Detektif",
    bab1: "Bab 1: Hiragana Dasar",
    desc1: "Pengenalan huruf hiragana dasar.",
    bab2: "Bab 2: Katakana Dasar",
    desc2: "Pengenalan huruf katakana dasar.",
    bab3: "Bab 3: Kanji Dasar",
    desc3: "Pengenalan kanji level pemula.",
    bab4: "Bab 4: Percakapan & Kosakata",
    desc4: "Kosakata harian dan percakapan dasar.",
    logout: "Keluar"
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white select-none pb-16 sm:pb-0">
      {currentView === 'dashboard' && <>
      {/* Navbar hanya tampil di dashboard, tidak menutupi tampilan bab belajar. */}
      <nav className="flex justify-between items-center px-8 py-4 bg-slate-800 border-b border-slate-700 shadow sticky top-0 z-50">
        <div 
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0 bg-slate-700">
            <img src="/images/kogoro.jpg" alt="Mouri Kogoro" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold flex items-center gap-2">Mouri Minds</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition shadow"
          >
            {t.logout}
          </button>
        </div>
      </nav>

      {/* Banner / Tombol Update Manual */}
      {needRefresh && (
        <div className="bg-indigo-600 px-4 py-3 text-center flex flex-col sm:flex-row items-center justify-center gap-3 shadow-lg border-b border-indigo-500 z-40">
          <p className="text-xs font-semibold">✨ Versi terbaru Mouri Minds tersedia! Ingin memperbarui?</p>
          <div className="flex gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition shadow"
            >
              Update Sekarang 🚀
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      )}
      </>}

      {/* Main Content Router */}
      <div className="flex-1 flex flex-col">
        {currentView === 'hiragana' && (
          <HiraganaModule onBack={goHome} lang="id" />
        )}

        {currentView === 'katakana' && (
          <KatakanaModule onBack={goHome} lang="id" />
        )}

        {currentView === 'kanji' && (
          <KanjiModule onBack={goHome} lang="id" />
        )}

        {currentView === 'conversation' && (
          <ConversationModule onBack={goHome} lang="id" />
        )}

        {currentView === 'dashboard' && (
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
            <section className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-800 to-slate-800/70 p-5 shadow-xl sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Daily Progress Hub</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Hai, {learnerName}! 👋</h2>
              <p className="mt-1 text-sm text-slate-400">{t.subtitle}</p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-orange-400/20 bg-slate-900/60 p-4">
                  <p className="text-xs text-slate-400">Konsistensi belajar</p>
                  <p className="mt-1 text-xl font-extrabold text-orange-300">Streak {overview.streak} hari 🔥</p>
                </div>
                <div className="rounded-2xl border border-indigo-400/20 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between gap-2"><p className="text-xs text-slate-400">Target harian</p><span className="text-xs font-bold text-indigo-200">{Math.max(0, overview.target - overview.practicedToday)} huruf lagi</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${Math.min(100, overview.practicedToday / overview.target * 100)}%` }}/></div>
                  <p className="mt-1 text-[11px] text-slate-500">{Math.min(overview.practicedToday, overview.target)}/{overview.target} latihan hari ini</p>
                </div>
              </div>
            </section>

            <button onClick={() => openModule(overview.lastModule)} className="group rounded-3xl border border-violet-400/40 bg-gradient-to-r from-indigo-600 to-violet-700 p-5 text-left shadow-xl transition hover:-translate-y-0.5 hover:shadow-violet-900/40 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-100/80">Quick Continue</p>
              <div className="mt-3 flex items-center justify-between gap-4"><div><h3 className="text-xl font-black sm:text-2xl">Lanjutkan {moduleTitle(overview.lastModule)} →</h3><p className="mt-1 text-sm text-indigo-100/80">Teruskan belajar dari modul terakhir yang dibuka</p></div><span className="text-4xl transition group-hover:translate-x-1">{moduleIcon(overview.lastModule)}</span></div>
            </button>

            <p className="px-1 text-xs text-slate-500">Masuk sebagai {session.user.email}</p>
          </main>
        )}
      </div>

      {/* Bottom Navigation Bar (Hanya tampil di Dashboard) */}
      {currentView === 'dashboard' && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 py-2 px-6 flex justify-around items-center z-50 shadow-lg">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex flex-col items-center text-indigo-400 text-xs font-semibold gap-1"
          >
            <span className="text-lg">🏠</span>
            <span>Home</span>
          </button>
          <button 
            onClick={() => openModule('hiragana')}
            className="flex flex-col items-center text-slate-400 hover:text-white text-xs font-semibold gap-1 transition"
          >
            <span className="text-lg">あ</span>
            <span>Hiragana</span>
          </button>
          <button 
            onClick={() => openModule('katakana')}
            className="flex flex-col items-center text-slate-400 hover:text-white text-xs font-semibold gap-1 transition"
          >
            <span className="text-lg">ア</span>
            <span>Katakana</span>
          </button>
          <button 
            onClick={() => openModule('kanji')}
            className="flex flex-col items-center text-slate-400 hover:text-white text-xs font-semibold gap-1 transition"
          >
            <span className="text-lg">漢字</span>
            <span>Kanji</span>
          </button>
          <button 
            onClick={() => openModule('conversation')}
            className="flex flex-col items-center text-slate-400 hover:text-white text-xs font-semibold gap-1 transition"
          >
            <span className="text-lg">💬</span>
            <span>Chat</span>
          </button>
        </div>
      )}
    </div>
  )
}
