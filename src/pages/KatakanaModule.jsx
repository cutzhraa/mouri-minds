import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function KatakanaModule({ onBack }) {
  const [vocabList, setVocabList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flashcard') // 'flashcard', 'writing', 'quiz'
  
  const [slideDirection, setSlideDirection] = useState('translate-x-0 opacity-150')

  // Ref untuk Canvas Coretan Kuas
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)

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
    fetchKatakana()
  }, [])

  const fetchKatakana = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('vocabulary').select('*').eq('category', 'Katakana').order('hiragana', { ascending: true })
    if (error) {
      console.error('Error fetching katakana:', error)
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
      const currentCorrect = shuffledQuizList[quizIndex].romaji
      const otherOptions = vocabList
        .filter(item => item.romaji !== currentCorrect)
        .map(item => item.romaji)
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

  // Canvas Drawing Setup untuk Katakana
  useEffect(() => {
    if (activeTab === 'writing' && canvasRef.current && vocabList.length > 0) {
      const canvas = canvasRef.current
      canvas.width = 300
      canvas.height = 300
      const ctx = canvas.getContext('2d')
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const current = vocabList[currentIndex]

      ctx.save()
      ctx.font = 'bold 170px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 4
      ctx.setLineDash([8, 8])
      ctx.strokeText(current?.hiragana, canvas.width / 2, canvas.height / 2)
      ctx.restore()

      ctx.font = 'bold 15px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const drawBadge = (num, x, y) => {
        ctx.beginPath()
        ctx.arc(x, y, 11, 0, 2 * Math.PI)
        ctx.fillStyle = '#dc2626'
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(num, x, y + 1)
      }

      // Contoh panduan guratan untuk huruf awal Katakana (ア, イ, ウ, エ, オ)
      if (current?.hiragana === 'ア') {
        drawBadge('①', 100, 50)
        drawBadge('②', 150, 140)
      } else if (current?.hiragana === 'イ') {
        drawBadge('①', 120, 50)
        drawBadge('②', 170, 140)
      } else if (current?.hiragana === 'ウ') {
        drawBadge('①', 150, 40)
        drawBadge('②', 90, 110)
        drawBadge('③', 150, 180)
      } else if (current?.hiragana === 'エ') {
        drawBadge('①', 150, 50)
        drawBadge('②', 100, 110)
        drawBadge('③', 150, 190)
      } else if (current?.hiragana === 'オ') {
        drawBadge('①', 100, 60)
        drawBadge('②', 150, 50)
        drawBadge('③', 150, 160)
      }

      ctx.strokeStyle = '#0f172a' 
      ctx.lineWidth = 18 
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [activeTab, currentIndex, vocabList])

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas && vocabList.length > 0) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const current = vocabList[currentIndex]
      ctx.save()
      ctx.font = 'bold 170px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 4
      ctx.setLineDash([8, 8])
      ctx.strokeText(current?.hiragana, canvas.width / 2, canvas.height / 2)
      ctx.restore()

      const drawBadge = (num, x, y) => {
        ctx.beginPath()
        ctx.arc(x, y, 11, 0, 2 * Math.PI)
        ctx.fillStyle = '#dc2626'
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(num, x, y + 1)
      }

      if (current?.hiragana === 'ア') {
        drawBadge('①', 100, 50)
        drawBadge('②', 150, 140)
      } else if (current?.hiragana === 'イ') {
        drawBadge('①', 120, 50)
        drawBadge('②', 170, 140)
      } else if (current?.hiragana === 'ウ') {
        drawBadge('①', 150, 40)
        drawBadge('②', 90, 110)
        drawBadge('③', 150, 180)
      } else if (current?.hiragana === 'エ') {
        drawBadge('①', 150, 50)
        drawBadge('②', 100, 110)
        drawBadge('③', 150, 190)
      } else if (current?.hiragana === 'オ') {
        drawBadge('①', 100, 60)
        drawBadge('②', 150, 50)
        drawBadge('③', 150, 160)
      }

      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 18
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <p>Memuat Modul Katakana Kaito Kid...</p>
      </div>
    )
  }

  if (vocabList.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="mb-4">Belum ada data Katakana di database Supabase (Pastikan kategori diatur 'Katakana').</p>
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
        <h1 className="text-xl font-bold tracking-wide">🎩 Bab 2: Katakana Dasar</h1>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex justify-center gap-2 mb-6 max-w-2xl mx-auto w-full">
        <button 
          onClick={() => setActiveTab('flashcard')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'flashcard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          📚 Flashcard & Suara
        </button>
        <button 
          onClick={() => setActiveTab('writing')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'writing' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          ✍️ Coretan Kuas
        </button>
        <button 
          onClick={() => setActiveTab('quiz')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          ⚡ Kuis Sesi {quizSession + 1}
        </button>
      </div>

      {/* TAB 1: FLASHCARD KATAKANA */}
      {activeTab === 'flashcard' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          <div className="flex justify-between w-full mb-2 text-sm text-slate-400 font-mono">
            <span>Kartu {currentIndex + 1} dari {vocabList.length} (Swipe ⬅️ ➡️)</span>
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
                  style={{ backgroundImage: `url('/images/kid.jpg')` }}
                ></div>
                <div className="absolute inset-0 bg-slate-950/60"></div>

                <div className="relative z-10 space-y-3">
                  <span className="text-xs uppercase tracking-widest text-indigo-300 font-bold px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-500/40">
                    Katakana Dasar
                  </span>
                  <h2 className="text-7xl font-extrabold text-white my-4 drop-shadow-lg">
                    {currentVocab.hiragana}
                  </h2>
                  <p className="text-xs text-slate-300 mt-4 italic">✨ Klik kartu untuk membalik | Swipe untuk ganti</p>
                </div>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 w-full h-full rounded-2xl p-8 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl border-2 border-emerald-500/50 overflow-hidden bg-slate-900">
                <div 
                  className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url('/images/kid.jpg')` }}
                ></div>
                <div className="absolute inset-0 bg-slate-950/65"></div>

                <div className="relative z-10 space-y-3">
                  <h3 className="text-3xl font-extrabold text-emerald-300 my-2">{currentVocab.meaning_id}</h3>
                  <p className="text-xl text-emerald-200 font-mono font-semibold">Romaji: [{currentVocab.romaji}]</p>
                  <p className="text-xs text-slate-300 mt-4 italic">✨ Klik kartu untuk kembali</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LATIHAN MENULIS KATAKANA (TANPA SWIPE) */}
      {activeTab === 'writing' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-4">
          <div className="text-center">
            <p className="text-sm text-slate-300">Ikuti guratan garis putus-putus Katakana:</p>
            <div className="text-5xl font-black text-indigo-400 my-1">{currentVocab.hiragana}</div>
            <p className="text-xs text-slate-400 font-mono">Romaji: {currentVocab.romaji}</p>
          </div>

          <div className="relative bg-white border-4 border-slate-700 rounded-2xl shadow-2xl overflow-hidden cursor-crosshair">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full border-b border-dashed border-slate-300 absolute"></div>
              <div className="h-full border-r border-dashed border-slate-300 absolute"></div>
            </div>

            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="touch-none block relative z-10"
            />
          </div>

          <div className="flex gap-3 w-full">
            <button 
              onClick={clearCanvas}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold transition"
            >
              🔄 Hapus Coretan
            </button>
            <button 
              onClick={() => speakJapanese(currentVocab.hiragana)}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold transition"
            >
              🔊 Suara
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: KUIS KATAKANA */}
      {activeTab === 'quiz' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
          {!quizFinished && shuffledQuizList.length > 0 ? (
            <div className="w-full bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl space-y-6">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Kuis Katakana Sesi {quizSession + 1} • Soal {quizIndex + 1} / {shuffledQuizList.length}</span>
                <button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400">🔊 Dengar</button>
              </div>

              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Pilih romaji yang benar untuk huruf Katakana:</p>
                <div className="text-7xl font-extrabold text-white my-4">{shuffledQuizList[quizIndex].hiragana}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {shuffledOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (opt === shuffledQuizList[quizIndex].romaji) {
                        setQuizScore(prev => prev + 1)
                      }
                      if (quizIndex + 1 < shuffledQuizList.length) {
                        setQuizIndex(prev => prev + 1)
                      } else {
                        setQuizFinished(true)
                      }
                    }}
                    className="py-4 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-lg transition shadow"
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
                  <div className="text-4xl">🎩</div>
                  <h3 className="font-bold text-indigo-300">Lencana Kaito Kid Sesi {quizSession + 1} Diraih!</h3>
                  <p className="text-xs text-slate-300">Hebat! Kamu berhasil menaklukkan sandi Katakana ini.</p>
                </div>
              ) : (
                <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-xl space-y-2">
                  <h3 className="font-bold text-amber-300">Belum Lulus</h3>
                  <p className="text-xs text-slate-300">Coba ulangi kuis untuk memperkuat hafalan Katakana-mu.</p>
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