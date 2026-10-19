import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function HiraganaModule({ onBack }) {
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

  useEffect(() => { fetchHiragana() }, [])

  // Fungsi fetch dengan dukungan Offline Cache (localStorage)
  const fetchHiragana = async () => {
    setLoading(true)

    // 1. Jika perangkat terdeteksi offline, langsung ambil data dari memori HP
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

    // 2. Jika online, ambil dari Supabase
    try {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('category', 'Hiragana')
        .order('hiragana', { ascending: true })

      if (error) throw error

      if (data) {
        setVocabList(data)
        // Simpan salinan data ke localStorage untuk cadangan offline
        localStorage.setItem('hiragana_vocab_cache', JSON.stringify(data))
      }
    } catch (err) {
      console.warn("Gagal terhubung ke server (Fetch Failed), memuat data offline...", err)
      // Fallback jika terjadi kesalahan jaringan secara mendadak
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
      const correct = shuffledQuizList[quizIndex].romaji
      const others = vocabList.filter(i => i.romaji !== correct).map(i => i.romaji).sort(() => Math.random() - 0.5).slice(0,3)
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
      const n = (currentIndex + 1) % vocabList.length
      setCurrentIndex(n); speakJapanese(vocabList[n]?.hiragana)
      setSlideDirection('translate-x-full opacity-0 scale-95')
      setTimeout(() => setSlideDirection('translate-x-0 opacity-100 scale-100'), 50)
    }, 150)
  }
  
  const handlePrevCard = () => {
    setIsFlipped(false)
    setSlideDirection('translate-x-full opacity-0 scale-95')
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

  // === CANVAS GEDE DENGAN PENOMORAN GURATAN LENGKAP ===
  const drawGuide = () => {
    const canvas = canvasRef.current
    if (!canvas || vocabList.length === 0) return
    canvas.width = 340
    canvas.height = 340
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
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

    ctx.font = 'bold 15px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const drawBadge = (num,x,y) => {
      ctx.beginPath(); ctx.arc(x,y,13,0,2*Math.PI)
      ctx.fillStyle = '#dc2626'; ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillText(num,x,y+1)
    }

    const char = current?.hiragana

    // Penomoran Guratan (Stroke Order) Lengkap untuk Hiragana Dasar
    if (char === 'あ') { drawBadge('①',150,55); drawBadge('②',85,135); drawBadge('③',180,180) }
    else if (char === 'い') { drawBadge('①',105,70); drawBadge('②',210,90) }
    else if (char === 'う') { drawBadge('①',150,60); drawBadge('②',95,125) }
    else if (char === 'え') { drawBadge('①',95,100); drawBadge('②',75,200) }
    else if (char === 'お') { drawBadge('①',95,70); drawBadge('②',150,45); drawBadge('③',195,145) }
    
    // Baris KA
    else if (char === 'か') { drawBadge('①',95,65); drawBadge('②',180,50); drawBadge('③',145,180) }
    else if (char === 'き') { drawBadge('①',90,80); drawBadge('②',90,140); drawBadge('③',130,200) }
    else if (char === 'く') { drawBadge('①',170,80) }
    else if (char === 'け') { drawBadge('①',90,85); drawBadge('②',180,75); drawBadge('③',140,165) }
    else if (char === 'こ') { drawBadge('①',110,80); drawBadge('②',110,180) }

    // Baris SA
    else if (char === 'さ') { drawBadge('①',100,75); drawBadge('②',160,110); drawBadge('③',110,210) }
    else if (char === 'し') { drawBadge('①',170,60) }
    else if (char === 'す') { drawBadge('①',110,75); drawBadge('②',140,140) }
    else if (char === 'せ') { drawBadge('①',110,70); drawBadge('②',140,150) }
    else if (char === 'そ') { drawBadge('①',110,65); drawBadge('②',115,160) }

    // Baris TA
    else if (char === 'た') { drawBadge('①',100,75); drawBadge('②',180,65); drawBadge('③',120,135); drawBadge('④',130,200) }
    else if (char === 'ち') { drawBadge('①',110,80); drawBadge('②',120,160) }
    else if (char === 'つ') { drawBadge('①',150,110) }
    else if (char === 'て') { drawBadge('①',110,90) }
    else if (char === 'と') { drawBadge('①',160,70); drawBadge('②',110,150) }

    // Baris NA
    else if (char === 'な') { drawBadge('①',110,75); drawBadge('②',165,60); drawBadge('③',110,145); drawBadge('④',140,195) }
    else if (char === 'に') { drawBadge('①',110,75); drawBadge('②',170,65) }
    else if (char === 'ぬ') { drawBadge('①',120,60); drawBadge('②',125,150) }
    else if (char === 'ね') { drawBadge('①',130,60); drawBadge('②',135,140) }
    else if (char === 'の') { drawBadge('①',140,110) }

    // Baris HA
    else if (char === 'は') { drawBadge('①',115,75); drawBadge('②',165,65); drawBadge('③',130,160) }
    else if (char === 'ひ') { drawBadge('①',150,120) }
    else if (char === 'ふ') { drawBadge('①',140,55); drawBadge('②',100,105); drawBadge('③',185,115) }
    else if (char === 'へ') { drawBadge('①',135,110) }
    else if (char === 'ほ') { drawBadge('①',115,65); drawBadge('②',165,55); drawBadge('③',125,135); drawBadge('④',130,200) }

    // Baris MA
    else if (char === 'ま') { drawBadge('①',110,75); drawBadge('②',110,135); drawBadge('③',130,195) }
    else if (char === 'み') { drawBadge('①',125,75); drawBadge('②',130,150) }
    else if (char === 'む') { drawBadge('①',110,75); drawBadge('②',140,150) }
    else if (char === 'め') { drawBadge('①',130,75); drawBadge('②',120,135) }
    else if (char === 'も') { drawBadge('①',130,75); drawBadge('②',125,135); drawBadge('③',175,135) }

    // Baris YA
    else if (char === 'や') { drawBadge('①',110,75); drawBadge('②',165,65); drawBadge('③',150,160) }
    else if (char === 'ゆ') { drawBadge('①',120,70); drawBadge('②',165,120) }
    else if (char === 'よ') { drawBadge('①',140,65); drawBadge('②',135,160) }

    // Baris RA
    else if (char === 'ら') { drawBadge('①',130,75); drawBadge('②',125,145) }
    else if (char === 'り') { drawBadge('①',115,70); drawBadge('②',170,70) }
    else if (char === 'る') { drawBadge('①',140,75) }
    else if (char === 'れ') { drawBadge('①',115,70); drawBadge('②',140,130) }
    else if (char === 'ろ') { drawBadge('①',130,110) }

    // Baris WA & N
    else if (char === 'わ') { drawBadge('①',115,70); drawBadge('②',155,130) }
    else if (char === 'を') { drawBadge('①',115,65); drawBadge('②',130,120); drawBadge('③',145,180) }
    else if (char === 'ん') { drawBadge('①',135,110) }

    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 18
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
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
    ctx.beginPath(); ctx.moveTo(x,y)
    setIsDrawing(true)
  }
  const draw = (e) => {
    if (!isDrawing) return
    const ctx = canvasRef.current.getContext('2d')
    const {x,y} = getPos(e)
    ctx.lineTo(x,y); ctx.stroke()
  }
  const stopDrawing = () => setIsDrawing(false)

  if (loading) return <div className="flex-1 flex items-center justify-center bg-slate-900 text-white text-xs">Memuat...</div>
  if (vocabList.length === 0) return <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white"><p className="text-xs">Belum ada data.</p><button onClick={onBack} className="px-3 py-1.5 bg-indigo-600 rounded-xl text-xs">Kembali</button></div>

  const currentVocab = vocabList[currentIndex]
  const isPassed = shuffledQuizList.length > 0 && quizScore >= Math.ceil(shuffledQuizList.length * 0.8)
  const hasNextSession = ((quizSession + 1) * pageSize) < vocabList.length

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-white px-4 py-6 max-w-md mx-auto w-full justify-start space-y-6 overflow-y-auto">
      <div className="w-full space-y-3 shrink-0">
        <div className="flex justify-between items-center w-full">
          <button onClick={onBack} className="px-3 py-1.5 bg-slate-800 rounded-lg text-xs border border-slate-700">← Kembali</button>
          <h1 className="text-sm font-bold">🕵️‍♂️ Bab 1: Hiragana Dasar</h1>
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
              onClick={() => { setIsFlipped(!isFlipped); speakJapanese(currentVocab.hiragana) }}
              className={`w-full h-[380px] sm:h-[420px] cursor-pointer [perspective:1000px] transition-all duration-300 ${slideDirection}`}>
              <div className={`relative w-full h-full duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] border-2 border-indigo-500/50 bg-slate-900 overflow-hidden">
                  <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('/images/heiji.jpg')` }}></div><div className="absolute inset-0 bg-slate-950/60"></div>
                  <div className="relative z-10 space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-indigo-300 font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-500/40">Kartu {currentIndex+1}/{vocabList.length}</span>
                    <h2 className="text-7xl sm:text-8xl font-extrabold text-white my-2 drop-shadow-lg">{currentVocab.hiragana}</h2>
                    <p className="text-xs text-slate-300">✨ Klik untuk balik | Swipe</p>
                  </div>
                </div>
                <div className="absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center text-center [backface-visibility:hidden] [transform:rotateY(180deg)] border-2 border-emerald-500/50 bg-slate-900 overflow-hidden">
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
              <p className="text-xs text-slate-300">Ikuti garis putus:</p>
              <div className="text-4xl font-black text-indigo-400">{currentVocab.hiragana}</div>
            </div>
            <div className="relative bg-white border-3 border-slate-700 rounded-2xl shadow-xl overflow-hidden cursor-crosshair w-full aspect-square">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full border-b border-dashed border-slate-300 absolute"></div>
                <div className="h-full border-r border-dashed border-slate-300 absolute"></div>
              </div>
              <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                className="touch-none block relative z-10 w-full h-full" />
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={drawGuide} className="flex-1 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold">🔄 Hapus</button>
              <button onClick={() => speakJapanese(currentVocab.hiragana)} className="py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-sm">🔊</button>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="flex flex-col items-center justify-center w-full max-w-[360px]">
            {!quizFinished ? (
              <div className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between text-xs text-slate-400"><span>Sesi {quizSession+1} • {quizIndex+1}/{shuffledQuizList.length}</span><button onClick={() => speakJapanese(shuffledQuizList[quizIndex].hiragana)} className="text-indigo-400">🔊</button></div>
                <div className="text-center"><p className="text-xs text-slate-400">Pilih romaji:</p><div className="text-6xl font-extrabold my-2">{shuffledQuizList[quizIndex]?.hiragana}</div></div>
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