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
  const fetchConversations = async () => {
    setLoading(true)
    const { data } = await supabase.from('vocabulary').select('*').eq('category', 'Conversation').order('id', { ascending: true })
    setVocabList(data || [])
    setLoading(false)
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
      const nextIndex = (currentIndex + 1) % vocabList.length
      setCurrentIndex(nextIndex)
      speakJapanese(vocabList[nextIndex]?.hiragana)
      setSlideDirection('translate-x-full opacity-0 scale-95')
      setTimeout(() => setSlideDirection('translate-x-0 opacity-100 scale-100'), 50)
    }, 150)
  }

  const handlePrevCard = () => {
    setIsFlipped(false)
    setSlideDirection('translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      const prevIndex = (currentIndex - 1 + vocabList.length) % vocabList.length
      setCurrentIndex(prevIndex)
      speakJapanese(vocabList[prevIndex]?.hiragana)
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

  if (loading) return <div className="flex-1 flex items-center justify-center p-4 bg-slate-900 text-white"><p className="text-xs">Memuat Modul Percakapan...</p></div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900 text-white"><p className="mb-3 text-xs">Belum ada data Percakapan.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const isPassed = shuffledQuizList.length > 0 && quizScore >= Math.ceil(shuffledQuizList.length * 0.8)
  const hasNextSession = ((quizSession + 1) * pageSize) < vocabList.length

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white px-4 py-6 max-w-md mx-auto w-full justify-start space-y-6 overflow-y-auto">
      <div className="w-full space-y-3 shrink-0">
        <div className="flex justify-between items-center w-full">
          <button onClick={onBack} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold border border-slate-700 shadow">← Kembali</button>
          <h1 className="text-sm sm:text-base font-bold tracking-wide">🔬 Bab 4: Percakapan</h1>
        </div>
        <div className="flex justify-center gap-1.5 w-full pt-[5vh] sm:pt-[12vh]">
          <button onClick={() => setActiveTab('flashcard')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'flashcard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>📚 Dialog</button>
          <button onClick={() => setActiveTab('quiz')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>⚡ Kuis {quizSession + 1}</button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full pt-2 pb-6">
        {activeTab === 'flashcard' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-xs">
            <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              onClick={() => { setIsFlipped(!isFlipped); speakJapanese(currentVocab.hiragana) }}
              className={`w-full h-56 sm:h-64 cursor-pointer [perspective:1000px] transition-all duration-300 transform ${slideDirection}`}>
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] shadow-2xl border-2 border-indigo-500/50 overflow-hidden bg-slate-900">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url('/images/agasa.jpg')` }}></div>
                  <div className="absolute inset-0 bg-slate-950/60"></div>
                  <div className="relative z-10 space-y-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex + 1} dari {vocabList.length}</span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white my-1 drop-shadow-lg leading-tight">{currentVocab.hiragana}</h2>
                    <p className="text-[11px] text-indigo-300 font-mono">[{currentVocab.romaji}]</p>
                    <p className="text-[10px] text-slate-300 italic">✨ Klik untuk arti | Swipe</p>
                  </div>
                </div>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl border-2 border-emerald-500/50 overflow-hidden bg-slate-900">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url('/images/agasa.jpg')` }}></div>
                  <div className="absolute inset-0 bg-slate-950/65"></div>
                  <div className="relative z-10 space-y-1.5">
                    <h3 className="text-lg sm:text-xl font-extrabold text-emerald-300 my-0.5">{currentVocab.meaning_id}</h3>
                    <p className="text-xs text-emerald-200">EN: "{currentVocab.meaning_en}"</p>
                    <p className="text-[10px] text-slate-300 italic">✨ Klik untuk kembali</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-xs">
            {!quizFinished && shuffledQuizList.length > 0 ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-xl space-y-3">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono"><span>Sesi {quizSession + 1} • {quizIndex + 1}/{shuffledQuizList.length}</span><button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400">🔊</button></div>
                <div className="text-center"><p className="text-xs text-slate-400 mb-1">Pilih arti yang benar:</p><div className="text-xl font-extrabold text-white my-1">{shuffledQuizList[quizIndex].hiragana}</div><p className="text-[10px] text-indigo-400 font-mono">[{shuffledQuizList[quizIndex].romaji}]</p></div>
                <div className="grid grid-cols-1 gap-2">{shuffledOptions.map((opt, idx) => (<button key={idx} onClick={() => { if (opt === shuffledQuizList[quizIndex].meaning_id) setQuizScore(p => p + 1); if (quizIndex + 1 < shuffledQuizList.length) setQuizIndex(p => p + 1); else setQuizFinished(true) }} className="py-2.5 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-xs text-center">{opt}</button>))}</div>
              </div>
            ) : (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-xl text-center space-y-3">
                <h2 className="text-xl font-bold text-emerald-400">Kuis Selesai! 🎉</h2>
                <p className="text-xs text-slate-300">Skor kamu:</p><div className="text-3xl font-black text-indigo-400">{quizScore} / {shuffledQuizList.length}</div>
                {isPassed && hasNextSession ? <button onClick={() => setQuizSession(p => p + 1)} className="w-full py-2 bg-emerald-600 rounded-xl text-xs">Lanjut →</button> : <button onClick={() => { setQuizFinished(false); setQuizScore(0); setQuizIndex(0); const s = quizSession * pageSize; const slice = vocabList.slice(s, s + pageSize); setShuffledQuizList([...slice].sort(() => Math.random() - 0.5)) }} className="w-full py-2 bg-indigo-600 rounded-xl text-xs">Ulangi Kuis</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}