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
  const [quizScore, setQuizScore] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizSession, setQuizSession] = useState(0)
  const [shuffledQuizList, setShuffledQuizList] = useState([])
  const [shuffledOptions, setShuffledOptions] = useState([])
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => { fetchKatakana() }, [])
  const fetchKatakana = async () => {
    setLoading(true)
    const { data } = await supabase.from('vocabulary').select('*').eq('category', 'Katakana').order('hiragana', { ascending: true })
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
      const correct = shuffledQuizList[quizIndex].romaji
      const others = vocabList.filter(i => i.romaji !== correct).map(i => i.romaji).sort(() => Math.random() - 0.5).slice(0, 3)
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

  // KANVAS + NOMOR LENGKAP
  const KATAKANA_GUIDES = {
    'ア': [['①',110,45],['②',150,135]], 'イ': [['①',120,50],['②',160,135]], 'ウ': [['①',145,40],['②',95,110],['③',145,165]],
    'エ': [['①',145,50],['②',100,110],['③',145,180]], 'オ': [['①',95,60],['②',145,50],['③',145,160]],
    'カ': [['①',95,55],['②',145,50],['③',145,135]], 'キ': [['①',100,50],['②',150,50],['③',125,140]],
    'ク': [['①',110,50],['②',145,110]], 'ケ': [['①',100,50],['②',150,60],['③',100,160]], 'コ': [['①',110,50],['②',110,150]],
    'サ': [['①',95,60],['②',145,50],['③',145,135]], 'シ': [['①',110,60],['②',140,95],['③',170,130]],
    'ス': [['①',110,50],['②',145,135]], 'セ': [['①',100,60],['②',145,110]], 'ソ': [['①',110,60],['②',170,100]],
    'タ': [['①',95,50],['②',145,50],['③',100,110],['④',145,160]], 'チ': [['①',110,50],['②',145,50],['③',125,140]],
    'ツ': [['①',100,60],['②',140,90],['③',180,130]], 'テ': [['①',100,60],['②',150,60],['③',145,140]],
    'ト': [['①',110,50],['②',145,110]], 'ナ': [['①',95,60],['②',145,50],['③',100,125],['④',160,160]],
    'ニ': [['①',110,60],['②',110,140]], 'ヌ': [['①',95,60],['②',145,60],['③',100,125],['④',160,160]],
    'ネ': [['①',95,60],['②',145,50],['③',100,125],['④',160,160]], 'ノ': [['①',120,90]],
    'ハ': [['①',95,60],['②',145,60],['③',195,60]], 'ヒ': [['①',110,50],['②',145,135]], 'フ': [['①',110,60],['②',145,135]],
    'ヘ': [['①',130,80]], 'ホ': [['①',95,60],['②',145,60],['③',100,125],['④',160,160]],
    'マ': [['①',95,60],['②',145,60],['③',145,135]], 'ミ': [['①',95,60],['②',145,60],['③',145,135]],
    'ム': [['①',110,50],['②',145,135]], 'メ': [['①',100,60],['②',160,100]], 'モ': [['①',95,60],['②',145,60],['③',125,135]],
    'ヤ': [['①',95,60],['②',145,60],['③',145,135]], 'ユ': [['①',110,50],['②',145,135]], 'ヨ': [['①',110,50],['②',145,95],['③',145,160]],
    'ラ': [['①',110,50],['②',145,135]], 'リ': [['①',110,60],['②',160,80]], 'ル': [['①',110,60],['②',145,135]],
    'レ': [['①',110,50],['②',145,135]], 'ロ': [['①',110,50],['②',145,95],['③',110,160]], 'ワ': [['①',95,60],['②',145,60],['③',145,135]],
    'ヲ': [['①',95,60],['②',145,60],['③',145,135]], 'ン': [['①',110,60],['②',160,130]],
  }

  const drawGuide = (ctx, char) => {
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const drawBadge = (num, x, y) => {
      ctx.beginPath(); ctx.arc(x, y, 10, 0, 2 * Math.PI); ctx.fillStyle = '#dc2626'; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(num, x, y + 1)
    }
    const points = KATAKANA_GUIDES[char]
    if (points) points.forEach(([n,x,y]) => drawBadge(n,x,y))
  }

  useEffect(() => {
    if (activeTab === 'writing' && canvasRef.current && vocabList.length > 0) {
      const canvas = canvasRef.current; canvas.width = 240; canvas.height = 240
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height)
      const cur = vocabList[currentIndex]
      ctx.save(); ctx.font = 'bold 130px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.setLineDash([8, 8]); ctx.strokeText(cur?.hiragana, canvas.width / 2, canvas.height / 2); ctx.restore()
      drawGuide(ctx, cur?.hiragana)
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    }
  }, [activeTab, currentIndex, vocabList])

  const startDrawing = (e) => {
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left; const y = (e.clientY || e.touches?.[0].clientY) - rect.top
    ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true)
  }
  const draw = (e) => {
    if (!isDrawing) return
    const ctx = canvasRef.current.getContext('2d'); const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left; const y = (e.clientY || e.touches?.[0].clientY) - rect.top
    ctx.lineTo(x, y); ctx.stroke()
  }
  const stopDrawing = () => setIsDrawing(false)
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas && vocabList.length > 0) {
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 240, 240)
      const cur = vocabList[currentIndex]
      ctx.save(); ctx.font = 'bold 130px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; ctx.setLineDash([8, 8]); ctx.strokeText(cur?.hiragana, canvas.width / 2, canvas.height / 2); ctx.restore()
      drawGuide(ctx, cur?.hiragana)
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center p-4 bg-slate-900 text-white"><p className="text-xs">Memuat Modul Katakana...</p></div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-900 text-white"><p className="mb-3 text-xs">Belum ada data Katakana.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const isPassed = shuffledQuizList.length > 0 && quizScore >= Math.ceil(shuffledQuizList.length * 0.8)
  const hasNextSession = ((quizSession + 1) * pageSize) < vocabList.length

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white px-4 py-6 max-w-md mx-auto w-full justify-start space-y-6 overflow-y-auto">
      {/* Top Section */}
      <div className="w-full space-y-3 shrink-0">
        <div className="flex justify-between items-center w-full">
          <button onClick={onBack} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold transition border border-slate-700 shadow">← Kembali</button>
          <h1 className="text-sm sm:text-base font-bold tracking-wide">🎩 Bab 2: Katakana</h1>
        </div>
        <div className="flex justify-center gap-1.5 w-full pt-[5vh] sm:pt-[12vh]">
          <button onClick={() => setActiveTab('flashcard')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'flashcard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>📚 Flashcard</button>
          <button onClick={() => setActiveTab('writing')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'writing' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>✍️ Kuas</button>
          <button onClick={() => setActiveTab('quiz')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>⚡ Kuis {quizSession + 1}</button>
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
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url('/images/kid.jpg')` }}></div>
                  <div className="absolute inset-0 bg-slate-950/60"></div>
                  <div className="relative z-10 space-y-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex + 1} dari {vocabList.length}</span>
                    <h2 className="text-5xl sm:text-6xl font-extrabold text-white my-1 drop-shadow-lg">{currentVocab.hiragana}</h2>
                    <p className="text-[10px] text-slate-300 italic">✨ Klik kartu untuk membalik | Swipe</p>
                  </div>
                </div>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl border-2 border-emerald-500/50 overflow-hidden bg-slate-900">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url('/images/kid.jpg')` }}></div>
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

        {activeTab === 'writing' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-xs space-y-3">
            <div className="text-center">
              <p className="text-[11px] text-slate-300">Ikuti garis putus-putus dan tulis di kanvas:</p>
              <div className="text-3xl font-black text-indigo-400 my-0.5">{currentVocab.hiragana}</div>
              <p className="text-[10px] text-slate-400 font-mono">Romaji: {currentVocab.romaji}</p>
            </div>
            <div className="relative bg-white border-3 border-slate-700 rounded-xl shadow-xl overflow-hidden cursor-crosshair">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-full border-b border-dashed border-slate-300 absolute"></div><div className="h-full border-r border-dashed border-slate-300 absolute"></div></div>
              <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="touch-none block relative z-10 w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]" />
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={clearCanvas} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold">🔄 Hapus</button>
              <button onClick={() => speakJapanese(currentVocab.hiragana)} className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold">🔊 Suara</button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[280px] sm:max-w-xs">
            {!quizFinished && shuffledQuizList.length > 0 ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-xl space-y-3">
                <div className="flex justify-between text-[11px] text-slate-400 font-mono"><span>Sesi {quizSession + 1} • {quizIndex + 1}/{shuffledQuizList.length}</span><button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400">🔊 Dengar</button></div>
                <div className="text-center"><p className="text-xs text-slate-400 mb-0.5">Pilih romaji yang benar:</p><div className="text-5xl font-extrabold text-white my-1">{shuffledQuizList[quizIndex].hiragana}</div></div>
                <div className="grid grid-cols-2 gap-2">{shuffledOptions.map((opt, idx) => (<button key={idx} onClick={() => { if (opt === shuffledQuizList[quizIndex].romaji) setQuizScore(p => p + 1); if (quizIndex + 1 < shuffledQuizList.length) setQuizIndex(p => p + 1); else setQuizFinished(true) }} className="py-2.5 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-xs sm:text-sm">{opt}</button>))}</div>
              </div>
            ) : (
              <div className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-xl text-center space-y-3">
                <h2 className="text-xl font-bold text-emerald-400">Kuis Selesai! 🎉</h2>
                <p className="text-xs text-slate-300">Skor kamu:</p><div className="text-3xl font-black text-indigo-400">{quizScore} / {shuffledQuizList.length}</div>
                {isPassed && hasNextSession ? <button onClick={() => setQuizSession(p => p + 1)} className="w-full py-2 bg-emerald-600 rounded-xl text-xs">Lanjut ke Sesi Berikutnya →</button> : <button onClick={() => { setQuizFinished(false); setQuizScore(0); setQuizIndex(0); const s = quizSession * pageSize; const slice = vocabList.slice(s, s + pageSize); setShuffledQuizList([...slice].sort(() => Math.random() - 0.5)) }} className="w-full py-2 bg-indigo-600 rounded-xl text-xs">Ulangi Kuis</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}