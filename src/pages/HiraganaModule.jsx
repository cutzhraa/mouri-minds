import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import StrokeOrderGuide from '../components/StrokeOrderGuide'
import { getExpectedStrokeCount, validateStrokeOrder } from '../lib/strokeOrderValidation'
import QuizStageMenu from '../components/QuizStageMenu'
import QuizDrawingChallenge from '../components/QuizDrawingChallenge'
import { recordLearning } from '../lib/learningProgress'

export default function HiraganaModule({ onBack }) {
  const [vocabList, setVocabList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flashcard')
  const [slideAnim, setSlideAnim] = useState('opacity-100 scale-100 translate-x-0')
  const canvasRef = useRef(null)
  const strokePathsRef = useRef([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokeCount, setStrokeCount] = useState(0)
  const [referenceStrokeCount, setReferenceStrokeCount] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSession, setQuizSession] = useState(() => Number(localStorage.getItem('hiragana_quiz_session_v2')) || 0)
  const [quizMode, setQuizMode] = useState(null)
  const [shuffledQuizList, setShuffledQuizList] = useState([])
  const [shuffledOptions, setShuffledOptions] = useState([])

  const [quizProgress, setQuizProgress] = useState(() => {
    const saved = localStorage.getItem('hiragana_quiz_progress_v2')
    return saved ? JSON.parse(saved) : {}
  })

  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const finishTimeoutRef = useRef(null)

  useEffect(() => { fetchHiragana() }, [])

  useEffect(() => {
    localStorage.setItem('hiragana_quiz_progress_v2', JSON.stringify(quizProgress))
  }, [quizProgress])
  useEffect(() => { localStorage.setItem('hiragana_quiz_session_v2', String(quizSession)) }, [quizSession])

  const fetchHiragana = async () => {
    setLoading(true)

    if (!navigator.onLine) {
      const cachedData = localStorage.getItem('hiragana_vocab_cache')
      if (cachedData) {
        setVocabList(JSON.parse(cachedData))
      } else {
        alert("Kamu sedang offline dan belum ada data cache tersimpan. Harap online sekali untuk mengunduh data.")
      }
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('category', 'Hiragana')
        .order('hiragana', { ascending: true })

      if (error) throw error

      if (data) {
        setVocabList(data)
        localStorage.setItem('hiragana_vocab_cache', JSON.stringify(data))
      }
    } catch (err) {
      console.warn("Gagal terhubung ke server (Fetch Failed), memuat data offline...", err)
      const cachedData = localStorage.getItem('hiragana_vocab_cache')
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

  const speakJapanese = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'ja-JP'
      window.speechSynthesis.speak(u)
    }
  }
  
  // MAJU KE KARTU BERIKUTNYA (BATAS MAKSIMAL DI KARTU TERAKHIR 'n')
  const handleNextCard = () => {
    if (currentIndex >= vocabList.length - 1) return 
    
    setIsFlipped(false)
    setAnalysisResult(null)
    setStrokeCount(0)
    setSlideAnim('opacity-0 translate-x-8 scale-95')
    setTimeout(() => {
      const n = currentIndex + 1
      setCurrentIndex(n)
      speakJapanese(vocabList[n]?.hiragana)
      setSlideAnim('opacity-0 -translate-x-8 scale-95')
      setTimeout(() => {
        setSlideAnim('opacity-100 translate-x-0 scale-100')
      }, 50)
    }, 200)
  }
  
  // BISA MUNDUR KE KARTU SEBELUMNYA (TETAPI TERBATAS DI KARTU PERTAMA 'a', TIDAK BISA TEMBUS KE 'n')
  const handlePrevCard = () => {
    if (currentIndex <= 0) return // Berhenti di kartu pertama ('a'), tidak bisa backswipe tembus ke akhir

    setIsFlipped(false)
    setAnalysisResult(null)
    setStrokeCount(0)
    setSlideAnim('opacity-0 -translate-x-8 scale-95')
    setTimeout(() => {
      const p = currentIndex - 1
      setCurrentIndex(p)
      speakJapanese(vocabList[p]?.hiragana)
      setSlideAnim('opacity-0 translate-x-8 scale-95')
      setTimeout(() => {
        setSlideAnim('opacity-100 translate-x-0 scale-100')
      }, 50)
    }, 200)
  }
  
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX }
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const d = touchStartX.current - touchEndX.current
    if (d > 40) handleNextCard()       // Swipe ke kiri = Maju
    else if (d < -40) handlePrevCard() // Swipe ke kanan = Mundur (bisa dari i balik ke a, tapi mentok di a)
    touchStartX.current = 0; touchEndX.current = 0
  }

  const HIRAGANA_STRIKE_TARGETS = {
    'あ': 3, 'い': 2, 'う': 2, 'え': 2, 'お': 3,
    'か': 3, 'き': 4, 'く': 1, 'け': 3, 'こ': 2,
    'さ': 3, 'し': 1, 'す': 2, 'せ': 2, 'そ': 1,
    'た': 4, 'ち': 2, 'つ': 1, 'て': 1, 'と': 2,
    'な': 4, 'に': 3, 'ぬ': 2, 'ね': 2, 'の': 1,
    'は': 3, 'ひ': 1, 'ふ': 4, 'へ': 1, 'ほ': 4,
    'ま': 3, 'み': 2, 'む': 3, 'め': 2, 'も': 3,
    'や': 3, 'ゆ': 2, 'よ': 2,
    'ら': 2, 'り': 2, 'る': 1, 'れ': 2, 'ろ': 1,
    'わ': 2, 'を': 3, 'ん': 1
  }

  const HIRAGANA_GUIDES = {
    'あ': [['①',80,115], ['②',160,55], ['③',250,180]],
    'い': [['①',115,80], ['②',205,85]],
    'う': [['①',165,65], ['②',115,130]],
    'え': [['①',140,85], ['②',95,190]],
    'お': [['①',80,115], ['②',160,55], ['③',240,150]],
    'か': [['①',110,70], ['②',190,60], ['③',150,160]],
    'き': [['①',110,75], ['②',110,120], ['③',100,165], ['④',140,185]],
    'く': [['①',180,80]],
    'け': [['①',110,80], ['②',185,70], ['③',140,150]],
    'こ': [['①',130,85], ['②',115,180]],
    'さ': [['①',115,75], ['②',180,105], ['③',125,200]],
    'し': [['①',175,70]],
    'す': [['①',125,75], ['②',140,135]],
    'せ': [['①',120,80], ['②',140,145]],
    'そ': [['①',125,70]],
    'た': [['①',115,75], ['②',190,70], ['③',130,135], ['④',130,185]],
    'ち': [['①',125,75], ['②',120,155]],
    'つ': [['①',160,110]],
    'て': [['①',120,95]],
    'と': [['①',175,75], ['②',120,140]],
    'な': [['①',125,75], ['②',180,60], ['③',120,135], ['④',145,185]],
    'に': [['①',120,75], ['②',155,80], ['③',190,70]],
    'ぬ': [['①',140,60], ['②',130,135]],
    'ね': [['①',135,65], ['②',135,130]],
    'の': [['①',155,100]],
    'は': [['①',120,75], ['②',175,65], ['③',135,145]],
    'ひ': [['①',165,120]],
    'ふ': [['①',155,55], ['②',110,110], ['③',185,115], ['④',145,145]],
    'へ': [['①',150,110]],
    'ほ': [['①',120,65], ['②',175,55], ['③',130,135], ['④',135,185]],
    'ま': [['①',120,75], ['②',120,135], ['③',135,185]],
    'み': [['①',135,75], ['②',135,140]],
    'む': [['①',130,65], ['②',145,135], ['③',175,180]],
    'め': [['①',140,75], ['②',130,130]],
    'も': [['①',140,75], ['②',125,135], ['③',180,135]],
    'や': [['①',120,75], ['②',175,65], ['③',150,155]],
    'ゆ': [['①',135,70], ['②',180,115]],
    'よ': [['①',155,65], ['②',135,150]],
    'ら': [['①',140,75], ['②',130,140]],
    'り': [['①',125,70], ['②',175,70]],
    'る': [['①',150,75]],
    'れ': [['①',130,75], ['②',155,125]],
    'ろ': [['①',145,110]],
    'わ': [['①',130,75], ['②',165,125]],
    'を': [['①',130,70], ['②',135,115], ['③',150,180]],
    'ん': [['①',150,110]]
  }

  const drawGuide = () => {
    const canvas = canvasRef.current
    if (!canvas || vocabList.length === 0) return
    strokePathsRef.current = []
    canvas.width = 340
    canvas.height = 340
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const current = vocabList[currentIndex]

    ctx.save()
    ctx.font = 'bold 200px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 5
    ctx.setLineDash([12, 12])
    ctx.strokeText(current?.hiragana, canvas.width/2, canvas.height/2)
    ctx.restore()

    const char = current?.hiragana
    const points = HIRAGANA_GUIDES[char]
    if (points) {
      const radius = 14
      const minGap = radius * 2 + 5
      const placed = []
      const offsets = [
        [0, 0], [-minGap, 0], [minGap, 0], [0, -minGap], [0, minGap],
        [-minGap, -minGap], [minGap, -minGap], [-minGap, minGap], [minGap, minGap],
        [-minGap * 2, 0], [minGap * 2, 0], [0, -minGap * 2], [0, minGap * 2]
      ]

      points.forEach(([num, x, y]) => {
        // Koordinat tiap huruf menjadi titik acuan. Geser hanya jika badge
        // bertabrakan dengan nomor sebelumnya atau keluar dari kanvas.
        const candidates = offsets.map(([dx, dy]) => ({
          x: Math.max(radius + 2, Math.min(canvas.width - radius - 2, x + dx)),
          y: Math.max(radius + 2, Math.min(canvas.height - radius - 2, y + dy))
        }))
        const position = candidates.find(candidate => placed.every(other =>
          Math.hypot(candidate.x - other.x, candidate.y - other.y) >= minGap
        )) || candidates[0]
        placed.push(position)

        ctx.save()
        ctx.beginPath()
        ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI)
        ctx.fillStyle = '#dc2626'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#fff'
        ctx.stroke()
        ctx.font = '700 13px system-ui, sans-serif'
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label = { '①': '1', '②': '2', '③': '3', '④': '4' }[num] || String(num)
        ctx.fillText(label, position.x, position.y)
        ctx.restore()
      })
    }

    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 18
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  useEffect(() => { 
    if (activeTab === 'writing') {
      setAnalysisResult(null)
      setStrokeCount(0)
      drawGuide() 
    }
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current)
  }, [activeTab, currentIndex, vocabList])

  useEffect(() => {
    let cancelled = false
    getExpectedStrokeCount(vocabList[currentIndex]?.hiragana).then(count => {
      if (!cancelled) setReferenceStrokeCount(count)
    }).catch(() => { if (!cancelled) setReferenceStrokeCount(null) })
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
    const {x, y} = getPos(e)
    ctx.beginPath(); ctx.moveTo(x, y)
    setIsDrawing(true)
    setAnalysisResult(null)
    strokePathsRef.current.push([{ x, y }])
  }

  const draw = (e) => {
    if (!isDrawing) return
    const ctx = canvasRef.current.getContext('2d')
    const {x, y} = getPos(e)
    ctx.lineTo(x, y); ctx.stroke()
    strokePathsRef.current[strokePathsRef.current.length - 1]?.push({ x, y })
  }

  const stopDrawing = async () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const currentLetter = vocabList[currentIndex]?.hiragana
    const requiredStrokes = referenceStrokeCount ?? HIRAGANA_STRIKE_TARGETS[currentLetter] ?? 1
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

  if (loading) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-white text-xs">Memuat...</div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white"><p className="text-xs">Belum ada data.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const targetStrokes = referenceStrokeCount ?? HIRAGANA_STRIKE_TARGETS[currentVocab?.hiragana] ?? 1
  const currentStrokeCount = Math.min(strokeCount, targetStrokes)
  
  const isPassed = shuffledQuizList.length > 0 && quizScore === shuffledQuizList.length

  const handleAnswer = (selectedOpt) => {
    recordLearning()
    const currentQuizItem = shuffledQuizList[quizIndex]
    const isCorrect = selectedOpt.id === currentQuizItem.id
    const newScore = isCorrect ? quizScore + 1 : quizScore

    if (isCorrect) {
      setQuizScore(newScore)
    }

    if (quizIndex + 1 < shuffledQuizList.length) {
      setQuizIndex(prev => prev + 1)
    } else {
      setQuizFinished(true)
      if (newScore === shuffledQuizList.length) {
        setQuizProgress(prev => {
          const sessionData = prev[quizSession] || { visual: false, audio: false, drawing: false }
          return {
            ...prev,
            [quizSession]: {
              ...sessionData,
              [quizMode]: true
            }
          }
        })
      }
    }
  }

  const handleDrawingAnswer = () => {
    recordLearning()
    const newScore = quizScore + 1
    setQuizScore(newScore)
    if (quizIndex + 1 < shuffledQuizList.length) setQuizIndex(index => index + 1)
    else {
      setQuizFinished(true)
      if (newScore === shuffledQuizList.length) setQuizProgress(prev => ({
        ...prev,
        [quizSession]: { ...(prev[quizSession] || { visual: false, audio: false, drawing: false }), drawing: true }
      }))
    }
  }

  const currentSessionProgress = quizProgress[quizSession] || { visual: false, audio: false, drawing: false }

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

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 max-w-md mx-auto w-full space-y-6">
        
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white drop-shadow">Bab 1: Hiragana Dasar</h1>
        </div>

        {/* Menu Navigasi Model Floating Pill / Capsule */}
        <div className="w-full max-w-[360px] mx-auto bg-slate-800/90 p-1.5 rounded-2xl flex items-center justify-between gap-1.5 shadow-xl border border-slate-700/80">
          <button 
            onClick={() => setActiveTab('flashcard')} 
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'flashcard' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            📚 Flashcard
          </button>
          
          <button 
            onClick={() => setActiveTab('writing')} 
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'writing' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            ✍️ Kuas
          </button>
          
          <button 
            onClick={() => { setActiveTab('quiz'); setQuizMode(null); setQuizFinished(false); setQuizScore(0); setQuizIndex(0); }} 
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'quiz' 
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            ⚡ Kuis {quizSession+1}
          </button>
        </div>

        <div className="flex flex-col items-center justify-center w-full pb-6">
          {activeTab === 'flashcard' && (
            <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
              <div 
                onTouchStart={handleTouchStart} 
                onTouchMove={handleTouchMove} 
                onTouchEnd={handleTouchEnd}
                onClick={() => { setIsFlipped(!isFlipped); speakJapanese(currentVocab.hiragana) }}
                className={`w-full h-[380px] sm:h-[420px] cursor-pointer [perspective:1000px] transition-all duration-300 ease-out transform ${slideAnim}`}
              >
                <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                  <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] border-2 border-indigo-500/50 bg-slate-900 overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/heiji.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/60"></div>
                    <div className="relative z-10 space-y-2">
                      <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold px-2.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex+1}/{vocabList.length}</span>
                      <h2 className="text-7xl sm:text-8xl font-extrabold text-white my-2 drop-shadow-lg">{currentVocab.hiragana}</h2>
                      <p className="text-xs text-slate-300">✨ Swipe kiri/kanan untuk navigasi</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-emerald-500/50 bg-slate-900 overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/heiji.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/65"></div>
                    <div className="relative z-10 space-y-2">
                      <h3 className="text-3xl font-extrabold text-emerald-300">{currentVocab.meaning_id}</h3>
                      <p className="text-base text-emerald-200 font-mono">Romaji: [{currentVocab.romaji}]</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'writing' && (
            <div className="flex flex-col items-center justify-center w-full max-w-[360px] space-y-3">
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
                  className="touch-none block relative z-10 w-full h-full" />

                {analysisResult && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-slate-950/50 backdrop-blur-[3px] transition-all">
                    {analysisResult.passed ? (
                      <div className="border-[6px] border-purple-800 bg-white/95 px-6 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(91,33,182,0.4)] animate-stamp flex items-center gap-3.5">
                        <img src="/images/detco.jpg" alt="SUGOI" className="w-[130px] h-[75px] object-cover rounded shadow-sm border border-purple-200" />
                        <span className="text-purple-800 font-black text-3xl tracking-widest uppercase drop-shadow-sm">SUGOI!</span>
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
                <button onClick={() => { setStrokeCount(0); drawGuide(); }} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold shadow hover:bg-slate-700">🔄 Ulangi Coretan</button>
                <button onClick={() => speakJapanese(currentVocab.hiragana)} className="py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-sm shadow hover:bg-slate-700">🔊</button>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
              {quizMode === null ? (
                <QuizStageMenu session={quizSession} sessionCount={Math.ceil(vocabList.length / pageSize)} progress={quizProgress}
                  onSelectSession={session => { setQuizSession(session); setQuizFinished(false); setQuizScore(0); setQuizIndex(0) }}
                  onStartMode={mode => { setQuizMode(mode); setQuizFinished(false); setQuizScore(0); setQuizIndex(0) }}
                  visualLabel="Mode Visual (Tebak Romaji)" audioLabel="Mode Audio (Tebak Suara)" drawingLabel="Kuis Tulis (Drawing Challenge)" showDrawing />
              ) : !quizFinished ? (
                <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <button onClick={() => setQuizMode(null)} className="text-indigo-400 hover:underline">← Kembali ke Menu Tahap</button>
                    <span>Sesi {quizSession+1} [{quizMode === 'visual' ? 'Romaji' : quizMode === 'audio' ? 'Audio' : 'Tulis'}] • {quizIndex+1}/{shuffledQuizList.length}</span>
                  </div>

                  {quizMode === 'visual' ? (
                    <div className="space-y-3">
                      <div className="flex justify-end"><button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400 text-sm">🔊</button></div>
                      <div className="text-center"><p className="text-xs text-slate-400">Pilih romaji:</p><div className="text-6xl font-extrabold my-2">{shuffledQuizList[quizIndex]?.hiragana}</div></div>
                      <div className="grid grid-cols-2 gap-2">
                        {shuffledOptions.map((opt, i) => (
                          <button key={i} onClick={() => handleAnswer(opt)} className="py-3 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-sm text-white shadow-md active:scale-95">{opt.romaji}</button>
                        ))}
                      </div>
                    </div>
                  ) : quizMode === 'audio' ? (
                    <div className="space-y-3">
                      <div className="flex flex-col items-center justify-center py-6 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-3">
                        <button 
                          onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)}
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
                  ) : <QuizDrawingChallenge key={`hiragana-${quizSession}-${quizIndex}`} item={shuffledQuizList[quizIndex]} onAnswer={handleDrawingAnswer} />}
                </div>
              ) : (
                <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl text-center space-y-3 shadow-xl">
                  <h2 className="text-xl font-bold text-emerald-400">Kuis Selesai! 🎉</h2>
                  <div className="text-3xl font-black text-indigo-400">{quizScore}/{shuffledQuizList.length}</div>
                  
                  {isPassed ? (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-300 font-semibold">Sempurna! Tahap {quizMode === 'visual' ? 'Romaji' : quizMode === 'audio' ? 'Tebak Suara' : 'Kuis Tulis'} Sesi {quizSession+1} Berhasil Dituntaskan.</p>
                      
                      <button
                        onClick={() => { setQuizFinished(false); setQuizScore(0); setQuizIndex(0); setQuizMode(null); }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold shadow-lg transition"
                      >
                        Kembali ke Menu Kuis
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-400 font-semibold">Belum 5/5! Kamu harus mendapatkan skor sempurna untuk lulus.</p>
                      <button 
                        onClick={() => { setQuizFinished(false); setQuizScore(0); setQuizIndex(0); }} 
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold shadow-lg transition"
                      >
                        Ulangi Kuis 🔄
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Bar untuk Tombol Kembali */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-3 px-6 flex justify-center items-center z-50 shadow-2xl">
        <button 
          onClick={onBack}
          className="w-full max-w-sm py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg border border-slate-700 text-slate-200"
        >
          <span>←</span> Kembali ke Menu Utama
        </button>
      </div>
    </div>
  )
}
