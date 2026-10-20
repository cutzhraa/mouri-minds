import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import StrokeOrderGuide from '../components/StrokeOrderGuide'
import QuizStageMenu from '../components/QuizStageMenu'

export default function KatakanaModule({ onBack }) {
  const [vocabList, setVocabList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flashcard')
  const [slideDirection, setSlideDirection] = useState('translate-x-0 opacity-100')
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokeCount, setStrokeCount] = useState(0)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [quizScore, setQuizScore] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSession, setQuizSession] = useState(() => Number(localStorage.getItem('katakana_quiz_session_v2')) || 0)
  const [quizMode, setQuizMode] = useState(null)
  const [shuffledQuizList, setShuffledQuizList] = useState([])
  const [shuffledOptions, setShuffledOptions] = useState([])
  const [quizProgress, setQuizProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('katakana_quiz_progress_v2') || '{}') }
    catch { return {} }
  })
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const finishTimeoutRef = useRef(null)
  const strokePathsRef = useRef([])

  useEffect(() => { fetchKatakana() }, [])
  useEffect(() => { localStorage.setItem('katakana_quiz_progress_v2', JSON.stringify(quizProgress)) }, [quizProgress])
  useEffect(() => { localStorage.setItem('katakana_quiz_session_v2', String(quizSession)) }, [quizSession])
  const fetchKatakana = async () => {
    setLoading(true)
    if (!navigator.onLine) {
      const cachedData = localStorage.getItem('katakana_vocab_cache')
      if (cachedData) setVocabList(JSON.parse(cachedData))
      setLoading(false); return
    }
    try {
      const { data } = await supabase.from('vocabulary').select('*').eq('category', 'Katakana').order('hiragana', { ascending: true })
      if (data) { setVocabList(data); localStorage.setItem('katakana_vocab_cache', JSON.stringify(data)) }
    } catch { const c = localStorage.getItem('katakana_vocab_cache'); if(c) setVocabList(JSON.parse(c)) }
    finally { setLoading(false) }
  }

  const pageSize = 5
  useEffect(() => {
    if (vocabList.length > 0) {
      const s = quizSession * pageSize
      setShuffledQuizList([...vocabList.slice(s, s + pageSize)].sort(() => Math.random() - 0.5))
      setQuizIndex(0); setQuizScore(0); setQuizFinished(false)
    }
  }, [vocabList, quizSession])
  
  useEffect(() => {
    if (shuffledQuizList.length > 0 && quizIndex < shuffledQuizList.length) {
      const cur = shuffledQuizList[quizIndex]
      const others = vocabList.filter(i => i.id !== cur.id).sort(() => Math.random() - 0.5).slice(0, 3)
      setShuffledOptions([...others, cur].sort(() => Math.random() - 0.5))
    }
  }, [quizIndex, shuffledQuizList, vocabList])

  const speakJapanese = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text); u.lang = 'ja-JP'
      window.speechSynthesis.speak(u)
    }
  }
  
  const handleNextCard = () => {
    setIsFlipped(false); setAnalysisResult(null); setStrokeCount(0); strokePathsRef.current=[]
    setSlideDirection('-translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      const n = (currentIndex + 1) % vocabList.length
      setCurrentIndex(n); speakJapanese(vocabList[n]?.hiragana)
      setSlideDirection('translate-x-full opacity-0 scale-95')
      setTimeout(() => setSlideDirection('translate-x-0 opacity-100 scale-100'), 50)
    }, 150)
  }
  const handlePrevCard = () => {
    setIsFlipped(false); setAnalysisResult(null); setStrokeCount(0); strokePathsRef.current=[]
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
    if (d > 30) handleNextCard(); else if (d < -30) handlePrevCard()
    touchStartX.current = 0; touchEndX.current = 0
  }

  const KATAKANA_STRIKE_TARGETS = {
    'ア': 2, 'イ': 2, 'ウ': 3, 'エ': 3, 'オ': 3,'カ': 2, 'キ': 3, 'ク': 2, 'ケ': 3, 'コ': 2,'サ': 3, 'シ': 3, 'ス': 2, 'セ': 2, 'ソ': 2,'タ': 3, 'チ': 3, 'ツ': 3, 'テ': 3, 'ト': 2,'ナ': 2, 'ニ': 2, 'ヌ': 2, 'ネ': 4, 'ノ': 1,'ハ': 2, 'ヒ': 2, 'フ': 2, 'ヘ': 1, 'ホ': 4,'マ': 2, 'ミ': 3, 'ム': 2, 'メ': 2, 'モ': 3,'ヤ': 2, 'ユ': 2, 'ヨ': 3,'ラ': 2, 'リ': 2, 'ル': 2, 'レ': 1, 'ロ': 3,'ワ': 2, 'ヲ': 3, 'ン': 2,
    'ｱ': 2, 'ｲ': 2, 'ｳ': 3, 'ｴ': 3, 'ｵ': 3,'ｶ': 2, 'ｷ': 3, 'ｸ': 2, 'ｹ': 3, 'ｺ': 2,'ｻ': 3, 'ｼ': 3, 'ｽ': 2, 'ｾ': 2, 'ｿ': 2,'ﾀ': 3, 'ﾁ': 3, 'ﾂ': 3, 'ﾃ': 3, 'ﾄ': 2,'ﾅ': 2, 'ﾆ': 2, 'ﾇ': 2, 'ﾈ': 4, 'ﾉ': 1,'ﾊ': 2, 'ﾋ': 2, 'ﾌ': 2, 'ﾍ': 1, 'ﾎ': 4,'ﾏ': 2, 'ﾐ': 3, 'ﾑ': 2, 'ﾒ': 2, 'ﾓ': 3,'ﾔ': 2, 'ﾕ': 2, 'ﾖ': 3,'ﾘ': 2, 'ﾙ': 2, 'ﾚ': 1, 'ﾛ': 3,'ﾜ': 2, 'ｦ': 3, 'ﾝ': 2
  }

    const KATAKANA_GUIDES = {
    'ア': [['①',70,50],['②',95,135]], 'イ': [['①',85,85],['②',150,110]], 'ウ': [['①',120,55],['②',95,115],['③',145,115]],
    'エ': [['①',90,50],['②',135,85],['③',90,135]], 'オ': [['①',105,48],['②',80,95],['③',125,145]],
    'カ': [['①',85,60],['②',135,110]], 'キ': [['①',85,55],['②',140,85],['③',105,135]], 'ク': [['①',95,60],['②',135,125]], 'ケ': [['①',85,60],['②',145,85],['③',110,135]], 'コ': [['①',95,55],['②',90,135]],
    'サ': [['①',75,55],['②',135,75],['③',110,150]], 'シ': [['①',110,60],['②',95,95],['③',80,145]], 'ス': [['①',105,75],['②',145,130]], 'セ': [['①',100,75],['②',140,70]], 'ソ': [['①',110,60],['②',80,145]],
    'タ': [['①',105,75],['②',140,75],['③',125,135]], 'チ': [['①',90,60],['②',135,80],['③',110,145]], 'ツ': [['①',72,88],['②',112,88],['③',128,152]], 'テ': [['①',85,65],['②',155,108],['③',115,150]], 'ト': [['①',92,85],['②',145,115]], 'ナ': [['①',92,70],['②',140,120]], 'ニ': [['①',105,75],['②',105,140]], 'ヌ': [['①',95,75],['②',135,125]],
    'ネ': [['①', 135, 70], ['②', 110, 115], ['③', 125, 175], ['④', 180, 115]], 'ノ': [['①',125,85]],'ハ': [['①',105,75],['②',145,75]], 'ヒ': [['①',90,75],['②',135,110]], 'フ': [['①',90,80],['②',140,120]], 'ヘ': [['①',125,95]], 'ホ': [['①',85,60],['②',135,70],['③',96,132],['④',158,145]],
    'マ': [['①',92,75],['②',140,115]], 'ミ': [['①',105,75],['②',125,110],['③',145,145]],'ム': [['①',95,75],['②',135,125]], 'メ': [['①',88,78],['②',135,120]], 'モ': [['①',85,68],['②',135,78],['③',115,145]],
    'ヤ': [['①',95,80],['②',135,115]], 'ユ': [['①',92,68],['②',132,112]], 'ヨ': [['①',105,75],['②',140,95],['③',125,145]],
    'ラ': [['①', 110, 75], ['②', 135, 145]], 'リ': [['①',110,75],['②',145,70]],'ル': [['①',105,75],['②',140,70]], 'レ': [['①',125,90]], 'ロ': [['①',85,70],['②',140,95],['③',95,145]], 'ワ': [['①',92,75],['②',135,115]],
    'ヲ': [['①',88,68],['②',135,85],['③',115,150]], 'ン': [['①',115,75],['②',135,130]],
    'ｱ': [['①',70,50],['②',95,135]],'ｲ': [['①',85,85],['②',150,110]], 'ｳ': [['①',120,55],['②',95,115],['③',145,115]],'ｴ': [['①',90,50],['②',135,85],['③',90,135]], 'ｵ': [['①',105,48],['②',80,95],['③',125,145]], 'ｶ': [['①',85,60],['②',135,110]],
    'ｷ': [['①',85,55],['②',140,85],['③',105,135]], 'ｸ': [['①',95,60],['②',135,125]], 'ｹ': [['①',85,60],['②',145,85],['③',110,135]], 'ｺ': [['①',95,55],['②',90,135]], 'ｻ': [['①',75,55],['②',135,75],['③',110,150]], 'ｼ': [['①',110,60],['②',95,95],['③',80,145]],'ｽ': [['①',105,75],['②',145,130]], 'ｾ': [['①',100,75],['②',140,70]], 'ｿ': [['①',110,60],['②',80,145]], 'ﾀ': [['①',105,75],['②',140,75],['③',125,135]], 'ﾁ': [['①',90,60],['②',135,80],['③',110,145]], 'ﾂ': [['①',72,88],['②',112,88],['③',128,152]], 'ﾃ': [['①',85,65],['②',155,108],['③',115,150]], 'ﾄ': [['①',92,85],['②',145,115]], 'ﾅ': [['①',92,70],['②',140,120]], 'ﾆ': [['①',105,75],['②',105,140]], 'ﾇ': [['①',95,75],['②',135,125]], 'ﾈ': [['①',78,85],['②',118,105],['③',92,145],['④',112,178]], 'ﾉ': [['①',125,85]], 'ﾊ': [['①',105,75],['②',145,75]], 'ﾋ': [['①',90,75],['②',135,110]], 'ﾌ': [['①',90,80],['②',140,120]], 'ﾍ': [['①',125,95]], 'ﾎ': [['①',85,60],['②',135,70],['③',96,132],['④',158,145]], 'ﾏ': [['①',92,75],['②',140,115]], 'ﾐ': [['①',105,75],['②',125,110],['③',145,145]], 'ﾑ': [['①',95,75],['②',135,125]], 'ﾒ': [['①',88,78],['②',135,120]], 'ﾓ': [['①',85,68],['②',135,78],['③',115,145]], 'ﾔ': [['①',95,80],['②',135,115]], 'ﾕ': [['①',92,68],['②',132,112]], 'ﾖ': [['①',105,75],['②',140,95],['③',125,145]], 'ﾗ': [['①', 110, 75], ['②', 135, 145]], 'ﾘ': [['①',110,75],['②',145,70]],'ﾙ': [['①',105,75],['②',140,70]], 'ﾚ': [['①',125,90]], 'ﾛ': [['①',85,70],['②',140,95],['③',95,145]], 'ﾜ': [['①',92,75],['②',135,115]], 'ｦ': [['①',88,68],['②',135,85],['③',115,150]], 'ﾝ': [['①',115,75],['②',135,130]]
  }

  const drawGuide = () => {
    const canvas = canvasRef.current
    if (!canvas || vocabList.length === 0) return
    canvas.width = 340; canvas.height = 340
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const cur = vocabList[currentIndex]
    ctx.save()
    ctx.font = 'bold 200px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 5; ctx.setLineDash([12, 12])
    ctx.strokeText(cur?.hiragana, canvas.width/2, canvas.height/2)
    ctx.restore()
    const scale = 340/240
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const drawBadge = (num, x, y) => {
      ctx.beginPath(); ctx.arc(x*scale, y*scale, 13, 0, 2*Math.PI)
      ctx.fillStyle = '#dc2626'; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(num, x*scale, y*scale+1)
    }
    const points = KATAKANA_GUIDES[cur?.hiragana]
    if (points) points.forEach(([n, x, y]) => drawBadge(n, x, y))
    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    strokePathsRef.current = []
  }

  useEffect(() => { 
    if (activeTab === 'writing') { setAnalysisResult(null); setStrokeCount(0); drawGuide() }
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current)
  }, [activeTab, currentIndex, vocabList])

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
    setIsDrawing(true); setAnalysisResult(null)
    strokePathsRef.current.push([{x,y}])
  }
  const draw = (e) => {
    if (!isDrawing) return
    const ctx = canvasRef.current.getContext('2d')
    const {x, y} = getPos(e)
    ctx.lineTo(x, y); ctx.stroke()
    strokePathsRef.current[strokePathsRef.current.length-1].push({x,y})
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const currentLetter = vocabList[currentIndex]?.hiragana
    const requiredStrokes = KATAKANA_STRIKE_TARGETS[currentLetter] || 2
    const nextStrokeCount = strokeCount + 1
    setStrokeCount(nextStrokeCount)
    if (nextStrokeCount < requiredStrokes) return

    const guides = KATAKANA_GUIDES[currentLetter]
    if (!guides || strokePathsRef.current.length !== requiredStrokes) {
      setAnalysisResult({ passed: false })
      setTimeout(() => {
        setAnalysisResult(null); setStrokeCount(0); strokePathsRef.current=[]; drawGuide()
      }, 800)
      return
    }

    const strokeCenters = strokePathsRef.current.map(path => {
      if (path.length < 5) return null
      const xs = path.map(p=>p.x), ys = path.map(p=>p.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const len = Math.hypot(maxX-minX, maxY-minY)
      if (len < 25) return null
      return { x: (minX+maxX)/2, y: (minY+maxY)/2 }
    })

    if (strokeCenters.includes(null)) {
      setAnalysisResult({ passed: false })
      setTimeout(() => {
        setAnalysisResult(null); setStrokeCount(0); strokePathsRef.current=[]; drawGuide()
      }, 800)
      return
    }

    const scale = 340/240
    let allMatched = true
    const usedStrokeIdx = new Set()

    for (let [num, gx, gy] of guides) {
      const targetX = gx * scale
      const targetY = gy * scale
      let bestDist = Infinity
      let bestIdx = -1
      strokeCenters.forEach((center, idx) => {
        if (usedStrokeIdx.has(idx)) return
        const dist = Math.hypot(center.x - targetX, center.y - targetY)
        if (dist < bestDist) { bestDist = dist; bestIdx = idx }
      })
      if (bestDist > 95 || bestIdx === -1) {
        allMatched = false
        break
      }
      usedStrokeIdx.add(bestIdx)
    }

    if (!allMatched) {
      setAnalysisResult({ passed: false })
      setTimeout(() => {
        setAnalysisResult(null); setStrokeCount(0); strokePathsRef.current=[]; drawGuide()
      }, 800) // <-- 0.8 detik langsung kosong lagi
      return
    }

    setAnalysisResult({ passed: true })
    finishTimeoutRef.current = setTimeout(() => {
      setAnalysisResult(null); setStrokeCount(0); strokePathsRef.current=[]; setActiveTab('flashcard')
    }, 1000)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-white text-xs">Memuat Modul Katakana...</div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white"><p className="text-xs">Belum ada data Katakana.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const targetStrokes = KATAKANA_STRIKE_TARGETS[currentVocab?.hiragana] || 2
  const currentStrokeCount = Math.min(strokeCount, targetStrokes)
  const isPassed = shuffledQuizList.length > 0 && quizScore === shuffledQuizList.length
  const handleAnswer = (selectedOpt) => {
    const cur = shuffledQuizList[quizIndex]
    const correct = selectedOpt.id === cur.id
    const nextScore = quizScore + (correct ? 1 : 0)
    if (correct) setQuizScore(nextScore)
    if (quizIndex + 1 < shuffledQuizList.length) setQuizIndex(p=>p+1)
    else {
      setQuizFinished(true)
      if (nextScore === shuffledQuizList.length) setQuizProgress(prev => ({ ...prev, [quizSession]: { ...(prev[quizSession] || { visual: false, audio: false }), [quizMode]: true } }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-white overflow-y-auto select-none pb-24">
      <style>{`@keyframes stampDrop{0%{transform:scale(2.2) rotate(-25deg);opacity:0;filter:blur(8px)}50%{transform:scale(0.9) rotate(-10deg);opacity:1;filter:blur(0)}70%{transform:scale(1.15) rotate(-13deg)}100%{transform:scale(1) rotate(-12deg);opacity:1}}.animate-stamp{animation:stampDrop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards}`}</style>
      <div className="flex flex-col items-center justify-start px-4 pt-8 max-w-md mx-auto w-full space-y-6">
        <div className="text-center"><h1 className="text-xl sm:text-2xl font-black tracking-wide text-white drop-shadow">Bab 2: Katakana Dasar</h1></div>
        <div className="w-full max-w-[360px] mx-auto bg-slate-800/90 p-1.5 rounded-2xl flex items-center justify-between gap-1.5 shadow-xl border border-slate-700/80">
          <button onClick={() => setActiveTab('flashcard')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'flashcard' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}>📚 Flashcard</button>
          <button onClick={() => setActiveTab('writing')} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'writing' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}>✍️ Kuas</button>
          <button onClick={() => { setActiveTab('quiz'); setQuizMode(null); }} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeTab === 'quiz' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-slate-700/60'}`}>⚡ Kuis {quizSession+1}</button>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-2 pb-24 max-w-md mx-auto w-full">
        {activeTab === 'flashcard' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={() => { setIsFlipped(!isFlipped); speakJapanese(currentVocab.hiragana) }} className={`w-full h-[380px] sm:h-[420px] cursor-pointer [perspective:1000px] transition-all duration-300 ${slideDirection}`}>
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] border-2 border-indigo-500/50 bg-slate-900 overflow-hidden"><div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/kid.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/60"></div><div className="relative z-10 space-y-2"><span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex+1}/{vocabList.length}</span><h2 className="text-7xl sm:text-8xl font-extrabold text-white my-2">{currentVocab.hiragana}</h2><p className="text-xs text-slate-300"> Klik untuk balik | Swipe</p></div></div>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-emerald-500/50 bg-slate-900 overflow-hidden"><div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/kid.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/65"></div><div className="relative z-10 space-y-2"><h3 className="text-3xl font-extrabold text-emerald-300">{currentVocab.meaning_id}</h3><p className="text-base text-emerald-200 font-mono">Romaji: [{currentVocab.romaji}]</p></div></div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'writing' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px] space-y-3">
            <div className="text-center"><p className="text-xs text-slate-300">Selesaikan semua guratan ({strokeCount}/{targetStrokes}):</p><div className="text-4xl font-black text-indigo-400">{currentVocab.hiragana}</div></div>
            <StrokeOrderGuide character={currentVocab.hiragana} completedStrokes={currentStrokeCount} />
            <div className="relative bg-white border-3 border-slate-700 rounded-2xl shadow-xl overflow-hidden cursor-crosshair w-full aspect-square">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full border-b border-dashed border-slate-300 absolute"></div><div className="h-full border-r border-dashed border-slate-300 absolute"></div></div>
              <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="touch-none block relative z-10 w-full h-full" />
              {analysisResult && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-slate-950/50 backdrop-blur-[3px]">
                  {analysisResult.passed ? (
                    <div className="border-[6px] border-blue-900 bg-white/95 px-6 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(30,58,138,0.4)] animate-stamp flex items-center gap-3.5"><img src="/images/detco.jpg" alt="SUGOI" className="w-[130px] h-[75px] object-cover rounded shadow-sm border border-blue-200" /><span className="text-blue-900 font-black text-3xl tracking-widest uppercase">SUGOI!</span></div>
                  ) : (
                    <div className="border-4 border-amber-600 text-amber-600 px-6 py-3 rounded-2xl text-2xl font-black uppercase bg-white/95 animate-stamp">GAGAL / ULANGI</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 w-full"><button onClick={() => { setStrokeCount(0); drawGuide(); }} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold">🔄 🔄 Ulangi Coretan</button><button onClick={() => speakJapanese(currentVocab.hiragana)} className="py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-sm">🔊</button></div>
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
                visualLabel="Mode Visual (Tebak Romaji)"
                audioLabel="Mode Audio (Tebak Suara)"
              />
            ) : !quizFinished ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between text-xs text-slate-400"><button onClick={() => setQuizMode(null)} className="text-indigo-400"> ← Ganti Mode</button><span>Sesi {quizSession+1}  {quizIndex+1}/{shuffledQuizList.length}</span></div>
                {quizMode === 'visual' ? (
                  <div className="space-y-3"><div className="text-center"><p className="text-xs text-slate-400">Pilih romaji:</p><div className="text-6xl font-extrabold my-2">{shuffledQuizList[quizIndex]?.hiragana}</div></div><div className="grid grid-cols-2 gap-2">{shuffledOptions.map((opt,i)=><button key={i} onClick={()=>handleAnswer(opt)} className="py-3 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-sm">{opt.romaji}</button>)}</div></div>
                ) : (
                  <div className="space-y-3"><div className="flex flex-col items-center py-6 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-3"><button onClick={()=>speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl">🔊</button><p className="text-xs text-slate-300">Putar Rekaman Suara</p></div><div className="grid grid-cols-2 gap-2.5">{shuffledOptions.map((opt,i)=><button key={i} onClick={()=>handleAnswer(opt)} className="py-4 bg-slate-700 hover:bg-indigo-600 rounded-xl font-black text-xl">{opt.hiragana}</button>)}</div></div>
                )}
              </div>
            ) : (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl text-center space-y-3"><h2 className="text-xl font-bold text-emerald-400">Kuis Selesai! 🎉</h2><div className="text-3xl font-black text-indigo-400">{quizScore}/{shuffledQuizList.length}</div>{isPassed ? <button onClick={()=>{setQuizMode(null);setQuizFinished(false);setQuizScore(0);setQuizIndex(0)}} className="w-full py-3 bg-emerald-600 rounded-xl text-sm font-bold">Kembali ke Menu Kuis</button> : <button onClick={()=>{setQuizFinished(false);setQuizScore(0);setQuizIndex(0);setQuizMode(null)}} className="w-full py-3 bg-indigo-600 rounded-xl text-sm font-bold">Ulangi Kuis 🔄</button>}</div>
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
