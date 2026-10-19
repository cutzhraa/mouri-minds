import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function KanjiModule({ onBack }) {
  const [vocabList, setVocabList] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('flashcard')
  const [slideDirection, setSlideDirection] = useState('translate-x-0 opacity-100')
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [quizScore, setQuizScore] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSession, setQuizSession] = useState(0)
  const [shuffledQuizList, setShuffledQuizList] = useState([])
  const [shuffledOptions, setShuffledOptions] = useState([])
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => { fetchKanji() }, [])

  // Fungsi fetch dengan dukungan Offline Cache (localStorage) untuk Kanji
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
      const correct = shuffledQuizList[quizIndex].romaji
      const others = vocabList.filter(i => i.romaji !== correct).map(i => i.romaji).sort(() => Math.random() - 0.5).slice(0, 3)
      setShuffledOptions([...others, correct].sort(() => Math.random() - 0.5))
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
    setIsFlipped(false)
    setSlideDirection('-translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      const n = (currentIndex + 1) % vocabList.length
      setCurrentIndex(n)
      speakJapanese(vocabList[n]?.romaji?.split('/')[0].trim() || vocabList[n]?.hiragana)
      setSlideDirection('translate-x-full opacity-0 scale-95')
      setTimeout(() => setSlideDirection('translate-x-0 opacity-100 scale-100'), 50)
    }, 150)
  }
  
  const handlePrevCard = () => {
    setIsFlipped(false)
    setSlideDirection('-translate-x-full opacity-0 scale-95')
    setTimeout(() => {
      const p = (currentIndex - 1 + vocabList.length) % vocabList.length
      setCurrentIndex(p)
      speakJapanese(vocabList[p]?.romaji?.split('/')[0].trim() || vocabList[p]?.hiragana)
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

  // Peta Penomoran Guratan (Stroke Order) untuk Kanji N5
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
    canvas.width = 340
    canvas.height = 340
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    const cur = vocabList[currentIndex]
    ctx.save()
    ctx.font = 'bold 200px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 5
    ctx.setLineDash([12,12])
    ctx.strokeText(cur?.hiragana, canvas.width/2, canvas.height/2)
    ctx.restore()

    const scale = 340/240
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const drawBadge = (num,x,y) => {
      ctx.beginPath(); ctx.arc(x*scale, y*scale, 13, 0, 2*Math.PI)
      ctx.fillStyle = '#dc2626'; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(num, x*scale, y*scale+1)
    }

    const points = KANJI_GUIDES[cur?.hiragana]
    if (points) {
      points.forEach(([n,x,y]) => drawBadge(n,x,y))
    }

    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }

  useEffect(() => { if (activeTab === 'writing') drawGuide() }, [activeTab, currentIndex, vocabList])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    const clientX = e.clientX || e.touches?.[0].clientX
    const clientY = e.clientY || e.touches?.[0].clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }
  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext('2d')
    const {x,y} = getPos(e)
    ctx.beginPath(); ctx.moveTo(x,y); setIsDrawing(true)
  }
  const draw = (e) => {
    if (!isDrawing) return
    const ctx = canvasRef.current.getContext('2d')
    const {x,y} = getPos(e)
    ctx.lineTo(x,y); ctx.stroke()
  }
  const stopDrawing = () => setIsDrawing(false)

  if (loading) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-white text-xs">Memuat Modul Kanji...</div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white"><p className="text-xs">Belum ada data Kanji.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const isPassed = shuffledQuizList.length > 0 && quizScore >= Math.ceil(shuffledQuizList.length * 0.8)
  const hasNextSession = ((quizSession + 1) * pageSize) < vocabList.length

  // Memecah romaji jika ada dua bacaan (misal: "getsu / tsuki" menjadi ["getsu", "tsuki"])
  const readings = currentVocab?.romaji ? currentVocab.romaji.split('/').map(r => r.trim()) : []

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white px-4 py-6 max-w-md mx-auto w-full justify-start space-y-6 overflow-y-auto">
      <div className="w-full space-y-3 shrink-0">
        <div className="flex justify-between items-center w-full">
          <button onClick={onBack} className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs border border-slate-700">← Kembali</button>
          <h1 className="text-sm font-bold">🥃 Bab 3: Kanji</h1>
        </div>
        <div className="flex justify-center gap-1.5 w-full pt-[5vh] sm:pt-[12vh]">
          <button onClick={() => setActiveTab('flashcard')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'flashcard' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'}`}>📚 Flashcard</button>
          <button onClick={() => setActiveTab('writing')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'writing' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'}`}>✍️ Kuas</button>
          <button onClick={() => setActiveTab('quiz')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'quiz' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400'}`}>⚡ Kuis {quizSession+1}</button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full pt-2 pb-6">
        {activeTab === 'flashcard' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
              onClick={() => { setIsFlipped(!isFlipped); speakJapanese(readings[0] || currentVocab.hiragana) }}
              className={`w-full h-[380px] sm:h-[420px] cursor-pointer [perspective:1000px] transition-all duration-300 ${slideDirection}`}>
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                
                {/* SISI DEPAN (KANJI) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] border-2 border-indigo-500/50 bg-slate-900 overflow-hidden shadow-xl">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/kogoro.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/60"></div>
                  <div className="relative z-10 space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex+1}/{vocabList.length}</span>
                    <h2 className="text-7xl sm:text-8xl font-extrabold text-white my-2">{currentVocab.hiragana}</h2>
                    <p className="text-xs text-slate-300">✨ Klik untuk lihat bacaan | Swipe</p>
                  </div>
                </div>

                {/* SISI BELAKANG (ARTI & PEMISAHAN CARA BACA) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl p-5 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-emerald-500/50 bg-slate-900 overflow-hidden shadow-xl">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/kogoro.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/65"></div>
                  <div className="relative z-10 space-y-3 w-full" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-2xl font-extrabold text-emerald-300">{currentVocab.meaning_id}</h3>
                    {currentVocab.meaning_en && <p className="text-xs text-emerald-200/80">"{currentVocab.meaning_en}"</p>}
                    
                    <div className="pt-2 border-t border-slate-700/60 space-y-2">
                      <p className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">Cara Baca (Onyomi / Kun'yomi):</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {readings.map((reading, idx) => (
                          <button
                            key={idx}
                            onClick={() => speakJapanese(reading)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 border border-indigo-500/40 rounded-xl text-xs font-mono font-bold transition shadow flex items-center gap-1.5 text-indigo-200 hover:text-white"
                          >
                            <span>🔊</span> {reading}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'writing' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px] space-y-3">
            <div className="text-center"><p className="text-xs text-slate-300">Ikuti garis putus:</p><div className="text-4xl font-black text-indigo-400">{currentVocab.hiragana}</div></div>
            <div className="relative bg-white border-3 border-slate-700 rounded-2xl shadow-xl overflow-hidden cursor-crosshair w-full aspect-square">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full border-b border-dashed border-slate-300 absolute"></div><div className="h-full border-r border-dashed border-slate-300 absolute"></div></div>
              <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="touch-none block relative z-10 w-full h-full" />
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={drawGuide} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold">🔄 Hapus</button>
              <button onClick={() => speakJapanese(readings[0] || currentVocab.hiragana)} className="py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-sm">🔊</button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            {!quizFinished ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between text-xs text-slate-400"><span>Sesi {quizSession+1} • {quizIndex+1}/{shuffledQuizList.length}</span><button onClick={() => speakJapanese(shuffledQuizList[quizIndex].romaji?.split('/')[0].trim() || shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400">🔊</button></div>
                <div className="text-center"><p className="text-xs text-slate-400">Pilih cara baca:</p><div className="text-6xl font-extrabold my-2">{shuffledQuizList[quizIndex]?.hiragana}</div></div>
                <div className="grid grid-cols-2 gap-2">{shuffledOptions.map((opt,i) => (<button key={i} onClick={() => { if(opt===shuffledQuizList[quizIndex].romaji) setQuizScore(p=>p+1); if(quizIndex+1<shuffledQuizList.length) setQuizIndex(p=>p+1); else setQuizFinished(true)}} className="py-3 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-sm">{opt}</button>))}</div>
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