import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function HiraganaModule({ onBack }) {
  const [vocabList, setVocabList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flashcard') // 'flashcard', 'writing', 'quiz'
  
  const [slideDirection, setSlideDirection] = useState('translate-x-0 opacity-100')

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

  useEffect(() => {
    fetchHiragana()
  }, [])

  const fetchHiragana = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('vocabulary').select('*').eq('category', 'Hiragana').order('hiragana', { ascending: true })
    if (error) {
      console.error('Error fetching hiragana:', error)
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
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'
      window.speechSynthesis.speak(utterance)
    } else {
      alert('Browser kamu tidak mendukung fitur suara.')
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
      setTimeout(() => {
        setSlideDirection('translate-x-0 opacity-100 scale-100')
      }, 50)
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

  // Canvas Drawing Setup
  useEffect(() => {
    if (activeTab === 'writing' && canvasRef.current && vocabList.length > 0) {
      const canvas = canvasRef.current
      canvas.width = 240
      canvas.height = 240
      const ctx = canvas.getContext('2d')
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const current = vocabList[currentIndex]

      ctx.save()
      ctx.font = 'bold 130px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 4
      ctx.setLineDash([8, 8])
      ctx.strokeText(current?.hiragana, canvas.width / 2, canvas.height / 2)
      ctx.restore()

      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const drawBadge = (num, x, y) => {
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, 2 * Math.PI)
        ctx.fillStyle = '#dc2626'
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(num, x, y + 1)
      }

      if (current?.hiragana === 'あ') {
        drawBadge('①', 110, 35)
        drawBadge('②', 60, 95)
        drawBadge('③', 130, 130)
      } else if (current?.hiragana === 'い') {
        drawBadge('①', 75, 50)
        drawBadge('②', 150, 70)
      } else if (current?.hiragana === 'う') {
        drawBadge('①', 110, 40)
        drawBadge('②', 70, 90)
      } else if (current?.hiragana === 'え') {
        drawBadge('①', 70, 70)
        drawBadge('②', 55, 140)
      } else if (current?.hiragana === 'お') {
        drawBadge('①', 70, 50)
        drawBadge('②', 110, 30)
        drawBadge('③', 140, 100)
      }

      ctx.strokeStyle = '#0f172a' 
      ctx.lineWidth = 14 
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
      ctx.font = 'bold 130px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 4
      ctx.setLineDash([8, 8])
      ctx.strokeText(current?.hiragana, canvas.width / 2, canvas.height / 2)
      ctx.restore()

      const drawBadge = (num, x, y) => {
        ctx.beginPath()
        ctx.arc(x, y, 10, 0, 2 * Math.PI)
        ctx.fillStyle = '#dc2626'
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillText(num, x, y + 1)
      }

      if (current?.hiragana === 'あ') {
        drawBadge('①', 110, 35)
        drawBadge('②', 60, 95)
        drawBadge('③', 130, 130)
      } else if (current?.hiragana === 'い') {
        drawBadge('①', 75, 50)
        drawBadge('②', 150, 70)
      } else if (current?.hiragana === 'う') {
        drawBadge('①', 110, 40)
        drawBadge('②', 70, 90)
      } else if (current?.hiragana === 'え') {
        drawBadge('①', 70, 70)
        drawBadge('②', 55, 140)
      } else if (current?.hiragana === 'お') {
        drawBadge('①', 70, 50)
        drawBadge('②', 110, 30)
        drawBadge('③', 140, 100)
      }

      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 14
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-slate-900 text-white">
        <p className="text-xs">Memuat Modul Hiragana Mouri Minds...</p>
      </div>
    )
  }

  if (vocabList.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900 text-white">
        <p className="mb-3 text-xs">Belum ada data Hiragana di database.</p>
        <button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs font-semibold">Kembali ke Dashboard</button>
      </div>
    )
  }

  const currentVocab = vocabList[currentIndex]
  const isPassed = shuffledQuizList.length > 0 && quizScore >= Math.ceil(shuffledQuizList.length * 0.8)
  const hasNextSession = ((quizSession + 1) * pageSize) < vocabList.length

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white px-4 py-6 max-w-md mx-auto w-full justify-start space-y-6 overflow-y-auto">
      {/* Top Section: Header & Tabs */}
      <div className="w-full space-y-3 shrink-0">
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <button 
            onClick={onBack}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold transition border border-slate-700 shadow"
          >
            ← Kembali
          </button>
          <h1 className="text-sm sm:text-base font-bold tracking-wide">🕵️‍♂️ Bab 1: Hiragana Dasar</h1>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex justify-center gap-1.5 w-full pt-[5vh] sm:pt-[12vh]">
          <button 
            onClick={() => setActiveTab('flashcard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'flashcard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            📚 Flashcard
          </button>
          <button 
            onClick={() => setActiveTab('writing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'writing' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            ✍️ Kuas
          </button>
          <button 
            onClick={() => setActiveTab('quiz')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            ⚡ Kuis {quizSession + 1}
          </button>
        </div>
      </div>

      {/* Middle Content Section (Diberikan padding top agar tidak terlalu menempel ke atas) */}
      <div className="flex flex-col items-center justify-center w-full pt-2 pb-6">
        {/* TAB 1: FLASHCARD */}
        {activeTab === 'flashcard' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-xs">
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                setIsFlipped(!isFlipped)
                speakJapanese(currentVocab.hiragana)
              }}
              className={`w-full h-56 sm:h-64 cursor-pointer [perspective:1000px] transition-all duration-300 transform ${slideDirection}`}
            >
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                
                {/* Front Side */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] shadow-2xl border-2 border-indigo-500/50 overflow-hidden bg-slate-900">
                  <div 
                    className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url('/images/heiji.jpg')` }}
                  ></div>
                  <div className="absolute inset-0 bg-slate-950/60"></div>

                  <div className="relative z-10 space-y-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">
                      Kartu {currentIndex + 1} dari {vocabList.length}
                    </span>
                    <h2 className="text-5xl sm:text-6xl font-extrabold text-white my-1 drop-shadow-lg">
                      {currentVocab.hiragana}
                    </h2>
                    <p className="text-[10px] text-slate-300 italic">✨ Klik kartu untuk membalik | Swipe</p>
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl border-2 border-emerald-500/50 overflow-hidden bg-slate-900">
                  <div 
                    className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url('/images/heiji.jpg')` }}
                  ></div>
                  <div className="absolute inset-0 bg-slate-950/65"></div>

                  <div className="relative z-10 space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-300 my-0.5">{currentVocab.meaning_id}</h3>
                    <p className="text-sm sm:text-base text-emerald-200 font-mono font-semibold">Romaji: [{currentVocab.romaji}]</p>
                    <p className="text-[10px] text-slate-300 italic">✨ Klik kartu untuk kembali</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LATIHAN MENULIS DENGAN KUAS */}
        {activeTab === 'writing' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-xs space-y-3">
            <div className="text-center">
              <p className="text-[11px] text-slate-300">Ikuti garis putus-putus dan tulis di kanvas:</p>
              <div className="text-3xl font-black text-indigo-400 my-0.5">{currentVocab.hiragana}</div>
              <p className="text-[10px] text-slate-400 font-mono">Romaji: {currentVocab.romaji}</p>
            </div>

            <div className="relative bg-white border-3 border-slate-700 rounded-xl shadow-xl overflow-hidden cursor-crosshair">
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
                className="touch-none block relative z-10 w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]"
              />
            </div>

            <div className="flex gap-2 w-full">
              <button 
                onClick={clearCanvas}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold transition"
              >
                🔄 Hapus
              </button>
              <button 
                onClick={() => speakJapanese(currentVocab.hiragana)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold transition"
              >
                🔊 Suara
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: KUIS ACAK PER SESI */}
        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-xs">
            {!quizFinished && shuffledQuizList.length > 0 ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-xl space-y-3">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Sesi {quizSession + 1} • {quizIndex + 1}/{shuffledQuizList.length}</span>
                  <button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400">🔊 Dengar</button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Pilih romaji yang benar:</p>
                  <div className="text-5xl font-extrabold text-white my-1">{shuffledQuizList[quizIndex].hiragana}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                      className="py-2.5 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-xs sm:text-sm transition shadow"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-xl text-center space-y-3">
                <h2 className="text-xl font-bold text-emerald-400">Kuis Selesai! 🎉</h2>
                
                {isPassed ? (
                  <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl space-y-1">
                    <div className="text-2xl">🏅</div>
                    <h3 className="font-bold text-indigo-300 text-xs">Lencana Sesi {quizSession + 1} Diraih!</h3>
                    <p className="text-[10px] text-slate-300">Hebat! Kamu berhasil menaklukkan sesi ini.</p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl space-y-1">
                    <h3 className="font-bold text-amber-300 text-xs">Belum Lulus</h3>
                    <p className="text-[10px] text-slate-300">Coba ulangi kuis untuk memperkuat hafalanmu.</p>
                  </div>
                )}

                <p className="text-xs text-slate-300">Skor kamu:</p>
                <div className="text-3xl font-black text-indigo-400">{quizScore} / {shuffledQuizList.length}</div>

                {isPassed && hasNextSession ? (
                  <button 
                    onClick={() => { 
                      setQuizSession(prev => prev + 1); 
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold transition shadow-lg"
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
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold transition"
                  >
                    Ulangi Kuis
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}