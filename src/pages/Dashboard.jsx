import { useState } from 'react'
import { supabase } from '../lib/supabase'
import HiraganaModule from './HiraganaModule'
import KatakanaModule from './KatakanaModule'
import KanjiModule from './KanjiModule'
import ConversationModule from './ConversationModule'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function Dashboard({ session }) {
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'hiragana', 'katakana', 'kanji', 'conversation'

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
          <HiraganaModule onBack={() => setCurrentView('dashboard')} lang="id" />
        )}

        {currentView === 'katakana' && (
          <KatakanaModule onBack={() => setCurrentView('dashboard')} lang="id" />
        )}

        {currentView === 'kanji' && (
          <KanjiModule onBack={() => setCurrentView('dashboard')} lang="id" />
        )}

        {currentView === 'conversation' && (
          <ConversationModule onBack={() => setCurrentView('dashboard')} lang="id" />
        )}

        {currentView === 'dashboard' && (
          <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold mb-2">{t.welcome}</h2>
              <p className="text-slate-400">{t.subtitle}</p>
              <p className="mt-4 text-sm text-indigo-400 font-mono">Email: {session.user.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bab 1: Hiragana */}
              <div 
                onClick={() => setCurrentView('hiragana')}
                className="bg-slate-800 p-6 rounded-2xl border border-indigo-500/50 hover:border-indigo-400 cursor-pointer transition shadow-lg group flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0 bg-slate-700">
                  <img src="/images/heiji.jpg" alt="Hattori Heiji" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold group-hover:text-indigo-300 transition">{t.bab1}</h3>
                  <p className="text-xs text-slate-400 mt-1">{t.desc1}</p>
                </div>
              </div>

              {/* Bab 2: Katakana */}
              <div 
                onClick={() => setCurrentView('katakana')}
                className="bg-slate-800 p-6 rounded-2xl border border-indigo-500/50 hover:border-indigo-400 cursor-pointer transition shadow-lg group flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0 bg-slate-700">
                  <img src="/images/kid.jpg" alt="Kaito Kid" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold group-hover:text-indigo-300 transition">{t.bab2}</h3>
                  <p className="text-xs text-slate-400 mt-1">{t.desc2}</p>
                </div>
              </div>

              {/* Bab 3: Kanji */}
              <div 
                onClick={() => setCurrentView('kanji')}
                className="bg-slate-800 p-6 rounded-2xl border border-indigo-500/50 hover:border-indigo-400 cursor-pointer transition shadow-lg group flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0 bg-slate-700">
                  <img src="/images/kogoro.jpg" alt="Kogoro Mouri" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold group-hover:text-indigo-300 transition">{t.bab3}</h3>
                  <p className="text-xs text-slate-400 mt-1">{t.desc3}</p>
                </div>
              </div>

              {/* Bab 4: Percakapan */}
              <div 
                onClick={() => setCurrentView('conversation')}
                className="bg-slate-800 p-6 rounded-2xl border border-indigo-500/50 hover:border-indigo-400 cursor-pointer transition shadow-lg group flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0 bg-slate-700">
                  <img src="/images/agasa.jpg" alt="Profesor Agasa" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-bold group-hover:text-indigo-300 transition">{t.bab4}</h3>
                  <p className="text-xs text-slate-400 mt-1">{t.desc4}</p>
                </div>
              </div>
            </div>
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
            onClick={() => setCurrentView('hiragana')}
            className="flex flex-col items-center text-slate-400 hover:text-white text-xs font-semibold gap-1 transition"
          >
            <span className="text-lg">あ</span>
            <span>Hiragana</span>
          </button>
          <button 
            onClick={() => setCurrentView('katakana')}
            className="flex flex-col items-center text-slate-400 hover:text-white text-xs font-semibold gap-1 transition"
          >
            <span className="text-lg">ア</span>
            <span>Katakana</span>
          </button>
          <button 
            onClick={() => setCurrentView('kanji')}
            className="flex flex-col items-center text-slate-400 hover:text-white text-xs font-semibold gap-1 transition"
          >
            <span className="text-lg">漢字</span>
            <span>Kanji</span>
          </button>
          <button 
            onClick={() => setCurrentView('conversation')}
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
