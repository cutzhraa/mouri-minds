import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

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
  const [quizSession, setQuizSession] = useState(0)
  const [quizMode, setQuizMode] = useState(null) // null = pilih mode, 'visual' = biasa, 'audio' = suara
  const [shuffledQuizList, setShuffledQuizList] = useState([])
  const [shuffledOptions, setShuffledOptions] = useState([])
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const finishTimeoutRef = useRef(null)

  useEffect(() => { fetchKatakana() }, [])

  const fetchKatakana = async () => {
    setLoading(true)

    if (!navigator.onLine) {
      const cachedData = localStorage.getItem('katakana_vocab_cache')
      if (cachedData) {
        setVocabList(JSON.parse(cachedData))
      } else {
        alert("Kamu sedang offline dan belum ada data cache Katakana tersimpan. Harap online sekali untuk mengunduh data.")
      }
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('category', 'Katakana')
        .order('hiragana', { ascending: true })

      if (error) throw error

      if (data) {
        setVocabList(data)
        localStorage.setItem('katakana_vocab_cache', JSON.stringify(data))
      }
    } catch (err) {
      console.warn("Gagal terhubung ke server (Fetch Failed), memuat data offline...", err)
      const cachedData = localStorage.getItem('katakana_vocab_cache')
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
  
  const handleNextCard = () => {
    setIsFlipped(false)
    setAnalysisResult(null)
    setStrokeCount(0)
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
    setAnalysisResult(null)
    setStrokeCount(0)
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

  // Peta Jumlah Target Guratan Berdasarkan Karakter Katakana
  const KATAKANA_STRIKE_TARGETS = {
    'ア': 2, 'イ': 2, 'ウ': 3, 'エ': 3, 'オ': 3,
    'カ': 2, 'キ': 3, 'ク': 2, 'ケ': 3, 'コ': 2,
    'サ': 3, 'シ': 3, 'ス': 2, 'セ': 2, 'ソ': 2,
    'タ': 3, 'チ': 3, 'ツ': 3, 'テ': 3, 'ト': 2,
    'ナ': 2, 'ニ': 2, 'ヌ': 2, 'ネ': 3, 'ノ': 1,
    'ハ': 2, 'ヒ': 2, 'フ': 2, 'ヘ': 1, 'ホ': 4,
    'マ': 2, 'ミ': 3, 'ム': 2, 'メ': 2, 'モ': 3,
    'ヤ': 2, 'ユ': 2, 'ヨ': 3,
    'ら': 2, 'リ': 2, 'ル': 2, 'レ': 1, 'ロ': 3,
    'ワ': 2, 'ヲ': 3, 'ン': 2,
    'ｱ': 2, 'ｲ': 2, 'ｳ': 3, 'ｴ': 3, 'ｵ': 3,
    'ｶ': 2, 'ｷ': 3, 'ｸ': 2, 'ｹ': 3, 'ｺ': 2,
    'ｻ': 3, 'ｼ': 3, 'ｽ': 2, 'ｾ': 2, 'ｿ': 2,
    'ﾀ': 3, 'ﾁ': 3, 'ﾂ': 3, 'ﾃ': 3, 'ﾄ': 2,
    'ﾅ': 2, 'ﾆ': 2, 'ﾇ': 2, 'ﾈ': 3, 'ﾉ': 1,
    'ﾊ': 2, 'ﾋ': 2, 'ﾌ': 2, 'ﾍ': 1, 'ﾎ': 4,
    'ﾏ': 2, 'ﾐ': 3, 'ﾑ': 2, 'ﾒ': 2, 'ﾓ': 3,
    'ﾔ': 2, 'ﾕ': 2, 'ﾖ': 3,
    'ﾘ': 2, 'ﾙ': 2, 'ﾚ': 1, 'ﾛ': 3,
    'ﾜ': 2, 'ｦ': 3, 'ﾝ': 2
  }

  const KATAKANA_GUIDES = {
    'ア': [['①',100,75],['②',140,85]], 
    'イ': [['①',110,65],['②',155,70]], 
    'ウ': [['①',120,60],['②',95,115],['③',145,115]],
    'エ': [['①',100,80],['②',145,75],['③',120,150]], 
    'オ': [['①',100,80],['②',140,60],['③',115,145]],
    'カ': [['①',95,75],['②',140,75]], 
    'キ': [['①',95,75],['②',145,70],['③',115,140]],
    'ク': [['①',110,75],['②',135,120]], 
    'ケ': [['①',105,75],['②',145,70],['③',120,140]], 
    'コ': [['①',105,75],['②',105,145]],
    'サ': [['①',105,75],['②',145,70],['③',125,145]], 
    'シ': [['①',105,75],['②',125,100],['③',155,130]],
    'ス': [['①',105,75],['②',145,130]], 
    'セ': [['①',100,75],['②',140,70]], 
    'ソ': [['①',120,70],['②',145,100]],
    'タ': [['①',105,75],['②',140,75],['③',125,135]], 
    'チ': [['①',105,75],['②',145,75],['③',125,140]],
    'ツ': [['①',110,75],['②',135,100],['③',155,130]], 
    'テ': [['①',100,75],['②',130,75],['③',125,145]],
    'ト': [['①',110,75],['②',140,70]], 
    'ナ': [['①',105,75],['②',140,70]], 
    'ニ': [['①',105,75],['②',105,140]], 
    'ヌ': [['①',105,75],['②',140,70]],
    'ネ': [['①',100,75],['②',140,70],['③',125,145]], 
    'ノ': [['①',125,85]],
    'ハ': [['①',105,75],['②',145,75]], 
    'ヒ': [['①',105,75],['②',140,70]], 
    'フ': [['①',110,75],['②',140,70]],
    'ヘ': [['①',125,95]], 
    'ホ': [['①',100,75],['②',140,70],['③',125,145]],
    'マ': [['①',105,75],['②',140,70]], 
    'ミ': [['①',105,75],['②',125,110],['③',145,145]],
    'ム': [['①',105,75],['②',140,70]], 
    'メ': [['①',105,75],['②',140,110]], 
    'モ': [['①',100,75],['②',140,70],['③',125,145]],
    'ヤ': [['①',105,75],['②',140,70]], 
    'ユ': [['①',105,75],['②',140,70]], 
    'ヨ': [['①',105,75],['②',140,95],['③',125,145]],
    'ラ': [['①',105,75],['②',140,70]], 
    'リ': [['①',110,75],['②',145,70]],
    'ル': [['①',105,75],['②',140,70]], 
    'レ': [['①',125,70]], 
    'ロ': [['①',105,75],['②',140,95],['③',105,145]], 
    'ワ': [['①',105,75],['②',140,70]],
    'ヲ': [['①',105,75],['②',140,70],['③',125,145]], 
    'ン': [['①',115,75],['②',135,130]],
  }

  const drawGuide = () => {
    const canvas = canvasRef.current
    if (!canvas || vocabList.length === 0) return
    canvas.width = 340
    canvas.height = 340
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const cur = vocabList[currentIndex]
    
    ctx.save()
    ctx.font = 'bold 200px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 5
    ctx.setLineDash([12, 12])
    ctx.strokeText(cur?.hiragana, canvas.width/2, canvas.height/2)
    ctx.restore()

    const scale = 340/240
    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const drawBadge = (num, x, y) => {
      ctx.beginPath(); ctx.arc(x*scale, y*scale, 13, 0, 2*Math.PI)
      ctx.fillStyle = '#dc2626'; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(num, x*scale, y*scale+1)
    }
    const points = KATAKANA_GUIDES[cur?.hiragana]
    if (points) points.forEach(([n, x, y]) => drawBadge(n, x, y))

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
  }

  const draw = (e) => {
    if (!isDrawing) return
    const ctx = canvasRef.current.getContext('2d')
    const {x, y} = getPos(e)
    ctx.lineTo(x, y); ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const currentLetter = vocabList[currentIndex]?.hiragana
    const requiredStrokes = KATAKANA_STRIKE_TARGETS[currentLetter] || 2
    const nextStrokeCount = strokeCount + 1
    setStrokeCount(nextStrokeCount)

    if (nextStrokeCount < requiredStrokes) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const imgData = ctx.getImageData(0, 0, width, height)
    
    let totalPixels = 0
    let minX = width, maxX = 0, minY = height, maxY = 0
    let quadrants = { q1: 0, q2: 0, q3: 0, q4: 0 }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4 + 3
        if (imgData.data[index] > 128) {
          const r = imgData.data[index-3]
          const g = imgData.data[index-2]
          const b = imgData.data[index-1]
          if (r < 100 && g < 100 && b < 100) {
            totalPixels++
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y

            if (x < width / 2 && y < height / 2) quadrants.q1++
            else if (x >= width / 2 && y < height / 2) quadrants.q2++
            else if (x < width / 2 && y >= height / 2) quadrants.q3++
            else quadrants.q4++
          }
        }
      }
    }

    if (totalPixels < 150) {
      setAnalysisResult({ passed: false })
      return
    }

    const boxWidth = maxX - minX
    const boxHeight = maxY - minY
    if (boxWidth < 45 || boxHeight < 45) {
      setAnalysisResult({ passed: false })
      return
    }

    const activeQuadrants = Object.values(quadrants).filter(p => p > 25).length
    if (activeQuadrants < 2) {
      setAnalysisResult({ passed: false })
      return
    }

    setAnalysisResult({ passed: true })

    finishTimeoutRef.current = setTimeout(() => {
      setAnalysisResult(null)
      setStrokeCount(0)
      setActiveTab('flashcard')
    }, 1800)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-white text-xs">Memuat Modul Katakana...</div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white"><p className="text-xs">Belum ada data Katakana.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const targetStrokes = KATAKANA_STRIKE_TARGETS[currentVocab?.hiragana] || 2
  const isPassed = shuffledQuizList.length > 0 && quizScore >= Math.ceil(shuffledQuizList.length * 0.8)
  const hasNextSession = ((quizSession + 1) * pageSize) < vocabList.length

  const handleAnswer = (selectedOpt) => {
    const currentQuizItem = shuffledQuizList[quizIndex]
    if (selectedOpt.id === currentQuizItem.id) {
      setQuizScore(prev => prev + 1)
    }
    if (quizIndex + 1 < shuffledQuizList.length) {
      setQuizIndex(prev => prev + 1)
    } else {
      setQuizFinished(true)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white px-4 py-6 max-w-md mx-auto w-full justify-start space-y-6 overflow-y-auto">
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

      <div className="w-full space-y-3 shrink-0">
        <div className="flex justify-between items-center w-full">
          <button onClick={onBack} className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs border border-slate-700">← Kembali</button>
          <h1 className="text-sm font-bold">🎩 Bab 2: Katakana</h1>
        </div>
        <div className="flex justify-center gap-1.5 w-full pt-[5vh] sm:pt-[12vh]">
          <button onClick={() => setActiveTab('flashcard')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'flashcard' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'}`}>📚 Flashcard</button>
          <button onClick={() => setActiveTab('writing')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'writing' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'}`}>✍️ Kuas</button>
          <button onClick={() => { setActiveTab('quiz'); setQuizMode(null); }} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'quiz' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'}`}>⚡ Kuis {quizSession+1}</button>
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
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/kid.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/60"></div>
                  <div className="relative z-10 space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex+1}/{vocabList.length}</span>
                    <h2 className="text-7xl sm:text-8xl font-extrabold text-white my-2">{currentVocab.hiragana}</h2>
                    <p className="text-xs text-slate-300">✨ Klik untuk balik | Swipe</p>
                  </div>
                </div>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-emerald-500/50 bg-slate-900 overflow-hidden">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/kid.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/65"></div>
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

            <div className="relative bg-white border-3 border-slate-700 rounded-2xl shadow-xl overflow-hidden cursor-crosshair w-full aspect-square">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full border-b border-dashed border-slate-300 absolute"></div>
                <div className="h-full border-r border-dashed border-slate-300 absolute"></div>
              </div>
              <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                className="touch-none block relative z-10 w-full h-full" />

              {/* STEMPEL DENGAN TEMA BIRU TUA KLASIK (POLICE NAVY BLUE) */}
              {analysisResult && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-slate-950/50 backdrop-blur-[3px] transition-all">
                  {analysisResult.passed ? (
                    <div className="border-[6px] border-blue-900 bg-white/95 px-6 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(30,58,138,0.4)] animate-stamp flex items-center gap-3.5">
                      <img src="/images/detco.jpg" alt="SUGOI" className="w-[130px] h-[75px] object-cover rounded shadow-sm border border-blue-200" />
                      <span className="text-blue-900 font-black text-3xl tracking-widest uppercase drop-shadow-sm">SUGOI!</span>
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
              <button onClick={() => { setStrokeCount(0); drawGuide(); }} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold">🔄 Ulangi Corekan</button>
              <button onClick={() => speakJapanese(currentVocab.hiragana)} className="py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-sm">🔊</button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            {quizMode === null ? (
              // MENU PEMILIHAN MODE KUIS
              <div className="w-full bg-slate-800 border border-slate-700 p-6 rounded-2xl text-center space-y-4 shadow-xl">
                <h2 className="text-base font-bold text-white">🎯 Pilih Mode Investigasi Kuis</h2>
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <button onClick={() => setQuizMode('visual')} className="py-3.5 px-4 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
                    👁️ Mode Visual (Tebak Romaji)
                  </button>
                  <button onClick={() => setQuizMode('audio')} className="py-3.5 px-4 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
                    🎧 Mode Audio (Dengar Suara)
                  </button>
                </div>
              </div>
            ) : !quizFinished ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <button onClick={() => setQuizMode(null)} className="text-indigo-400 hover:underline">← Ganti Mode</button>
                  <span>Sesi {quizSession+1} • {quizIndex+1}/{shuffledQuizList.length}</span>
                </div>

                {quizMode === 'visual' ? (
                  // TAMPILAN KUIS BIASA (VISUAL)
                  <div className="space-y-3">
                    <div className="flex justify-end"><button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400 text-sm">🔊</button></div>
                    <div className="text-center"><p className="text-xs text-slate-400">Pilih romaji:</p><div className="text-6xl font-extrabold my-2">{shuffledQuizList[quizIndex]?.hiragana}</div></div>
                    <div className="grid grid-cols-2 gap-2">
                      {shuffledOptions.map((opt, i) => (
                        <button key={i} onClick={() => handleAnswer(opt)} className="py-3 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-sm text-white shadow-md active:scale-95">{opt.romaji}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  // TAMPILAN KUIS SUARA (AUDIO)
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
                )}
              </div>
            ) : (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl text-center space-y-3">
                <h2 className="text-xl font-bold text-emerald-400">Kuis Selesai! 🎉</h2>
                <div className="text-3xl font-black text-indigo-400">{quizScore}/{shuffledQuizList.length}</div>
                {isPassed && hasNextSession ? (
                  <button onClick={() => setQuizSession(p => p + 1)} className="w-full py-3 bg-emerald-600 rounded-xl text-sm font-bold shadow-lg">Lanjut Sesi →</button>
                ) : (
                  <button onClick={() => { setQuizFinished(false); setQuizScore(0); setQuizIndex(0); setQuizMode(null); }} className="w-full py-3 bg-indigo-600 rounded-xl text-sm font-bold shadow-lg">Ulangi Kuis</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}