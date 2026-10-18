import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ConversationModule({ onBack }) {
  const [vocabList, setVocabList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flashcard') // 'flashcard', 'quiz'
  
  const [slideDirection, setSlideDirection] = useState('translate-x-0 opacity-150')

  // State untuk kuis & sesi bertahap
  const [quizScore, setQuizScore] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSession, setQuizSession] = useState(0)
  const [shuffledQuizList, setShuffledQuizList] = useState([])
  const [shuffledOptions, setShuffledOptions] = useState([])

  // Touch handlers untuk Swipe Gesture
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Efek Suara Web Audio API
  const playSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      osc.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      if (type === 'flip') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(300, audioCtx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.1)
      } else if (type === 'swipe') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(250, audioCtx.currentTime)
        osc.frequency.linearRampToValueAtTime(500, audioCtx.currentTime + 0.12)
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.12)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('vocabulary').select('*').eq('category', 'Conversation').order('id', { ascending: true })
    if (error) {
      console.error('Error fetching conversation:', error)
    } else {
      setVocabList(data || [])
    }
    setLoading(false)
  }

  const pageSize = 5
  useEffect(() => {
    if (vocabList.length > 0) {
      const startIndex = quizSession * pageSize
      const sliceList = vocabList.slice(startIndex, startIndex + pageSize)
      const randomized = [...sliceList].sort(() => Math.random() - 0.5)
      setShuffledQuizList(randomized)
      setQuizIndex(0)
      setQuizScore(0)
      setQuizFinished(false)
    }
  }, [vocabList, quizSession])

  useEffect(() => {
    if (shuffledQuizList.length > 0 && quizIndex < shuffledQuizList.length) {
      const currentCorrect = shuffledQuizList[quizIndex].meaning_id
      const otherOptions = vocabList
        .filter(item => item.meaning_id !== currentCorrect)
        .map(item => item.meaning_id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)

      const options = [...otherOptions, currentCorrect].sort(() => Math.random() - 0.5)
      setShuffledOptions(options)
    }
  }, [quizIndex, shuffledQuizList, vocabList])

  const speakJapanese = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'
      window.speechSynthesis.speak(utterance)
    } else {
      alert('Browser kamu tidak mendukung fitur suara.')
    }
  }

  const handleNextCard = () => {
    playSound('swipe')
    setIsFlipped(false)
    setSlideDirection('-translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % vocabList.length)
      setSlideDirection('translate-x-full opacity-0 scale-95')
      setTimeout(() => {
        setSlideDirection('translate-x-0 opacity-100 scale-100')
      }, 50)
    }, 150)
  }

  const handlePrevCard = () => {
    playSound('swipe')
    setIsFlipped(false)
    setSlideDirection('translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + vocabList.length) % vocabList.length)
      setSlideDirection('-translate-x-full opacity-0 scale-95')
      setTimeout(() => {
        setSlideDirection('translate-x-0 opacity-100 scale-100')
      }, 50)
    }, 150)
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 30

    if (distance > minSwipeDistance) {
      handleNextCard()
    } else if (distance < -minSwipeDistance) {
      handlePrevCard()
    }

    touchStartX.current = 0
    touchEndX.current = 0
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <p>Memuat Modul Percakapan Profesor Agasa...</p>
      </div>
    )
  }

  if (vocabList.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="mb-4">Belum ada data Percakapan di database Supabase.</p>
        <button onClick={onBack} className="px-4 py-2 bg-indigo-600 rounded">Kembali ke Dashboard</button>
      </div>
    )
  }

  const currentVocab = vocabList[currentIndex]
  const isPassed = shuffledQuizList.length > 0 && quizScore >= Math.ceil(shuffledQuizList.length * 0.8)
  const hasNextSession = ((quizSession + 1) * pageSize) < vocabList.length

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white p-6 select-none">
      {/* Header */}
      <div className="flex justify-between items-center max-w-2xl mx-auto w-full mb-6">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold transition border border-slate-700 shadow"
        >
          ← Kembali ke Dashboard
        </button>
        <h1 className="text-xl font-bold tracking-wide">🔬 Bab 4: Percakapan & Kosakata</h1>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex justify-center gap-2 mb-6 max-w-2xl mx-auto w-full">
        <button 
          onClick={() => setActiveTab('flashcard')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'flashcard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          📚 Kartu Dialog & Suara
        </button>
        <button 
          onClick={() => setActiveTab('quiz')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          ⚡ Kuis Sesi {quizSession + 1}
        </button>
      </div>

      {/* TAB 1: FLASHCARD PERCAKAPAN */}
      {activeTab === 'flashcard' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <div className="flex justify-between w-full mb-2 text-sm text-slate-400 font-mono">
            <button 
              onClick={() => speakJapanese(currentVocab.hiragana)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full border border-slate-700"
            >
              🔊 Dengar Suara
            </button>
          </div>

          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
              playSound('flip')
              setIsFlipped(!isFlipped)
            }}
            className={`w-full h-80 cursor-pointer [perspective:1000px] transition-all duration-300 transform ${slideDirection}`}
          >
            <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              
              {/* Front Side */}
              <div className="absolute inset-0 w-full h-full rounded-2xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden] shadow-2xl border-2 border-indigo-500/50 overflow-hidden bg-slate-900">
                <div 
                  className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url('/images/agasa.jpg')` }}
                ></div>
                <div className="absolute inset-0 bg-slate-950/60"></div>

                <div className="relative z-10 space-y-3">
                  <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-500/40">
                    Kaiwa / Percakapan
                  </span>
                  <h2 className="text-3xl font-extrabold text-white my-2 drop-shadow-lg">
                    {currentVocab.hiragana}
                  </h2>
                  <p className="text-indigo-300 font-mono">[{currentVocab.romaji}]</p>
                  <p className="text-xs text-slate-300 mt-2 italic">✨ Klik kartu untuk melihat arti | Swipe untuk ganti</p>
                </div>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 w-full h-full rounded-2xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl border-2 border-emerald-500/50 overflow-hidden bg-slate-900">
                <div 
                  className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url('/images/agasa.jpg')` }}
                ></div>
                <div className="absolute inset-0 bg-slate-950/65"></div>

                <div className="relative z-10 space-y-3">
                  <h3 className="text-3xl font-extrabold text-emerald-300 my-2">{currentVocab.meaning_id}</h3>
                  <p className="text-lg text-emerald-200 font-semibold">EN: "{currentVocab.meaning_en}"</p>
                  <p className="text-xs text-slate-300 mt-4 italic">✨ Klik kartu untuk kembali</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KUIS PERCAKAPAN */}
      {activeTab === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          {!quizFinished && shuffledQuizList.length > 0 ? (
            <div className="w-full bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl space-y-6">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Kuis Percakapan Sesi {quizSession + 1} • Soal {quizIndex + 1} / {shuffledQuizList.length}</span>
                <button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400">🔊 Dengar</button>
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Pilih arti bahasa Indonesia yang benar untuk kalimat:</p>
                <div className="text-2xl font-extrabold text-white my-3">{shuffledQuizList[quizIndex].hiragana}</div>
                <p className="text-xs text-indigo-400 font-mono">[{shuffledQuizList[quizIndex].romaji}]</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {shuffledOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (opt === shuffledQuizList[quizIndex].meaning_id) {
                        setQuizScore(prev => prev + 1)
                      }
                      if (quizIndex + 1 < shuffledQuizList.length) {
                        setQuizIndex(prev => prev + 1)
                      } else {
                        setQuizFinished(true)
                      }
                    }}
                    className="py-3 px-4 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-base transition shadow text-center"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl text-center space-y-6">
              <h2 className="text-3xl font-bold text-emerald-400">Kuis Selesai! 🎉</h2>
              
              {isPassed ? (
                <div className="p-4 bg-indigo-500/20 border border-indigo-500/40 rounded-xl space-y-2">
                  <div className="text-4xl">🔬</div>
                  <h3 className="font-bold text-indigo-300">Penghargaan Profesor Agasa Sesi {quizSession + 1} Diraih!</h3>
                  <p className="text-xs text-slate-300">Hebat! Kamu berhasil menguasai percakapan harian ini.</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-xl space-y-2">
                  <h3 className="font-bold text-amber-300">Belum Lulus</h3>
                  <p className="text-xs text-slate-300">Coba ulangi kuis untuk memperlancar hafalan dialogmu.</p>
                </div>
              )}

              <p className="text-slate-300">Skor kamu:</p>
              <div className="text-5xl font-black text-indigo-400">{quizScore} / {shuffledQuizList.length}</div>

              {isPassed && hasNextSession ? (
                <button 
                  onClick={() => { 
                    setQuizSession(prev => prev + 1); 
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition shadow-lg"
                >
                  Lanjut ke Sesi Berikutnya →
                </button>
              ) : (
                <button 
                  onClick={() => { 
                    setQuizFinished(false); 
                    setQuizScore(0); 
                    setQuizIndex(0);
                    const startIndex = quizSession * pageSize;
                    const sliceList = vocabList.slice(startIndex, startIndex + pageSize);
                    setShuffledQuizList([...sliceList].sort(() => Math.random() - 0.5));
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition"
                >
                  Ulangi Kuis
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}