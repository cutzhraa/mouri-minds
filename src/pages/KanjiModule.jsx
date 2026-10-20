import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import StrokeOrderGuide from '../components/StrokeOrderGuide'
import QuizStageMenu from '../components/QuizStageMenu'
import { getExpectedStrokeCount, getStrokeNumberGroups, validateStrokeOrder } from '../lib/strokeOrderValidation'

export default function KanjiModule({ onBack }) {
  const [vocabList, setVocabList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flashcard')
  const [slideDirection, setSlideDirection] = useState('translate-x-0 opacity-100')
  const canvasRef = useRef(null)
  const strokePathsRef = useRef([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokeCount, setStrokeCount] = useState(0)
  const [referenceStrokeCount, setReferenceStrokeCount] = useState(null)
  const [strokeNumberGroups, setStrokeNumberGroups] = useState([])
  const [strokeGuideLoading, setStrokeGuideLoading] = useState(true)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSession, setQuizSession] = useState(() => Number(localStorage.getItem('kanji_quiz_session_v2')) || 0)
  const [quizMode, setQuizMode] = useState(null) // null = pilih mode, 'visual' = biasa, 'audio' = suara
  const [shuffledQuizList, setShuffledQuizList] = useState([])
  const [shuffledOptions, setShuffledOptions] = useState([])
  const [quizProgress, setQuizProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kanji_quiz_progress_v2') || '{}') }
    catch { return {} }
  })
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const finishTimeoutRef = useRef(null)

  useEffect(() => { fetchKanji() }, [])
  useEffect(() => { localStorage.setItem('kanji_quiz_progress_v2', JSON.stringify(quizProgress)) }, [quizProgress])
  useEffect(() => { localStorage.setItem('kanji_quiz_session_v2', String(quizSession)) }, [quizSession])

  const fetchKanji = async () => {
    setLoading(true)

    if (!navigator.onLine) {
      const cachedData = localStorage.getItem('kanji_vocab_cache')
      if (cachedData) {
        setVocabList(JSON.parse(cachedData))
      } else {
        alert("Kamu sedang offline dan belum ada data cache Kanji tersimpan. Harap online sekali untuk mengunduh data.")
      }
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('category', 'Kanji')
        .order('hiragana', { ascending: true })

      if (error) throw error

      if (data) {
        setVocabList(data)
        localStorage.setItem('kanji_vocab_cache', JSON.stringify(data))
      }
    } catch (err) {
      console.warn("Gagal terhubung ke server (Fetch Failed), memuat data offline...", err)
      const cachedData = localStorage.getItem('kanji_vocab_cache')
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
      const currentItem = shuffledQuizList[quizIndex]
      const others = vocabList.filter(i => i.id !== currentItem.id).sort(() => Math.random() - 0.5).slice(0, 3)
      setShuffledOptions([...others, currentItem].sort(() => Math.random() - 0.5))
    }
  }, [quizIndex, shuffledQuizList, vocabList])

  const speakJapanese = (textToSpeak) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(textToSpeak)
      u.lang = 'ja-JP'
      window.speechSynthesis.speak(u)
    }
  }
  
  const handleNextCard = () => {
    if (currentIndex >= vocabList.length - 1) return
    setIsFlipped(false)
    setAnalysisResult(null)
    setStrokeCount(0)
    setSlideDirection('-translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      const n = currentIndex + 1
      setCurrentIndex(n)
      const readings = vocabList[n]?.romaji?.split('/').map(r => r.trim()) || []
      speakJapanese(readings[0] || vocabList[n]?.hiragana)
      setSlideDirection('translate-x-full opacity-0 scale-95')
      setTimeout(() => setSlideDirection('translate-x-0 opacity-100 scale-100'), 50)
    }, 150)
  }
  
  const handlePrevCard = () => {
    if (currentIndex <= 0) return
    setIsFlipped(false)
    setAnalysisResult(null)
    setStrokeCount(0)
    setSlideDirection('-translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      const p = currentIndex - 1
      setCurrentIndex(p)
      const readings = vocabList[p]?.romaji?.split('/').map(r => r.trim()) || []
      speakJapanese(readings[0] || vocabList[p]?.hiragana)
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

  // Jumlah target guratan untuk setiap karakter Kanji
  const KANJI_STRIKE_TARGETS = {
    '日': 4, '月': 4, '火': 4, '水': 4, '木': 4,
    '金': 6, '土': 3, '人': 2, '車': 5, '本': 4,
    '川': 3, '山': 3, '雨': 8, '天': 4, '気': 8,
    '学校': 4, '先生': 4, '学生': 4, '日本': 4
  }

  const KANJI_GUIDES = {
    '日': [['①',110,45],['②',75,95],['③',135,95],['④',110,140]],
    '月': [['①',90,70],['②',115,55],['③',115,105],['④',115,155]],
    '火': [['①',110,60],['②',75,120],['③',145,110],['④',110,165]],
    '水': [['①',110,45],['②',75,90],['③',140,85],['④',110,150]],
    '木': [['①',75,75],['②',110,45],['③',110,110],['④',145,110]],
    '金': [['①',110,45],['②',110,80],['③',75,110],['④',145,110],['⑤',110,135],['⑥',110,165]],
    '土': [['①',75,75],['②',110,50],['③',110,135]],
    '人': [['①',110,55],['②',110,75]],
    '車': [['①',75,70],['②',75,100],['③',110,70],['④',75,130],['⑤',110,160]],
    '本': [['①',75,75],['②',110,45],['③',110,110],['④',145,110]],
    '川': [['①',85,60],['②',115,50],['③',145,45]],
    '山': [['①',110,50],['②',75,85],['③',145,85]],
    '雨': [['①',110,50],['②',75,80],['③',145,80],['④',95,115],['⑤',125,115],['⑥',95,145],['⑦',125,145],['⑧',110,110]],
    '天': [['①',80,75],['②',140,70],['③',110,50],['④',110,135]],
    '気': [['①',80,60],['②',115,55],['③',145,50],['④',80,105],['⑤',140,100],['⑥',110,140],['⑦',80,165],['⑧',140,160]],
    '学校': [['①',90,60],['②',130,55]],
    '先生': [['①',90,60],['②',130,55]],
    '学生': [['①',90,60],['②',130,55]],
    '日本': [['①',110,45],['②',75,95],['③',135,95],['④',110,140]]
  }

  const drawGuide = () => {
    const canvas = canvasRef.current
    if (!canvas || vocabList.length === 0) return
    strokePathsRef.current = []
    canvas.width = 480
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    const cur = vocabList[currentIndex]
    ctx.save()
    const characters = Array.from((cur?.hiragana || '').normalize('NFKC'))
    const glyphGap = 28
    const fontSize = Math.min(220, 390 / Math.max(1, characters.length))
    const glyphAdvance = fontSize + glyphGap
    const textWidth = characters.length * fontSize + Math.max(0, characters.length - 1) * glyphGap
    const firstCenterX = (canvas.width - textWidth) / 2 + fontSize / 2
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 5
    ctx.setLineDash([12,12])
    characters.forEach((character, index) => {
      ctx.strokeText(character, firstCenterX + index * glyphAdvance, canvas.height / 2)
    })
    ctx.restore()

    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const drawBadge = (num, x, y, radius) => {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, 2*Math.PI)
      ctx.fillStyle = '#dc2626'; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(String(num), x, y + 1)
    }

    if (strokeNumberGroups.length === characters.length && strokeNumberGroups.every(group => group.numbers.length)) {
      let order = 1
      const scale = fontSize / 109
      strokeNumberGroups.forEach((group, characterIndex) => {
        const centerX = firstCenterX + characterIndex * glyphAdvance
        group.numbers.forEach(({ x, y }) => {
          drawBadge(order++, centerX + (x - 54.5) * scale, canvas.height / 2 + (y - 54.5) * scale, Math.max(7, Math.min(12, 12 * scale)))
        })
      })
    } else {
      const points = KANJI_GUIDES[cur?.hiragana]
      const scale = canvas.width / 240
      if (points) points.forEach(([num, x, y], index) => drawBadge(index + 1, x * scale, y * scale, 12))
    }

    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }

  useEffect(() => { 
    if (activeTab === 'writing') {
      setAnalysisResult(null)
      setStrokeCount(0)
      drawGuide() 
    }
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current)
  }, [activeTab, currentIndex, vocabList, strokeNumberGroups])

  useEffect(() => {
    let cancelled = false
    const character = vocabList[currentIndex]?.hiragana
    setStrokeGuideLoading(true)
    Promise.all([getExpectedStrokeCount(character), getStrokeNumberGroups(character)]).then(([count, numberGroups]) => {
      if (!cancelled) {
        setReferenceStrokeCount(count)
        setStrokeNumberGroups(numberGroups)
        setStrokeGuideLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setReferenceStrokeCount(null)
        setStrokeNumberGroups([])
        setStrokeGuideLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [vocabList, currentIndex])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const clientX = e.clientX || e.touches?.[0].clientX
    const clientY = e.clientY || e.touches?.[0].clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  const startDrawing = (e) => {
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current)
    const ctx = canvasRef.current.getContext('2d')
    const {x,y} = getPos(e)
    ctx.beginPath(); ctx.moveTo(x,y)
    setIsDrawing(true)
    setAnalysisResult(null)
    strokePathsRef.current.push([{ x, y }])
  }

  const draw = (e) => {
    if (!isDrawing) return
    const ctx = canvasRef.current.getContext('2d')
    const {x,y} = getPos(e)
    ctx.lineTo(x,y); ctx.stroke()
    strokePathsRef.current[strokePathsRef.current.length - 1]?.push({ x, y })
  }

  const stopDrawing = async () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const currentLetter = vocabList[currentIndex]?.hiragana
    const requiredStrokes = referenceStrokeCount ?? KANJI_STRIKE_TARGETS[currentLetter] ?? 3
    const nextStrokeCount = strokeCount + 1
    setStrokeCount(nextStrokeCount)

    if (nextStrokeCount < requiredStrokes) return

    const passed = await validateStrokeOrder(currentLetter, strokePathsRef.current).catch(() => false)
    setAnalysisResult({ passed })
    if (!passed) return

    finishTimeoutRef.current = setTimeout(() => {
      setAnalysisResult(null)
      setStrokeCount(0)
      strokePathsRef.current = []
      setActiveTab('flashcard')
    }, 1800)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-white text-xs">Memuat Modul Kanji...</div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white"><p className="text-xs">Belum ada data Kanji.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const targetStrokes = referenceStrokeCount ?? KANJI_STRIKE_TARGETS[currentVocab?.hiragana] ?? 3
  const currentStrokeCount = Math.min(strokeCount, targetStrokes)
  const isPassed = shuffledQuizList.length > 0 && quizScore === shuffledQuizList.length

  const readings = currentVocab?.romaji ? currentVocab.romaji.split('/').map(r => r.trim()) : []

  const handleAnswer = (selectedOpt) => {
    const currentQuizItem = shuffledQuizList[quizIndex]
    const correct = selectedOpt.id === currentQuizItem.id
    const nextScore = quizScore + (correct ? 1 : 0)
    if (correct) setQuizScore(nextScore)
    if (quizIndex + 1 < shuffledQuizList.length) {
      setQuizIndex(prev => prev + 1)
    } else {
      setQuizFinished(true)
      if (nextScore === shuffledQuizList.length) setQuizProgress(prev => ({ ...prev, [quizSession]: { ...(prev[quizSession] || { visual: false, audio: false }), [quizMode]: true } }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-white overflow-y-auto select-none pb-24">
      <style>{`
        @keyframes stampDrop {
          0% { transform: scale(2.2) rotate(-25deg); opacity: 0; filter: blur(8px); }
          50% { transform: scale(0.9) rotate(-10deg); opacity: 1; filter: blur(0px); }
          70% { transform: scale(1.15) rotate(-13deg); }
          100% { transform: scale(1) rotate(-12deg); opacity: 1; }
        }
        .animate-stamp {
          animation: stampDrop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      <div className="flex flex-col items-center justify-start px-4 pt-8 max-w-md mx-auto w-full space-y-6">
        <div className="text-center"><h1 className="text-xl sm:text-2xl font-black tracking-wide text-white drop-shadow">Bab 3: Kanji Dasar</h1></div>
        <div className="w-full max-w-[360px] mx-auto bg-slate-800/90 p-1.5 rounded-2xl flex items-center justify-between gap-1.5 shadow-xl border border-slate-700/80">
          <button onClick={() => setActiveTab('flashcard')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'flashcard' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}>📚 Flashcard</button>
          <button onClick={() => setActiveTab('writing')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'writing' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}>✍️ Kuas</button>
          <button onClick={() => { setActiveTab('quiz'); setQuizMode(null); }} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'quiz' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}>⚡ Kuis {quizSession+1}</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-2 pb-24 max-w-2xl mx-auto w-full">
        {activeTab === 'flashcard' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              onClick={() => {
                const nextState = !isFlipped
                setIsFlipped(nextState)
                if (!nextState) {
                  speakJapanese(readings[0] || currentVocab.hiragana)
                } else {
                  speakJapanese(readings[1] || readings[0] || currentVocab.hiragana)
                }
              }}
              className={`w-full h-[380px] sm:h-[420px] cursor-pointer [perspective:1000px] transition-all duration-300 ${slideDirection}`}>
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] border-2 border-indigo-500/50 bg-slate-900 overflow-hidden shadow-xl">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/kogoro.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/60"></div>
                  <div className="relative z-10 space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex+1}/{vocabList.length}</span>
                    <h2 className="text-7xl sm:text-8xl font-extrabold text-white my-2">{currentVocab.hiragana}</h2>
                    <p className="text-xs text-slate-300"> Klik untuk balik & dengar bacaan kedua | Swipe</p>
                  </div>
                </div>

                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-emerald-500/50 bg-slate-900 overflow-hidden shadow-xl">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/kogoro.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/65"></div>
                  <div className="relative z-10 space-y-3">
                    <h3 className="text-3xl font-extrabold text-emerald-300">{currentVocab.meaning_id}</h3>
                    {currentVocab.meaning_en && <p className="text-sm text-emerald-200">"{currentVocab.meaning_en}"</p>}
                    <p className="text-base text-emerald-100 font-mono pt-2 border-t border-slate-700/60">Baca: [{currentVocab.romaji}]</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'writing' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[520px] space-y-3">
            <div className="text-center">
              <p className="text-xs text-slate-300">Selesaikan semua guratan ({strokeCount}/{targetStrokes}):</p>
              <div className="text-4xl font-black text-indigo-400">{currentVocab.hiragana}</div>
            </div>

            <StrokeOrderGuide character={currentVocab.hiragana} completedStrokes={currentStrokeCount} />

            <div className="relative bg-white border-3 border-slate-700 rounded-2xl shadow-xl overflow-hidden cursor-crosshair w-full aspect-square">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full border-b border-dashed border-slate-300 absolute"></div>
                <div className="h-full border-r border-dashed border-slate-300 absolute"></div>
              </div>
              <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                className={`touch-none block relative z-10 w-full h-full ${strokeGuideLoading ? 'pointer-events-none' : ''}`} />

              {/* STEMPEL DENGAN TEMA HIJAU TOSKA GELAP (DARK TEAL / EMERALD) */}
              {analysisResult && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-slate-950/50 backdrop-blur-[3px] transition-all">
                  {analysisResult.passed ? (
                    <div className="border-[6px] border-teal-800 bg-white/95 px-6 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(13,148,136,0.4)] animate-stamp flex items-center gap-3.5">
                      <img src="/images/detco.jpg" alt="SUGOI" className="w-[130px] h-[75px] object-cover rounded shadow-sm border border-teal-200" />
                      <span className="text-teal-800 font-black text-3xl tracking-widest uppercase drop-shadow-sm">SUGOI!</span>
                    </div>
                  ) : (
                    <div className="border-4 border-amber-600 text-amber-600 px-6 py-3 rounded-2xl text-2xl font-black uppercase tracking-widest shadow-2xl bg-white/95 animate-stamp">
                      GAGAL / ULANGI
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full">
              <button onClick={() => { setStrokeCount(0); drawGuide(); }} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold"> 🔄 Ulangi Coretan</button>
              <button onClick={() => speakJapanese(readings[0] || currentVocab.hiragana)} className="py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-sm">🔊</button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            {quizMode === null ? (
              <QuizStageMenu
                session={quizSession}
                sessionCount={Math.ceil(vocabList.length / pageSize)}
                progress={quizProgress}
                onSelectSession={(session) => { setQuizSession(session); setQuizFinished(false); setQuizScore(0); setQuizIndex(0) }}
                onStartMode={(mode) => {
                  setQuizMode(mode); setQuizFinished(false); setQuizScore(0); setQuizIndex(0)
                }}
                visualLabel="Mode Visual (Tebak Cara Baca)"
                audioLabel="Mode Audio (Dengar Suara)"
              />
            ) : !quizFinished ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <button onClick={() => setQuizMode(null)} className="text-indigo-400 hover:underline"> ← Ganti Mode</button>
                  <span>Sesi {quizSession+1}  {quizIndex+1}/{shuffledQuizList.length}</span>
                </div>

                {quizMode === 'visual' ? (
                  // TAMPILAN KUIS VISUAL KANJI
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => {
                        const curR = shuffledQuizList[quizIndex]?.romaji ? shuffledQuizList[quizIndex].romaji.split('/')[0].trim() : shuffledQuizList[quizIndex].hiragana
                        speakJapanese(curR)
                      }} className="text-indigo-400 text-sm">🔊</button>
                    </div>
                    <div className="text-center"><p className="text-xs text-slate-400">Pilih cara baca:</p><div className="text-6xl font-extrabold my-2">{shuffledQuizList[quizIndex]?.hiragana}</div></div>
                    <div className="grid grid-cols-2 gap-2">
                      {shuffledOptions.map((opt, i) => (
                        <button key={i} onClick={() => handleAnswer(opt)} className="py-3 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-xs text-white shadow-md active:scale-95">{opt.romaji}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // TAMPILAN KUIS SUARA (AUDIO) KANJI
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center py-6 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-3">
                      <button 
                        onClick={() => {
                          const curR = shuffledQuizList[quizIndex]?.romaji ? shuffledQuizList[quizIndex].romaji.split('/')[0].trim() : shuffledQuizList[quizIndex].hiragana
                          speakJapanese(curR)
                        }}
                        className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-2xl shadow-lg transition-transform active:scale-95">
                        🔊
                      </button>
                      <p className="text-xs text-slate-300 font-medium">Putar Rekaman Suara</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {shuffledOptions.map((opt, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleAnswer(opt)} 
                          className="py-4 bg-slate-700 hover:bg-indigo-600 rounded-xl font-black text-xl text-white transition-all shadow-md active:scale-95">
                          {opt.hiragana}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl text-center space-y-3">
                <h2 className="text-xl font-bold text-emerald-400">Kuis Selesai! 🎉</h2>
                <div className="text-3xl font-black text-indigo-400">{quizScore}/{shuffledQuizList.length}</div>
                {isPassed ? (
                  <div className="space-y-2"><p className="text-xs text-emerald-300">Sempurna! Tahap kuis ini selesai.</p><button onClick={() => { setQuizMode(null); setQuizFinished(false); setQuizScore(0); setQuizIndex(0) }} className="w-full py-3 bg-emerald-600 rounded-xl text-sm font-bold">Kembali ke Menu Kuis</button></div>
                ) : (
                  <button onClick={() => { setQuizFinished(false); setQuizScore(0); setQuizIndex(0); setQuizMode(null); }} className="w-full py-3 bg-indigo-600 rounded-xl text-sm font-bold shadow-lg">Ulangi Kuis</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-3 px-6 flex justify-center items-center z-50 shadow-2xl">
        <button onClick={onBack} className="w-full max-w-sm py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg border border-slate-700 text-slate-200">
          <span>←</span> Kembali ke Menu Utama
        </button>
      </div>
    </div>
  )
}
