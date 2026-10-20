import { useEffect, useRef, useState } from 'react'
import { getExpectedStrokeCount, validateStrokeOrder } from '../lib/strokeOrderValidation'

export default function QuizDrawingChallenge({ item, onAnswer }) {
  const canvasRef = useRef(null)
  const strokesRef = useRef([])
  const drawingRef = useRef(false)
  const [expectedCount, setExpectedCount] = useState(null)
  const [strokeCount, setStrokeCount] = useState(0)
  const [checking, setChecking] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [clueField] = useState(() => Math.random() < 0.5 ? 'romaji' : 'meaning_id')

  useEffect(() => {
    let cancelled = false
    strokesRef.current = []
    setStrokeCount(0)
    setFeedback('')
    setExpectedCount(null)
    const context = canvasRef.current?.getContext('2d')
    if (context) {
      context.lineWidth = 18
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = '#0f172a'
    }
    getExpectedStrokeCount(item?.hiragana).then(count => {
      if (!cancelled) setExpectedCount(count)
    }).catch(() => { if (!cancelled) setExpectedCount(null) })
    return () => { cancelled = true }
  }, [item])

  const pointFrom = event => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const point = event.touches?.[0] || event
    return {
      x: (point.clientX - rect.left) * canvas.width / rect.width,
      y: (point.clientY - rect.top) * canvas.height / rect.height
    }
  }

  const start = event => {
    if (checking || expectedCount == null) return
    event.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const point = pointFrom(event)
    ctx.beginPath(); ctx.moveTo(point.x, point.y)
    drawingRef.current = true
    strokesRef.current.push([point])
    setFeedback('')
  }

  const move = event => {
    if (!drawingRef.current) return
    event.preventDefault()
    const point = pointFrom(event)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(point.x, point.y); ctx.stroke()
    strokesRef.current.at(-1).push(point)
  }

  const end = async event => {
    if (!drawingRef.current) return
    event?.preventDefault?.()
    drawingRef.current = false
    const count = strokesRef.current.length
    setStrokeCount(count)
    if (count < expectedCount) return
    setChecking(true)
    const passed = count === expectedCount && await validateStrokeOrder(item.hiragana, strokesRef.current).catch(() => false)
    setFeedback(passed ? 'Benar! ✓' : 'Urutan guratan belum tepat. Coba lagi.')
    if (passed) onAnswer(true)
    else {
      strokesRef.current = []
      setStrokeCount(0)
      const ctx = canvasRef.current.getContext('2d')
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    setChecking(false)
  }

  const reset = () => {
    strokesRef.current = []
    setStrokeCount(0)
    setFeedback('')
    const ctx = canvasRef.current?.getContext('2d')
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  return (
    <div className="space-y-3">
      <div className="text-center rounded-xl bg-slate-900/80 p-4">
        <p className="text-xs text-slate-400">Tulis karakter berdasarkan {clueField === 'romaji' ? 'romaji' : 'arti'}:</p>
        <p className="text-2xl font-bold text-white">{item?.[clueField] || item?.romaji || item?.meaning_id}</p>
      </div>
      <p className="text-center text-xs text-slate-300">Guratan {strokeCount}/{expectedCount ?? '…'}</p>
      <div className="relative mx-auto w-full max-w-[360px] aspect-square overflow-hidden rounded-2xl border-2 border-slate-300 bg-white">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="absolute w-full border-b border-dashed border-slate-300"/><div className="absolute h-full border-r border-dashed border-slate-300"/></div>
        <canvas ref={canvasRef} width={340} height={340} className="relative z-10 block h-full w-full touch-none" onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
      </div>
      {feedback && <p className={`text-center text-sm font-bold ${feedback.startsWith('Benar') ? 'text-emerald-400' : 'text-amber-300'}`}>{feedback}</p>}
      <button type="button" onClick={reset} className="w-full rounded-xl bg-slate-700 py-2.5 text-sm font-bold hover:bg-slate-600">Bersihkan kanvas</button>
    </div>
  )
}
