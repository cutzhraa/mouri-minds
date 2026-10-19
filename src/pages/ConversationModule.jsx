import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ConversationModule({ onBack }) {
  const [vocabList, setVocabList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flashcard')
  const [slideDirection, setSlideDirection] = useState('translate-x-0 opacity-100')
  const [quizScore, setQuizScore] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSession, setQuizSession] = useState(0)
  const [shuffledQuizList, setShuffledQuizList] = useState([])
  const [shuffledOptions, setShuffledOptions] = useState([])
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => { fetchConversations() }, [])

  // Fungsi fetch dengan dukungan Offline Cache (localStorage) untuk Conversation
  const fetchConversations = async () => {
    setLoading(true)

    // 1. Jika perangkat terdeteksi offline, langsung ambil data dari memori lokal HP
    if (!navigator.onLine) {
      const cachedData = localStorage.getItem('conversation_vocab_cache')
      if (cachedData) {
        setVocabList(JSON.parse(cachedData))
      } else {
        alert("Kamu sedang offline dan belum ada data cache Percakapan tersimpan. Harap online sekali untuk mengunduh data.")
      }
      setLoading(false)
      return
    }

    // 2. Jika online, ambil data dari Supabase
    try {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('category', 'Conversation')
        .order('id', { ascending: true })

      if (error) throw error

      if (data) {
        setVocabList(data)
        // Simpan salinan data ke localStorage sebagai cadangan offline
        localStorage.setItem('conversation_vocab_cache', JSON.stringify(data))
      }
    } catch (err) {
      console.warn("Gagal terhubung ke server (Fetch Failed), memuat data offline...", err)
      // Fallback jika terjadi kesalahan jaringan secara mendadak
      const cachedData = localStorage.getItem('conversation_vocab_cache')
      if (cachedData) {
        setVocabList(JSON.parse(cachedData))
      }
    } finally {
      setLoading(false)
    }
  }

  const pageSize = 5
  useEffect(() => {
    if (vocabList.length > 0) {
      const s = quizSession * pageSize
      const slice = vocabList.slice(s, s + pageSize)
      setShuffledQuizList([...slice].sort(() => Math.random() - 0.5))
      setQuizIndex(0); setQuizScore(0); setQuizFinished(false)
    }
  }, [vocabList, quizSession])

  useEffect(() => {
    if (shuffledQuizList.length > 0 && quizIndex < shuffledQuizList.length) {
      const correct = shuffledQuizList[quizIndex].meaning_id
      const others = vocabList.filter(i => i.meaning_id !== correct).map(i => i.meaning_id).sort(() => Math.random() - 0.5).slice(0, 3)
      setShuffledOptions([...others, correct].sort(() => Math.random() - 0.5))
    }
  }, [quizIndex, shuffledQuizList, vocabList])

  const speakJapanese = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ja-JP'
      window.speechSynthesis.speak(u)
    }
  }

  const handleNextCard = () => {
    setIsFlipped(false)
    setSlideDirection('-translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      const n = (currentIndex + 1) % vocabList.length
      setCurrentIndex(n); speakJapanese(vocabList[n]?.hiragana)
      setSlideDirection('translate-x-full opacity-0 scale-95')
      setTimeout(() => setSlideDirection('translate-x-0 opacity-100 scale-100'), 50)
    }, 150)
  }

  const handlePrevCard = () => {
    setIsFlipped(false)
    setSlideDirection('-translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      const p = (currentIndex - 1 + vocabList.length) % vocabList.length
      setCurrentIndex(p); speakJapanese(vocabList[p]?.hiragana)
      setSlideDirection('translate-x-full opacity-0 scale-95')
      setTimeout(() => setSlideDirection('translate-x-0 opacity-100 scale-100'), 50)
    }, 150)
  }

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX }
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const d = touchStartX.current - touchEndX.current
    if (d > 30) handleNextCard()
    else if (d < -30) handlePrevCard()
    touchStartX.current = 0; touchEndX.current = 0
  }

  if (loading) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-white text-xs">Memuat Percakapan...</div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white"><p className="text-xs">Belum ada data Percakapan.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const isPassed = shuffledQuizList.length > 0 && quizScore >= Math.ceil(shuffledQuizList.length * 0.8)
  const hasNextSession = ((quizSession + 1) * pageSize) < vocabList.length

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white px-4 py-6 max-w-md mx-auto w-full justify-start space-y-6 overflow-y-auto">
      <div className="w-full space-y-3 shrink-0">
        <div className="flex justify-between items-center w-full">
          <button onClick={onBack} className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs border border-slate-700">← Kembali</button>
          <h1 className="text-sm font-bold">🔬 Bab 4: Percakapan</h1>
        </div>
        <div className="flex justify-center gap-1.5 w-full pt-[5vh] sm:pt-[12vh]">
          <button onClick={() => setActiveTab('flashcard')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'flashcard' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'}`}>📚 Dialog</button>
          <button onClick={() => setActiveTab('quiz')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'quiz' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'}`}>⚡ Kuis {quizSession+1}</button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full pt-2 pb-6">
        {activeTab === 'flashcard' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              onClick={() => { setIsFlipped(!isFlipped); speakJapanese(currentVocab.hiragana) }}
              className={`w-full h-[380px] sm:h-[420px] cursor-pointer [perspective:1000px] transition-all duration-300 ${slideDirection}`}>
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] border-2 border-indigo-500/50 bg-slate-900 overflow-hidden">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/agasa.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/60"></div>
                  <div className="relative z-10 space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex+1}/{vocabList.length}</span>
                    <h2 className="text-[28px] sm:text-[32px] font-extrabold text-white my-2 leading-tight">{currentVocab.hiragana}</h2>
                    <p className="text-xs text-indigo-300 font-mono">[{currentVocab.romaji}]</p>
                    <p className="text-xs text-slate-300">✨ Klik untuk arti | Swipe</p>
                  </div>
                </div>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-emerald-500/50 bg-slate-900 overflow-hidden">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/agasa.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/65"></div>
                  <div className="relative z-10 space-y-2">
                    <h3 className="text-2xl font-extrabold text-emerald-300">{currentVocab.meaning_id}</h3>
                    {currentVocab.meaning_en && <p className="text-sm text-emerald-200">"{currentVocab.meaning_en}"</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            {!quizFinished ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between text-xs text-slate-400"><span>Sesi {quizSession+1} • {quizIndex+1}/{shuffledQuizList.length}</span><button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400">🔊</button></div>
                <div className="text-center"><p className="text-xs text-slate-400 mb-1">Pilih arti:</p><div className="text-2xl font-extrabold my-1">{shuffledQuizList[quizIndex]?.hiragana}</div><p className="text-xs text-indigo-400 font-mono">[{shuffledQuizList[quizIndex].romaji}]</p></div>
                <div className="grid grid-cols-1 gap-2">{shuffledOptions.map((opt,i) => (<button key={i} onClick={() => { if(opt===shuffledQuizList[quizIndex].meaning_id) setQuizScore(p=>p+1); if(quizIndex+1<shuffledQuizList.length) setQuizIndex(p=>p+1); else setQuizFinished(true)}} className="py-3 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-sm">{opt}</button>))}</div>
              </div>
            ) : (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl text-center space-y-3">
                <h2 className="text-xl font-bold text-emerald-400">Selesai! 🎉</h2><div className="text-3xl font-black text-indigo-400">{quizScore}/{shuffledQuizList.length}</div>
                {isPassed && hasNextSession ? <button onClick={() => setQuizSession(p=>p+1)} className="w-full py-3 bg-emerald-600 rounded-xl text-sm">Lanjut →</button> : <button onClick={() => { setQuizFinished(false); setQuizScore(0); setQuizIndex(0) }} className="w-full py-3 bg-indigo-600 rounded-xl text-sm">Ulangi</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}